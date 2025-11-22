import express, { Response } from 'express';
import { query, queryOne } from '../config/database';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Regular Passengers API
 *
 * Manages recurring seat assignments for bus services:
 * - Regular passenger registration
 * - Day-of-week travel patterns
 * - Self-service absence reporting
 */

// ==================================================================================
// REGULAR PASSENGERS
// ==================================================================================

// GET /tenants/:tenantId/bus/regular-passengers
// Get all regular passengers, optionally filtered by timetable
router.get(
  '/tenants/:tenantId/bus/regular-passengers',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { timetable_id, customer_id, status } = req.query;

    try {
      let sql = `
        SELECT
          rp.regular_id,
          rp.customer_id,
          rp.timetable_id,
          rp.seat_number,
          rp.requires_wheelchair_space,
          rp.travels_monday,
          rp.travels_tuesday,
          rp.travels_wednesday,
          rp.travels_thursday,
          rp.travels_friday,
          rp.travels_saturday,
          rp.travels_sunday,
          rp.boarding_stop_id,
          rp.alighting_stop_id,
          rp.valid_from,
          rp.valid_until,
          rp.status,
          rp.special_requirements,
          rp.notes,
          rp.created_at,
          c.first_name,
          c.last_name,
          c.phone,
          c.email,
          t.service_name,
          t.departure_time,
          r.route_number,
          r.route_name,
          s1.stop_name as boarding_stop_name,
          s2.stop_name as alighting_stop_name
        FROM section22_regular_passengers rp
        JOIN tenant_customers c ON rp.customer_id = c.customer_id
        JOIN section22_timetables t ON rp.timetable_id = t.timetable_id
        JOIN section22_bus_routes r ON t.route_id = r.route_id
        LEFT JOIN section22_route_stops s1 ON rp.boarding_stop_id = s1.stop_id
        LEFT JOIN section22_route_stops s2 ON rp.alighting_stop_id = s2.stop_id
        WHERE rp.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (timetable_id) {
        params.push(timetable_id);
        sql += ` AND rp.timetable_id = $${params.length}`;
      }

      if (customer_id) {
        params.push(customer_id);
        sql += ` AND rp.customer_id = $${params.length}`;
      }

      if (status) {
        params.push(status);
        sql += ` AND rp.status = $${params.length}`;
      }

      sql += ` ORDER BY r.route_number, t.departure_time, rp.seat_number`;

      const result = await query(sql, params);
      return res.json(result);
    } catch (error: any) {
      logger.error('Error fetching regular passengers', { error: error.message, tenantId });
      return res.status(500).json({ error: 'Failed to fetch regular passengers' });
    }
  }
);

// POST /tenants/:tenantId/bus/regular-passengers
// Create a new regular passenger assignment
router.post(
  '/tenants/:tenantId/bus/regular-passengers',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      customer_id,
      timetable_id,
      seat_number,
      requires_wheelchair_space,
      travels_monday,
      travels_tuesday,
      travels_wednesday,
      travels_thursday,
      travels_friday,
      travels_saturday,
      travels_sunday,
      boarding_stop_id,
      alighting_stop_id,
      valid_from,
      valid_until,
      special_requirements,
      notes
    } = req.body;

    // Validation
    if (!customer_id || !timetable_id || !seat_number) {
      return res.status(400).json({
        error: 'Missing required fields: customer_id, timetable_id, seat_number'
      });
    }

    // At least one day must be selected
    const hasDays = travels_monday || travels_tuesday || travels_wednesday ||
                    travels_thursday || travels_friday || travels_saturday || travels_sunday;
    if (!hasDays) {
      return res.status(400).json({ error: 'At least one travel day must be selected' });
    }

    try {
      // Check customer exists
      const customer = await queryOne(
        'SELECT customer_id FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2',
        [tenantId, customer_id]
      );
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check timetable exists
      const timetable = await queryOne(
        'SELECT timetable_id FROM section22_timetables WHERE tenant_id = $1 AND timetable_id = $2',
        [tenantId, timetable_id]
      );
      if (!timetable) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      // Check for seat conflicts
      const daysMask = (travels_monday ? 1 : 0) + (travels_tuesday ? 2 : 0) +
                       (travels_wednesday ? 4 : 0) + (travels_thursday ? 8 : 0) +
                       (travels_friday ? 16 : 0) + (travels_saturday ? 32 : 0) +
                       (travels_sunday ? 64 : 0);

      const seatAvailable = await queryOne(
        'SELECT check_regular_seat_available($1, $2, $3, $4, $5) as available',
        [timetable_id, seat_number, valid_from || new Date().toISOString().split('T')[0], valid_until, daysMask]
      );

      if (!seatAvailable?.available) {
        return res.status(409).json({
          error: 'Seat is already assigned to another regular passenger for overlapping days/dates'
        });
      }

      // Create the regular passenger assignment
      const result = await queryOne(`
        INSERT INTO section22_regular_passengers (
          tenant_id, customer_id, timetable_id, seat_number, requires_wheelchair_space,
          travels_monday, travels_tuesday, travels_wednesday, travels_thursday,
          travels_friday, travels_saturday, travels_sunday,
          boarding_stop_id, alighting_stop_id, valid_from, valid_until,
          special_requirements, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        tenantId, customer_id, timetable_id, seat_number, requires_wheelchair_space || false,
        travels_monday || false, travels_tuesday || false, travels_wednesday || false,
        travels_thursday || false, travels_friday || false, travels_saturday || false,
        travels_sunday || false, boarding_stop_id, alighting_stop_id,
        valid_from || new Date().toISOString().split('T')[0], valid_until,
        special_requirements, notes, req.user?.userId
      ]);

      logger.info('Regular passenger created', { regularId: result.regular_id, tenantId, customerId: customer_id });
      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error creating regular passenger', { error: error.message, tenantId });
      return res.status(500).json({ error: 'Failed to create regular passenger' });
    }
  }
);

