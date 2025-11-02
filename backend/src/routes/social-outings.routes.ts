import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { query, queryOne } from '../config/database';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Social Outings Routes
 *
 * Complete API for managing social outings, bookings, and driver assignments
 */

// ============================================================================
// OUTINGS MANAGEMENT
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/outings/stats
 * @desc Get outing statistics (must come before :outingId routes)
 * @access Private
 */
router.get(
  '/tenants/:tenantId/outings/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const outingStats = await queryOne(
      `SELECT
        COUNT(*) as total_outings,
        COUNT(CASE WHEN outing_date >= CURRENT_DATE THEN 1 END) as upcoming_outings,
        COUNT(CASE WHEN outing_date < CURRENT_DATE THEN 1 END) as past_outings
      FROM tenant_social_outings
      WHERE tenant_id = $1`,
      [tenantId]
    );

    const bookingStats = await queryOne(
      `SELECT
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN customer_data->>'wheelchair_user' = 'true' THEN 1 END) as wheelchair_bookings
      FROM tenant_outing_bookings
      WHERE tenant_id = $1 AND booking_status = 'confirmed'`,
      [tenantId]
    );

    res.json({
      total: parseInt(outingStats?.total_outings || '0'),
      upcoming: parseInt(outingStats?.upcoming_outings || '0'),
      past: parseInt(outingStats?.past_outings || '0'),
      total_bookings: parseInt(bookingStats?.total_bookings || '0'),
      wheelchair_users: parseInt(bookingStats?.wheelchair_bookings || '0')
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/outings
 * @desc Get all outings for a tenant
 * @access Private
 */
router.get(
  '/tenants/:tenantId/outings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const outings = await query(
      `SELECT o.*,
        COUNT(DISTINCT b.id) as booking_count,
        COUNT(DISTINCT r.id) as driver_count,
        COUNT(CASE WHEN b.customer_data->>'wheelchair_user' = 'true' THEN 1 END) as wheelchair_bookings
      FROM tenant_social_outings o
      LEFT JOIN tenant_outing_bookings b ON o.id = b.outing_id
        AND b.tenant_id = o.tenant_id
        AND b.booking_status = 'confirmed'
      LEFT JOIN tenant_outing_rotas r ON o.id = r.outing_id
        AND r.tenant_id = o.tenant_id
      WHERE o.tenant_id = $1
      GROUP BY o.id
      ORDER BY o.outing_date DESC`,
      [tenantId]
    );

    res.json(outings);
  })
);

/**
 * @route POST /api/tenants/:tenantId/outings
 * @desc Create a new outing
 * @access Private
 */
