import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Customer Reminder Routes
 *
 * Endpoints for managing customer trip reminders via SMS/Email
 */

/**
 * @route GET /api/tenants/:tenantId/customers/:customerId/reminder-config
 * @desc Get customer's reminder preferences
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/customers/:customerId/reminder-config',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;

    logger.info('Fetching customer reminder config', { tenantId, customerId });

    const customer = await queryOne<{
      customer_id: number;
      name: string;
      reminder_opt_in: boolean;
      reminder_preference: string;
      phone: string;
      email: string;
    }>(
      `SELECT customer_id, name, reminder_opt_in, reminder_preference, phone, email
       FROM tenant_customers
       WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true`,
      [tenantId, customerId]
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.json({
      customer_id: customer.customer_id,
      name: customer.name,
      reminder_opt_in: customer.reminder_opt_in,
      reminder_preference: customer.reminder_preference,
      phone: customer.phone,
      email: customer.email,
      can_receive_sms: !!customer.phone && ['sms', 'both'].includes(customer.reminder_preference),
      can_receive_email: !!customer.email && ['email', 'both'].includes(customer.reminder_preference),
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/customers/:customerId/reminder-config
 * @desc Update customer's reminder preferences
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/customers/:customerId/reminder-config',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { reminder_opt_in, reminder_preference } = req.body;

    logger.info('Updating customer reminder config', { tenantId, customerId });

    // Validate reminder_preference
    if (reminder_preference && !['sms', 'email', 'both', 'none'].includes(reminder_preference)) {
      throw new ValidationError('Invalid reminder_preference. Must be: sms, email, both, or none');
    }

    // Check customer exists
    const existing = await queryOne<{ customer_id: number }>(
      'SELECT customer_id FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true',
      [tenantId, customerId]
    );

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    // Update preferences
    const result = await queryOne<{
      customer_id: number;
      name: string;
      reminder_opt_in: boolean;
      reminder_preference: string;
    }>(
      `UPDATE tenant_customers
       SET reminder_opt_in = COALESCE($3, reminder_opt_in),
           reminder_preference = COALESCE($4, reminder_preference),
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND customer_id = $2
       RETURNING customer_id, name, reminder_opt_in, reminder_preference`,
      [tenantId, customerId, reminder_opt_in, reminder_preference]
    );

    logger.info('Customer reminder config updated', {
      tenantId,
      customerId,
      reminder_opt_in: result?.reminder_opt_in,
      reminder_preference: result?.reminder_preference,
    });

    res.json(result);
  })
);

/**
 * @route POST /api/tenants/:tenantId/customers/:customerId/send-reminder
 * @desc Send a reminder to the customer now
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/customers/:customerId/send-reminder',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { message, trip_id, reminder_type } = req.body;

    logger.info('Sending customer reminder', { tenantId, customerId, reminder_type });

    // Validate inputs
    if (!message || message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }

    if (reminder_type && !['sms', 'email'].includes(reminder_type)) {
      throw new ValidationError('Invalid reminder_type. Must be: sms or email');
    }

    // Fetch customer details and preferences
    const customer = await queryOne<{
      customer_id: number;
      name: string;
      reminder_opt_in: boolean;
      reminder_preference: string;
      phone: string;
      email: string;
    }>(
      `SELECT customer_id, name, reminder_opt_in, reminder_preference, phone, email
       FROM tenant_customers
       WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true`,
      [tenantId, customerId]
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check if customer has opted in
    if (!customer.reminder_opt_in) {
      throw new ValidationError('Customer has opted out of reminders');
    }

    // Determine which method to use
    const effectiveReminderType = reminder_type || customer.reminder_preference;

    // Validate customer has contact method
    if (effectiveReminderType === 'sms' && !customer.phone) {
      throw new ValidationError('Customer has no phone number for SMS');
    }

    if (effectiveReminderType === 'email' && !customer.email) {
      throw new ValidationError('Customer has no email address');
    }

    // Log the reminder (in a real system, this would integrate with SMS/Email service)
    const logResult = await queryOne<{
      reminder_id: number;
      sent_at: Date;
    }>(
      `INSERT INTO tenant_customer_reminder_logs (
        tenant_id, customer_id, trip_id, reminder_type,
        message, sent_at, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'sent')
      RETURNING reminder_id, sent_at`,
      [tenantId, customerId, trip_id || null, effectiveReminderType, message]
    );

    logger.info('Customer reminder sent', {
      tenantId,
      customerId,
      reminder_id: logResult?.reminder_id,
      reminder_type: effectiveReminderType,
    });

    // In production, this would actually send via SMS/Email service
    // For now, we just log it

    res.json({
      success: true,
      reminder_id: logResult?.reminder_id,
      sent_at: logResult?.sent_at,
      customer_name: customer.name,
      reminder_type: effectiveReminderType,
      message: message,
      note: 'Reminder logged. In production, this would send via SMS/Email service.',
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/customers/:customerId/reminder-logs
 * @desc Get reminder history for a customer
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/customers/:customerId/reminder-logs',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    logger.info('Fetching customer reminder logs', { tenantId, customerId });

    // Check customer exists
    const customer = await queryOne<{ customer_id: number; name: string }>(
      'SELECT customer_id, name FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true',
      [tenantId, customerId]
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Fetch reminder logs
    const logs = await query<{
      reminder_id: number;
      trip_id: number | null;
      reminder_type: string;
      message: string;
      sent_at: Date;
      status: string;
    }>(
      `SELECT reminder_id, trip_id, reminder_type, message, sent_at, status
       FROM tenant_customer_reminder_logs
       WHERE tenant_id = $1 AND customer_id = $2
       ORDER BY sent_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, customerId, parseInt(limit as string), parseInt(offset as string)]
    );

    // Get total count
    const countResult = await queryOne<{ total: string }>(
      'SELECT COUNT(*) as total FROM tenant_customer_reminder_logs WHERE tenant_id = $1 AND customer_id = $2',
      [tenantId, customerId]
    );

    const total = parseInt(countResult?.total || '0');

    res.json({
      customer_id: customer.customer_id,
      customer_name: customer.name,
      logs,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  })
);

export default router;
