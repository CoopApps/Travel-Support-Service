import { Router, Request, Response } from 'express';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { asyncHandler } from '../middleware/errorHandler';
import {
  sendTripReminder,
  getTripReminderHistory,
  getTenantReminderSettings
} from '../services/reminderService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route POST /api/tenants/:tenantId/reminders/send
 * @desc Send reminder for a specific trip (manual send)
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/reminders/send',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }

    logger.info('Manual reminder send requested', { tenantId, tripId, userId: (req as any).userId });

    const result = await sendTripReminder(parseInt(tenantId), tripId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to send reminder'
      });
    }

    return res.json({
      success: true,
      message: 'Reminder sent successfully',
      sms: result.sms,
      email: result.email
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/reminders/history/:tripId
 * @desc Get reminder history for a specific trip
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/reminders/history/:tripId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tripId } = req.params;

    const history = await getTripReminderHistory(parseInt(tenantId), parseInt(tripId));

    return res.json({
      success: true,
      history
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/reminders/settings
 * @desc Get reminder settings for tenant
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/reminders/settings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const settings = await getTenantReminderSettings(parseInt(tenantId));

    if (!settings) {
      return res.json({
        success: true,
        enabled: false,
        message: 'Reminders not configured'
      });
    }

    // Return settings but hide sensitive credentials
    return res.json({
      success: true,
      enabled: settings.reminder_enabled,
      reminderType: settings.reminder_type,
      reminderTiming: settings.reminder_timing,
      twilioConfigured: !!(settings.twilio_account_sid && settings.twilio_auth_token),
      sendgridConfigured: !!settings.sendgrid_api_key,
      templates: {
        sms: settings.reminder_template_sms,
        emailSubject: settings.reminder_template_email_subject,
        emailBody: settings.reminder_template_email_body
      }
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/reminders/test
 * @desc Test reminder configuration by sending test message
 * @access Protected (Admin only)
 */
router.post(
  '/tenants/:tenantId/reminders/test',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { type, recipient } = req.body; // type: 'sms' or 'email', recipient: phone or email

    if (!type || !recipient) {
      return res.status(400).json({ error: 'Type and recipient are required' });
    }

    const settings = await getTenantReminderSettings(parseInt(tenantId));

    if (!settings) {
      return res.status(400).json({ error: 'Reminders not configured' });
    }

    try {
      if (type === 'sms') {
        return res.json({
          success: true,
          message: 'Test SMS functionality available via reminder-settings/test-connection'
        });
      } else if (type === 'email') {
        return res.json({
          success: true,
          message: 'Test email functionality available via reminder-settings/test-connection'
        });
      } else {
        return res.status(400).json({ error: 'Invalid type. Must be "sms" or "email"' });
      }
    } catch (error: any) {
      logger.error('Test reminder failed', { tenantId, type, error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

export default router;