// PUT /tenants/:tenantId/bus/regular-passengers/:regularId
// Update a regular passenger assignment
router.put(
  '/tenants/:tenantId/bus/regular-passengers/:regularId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, regularId } = req.params;
    const updates = req.body;

    try {
      // Check exists
      const existing = await queryOne(
        'SELECT * FROM section22_regular_passengers WHERE tenant_id = $1 AND regular_id = $2',
        [tenantId, regularId]
      );
      if (!existing) {
        return res.status(404).json({ error: 'Regular passenger not found' });
      }

      // Build update query
      const allowedFields = [
        'seat_number', 'requires_wheelchair_space',
        'travels_monday', 'travels_tuesday', 'travels_wednesday',
        'travels_thursday', 'travels_friday', 'travels_saturday', 'travels_sunday',
        'boarding_stop_id', 'alighting_stop_id', 'valid_from', 'valid_until',
        'status', 'special_requirements', 'notes'
      ];

      const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const params: any[] = [tenantId, regularId];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          params.push(updates[field]);
          setClauses.push(`${field} = $${params.length}`);
        }
      }

      const result = await queryOne(`
        UPDATE section22_regular_passengers
        SET ${setClauses.join(', ')}
        WHERE tenant_id = $1 AND regular_id = $2
        RETURNING *
      `, params);

      return res.json(result);
    } catch (error: any) {
      logger.error('Error updating regular passenger', { error: error.message, tenantId, regularId });
      return res.status(500).json({ error: 'Failed to update regular passenger' });
    }
  }
);

// DELETE /tenants/:tenantId/bus/regular-passengers/:regularId
// Remove a regular passenger assignment
router.delete(
  '/tenants/:tenantId/bus/regular-passengers/:regularId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, regularId } = req.params;

    try {
      const result = await queryOne(
        'DELETE FROM section22_regular_passengers WHERE tenant_id = $1 AND regular_id = $2 RETURNING regular_id',
        [tenantId, regularId]
      );

      if (!result) {
        return res.status(404).json({ error: 'Regular passenger not found' });
      }

      return res.json({ message: 'Regular passenger removed successfully' });
    } catch (error: any) {
      logger.error('Error deleting regular passenger', { error: error.message, tenantId, regularId });
      return res.status(500).json({ error: 'Failed to delete regular passenger' });
    }
  }
);

// GET /tenants/:tenantId/bus/timetables/:timetableId/effective-passengers
// Get all passengers (regular + one-off) for a specific date
router.get(
  '/tenants/:tenantId/bus/timetables/:timetableId/effective-passengers',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;
    const { service_date } = req.query;

    if (!service_date) {
      return res.status(400).json({ error: 'service_date is required' });
    }

    try {
      const result = await query(
        'SELECT * FROM get_effective_passengers($1, $2, $3)',
        [tenantId, timetableId, service_date]
      );
      return res.json(result);
    } catch (error: any) {
      logger.error('Error fetching effective passengers', { error: error.message, tenantId, timetableId });
      return res.status(500).json({ error: 'Failed to fetch effective passengers' });
    }
  }
);

// ==================================================================================
// PASSENGER ABSENCES
// ==================================================================================