router.post(
  '/tenants/:tenantId/outings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      name,
      destination,
      outing_date,
      departure_time,
      return_time,
      max_passengers,
      cost_per_person,
      wheelchair_accessible,
      description,
      meeting_point,
      contact_person,
      contact_phone,
      weather_dependent,
      minimum_passengers
    } = req.body;

    if (!name || !destination || !outing_date || !departure_time || !max_passengers) {
      throw new ValidationError('Missing required fields');
    }

    const outing = await queryOne(
      `INSERT INTO tenant_social_outings (
        tenant_id, name, destination, outing_date, departure_time, return_time,
        max_passengers, cost_per_person, wheelchair_accessible, description,
        meeting_point, contact_person, contact_phone, weather_dependent,
        minimum_passengers, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        tenantId, name, destination, outing_date, departure_time, return_time,
        max_passengers || 16, cost_per_person || 0, wheelchair_accessible || false,
        description, meeting_point, contact_person, contact_phone,
        weather_dependent || false, minimum_passengers || 1, 'system'
      ]
    );

    logger.info('Outing created', { tenantId, outingId: outing?.id });
    res.status(201).json(outing);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/outings/:outingId
 * @desc Update an outing
 * @access Private
 */
router.put(
  '/tenants/:tenantId/outings/:outingId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, outingId } = req.params;
    const updateFields = req.body;

    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');

    const values = [tenantId, outingId, ...Object.values(updateFields)];

    const outing = await queryOne(
      `UPDATE tenant_social_outings
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND id = $2
      RETURNING *`,
      values
    );

    if (!outing) {
      throw new NotFoundError('Outing not found');
    }

    res.json(outing);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/outings/:outingId
 * @desc Delete an outing
 * @access Private
 */
router.delete(
  '/tenants/:tenantId/outings/:outingId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, outingId } = req.params;

    // Delete bookings and rotas first
    await query(
      'DELETE FROM tenant_outing_bookings WHERE tenant_id = $1 AND outing_id = $2',
      [tenantId, outingId]
    );
    await query(
      'DELETE FROM tenant_outing_rotas WHERE tenant_id = $1 AND outing_id = $2',
      [tenantId, outingId]
    );

    const outing = await queryOne(
      'DELETE FROM tenant_social_outings WHERE tenant_id = $1 AND id = $2 RETURNING *',
      [tenantId, outingId]
    );

    if (!outing) {
      throw new NotFoundError('Outing not found');
    }

    res.json({ message: 'Outing deleted successfully' });
  })
);

// ============================================================================
// BOOKINGS MANAGEMENT
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/outings/:outingId/bookings
 * @desc Get all bookings for an outing
 * @access Private
 */
router.get(
  '/tenants/:tenantId/outings/:outingId/bookings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, outingId } = req.params;

    const bookings = await query(
      `SELECT b.*, c.name as customer_name, c.phone, c.accessibility_needs, c.medical_info
      FROM tenant_outing_bookings b
      LEFT JOIN tenant_customers c ON b.customer_id = c.customer_id AND b.tenant_id = c.tenant_id
      WHERE b.tenant_id = $1 AND b.outing_id = $2
      ORDER BY b.created_at DESC`,
      [tenantId, outingId]
    );

    res.json(bookings);
  })
);

/**
 * @route POST /api/tenants/:tenantId/outings/:outingId/bookings
 * @desc Create a booking
 * @access Private
 */
router.post(
  '/tenants/:tenantId/outings/:outingId/bookings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, outingId } = req.params;
    const { customer_id, special_requirements, dietary_requirements } = req.body;

    if (!customer_id) {
      throw new ValidationError('customer_id is required');
    }

    // Get customer data
    const customer = await queryOne(
      'SELECT * FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2',
      [tenantId, customer_id]
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check capacity
    const capacityCheck = await queryOne(
      `SELECT o.max_passengers, COUNT(b.id) as current_bookings
      FROM tenant_social_outings o
      LEFT JOIN tenant_outing_bookings b ON o.id = b.outing_id
        AND o.tenant_id = b.tenant_id
        AND b.booking_status = 'confirmed'
      WHERE o.tenant_id = $1 AND o.id = $2
      GROUP BY o.id, o.max_passengers`,
      [tenantId, outingId]
    );

    if (!capacityCheck) {
      throw new NotFoundError('Outing not found');
    }

    const currentBookings = parseInt(capacityCheck.current_bookings || '0');
    if (currentBookings >= capacityCheck.max_passengers) {
      throw new ValidationError('Outing is fully booked');
    }

    // Create booking
    const booking = await queryOne(
      `INSERT INTO tenant_outing_bookings (
        tenant_id, outing_id, customer_id, customer_data,
        special_requirements, dietary_requirements, booked_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [tenantId, outingId, customer_id, JSON.stringify(customer),
        special_requirements, dietary_requirements, 'system']
    );

    res.status(201).json(booking);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/outings/:outingId/bookings/:bookingId/cancel
 * @desc Cancel a booking
 * @access Private
 */
router.put(
  '/tenants/:tenantId/outings/:outingId/bookings/:bookingId/cancel',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, outingId, bookingId } = req.params;
    const { cancellation_reason } = req.body;

    const booking = await queryOne(
      `UPDATE tenant_outing_bookings
      SET booking_status = 'cancelled',
          cancellation_reason = $4,
          cancelled_at = CURRENT_TIMESTAMP,
          cancelled_by = $5
      WHERE tenant_id = $1 AND outing_id = $2 AND id = $3
      RETURNING *`,
      [tenantId, outingId, bookingId, cancellation_reason, 'system']
    );

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    res.json(booking);
  })
);

// ============================================================================
// DRIVER ASSIGNMENTS (ROTAS)
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/outings/:outingId/rotas
 * @desc Get driver assignments for an outing
 * @access Private
 */
router.get(
  '/tenants/:tenantId/outings/:outingId/rotas',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, outingId } = req.params;

    const rotas = await query(
      `SELECT r.*, d.name as driver_name, d.phone as driver_phone,
        v.make, v.model, v.registration, v.wheelchair_accessible
      FROM tenant_outing_rotas r
      LEFT JOIN tenant_drivers d ON r.driver_id = d.driver_id AND r.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON d.driver_id = v.driver_id AND d.tenant_id = v.tenant_id
      WHERE r.tenant_id = $1 AND r.outing_id = $2
      ORDER BY r.created_at ASC`,
      [tenantId, outingId]
    );

    res.json(rotas);
  })
);

/**
 * @route POST /api/tenants/:tenantId/outings/:outingId/rotas
 * @desc Assign driver to outing
 * @access Private
 */
