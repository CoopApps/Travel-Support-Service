import express, { Router, Response } from 'express';
import { AuthenticatedRequest, verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Driver Messages Routes
 *
 * Handles messages/announcements from admins to drivers
 */

const router: Router = express.Router();

/**
 * GET /tenants/:tenantId/drivers/:driverId/messages
 * Get all messages for a driver
 */
router.get(
  '/tenants/:tenantId/drivers/:driverId/messages',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    // Verify user has access to this driver
    if (req.user?.role === 'driver' && req.user?.driverId !== parseInt(driverId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all active, non-expired messages for this driver
    const messages = await query(
      `SELECT
        m.message_id,
        m.title,
        m.message,
        m.priority,
        m.created_at,
        m.target_driver_id,
        CASE WHEN mr.read_id IS NOT NULL THEN true ELSE false END as read
      FROM driver_messages m
      LEFT JOIN driver_message_reads mr
        ON m.message_id = mr.message_id
        AND mr.driver_id = $2
      WHERE m.tenant_id = $1
        AND m.is_active = true
        AND (m.expires_at IS NULL OR m.expires_at > CURRENT_TIMESTAMP)
        AND (m.target_driver_id IS NULL OR m.target_driver_id = $2)
      ORDER BY m.created_at DESC
      LIMIT 50`,
      [tenantId, driverId]
    );

    return res.json({ messages });
  })
);

/**
 * POST /tenants/:tenantId/drivers/:driverId/messages/:messageId/read
 * Mark a message as read
 */
router.post(
  '/tenants/:tenantId/drivers/:driverId/messages/:messageId/read',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { driverId, messageId } = req.params;

    // Verify user has access to this driver
    if (req.user?.role === 'driver' && req.user?.driverId !== parseInt(driverId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark as read (INSERT ON CONFLICT DO NOTHING)
    await query(
      `INSERT INTO driver_message_reads (message_id, driver_id)
      VALUES ($1, $2)
      ON CONFLICT (message_id, driver_id) DO NOTHING`,
      [messageId, driverId]
    );

    return res.json({ success: true });
  })
);

/**
 * GET /tenants/:tenantId/drivers/:driverId/messages/unread-count
 * Get count of unread messages
 */
router.get(
  '/tenants/:tenantId/drivers/:driverId/messages/unread-count',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    // Verify user has access to this driver
    if (req.user?.role === 'driver' && req.user?.driverId !== parseInt(driverId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await queryOne(
      `SELECT COUNT(*) as unread_count
      FROM driver_messages m
      WHERE m.tenant_id = $1
        AND m.is_active = true
        AND (m.expires_at IS NULL OR m.expires_at > CURRENT_TIMESTAMP)
        AND (m.target_driver_id IS NULL OR m.target_driver_id = $2)
        AND NOT EXISTS (
          SELECT 1 FROM driver_message_reads mr
          WHERE mr.message_id = m.message_id
          AND mr.driver_id = $2
        )`,
      [tenantId, driverId]
    );

    return res.json({ unreadCount: parseInt(result?.unread_count || '0') });
  })
);

/**
 * POST /tenants/:tenantId/messages
 * Create a new message (admin only)
 */
router.post(
  '/tenants/:tenantId/messages',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { title, message, priority, targetDriverId, expiresAt } = req.body;

    // Verify admin access
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    const messagePriority = priority || 'medium';
    if (!validPriorities.includes(messagePriority)) {
      return res.status(400).json({ error: 'Invalid priority. Must be low, medium, or high' });
    }

    // Create message
    const newMessage = await queryOne(
      `INSERT INTO driver_messages
        (tenant_id, title, message, priority, created_by, target_driver_id, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        tenantId,
        title,
        message,
        messagePriority,
        req.user?.userId,
        targetDriverId || null,
        expiresAt || null
      ]
    );

    return res.status(201).json({ message: newMessage });
  })
);

/**
 * GET /tenants/:tenantId/messages
 * Get all messages for tenant (admin only)
 */
router.get(
  '/tenants/:tenantId/messages',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Verify admin access
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const messages = await query(
      `SELECT
        m.*,
        d.name as target_driver_name,
        COUNT(DISTINCT mr.driver_id) as read_count
      FROM driver_messages m
      LEFT JOIN tenant_drivers d ON m.target_driver_id = d.driver_id
      LEFT JOIN driver_message_reads mr ON m.message_id = mr.message_id
      WHERE m.tenant_id = $1
      GROUP BY m.message_id, d.name
      ORDER BY m.created_at DESC`,
      [tenantId]
    );

    return res.json({ messages });
  })
);

/**
 * DELETE /tenants/:tenantId/messages/:messageId
 * Delete a message (admin only)
 */
router.delete(
  '/tenants/:tenantId/messages/:messageId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, messageId } = req.params;

    // Verify admin access
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Soft delete (set is_active to false)
    await query(
      `UPDATE driver_messages
      SET is_active = false
      WHERE message_id = $1 AND tenant_id = $2`,
      [messageId, tenantId]
    );

    return res.json({ success: true });
  })
);

/**
 * POST /tenants/:tenantId/drivers/:driverId/messages-to-office
 * Send a message from driver to office (driver only)
 */
router.post(
  '/tenants/:tenantId/drivers/:driverId/messages-to-office',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { subject, message } = req.body;

    // Verify user has access to this driver
    if (req.user?.role === 'driver' && req.user?.driverId !== parseInt(driverId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Create message
    const newMessage = await queryOne(
      `INSERT INTO driver_to_office_messages
        (tenant_id, driver_id, subject, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [tenantId, driverId, subject, message]
    );

    return res.status(201).json({ message: newMessage });
  })
);