// GET /tenants/:tenantId/bus/absences
// Get absences, optionally filtered
router.get(
  '/tenants/:tenantId/bus/absences',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { customer_id, timetable_id, start_date, end_date, status } = req.query;

    try {
      let sql = `
        SELECT
          a.absence_id,
          a.customer_id,
          a.absence_date,
          a.absence_reason,
          a.reason_notes,
          a.timetable_id,
          a.reported_by,
          a.reported_at,
          a.status,
          a.fare_adjustment_applied,
          a.fare_adjustment_amount,
          c.first_name,
          c.last_name,
          t.service_name,
          r.route_number
        FROM section22_passenger_absences a
        JOIN tenant_customers c ON a.customer_id = c.customer_id
        LEFT JOIN section22_timetables t ON a.timetable_id = t.timetable_id
        LEFT JOIN section22_bus_routes r ON t.route_id = r.route_id
        WHERE a.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (customer_id) {
        params.push(customer_id);
        sql += ` AND a.customer_id = $${params.length}`;
      }

      if (timetable_id) {
        params.push(timetable_id);
        sql += ` AND (a.timetable_id = $${params.length} OR a.timetable_id IS NULL)`;
      }

      if (start_date) {
        params.push(start_date);
        sql += ` AND a.absence_date >= $${params.length}`;
      }

      if (end_date) {
        params.push(end_date);
        sql += ` AND a.absence_date <= $${params.length}`;
      }

      if (status) {
        params.push(status);
        sql += ` AND a.status = $${params.length}`;
      }

      sql += ` ORDER BY a.absence_date DESC`;

      const result = await query(sql, params);
      return res.json(result);
    } catch (error: any) {
      logger.error('Error fetching absences', { error: error.message, tenantId });
      return res.status(500).json({ error: 'Failed to fetch absences' });
    }
  }
);

// POST /tenants/:tenantId/bus/absences
// Report an absence (can be self-service from customer dashboard)
router.post(
  '/tenants/:tenantId/bus/absences',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      customer_id,
      absence_date,
      absence_reason,
      reason_notes,
      timetable_id, // Optional - null means all services that day
      reported_by
    } = req.body;

    // Validation
    if (!customer_id || !absence_date || !absence_reason) {
      return res.status(400).json({
        error: 'Missing required fields: customer_id, absence_date, absence_reason'
      });
    }

    const validReasons = ['sick', 'holiday', 'appointment', 'other'];
    if (!validReasons.includes(absence_reason)) {
      return res.status(400).json({
        error: `Invalid absence_reason. Must be one of: ${validReasons.join(', ')}`
      });
    }

    try {
      // Check customer exists
      const customer = await queryOne(
        'SELECT customer_id FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2',
        [tenantId, customer_id]
      );
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check for duplicate absence
      const existing = await queryOne(`
        SELECT absence_id FROM section22_passenger_absences
        WHERE customer_id = $1 AND absence_date = $2
          AND (timetable_id = $3 OR ($3 IS NULL AND timetable_id IS NULL))
          AND status = 'confirmed'
      `, [customer_id, absence_date, timetable_id]);

      if (existing) {
        return res.status(409).json({ error: 'An absence is already recorded for this date' });
      }

      // Create the absence
      const result = await queryOne(`
        INSERT INTO section22_passenger_absences (
          tenant_id, customer_id, absence_date, absence_reason, reason_notes,
          timetable_id, reported_by, reported_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        tenantId, customer_id, absence_date, absence_reason, reason_notes,
        timetable_id, reported_by || 'staff', req.user?.userId
      ]);

      logger.info('Absence reported', {
        absenceId: result.absence_id,
        tenantId,
        customerId: customer_id,
        date: absence_date,
        reason: absence_reason
      });

      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error creating absence', { error: error.message, tenantId });
      return res.status(500).json({ error: 'Failed to report absence' });
    }
  }
);

// PUT /tenants/:tenantId/bus/absences/:absenceId
// Update an absence (e.g., cancel it)
router.put(
  '/tenants/:tenantId/bus/absences/:absenceId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, absenceId } = req.params;
    const { status, reason_notes } = req.body;

    try {
      const result = await queryOne(`
        UPDATE section22_passenger_absences
        SET status = COALESCE($3, status),
            reason_notes = COALESCE($4, reason_notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND absence_id = $2
        RETURNING *
      `, [tenantId, absenceId, status, reason_notes]);

      if (!result) {
        return res.status(404).json({ error: 'Absence not found' });
      }

      return res.json(result);
    } catch (error: any) {
      logger.error('Error updating absence', { error: error.message, tenantId, absenceId });
      return res.status(500).json({ error: 'Failed to update absence' });
    }
  }
);

