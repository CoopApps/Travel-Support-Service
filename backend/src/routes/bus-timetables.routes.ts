import express, { Response } from 'express';
import { query, queryOne } from '../config/database';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';
import { checkDriverAvailability } from '../services/driverRostering.service';

const router = express.Router();

/**
 * Bus Timetables API
 *
 * Manages service schedules including:
 * - Timetable creation and management
 * - Vehicle and driver assignment
 * - Service capacity management
 * - Real-time seat availability
 */

// ==================================================================================
// GET /tenants/:tenantId/bus/timetables
// Get all timetables with optional filtering
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/timetables',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { route_id, status, date } = req.query;

    try {
      let sql = `
        SELECT
          t.timetable_id,
          t.route_id,
          t.service_name,
          t.departure_time,
          t.direction,
          t.vehicle_id,
          t.driver_id,
          t.total_seats,
          t.wheelchair_spaces,
          t.valid_from,
          t.valid_until,
          t.recurrence_pattern,
          t.status,
          t.created_at,
          t.updated_at,
          r.route_number,
          r.route_name,
          r.origin_point,
          r.destination_point,
          v.registration as vehicle_registration,
          d.name as driver_name
        FROM section22_timetables t
        JOIN section22_bus_routes r ON t.route_id = r.route_id
        LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id
        LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id
        WHERE t.tenant_id = $1
      `;

      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (route_id) {
        sql += ` AND t.route_id = $${paramIndex}`;
        params.push(route_id);
        paramIndex++;
      }

      if (status) {
        sql += ` AND t.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (date) {
        sql += ` AND t.valid_from <= $${paramIndex} AND (t.valid_until IS NULL OR t.valid_until >= $${paramIndex})`;
        params.push(date);
        paramIndex++;
      }

      sql += ` ORDER BY t.departure_time`;

      const timetables = await query(sql, params);

      logger.info('Bus timetables fetched', {
        tenantId,
        count: timetables.length,
        filters: { route_id, status, date }
      });

      return res.json(timetables);
    } catch (error) {
      logger.error('Failed to fetch timetables', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// GET /tenants/:tenantId/bus/timetables/today
// Get today's services with availability
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/timetables/today',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    try {
      const services = await query(
        `SELECT * FROM v_todays_bus_services
         WHERE tenant_id = $1
         ORDER BY departure_time`,
        [tenantId]
      );

      logger.info('Today\'s bus services fetched', {
        tenantId,
        count: services.length
      });

      return res.json(services);
    } catch (error) {
      logger.error('Failed to fetch today\'s services', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// GET /tenants/:tenantId/bus/timetables/available-drivers
// Get available drivers for a specific date/time slot
// IMPORTANT: This must come BEFORE /:timetableId route
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/timetables/available-drivers',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { date, time, duration } = req.query;

    if (!date || !time) {
      return res.status(400).json({
        error: 'Missing required query parameters: date, time'
      });
    }

    const durationMinutes = parseInt(duration as string) || 90;

    try {
      // Get all active drivers
      const drivers = await query(
        `SELECT d.driver_id, d.name, d.phone, d.is_active, d.employment_status,
                v.vehicle_id, v.registration as vehicle_registration
         FROM tenant_drivers d
         LEFT JOIN tenant_vehicles v ON d.vehicle_id = v.vehicle_id AND v.is_active = true
         WHERE d.tenant_id = $1 AND d.is_active = true
         ORDER BY d.name`,
        [tenantId]
      );

      // Check availability for each driver
      const availabilityResults = await Promise.all(
        drivers.map(async (driver: any) => {
          const availability = await checkDriverAvailability(
            parseInt(tenantId),
            driver.driver_id,
            date as string,
            time as string,
            durationMinutes
          );

          return {
            driver_id: driver.driver_id,
            name: driver.name,
            phone: driver.phone,
            employment_status: driver.employment_status,
            vehicle_id: driver.vehicle_id,
            vehicle_registration: driver.vehicle_registration,
            available: availability.available,
            conflicts: availability.conflicts,
            has_critical_conflicts: availability.conflicts.some(c => c.severity === 'critical'),
            has_warnings: availability.conflicts.some(c => c.severity === 'warning')
          };
        })
      );

      // Sort: available drivers first, then by name
      availabilityResults.sort((a, b) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        return a.name.localeCompare(b.name);
      });

      logger.info('Available drivers fetched', {
        tenantId,
        date,
        time,
        totalDrivers: drivers.length,
        availableCount: availabilityResults.filter(d => d.available).length
      });

      return res.json({
        date,
        time,
        duration_minutes: durationMinutes,
        drivers: availabilityResults
      });
    } catch (error) {
      logger.error('Failed to fetch available drivers', { tenantId, date, time, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// GET /tenants/:tenantId/bus/timetables/:timetableId
// Get timetable details with availability
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/timetables/:timetableId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;
    const { date } = req.query;

    try {
      const timetable = await queryOne(
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

      if (!timetable) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      // Get availability for specific date if provided
      let availability = null;
      if (date) {
        availability = await queryOne(
          `SELECT * FROM section22_seat_availability
           WHERE timetable_id = $1 AND service_date = $2`,
          [timetableId, date]
        );

        // If no availability record exists, create one
        if (!availability) {
          availability = {
            total_seats: timetable.total_seats,
            booked_seats: 0,
            available_seats: timetable.total_seats,
            wheelchair_spaces: timetable.wheelchair_spaces,
            booked_wheelchair_spaces: 0,
            available_wheelchair_spaces: timetable.wheelchair_spaces
          };
        }
      }

      // Get route stops
      const stops = await query(
        `SELECT * FROM section22_route_stops
         WHERE route_id = $1
         ORDER BY stop_sequence`,
        [timetable.route_id]
      );

      logger.info('Timetable details fetched', {
        tenantId,
        timetableId,
        date
      });

      return res.json({
        ...timetable,
        availability,
        stops
      });
    } catch (error) {
      logger.error('Failed to fetch timetable details', { tenantId, timetableId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// POST /tenants/:tenantId/bus/timetables
// Create a new timetable
// ==================================================================================
router.post(
  '/tenants/:tenantId/bus/timetables',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      route_id,
      service_name,
      departure_time,
      direction,
      vehicle_id,
      driver_id,
      total_seats,
      wheelchair_spaces,
      valid_from,
      valid_until,
      recurrence_pattern
    } = req.body;

    // Validation
    if (!route_id || !service_name || !departure_time || !total_seats || !valid_from) {
      return res.status(400).json({
        error: 'Missing required fields: route_id, service_name, departure_time, total_seats, valid_from'
      });
    }

    if (total_seats < 1) {
      return res.status(400).json({ error: 'total_seats must be at least 1' });
    }

    if (wheelchair_spaces && wheelchair_spaces > total_seats) {
      return res.status(400).json({ error: 'wheelchair_spaces cannot exceed total_seats' });
    }

    try {
      // Verify route exists
      const route = await queryOne(
        `SELECT route_id FROM section22_bus_routes
         WHERE tenant_id = $1 AND route_id = $2`,
        [tenantId, route_id]
      );

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      // Verify vehicle exists if provided
      if (vehicle_id) {
        const vehicle = await queryOne(
          `SELECT vehicle_id FROM tenant_vehicles
           WHERE tenant_id = $1 AND vehicle_id = $2`,
          [tenantId, vehicle_id]
        );

        if (!vehicle) {
          return res.status(404).json({ error: 'Vehicle not found' });
        }
      }

      // Verify driver exists if provided
      if (driver_id) {
        const driver = await queryOne(
          `SELECT driver_id FROM tenant_drivers
           WHERE tenant_id = $1 AND driver_id = $2`,
          [tenantId, driver_id]
        );

        if (!driver) {
          return res.status(404).json({ error: 'Driver not found' });
        }
      }

      const result = await queryOne(
        `INSERT INTO section22_timetables (
          tenant_id,
          route_id,
          service_name,
          departure_time,
          direction,
          vehicle_id,
          driver_id,
          total_seats,
          wheelchair_spaces,
          valid_from,
          valid_until,
          recurrence_pattern
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          tenantId,
          route_id,
          service_name,
          departure_time,
          direction || 'outbound',
          vehicle_id,
          driver_id,
          total_seats,
          wheelchair_spaces || 0,
          valid_from,
          valid_until,
          recurrence_pattern ? JSON.stringify(recurrence_pattern) : null
        ]
      );

      logger.info('Timetable created', {
        tenantId,
        timetableId: result.timetable_id,
        routeId: route_id,
        serviceName: service_name,
        userId: req.user?.userId
      });

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to create timetable', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// PUT /tenants/:tenantId/bus/timetables/:timetableId
// Update a timetable
// ==================================================================================
router.put(
  '/tenants/:tenantId/bus/timetables/:timetableId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;
    const {
      service_name,
      departure_time,
      direction,
      vehicle_id,
      driver_id,
      total_seats,
      wheelchair_spaces,
      valid_from,
      valid_until,
      recurrence_pattern,
      status
    } = req.body;

    try {
      const existing = await queryOne(
        `SELECT timetable_id FROM section22_timetables
         WHERE tenant_id = $1 AND timetable_id = $2`,
        [tenantId, timetableId]
      );

      if (!existing) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      const result = await queryOne(
        `UPDATE section22_timetables
         SET service_name = COALESCE($3, service_name),
             departure_time = COALESCE($4, departure_time),
             direction = COALESCE($5, direction),
             vehicle_id = COALESCE($6, vehicle_id),
             driver_id = COALESCE($7, driver_id),
             total_seats = COALESCE($8, total_seats),
             wheelchair_spaces = COALESCE($9, wheelchair_spaces),
             valid_from = COALESCE($10, valid_from),
             valid_until = COALESCE($11, valid_until),
             recurrence_pattern = COALESCE($12, recurrence_pattern),
             status = COALESCE($13, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND timetable_id = $2
         RETURNING *`,
        [
          tenantId,
          timetableId,
          service_name,
          departure_time,
          direction,
          vehicle_id,
          driver_id,
          total_seats,
          wheelchair_spaces,
          valid_from,
          valid_until,
          recurrence_pattern ? JSON.stringify(recurrence_pattern) : null,
          status
        ]
      );

      logger.info('Timetable updated', { tenantId, timetableId, userId: req.user?.userId });

      return res.json(result);
    } catch (error) {
      logger.error('Failed to update timetable', { tenantId, timetableId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// DELETE /tenants/:tenantId/bus/timetables/:timetableId
// Delete a timetable
// ==================================================================================
router.delete(
  '/tenants/:tenantId/bus/timetables/:timetableId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;

    try {
      // Check for existing bookings
      const bookings = await query(
        `SELECT booking_id FROM section22_bus_bookings
         WHERE timetable_id = $1 AND booking_status IN ('confirmed', 'pending')`,
        [timetableId]
      );

      if (bookings.length > 0) {
        return res.status(400).json({
          error: `Cannot delete timetable with ${bookings.length} active bookings. Cancel bookings first.`
        });
      }

      const result = await queryOne(
        `DELETE FROM section22_timetables
         WHERE tenant_id = $1 AND timetable_id = $2
         RETURNING timetable_id, service_name`,
        [tenantId, timetableId]
      );

      if (!result) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      logger.info('Timetable deleted', {
        tenantId,
        timetableId,
        serviceName: result.service_name,
        userId: req.user?.userId
      });

      return res.json({
        message: 'Timetable deleted successfully',
        timetable: result
      });
    } catch (error) {
      logger.error('Failed to delete timetable', { tenantId, timetableId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// GET /tenants/:tenantId/bus/timetables/:timetableId/availability
// Get availability for a date range
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/timetables/:timetableId/availability',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'Missing required query parameters: start_date, end_date'
      });
    }

    try {
      const availability = await query(
        `SELECT
          sa.service_date,
          sa.total_seats,
          sa.booked_seats,
          sa.available_seats,
          sa.wheelchair_spaces,
          sa.booked_wheelchair_spaces,
          sa.available_wheelchair_spaces,
          sa.last_updated
         FROM section22_seat_availability sa
         WHERE sa.timetable_id = $1
           AND sa.service_date BETWEEN $2 AND $3
         ORDER BY sa.service_date`,
        [timetableId, start_date, end_date]
      );

      logger.info('Timetable availability fetched', {
        tenantId,
        timetableId,
        dateRange: { start_date, end_date },
        count: availability.length
      });

      return res.json(availability);
    } catch (error) {
      logger.error('Failed to fetch availability', { tenantId, timetableId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// PATCH /tenants/:tenantId/bus/timetables/:timetableId/assign-vehicle
// Assign or update vehicle for a timetable
// ==================================================================================
router.patch(
  '/tenants/:tenantId/bus/timetables/:timetableId/assign-vehicle',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;
    const { vehicle_id } = req.body;

    if (!vehicle_id) {
      return res.status(400).json({ error: 'vehicle_id is required' });
    }

    try {
      // Verify vehicle exists
      const vehicle = await queryOne(
        `SELECT vehicle_id, registration FROM tenant_vehicles
         WHERE tenant_id = $1 AND vehicle_id = $2`,
        [tenantId, vehicle_id]
      );

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      const result = await queryOne(
        `UPDATE section22_timetables
         SET vehicle_id = $3, updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND timetable_id = $2
         RETURNING *`,
        [tenantId, timetableId, vehicle_id]
      );

      if (!result) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      logger.info('Vehicle assigned to timetable', {
        tenantId,
        timetableId,
        vehicleId: vehicle_id,
        registration: vehicle.registration,
        userId: req.user?.userId
      });

      return res.json(result);
    } catch (error) {
      logger.error('Failed to assign vehicle', { tenantId, timetableId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// PATCH /tenants/:tenantId/bus/timetables/:timetableId/assign-driver
// Assign or update driver for a timetable (with availability check)
// ==================================================================================
router.patch(
  '/tenants/:tenantId/bus/timetables/:timetableId/assign-driver',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, timetableId } = req.params;
    const { driver_id, date, force } = req.body;

    if (!driver_id) {
      return res.status(400).json({ error: 'driver_id is required' });
    }

    try {
      // Verify driver exists and is active
      const driver = await queryOne(
        `SELECT driver_id, name, is_active, employment_status FROM tenant_drivers
         WHERE tenant_id = $1 AND driver_id = $2`,
        [tenantId, driver_id]
      );

      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      if (!driver.is_active) {
        return res.status(400).json({ error: 'Driver is not active' });
      }

      // Get timetable to check the time
      const timetable = await queryOne(
        `SELECT timetable_id, departure_time, valid_from FROM section22_timetables
         WHERE tenant_id = $1 AND timetable_id = $2`,
        [tenantId, timetableId]
      );

      if (!timetable) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      // Check driver availability (use provided date or valid_from as default)
      const checkDate = date || timetable.valid_from;
      const availability = await checkDriverAvailability(
        parseInt(tenantId),
        driver_id,
        checkDate,
        timetable.departure_time,
        90 // Assume 90 minutes for a bus service
      );

      // If there are critical conflicts and force is not set, return error
      const criticalConflicts = availability.conflicts.filter(c => c.severity === 'critical');
      if (criticalConflicts.length > 0 && !force) {
        return res.status(409).json({
          error: 'Driver has scheduling conflicts',
          conflicts: criticalConflicts,
          message: 'Set force=true to override warnings'
        });
      }

      const result = await queryOne(
        `UPDATE section22_timetables
         SET driver_id = $3, updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND timetable_id = $2
         RETURNING *`,
        [tenantId, timetableId, driver_id]
      );

      logger.info('Driver assigned to timetable', {
        tenantId,
        timetableId,
        driverId: driver_id,
        driverName: driver.name,
        conflicts: availability.conflicts.length,
        forced: force && criticalConflicts.length > 0,
        userId: req.user?.userId
      });

      return res.json({
        ...result,
        warnings: availability.conflicts.filter(c => c.severity === 'warning')
      });
    } catch (error) {
      logger.error('Failed to assign driver', { tenantId, timetableId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
