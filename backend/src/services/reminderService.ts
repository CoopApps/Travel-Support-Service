import { query } from '../config/database';
import { logger } from '../utils/logger';
import axios from 'axios';

/**
 * Reminder Service
 *
 * Handles sending SMS and email reminders to customers
 * Integrates with Twilio (SMS) and SendGrid (Email)
 *
 * IMPORTANT: This service requires external API credentials to be configured
 * in tenant_settings before it can send reminders
 */

interface TenantSettings {
  reminder_enabled: boolean;
  reminder_type: 'sms' | 'email' | 'both';
  reminder_timing: number; // minutes before pickup
  reminder_template_sms?: string;
  reminder_template_email_subject?: string;
  reminder_template_email_body?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  sendgrid_api_key?: string;
  sendgrid_from_email?: string;
  sendgrid_from_name?: string;
}

interface TripReminderData {
  tripId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  tripDate: string;
  pickupTime: string;
  pickupLocation: string;
  destination: string;
  driverName: string;
  driverPhone: string;
}

interface SendReminderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus: 'sent' | 'failed' | 'pending';
}

/**
 * Load tenant reminder settings from database
 */
export async function getTenantReminderSettings(tenantId: number): Promise<TenantSettings | null> {
  try {
    const settings = await query(
      `SELECT setting_key, setting_value
       FROM tenant_settings
       WHERE tenant_id = $1
         AND setting_key LIKE 'reminder%'
          OR setting_key LIKE 'twilio%'
          OR setting_key LIKE 'sendgrid%'`,
      [tenantId]
    );

    if (settings.length === 0) {
      return null;
    }

    // Convert array of key-value pairs to object
    const settingsObj: any = {};
    settings.forEach((row: any) => {
      const key = row.setting_key;
      const value = row.setting_value;

      // Parse boolean values
      if (key === 'reminder_enabled') {
        settingsObj[key] = value === 'true';
      }
      // Parse numeric values
      else if (key === 'reminder_timing') {
        settingsObj[key] = parseInt(value) || 60;
      }
      // Store as string
      else {
        settingsObj[key] = value;
      }
    });

    // Validate required fields
    if (!settingsObj.reminder_enabled) {
      logger.info('Reminders disabled for tenant', { tenantId });
      return null;
    }

    return settingsObj as TenantSettings;
  } catch (error) {
    logger.error('Error loading tenant reminder settings', { tenantId, error });
    return null;
  }
}

/**
 * Render template by replacing variables with actual data
 */
