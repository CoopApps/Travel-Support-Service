import { Router, Request, Response } from 'express';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { asyncHandler } from '../middleware/errorHandler';
import { query } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route GET /api/tenants/:tenantId/reminder-settings
 * @desc Get all reminder settings for a tenant
 * @access Protected (Admin only)
 */
router.get(
  '/tenants/:tenantId/reminder-settings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const settings = await query(
      `SELECT setting_key, setting_value
       FROM tenant_settings
       WHERE tenant_id = $1
         AND (setting_key LIKE 'reminder%'
          OR setting_key LIKE 'twilio%'
          OR setting_key LIKE 'sendgrid%')
       ORDER BY setting_key`,
      [tenantId]
    );

    // Convert to object
    const settingsObj: any = {};
    settings.forEach((row: any) => {
      let value = row.setting_value;

      // Parse booleans
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      // Parse numbers
      else if (!isNaN(value) && value !== '') value = Number(value);

      settingsObj[row.setting_key] = value;
    });

    // Hide sensitive credentials (only show if they're configured)
    const response = {
      ...settingsObj,
      twilio_account_sid: settingsObj.twilio_account_sid ? '***configured***' : null,
      twilio_auth_token: settingsObj.twilio_auth_token ? '***configured***' : null,
      sendgrid_api_key: settingsObj.sendgrid_api_key ? '***configured***' : null
    };

    return res.json({
      success: true,
      settings: response
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/reminder-settings
 * @desc Update reminder settings for a tenant
 * @access Protected (Admin only)
 */
router.put(
  '/tenants/:tenantId/reminder-settings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const updates = req.body;

    logger.info('Updating reminder settings', { tenantId, keys: Object.keys(updates) });

    // Validate required fields if enabling reminders
    if (updates.reminder_enabled === true || updates.reminder_enabled === 'true') {
      const reminderType = updates.reminder_type || 'sms';

      if (reminderType === 'sms' || reminderType === 'both') {
        if (!updates.twilio_account_sid || !updates.twilio_auth_token || !updates.twilio_phone_number) {
          // Check if they're already configured
          const existingTwilio = await query(
            `SELECT COUNT(*) as count
             FROM tenant_settings
             WHERE tenant_id = $1
               AND setting_key IN ('twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number')
               AND setting_value IS NOT NULL
               AND setting_value != ''`,
            [tenantId]
          );

          if (existingTwilio[0].count < 3) {
            return res.status(400).json({
              error: 'Twilio credentials required for SMS reminders (account_sid, auth_token, phone_number)'
            });
          }
        }
      }

      if (reminderType === 'email' || reminderType === 'both') {
        if (!updates.sendgrid_api_key || !updates.sendgrid_from_email) {
          // Check if they're already configured
          const existingSendGrid = await query(
            `SELECT COUNT(*) as count
             FROM tenant_settings
             WHERE tenant_id = $1
               AND setting_key IN ('sendgrid_api_key', 'sendgrid_from_email')
               AND setting_value IS NOT NULL
               AND setting_value != ''`,
            [tenantId]
          );

          if (existingSendGrid[0].count < 2) {
            return res.status(400).json({
              error: 'SendGrid credentials required for email reminders (api_key, from_email)'
            });
          }
        }
      }
    }

    // Upsert each setting
    for (const [key, value] of Object.entries(updates)) {
      // Skip if trying to update credentials with placeholder
      if (value === '***configured***') {
        continue;
      }

      // Convert value to string
      const stringValue = typeof value === 'boolean' ? String(value) : String(value);

      await query(
        `INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, setting_key)
         DO UPDATE SET setting_value = $3, updated_at = CURRENT_TIMESTAMP`,
        [tenantId, key, stringValue]
      );
    }

    logger.info('Reminder settings updated successfully', { tenantId });

    return res.json({
      success: true,
      message: 'Reminder settings updated successfully'
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/reminder-settings/test-connection
 * @desc Test Twilio or SendGrid connection
 * @access Protected (Admin only)
 */
router.post(
  '/tenants/:tenantId/reminder-settings/test-connection',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { type } = req.body; // 'twilio' or 'sendgrid'

    if (!type || !['twilio', 'sendgrid'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "twilio" or "sendgrid"' });
    }

    // Get credentials
    const credentials = await query(
      `SELECT setting_key, setting_value
       FROM tenant_settings
       WHERE tenant_id = $1
         AND setting_key LIKE $2`,
      [tenantId, `${type}%`]
    );

    const credsObj: any = {};
    credentials.forEach((row: any) => {
      credsObj[row.setting_key] = row.setting_value;
    });

    if (type === 'twilio') {
      if (!credsObj.twilio_account_sid || !credsObj.twilio_auth_token) {
        return res.status(400).json({ error: 'Twilio credentials not configured' });
      }

      // Test Twilio connection by fetching account info
      try {
        const axios = require('axios');
        const response = await axios.get(
          `https://api.twilio.com/2010-04-01/Accounts/${credsObj.twilio_account_sid}.json`,
          {
            auth: {
              username: credsObj.twilio_account_sid,
              password: credsObj.twilio_auth_token
            }
          }
        );

        return res.json({
          success: true,
          message: 'Twilio connection successful',
          accountStatus: response.data.status,
          accountName: response.data.friendly_name
        });
      } catch (error: any) {
        logger.error('Twilio connection test failed', { tenantId, error: error.message });
        return res.status(400).json({
          success: false,
          error: 'Twilio connection failed: ' + error.message
        });
      }
    } else {
      // type === 'sendgrid'
      if (!credsObj.sendgrid_api_key) {
        return res.status(400).json({ error: 'SendGrid API key not configured' });
      }

      // Test SendGrid connection by validating API key
      try {
        const axios = require('axios');
        const response = await axios.get('https://api.sendgrid.com/v3/scopes', {
          headers: {
            'Authorization': `Bearer ${credsObj.sendgrid_api_key}`
          }
        });

        return res.json({
          success: true,
          message: 'SendGrid connection successful',
          scopes: response.data.scopes.length
        });
      } catch (error: any) {
        logger.error('SendGrid connection test failed', { tenantId, error: error.message });
        return res.status(400).json({
          success: false,
          error: 'SendGrid connection failed: ' + error.message
        });
      }
    }
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/reminder-settings/:key
 * @desc Delete a specific reminder setting
 * @access Protected (Admin only)
 */
router.delete(
  '/tenants/:tenantId/reminder-settings/:key',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, key } = req.params;

    await query(
      `DELETE FROM tenant_settings
       WHERE tenant_id = $1 AND setting_key = $2`,
      [tenantId, key]
    );

    logger.info('Reminder setting deleted', { tenantId, key });

    return res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  })
);

export default router;
