import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { CreateVehicleDto, UpdateVehicleDto, Vehicle } from '../types/vehicle.types';

const router: Router = express.Router();

/**
 * Vehicle Routes
 *
 * Complete vehicle management system with driver assignment
 * Database Table: tenant_vehicles
 */

/**
 * @route GET /api/tenants/:tenantId/vehicles
 * @desc Get all vehicles for tenant
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { driver_id, ownership } = req.query;

    logger.info('Fetching vehicles', { tenantId, driver_id, ownership });

    // Build WHERE clause
    const conditions: string[] = ['v.tenant_id = $1', 'v.is_active = true'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (driver_id) {
      conditions.push(`v.driver_id = $${paramIndex}`);
      params.push(driver_id);
      paramIndex++;
    }

    if (ownership) {
      conditions.push(`v.ownership = $${paramIndex}`);
      params.push(ownership);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const vehicles = await query<Vehicle>(`
      SELECT
        v.vehicle_id,
        v.tenant_id,
        v.registration,
        v.make,
        v.model,
        v.year,
        v.vehicle_type,
        v.seats,
        v.fuel_type,
        v.mileage,
        v.ownership,
        v.driver_id,
        v.mot_date,
        v.insurance_expiry,
        v.last_service_date,
        v.service_interval_months,
        v.lease_monthly_cost,
        v.insurance_monthly_cost,
        v.wheelchair_accessible,
        v.is_basic_record,
        v.is_active,
        v.created_at,
        v.updated_at,
        d.name as assigned_driver_name,
        d.phone as driver_phone
      FROM tenant_vehicles v
      LEFT JOIN tenant_drivers d ON v.driver_id = d.driver_id AND v.tenant_id = d.tenant_id
      WHERE ${whereClause}
      ORDER BY v.ownership, v.make, v.model, v.created_at DESC
    `, params);

    res.json(vehicles);
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/:vehicleId
 * @desc Get specific vehicle
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/:vehicleId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;

    logger.info('Fetching vehicle', { tenantId, vehicleId });

    const vehicle = await queryOne<Vehicle>(`
      SELECT
        v.*,
        d.name as assigned_driver_name,
        d.phone as driver_phone
      FROM tenant_vehicles v
      LEFT JOIN tenant_drivers d ON v.driver_id = d.driver_id AND v.tenant_id = d.tenant_id
      WHERE v.tenant_id = $1 AND v.vehicle_id = $2 AND v.is_active = true
    `, [tenantId, vehicleId]);

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    res.json(vehicle);
    return;
  })
);

/**
 * @route POST /api/tenants/:tenantId/vehicles
 * @desc Create new vehicle
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/vehicles',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const vehicleData: CreateVehicleDto = req.body;

    logger.info('Creating vehicle', { tenantId, vehicleData });

    // Validate required fields
    if (!vehicleData.make || !vehicleData.model || !vehicleData.year || !vehicleData.registration) {
      throw new ValidationError('Missing required fields: make, model, year, registration');
    }

    // Check for duplicate registration
    const registration = vehicleData.registration.toUpperCase().trim();
    const existing = await query<{ vehicle_id: number }>(`
      SELECT vehicle_id FROM tenant_vehicles
      WHERE tenant_id = $1 AND registration = $2 AND is_active = true
    `, [tenantId, registration]);

    if (existing.length > 0) {
      res.status(409).json({
        error: 'Vehicle with this registration already exists',
        registration
      });
      return;
    }

    // Validate driver if assigned
    const driverId = vehicleData.driver_id;
    if (driverId) {
      const driver = await queryOne<{ driver_id: number; name: string }>(`
        SELECT driver_id, name FROM tenant_drivers
        WHERE tenant_id = $1 AND driver_id = $2 AND is_active = true
      `, [tenantId, driverId]);

      if (!driver) {
        throw new ValidationError('Assigned driver not found');
      }

      // Check for company vehicle conflicts
      const ownership = vehicleData.ownership || 'personal';
      if (ownership === 'owned' || ownership === 'leased') {
        const conflict = await query<{ vehicle_id: number; make: string; model: string; registration: string }>(`
          SELECT vehicle_id, make, model, registration
          FROM tenant_vehicles
          WHERE tenant_id = $1 AND driver_id = $2
            AND ownership IN ('owned', 'leased')
            AND is_active = true
        `, [tenantId, driverId]);

        if (conflict.length > 0) {
          const existing = conflict[0];
          res.status(409).json({
            error: 'Driver already assigned to another company vehicle',
            existingVehicle: `${existing.make} ${existing.model} (${existing.registration})`
          });
          return;
        }
      }

      // If creating personal vehicle, unassign existing company vehicles
      if (ownership === 'personal') {
        await query(`
          UPDATE tenant_vehicles
          SET driver_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = $1 AND driver_id = $2
            AND ownership IN ('owned', 'leased')
            AND is_active = true
        `, [tenantId, driverId]);
      }
    }

    // Insert new vehicle
    const result = await query<{ vehicle_id: number; registration: string }>(`
      INSERT INTO tenant_vehicles (
        tenant_id, registration, make, model, year, vehicle_type, seats, fuel_type,
        mileage, ownership, driver_id, mot_date, insurance_expiry, last_service_date,
        service_interval_months, lease_monthly_cost, insurance_monthly_cost,
        wheelchair_accessible, is_basic_record, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING vehicle_id, registration
    `, [
      tenantId,
      registration,
      vehicleData.make.trim(),
      vehicleData.model.trim(),
      vehicleData.year || new Date().getFullYear(),
      vehicleData.vehicle_type || 'Car',
      vehicleData.seats || 5,
      vehicleData.fuel_type || 'Petrol',
      vehicleData.mileage || 0,
      vehicleData.ownership || 'personal',
      driverId || null,
      vehicleData.mot_date || null,
      vehicleData.insurance_expiry || null,
      vehicleData.last_service_date || null,
      vehicleData.service_interval_months || 12,
      vehicleData.lease_monthly_cost || 0,
      vehicleData.insurance_monthly_cost || 0,
      vehicleData.wheelchair_accessible || false,
      vehicleData.is_basic_record || false,
      true // is_active
    ]);

    const newVehicle = result[0];
    logger.info('Vehicle created', { vehicleId: newVehicle.vehicle_id, tenantId });

    res.status(201).json({
      vehicle_id: newVehicle.vehicle_id,
      registration: newVehicle.registration,
      message: 'Vehicle created successfully'
    });
    return;
  })
);

/**
 * @route PUT /api/tenants/:tenantId/vehicles/:vehicleId
 * @desc Update vehicle
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/vehicles/:vehicleId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;
    const updateData: UpdateVehicleDto = req.body;

    logger.info('Updating vehicle', { tenantId, vehicleId, updateData });

    // Verify vehicle exists
    const currentVehicle = await queryOne<Vehicle>(`
      SELECT * FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
    `, [tenantId, vehicleId]);

    if (!currentVehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // SPECIAL CASE: Simple driver assignment/unassignment
    if (updateData.hasOwnProperty('driver_id') && Object.keys(updateData).length === 1) {
      // Validate driver exists if assigning
      if (updateData.driver_id !== null) {
        const driver = await queryOne<{ driver_id: number; name: string }>(`
          SELECT driver_id, name FROM tenant_drivers
          WHERE tenant_id = $1 AND driver_id = $2 AND is_active = true
        `, [tenantId, updateData.driver_id]);

        if (!driver) {
          throw new ValidationError('Driver not found');
        }

        // Check for company vehicle conflicts
        if (currentVehicle.ownership === 'owned' || currentVehicle.ownership === 'leased') {
          const conflict = await query<{ vehicle_id: number; make: string; model: string; registration: string }>(`
            SELECT vehicle_id, make, model, registration
            FROM tenant_vehicles
            WHERE tenant_id = $1 AND driver_id = $2
              AND ownership IN ('owned', 'leased')
              AND vehicle_id != $3
              AND is_active = true
          `, [tenantId, updateData.driver_id, vehicleId]);

          if (conflict.length > 0) {
            const existing = conflict[0];
            res.status(409).json({
              error: 'Driver already assigned to another company vehicle',
              conflictingVehicle: `${existing.make} ${existing.model} (${existing.registration})`
            });
            return;
          }
        }
      }

      // Perform simple assignment update
      await query(`
        UPDATE tenant_vehicles
        SET driver_id = $3, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND vehicle_id = $2
      `, [tenantId, vehicleId, updateData.driver_id]);

      res.json({
        vehicle_id: parseInt(vehicleId),
        driver_id: updateData.driver_id,
        message: updateData.driver_id ? 'Vehicle assigned successfully' : 'Vehicle unassigned successfully',
        updatedFields: ['driver_id']
      });
      return;
    }

    // COMPLEX UPDATE: Multiple fields
    // Build dynamic UPDATE SET clause
    const setClauses: string[] = [];
    const params: any[] = [tenantId, vehicleId];
    let paramIndex = 3;

    // Map updateData fields to database columns
    const fieldMappings: Record<string, string> = {
      registration: 'registration',
      make: 'make',
      model: 'model',
      year: 'year',
      vehicle_type: 'vehicle_type',
      seats: 'seats',
      fuel_type: 'fuel_type',
      mileage: 'mileage',
      ownership: 'ownership',
      driver_id: 'driver_id',
      mot_date: 'mot_date',
      insurance_expiry: 'insurance_expiry',
      last_service_date: 'last_service_date',
      service_interval_months: 'service_interval_months',
      lease_monthly_cost: 'lease_monthly_cost',
      insurance_monthly_cost: 'insurance_monthly_cost',
      wheelchair_accessible: 'wheelchair_accessible'
    };

    for (const [key, dbColumn] of Object.entries(fieldMappings)) {
      if (updateData.hasOwnProperty(key as keyof UpdateVehicleDto)) {
        let value = updateData[key as keyof UpdateVehicleDto];

        // Special handling for registration
        if (key === 'registration' && typeof value === 'string') {
          value = value.toUpperCase().trim();

          // Check for duplicate registration
          const duplicate = await query<{ vehicle_id: number }>(`
            SELECT vehicle_id FROM tenant_vehicles
            WHERE tenant_id = $1 AND registration = $2
              AND vehicle_id != $3
              AND is_active = true
          `, [tenantId, value, vehicleId]);

          if (duplicate.length > 0) {
            res.status(409).json({
              error: 'Vehicle with this registration already exists',
              registration: value
            });
            return;
          }
        }

        setClauses.push(`${dbColumn} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    // Add updated_at
    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    // Execute update
    const result = await query<Vehicle>(`
      UPDATE tenant_vehicles
      SET ${setClauses.join(', ')}
      WHERE tenant_id = $1 AND vehicle_id = $2
      RETURNING vehicle_id, make, model, registration, driver_id, ownership
    `, params);

    const updated = result[0];
    logger.info('Vehicle updated', { vehicleId, tenantId });

    res.json({
      vehicle_id: parseInt(vehicleId),
      message: 'Vehicle updated successfully',
      updatedFields: Object.keys(updateData),
      vehicle: {
        make: updated.make,
        model: updated.model,
        registration: updated.registration,
        driver_id: updated.driver_id,
        ownership: updated.ownership
      }
    });
    return;
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/vehicles/:vehicleId
 * @desc Delete vehicle (hard delete)
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/vehicles/:vehicleId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;

    logger.info('Deleting vehicle', { tenantId, vehicleId });

    // Verify vehicle exists
    const existing = await queryOne<{ ownership: string; make: string; model: string; registration: string }>(`
      SELECT ownership, make, model, registration
      FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
    `, [tenantId, vehicleId]);

    if (!existing) {
      throw new NotFoundError('Vehicle not found');
    }

    // Perform hard delete
    const result = await query<{ vehicle_id: number; make: string; model: string; registration: string; ownership: string }>(`
      DELETE FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2
      RETURNING vehicle_id, make, model, registration, ownership
    `, [tenantId, vehicleId]);

    const deleted = result[0];
    logger.info('Vehicle deleted', { vehicleId: deleted.vehicle_id, tenantId });

    res.json({
      message: 'Vehicle deleted successfully',
      vehicle: {
        id: deleted.vehicle_id,
        description: `${deleted.make} ${deleted.model} (${deleted.registration})`,
        ownership: deleted.ownership
      }
    });
    return;
  })
);

/**
 * @route POST /api/tenants/:tenantId/vehicles/sync-drivers
 * @desc Sync vehicle assignments with drivers
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/vehicles/sync-drivers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Syncing vehicles with drivers', { tenantId });

    // Update valid assignments
    await query(`
      UPDATE tenant_vehicles v
      SET updated_at = CURRENT_TIMESTAMP
      FROM tenant_drivers d
      WHERE v.tenant_id = $1
        AND v.driver_id = d.driver_id
        AND v.tenant_id = d.tenant_id
        AND v.is_active = true
        AND d.is_active = true
    `, [tenantId]);

    // Handle orphaned vehicles (driver no longer exists)
    const orphaned = await query<{ vehicle_id: number; make: string; model: string; registration: string }>(`
      UPDATE tenant_vehicles
      SET driver_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1
        AND driver_id IS NOT NULL
        AND is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM tenant_drivers d
          WHERE d.tenant_id = tenant_vehicles.tenant_id
            AND d.driver_id = tenant_vehicles.driver_id
            AND d.is_active = true
        )
      RETURNING vehicle_id, make, model, registration
    `, [tenantId]);

    res.json({
      message: 'Sync completed successfully',
      orphanedCount: orphaned.length,
      orphanedVehicles: orphaned.map(v => ({
        id: v.vehicle_id,
        description: `${v.make} ${v.model} (${v.registration})`
      }))
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/maintenance-alerts
 * @desc Get maintenance alerts for vehicles
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/maintenance-alerts',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const days = parseInt((req.query.days as string) || '30');

    logger.info('Fetching maintenance alerts', { tenantId, days });

    const alerts = await query(`
      SELECT
        vehicle_id,
        registration,
        make,
        model,
        ownership,
        mot_date,
        insurance_expiry,
        last_service_date,
        service_interval_months,
        CASE
          WHEN mot_date < CURRENT_DATE THEN 'MOT Expired'
          WHEN mot_date <= CURRENT_DATE + INTERVAL '${days} days' THEN 'MOT Due'
          ELSE NULL
        END as mot_alert,
        CASE
          WHEN insurance_expiry < CURRENT_DATE THEN 'Insurance Expired'
          WHEN insurance_expiry <= CURRENT_DATE + INTERVAL '${days} days' THEN 'Insurance Due'
          ELSE NULL
        END as insurance_alert,
        CASE
          WHEN last_service_date IS NOT NULL AND service_interval_months > 0 THEN
            CASE
              WHEN last_service_date + (service_interval_months || ' months')::INTERVAL < CURRENT_DATE THEN 'Service Overdue'
              WHEN last_service_date + (service_interval_months || ' months')::INTERVAL <= CURRENT_DATE + INTERVAL '${days} days' THEN 'Service Due'
              ELSE NULL
            END
          ELSE NULL
        END as service_alert
      FROM tenant_vehicles
      WHERE tenant_id = $1
        AND is_active = true
        AND is_basic_record = false
        AND (
          mot_date <= CURRENT_DATE + INTERVAL '${days} days'
          OR insurance_expiry <= CURRENT_DATE + INTERVAL '${days} days'
          OR (last_service_date + (service_interval_months || ' months')::INTERVAL) <= CURRENT_DATE + INTERVAL '${days} days'
        )
      ORDER BY
        LEAST(
          COALESCE(mot_date, CURRENT_DATE + INTERVAL '1000 days'),
          COALESCE(insurance_expiry, CURRENT_DATE + INTERVAL '1000 days'),
          COALESCE(last_service_date + (service_interval_months || ' months')::INTERVAL, CURRENT_DATE + INTERVAL '1000 days')
        )
    `, [tenantId]);

    res.json(alerts);
    return;
  })
);

/**
 * @route PUT /api/tenants/:tenantId/vehicles/:vehicleId/assign
 * @desc Quick driver assignment endpoint
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/vehicles/:vehicleId/assign',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;
    const { driver_id } = req.body;

    logger.info('Assigning driver to vehicle', { tenantId, vehicleId, driver_id });

    // Verify vehicle exists
    const vehicle = await queryOne<Vehicle>(`
      SELECT * FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
    `, [tenantId, vehicleId]);

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Validate driver if not null
    if (driver_id !== null) {
      const driver = await queryOne<{ driver_id: number }>(`
        SELECT driver_id FROM tenant_drivers
        WHERE tenant_id = $1 AND driver_id = $2 AND is_active = true
      `, [tenantId, driver_id]);

      if (!driver) {
        throw new ValidationError('Driver not found');
      }
    }

    // Update assignment
    await query(`
      UPDATE tenant_vehicles
      SET driver_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND vehicle_id = $2
    `, [tenantId, vehicleId, driver_id]);

    res.json({
      vehicle_id: parseInt(vehicleId),
      driver_id,
      message: driver_id ? 'Driver assigned successfully' : 'Driver unassigned successfully'
    });
    return;
  })
);

/**
 * ========================================
 * VEHICLE INCIDENTS ROUTES
 * ========================================
 */

