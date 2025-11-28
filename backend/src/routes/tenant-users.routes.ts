import express, { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Tenant User Management Routes
 *
 * IMPORTANT: These routes allow tenant admins to manage their team
 * Critical for commercial SaaS - admins need to add/remove users
 */

/**
 * @route GET /api/tenants/:tenantId/users
 * @desc Get all users for the tenant
 * @access Protected (Tenant Admin)
 */
router.get(
  '/tenants/:tenantId/users',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching users for tenant', { tenantId });

    const users = await query(
      `SELECT
        user_id,
        tenant_id,
        username,
        email,
        full_name,
        role,
        is_active,
        created_at,
        last_login,
        phone
      FROM tenant_users
      WHERE tenant_id = $1
      ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json(users);
  })
);

/**
 * @route POST /api/tenants/:tenantId/users
 * @desc Create new user in tenant
 * @access Protected (Tenant Admin only)
 */
router.post(
  '/tenants/:tenantId/users',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { username, email, password, fullName, phone, role } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    // Validate role
    const validRoles = ['admin', 'staff', 'driver', 'customer'];
    if (role && !validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    logger.info('Creating new user', { tenantId, username, email, role });

    // Check if username already exists in this tenant
    const existingUsername = await queryOne(
      'SELECT user_id FROM tenant_users WHERE tenant_id = $1 AND username = $2',
      [tenantId, username]
    );

    if (existingUsername) {
      throw new Error('Username already exists in this tenant');
    }

    // Check if email already exists across all tenants
    const existingEmail = await queryOne(
      'SELECT user_id FROM tenant_users WHERE email = $1',
      [email]
    );

    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await queryOne<{ user_id: number }>(
      `INSERT INTO tenant_users (
        tenant_id,
        username,
        email,
        password_hash,
        full_name,
        phone,
        role,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
      RETURNING user_id`,
      [tenantId, username, email, hashedPassword, fullName || null, phone || null, role || 'staff']
    );

    logger.info('User created successfully', {
      tenantId,
      userId: result?.user_id,
      username,
      role: role || 'staff'
    });

    res.status(201).json({
      message: 'User created successfully',
      userId: result?.user_id,
      username,
      email,
      role: role || 'staff'
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/users/:userId
 * @desc Update user details
 * @access Protected (Tenant Admin)
 */
router.put(
  '/tenants/:tenantId/users/:userId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, userId } = req.params;
    const { email, fullName, phone, role, isActive } = req.body;

    logger.info('Updating user', { tenantId, userId });

    // Check if user exists
    const user = await queryOne(
      'SELECT user_id FROM tenant_users WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, userId]
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (email !== undefined) {
      // Check if email already exists (excluding current user)
      const existingEmail = await queryOne(
        'SELECT user_id FROM tenant_users WHERE email = $1 AND user_id != $2',
        [email, userId]
      );
      if (existingEmail) {
        throw new Error('Email already registered');
      }
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }

    if (role !== undefined) {
      const validRoles = ['admin', 'staff', 'driver', 'customer'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = NOW()`);

    // Add WHERE clause parameters
    values.push(userId, tenantId);

    await query(
      `UPDATE tenant_users
       SET ${updates.join(', ')}
       WHERE user_id = $${paramCount++} AND tenant_id = $${paramCount}`,
      values
    );

    logger.info('User updated successfully', { tenantId, userId });

    res.json({ message: 'User updated successfully' });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/users/:userId
 * @desc Delete/deactivate user
 * @access Protected (Tenant Admin)
 */
router.delete(
  '/tenants/:tenantId/users/:userId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, userId } = req.params;
    const { permanent } = req.query;

    logger.info('Deleting user', { tenantId, userId, permanent });

    // Check if user exists
    const user = await queryOne(
      'SELECT user_id, username FROM tenant_users WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, userId]
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (permanent === 'true') {
      // Permanent deletion (careful!)
      await query(
        'DELETE FROM tenant_users WHERE user_id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      logger.warn('User permanently deleted', { tenantId, userId });

      res.json({ message: 'User permanently deleted' });
    } else {
      // Soft delete (deactivate)
      await query(
        'UPDATE tenant_users SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      logger.info('User deactivated', { tenantId, userId });

      res.json({ message: 'User deactivated' });
    }
  })
);

/**
 * @route POST /api/tenants/:tenantId/users/:userId/activate
 * @desc Reactivate deactivated user
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/users/:userId/activate',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, userId } = req.params;

    logger.info('Reactivating user', { tenantId, userId });

    // Check if user exists
    const user = await queryOne(
      'SELECT user_id FROM tenant_users WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, userId]
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await query(
      'UPDATE tenant_users SET is_active = true, updated_at = NOW() WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    logger.info('User reactivated', { tenantId, userId });

    res.json({ message: 'User reactivated successfully' });
  })
);

/**
 * LEGACY: Platform admin routes (keep for backwards compatibility)
 */

/**
 * @route GET /api/platform-admin/tenants/:tenantId/users
 * @desc Get all users for a tenant
 * @access Protected (Platform Admin)
 */
router.get(
  '/platform-admin/tenants/:tenantId/users',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching users for tenant (platform admin)', { tenantId });

    const users = await query(
      `SELECT
        user_id,
        tenant_id,
        username,
        email,
        full_name,
        role,
        is_active,
        created_at,
        last_login
      FROM tenant_users
      WHERE tenant_id = $1
      ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json(users);
  })
);

/**
 * @route POST /api/platform-admin/tenants/:tenantId/users/:userId/reset-password
 * @desc Reset user password (generate temporary password)
 * @access Protected (Platform Admin)
 */
router.post(
  '/platform-admin/tenants/:tenantId/users/:userId/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, userId } = req.params;

    logger.info('Resetting password for user', { tenantId, userId });

    // Check if user exists
    const user = await queryOne<{ user_id: number; username: string; email: string }>(
      'SELECT user_id, username, email FROM tenant_users WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, userId]
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update password
    await query(
      'UPDATE tenant_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND tenant_id = $3',
      [hashedPassword, userId, tenantId]
    );

    logger.info('Password reset successful', { tenantId, userId, username: user.username });

    res.json({
      username: user.username,
      temporaryPassword: tempPassword,
      emailSent: !!user.email, // In real system, would send email
    });
  })
);

/**
 * Generate a temporary password
 */
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const length = 12;
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

export default router;
