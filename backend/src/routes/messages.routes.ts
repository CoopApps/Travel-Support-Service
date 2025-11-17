import express, { Request, Response, Router } from 'express';
import { query, queryOne } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';

const router: Router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    tenantId: number;
    role: string;
  };
}
  /**
   * GET /tenants/:tenantId/messages
   * Get all messages sent by admin to customers
   */
  router.get(
    '/tenants/:tenantId/messages',
    verifyTenantAccess,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { tenantId } = req.params;
      const { customerId } = req.query;

      let sql = `
        SELECT
          m.message_id,
          m.target_customer_id,
          m.title,
          m.message,
          m.priority,
          m.created_at,
          m.expires_at,
          m.created_by,
          m.delivery_method,
          m.email_subject,
          m.sms_body,
          m.status,
          m.is_draft,
          m.scheduled_at,
          m.sent_at,
          m.delivered_at,
          m.failed_reason,
          u.username as created_by_name,
          c.name as customer_name,
          COUNT(DISTINCT mr.read_id) as read_count,
          CASE WHEN m.target_customer_id IS NULL THEN (
            SELECT COUNT(*) FROM tenant_customers WHERE tenant_id = $1 AND is_active = true
          ) ELSE 1 END as total_recipients
        FROM tenant_messages m
        LEFT JOIN tenant_users u ON m.created_by = u.user_id
        LEFT JOIN tenant_customers c ON m.target_customer_id = c.customer_id
        LEFT JOIN customer_message_reads mr ON m.message_id = mr.message_id
        WHERE m.tenant_id = $1
      `;

      const params: any[] = [tenantId];

      if (customerId) {
        sql += ` AND (m.target_customer_id = $${params.length + 1} OR m.target_customer_id IS NULL)`;
        params.push(customerId);
      }

      sql += `
        GROUP BY m.message_id, m.target_customer_id, m.title, m.message, m.priority,
                 m.created_at, m.expires_at, m.created_by, m.delivery_method, m.email_subject,
                 m.sms_body, m.status, m.is_draft, m.scheduled_at, m.sent_at, m.delivered_at,
                 m.failed_reason, u.username, c.name
        ORDER BY m.created_at DESC
      `;

      const messages = await query(sql, params);

      return res.json({ messages });
    })
  );

  /**
   * GET /tenants/:tenantId/messages/from-customers
   * Get all messages sent by customers to office
   */
  router.get(
    '/tenants/:tenantId/messages/from-customers',
    verifyTenantAccess,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { tenantId } = req.params;
      const { status } = req.query;

      let sql = `
        SELECT
          cm.message_id,
          cm.customer_id,
          cm.subject,
          cm.message,
          cm.status,
          cm.created_at,
          cm.read_at,
          cm.read_by,
          cm.reply_message_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          u.username as read_by_name,
          tm.title as reply_title
        FROM customer_messages_to_office cm
        JOIN tenant_customers c ON cm.customer_id = c.customer_id
        LEFT JOIN tenant_users u ON cm.read_by = u.user_id
        LEFT JOIN tenant_messages tm ON cm.reply_message_id = tm.message_id
        WHERE cm.tenant_id = $1
      `;

      const params: any[] = [tenantId];

      if (status) {
        sql += ` AND cm.status = $${params.length + 1}`;
        params.push(status);
      }

      sql += ` ORDER BY cm.created_at DESC`;

      const messages = await query(sql, params);

      return res.json({ messages });
    })
  );

  /**
   * POST /tenants/:tenantId/messages
   * Create a new message to customer(s)
   */
  router.post(
    '/tenants/:tenantId/messages',
    verifyTenantAccess,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { tenantId } = req.params;
      const {
        targetCustomerId,
        title,
        message,
        priority,
        expiresAt,
        deliveryMethod,
        emailSubject,
        smsBody,
        isDraft,
        scheduledAt
      } = req.body;
      const userId = req.user?.userId;

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
      }

      // Validate delivery method requirements
      if ((deliveryMethod === 'email' || deliveryMethod === 'both') && !emailSubject) {
        return res.status(400).json({ error: 'Email subject is required for email delivery' });
      }
      if ((deliveryMethod === 'sms' || deliveryMethod === 'both') && !smsBody) {
        return res.status(400).json({ error: 'SMS message is required for SMS delivery' });
      }

      // Determine status based on draft and scheduled flags
      let status = 'sent';
      let sentAt = null;

      if (isDraft) {
        status = 'draft';
      } else if (scheduledAt) {
        status = 'scheduled';
      } else {
        sentAt = new Date().toISOString();
      }

      const result = await query(
        `INSERT INTO tenant_messages
          (tenant_id, target_customer_id, title, message, priority, created_by, expires_at,
           delivery_method, email_subject, sms_body, status, is_draft, scheduled_at, sent_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          tenantId,
          targetCustomerId || null,
          title,
          message,
          priority || 'normal',
          userId,
          expiresAt || null,
          deliveryMethod || 'in-app',
          emailSubject || null,
          smsBody || null,
          status,
          isDraft || false,
          scheduledAt || null,
          sentAt
        ]
      );

      return res.json({ message: result[0] });
    })
  );

  /**
   * PUT /tenants/:tenantId/messages/from-customers/:messageId/mark-read
   * Mark a customer message as read
   */
  router.put(
    '/tenants/:tenantId/messages/from-customers/:messageId/mark-read',
    verifyTenantAccess,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { tenantId, messageId } = req.params;
      const userId = req.user?.userId;

      const result = await query(
        `UPDATE customer_messages_to_office
        SET status = 'read', read_at = NOW(), read_by = $1
        WHERE message_id = $2 AND tenant_id = $3 AND status = 'unread'
        RETURNING *`,
        [userId, messageId, tenantId]
      );

      if (result.length === 0) {
        return res.status(404).json({ error: 'Message not found or already read' });
      }

      return res.json({ message: result[0] });
    })
  );

  /**
   * POST /tenants/:tenantId/messages/from-customers/:messageId/reply
   * Reply to a customer message
   */
  router.post(
    '/tenants/:tenantId/messages/from-customers/:messageId/reply',
    verifyTenantAccess,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { tenantId, messageId } = req.params;
      const { title, message } = req.body;
      const userId = req.user?.userId;

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
      }

      // Get the original message to find customer
      const originalMessage = await queryOne(
        `SELECT customer_id FROM customer_messages_to_office
        WHERE message_id = $1 AND tenant_id = $2`,
        [messageId, tenantId]
      );

      if (!originalMessage) {
        return res.status(404).json({ error: 'Original message not found' });
      }

      // Create reply message
      const replyResult = await query(
        `INSERT INTO tenant_messages
          (tenant_id, target_customer_id, title, message, priority, created_by)
        VALUES ($1, $2, $3, $4, 'normal', $5)
        RETURNING *`,
        [tenantId, originalMessage.customer_id, title, message, userId]
      );

      // Update customer message with reply reference
      await query(
        `UPDATE customer_messages_to_office
        SET status = 'replied', reply_message_id = $1, read_at = NOW(), read_by = $2
        WHERE message_id = $3 AND tenant_id = $4`,
        [replyResult[0].message_id, userId, messageId, tenantId]
      );

      return res.json({ reply: replyResult[0] });
    })
  );

  /**
   * DELETE /tenants/:tenantId/messages/:messageId
   * Delete a message
   */
  router.delete(
    '/tenants/:tenantId/messages/:messageId',
    verifyTenantAccess,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { tenantId, messageId } = req.params;

      const result = await query(
        `DELETE FROM tenant_messages
        WHERE message_id = $1 AND tenant_id = $2
        RETURNING *`,
        [messageId, tenantId]
      );

      if (result.length === 0) {
        return res.status(404).json({ error: 'Message not found' });
      }

      return res.json({ success: true });
    })
  );

  /**
   * GET /tenants/:tenantId/messages/stats
   * Get messaging statistics
   */
  router.get(
    '/tenants/:tenantId/messages/stats',
    verifyTenantAccess,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { tenantId } = req.params;

      const stats = await queryOne(
        `SELECT
          COUNT(DISTINCT CASE WHEN target_customer_id IS NULL THEN message_id END) as broadcast_count,
          COUNT(DISTINCT CASE WHEN target_customer_id IS NOT NULL THEN message_id END) as direct_count,
          COUNT(DISTINCT message_id) as total_sent
        FROM tenant_messages
        WHERE tenant_id = $1`,
        [tenantId]
      );

      const customerMessageStats = await queryOne(
        `SELECT
          COUNT(DISTINCT CASE WHEN status = 'unread' THEN message_id END) as unread_count,
          COUNT(DISTINCT CASE WHEN status = 'read' THEN message_id END) as read_count,
          COUNT(DISTINCT CASE WHEN status = 'replied' THEN message_id END) as replied_count,
          COUNT(DISTINCT message_id) as total_received
        FROM customer_messages_to_office
        WHERE tenant_id = $1`,
        [tenantId]
      );

      return res.json({
        stats: {
          ...stats,
          ...customerMessageStats
        }
      });
    })
  );

export default router;
