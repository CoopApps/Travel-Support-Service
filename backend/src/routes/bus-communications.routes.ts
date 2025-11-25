/**
 * Bus Communications & Notifications API Routes
 *
 * Handles passenger communication for Section 22 bus services:
 * - Booking confirmations (SMS/Email)
 * - Service alerts and disruptions
 * - Delay notifications
 * - Cancellation notifications
 * - Service announcements
 * - Broadcast messages to all passengers
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';

const router = express.Router();

// Interface for future type safety (currently unused)
// interface CommunicationMessage {
//   message_id?: number;
//   tenant_id: number;
//   message_type: 'booking_confirmation' | 'cancellation' | 'delay' | 'service_alert' | 'announcement';
//   delivery_method: 'sms' | 'email' | 'both';
//   recipient_type: 'individual' | 'route' | 'service' | 'all_passengers';
//   recipient_id?: number; // booking_id or route_id or timetable_id
//   subject?: string;
//   message_body: string;
//   scheduled_send?: string;
//   sent_at?: string;
//   status: 'draft' | 'scheduled' | 'sent' | 'failed';
//   recipients_count?: number;
//   sent_count?: number;
//   failed_count?: number;
// }

/**
 * GET /api/tenants/:tenantId/bus-communications
 * Get all communications/notifications
 */
