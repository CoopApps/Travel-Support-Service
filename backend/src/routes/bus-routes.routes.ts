import express, { Response } from 'express';
import { query, queryOne } from '../config/database';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Bus Routes API
 *
 * Manages Section 22 bus routes including:
 * - Route creation and management
 * - Stop sequences
 * - Service patterns
 * - Route status lifecycle
 */

// ==================================================================================
// GET /tenants/:tenantId/bus/routes
// Get all routes for a tenant with optional filtering
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/routes',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { status, service_pattern } = req.query;

    try {
      let sql = `
        SELECT
          r.route_id,
          r.route_number,
          r.route_name,
          r.description,
          r.registration_number,
          r.origin_point,
          r.destination_point,
          r.total_distance_miles,
          r.estimated_duration_minutes,
          r.service_pattern,
          r.operates_monday,
          r.operates_tuesday,
          r.operates_wednesday,
          r.operates_thursday,
          r.operates_friday,
          r.operates_saturday,
          r.operates_sunday,
          r.status,
          r.start_date,
          r.end_date,
          r.created_at,
          r.updated_at,
          COUNT(DISTINCT s.stop_id) as stop_count,
          COUNT(DISTINCT t.timetable_id) as timetable_count
        FROM section22_bus_routes r
        LEFT JOIN section22_route_stops s ON r.route_id = s.route_id
        LEFT JOIN section22_timetables t ON r.route_id = t.route_id
        WHERE r.tenant_id = $1
      `;

      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (status) {
        sql += ` AND r.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (service_pattern) {
        sql += ` AND r.service_pattern = $${paramIndex}`;
        params.push(service_pattern);
        paramIndex++;
      }

      sql += `
        GROUP BY r.route_id
        ORDER BY r.route_number
      `;

      const routes = await query(sql, params);

      logger.info('Bus routes fetched', {
        tenantId,
        count: routes.length,
        filters: { status, service_pattern }
      });

      return res.json(routes);
    } catch (error) {
      logger.error('Failed to fetch bus routes', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// GET /tenants/:tenantId/bus/routes/:routeId
// Get route details with stops
// ==================================================================================
router.get(
  '/tenants/:tenantId/bus/routes/:routeId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, routeId } = req.params;

    try {
      // Get route details
      const route = await queryOne(
        `SELECT * FROM section22_bus_routes
         WHERE tenant_id = $1 AND route_id = $2`,
        [tenantId, routeId]
      );

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      // Get stops in sequence
      const stops = await query(
        `SELECT * FROM section22_route_stops
         WHERE route_id = $1
         ORDER BY stop_sequence`,
        [routeId]
      );

      // Get timetables count
      const timetables = await query(
        `SELECT timetable_id, service_name, departure_time, status
         FROM section22_timetables
         WHERE route_id = $1
         ORDER BY departure_time`,
        [routeId]
      );

      logger.info('Bus route details fetched', {
        tenantId,
        routeId,
        stopCount: stops.length,
        timetableCount: timetables.length
      });

      return res.json({
        ...route,
        stops,
        timetables
      });
    } catch (error) {
      logger.error('Failed to fetch route details', { tenantId, routeId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// POST /tenants/:tenantId/bus/routes
// Create a new bus route
// ==================================================================================
router.post(
  '/tenants/:tenantId/bus/routes',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      route_number,
      route_name,
      description,
      registration_number,
      origin_point,
      destination_point,
      total_distance_miles,
      estimated_duration_minutes,
      service_pattern,
      operating_days,
      start_date,
      end_date
    } = req.body;

    // Validation
    if (!route_number || !route_name || !origin_point || !destination_point) {
      return res.status(400).json({
        error: 'Missing required fields: route_number, route_name, origin_point, destination_point'
      });
    }

    try {
      // Check for duplicate route number
      const existing = await queryOne(
        `SELECT route_id FROM section22_bus_routes
         WHERE tenant_id = $1 AND route_number = $2`,
        [tenantId, route_number]
      );

      if (existing) {
        return res.status(409).json({
          error: `Route number ${route_number} already exists`
        });
      }

      const result = await queryOne(
        `INSERT INTO section22_bus_routes (
          tenant_id,
          route_number,
          route_name,
          description,
          registration_number,
          origin_point,
          destination_point,
          total_distance_miles,
          estimated_duration_minutes,
          service_pattern,
          operates_monday,
          operates_tuesday,
          operates_wednesday,
          operates_thursday,
          operates_friday,
          operates_saturday,
          operates_sunday,
          start_date,
          end_date,
          created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         RETURNING *`,
        [
          tenantId,
          route_number,
          route_name,
          description,
          registration_number,
          origin_point,
          destination_point,
          total_distance_miles,
          estimated_duration_minutes,
          service_pattern || 'weekdays',
          operating_days?.monday || false,
          operating_days?.tuesday || false,
          operating_days?.wednesday || false,
          operating_days?.thursday || false,
          operating_days?.friday || false,
          operating_days?.saturday || false,
          operating_days?.sunday || false,
          start_date,
          end_date,
          req.user?.userId
        ]
      );

      logger.info('Bus route created', {
        tenantId,
        routeId: result.route_id,
        routeNumber: route_number,
        userId: req.user?.userId
      });

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to create bus route', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// PUT /tenants/:tenantId/bus/routes/:routeId
// Update a bus route
// ==================================================================================
router.put(
  '/tenants/:tenantId/bus/routes/:routeId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, routeId } = req.params;
    const {
      route_number,
      route_name,
      description,
      registration_number,
      origin_point,
      destination_point,
      total_distance_miles,
      estimated_duration_minutes,
      service_pattern,
      operating_days,
      status,
      start_date,
      end_date
    } = req.body;

    try {
      // Check route exists
      const existing = await queryOne(
        `SELECT route_id FROM section22_bus_routes
         WHERE tenant_id = $1 AND route_id = $2`,
        [tenantId, routeId]
      );

      if (!existing) {
        return res.status(404).json({ error: 'Route not found' });
      }

      const result = await queryOne(
        `UPDATE section22_bus_routes
         SET route_number = COALESCE($3, route_number),
             route_name = COALESCE($4, route_name),
             description = COALESCE($5, description),
             registration_number = COALESCE($6, registration_number),
             origin_point = COALESCE($7, origin_point),
             destination_point = COALESCE($8, destination_point),
             total_distance_miles = COALESCE($9, total_distance_miles),
             estimated_duration_minutes = COALESCE($10, estimated_duration_minutes),
             service_pattern = COALESCE($11, service_pattern),
             operates_monday = COALESCE($12, operates_monday),
             operates_tuesday = COALESCE($13, operates_tuesday),
             operates_wednesday = COALESCE($14, operates_wednesday),
             operates_thursday = COALESCE($15, operates_thursday),
             operates_friday = COALESCE($16, operates_friday),
             operates_saturday = COALESCE($17, operates_saturday),
             operates_sunday = COALESCE($18, operates_sunday),
             status = COALESCE($19, status),
             start_date = COALESCE($20, start_date),
             end_date = COALESCE($21, end_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND route_id = $2
         RETURNING *`,
        [
          tenantId,
          routeId,
          route_number,
          route_name,
          description,
          registration_number,
          origin_point,
          destination_point,
          total_distance_miles,
          estimated_duration_minutes,
          service_pattern,
          operating_days?.monday,
          operating_days?.tuesday,
          operating_days?.wednesday,
          operating_days?.thursday,
          operating_days?.friday,
          operating_days?.saturday,
          operating_days?.sunday,
          status,
          start_date,
          end_date
        ]
      );

      logger.info('Bus route updated', { tenantId, routeId, userId: req.user?.userId });

      return res.json(result);
    } catch (error) {
      logger.error('Failed to update bus route', { tenantId, routeId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// DELETE /tenants/:tenantId/bus/routes/:routeId
// Delete a bus route (and cascade to stops and timetables)
// ==================================================================================
router.delete(
  '/tenants/:tenantId/bus/routes/:routeId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, routeId } = req.params;

    try {
      // Check if route has active timetables
      const activeTimetables = await query(
        `SELECT timetable_id FROM section22_timetables
         WHERE route_id = $1 AND status = 'active'`,
        [routeId]
      );

      if (activeTimetables.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete route with active timetables. Cancel timetables first.'
        });
      }

      const result = await queryOne(
        `DELETE FROM section22_bus_routes
         WHERE tenant_id = $1 AND route_id = $2
         RETURNING route_id, route_number, route_name`,
        [tenantId, routeId]
      );

      if (!result) {
        return res.status(404).json({ error: 'Route not found' });
      }

      logger.info('Bus route deleted', {
        tenantId,
        routeId,
        routeNumber: result.route_number,
        userId: req.user?.userId
      });

      return res.json({
        message: 'Route deleted successfully',
        route: result
      });
    } catch (error) {
      logger.error('Failed to delete bus route', { tenantId, routeId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// POST /tenants/:tenantId/bus/routes/:routeId/stops
// Add a stop to a route
// ==================================================================================
router.post(
  '/tenants/:tenantId/bus/routes/:routeId/stops',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, routeId } = req.params;
    const {
      stop_sequence,
      stop_name,
      stop_address,
      latitude,
      longitude,
      arrival_offset_minutes,
      departure_offset_minutes,
      dwell_time_minutes,
      is_timing_point,
      is_pickup_point,
      is_setdown_point,
      accessibility_features
    } = req.body;

    // Validation
    if (!stop_sequence || !stop_name) {
      return res.status(400).json({
        error: 'Missing required fields: stop_sequence, stop_name'
      });
    }

    try {
      // Verify route exists
      const route = await queryOne(
        `SELECT route_id FROM section22_bus_routes
         WHERE tenant_id = $1 AND route_id = $2`,
        [tenantId, routeId]
      );

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      // Check for duplicate stop sequence
      const existing = await queryOne(
        `SELECT stop_id FROM section22_route_stops
         WHERE route_id = $1 AND stop_sequence = $2`,
        [routeId, stop_sequence]
      );

      if (existing) {
        return res.status(409).json({
          error: `Stop sequence ${stop_sequence} already exists for this route`
        });
      }

      const result = await queryOne(
        `INSERT INTO section22_route_stops (
          route_id,
          tenant_id,
          stop_sequence,
          stop_name,
          stop_address,
          latitude,
          longitude,
          arrival_offset_minutes,
          departure_offset_minutes,
          dwell_time_minutes,
          is_timing_point,
          is_pickup_point,
          is_setdown_point,
          accessibility_features
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          routeId,
          tenantId,
          stop_sequence,
          stop_name,
          stop_address,
          latitude,
          longitude,
          arrival_offset_minutes,
          departure_offset_minutes,
          dwell_time_minutes || 2,
          is_timing_point || false,
          is_pickup_point !== false, // Default true
          is_setdown_point !== false, // Default true
          accessibility_features
        ]
      );

      logger.info('Route stop added', {
        tenantId,
        routeId,
        stopId: result.stop_id,
        stopSequence: stop_sequence,
        userId: req.user?.userId
      });

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to add route stop', { tenantId, routeId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// PUT /tenants/:tenantId/bus/routes/:routeId/stops/:stopId
// Update a route stop
// ==================================================================================
router.put(
  '/tenants/:tenantId/bus/routes/:routeId/stops/:stopId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, routeId, stopId } = req.params;
    const updateData = req.body;

    try {
      const result = await queryOne(
        `UPDATE section22_route_stops
         SET stop_sequence = COALESCE($4, stop_sequence),
             stop_name = COALESCE($5, stop_name),
             stop_address = COALESCE($6, stop_address),
             latitude = COALESCE($7, latitude),
             longitude = COALESCE($8, longitude),
             arrival_offset_minutes = COALESCE($9, arrival_offset_minutes),
             departure_offset_minutes = COALESCE($10, departure_offset_minutes),
             dwell_time_minutes = COALESCE($11, dwell_time_minutes),
             is_timing_point = COALESCE($12, is_timing_point),
             is_pickup_point = COALESCE($13, is_pickup_point),
             is_setdown_point = COALESCE($14, is_setdown_point),
             accessibility_features = COALESCE($15, accessibility_features)
         WHERE tenant_id = $1 AND route_id = $2 AND stop_id = $3
         RETURNING *`,
        [
          tenantId,
          routeId,
          stopId,
          updateData.stop_sequence,
          updateData.stop_name,
          updateData.stop_address,
          updateData.latitude,
          updateData.longitude,
          updateData.arrival_offset_minutes,
          updateData.departure_offset_minutes,
          updateData.dwell_time_minutes,
          updateData.is_timing_point,
          updateData.is_pickup_point,
          updateData.is_setdown_point,
          updateData.accessibility_features
        ]
      );

      if (!result) {
        return res.status(404).json({ error: 'Stop not found' });
      }

      logger.info('Route stop updated', { tenantId, routeId, stopId, userId: req.user?.userId });

      return res.json(result);
    } catch (error) {
      logger.error('Failed to update route stop', { tenantId, routeId, stopId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================================================================================
// DELETE /tenants/:tenantId/bus/routes/:routeId/stops/:stopId
// Delete a route stop
// ==================================================================================
router.delete(
  '/tenants/:tenantId/bus/routes/:routeId/stops/:stopId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, routeId, stopId } = req.params;

    try {
      const result = await queryOne(
        `DELETE FROM section22_route_stops
         WHERE tenant_id = $1 AND route_id = $2 AND stop_id = $3
         RETURNING stop_id, stop_sequence, stop_name`,
        [tenantId, routeId, stopId]
      );

      if (!result) {
        return res.status(404).json({ error: 'Stop not found' });
      }

      logger.info('Route stop deleted', {
        tenantId,
        routeId,
        stopId,
        stopSequence: result.stop_sequence,
        userId: req.user?.userId
      });

      return res.json({
        message: 'Stop deleted successfully',
        stop: result
      });
    } catch (error) {
      logger.error('Failed to delete route stop', { tenantId, routeId, stopId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
