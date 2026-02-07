import express, { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../middleware/errorHandler';
import { queryOne } from '../../config/database';
import { AuthenticationError, ValidationError } from '../../utils/errorTypes';
import { logger, auditLog } from '../../utils/logger';
import { setAuthCookie, clearAuthCookie } from '../../utils/cookieAuth';
import { sanitizeEmail } from '../../utils/sanitize';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';

const router: Router = express.Router();

/**
 * Home Care Authentication Routes
 * Note: Uses the same authentication as the main platform
 * Users are stored in tenant_users table with role-based access
 */

/**
 * POST /api/homecare/tenants/:tenantId/login
 * Login for homecare users (carers, coordinators, admins)
 */
router.post(
  '/tenants/:tenantId/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Find user in tenant_users table
    const user = await queryOne(
      `SELECT
        user_id,
        tenant_id,
        email,
        password_hash,
        role,
        first_name,
        last_name,
        is_active
       FROM tenant_users
       WHERE tenant_id = $1 AND email = $2`,
      [tenantId, sanitizedEmail]
    );

    if (!user) {
      auditLog('login_failed', { tenantId, email: sanitizedEmail, reason: 'user_not_found' });
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.is_active) {
      auditLog('login_failed', { tenantId, email: sanitizedEmail, reason: 'user_inactive' });
      throw new AuthenticationError('Account is inactive');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      auditLog('login_failed', { tenantId, userId: user.user_id, reason: 'invalid_password' });
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const tokenPayload = {
      userId: user.user_id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '24h' });

    // Set auth cookie
    setAuthCookie(res, token);

    auditLog('login_success', {
      tenantId,
      userId: user.user_id,
      role: user.role,
    });

    logger.info(`User ${user.user_id} logged in for tenant ${tenantId}`);

    res.json({
      success: true,
      user: {
        userId: user.user_id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      token,
    });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/logout
 * Logout user
 */
router.post(
  '/tenants/:tenantId/logout',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    clearAuthCookie(res);

    auditLog('logout', {
      tenantId: user?.tenantId,
      userId: user?.userId,
    });

    logger.info(`User ${user?.userId} logged out`);

    res.json({ success: true, message: 'Logged out successfully' });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/verify
 * Verify authentication token
 */
router.get(
  '/tenants/:tenantId/verify',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // Fetch fresh user data
    const currentUser = await queryOne(
      `SELECT
        user_id,
        tenant_id,
        email,
        role,
        first_name,
        last_name,
        is_active
       FROM tenant_users
       WHERE tenant_id = $1 AND user_id = $2`,
      [user.tenantId, user.userId]
    );

    if (!currentUser || !currentUser.is_active) {
      throw new AuthenticationError('User is no longer active');
    }

    res.json({
      success: true,
      user: {
        userId: currentUser.user_id,
        tenantId: currentUser.tenant_id,
        email: currentUser.email,
        role: currentUser.role,
        firstName: currentUser.first_name,
        lastName: currentUser.last_name,
      },
    });
  })
);

export default router;