// DELETE /tenants/:tenantId/bus/absences/:absenceId
// Delete an absence
router.delete(
  '/tenants/:tenantId/bus/absences/:absenceId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, absenceId } = req.params;

    try {
      const result = await queryOne(
        'DELETE FROM section22_passenger_absences WHERE tenant_id = $1 AND absence_id = $2 RETURNING absence_id',
        [tenantId, absenceId]
      );

      if (!result) {
        return res.status(404).json({ error: 'Absence not found' });
      }

      return res.json({ message: 'Absence deleted successfully' });
    } catch (error: any) {
      logger.error('Error deleting absence', { error: error.message, tenantId, absenceId });
      return res.status(500).json({ error: 'Failed to delete absence' });
    }
  }
);

// ==================================================================================
// CUSTOMER-FACING ENDPOINTS (for Customer Dashboard)
// ==================================================================================

// GET /tenants/:tenantId/customers/:customerId/bus-services
// Get a customer's regular bus service registrations
router.get(
  '/tenants/:tenantId/customers/:customerId/bus-services',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    try {
      const result = await query(`
        SELECT * FROM v_customer_upcoming_bus_journeys
        WHERE tenant_id = $1 AND customer_id = $2
        ORDER BY departure_time
      `, [tenantId, customerId]);

      return res.json(result);
    } catch (error: any) {
      logger.error('Error fetching customer bus services', { error: error.message, tenantId, customerId });
      return res.status(500).json({ error: 'Failed to fetch bus services' });
    }
  }
);

// GET /tenants/:tenantId/customers/:customerId/bus-absences
// Get a customer's reported absences
router.get(
  '/tenants/:tenantId/customers/:customerId/bus-absences',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { upcoming_only } = req.query;

    try {
      let sql = `
        SELECT
          a.*,
          t.service_name,
          r.route_number
        FROM section22_passenger_absences a
        LEFT JOIN section22_timetables t ON a.timetable_id = t.timetable_id
        LEFT JOIN section22_bus_routes r ON t.route_id = r.route_id
        WHERE a.tenant_id = $1 AND a.customer_id = $2
      `;
      const params: any[] = [tenantId, customerId];

      if (upcoming_only === 'true') {
        sql += ` AND a.absence_date >= CURRENT_DATE`;
      }

      sql += ` ORDER BY a.absence_date DESC`;

      const result = await query(sql, params);
      return res.json(result);
    } catch (error: any) {
      logger.error('Error fetching customer absences', { error: error.message, tenantId, customerId });
      return res.status(500).json({ error: 'Failed to fetch absences' });
    }
  }
);

// POST /tenants/:tenantId/customers/:customerId/bus-absences
// Customer self-service absence reporting (no approval needed)
router.post(
  '/tenants/:tenantId/customers/:customerId/bus-absences',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { absence_date, absence_reason, reason_notes, timetable_id } = req.body;

    // Validation
    if (!absence_date || !absence_reason) {
      return res.status(400).json({
        error: 'Missing required fields: absence_date, absence_reason'
      });
    }

    const validReasons = ['sick', 'holiday', 'appointment', 'other'];
    if (!validReasons.includes(absence_reason)) {
      return res.status(400).json({
        error: `Invalid absence_reason. Must be one of: ${validReasons.join(', ')}`
      });
    }

    try {
      // Check customer exists and is a regular passenger
      const regularServices = await query(`
        SELECT rp.timetable_id FROM section22_regular_passengers rp
        WHERE rp.tenant_id = $1 AND rp.customer_id = $2 AND rp.status = 'active'
      `, [tenantId, customerId]);

      if (regularServices.length === 0) {
        return res.status(400).json({ error: 'Customer is not registered as a regular bus passenger' });
      }

      // Check for duplicate
      const existing = await queryOne(`
        SELECT absence_id FROM section22_passenger_absences
        WHERE customer_id = $1 AND absence_date = $2
          AND (timetable_id = $3 OR ($3 IS NULL AND timetable_id IS NULL))
          AND status = 'confirmed'
      `, [customerId, absence_date, timetable_id]);

      if (existing) {
        return res.status(409).json({ error: 'You have already reported an absence for this date' });
      }

      // Create absence - marked as customer-reported
      const result = await queryOne(`
        INSERT INTO section22_passenger_absences (
          tenant_id, customer_id, absence_date, absence_reason, reason_notes,
          timetable_id, reported_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'customer')
        RETURNING *
      `, [tenantId, customerId, absence_date, absence_reason, reason_notes, timetable_id]);

      logger.info('Customer self-reported absence', {
        absenceId: result.absence_id,
        tenantId,
        customerId,
        date: absence_date,
        reason: absence_reason
      });

      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error creating customer absence', { error: error.message, tenantId, customerId });
      return res.status(500).json({ error: 'Failed to report absence' });
    }
  }
);

export default router;
