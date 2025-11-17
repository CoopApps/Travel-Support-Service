/**
 * SMS Sending Service for Customer Messages
 *
 * Handles actual SMS delivery using Twilio
 * Integrates with messaging system and logs all sends
 */

import { Twilio } from 'twilio';
import { query } from '../config/database';
import { logger } from '../utils/logger';

// SMS configuration interface
interface SmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

// Get SMS configuration from environment
function getSmsConfig(): SmsConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return {
    accountSid,
    authToken,
    fromNumber
  };
}

/**
 * Create Twilio client
 */
function createTwilioClient(): Twilio | null {
  const config = getSmsConfig();

  if (!config) {
    logger.warn('Twilio credentials not configured - SMS messages will not be sent');
    return null;
  }

  return new Twilio(config.accountSid, config.authToken);
}

/**
 * Send SMS message to a customer
 */
export async function sendSmsMessage(
  tenantId: number,
  messageId: number,
  recipientPhone: string,
  messageBody: string,
  customerId?: number
): Promise<{ success: boolean; error?: string; providerResponse?: string }> {

  try {
    // Validate phone number format
    if (!recipientPhone || recipientPhone.trim() === '') {
      logger.warn('SMS not sent - no phone number provided', {
        messageId,
        customerId
      });

      await logSmsDelivery(
        tenantId,
        messageId,
        customerId || null,
        recipientPhone,
        'failed',
        'No phone number provided',
        null
      );

      return {
        success: false,
        error: 'No phone number provided'
      };
    }

    // Format phone number to E.164 format if not already
    const formattedPhone = formatPhoneNumber(recipientPhone);

    if (!formattedPhone) {
      logger.warn('SMS not sent - invalid phone number format', {
        messageId,
        customerId,
        recipientPhone
      });

      await logSmsDelivery(
        tenantId,
        messageId,
        customerId || null,
        recipientPhone,
        'failed',
        'Invalid phone number format',
        null
      );

      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    // Check if Twilio is configured
    const twilioClient = createTwilioClient();
    const config = getSmsConfig();

    if (!twilioClient || !config) {
      // Log but don't fail - allows system to work without SMS configured
      logger.warn('SMS not sent - Twilio not configured', {
        messageId,
        customerId,
        recipientPhone: formattedPhone
      });

      await logSmsDelivery(
        tenantId,
        messageId,
        customerId || null,
        formattedPhone,
        'failed',
        'Twilio not configured - SMS simulation mode',
        null
      );

      return {
        success: false,
        error: 'Twilio not configured'
      };
    }

    // Truncate message to 160 characters for SMS limit
    const truncatedMessage = messageBody.substring(0, 160);

    // Send SMS
    const message = await twilioClient.messages.create({
      body: truncatedMessage,
      from: config.fromNumber,
      to: formattedPhone
    });

    logger.info('SMS sent successfully', {
      messageId,
      customerId,
      recipientPhone: formattedPhone,
      twilioSid: message.sid,
      status: message.status
    });

    // Log success
    await logSmsDelivery(
      tenantId,
      messageId,
      customerId || null,
      formattedPhone,
      'sent',
      null,
      JSON.stringify({
        sid: message.sid,
        status: message.status,
        dateCreated: message.dateCreated
      })
    );

    return {
      success: true,
      providerResponse: message.sid
    };

  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';

    logger.error('Failed to send SMS', {
      messageId,
      customerId,
      recipientPhone,
      error: errorMessage,
      code: error?.code
    });

    // Log failure
    await logSmsDelivery(
      tenantId,
      messageId,
      customerId || null,
      recipientPhone,
      'failed',
      errorMessage,
      null
    );

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send SMS to multiple recipients (broadcast)
 */
export async function sendBroadcastSms(
  tenantId: number,
  messageId: number,
  messageBody: string
): Promise<{ sent: number; failed: number; total: number }> {

  logger.info('Starting broadcast SMS send', {
    tenantId,
    messageId
  });

  try {
    // Get all active customers with phone numbers
    const customers = await query<{
      customer_id: number;
      name: string;
      phone: string;
    }>(`
      SELECT customer_id, name, phone
      FROM tenant_customers
      WHERE tenant_id = $1
      AND is_active = true
      AND phone IS NOT NULL
      AND phone != ''
    `, [tenantId]);

    logger.info(`Found ${customers.length} customers with phone numbers for broadcast`, {
      tenantId,
      messageId
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const customer of customers) {
      const result = await sendSmsMessage(
        tenantId,
        messageId,
        customer.phone,
        messageBody,
        customer.customer_id
      );

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Small delay to avoid rate limiting (adjust as needed)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('Broadcast SMS completed', {
      tenantId,
      messageId,
      total: customers.length,
      sent: sentCount,
      failed: failedCount
    });

    return {
      sent: sentCount,
      failed: failedCount,
      total: customers.length
    };

  } catch (error) {
    logger.error('Failed to send broadcast SMS', {
      tenantId,
      messageId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * Format phone number to E.164 format
 * Assumes UK numbers if no country code provided
 */
function formatPhoneNumber(phone: string): string | null {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If it already starts with +, assume it's in E.164 format
  if (cleaned.startsWith('+')) {
    return cleaned.length >= 10 ? cleaned : null;
  }

  // If it starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
    return cleaned.length >= 10 ? cleaned : null;
  }

  // If it starts with 0 (UK domestic format), replace with +44
  if (cleaned.startsWith('0')) {
    cleaned = '+44' + cleaned.substring(1);
    return cleaned.length >= 12 ? cleaned : null;
  }

  // If no country code at all, assume UK and add +44
  if (cleaned.length === 10) {
    cleaned = '+44' + cleaned;
    return cleaned;
  }

  // Already has country code but no +
  if (cleaned.length >= 11) {
    cleaned = '+' + cleaned;
    return cleaned;
  }

  // Invalid format
  return null;
}

/**
 * Log SMS delivery attempt to database
 */
async function logSmsDelivery(
  tenantId: number,
  messageId: number,
  customerId: number | null,
  recipientPhone: string,
  status: string,
  errorMessage: string | null,
  providerResponse: string | null
): Promise<void> {
  try {
    await query(`
      INSERT INTO sms_delivery_log (
        tenant_id,
        message_id,
        customer_id,
        recipient_phone,
        status,
        error_message,
        provider_response,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `, [
      tenantId,
      messageId,
      customerId,
      recipientPhone,
      status,
      errorMessage,
      providerResponse
    ]);
  } catch (error) {
    logger.error('Failed to log SMS delivery', {
      messageId,
      customerId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Check SMS delivery status from Twilio
 */
export async function checkSmsStatus(
  twilioSid: string
): Promise<{ status: string; error?: string }> {
  try {
    const twilioClient = createTwilioClient();

    if (!twilioClient) {
      return {
        status: 'unknown',
        error: 'Twilio not configured'
      };
    }

    const message = await twilioClient.messages(twilioSid).fetch();

    logger.info('SMS status checked', {
      twilioSid,
      status: message.status
    });

    return {
      status: message.status
    };

  } catch (error: any) {
    logger.error('Failed to check SMS status', {
      twilioSid,
      error: error?.message || 'Unknown error'
    });

    return {
      status: 'error',
      error: error?.message || 'Unknown error'
    };
  }
}

/**
 * Send SMS message to a driver
 */
export async function sendDriverSmsMessage(
  tenantId: number,
  messageId: number,
  recipientPhone: string,
  messageBody: string,
  driverId?: number
): Promise<{ success: boolean; error?: string; providerResponse?: string }> {

  try {
    // Validate phone number format
    if (!recipientPhone || recipientPhone.trim() === '') {
      logger.warn('SMS not sent - no phone number provided', {
        messageId,
        driverId
      });

      await logDriverSmsDelivery(
        tenantId,
        messageId,
        driverId || null,
        recipientPhone,
        'failed',
        'No phone number provided',
        null
      );

      return {
        success: false,
        error: 'No phone number provided'
      };
    }

    // Format phone number to E.164 format
    const formattedPhone = formatPhoneNumber(recipientPhone);

    if (!formattedPhone) {
      logger.warn('SMS not sent - invalid phone number format', {
        messageId,
        driverId,
        recipientPhone
      });

      await logDriverSmsDelivery(
        tenantId,
        messageId,
        driverId || null,
        recipientPhone,
        'failed',
        'Invalid phone number format',
        null
      );

      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    // Check if Twilio is configured
    const twilioClient = createTwilioClient();
    const config = getSmsConfig();

    if (!twilioClient || !config) {
      logger.warn('SMS not sent - Twilio not configured', {
        messageId,
        driverId,
        recipientPhone: formattedPhone
      });

      await logDriverSmsDelivery(
        tenantId,
        messageId,
        driverId || null,
        formattedPhone,
        'failed',
        'Twilio not configured',
        null
      );

      return {
        success: false,
        error: 'Twilio not configured'
      };
    }

    // Truncate message to 160 characters
    const truncatedMessage = messageBody.substring(0, 160);

    // Send SMS
    const message = await twilioClient.messages.create({
      body: truncatedMessage,
      from: config.fromNumber,
      to: formattedPhone
    });

    logger.info('Driver SMS sent successfully', {
      messageId,
      driverId,
      recipientPhone: formattedPhone,
      twilioSid: message.sid
    });

    // Log success
    await logDriverSmsDelivery(
      tenantId,
      messageId,
      driverId || null,
      formattedPhone,
      'sent',
      null,
      JSON.stringify({
        sid: message.sid,
        status: message.status,
        dateCreated: message.dateCreated
      })
    );

    return {
      success: true,
      providerResponse: message.sid
    };

  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';

    logger.error('Failed to send driver SMS', {
      messageId,
      driverId,
      recipientPhone,
      error: errorMessage
    });

    await logDriverSmsDelivery(
      tenantId,
      messageId,
      driverId || null,
      recipientPhone,
      'failed',
      errorMessage,
      null
    );

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send SMS to multiple drivers (broadcast)
 */
export async function sendBroadcastDriverSms(
  tenantId: number,
  messageId: number,
  messageBody: string
): Promise<{ sent: number; failed: number; total: number }> {

  logger.info('Starting broadcast driver SMS send', {
    tenantId,
    messageId
  });

  try {
    // Get all active drivers with phone numbers
    const drivers = await query<{
      driver_id: number;
      name: string;
      phone: string;
    }>(`
      SELECT driver_id, name, phone
      FROM tenant_drivers
      WHERE tenant_id = $1
      AND is_active = true
      AND phone IS NOT NULL
      AND phone != ''
    `, [tenantId]);

    logger.info(`Found ${drivers.length} drivers with phone numbers for broadcast`, {
      tenantId,
      messageId
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const driver of drivers) {
      const result = await sendDriverSmsMessage(
        tenantId,
        messageId,
        driver.phone,
        messageBody,
        driver.driver_id
      );

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('Broadcast driver SMS completed', {
      tenantId,
      messageId,
      total: drivers.length,
      sent: sentCount,
      failed: failedCount
    });

    return {
      sent: sentCount,
      failed: failedCount,
      total: drivers.length
    };

  } catch (error) {
    logger.error('Failed to send broadcast driver SMS', {
      tenantId,
      messageId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * Log driver SMS delivery attempt to database
 */
async function logDriverSmsDelivery(
  tenantId: number,
  messageId: number,
  driverId: number | null,
  recipientPhone: string,
  status: string,
  errorMessage: string | null,
  providerResponse: string | null
): Promise<void> {
  try {
    await query(`
      INSERT INTO driver_sms_delivery_log (
        tenant_id,
        message_id,
        driver_id,
        recipient_phone,
        status,
        error_message,
        provider_response,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `, [
      tenantId,
      messageId,
      driverId,
      recipientPhone,
      status,
      errorMessage,
      providerResponse
    ]);
  } catch (error) {
    logger.error('Failed to log driver SMS delivery', {
      messageId,
      driverId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Process scheduled SMS messages (both customer and driver)
 * Should be called by a scheduled job
 */
export async function processScheduledSms(): Promise<void> {
  logger.info('Processing scheduled SMS messages');

  try {
    // Process customer messages
    const scheduledCustomerMessages = await query<{
      message_id: number;
      tenant_id: number;
      target_customer_id: number | null;
      sms_body: string;
      scheduled_at: Date;
    }>(`
      SELECT
        message_id,
        tenant_id,
        target_customer_id,
        sms_body,
        scheduled_at
      FROM tenant_messages
      WHERE status = 'scheduled'
      AND scheduled_at <= CURRENT_TIMESTAMP
      AND (delivery_method = 'sms' OR delivery_method = 'both')
      AND sms_body IS NOT NULL
      ORDER BY scheduled_at
    `);

    logger.info(`Found ${scheduledCustomerMessages.length} scheduled customer SMS messages`);

    for (const msg of scheduledCustomerMessages) {
      try {
        if (msg.target_customer_id) {
          // Send to specific customer
          const customers = await query<{
            phone: string;
            name: string;
          }>(`
            SELECT phone, name
            FROM tenant_customers
            WHERE customer_id = $1
            AND tenant_id = $2
          `, [msg.target_customer_id, msg.tenant_id]);

          if (customers.length > 0 && customers[0].phone) {
            await sendSmsMessage(
              msg.tenant_id,
              msg.message_id,
              customers[0].phone,
              msg.sms_body,
              msg.target_customer_id
            );
          }
        } else {
          // Broadcast to all customers
          await sendBroadcastSms(
            msg.tenant_id,
            msg.message_id,
            msg.sms_body
          );
        }

        // Update message status to sent
        await query(`
          UPDATE tenant_messages
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP
          WHERE message_id = $1
        `, [msg.message_id]);

      } catch (error) {
        logger.error('Error processing scheduled customer SMS', {
          messageId: msg.message_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        await query(`
          UPDATE tenant_messages
          SET status = 'failed',
              failed_reason = $2
          WHERE message_id = $1
        `, [
          msg.message_id,
          error instanceof Error ? error.message : 'Unknown error'
        ]);
      }
    }

    // Process driver messages
    const scheduledDriverMessages = await query<{
      message_id: number;
      tenant_id: number;
      target_driver_id: number | null;
      sms_body: string;
      scheduled_at: Date;
    }>(`
      SELECT
        message_id,
        tenant_id,
        target_driver_id,
        sms_body,
        scheduled_at
      FROM driver_messages
      WHERE status = 'scheduled'
      AND scheduled_at <= CURRENT_TIMESTAMP
      AND (delivery_method = 'sms' OR delivery_method = 'both')
      AND sms_body IS NOT NULL
      ORDER BY scheduled_at
    `);

    logger.info(`Found ${scheduledDriverMessages.length} scheduled driver SMS messages`);

    for (const msg of scheduledDriverMessages) {
      try {
        if (msg.target_driver_id) {
          // Send to specific driver
          const drivers = await query<{
            phone: string;
            name: string;
          }>(`
            SELECT phone, name
            FROM tenant_drivers
            WHERE driver_id = $1
            AND tenant_id = $2
          `, [msg.target_driver_id, msg.tenant_id]);

          if (drivers.length > 0 && drivers[0].phone) {
            await sendDriverSmsMessage(
              msg.tenant_id,
              msg.message_id,
              drivers[0].phone,
              msg.sms_body,
              msg.target_driver_id
            );
          }
        } else {
          // Broadcast to all drivers
          await sendBroadcastDriverSms(
            msg.tenant_id,
            msg.message_id,
            msg.sms_body
          );
        }

        // Update message status to sent
        await query(`
          UPDATE driver_messages
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP
          WHERE message_id = $1
        `, [msg.message_id]);

      } catch (error) {
        logger.error('Error processing scheduled driver SMS', {
          messageId: msg.message_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        await query(`
          UPDATE driver_messages
          SET status = 'failed',
              failed_reason = $2
          WHERE message_id = $1
        `, [
          msg.message_id,
          error instanceof Error ? error.message : 'Unknown error'
        ]);
      }
    }

    logger.info('Scheduled SMS processing completed');

  } catch (error) {
    logger.error('Failed to process scheduled SMS', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