function renderTemplate(template: string, data: TripReminderData): string {
  return template
    .replace(/\{\{customer_name\}\}/g, data.customerName)
    .replace(/\{\{pickup_time\}\}/g, data.pickupTime)
    .replace(/\{\{pickup_location\}\}/g, data.pickupLocation)
    .replace(/\{\{destination\}\}/g, data.destination)
    .replace(/\{\{driver_name\}\}/g, data.driverName)
    .replace(/\{\{driver_phone\}\}/g, data.driverPhone)
    .replace(/\{\{trip_date\}\}/g, data.tripDate);
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(
  tenantId: number,
  settings: TenantSettings,
  data: TripReminderData
): Promise<SendReminderResult> {
  try {
    // Validate Twilio credentials
    if (!settings.twilio_account_sid || !settings.twilio_auth_token || !settings.twilio_phone_number) {
      logger.error('Twilio credentials not configured', { tenantId });
      return {
        success: false,
        error: 'Twilio credentials not configured',
        deliveryStatus: 'failed'
      };
    }

    // Validate customer phone number
    if (!data.customerPhone) {
      logger.warn('Customer has no phone number', { tenantId, customerId: data.customerId });
      return {
        success: false,
        error: 'Customer has no phone number',
        deliveryStatus: 'failed'
      };
    }

    // Render SMS template
    const message = renderTemplate(
      settings.reminder_template_sms || 'Your trip is scheduled for {{pickup_time}} from {{pickup_location}}.',
      data
    );

    // Send via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json`;

    const response = await axios.post(
      twilioUrl,
      new URLSearchParams({
        To: data.customerPhone,
        From: settings.twilio_phone_number,
        Body: message
      }),
      {
        auth: {
          username: settings.twilio_account_sid,
          password: settings.twilio_auth_token
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    logger.info('SMS reminder sent successfully', {
      tenantId,
      tripId: data.tripId,
      customerId: data.customerId,
      messageSid: response.data.sid
    });

    // Log to reminder history
    await logReminderHistory(
      tenantId,
      data.tripId,
      data.customerId,
      'sms',
      data.customerPhone,
      message,
      'sent',
      response.data.sid,
      response.data
    );

    return {
      success: true,
      messageId: response.data.sid,
      deliveryStatus: 'sent'
    };
  } catch (error: any) {
    logger.error('Failed to send SMS reminder', {
      tenantId,
      tripId: data.tripId,
      error: error.message,
      response: error.response?.data
    });

    // Log failed attempt
    await logReminderHistory(
      tenantId,
      data.tripId,
      data.customerId,
      'sms',
      data.customerPhone,
      'Failed to render or send',
      'failed',
      null,
      null,
      error.message
    );

    return {
      success: false,
      error: error.message,
      deliveryStatus: 'failed'
    };
  }
}

/**
 * Send Email via SendGrid
 */
async function sendEmail(
  tenantId: number,
  settings: TenantSettings,
  data: TripReminderData
): Promise<SendReminderResult> {
  try {
    // Validate SendGrid credentials
    if (!settings.sendgrid_api_key || !settings.sendgrid_from_email) {
      logger.error('SendGrid credentials not configured', { tenantId });
      return {
        success: false,
        error: 'SendGrid credentials not configured',
        deliveryStatus: 'failed'
      };
    }

    // Validate customer email
    if (!data.customerEmail) {
      logger.warn('Customer has no email address', { tenantId, customerId: data.customerId });
      return {
        success: false,
        error: 'Customer has no email address',
        deliveryStatus: 'failed'
      };
    }

    // Render email templates
    const subject = renderTemplate(
      settings.reminder_template_email_subject || 'Trip Reminder: {{pickup_time}}',
      data
    );

    const body = renderTemplate(
      settings.reminder_template_email_body ||
        '<p>Your trip is scheduled for {{pickup_time}} from {{pickup_location}} to {{destination}}.</p>',
      data
    );

    // Send via SendGrid API
    const response = await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [
          {
            to: [{ email: data.customerEmail, name: data.customerName }],
            subject: subject
          }
        ],
        from: {
          email: settings.sendgrid_from_email,
          name: settings.sendgrid_from_name || 'Transport Team'
        },
        content: [
          {
            type: 'text/html',
            value: body
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${settings.sendgrid_api_key}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info('Email reminder sent successfully', {
      tenantId,
      tripId: data.tripId,
      customerId: data.customerId,
      messageId: response.headers['x-message-id']
    });

    // Log to reminder history
    await logReminderHistory(
      tenantId,
      data.tripId,
      data.customerId,
      'email',
      data.customerEmail,
      `Subject: ${subject}\n\n${body}`,
      'sent',
      response.headers['x-message-id'],
      { status: response.status, statusText: response.statusText }
    );

    return {
      success: true,
      messageId: response.headers['x-message-id'],
      deliveryStatus: 'sent'
    };
  } catch (error: any) {
    logger.error('Failed to send email reminder', {
      tenantId,
      tripId: data.tripId,
      error: error.message,
      response: error.response?.data
    });

    // Log failed attempt
    await logReminderHistory(
      tenantId,
      data.tripId,
      data.customerId,
      'email',
      data.customerEmail,
      'Failed to render or send',
      'failed',
      null,
      null,
      error.message
    );

    return {
      success: false,
      error: error.message,
      deliveryStatus: 'failed'
    };
  }
}

/**
 * Log reminder to history table
 */
async function logReminderHistory(
  tenantId: number,
  tripId: number,
  customerId: number,
  reminderType: 'sms' | 'email',
  recipient: string,
  messageContent: string,
  deliveryStatus: string,
  providerMessageId: string | null,
  providerResponse: any,
  errorMessage?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO reminder_history
        (tenant_id, trip_id, customer_id, reminder_type, recipient, message_content,
         delivery_status, provider_message_id, provider_response, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        tenantId,
        tripId,
        customerId,
        reminderType,
        recipient,
        messageContent,
        deliveryStatus,
        providerMessageId,
        providerResponse ? JSON.stringify(providerResponse) : null,
        errorMessage || null
      ]
    );
  } catch (error) {
    logger.error('Failed to log reminder history', { tenantId, tripId, error });
    // Don't throw - logging failure shouldn't break reminder sending
  }
}

/**
 * Send reminder for a specific trip
 */
export async function sendTripReminder(
  tenantId: number,
  tripId: number
): Promise<{ success: boolean; sms?: SendReminderResult; email?: SendReminderResult; error?: string }> {
  try {
    // Load tenant settings
    const settings = await getTenantReminderSettings(tenantId);
    if (!settings) {
      return {
        success: false,
        error: 'Reminders not enabled or configured for this tenant'
      };
    }

    // Load trip and customer data
    const tripData = await query(
      `SELECT
        t.trip_id,
        t.trip_date,
        t.pickup_time,
        t.pickup_location,
        t.destination,
        c.customer_id,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        c.reminder_opt_in,
        d.name as driver_name,
        d.phone as driver_phone
      FROM tenant_trips t
      INNER JOIN tenant_customers c ON t.customer_id = c.customer_id
      LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id
      WHERE t.tenant_id = $1 AND t.trip_id = $2`,
      [tenantId, tripId]
    );

    if (tripData.length === 0) {
      return {
        success: false,
        error: 'Trip not found'
      };
    }

    const trip = tripData[0];

    // Check if customer opted in
    if (!trip.reminder_opt_in) {
      logger.info('Customer opted out of reminders', { tenantId, tripId, customerId: trip.customer_id });
      return {
        success: false,
        error: 'Customer opted out of reminders'
      };
    }

    const reminderData: TripReminderData = {
      tripId: trip.trip_id,
      customerId: trip.customer_id,
      customerName: trip.customer_name,
      customerPhone: trip.customer_phone,
      customerEmail: trip.customer_email,
      tripDate: trip.trip_date,
      pickupTime: trip.pickup_time,
      pickupLocation: trip.pickup_location,
      destination: trip.destination,
      driverName: trip.driver_name || 'Your Driver',
      driverPhone: trip.driver_phone || 'TBD'
    };

    const results: any = { success: false };

    // Send SMS if configured
    if (settings.reminder_type === 'sms' || settings.reminder_type === 'both') {
      results.sms = await sendSMS(tenantId, settings, reminderData);
      if (results.sms.success) {
        results.success = true;
      }
    }

    // Send Email if configured
    if (settings.reminder_type === 'email' || settings.reminder_type === 'both') {
      results.email = await sendEmail(tenantId, settings, reminderData);
      if (results.email.success) {
        results.success = true;
      }
    }

    return results;
  } catch (error: any) {
    logger.error('Error sending trip reminder', { tenantId, tripId, error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get upcoming trips that need reminders
 * (Called by scheduled job)
 */
export async function getUpcomingTripsForReminders(tenantId: number): Promise<number[]> {
  try {
    const settings = await getTenantReminderSettings(tenantId);
    if (!settings) {
      return [];
    }

    const reminderMinutes = settings.reminder_timing || 60;

    // Find trips that are:
    // - Scheduled status
    // - Pickup time is between now and now + reminderMinutes
    // - Customer opted in
    // - No reminder sent yet (or last reminder was more than 30 minutes ago)
    const trips = await query(
      `SELECT DISTINCT t.trip_id
       FROM tenant_trips t
       INNER JOIN tenant_customers c ON t.customer_id = c.customer_id
       WHERE t.tenant_id = $1
         AND t.status = 'scheduled'
         AND c.reminder_opt_in = true
         AND t.trip_date = CURRENT_DATE
         AND t.pickup_time BETWEEN
           (CURRENT_TIME + INTERVAL '5 minutes') AND
           (CURRENT_TIME + INTERVAL '${reminderMinutes} minutes')
         AND NOT EXISTS (
           SELECT 1 FROM reminder_history rh
           WHERE rh.trip_id = t.trip_id
             AND rh.delivery_status = 'sent'
             AND rh.sent_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
         )`,
      [tenantId]
    );

    return trips.map((row: any) => row.trip_id);
  } catch (error) {
    logger.error('Error fetching upcoming trips for reminders', { tenantId, error });
    return [];
  }
}

/**
 * Get reminder history for a trip
 */
export async function getTripReminderHistory(tenantId: number, tripId: number): Promise<any[]> {
  try {
    const history = await query(
      `SELECT
        reminder_id,
        reminder_type,
        recipient,
        sent_at,
        delivery_status,
        error_message
      FROM reminder_history
      WHERE tenant_id = $1 AND trip_id = $2
      ORDER BY sent_at DESC`,
      [tenantId, tripId]
    );

    return history;
  } catch (error) {
    logger.error('Error fetching reminder history', { tenantId, tripId, error });
    return [];
  }
}