router.post(
  '/tenants/:tenantId/outings/:outingId/rotas',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, outingId } = req.params;
    const { driver_id, role = 'driver' } = req.body;

    if (!driver_id) {
      throw new ValidationError('driver_id is required');
    }

    // Get driver and vehicle data
    const driverData = await queryOne(
      `SELECT d.*, v.make, v.model, v.registration, v.wheelchair_accessible
      FROM tenant_drivers d
      LEFT JOIN tenant_vehicles v ON d.driver_id = v.driver_id AND d.tenant_id = v.tenant_id
      WHERE d.tenant_id = $1 AND d.driver_id = $2`,
      [tenantId, driver_id]
    );

    if (!driverData) {
      throw new NotFoundError('Driver not found');
    }

    const vehicleData = {
      make: driverData.make || null,
      model: driverData.model || null,
      registration: driverData.registration || null,
      wheelchair_accessible: driverData.wheelchair_accessible || false
    };

    const rota = await queryOne(
      `INSERT INTO tenant_outing_rotas (
        tenant_id, outing_id, driver_id, vehicle_data, role, assigned_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [tenantId, outingId, driver_id, JSON.stringify(vehicleData), role, 'system']
    );

    res.status(201).json(rota);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/outings/:outingId/rotas/:rotaId/passengers
 * @desc Update passenger assignments
 * @access Private
 */
router.put(
  '/tenants/:tenantId/outings/:outingId/rotas/:rotaId/passengers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, outingId, rotaId } = req.params;
    const { assigned_passengers } = req.body;

    const rota = await queryOne(
      `UPDATE tenant_outing_rotas
      SET assigned_passengers = $4, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND outing_id = $2 AND id = $3
      RETURNING *`,
      [tenantId, outingId, rotaId, JSON.stringify(assigned_passengers)]
    );

    if (!rota) {
      throw new NotFoundError('Rota not found');
    }

    res.json(rota);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/outings/:outingId/rotas/:rotaId
 * @desc Remove driver from outing
 * @access Private
 */
router.delete(
  '/tenants/:tenantId/outings/:outingId/rotas/:rotaId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, outingId, rotaId } = req.params;

    const rota = await queryOne(
      'DELETE FROM tenant_outing_rotas WHERE tenant_id = $1 AND outing_id = $2 AND id = $3 RETURNING *',
      [tenantId, outingId, rotaId]
    );

    if (!rota) {
      throw new NotFoundError('Rota not found');
    }

    res.json({ message: 'Driver removed successfully' });
  })
);

// ============================================================================
// AVAILABILITY CHECKING
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/customers/:customerId/availability/:date
 * @desc Check customer availability
 * @access Private
 */
router.get(
  '/tenants/:tenantId/customers/:customerId/availability/:date',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId, date } = req.params;

    const customer = await queryOne(
      'SELECT * FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2',
      [tenantId, customerId]
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check existing bookings
    const existingBookings = await query(
      `SELECT o.name, o.outing_date
      FROM tenant_outing_bookings b
      JOIN tenant_social_outings o ON b.outing_id = o.id AND b.tenant_id = o.tenant_id
      WHERE b.tenant_id = $1 AND b.customer_id = $2 AND o.outing_date = $3
      AND b.booking_status = 'confirmed'`,
      [tenantId, customerId, date]
    );

    const available = existingBookings.length === 0;
    const reason = available
      ? 'Available'
      : `Already booked on: ${existingBookings[0].name}`;

    res.json({
      available,
      reason,
      conflictType: available ? undefined : 'existing_outing'
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/drivers/:driverId/availability/:date
 * @desc Check driver availability
 * @access Private
 */
router.get(
  '/tenants/:tenantId/drivers/:driverId/availability/:date',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId, date } = req.params;

    const driver = await queryOne(
      'SELECT * FROM tenant_drivers WHERE tenant_id = $1 AND driver_id = $2',
      [tenantId, driverId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Check existing assignments
    const existingAssignments = await query(
      `SELECT o.name, o.outing_date
      FROM tenant_outing_rotas r
      JOIN tenant_social_outings o ON r.outing_id = o.id AND r.tenant_id = o.tenant_id
      WHERE r.tenant_id = $1 AND r.driver_id = $2 AND o.outing_date = $3`,
      [tenantId, driverId, date]
    );

    const available = existingAssignments.length === 0;
    const reason = available
      ? 'Available'
      : `Already assigned to: ${existingAssignments[0].name}`;

    res.json({
      available,
      reason,
      conflictType: available ? undefined : 'existing_outing'
    });
  })
);

export default router;
