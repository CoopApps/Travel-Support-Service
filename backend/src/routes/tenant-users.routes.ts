import express, { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler';
import { query, queryOne } from '../config/database';
import { NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Tenant User Management Routes
 *
 * For platform admins to manage users within tenants
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
