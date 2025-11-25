import express, { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, loginSchema } from '../utils/validators';
import { query, queryOne } from '../config/database';
import { AuthenticationError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { authRateLimiter } from '../middleware/rateLimiting';
import { sanitizeInput, sanitizeInteger } from '../utils/sanitize';
import { setAuthCookie, clearAuthCookie, AUTH_COOKIE_NAME } from '../utils/cookieAuth';

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

    // SECURITY: Set httpOnly cookie (XSS-safe, cannot be accessed by JavaScript)
    setAuthCookie(res, token);

    // Return user info (token still included for backward compatibility during migration)
    // Frontend should NOT store this token in localStorage anymore
    res.json({
      token, // DEPRECATED: Will be removed after frontend migration
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
 * @desc Logout user (clears httpOnly cookie)
 * @access Public
 */
router.post(
  '/tenants/:tenantId/logout',
  asyncHandler(async (req, res) => {
    const userId = (req as any).user?.userId;
    const tenantId = sanitizeInteger(req.params.tenantId);

    // SECURITY: Clear the httpOnly auth cookie
    clearAuthCookie(res);

    if (userId) {
      logger.info('User logged out', { userId, tenantId });
    }

    res.json({ message: 'Logged out successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/verify
 * @desc Verify JWT token validity (checks cookie first, then header)
 * @access Public
 */
router.get(
  '/tenants/:tenantId/verify',
  asyncHandler(async (req, res) => {
    let token: string | undefined;

    // SECURITY: Check httpOnly cookie first (preferred method)
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
      logger.debug('Token found in httpOnly cookie');
    }
    // Fallback to Authorization header (for backward compatibility)
    else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        logger.debug('Token found in Authorization header (legacy)');
      }
    }

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      res.json({ valid: true, user: decoded });
    } catch (error) {
      // Clear invalid cookie if present
      clearAuthCookie(res);
      throw new AuthenticationError('Invalid token');
    }
  })
);

/**
 * @route POST /api/tenants/:tenantId/refresh
 * @desc Refresh JWT token
 * @access Public
 * @description Allows users to refresh their token before it expires
 */
router.post(
  '/tenants/:tenantId/refresh',
  authRateLimiter, // Use auth rate limiter to prevent abuse
  asyncHandler(async (req, res) => {
    let token: string | undefined;

    // SECURITY: Check httpOnly cookie first (preferred method)
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    }
    // Fallback to Authorization header (for backward compatibility)
    else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const tenantId = sanitizeInteger(req.params.tenantId);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    try {
      // Verify the current token (allow expired tokens to be refreshed within 7 days)
      const decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true }) as any;

      // Check if token is too old (more than 7 days expired)
      if (decoded.exp && Date.now() / 1000 - decoded.exp > 7 * 24 * 60 * 60) {
        throw new AuthenticationError('Token expired too long ago, please login again');
      }

      // Verify user still exists and is active
      const user = await queryOne<any>(
        `SELECT user_id, username, email, role, tenant_id, is_active
         FROM tenant_users
         WHERE user_id = $1 AND tenant_id = $2`,
        [decoded.userId, tenantId]
      );

      if (!user || !user.is_active) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Verify tenant ID matches
      if (decoded.tenantId !== tenantId) {
        throw new AuthenticationError('Tenant mismatch');
      }

      // Generate new token with refreshed expiration
      const newToken = jwt.sign(
        {
          userId: user.user_id,
          tenantId: user.tenant_id,
          role: user.role,
          email: user.email,
          customerId: decoded.customerId || null,
          driverId: decoded.driverId || null,
          isDriver: user.role === 'driver',
          isCustomer: user.role === 'customer',
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info('Token refreshed', {
        userId: user.user_id,
        tenantId: user.tenant_id,
      });

      // SECURITY: Set new token in httpOnly cookie
      setAuthCookie(res, newToken);

      res.json({
        token: newToken, // DEPRECATED: Will be removed after frontend migration
        user: {
          id: user.user_id,
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          tenantId: user.tenant_id,
        },
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        clearAuthCookie(res);
        throw new AuthenticationError('Invalid token');
      }
      throw error;
    }
  })
);

/**
 * @route POST /api/tenants/:tenantId/forgot-password
 * @desc Request password reset
 * @access Public
 * @description Generates a password reset token and sends email to user
 */
router.post(
  '/tenants/:tenantId/forgot-password',
  authRateLimiter, // Rate limit to prevent abuse
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const tenantId = sanitizeInteger(req.params.tenantId);

    if (!email) {
      throw new ValidationError('Email is required');
    }

    const sanitizedEmail = sanitizeInput(email, { maxLength: 255 });

    // Find user by email and tenant
    const user = await queryOne<any>(
      `SELECT user_id, username, email, tenant_id, full_name
       FROM tenant_users
       WHERE email = $1 AND tenant_id = $2 AND is_active = true`,
      [sanitizedEmail, tenantId]
    );

    // Always return success to prevent email enumeration attacks
    // (Don't reveal whether email exists or not)
    if (!user) {
      logger.warn('Password reset requested for non-existent user', {
        email: sanitizedEmail,
        tenantId,
      });
      res.json({
        message: 'If that email exists, a password reset link has been sent',
      });
      return;
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store token in database
    await query(
      `INSERT INTO password_reset_tokens (user_id, tenant_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.user_id, tenantId, hashedToken, expiresAt]
    );

    // Send password reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&tenant=${tenantId}`;

    // Import email service (dynamically to avoid circular dependencies)
    const { sendPasswordResetEmail } = await import('../services/emailService');

    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.full_name || user.username,
      resetUrl,
      tenantId
    );

    logger.info('Password reset requested', {
      userId: user.user_id,
      tenantId,
      emailSent: emailResult.success,
      emailError: emailResult.error
    });

    res.json({
      message: 'If that email exists, a password reset link has been sent',
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/reset-password
 * @desc Reset password using token
 * @access Public
 * @description Verifies reset token and updates user password
 */
router.post(
  '/tenants/:tenantId/reset-password',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const tenantId = sanitizeInteger(req.params.tenantId);

    if (!token || !newPassword) {
      throw new ValidationError('Token and new password are required');
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Hash the token to match database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid, unused token
    const resetToken = await queryOne<any>(
      `SELECT token_id, user_id, tenant_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token = $1 AND tenant_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [hashedToken, tenantId]
    );

    if (!resetToken) {
      throw new AuthenticationError('Invalid or expired password reset token');
    }

    // Check if token is expired
    if (new Date() > new Date(resetToken.expires_at)) {
      throw new AuthenticationError('Password reset token has expired');
    }

    // Check if token has been used
    if (resetToken.used_at) {
      throw new AuthenticationError('Password reset token has already been used');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await query(
      `UPDATE tenant_users
       SET password_hash = $1, updated_at = NOW()
       WHERE user_id = $2 AND tenant_id = $3`,
      [hashedPassword, resetToken.user_id, tenantId]
    );

    // Mark token as used
    await query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_id = $1`,
      [resetToken.token_id]
    );

    logger.info('Password reset successful', {
      userId: resetToken.user_id,
      tenantId,
    });

    res.json({
      message: 'Password reset successful. You can now login with your new password.',
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/change-password
 * @desc Change password (for logged-in users)
 * @access Protected (requires valid JWT)
 * @description Allows users to change their password by providing current password
 */
router.post(
  '/tenants/:tenantId/change-password',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const tenantId = sanitizeInteger(req.params.tenantId);

    // Get user from JWT token (added by verifyTenantAccess middleware)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    const userId = decoded.userId;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    if (currentPassword === newPassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // Get user with current password hash
    const user = await queryOne<any>(
      `SELECT user_id, password_hash, email
       FROM tenant_users
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, tenantId]
    );

    if (!user) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      `UPDATE tenant_users
       SET password_hash = $1, updated_at = NOW()
       WHERE user_id = $2 AND tenant_id = $3`,
      [hashedPassword, userId, tenantId]
    );

    logger.info('Password changed successfully', {
      userId,
      tenantId,
      email: user.email,
    });

    res.json({
      message: 'Password changed successfully',
    });
  })
);

export default router;