/**
 * GET /tenants/:tenantId/drivers/:driverId/messages-to-office
 * Get all messages sent by this driver to office
 */
router.get(
  '/tenants/:tenantId/drivers/:driverId/messages-to-office',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    // Verify user has access to this driver
    if (req.user?.role === 'driver' && req.user?.driverId !== parseInt(driverId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await query(
      `SELECT
        message_id,
        subject,
        message,
        status,
        created_at,
        read_at,
        resolved_at,
        admin_response
      FROM driver_to_office_messages
      WHERE tenant_id = $1 AND driver_id = $2
      ORDER BY created_at DESC
      LIMIT 50`,
      [tenantId, driverId]
    );

    return res.json({ messages });
  })
);

/**
 * GET /tenants/:tenantId/messages-from-drivers
 * Get all messages from drivers to office (admin only)
 */
router.get(
  '/tenants/:tenantId/messages-from-drivers',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Verify admin access
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const messages = await query(
      `SELECT
        m.message_id,
        m.subject,
        m.message,
        m.status,
        m.created_at,
        m.read_at,
        m.resolved_at,
        m.admin_response,
        d.driver_id,
        d.name as driver_name,
        d.phone as driver_phone
      FROM driver_to_office_messages m
      INNER JOIN tenant_drivers d ON m.driver_id = d.driver_id
      WHERE m.tenant_id = $1
      ORDER BY
        CASE m.status
          WHEN 'pending' THEN 1
          WHEN 'read' THEN 2
          WHEN 'resolved' THEN 3
        END,
        m.created_at DESC
      LIMIT 100`,
      [tenantId]
    );

    return res.json({ messages });
  })
);

/**
 * PATCH /tenants/:tenantId/messages-from-drivers/:messageId
 * Update message status or add admin response (admin only)
 */
router.patch(
  '/tenants/:tenantId/messages-from-drivers/:messageId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, messageId } = req.params;
    const { status, adminResponse } = req.body;

    // Verify admin access
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;

      if (status === 'read' && !adminResponse) {
        updates.push(`read_at = CURRENT_TIMESTAMP`);
        updates.push(`read_by = $${paramCount}`);
        values.push(req.user?.userId);
        paramCount++;
      } else if (status === 'resolved') {
        updates.push(`resolved_at = CURRENT_TIMESTAMP`);
        updates.push(`resolved_by = $${paramCount}`);
        values.push(req.user?.userId);
        paramCount++;
      }
    }

    if (adminResponse) {
      updates.push(`admin_response = $${paramCount}`);
      values.push(adminResponse);
      paramCount++;
      // Auto-mark as resolved when admin responds
      if (status !== 'resolved') {
        updates.push(`status = 'resolved'`);
        updates.push(`resolved_at = CURRENT_TIMESTAMP`);
        updates.push(`resolved_by = $${paramCount}`);
        values.push(req.user?.userId);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(messageId, tenantId);

    const updatedMessage = await queryOne(
      `UPDATE driver_to_office_messages
      SET ${updates.join(', ')}
      WHERE message_id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING *`,
      values
    );

    return res.json({ message: updatedMessage });
  })
);

export default router;