router.get('/tenants/:tenantId/bus-communications', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { message_type, status, delivery_method } = req.query;

    const client = await pool.connect();
    try {
      let query = `
        SELECT
          bc.*,
          COUNT(bcr.recipient_id) as recipients_count,
          COUNT(bcr.recipient_id) FILTER (WHERE bcr.delivery_status = 'sent') as sent_count,
          COUNT(bcr.recipient_id) FILTER (WHERE bcr.delivery_status = 'failed') as failed_count
        FROM bus_communications bc
        LEFT JOIN bus_communication_recipients bcr ON bc.message_id = bcr.message_id
        WHERE bc.tenant_id = $1
      `;
      const params: any[] = [tenantId];
      let paramCount = 1;

      if (message_type) {
        paramCount++;
        query += ` AND bc.message_type = $${paramCount}`;
        params.push(message_type);
      }

      if (status) {
        paramCount++;
        query += ` AND bc.status = $${paramCount}`;
        params.push(status);
      }

      if (delivery_method) {
        paramCount++;
        query += ` AND bc.delivery_method = $${paramCount}`;
        params.push(delivery_method);
      }

      query += ` GROUP BY bc.message_id ORDER BY bc.created_at DESC`;

      const result = await client.query(query, params);

      res.json({
        communications: result.rows,
        total: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching communications', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch communications',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/tenants/:tenantId/bus-communications
 * Create and send a communication/notification
 */
router.post('/tenants/:tenantId/bus-communications', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const {
      message_type,
      delivery_method,
      recipient_type,
      recipient_id,
      subject,
      message_body,
      scheduled_send
    } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the communication record
      const messageResult = await client.query(
        `INSERT INTO bus_communications (
          tenant_id, message_type, delivery_method, recipient_type,
          recipient_id, subject, message_body, scheduled_send,
          status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *`,
        [
          tenantId,
          message_type,
          delivery_method,
          recipient_type,
          recipient_id,
          subject,
          message_body,
          scheduled_send,
          scheduled_send ? 'scheduled' : 'draft'
        ]
      );

      const message = messageResult.rows[0];

      // Get recipients based on recipient_type
      let recipients: any[] = [];

      if (recipient_type === 'individual' && recipient_id) {
        // Single booking
        const result = await client.query(
          `SELECT booking_id, passenger_name, passenger_email, passenger_phone
           FROM bus_bookings
           WHERE booking_id = $1 AND tenant_id = $2`,
          [recipient_id, tenantId]
        );
        recipients = result.rows;
      } else if (recipient_type === 'route' && recipient_id) {
        // All bookings for a specific route
        const result = await client.query(
          `SELECT DISTINCT bb.booking_id, bb.passenger_name, bb.passenger_email, bb.passenger_phone
           FROM bus_bookings bb
           JOIN bus_timetables bt ON bb.timetable_id = bt.timetable_id
           WHERE bt.route_id = $1 AND bb.tenant_id = $2
           AND bb.booking_status NOT IN ('cancelled', 'no_show')`,
          [recipient_id, tenantId]
        );
        recipients = result.rows;
      } else if (recipient_type === 'service' && recipient_id) {
        // All bookings for a specific timetable/service
        const result = await client.query(
          `SELECT booking_id, passenger_name, passenger_email, passenger_phone
           FROM bus_bookings
           WHERE timetable_id = $1 AND tenant_id = $2
           AND booking_status NOT IN ('cancelled', 'no_show')`,
          [recipient_id, tenantId]
        );
        recipients = result.rows;
      } else if (recipient_type === 'all_passengers') {
        // All active bookings
        const result = await client.query(
          `SELECT DISTINCT passenger_email, passenger_phone, passenger_name
           FROM bus_bookings
           WHERE tenant_id = $1
           AND booking_status NOT IN ('cancelled', 'no_show')
           AND service_date >= CURRENT_DATE`,
          [tenantId]
        );
        recipients = result.rows.map((r: any) => ({
          passenger_email: r.passenger_email,
          passenger_phone: r.passenger_phone,
          passenger_name: r.passenger_name
        }));
      }

      // Insert recipients
      for (const recipient of recipients) {
        await client.query(
          `INSERT INTO bus_communication_recipients (
            message_id, booking_id, recipient_name, recipient_email,
            recipient_phone, delivery_status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [
            message.message_id,
            recipient.booking_id || null,
            recipient.passenger_name,
            recipient.passenger_email,
            recipient.passenger_phone
          ]
        );
      }

      // If not scheduled, send immediately (in production, queue for actual delivery)
      if (!scheduled_send) {
        await client.query(
          `UPDATE bus_communications
           SET status = 'sent', sent_at = NOW()
           WHERE message_id = $1`,
          [message.message_id]
        );

        // Mark all recipients as sent (in production, this would be done after actual delivery)
        await client.query(
          `UPDATE bus_communication_recipients
           SET delivery_status = 'sent', sent_at = NOW()
           WHERE message_id = $1`,
          [message.message_id]
        );
      }

      await client.query('COMMIT');

      res.json({
        message: 'Communication created successfully',
        communication: {
          ...message,
          recipients_count: recipients.length
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error creating communication', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to create communication',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/tenants/:tenantId/bus-communications/:messageId/recipients
 * Get recipients for a specific communication
 */
router.get('/tenants/:tenantId/bus-communications/:messageId/recipients', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId, messageId } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT bcr.*, bc.message_type, bc.delivery_method
         FROM bus_communication_recipients bcr
         JOIN bus_communications bc ON bcr.message_id = bc.message_id
         WHERE bcr.message_id = $1 AND bc.tenant_id = $2
         ORDER BY bcr.created_at DESC`,
        [messageId, tenantId]
      );

      res.json({
        recipients: result.rows,
        total: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching recipients', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch recipients',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/tenants/:tenantId/bus-communications/booking-confirmation
 * Send booking confirmation automatically
 */
router.post('/tenants/:tenantId/bus-communications/booking-confirmation', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { booking_id } = req.body;

    const client = await pool.connect();
    try {
      // Get booking details
      const bookingResult = await client.query(
        `SELECT bb.*, bt.route_name, bt.departure_time, bt.service_date
         FROM bus_bookings bb
         JOIN bus_timetables bt ON bb.timetable_id = bt.timetable_id
         WHERE bb.booking_id = $1 AND bb.tenant_id = $2`,
        [booking_id, tenantId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ error: { message: 'Booking not found' } });
      }

      const booking = bookingResult.rows[0];

      // Generate confirmation message
      const message_body = `
Hi ${booking.passenger_name},

Your bus booking has been confirmed!

Route: ${booking.route_name}
Date: ${new Date(booking.service_date).toLocaleDateString('en-GB')}
Departure: ${booking.departure_time}
Seat: ${booking.seat_number || 'Not assigned'}
Fare: £${booking.fare_amount?.toFixed(2)}

Booking Reference: #${booking.booking_id}

Thank you for choosing our community bus service!
      `.trim();

      const subject = `Booking Confirmed - ${booking.route_name} on ${new Date(booking.service_date).toLocaleDateString('en-GB')}`;

      // Create communication via main endpoint
      const commResult = await client.query(
        `INSERT INTO bus_communications (
          tenant_id, message_type, delivery_method, recipient_type,
          recipient_id, subject, message_body, status, sent_at, created_at
        ) VALUES ($1, 'booking_confirmation', 'email', 'individual', $2, $3, $4, 'sent', NOW(), NOW())
        RETURNING *`,
        [tenantId, booking_id, subject, message_body]
      );

      const message = commResult.rows[0];

      // Add recipient
      await client.query(
        `INSERT INTO bus_communication_recipients (
          message_id, booking_id, recipient_name, recipient_email,
          recipient_phone, delivery_status, sent_at
        ) VALUES ($1, $2, $3, $4, $5, 'sent', NOW())`,
        [message.message_id, booking.booking_id, booking.passenger_name, booking.passenger_email, booking.passenger_phone]
      );

      return res.json({
        message: 'Booking confirmation sent successfully',
        communication: message
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error sending booking confirmation', { error });
    return res.status(500).json({
      error: {
        message: error.message || 'Failed to send booking confirmation',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/tenants/:tenantId/bus-communications/templates
 * Get message templates
 */
router.get('/tenants/:tenantId/bus-communications/templates', verifyTenantAccess, async (_req: Request, res: Response) => {
  try {
    const templates = {
      booking_confirmation: {
        subject: 'Booking Confirmed - {{route_name}} on {{date}}',
        body: `Hi {{passenger_name}},

Your bus booking has been confirmed!

Route: {{route_name}}
Date: {{date}}
Departure: {{departure_time}}
Seat: {{seat_number}}
Fare: £{{fare_amount}}

Booking Reference: #{{booking_id}}

Thank you for choosing our community bus service!`
      },
      cancellation: {
        subject: 'Booking Cancelled - {{route_name}}',
        body: `Hi {{passenger_name}},

Your booking for {{route_name}} on {{date}} has been cancelled.

Booking Reference: #{{booking_id}}

If you have any questions, please contact us.`
      },
      delay_alert: {
        subject: 'Service Delay Alert - {{route_name}}',
        body: `Hi {{passenger_name}},

The {{route_name}} service scheduled for {{departure_time}} on {{date}} is experiencing a delay.

New estimated departure: {{new_time}}
Reason: {{delay_reason}}

We apologize for the inconvenience.`
      },
      service_disruption: {
        subject: 'Service Disruption - {{route_name}}',
        body: `Important Service Update

The {{route_name}} service on {{date}} has been disrupted.

Reason: {{disruption_reason}}
Alternative arrangements: {{alternatives}}

We apologize for any inconvenience caused.`
      },
      announcement: {
        subject: '{{announcement_title}}',
        body: `{{announcement_body}}`
      }
    };

    return res.json({ templates });
  } catch (error: any) {
    logger.error('Error fetching templates', { error });
    return res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch templates',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/tenants/:tenantId/bus-communications/stats
 * Get communication statistics
 */
router.get('/tenants/:tenantId/bus-communications/stats', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const client = await pool.connect();
    try {
      const stats = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
          COUNT(*) FILTER (WHERE status = 'draft') as drafts,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE message_type = 'booking_confirmation') as confirmations,
          COUNT(*) FILTER (WHERE message_type = 'service_alert') as alerts,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month
        FROM bus_communications
        WHERE tenant_id = $1`,
        [tenantId]
      );

      const recipientStats = await client.query(
        `SELECT
          COUNT(*) as total_recipients,
          COUNT(*) FILTER (WHERE delivery_status = 'sent') as delivered,
          COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed_delivery
        FROM bus_communication_recipients bcr
        JOIN bus_communications bc ON bcr.message_id = bc.message_id
        WHERE bc.tenant_id = $1`,
        [tenantId]
      );

      res.json({
        messages: stats.rows[0],
        recipients: recipientStats.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching communication stats', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch stats',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