/**
 * @route GET /api/tenants/:tenantId/vehicles/incidents
 * @desc Get all incidents for tenant (optionally filtered by vehicle)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/incidents',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { vehicle_id, status, incident_type, severity, page = '1', limit = '50' } = req.query;

    logger.info('Fetching vehicle incidents', { tenantId, vehicle_id, status, incident_type });

    // Build WHERE clause
    const conditions: string[] = ['i.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (vehicle_id) {
      conditions.push(`i.vehicle_id = $${paramIndex}`);
      params.push(vehicle_id);
      paramIndex++;
    }

    if (status) {
      conditions.push(`i.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (incident_type) {
      conditions.push(`i.incident_type = $${paramIndex}`);
      params.push(incident_type);
      paramIndex++;
    }

    if (severity) {
      conditions.push(`i.severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count
      FROM tenant_vehicle_incidents i
      WHERE ${whereClause}
    `, params);

    const totalCount = parseInt(countResult?.count || '0');

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Fetch incidents
    const incidents = await query(`
      SELECT
        i.*,
        v.registration,
        v.make,
        v.model,
        d.name as driver_name
      FROM tenant_vehicle_incidents i
      LEFT JOIN tenant_vehicles v ON i.vehicle_id = v.vehicle_id
      LEFT JOIN tenant_drivers d ON i.driver_id = d.driver_id
      WHERE ${whereClause}
      ORDER BY i.incident_date DESC, i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limitNum, offset]);

    res.json({
      incidents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/:vehicleId/incidents
 * @desc Get incidents for specific vehicle
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/:vehicleId/incidents',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;

    logger.info('Fetching incidents for vehicle', { tenantId, vehicleId });

    const incidents = await query(`
      SELECT
        i.*,
        v.registration,
        v.make,
        v.model,
        d.name as driver_name
      FROM tenant_vehicle_incidents i
      LEFT JOIN tenant_vehicles v ON i.vehicle_id = v.vehicle_id
      LEFT JOIN tenant_drivers d ON i.driver_id = d.driver_id
      WHERE i.tenant_id = $1 AND i.vehicle_id = $2
      ORDER BY i.incident_date DESC, i.created_at DESC
    `, [tenantId, vehicleId]);

    res.json(incidents);
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/incidents/:incidentId
 * @desc Get specific incident
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/incidents/:incidentId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, incidentId } = req.params;

    logger.info('Fetching incident', { tenantId, incidentId });

    const incident = await queryOne(`
      SELECT
        i.*,
        v.registration,
        v.make,
        v.model,
        d.name as driver_name,
        d.phone as driver_phone
      FROM tenant_vehicle_incidents i
      LEFT JOIN tenant_vehicles v ON i.vehicle_id = v.vehicle_id
      LEFT JOIN tenant_drivers d ON i.driver_id = d.driver_id
      WHERE i.tenant_id = $1 AND i.incident_id = $2
    `, [tenantId, incidentId]);

    if (!incident) {
      throw new NotFoundError('Incident not found');
    }

    res.json(incident);
    return;
  })
);

/**
 * @route POST /api/tenants/:tenantId/vehicles/incidents
 * @desc Create new incident
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/vehicles/incidents',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const incidentData = req.body;

    logger.info('Creating vehicle incident', { tenantId, incidentData });

    // Validate required fields
    if (!incidentData.vehicle_id || !incidentData.incident_type || !incidentData.incident_date || !incidentData.description) {
      throw new ValidationError('Missing required fields: vehicle_id, incident_type, incident_date, description');
    }

    // Verify vehicle exists
    const vehicle = await queryOne<{ vehicle_id: number }>(`
      SELECT vehicle_id FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
    `, [tenantId, incidentData.vehicle_id]);

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Create incident
    const result = await queryOne<{ incident_id: number }>(`
      INSERT INTO tenant_vehicle_incidents (
        tenant_id, vehicle_id, driver_id, incident_type, incident_date,
        location, description, severity, injuries_occurred, injury_details,
        vehicle_driveable, estimated_cost, damage_description,
        third_party_involved, third_party_name, third_party_contact,
        third_party_vehicle_reg, third_party_insurance,
        police_notified, police_reference,
        witnesses, reported_by, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
      RETURNING incident_id
    `, [
      tenantId,
      incidentData.vehicle_id,
      incidentData.driver_id || null,
      incidentData.incident_type,
      incidentData.incident_date,
      incidentData.location || null,
      incidentData.description,
      incidentData.severity || 'moderate',
      incidentData.injuries_occurred || false,
      incidentData.injury_details || null,
      incidentData.vehicle_driveable !== undefined ? incidentData.vehicle_driveable : true,
      incidentData.estimated_cost || null,
      incidentData.damage_description || null,
      incidentData.third_party_involved || false,
      incidentData.third_party_name || null,
      incidentData.third_party_contact || null,
      incidentData.third_party_vehicle_reg || null,
      incidentData.third_party_insurance || null,
      incidentData.police_notified || false,
      incidentData.police_reference || null,
      incidentData.witnesses || null,
      incidentData.reported_by || null,
      incidentData.created_by || null
    ]);

    res.status(201).json({
      incident_id: result?.incident_id,
      message: 'Incident created successfully'
    });
    return;
  })
);

/**
 * @route PUT /api/tenants/:tenantId/vehicles/incidents/:incidentId
 * @desc Update incident
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/vehicles/incidents/:incidentId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, incidentId } = req.params;
    const updates = req.body;

    logger.info('Updating incident', { tenantId, incidentId, updates });

    // Verify incident exists
    const incident = await queryOne<{ incident_id: number }>(`
      SELECT incident_id FROM tenant_vehicle_incidents
      WHERE tenant_id = $1 AND incident_id = $2
    `, [tenantId, incidentId]);

    if (!incident) {
      throw new NotFoundError('Incident not found');
    }

    // Build dynamic UPDATE query
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'incident_type', 'incident_date', 'location', 'description', 'severity',
      'injuries_occurred', 'injury_details', 'vehicle_driveable',
      'estimated_cost', 'actual_cost', 'damage_description',
      'third_party_involved', 'third_party_name', 'third_party_contact',
      'third_party_vehicle_reg', 'third_party_insurance',
      'insurance_claim_number', 'insurance_notified_date', 'claim_status',
      'police_notified', 'police_reference', 'status',
      'resolution_notes', 'resolved_date', 'resolved_by',
      'actions_required', 'preventive_measures',
      'vehicle_repair_required', 'repair_status',
      'witnesses', 'driver_id'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        params.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    params.push(tenantId, incidentId);

    await query(`
      UPDATE tenant_vehicle_incidents
      SET ${updateFields.join(', ')}
      WHERE tenant_id = $${paramIndex} AND incident_id = $${paramIndex + 1}
    `, params);

    res.json({ message: 'Incident updated successfully' });
    return;
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/vehicles/incidents/:incidentId
 * @desc Delete incident
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/vehicles/incidents/:incidentId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, incidentId } = req.params;

    logger.info('Deleting incident', { tenantId, incidentId });

    const result = await query(`
      DELETE FROM tenant_vehicle_incidents
      WHERE tenant_id = $1 AND incident_id = $2
      RETURNING incident_id
    `, [tenantId, incidentId]);

    if (result.length === 0) {
      throw new NotFoundError('Incident not found');
    }

    res.json({ message: 'Incident deleted successfully' });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/incidents/stats
 * @desc Get incident statistics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/incidents/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching incident statistics', { tenantId });

    const stats = await queryOne(`
      SELECT
        COUNT(*)::int as total_incidents,
        COUNT(CASE WHEN status = 'reported' THEN 1 END)::int as reported_count,
        COUNT(CASE WHEN status = 'under_investigation' THEN 1 END)::int as investigating_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int as resolved_count,
        COUNT(CASE WHEN status = 'closed' THEN 1 END)::int as closed_count,
        COUNT(CASE WHEN incident_type = 'accident' THEN 1 END)::int as accidents,
        COUNT(CASE WHEN incident_type = 'damage' THEN 1 END)::int as damages,
        COUNT(CASE WHEN incident_type = 'near_miss' THEN 1 END)::int as near_misses,
        COUNT(CASE WHEN incident_type = 'breakdown' THEN 1 END)::int as breakdowns,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END)::int as critical_count,
        COUNT(CASE WHEN severity = 'serious' THEN 1 END)::int as serious_count,
        COUNT(CASE WHEN injuries_occurred = true THEN 1 END)::int as injuries_count,
        COUNT(CASE WHEN third_party_involved = true THEN 1 END)::int as third_party_count,
        COALESCE(SUM(estimated_cost), 0)::decimal as total_estimated_cost,
        COALESCE(SUM(actual_cost), 0)::decimal as total_actual_cost
      FROM tenant_vehicle_incidents
      WHERE tenant_id = $1
    `, [tenantId]);

    res.json(stats || {
      total_incidents: 0,
      reported_count: 0,
      investigating_count: 0,
      resolved_count: 0,
      closed_count: 0,
      accidents: 0,
      damages: 0,
      near_misses: 0,
      breakdowns: 0,
      critical_count: 0,
      serious_count: 0,
      injuries_count: 0,
      third_party_count: 0,
      total_estimated_cost: 0,
      total_actual_cost: 0
    });
    return;
  })
);

export default router;
