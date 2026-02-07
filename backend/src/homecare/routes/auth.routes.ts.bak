import express, { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../middleware/errorHandler';
import { query, queryOne } from '../../config/database';
import { AuthenticationError, ValidationError } from '../../utils/errorTypes';
import { logger, auditLog } from '../../utils/logger';
import { setAuthCookie, clearAuthCookie } from '../../utils/cookieAuth';
import { sanitizeEmail } from '../../utils/sanitize';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';

const router: Router = express.Router();

/**
 * Authentication Routes for Home Care Co-operative System
 */

/**
 * @route POST /api/tenants/:tenantId/login
 * @desc Authenticate user and return JWT token
 */
router.post(
  '/tenants/:tenantId/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { username, password, rememberMe } = req.body;

    logger.info('Login attempt', { tenantId, username });

    // Validate input
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    // Find user by username or email
    const sanitizedUsername = sanitizeEmail(username) || username.toLowerCase().trim();

    const user = await queryOne<any>(
      `SELECT
        u.user_id, u.tenant_id, u.username, u.email, u.password_hash,
        u.role, u.full_name, u.is_active,
        c.carer_id, c.first_name as carer_first_name, c.last_name as carer_last_name,
        m.member_id, m.member_status,
        cl.client_id
      FROM tenant_users u
      LEFT JOIN tenant_carers c ON u.user_id = c.user_id AND u.tenant_id = c.tenant_id
      LEFT JOIN tenant_members m ON u.user_id = m.user_id AND u.tenant_id = m.tenant_id
      LEFT JOIN tenant_clients cl ON u.user_id = cl.user_id AND u.tenant_id = cl.tenant_id
      WHERE u.tenant_id = $1
        AND (u.username = $2 OR u.email = $2)
        AND u.is_active = true`,
      [tenantId, sanitizedUsername]
    );

    if (!user) {
      auditLog('LOGIN_FAILED', { tenantId, username, reason: 'User not found' });
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      auditLog('LOGIN_FAILED', { tenantId, username, reason: 'Invalid password' });
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const tokenPayload = {
      userId: user.user_id,
      tenantId: parseInt(tenantId, 10),
      role: user.role,
      email: user.email,
      carerId: user.carer_id || null,
      memberId: user.member_id || null,
      clientId: user.client_id || null,
      isCareer: !!user.carer_id,
      isMember: !!user.member_id && user.member_status === 'active',
      isClient: !!user.client_id,
    };

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn });

    // Set httpOnly cookie
    if (rememberMe) {
      // setAuthCookieWithExpiry(res, token, 30);
      res.cookie('homecare_auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    } else {
      setAuthCookie(res, token);
    }

    // Update last login
    await query(
      'UPDATE tenant_users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    auditLog('LOGIN_SUCCESS', {
      tenantId,
      userId: user.user_id,
      username: user.username,
      role: user.role,
    });

    logger.info('Login successful', { tenantId, userId: user.user_id });

    res.json({
      message: 'Login successful',
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        carerId: user.carer_id,
        memberId: user.member_id,
        clientId: user.client_id,
        isCareer: !!user.carer_id,
        isMember: !!user.member_id && user.member_status === 'active',
        isClient: !!user.client_id,
      },
      token, // Also return token for clients that need it
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/logout
 * @desc Logout user and clear cookie
 */
router.post(
  '/tenants/:tenantId/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    clearAuthCookie(res);

    auditLog('LOGOUT', { tenantId });

    res.json({ message: 'Logged out successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/verify
 * @desc Verify JWT token and return user info
 */
router.get(
  '/tenants/:tenantId/verify',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;

    // Get fresh user data from database
    const userData = await queryOne<any>(
      `SELECT
        u.user_id, u.username, u.email, u.full_name, u.role, u.is_active,
        c.carer_id, c.first_name as carer_first_name, c.last_name as carer_last_name,
        m.member_id, m.member_status,
        cl.client_id
      FROM tenant_users u
      LEFT JOIN tenant_carers c ON u.user_id = c.user_id AND u.tenant_id = c.tenant_id
      LEFT JOIN tenant_members m ON u.user_id = m.user_id AND u.tenant_id = m.tenant_id
      LEFT JOIN tenant_clients cl ON u.user_id = cl.user_id AND u.tenant_id = cl.tenant_id
      WHERE u.user_id = $1 AND u.tenant_id = $2 AND u.is_active = true`,
      [user.userId, user.tenantId]
    );

    if (!userData) {
      throw new AuthenticationError('User not found');
    }

    res.json({
      valid: true,
      user: {
        id: userData.user_id,
        username: userData.username,
        email: userData.email,
        fullName: userData.full_name,
        role: userData.role,
        carerId: userData.carer_id,
        memberId: userData.member_id,
        clientId: userData.client_id,
        isCareer: !!userData.carer_id,
        isMember: !!userData.member_id && userData.member_status === 'active',
        isClient: !!userData.client_id,
      },
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/change-password
 * @desc Change user password
 */
router.post(
  '/tenants/:tenantId/change-password',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current and new password are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters');
    }

    // Get current password hash
    const userData = await queryOne<any>(
      'SELECT password_hash FROM tenant_users WHERE user_id = $1 AND tenant_id = $2',
      [user.userId, user.tenantId]
    );

    if (!userData) {
      throw new AuthenticationError('User not found');
    }

    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, userData.password_hash);
    if (!passwordValid) {
      auditLog('PASSWORD_CHANGE_FAILED', {
        userId: user.userId,
        tenantId: user.tenantId,
        reason: 'Invalid current password',
      });
      throw new ValidationError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE tenant_users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2 AND tenant_id = $3',
      [newPasswordHash, user.userId, user.tenantId]
    );

    auditLog('PASSWORD_CHANGED', {
      userId: user.userId,
      tenantId: user.tenantId,
    });

    res.json({ message: 'Password changed successfully' });
  })
);

export default router;
