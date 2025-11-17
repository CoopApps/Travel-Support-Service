import express, { Response } from 'express';
import { query, queryOne } from '../config/database';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { calculateCurrentPrice, getPriceForBooking } from '../services/dynamicPricing.service';

const router = express.Router();

/**
 * Bus Bookings API
 *
 * Manages seat-based bookings including:
 * - Booking creation and management
 * - Seat assignment
 * - Availability checking
 * - Passenger manifest generation
 */

// Generate unique booking reference
function generateBookingReference(): string {
  return `BUS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// ==================================================================================
// GET /tenants/:tenantId/bus/services/:timetableId/current-price
// Calculate current dynamic price for a service
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/services/:timetableId/current-price',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;
    const { service_date, customer_id } = req.query;

    if (!service_date) {
      return res.status(400).json({ error: 'service_date is required' });
    }

    try {
      if (customer_id) {
        // Get price for specific customer (determines member vs non-member)
        const result = await getPriceForBooking(
          parseInt(tenantId),
          parseInt(timetableId),
          service_date as string,
          parseInt(customer_id as string)
        );

        return res.json({
          ...result.pricing_details,
          customer_price: result.price,
          is_member: result.is_member
        });
      } else {
        // Get general pricing information
        const pricing = await calculateCurrentPrice(
          parseInt(tenantId),
          parseInt(timetableId),
          service_date as string
        );

        return res.json(pricing);
      }
    } catch (error: any) {
      logger.error('Error calculating current price', {
        error: error.message,
        tenantId,
        timetableId,
        service_date
      });
      return res.status(500).json({ error: 'Failed to calculate price', details: error.message });
    }
  }
);

// ==================================================================================
// GET /tenants/:tenantId/bus/bookings
// Get bookings with optional filtering
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/bookings',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      timetable_id,
      service_date,
      booking_status,
      customer_id,
      start_date,
      end_date
    } = req.query;

    try {
      let sql = `
        SELECT
          b.booking_id,
          b.timetable_id,
          b.customer_id,
          b.passenger_name,
          b.passenger_phone,
          b.passenger_email,
          b.boarding_stop_id,
          b.alighting_stop_id,
          b.service_date,
          b.seat_number,
          b.requires_wheelchair_space,
          b.booking_reference,
          b.booking_status,
          b.fare_amount,
          b.payment_status,
          b.payment_method,
          b.special_requirements,
          b.created_at,
          t.service_name,
          t.departure_time,
          r.route_number,
          r.route_name,
          bs.stop_name as boarding_stop_name,
          als.stop_name as alighting_stop_name,
          c.name as customer_name
        FROM section22_bus_bookings b
        JOIN section22_timetables t ON b.timetable_id = t.timetable_id
        JOIN section22_bus_routes r ON t.route_id = r.route_id
        LEFT JOIN section22_route_stops bs ON b.boarding_stop_id = bs.stop_id
        LEFT JOIN section22_route_stops als ON b.alighting_stop_id = als.stop_id
        LEFT JOIN tenant_customers c ON b.customer_id = c.customer_id
        WHERE b.tenant_id = $1
      `;

      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (timetable_id) {
        sql += ` AND b.timetable_id = $${paramIndex}`;
        params.push(timetable_id);
        paramIndex++;
      }

      if (service_date) {
        sql += ` AND b.service_date = $${paramIndex}`;
        params.push(service_date);
        paramIndex++;
      }

      if (booking_status) {
        sql += ` AND b.booking_status = $${paramIndex}`;
        params.push(booking_status);
        paramIndex++;
      }

      if (customer_id) {
        sql += ` AND b.customer_id = $${paramIndex}`;
        params.push(customer_id);
        paramIndex++;
      }

      if (start_date && end_date) {
        sql += ` AND b.service_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(start_date, end_date);
        paramIndex += 2;
      }

      sql += ` ORDER BY b.service_date DESC, t.departure_time, b.booking_id`;

      const bookings = await query(sql, params);

      logger.info('Bus bookings fetched', {
        tenantId,
        count: bookings.length,
        filters: { timetable_id, service_date, booking_status, customer_id }
      });

      return res.json(bookings);
    } catch (error) {
      logger.error('Failed to fetch bookings', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// GET /tenants/:tenantId/bus/bookings/:bookingId
// Get booking details
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/bookings/:bookingId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, bookingId } = req.params;

    try {
      const booking = await queryOne(
        `SELECT
          b.*,
          t.service_name,
          t.departure_time,
          t.total_seats,
          r.route_number,
          r.route_name,
          r.origin_point,
          r.destination_point,
          bs.stop_name as boarding_stop_name,
          bs.stop_sequence as boarding_stop_sequence,
          als.stop_name as alighting_stop_name,
          als.stop_sequence as alighting_stop_sequence,
          v.registration as vehicle_registration,
          d.name as driver_name,
          d.phone as driver_phone,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone
         FROM section22_bus_bookings b
         JOIN section22_timetables t ON b.timetable_id = t.timetable_id
         JOIN section22_bus_routes r ON t.route_id = r.route_id
         LEFT JOIN section22_route_stops bs ON b.boarding_stop_id = bs.stop_id
         LEFT JOIN section22_route_stops als ON b.alighting_stop_id = als.stop_id
         LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id
         LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id
         LEFT JOIN tenant_customers c ON b.customer_id = c.customer_id
         WHERE b.tenant_id = $1 AND b.booking_id = $2`,
        [tenantId, bookingId]
      );

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      logger.info('Booking details fetched', { tenantId, bookingId });

      return res.json(booking);
    } catch (error) {
      logger.error('Failed to fetch booking details', { tenantId, bookingId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// POST /tenants/:tenantId/bus/bookings
// Create a new booking
// ==================================================================================
router.post(
  '/tenants/:tenantId/bus/bookings',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      timetable_id,
      customer_id,
      passenger_name,
      passenger_phone,
      passenger_email,
      boarding_stop_id,
      alighting_stop_id,
      service_date,
      seat_number,
      requires_wheelchair_space,
      payment_method,
      special_requirements
    } = req.body;

    // Validation
    if (!timetable_id || !passenger_name || !service_date || !boarding_stop_id || !alighting_stop_id) {
      return res.status(400).json({
        error: 'Missing required fields: timetable_id, passenger_name, service_date, boarding_stop_id, alighting_stop_id'
      });
    }

    if (boarding_stop_id === alighting_stop_id) {
      return res.status(400).json({
        error: 'Boarding and alighting stops must be different'
      });
    }

    try {
      // Verify timetable exists and is valid
      const timetable = await queryOne(
        `SELECT * FROM section22_timetables
         WHERE tenant_id = $1 AND timetable_id = $2
           AND status = 'active'
           AND valid_from <= $3
           AND (valid_until IS NULL OR valid_until >= $3)`,
        [tenantId, timetable_id, service_date]
      );

      if (!timetable) {
        return res.status(404).json({
          error: 'Timetable not found or not available for the selected date'
        });
      }

      // Check availability
      const availability = await queryOne(
        `SELECT * FROM section22_seat_availability
         WHERE timetable_id = $1 AND service_date = $2`,
        [timetable_id, service_date]
      );

      const currentBooked = availability?.booked_seats || 0;
      const currentWheelchairBooked = availability?.booked_wheelchair_spaces || 0;

      if (requires_wheelchair_space) {
        if (currentWheelchairBooked >= timetable.wheelchair_spaces) {
          return res.status(409).json({
            error: 'No wheelchair spaces available for this service'
          });
        }
      } else {
        if (currentBooked >= timetable.total_seats) {
          return res.status(409).json({
            error: 'No seats available for this service'
          });
        }
      }

      // Verify stops exist and are on this route
      const stops = await query(
        `SELECT stop_id, stop_sequence FROM section22_route_stops
         WHERE route_id = $1 AND stop_id IN ($2, $3)`,
        [timetable.route_id, boarding_stop_id, alighting_stop_id]
      );

      if (stops.length !== 2) {
        return res.status(400).json({
          error: 'Invalid stops for this route'
        });
      }

      // Verify boarding stop comes before alighting stop
      const boardingStop = stops.find(s => s.stop_id === parseInt(boarding_stop_id));
      const alightingStop = stops.find(s => s.stop_id === parseInt(alighting_stop_id));

      if (boardingStop.stop_sequence >= alightingStop.stop_sequence) {
        return res.status(400).json({
          error: 'Boarding stop must come before alighting stop'
        });
      }

      // Generate booking reference
      const bookingReference = generateBookingReference();

      // Calculate dynamic fare for this booking
      const fareCalculation = await getPriceForBooking(
        parseInt(tenantId),
        timetable_id,
        service_date,
        customer_id
      );

      const calculatedFare = fareCalculation.price;
      const isMemberBooking = fareCalculation.is_member;

      logger.info('Dynamic fare calculated for booking', {
        timetableId: timetable_id,
        serviceDate: service_date,
        customerId: customer_id,
        isMember: isMemberBooking,
        calculatedFare,
        currentBookings: fareCalculation.pricing_details.booking_info.current_bookings
      });

      // Create booking
      const result = await queryOne(
        `INSERT INTO section22_bus_bookings (
          tenant_id,
          timetable_id,
          customer_id,
          passenger_name,
          passenger_phone,
          passenger_email,
          boarding_stop_id,
          alighting_stop_id,
          service_date,
          seat_number,
          requires_wheelchair_space,
          booking_reference,
          booking_status,
          fare_amount,
          locked_fare_amount,
          is_member_booking,
          member_surcharge_applied,
          price_locked_at,
          payment_method,
          special_requirements,
          created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         RETURNING *`,
        [
          tenantId,
          timetable_id,
          customer_id,
          passenger_name,
          passenger_phone,
          passenger_email,
          boarding_stop_id,
          alighting_stop_id,
          service_date,
          seat_number,
          requires_wheelchair_space || false,
          bookingReference,
          'confirmed',
          calculatedFare,
          calculatedFare, // Locked fare (price at time of booking)
          isMemberBooking,
          !isMemberBooking, // Non-members have surcharge applied
          new Date().toISOString(), // Price locked at booking time
          payment_method,
          special_requirements,
          req.user?.userId
        ]
      );

      // Seat availability is automatically updated by the database trigger

      logger.info('Bus booking created', {
        tenantId,
        bookingId: result.booking_id,
        bookingReference,
        timetableId: timetable_id,
        serviceDate: service_date,
        fareAmount: calculatedFare,
        isMember: isMemberBooking,
        userId: req.user?.userId
      });

      return res.status(201).json({
        ...result,
        pricing_details: fareCalculation.pricing_details,
        is_member: isMemberBooking
      });
    } catch (error) {
      logger.error('Failed to create booking', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// PATCH /tenants/:tenantId/bus/bookings/:bookingId/cancel
// Cancel a booking
// ==================================================================================
router.patch(
  '/tenants/:tenantId/bus/bookings/:bookingId/cancel',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, bookingId } = req.params;
    const { reason } = req.body;

    try {
      const result = await queryOne(
        `UPDATE section22_bus_bookings
         SET booking_status = 'cancelled',
             internal_notes = COALESCE(internal_notes || E'\n', '') || 'Cancelled: ' || COALESCE($3, 'No reason provided'),
             updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND booking_id = $2
           AND booking_status IN ('pending', 'confirmed')
         RETURNING *`,
        [tenantId, bookingId, reason]
      );

      if (!result) {
        return res.status(404).json({
          error: 'Booking not found or cannot be cancelled'
        });
      }

      // Seat availability is automatically updated by the database trigger

      logger.info('Booking cancelled', {
        tenantId,
        bookingId,
        bookingReference: result.booking_reference,
        reason,
        userId: req.user?.userId
      });

      return res.json(result);
    } catch (error) {
      logger.error('Failed to cancel booking', { tenantId, bookingId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// PATCH /tenants/:tenantId/bus/bookings/:bookingId/payment
// Update payment status
// ==================================================================================
router.patch(
  '/tenants/:tenantId/bus/bookings/:bookingId/payment',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, bookingId } = req.params;
    const { payment_status, payment_method } = req.body;

    if (!payment_status) {
      return res.status(400).json({ error: 'payment_status is required' });
    }

    if (!['unpaid', 'paid', 'refunded'].includes(payment_status)) {
      return res.status(400).json({
        error: 'payment_status must be one of: unpaid, paid, refunded'
      });
    }

    try {
      const result = await queryOne(
        `UPDATE section22_bus_bookings
         SET payment_status = $3,
             payment_method = COALESCE($4, payment_method),
             updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND booking_id = $2
         RETURNING *`,
        [tenantId, bookingId, payment_status, payment_method]
      );

      if (!result) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      logger.info('Booking payment updated', {
        tenantId,
        bookingId,
        paymentStatus: payment_status,
        userId: req.user?.userId
      });

      return res.json(result);
    } catch (error) {
      logger.error('Failed to update payment', { tenantId, bookingId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// GET /tenants/:tenantId/bus/bookings/manifest/:timetableId
// Get passenger manifest for a specific service date
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/bookings/manifest/:timetableId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;
    const { service_date } = req.query;

    if (!service_date) {
      return res.status(400).json({ error: 'service_date query parameter is required' });
    }

    try {
      // Get service details
      const service = await queryOne(
        `SELECT
          t.*,
          r.route_number,
          r.route_name,
          r.origin_point,
          r.destination_point,
          v.registration as vehicle_registration,
          v.make as vehicle_make,
          v.model as vehicle_model,
          d.name as driver_name,
          d.phone as driver_phone
         FROM section22_timetables t
         JOIN section22_bus_routes r ON t.route_id = r.route_id
         LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id
         LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id
         WHERE t.tenant_id = $1 AND t.timetable_id = $2`,
        [tenantId, timetableId]
      );

      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      // Get all bookings for this service date
      const bookings = await query(
        `SELECT
          b.booking_id,
          b.passenger_name,
          b.passenger_phone,
          b.seat_number,
          b.requires_wheelchair_space,
          b.booking_reference,
          b.booking_status,
          b.payment_status,
          b.special_requirements,
          bs.stop_name as boarding_stop,
          bs.stop_sequence as boarding_sequence,
          bs.arrival_offset_minutes as boarding_time,
          als.stop_name as alighting_stop,
          als.stop_sequence as alighting_sequence,
          als.arrival_offset_minutes as alighting_time,
          c.name as customer_name,
          c.phone as customer_phone
         FROM section22_bus_bookings b
         LEFT JOIN section22_route_stops bs ON b.boarding_stop_id = bs.stop_id
         LEFT JOIN section22_route_stops als ON b.alighting_stop_id = als.stop_id
         LEFT JOIN tenant_customers c ON b.customer_id = c.customer_id
         WHERE b.timetable_id = $1 AND b.service_date = $2
           AND b.booking_status IN ('confirmed', 'pending')
         ORDER BY bs.stop_sequence, b.passenger_name`,
        [timetableId, service_date]
      );

      // Get availability
      const availability = await queryOne(
        `SELECT * FROM section22_seat_availability
         WHERE timetable_id = $1 AND service_date = $2`,
        [timetableId, service_date]
      );

      const manifest = {
        service,
        service_date,
        bookings,
        summary: {
          total_bookings: bookings.length,
          confirmed_bookings: bookings.filter(b => b.booking_status === 'confirmed').length,
          pending_bookings: bookings.filter(b => b.booking_status === 'pending').length,
          wheelchair_bookings: bookings.filter(b => b.requires_wheelchair_space).length,
          total_seats: service.total_seats,
          booked_seats: availability?.booked_seats || 0,
          available_seats: availability?.available_seats || service.total_seats
        }
      };

      logger.info('Passenger manifest generated', {
        tenantId,
        timetableId,
        serviceDate: service_date,
        bookingCount: bookings.length
      });

      return res.json(manifest);
    } catch (error) {
      logger.error('Failed to generate manifest', { tenantId, timetableId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// GET /tenants/:tenantId/bus/bookings/seat-map/:timetableId
// Get seat map with bookings for a service date
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/bookings/seat-map/:timetableId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;
    const { service_date } = req.query;

    if (!service_date) {
      return res.status(400).json({ error: 'service_date query parameter is required' });
    }

    try {
      const timetable = await queryOne(
        `SELECT total_seats, wheelchair_spaces FROM section22_timetables
         WHERE tenant_id = $1 AND timetable_id = $2`,
        [tenantId, timetableId]
      );

      if (!timetable) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      // Get all bookings with seat assignments
      const bookings = await query(
        `SELECT
          booking_id,
          seat_number,
          passenger_name,
          requires_wheelchair_space,
          booking_status
         FROM section22_bus_bookings
         WHERE timetable_id = $1 AND service_date = $2
           AND booking_status IN ('confirmed', 'pending')
           AND seat_number IS NOT NULL
         ORDER BY seat_number`,
        [timetableId, service_date]
      );

      const seatMap = {
        total_seats: timetable.total_seats,
        wheelchair_spaces: timetable.wheelchair_spaces,
        booked_seats: bookings.map(b => ({
          seat_number: b.seat_number,
          passenger_name: b.passenger_name,
          is_wheelchair: b.requires_wheelchair_space,
          status: b.booking_status,
          booking_id: b.booking_id
        })),
        available_seat_numbers: [] // Could be enhanced to show specific available seats
      };

      logger.info('Seat map fetched', {
        tenantId,
        timetableId,
        serviceDate: service_date,
        bookedSeats: bookings.length
      });

      return res.json(seatMap);
    } catch (error) {
      logger.error('Failed to fetch seat map', { tenantId, timetableId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
