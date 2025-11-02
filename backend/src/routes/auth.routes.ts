import express, { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, loginSchema } from '../utils/validators';
import { queryOne } from '../config/database';
import { AuthenticationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { authRateLimiter } from '../middleware/rateLimiting';
import { sanitizeInput, sanitizeInteger } from '../utils/sanitize';

const router: Router = express.Router();

/**
 * Authentication Routes
 *
 * Handles user login and token generation.
 * Works with existing database users.
 */

/**
 * @swagger
 * /api/tenants/{tenantId}/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     tags: [Authentication]
 *     parameters:
 *       - $ref: '#/components/parameters/tenantId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *     security: []
 */
router.post(
  '/tenants/:tenantId/login',
  authRateLimiter, // Strict rate limiting for login attempts
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    // Sanitize inputs (IMPORTANT: Don't sanitize password!)
    const username = sanitizeInput(req.body.username, {
      alphanumericOnly: true,
      maxLength: 50,
    });
    const password = req.body.password; // Never sanitize passwords!
    const tenantId = sanitizeInteger(req.params.tenantId);

    logger.info('Login attempt', { username, tenantId });

    // Find user by username and tenant (with JOINs to get customer_id and driver_id)
    const user = await queryOne<any>(
      `SELECT
        u.user_id,
        u.username,
        u.email,
        u.password_hash,
        u.role,
        u.full_name,
        u.phone,
        u.is_active,
        u.tenant_id,
        c.customer_id,
        d.driver_id,
        d.is_login_enabled as driver_login_enabled
      FROM tenant_users u
      LEFT JOIN tenant_customers c ON u.user_id = c.user_id AND u.tenant_id = c.tenant_id
      LEFT JOIN tenant_drivers d ON u.user_id = d.user_id AND u.tenant_id = d.tenant_id
      WHERE u.username = $1 AND u.tenant_id = $2`,
      [username, tenantId]
    );

    if (!user) {
      logger.warn('Login attempt with invalid username', { username, tenantId });
      throw new AuthenticationError('Invalid credentials');
    }

    if (!user.is_active) {
      logger.warn('Login attempt for inactive user', { userId: user.user_id, tenantId });
      throw new AuthenticationError('Account is disabled');
    }

    // Check if driver login is enabled for driver role
    if (user.role === 'driver' && !user.driver_login_enabled) {
      logger.warn('Login attempt for driver without login enabled', { userId: user.user_id, tenantId });
      throw new AuthenticationError('Driver login not enabled for this account');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      logger.warn('Login attempt with invalid password', { userId: user.user_id, tenantId });
      throw new AuthenticationError('Invalid credentials');
    }

    // Update last_login timestamp
    await queryOne(
      'UPDATE tenant_users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1 AND tenant_id = $2',
      [user.user_id, tenantId]
    );

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      {
        userId: user.user_id,
        tenantId: user.tenant_id,
        role: user.role,
        email: user.email,
        customerId: user.customer_id || null,
        driverId: user.driver_id || null,
        isDriver: user.role === 'driver',
        isCustomer: user.role === 'customer',
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    logger.info('User logged in successfully', {
      userId: user.user_id,
      tenantId,
      username: user.username,
      role: user.role,
    });

    // Return user info and token
    res.json({
      token,
      user: {
        id: user.user_id,
        userId: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.full_name,
        full_name: user.full_name,
        phone: user.phone,
        tenantId: user.tenant_id,
        customer_id: user.customer_id || null,
        customerId: user.customer_id || null,
        driver_id: user.driver_id || null,
        driverId: user.driver_id || null,
        isDriver: user.role === 'driver',
        isCustomer: user.role === 'customer',
      },
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/logout
 * @desc Logout user (client-side token removal)
 * @access Public
 */
router.post(
  '/tenants/:tenantId/logout',
  asyncHandler(async (req, res) => {
    // With JWT, logout is primarily client-side (remove token)
    // Here we can log the event for audit purposes
    const userId = (req as any).user?.userId;
    const tenantId = sanitizeInteger(req.params.tenantId);

    if (userId) {
      logger.info('User logged out', { userId, tenantId });
    }

    res.json({ message: 'Logged out successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/verify
 * @desc Verify JWT token validity
 * @access Public
 */
router.get(
  '/tenants/:tenantId/verify',
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      res.json({ valid: true, user: decoded });
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  })
);

export default router;
