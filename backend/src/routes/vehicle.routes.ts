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
    const { driver_id, ownership, archived } = req.query;

    logger.info('Fetching vehicles', { tenantId, driver_id, ownership, archived });

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

    // Handle archived filter: 'true' = only archived, 'false' = only not archived, undefined/null = all
    if (archived === 'true') {
      conditions.push('v.archived = true');
    } else if (archived === 'false') {
      conditions.push('v.archived = false');
    }
    // If archived is not specified, return both archived and non-archived vehicles

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
 * @desc Delete vehicle (soft delete)
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/vehicles/:vehicleId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;

    logger.info('Soft deleting vehicle', { tenantId, vehicleId });

    // Verify vehicle exists and is active
    const existing = await queryOne<{ ownership: string; make: string; model: string; registration: string }>(`
      SELECT ownership, make, model, registration
      FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
    `, [tenantId, vehicleId]);

    if (!existing) {
      throw new NotFoundError('Vehicle not found');
    }

    // Perform soft delete by setting is_active = false
    const result = await query<{ vehicle_id: number; make: string; model: string; registration: string; ownership: string }>(`
      UPDATE tenant_vehicles
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND vehicle_id = $2
      RETURNING vehicle_id, make, model, registration, ownership
    `, [tenantId, vehicleId]);

    const deleted = result[0];
    logger.info('Vehicle soft deleted', { vehicleId: deleted.vehicle_id, tenantId });

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
 * ENHANCED FLEET STATISTICS & UTILIZATION
 * ========================================
 */

/**
 * @route GET /api/tenants/:tenantId/vehicles/enhanced-stats
 * @desc Get comprehensive fleet statistics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/enhanced-stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching enhanced vehicle stats', { tenantId });

    // Get all active vehicles with driver info
    const vehicles = await query<any>(`
      SELECT
        v.vehicle_id,
        v.ownership,
        v.year,
        v.wheelchair_accessible,
        v.driver_id,
        v.mileage,
        v.lease_monthly_cost,
        v.insurance_monthly_cost,
        v.archived
      FROM tenant_vehicles v
      WHERE v.tenant_id = $1 AND v.is_active = true
    `, [tenantId]);

    // Get trip statistics per vehicle
    const tripStats = await query<any>(`
      SELECT
        vehicle_id,
        COUNT(*) as trip_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_revenue
      FROM tenant_trips
      WHERE tenant_id = $1
      GROUP BY vehicle_id
    `, [tenantId]);

    // Get maintenance costs per vehicle
    const maintenanceCosts = await query<any>(`
      SELECT
        vehicle_id,
        COALESCE(SUM(cost), 0) as total_maintenance_cost,
        COUNT(*) as maintenance_count
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND completed = true
      GROUP BY vehicle_id
    `, [tenantId]);

    // Calculate fleet composition
    const composition = {
      owned: 0,
      leased: 0,
      personal: 0,
      total: vehicles.length
    };

    const utilization = {
      assigned: 0,
      unassigned: 0,
      wheelchairAccessible: 0
    };

    const financial = {
      totalMonthlyLease: 0,
      totalMonthlyInsurance: 0,
      totalMileage: 0,
      averageAge: 0
    };

    const currentYear = new Date().getFullYear();
    let totalAge = 0;

    vehicles.forEach((vehicle: any) => {
      // Composition
      if (vehicle.ownership === 'owned') composition.owned++;
      else if (vehicle.ownership === 'leased') composition.leased++;
      else composition.personal++;

      // Utilization
      if (vehicle.driver_id) utilization.assigned++;
      else utilization.unassigned++;

      if (vehicle.wheelchair_accessible) utilization.wheelchairAccessible++;

      // Financial
      financial.totalMonthlyLease += parseFloat(vehicle.lease_monthly_cost || '0');
      financial.totalMonthlyInsurance += parseFloat(vehicle.insurance_monthly_cost || '0');
      financial.totalMileage += parseInt(vehicle.mileage || '0', 10);

      // Age calculation
      if (vehicle.year) {
        totalAge += currentYear - vehicle.year;
      }
    });

    financial.averageAge = vehicles.length > 0 ? parseFloat((totalAge / vehicles.length).toFixed(1)) : 0;

    // Trip statistics
    const tripStatsMap = new Map();
    tripStats.forEach((stat: any) => {
      tripStatsMap.set(stat.vehicle_id, stat);
    });

    const maintenanceMap = new Map();
    maintenanceCosts.forEach((cost: any) => {
      maintenanceMap.set(cost.vehicle_id, cost);
    });

    let totalTrips = 0;
    let totalRevenue = 0;
    let totalMaintenanceCost = 0;

    tripStats.forEach((stat: any) => {
      totalTrips += parseInt(stat.trip_count || '0', 10);
      totalRevenue += parseFloat(stat.total_revenue || '0');
    });

    maintenanceCosts.forEach((cost: any) => {
      totalMaintenanceCost += parseFloat(cost.total_maintenance_cost || '0');
    });

    // Calculate vehicle utilization data
    const vehicleUtilization = vehicles.map((v: any) => {
      const tripStat = tripStatsMap.get(v.vehicle_id);
      const maintenance = maintenanceMap.get(v.vehicle_id);

      return {
        vehicle_id: v.vehicle_id,
        trips: parseInt(tripStat?.trip_count || '0', 10),
        revenue: parseFloat(tripStat?.total_revenue || '0'),
        maintenanceCost: parseFloat(maintenance?.total_maintenance_cost || '0')
      };
    });

    // Sort by trips to find most/least used
    vehicleUtilization.sort((a, b) => b.trips - a.trips);

    res.json({
      summary: {
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter((v: any) => !v.archived).length,
        archivedVehicles: vehicles.filter((v: any) => v.archived).length
      },
      composition,
      utilization,
      financial: {
        totalMonthlyLease: financial.totalMonthlyLease.toFixed(2),
        totalMonthlyInsurance: financial.totalMonthlyInsurance.toFixed(2),
        totalMileage: financial.totalMileage,
        averageMileagePerVehicle: vehicles.length > 0 ? Math.round(financial.totalMileage / vehicles.length) : 0,
        averageAge: financial.averageAge
      },
      performance: {
        totalTrips,
        totalRevenue: totalRevenue.toFixed(2),
        totalMaintenanceCost: totalMaintenanceCost.toFixed(2),
        averageTripsPerVehicle: vehicles.length > 0 ? (totalTrips / vehicles.length).toFixed(1) : '0',
        averageRevenuePerVehicle: vehicles.length > 0 ? (totalRevenue / vehicles.length).toFixed(2) : '0.00',
        netRevenue: (totalRevenue - totalMaintenanceCost).toFixed(2)
      },
      topPerformers: vehicleUtilization.slice(0, 5),
      underutilized: vehicleUtilization.slice(-5).reverse()
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/:vehicleId/utilization
 * @desc Get utilization metrics for specific vehicle
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/:vehicleId/utilization',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;

    logger.info('Fetching vehicle utilization', { tenantId, vehicleId });

    // Get vehicle details
    const vehicle = await queryOne<any>(`
      SELECT
        v.*,
        d.name as assigned_driver_name
      FROM tenant_vehicles v
      LEFT JOIN tenant_drivers d ON v.driver_id = d.driver_id AND v.tenant_id = d.tenant_id
      WHERE v.tenant_id = $1 AND v.vehicle_id = $2 AND v.is_active = true
    `, [tenantId, vehicleId]);

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Get trip statistics (all time, last 30 days, last 90 days)
    const tripStatsAll = await queryOne<any>(`
      SELECT
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_revenue,
        MIN(trip_date) as first_trip,
        MAX(trip_date) as last_trip
      FROM tenant_trips
      WHERE tenant_id = $1 AND vehicle_id = $2
    `, [tenantId, vehicleId]);

    const tripStats30 = await queryOne<any>(`
      SELECT
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_revenue
      FROM tenant_trips
      WHERE tenant_id = $1 AND vehicle_id = $2
        AND trip_date >= CURRENT_DATE - INTERVAL '30 days'
    `, [tenantId, vehicleId]);

    const tripStats90 = await queryOne<any>(`
      SELECT
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_revenue
      FROM tenant_trips
      WHERE tenant_id = $1 AND vehicle_id = $2
        AND trip_date >= CURRENT_DATE - INTERVAL '90 days'
    `, [tenantId, vehicleId]);

    // Get maintenance statistics
    const maintenanceStats = await queryOne<any>(`
      SELECT
        COUNT(*) as maintenance_count,
        COALESCE(SUM(cost), 0) as total_cost,
        MAX(maintenance_date) as last_maintenance
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND vehicle_id = $2 AND completed = true
    `, [tenantId, vehicleId]);

    // Get incident statistics
    const incidentStats = await queryOne<any>(`
      SELECT
        COUNT(*) as incident_count,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_incidents,
        MAX(incident_date) as last_incident
      FROM tenant_vehicle_incidents
      WHERE tenant_id = $1 AND vehicle_id = $2
    `, [tenantId, vehicleId]);

    // Calculate utilization metrics
    const totalTrips = parseInt(tripStatsAll?.total_trips || '0', 10);
    const completedTrips = parseInt(tripStatsAll?.completed_trips || '0', 10);
    const totalRevenue = parseFloat(tripStatsAll?.total_revenue || '0');
    const maintenanceCost = parseFloat(maintenanceStats?.total_cost || '0');

    // Calculate days in service
    const firstTrip = tripStatsAll?.first_trip ? new Date(tripStatsAll.first_trip) : null;
    const lastTrip = tripStatsAll?.last_trip ? new Date(tripStatsAll.last_trip) : null;
    const daysInService = firstTrip && lastTrip
      ? Math.ceil((lastTrip.getTime() - firstTrip.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;

    const utilizationRate = daysInService > 0 ? ((totalTrips / daysInService) * 100).toFixed(1) : '0.0';

    res.json({
      vehicle: {
        vehicle_id: vehicle.vehicle_id,
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        ownership: vehicle.ownership,
        mileage: vehicle.mileage,
        assigned_driver: vehicle.assigned_driver_name
      },
      utilization: {
        totalTrips,
        completedTrips,
        cancelledTrips: parseInt(tripStatsAll?.cancelled_trips || '0', 10),
        completionRate: totalTrips > 0 ? ((completedTrips / totalTrips) * 100).toFixed(1) : '0.0',
        daysInService,
        utilizationRate,
        tripsPerDay: daysInService > 0 ? (totalTrips / daysInService).toFixed(2) : '0.00'
      },
      financial: {
        totalRevenue: totalRevenue.toFixed(2),
        maintenanceCost: maintenanceCost.toFixed(2),
        netRevenue: (totalRevenue - maintenanceCost).toFixed(2),
        revenuePerTrip: totalTrips > 0 ? (totalRevenue / totalTrips).toFixed(2) : '0.00',
        costPerTrip: totalTrips > 0 ? (maintenanceCost / totalTrips).toFixed(2) : '0.00'
      },
      recentActivity: {
        last30Days: {
          trips: parseInt(tripStats30?.total_trips || '0', 10),
          completedTrips: parseInt(tripStats30?.completed_trips || '0', 10),
          revenue: parseFloat(tripStats30?.total_revenue || '0').toFixed(2)
        },
        last90Days: {
          trips: parseInt(tripStats90?.total_trips || '0', 10),
          completedTrips: parseInt(tripStats90?.completed_trips || '0', 10),
          revenue: parseFloat(tripStats90?.total_revenue || '0').toFixed(2)
        }
      },
      maintenance: {
        totalMaintenanceEvents: parseInt(maintenanceStats?.maintenance_count || '0', 10),
        totalCost: maintenanceCost.toFixed(2),
        lastMaintenance: maintenanceStats?.last_maintenance,
        averageCostPerEvent: parseInt(maintenanceStats?.maintenance_count || '0', 10) > 0
          ? (maintenanceCost / parseInt(maintenanceStats.maintenance_count)).toFixed(2)
          : '0.00'
      },
      incidents: {
        totalIncidents: parseInt(incidentStats?.incident_count || '0', 10),
        criticalIncidents: parseInt(incidentStats?.critical_incidents || '0', 10),
        lastIncident: incidentStats?.last_incident
      },
      performanceGrade: {
        utilizationGrade: parseFloat(utilizationRate) >= 75 ? 'Excellent' : parseFloat(utilizationRate) >= 50 ? 'Good' : parseFloat(utilizationRate) >= 25 ? 'Fair' : 'Poor',
        reliabilityGrade: parseInt(incidentStats?.incident_count || '0', 10) === 0 ? 'Excellent' : parseInt(incidentStats?.incident_count || '0', 10) <= 2 ? 'Good' : 'Needs Attention'
      }
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/fleet-utilization
 * @desc Get fleet-wide utilization report
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/fleet-utilization',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { sortBy = 'trips', sortOrder = 'desc', minTrips = '0' } = req.query;

    logger.info('Fetching fleet utilization', { tenantId, sortBy, sortOrder });

    // Get all vehicles with trip counts and revenue
    const vehicles = await query<any>(`
      SELECT
        v.vehicle_id,
        v.registration,
        v.make,
        v.model,
        v.year,
        v.ownership,
        v.driver_id,
        d.name as driver_name,
        COUNT(t.trip_id) as trip_count,
        COUNT(t.trip_id) FILTER (WHERE t.status = 'completed') as completed_trips,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END), 0) as revenue,
        MIN(t.trip_date) as first_trip,
        MAX(t.trip_date) as last_trip
      FROM tenant_vehicles v
      LEFT JOIN tenant_drivers d ON v.driver_id = d.driver_id AND v.tenant_id = d.tenant_id
      LEFT JOIN tenant_trips t ON v.vehicle_id = t.vehicle_id AND v.tenant_id = t.tenant_id
      WHERE v.tenant_id = $1 AND v.is_active = true AND v.archived = false
      GROUP BY v.vehicle_id, v.registration, v.make, v.model, v.year, v.ownership, v.driver_id, d.name
      HAVING COUNT(t.trip_id) >= $2
    `, [tenantId, parseInt(minTrips as string)]);

    // Calculate utilization metrics for each vehicle
    const now = new Date();
    const utilizationData = vehicles.map((vehicle: any) => {
      const tripCount = parseInt(vehicle.trip_count || '0', 10);
      const completedTrips = parseInt(vehicle.completed_trips || '0', 10);
      const revenue = parseFloat(vehicle.revenue || '0');

      const firstTrip = vehicle.first_trip ? new Date(vehicle.first_trip) : null;
      const lastTrip = vehicle.last_trip ? new Date(vehicle.last_trip) : null;

      let daysInService = 0;
      let daysSinceLastTrip = null;

      if (firstTrip && lastTrip) {
        daysInService = Math.ceil((lastTrip.getTime() - firstTrip.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        daysSinceLastTrip = Math.ceil((now.getTime() - lastTrip.getTime()) / (1000 * 60 * 60 * 24));
      }

      const utilizationRate = daysInService > 0 ? (tripCount / daysInService) * 100 : 0;

      let status = 'Active';
      if (tripCount === 0) status = 'Never Used';
      else if (daysSinceLastTrip && daysSinceLastTrip > 30) status = 'Idle';
      else if (utilizationRate < 25) status = 'Underutilized';
      else if (utilizationRate >= 75) status = 'Highly Utilized';

      return {
        vehicle_id: vehicle.vehicle_id,
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        ownership: vehicle.ownership,
        driver: vehicle.driver_name,
        isAssigned: !!vehicle.driver_id,
        trips: tripCount,
        completedTrips,
        revenue: revenue.toFixed(2),
        daysInService,
        daysSinceLastTrip,
        utilizationRate: utilizationRate.toFixed(1),
        tripsPerDay: daysInService > 0 ? (tripCount / daysInService).toFixed(2) : '0.00',
        revenuePerTrip: tripCount > 0 ? (revenue / tripCount).toFixed(2) : '0.00',
        status,
        lastTrip: vehicle.last_trip
      };
    });

    // Sort the data
    const sortField = (sortBy as string).toLowerCase();
    const order = (sortOrder as string).toLowerCase();

    utilizationData.sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Convert to numbers for numeric fields
      if (['trips', 'revenue', 'utilizationrate', 'tripsperday'].includes(sortField)) {
        aVal = parseFloat(aVal || '0');
        bVal = parseFloat(bVal || '0');
      }

      if (order === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });

    // Calculate summary statistics
    const summary = {
      totalVehicles: utilizationData.length,
      neverUsed: utilizationData.filter((v: any) => v.status === 'Never Used').length,
      idle: utilizationData.filter((v: any) => v.status === 'Idle').length,
      underutilized: utilizationData.filter((v: any) => v.status === 'Underutilized').length,
      highlyUtilized: utilizationData.filter((v: any) => v.status === 'Highly Utilized').length,
      totalTrips: utilizationData.reduce((sum: number, v: any) => sum + v.trips, 0),
      totalRevenue: utilizationData.reduce((sum: number, v: any) => sum + parseFloat(v.revenue), 0).toFixed(2)
    };

    res.json({
      summary,
      vehicles: utilizationData
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/:vehicleId/trip-history
 * @desc Get trip history for specific vehicle
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/:vehicleId/trip-history',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;
    const { limit = '50', status, startDate, endDate } = req.query;

    logger.info('Fetching vehicle trip history', { tenantId, vehicleId });

    // Build WHERE clause
    const conditions: string[] = ['t.tenant_id = $1', 't.vehicle_id = $2'];
    const params: any[] = [tenantId, vehicleId];
    let paramIndex = 3;

    if (status) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`t.trip_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`t.trip_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    params.push(parseInt(limit as string));

    const trips = await query<any>(`
      SELECT
        t.trip_id,
        t.trip_date,
        t.pickup_time,
        t.pickup_location,
        t.destination,
        t.trip_type,
        t.status,
        t.price,
        t.estimated_duration,
        c.name as customer_name,
        d.name as driver_name
      FROM tenant_trips t
      LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id
      LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id AND t.tenant_id = d.tenant_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.trip_date DESC, t.pickup_time DESC
      LIMIT $${paramIndex}
    `, params);

    res.json({
      trips,
      totalReturned: trips.length
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/:vehicleId/financial-summary
 * @desc Get financial summary for specific vehicle
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/:vehicleId/financial-summary',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;

    logger.info('Fetching vehicle financial summary', { tenantId, vehicleId });

    // Get vehicle details
    const vehicle = await queryOne<any>(`
      SELECT
        vehicle_id,
        registration,
        make,
        model,
        year,
        ownership,
        lease_monthly_cost,
        insurance_monthly_cost,
        created_at
      FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
    `, [tenantId, vehicleId]);

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Get revenue from trips
    const revenue = await queryOne<any>(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_revenue,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trips
      FROM tenant_trips
      WHERE tenant_id = $1 AND vehicle_id = $2
    `, [tenantId, vehicleId]);

    // Get maintenance costs
    const maintenanceCosts = await queryOne<any>(`
      SELECT
        COALESCE(SUM(cost), 0) as total_cost,
        COUNT(*) as maintenance_count
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND vehicle_id = $2 AND completed = true
    `, [tenantId, vehicleId]);

    // Get incident costs
    const incidentCosts = await queryOne<any>(`
      SELECT
        COALESCE(SUM(actual_cost), 0) as total_cost,
        COUNT(*) as incident_count
      FROM tenant_vehicle_incidents
      WHERE tenant_id = $1 AND vehicle_id = $2
    `, [tenantId, vehicleId]);

    // Calculate total costs
    const monthlyLease = parseFloat(vehicle.lease_monthly_cost || '0');
    const monthlyInsurance = parseFloat(vehicle.insurance_monthly_cost || '0');
    const totalRevenue = parseFloat(revenue?.total_revenue || '0');
    const maintenanceTotal = parseFloat(maintenanceCosts?.total_cost || '0');
    const incidentTotal = parseFloat(incidentCosts?.total_cost || '0');

    // Calculate months in service
    const createdDate = new Date(vehicle.created_at);
    const now = new Date();
    const monthsInService = Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

    const totalLeaseCost = monthlyLease * monthsInService;
    const totalInsuranceCost = monthlyInsurance * monthsInService;
    const totalCosts = totalLeaseCost + totalInsuranceCost + maintenanceTotal + incidentTotal;
    const netProfit = totalRevenue - totalCosts;
    const roi = totalCosts > 0 ? ((netProfit / totalCosts) * 100).toFixed(2) : '0.00';

    res.json({
      vehicle: {
        vehicle_id: vehicle.vehicle_id,
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        ownership: vehicle.ownership,
        monthsInService
      },
      revenue: {
        totalRevenue: totalRevenue.toFixed(2),
        completedTrips: parseInt(revenue?.completed_trips || '0', 10),
        revenuePerTrip: parseInt(revenue?.completed_trips || '0', 10) > 0
          ? (totalRevenue / parseInt(revenue.completed_trips)).toFixed(2)
          : '0.00'
      },
      costs: {
        lease: {
          monthly: monthlyLease.toFixed(2),
          total: totalLeaseCost.toFixed(2)
        },
        insurance: {
          monthly: monthlyInsurance.toFixed(2),
          total: totalInsuranceCost.toFixed(2)
        },
        maintenance: {
          total: maintenanceTotal.toFixed(2),
          eventCount: parseInt(maintenanceCosts?.maintenance_count || '0', 10),
          averagePerEvent: parseInt(maintenanceCosts?.maintenance_count || '0', 10) > 0
            ? (maintenanceTotal / parseInt(maintenanceCosts.maintenance_count)).toFixed(2)
            : '0.00'
        },
        incidents: {
          total: incidentTotal.toFixed(2),
          count: parseInt(incidentCosts?.incident_count || '0', 10)
        },
        totalCosts: totalCosts.toFixed(2)
      },
      profitability: {
        netProfit: netProfit.toFixed(2),
        roi: roi,
        profitable: netProfit > 0,
        monthlyProfit: monthsInService > 0 ? (netProfit / monthsInService).toFixed(2) : '0.00'
      }
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/idle-report
 * @desc Get report of idle/underutilized vehicles
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/idle-report',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { days = '30' } = req.query;

    logger.info('Fetching idle vehicles report', { tenantId, days });

    const idleDays = parseInt(days as string);

    // Get vehicles with their last trip date
    const vehicles = await query<any>(`
      SELECT
        v.vehicle_id,
        v.registration,
        v.make,
        v.model,
        v.year,
        v.ownership,
        v.driver_id,
        d.name as driver_name,
        v.lease_monthly_cost,
        v.insurance_monthly_cost,
        MAX(t.trip_date) as last_trip_date,
        COUNT(t.trip_id) as total_trips
      FROM tenant_vehicles v
      LEFT JOIN tenant_drivers d ON v.driver_id = d.driver_id AND v.tenant_id = d.tenant_id
      LEFT JOIN tenant_trips t ON v.vehicle_id = t.vehicle_id AND v.tenant_id = t.tenant_id
      WHERE v.tenant_id = $1 AND v.is_active = true AND v.archived = false
      GROUP BY v.vehicle_id, v.registration, v.make, v.model, v.year, v.ownership, v.driver_id, d.name,
               v.lease_monthly_cost, v.insurance_monthly_cost
    `, [tenantId]);

    const now = new Date();
    const idleVehicles: any[] = [];
    const neverUsedVehicles: any[] = [];

    vehicles.forEach((vehicle: any) => {
      const totalTrips = parseInt(vehicle.total_trips || '0', 10);

      if (totalTrips === 0) {
        // Never used
        neverUsedVehicles.push({
          vehicle_id: vehicle.vehicle_id,
          registration: vehicle.registration,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          ownership: vehicle.ownership,
          driver: vehicle.driver_name,
          status: 'Never Used',
          totalTrips: 0,
          monthlyCost: (parseFloat(vehicle.lease_monthly_cost || '0') + parseFloat(vehicle.insurance_monthly_cost || '0')).toFixed(2)
        });
      } else if (vehicle.last_trip_date) {
        const lastTripDate = new Date(vehicle.last_trip_date);
        const daysSinceLastTrip = Math.ceil((now.getTime() - lastTripDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceLastTrip >= idleDays) {
          idleVehicles.push({
            vehicle_id: vehicle.vehicle_id,
            registration: vehicle.registration,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            ownership: vehicle.ownership,
            driver: vehicle.driver_name,
            status: 'Idle',
            totalTrips,
            lastTripDate: vehicle.last_trip_date,
            daysSinceLastTrip,
            monthlyCost: (parseFloat(vehicle.lease_monthly_cost || '0') + parseFloat(vehicle.insurance_monthly_cost || '0')).toFixed(2)
          });
        }
      }
    });

    // Sort by days since last trip
    idleVehicles.sort((a, b) => b.daysSinceLastTrip - a.daysSinceLastTrip);

    // Calculate total wasted costs
    const totalWastedCost = [...idleVehicles, ...neverUsedVehicles].reduce(
      (sum, v) => sum + parseFloat(v.monthlyCost), 0
    );

    res.json({
      summary: {
        totalIdle: idleVehicles.length,
        totalNeverUsed: neverUsedVehicles.length,
        totalUnderutilized: idleVehicles.length + neverUsedVehicles.length,
        potentialMonthlySavings: totalWastedCost.toFixed(2)
      },
      idleVehicles,
      neverUsedVehicles,
      recommendation: idleVehicles.length + neverUsedVehicles.length > 0
        ? `Consider retiring or reassigning ${idleVehicles.length + neverUsedVehicles.length} underutilized vehicle(s) to save £${totalWastedCost.toFixed(2)}/month`
        : 'All vehicles are adequately utilized'
    });
    return;
  })
);

/**
 * ========================================
 * ARCHIVE & SOFT DELETE ENDPOINTS
 * ========================================
 */

/**
 * @route PUT /api/tenants/:tenantId/vehicles/:vehicleId/archive
 * @desc Archive a vehicle
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/vehicles/:vehicleId/archive',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;
    const { reason } = req.body;

    logger.info('Archiving vehicle', { tenantId, vehicleId, reason });

    // Verify vehicle exists
    const vehicle = await queryOne<any>(`
      SELECT vehicle_id, registration, make, model, archived
      FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
    `, [tenantId, vehicleId]);

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (vehicle.archived) {
      res.status(400).json({ error: 'Vehicle is already archived' });
      return;
    }

    // Archive the vehicle
    const result = await query<any>(`
      UPDATE tenant_vehicles
      SET archived = TRUE,
          archived_at = CURRENT_TIMESTAMP,
          archived_by = $3,
          archive_reason = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND vehicle_id = $2
      RETURNING vehicle_id, registration, make, model
    `, [tenantId, vehicleId, (req as any).user?.userId || null, reason || null]);

    res.json({
      message: 'Vehicle archived successfully',
      vehicle: {
        vehicle_id: result[0].vehicle_id,
        registration: result[0].registration,
        description: `${result[0].make} ${result[0].model}`
      }
    });
    return;
  })
);

/**
 * @route PUT /api/tenants/:tenantId/vehicles/:vehicleId/unarchive
 * @desc Unarchive a vehicle
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/vehicles/:vehicleId/unarchive',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;

    logger.info('Unarchiving vehicle', { tenantId, vehicleId });

    // Verify vehicle exists and is archived
    const vehicle = await queryOne<any>(`
      SELECT vehicle_id, registration, make, model, archived
      FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
    `, [tenantId, vehicleId]);

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (!vehicle.archived) {
      res.status(400).json({ error: 'Vehicle is not archived' });
      return;
    }

    // Unarchive the vehicle
    const result = await query<any>(`
      UPDATE tenant_vehicles
      SET archived = FALSE,
          archived_at = NULL,
          archived_by = NULL,
          archive_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND vehicle_id = $2
      RETURNING vehicle_id, registration, make, model
    `, [tenantId, vehicleId]);

    res.json({
      message: 'Vehicle unarchived successfully',
      vehicle: {
        vehicle_id: result[0].vehicle_id,
        registration: result[0].registration,
        description: `${result[0].make} ${result[0].model}`
      }
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

/**
 * ========================================
 * PROFITABILITY & COST-BENEFIT ANALYSIS
 * ========================================
 */

/**
 * @route GET /api/tenants/:tenantId/vehicles/profitability/drivers
 * @desc Analyze profitability per driver (revenue vs costs)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/profitability/drivers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate, minTrips = '5' } = req.query;

    logger.info('Fetching driver profitability analysis', { tenantId, startDate, endDate });

    // Build date filter
    const dateConditions: string[] = [];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      dateConditions.push(`t.trip_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateConditions.push(`t.trip_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

    // Get revenue per driver (completed trips only)
    const driverRevenue = await query<any>(`
      SELECT
        d.driver_id,
        d.name as driver_name,
        d.employment_type,
        d.weekly_wage,
        COUNT(t.trip_id) as total_trips,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trips,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END), 0) as total_revenue,
        MIN(t.trip_date) as first_trip_date,
        MAX(t.trip_date) as last_trip_date
      FROM tenant_drivers d
      LEFT JOIN tenant_trips t ON d.driver_id = t.driver_id AND d.tenant_id = t.tenant_id
      WHERE d.tenant_id = $1 AND d.is_active = true ${dateFilter}
      GROUP BY d.driver_id, d.name, d.employment_type, d.weekly_wage
      HAVING COUNT(t.trip_id) >= ${parseInt(minTrips as string, 10)}
    `, params);

    // Get fuel costs per driver
    const fuelCosts = await query<any>(`
      SELECT
        driver_id,
        COALESCE(SUM(cost), 0) as total_fuel_cost,
        COUNT(*) as fuel_entries
      FROM tenant_driver_fuel
      WHERE tenant_id = $1 ${dateFilter.replace(/t\.trip_date/g, 'purchase_date')}
      GROUP BY driver_id
    `, params);

    const fuelMap = new Map();
    fuelCosts.forEach((fc: any) => {
      fuelMap.set(fc.driver_id, {
        totalFuelCost: parseFloat(fc.total_fuel_cost || '0'),
        fuelEntries: parseInt(fc.fuel_entries || '0', 10)
      });
    });

    // Get payroll costs per driver
    const payrollCosts = await query<any>(`
      SELECT
        pr.driver_id,
        COALESCE(SUM(pr.gross_pay), 0) as total_wages,
        COUNT(*) as payroll_records
      FROM tenant_payroll_records pr
      WHERE pr.tenant_id = $1
      GROUP BY pr.driver_id
    `, [tenantId]);

    const payrollMap = new Map();
    payrollCosts.forEach((pc: any) => {
      payrollMap.set(pc.driver_id, {
        totalWages: parseFloat(pc.total_wages || '0'),
        payrollRecords: parseInt(pc.payroll_records || '0', 10)
      });
    });

    // Get vehicle costs from actual trips (not current assignment)
    // Only count costs for company-owned or leased vehicles (exclude 'personal')
    const vehicleCosts = await query<any>(`
      SELECT
        t.driver_id,
        COALESCE(SUM(CASE
          WHEN v.ownership IN ('owned', 'leased')
          THEN (v.lease_monthly_cost + v.insurance_monthly_cost) / 80.0
          ELSE 0
        END), 0) as total_vehicle_cost,
        COUNT(DISTINCT t.vehicle_id) as vehicles_used
      FROM tenant_trips t
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      WHERE t.tenant_id = $1 ${dateFilter}
      GROUP BY t.driver_id
    `, params);

    const vehicleMap = new Map();
    vehicleCosts.forEach((vc: any) => {
      vehicleMap.set(vc.driver_id, {
        totalVehicleCost: parseFloat(vc.total_vehicle_cost || '0'),
        vehiclesUsed: parseInt(vc.vehicles_used || '0', 10)
      });
    });

    // Calculate profitability for each driver
    const profitability = driverRevenue.map((driver: any) => {
      const totalRevenue = parseFloat(driver.total_revenue || '0');
      const totalTrips = parseInt(driver.total_trips || '0', 10);
      const completedTrips = parseInt(driver.completed_trips || '0', 10);

      // Calculate wage cost
      const payrollData = payrollMap.get(driver.driver_id);
      const weeklyWage = parseFloat(driver.weekly_wage || '0');
      const weeksInPeriod = startDate && endDate
        ? Math.ceil((new Date(endDate as string).getTime() - new Date(startDate as string).getTime()) / (1000 * 60 * 60 * 24 * 7))
        : 4; // Default to 4 weeks if no date range

      const wageCost = payrollData ? payrollData.totalWages : (weeklyWage * weeksInPeriod);

      // Get other costs
      const fuelData = fuelMap.get(driver.driver_id) || { totalFuelCost: 0, fuelEntries: 0 };
      const vehicleData = vehicleMap.get(driver.driver_id) || { totalVehicleCost: 0 };

      const totalCosts = wageCost + fuelData.totalFuelCost + vehicleData.totalVehicleCost;
      const netProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00';
      const revenuePerTrip = completedTrips > 0 ? (totalRevenue / completedTrips).toFixed(2) : '0.00';
      const costPerTrip = totalTrips > 0 ? (totalCosts / totalTrips).toFixed(2) : '0.00';

      return {
        driverId: driver.driver_id,
        driverName: driver.driver_name,
        employmentType: driver.employment_type,
        totalTrips,
        completedTrips,
        revenue: {
          total: parseFloat(totalRevenue.toFixed(2)),
          perTrip: parseFloat(revenuePerTrip)
        },
        costs: {
          wages: parseFloat(wageCost.toFixed(2)),
          fuel: fuelData.totalFuelCost,
          vehicle: vehicleData.totalVehicleCost,
          total: parseFloat(totalCosts.toFixed(2)),
          perTrip: parseFloat(costPerTrip)
        },
        profitability: {
          netProfit: parseFloat(netProfit.toFixed(2)),
          profitMargin: parseFloat(profitMargin),
          profitable: netProfit > 0
        },
        period: {
          firstTrip: driver.first_trip_date,
          lastTrip: driver.last_trip_date,
          weeks: weeksInPeriod
        }
      };
    });

    // Sort by net profit descending
    profitability.sort((a, b) => b.profitability.netProfit - a.profitability.netProfit);

    // Calculate summary statistics
    const summary = {
      totalDrivers: profitability.length,
      profitableDrivers: profitability.filter(d => d.profitability.profitable).length,
      unprofitableDrivers: profitability.filter(d => !d.profitability.profitable).length,
      totalRevenue: profitability.reduce((sum, d) => sum + d.revenue.total, 0),
      totalCosts: profitability.reduce((sum, d) => sum + d.costs.total, 0),
      totalNetProfit: profitability.reduce((sum, d) => sum + d.profitability.netProfit, 0),
      averageProfitMargin: profitability.length > 0
        ? (profitability.reduce((sum, d) => sum + d.profitability.profitMargin, 0) / profitability.length).toFixed(2)
        : '0.00'
    };

    res.json({
      summary,
      drivers: profitability
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/profitability/trips
 * @desc Analyze profitability per trip (identifies profitable vs unprofitable trips)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/profitability/trips',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { limit = '100', tripType, driverId, status = 'completed' } = req.query;

    logger.info('Fetching trip profitability analysis', { tenantId, limit, tripType, driverId });

    // Build filter conditions
    const conditions: string[] = ['t.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (tripType) {
      conditions.push(`t.trip_type = $${paramIndex}`);
      params.push(tripType);
      paramIndex++;
    }

    if (driverId) {
      conditions.push(`t.driver_id = $${paramIndex}`);
      params.push(driverId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get trip details with driver and vehicle info
    const trips = await query<any>(`
      SELECT
        t.trip_id,
        t.trip_date,
        t.pickup_time,
        t.trip_type,
        t.status,
        t.price,
        t.distance,
        t.estimated_duration,
        t.driver_id,
        d.name as driver_name,
        d.weekly_wage,
        d.employment_type,
        t.vehicle_id,
        v.ownership,
        v.lease_monthly_cost,
        v.insurance_monthly_cost,
        c.name as customer_name
      FROM tenant_trips t
      LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id AND t.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id
      WHERE ${whereClause}
      ORDER BY t.trip_date DESC, t.pickup_time DESC
      LIMIT ${parseInt(limit as string, 10)}
    `, params);

    // Calculate average costs for estimation
    const avgMaintenance = await queryOne<{ avg_cost: string }>(`
      SELECT COALESCE(AVG(cost), 0) as avg_cost
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND completed = true
    `, [tenantId]);

    const avgMaintenancePerTrip = parseFloat(avgMaintenance?.avg_cost || '0') / 80; // Assume ~80 trips per maintenance

    // Estimate fuel cost per km (UK average ~£0.15/km)
    const fuelCostPerKm = 0.15;

    // Calculate profitability for each trip
    const tripProfitability = trips.map((trip: any) => {
      const revenue = parseFloat(trip.price || '0');
      const distance = parseFloat(trip.distance || '0');
      const estimatedDuration = parseFloat(trip.estimated_duration || '60'); // Default 60 mins

      // Calculate driver wage cost for this trip
      const weeklyWage = parseFloat(trip.weekly_wage || '0');
      const hourlyRate = weeklyWage / 40; // Assume 40-hour week
      const durationHours = estimatedDuration / 60;
      const wageCost = hourlyRate * durationHours;

      // Calculate fuel cost estimate
      const fuelCost = distance * fuelCostPerKm;

      // Calculate vehicle cost allocation (monthly cost / ~80 trips per month)
      // Only charge for company-owned or leased vehicles (not personal)
      const ownership = trip.ownership;
      const monthlyLease = parseFloat(trip.lease_monthly_cost || '0');
      const monthlyInsurance = parseFloat(trip.insurance_monthly_cost || '0');
      const vehicleCostPerTrip = (ownership === 'owned' || ownership === 'leased')
        ? (monthlyLease + monthlyInsurance) / 80
        : 0; // No cost for personal vehicles

      // Total costs
      const totalCosts = wageCost + fuelCost + vehicleCostPerTrip + avgMaintenancePerTrip;
      const netProfit = revenue - totalCosts;
      const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : '0.00';

      return {
        tripId: trip.trip_id,
        tripDate: trip.trip_date,
        pickupTime: trip.pickup_time,
        tripType: trip.trip_type,
        status: trip.status,
        customerName: trip.customer_name,
        driverName: trip.driver_name,
        distance: distance,
        duration: estimatedDuration,
        revenue: parseFloat(revenue.toFixed(2)),
        costs: {
          driverWage: parseFloat(wageCost.toFixed(2)),
          fuel: parseFloat(fuelCost.toFixed(2)),
          vehicle: parseFloat(vehicleCostPerTrip.toFixed(2)),
          maintenance: parseFloat(avgMaintenancePerTrip.toFixed(2)),
          total: parseFloat(totalCosts.toFixed(2))
        },
        profitability: {
          netProfit: parseFloat(netProfit.toFixed(2)),
          profitMargin: parseFloat(profitMargin),
          profitable: netProfit > 0
        }
      };
    });

    // Calculate summary
    const summary = {
      totalTrips: tripProfitability.length,
      profitableTrips: tripProfitability.filter(t => t.profitability.profitable).length,
      unprofitableTrips: tripProfitability.filter(t => !t.profitability.profitable).length,
      totalRevenue: tripProfitability.reduce((sum, t) => sum + t.revenue, 0),
      totalCosts: tripProfitability.reduce((sum, t) => sum + t.costs.total, 0),
      totalNetProfit: tripProfitability.reduce((sum, t) => sum + t.profitability.netProfit, 0),
      averageProfitPerTrip: tripProfitability.length > 0
        ? (tripProfitability.reduce((sum, t) => sum + t.profitability.netProfit, 0) / tripProfitability.length).toFixed(2)
        : '0.00',
      averageProfitMargin: tripProfitability.length > 0
        ? (tripProfitability.reduce((sum, t) => sum + parseFloat(t.profitability.profitMargin.toString()), 0) / tripProfitability.length).toFixed(2)
        : '0.00'
    };

    res.json({
      summary,
      trips: tripProfitability
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/vehicles/profitability/dashboard
 * @desc Overall cost-benefit analysis dashboard
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/vehicles/profitability/dashboard',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    logger.info('Fetching cost-benefit dashboard', { tenantId, startDate, endDate });

    // Build date filter
    const dateConditions: string[] = [];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      dateConditions.push(`trip_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateConditions.push(`trip_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

    // Get overall revenue statistics
    const revenueStats = await queryOne<any>(`
      SELECT
        COUNT(*) as total_trips,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN price END), 0) as avg_revenue_per_trip
      FROM tenant_trips
      WHERE tenant_id = $1 ${dateFilter}
    `, params);

    // Get cost summaries
    const payrollCosts = await queryOne<{ total_wages: string }>(`
      SELECT COALESCE(SUM(gross_pay), 0) as total_wages
      FROM tenant_payroll_records
      WHERE tenant_id = $1
    `, [tenantId]);

    const fuelCosts = await queryOne<{ total_fuel: string }>(`
      SELECT COALESCE(SUM(cost), 0) as total_fuel
      FROM tenant_driver_fuel
      WHERE tenant_id = $1 ${dateFilter.replace(/trip_date/g, 'purchase_date')}
    `, params);

    const vehicleCosts = await queryOne<any>(`
      SELECT
        COALESCE(SUM(CASE WHEN ownership IN ('owned', 'leased') THEN lease_monthly_cost ELSE 0 END), 0) as total_lease,
        COALESCE(SUM(CASE WHEN ownership IN ('owned', 'leased') THEN insurance_monthly_cost ELSE 0 END), 0) as total_insurance,
        COUNT(*) as active_vehicles,
        COUNT(*) FILTER (WHERE ownership = 'personal') as personal_vehicles
      FROM tenant_vehicles
      WHERE tenant_id = $1 AND is_active = true
    `, [tenantId]);

    const maintenanceCosts = await queryOne<{ total_maintenance: string }>(`
      SELECT COALESCE(SUM(cost), 0) as total_maintenance
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND completed = true
    `, [tenantId]);

    const incidentCosts = await queryOne<{ total_incidents: string }>(`
      SELECT COALESCE(SUM(actual_cost), 0) as total_incidents
      FROM tenant_vehicle_incidents
      WHERE tenant_id = $1
    `, [tenantId]);

    // Calculate totals
    const totalRevenue = parseFloat(revenueStats?.total_revenue || '0');
    const totalWages = parseFloat(payrollCosts?.total_wages || '0');
    const totalFuel = parseFloat(fuelCosts?.total_fuel || '0');

    const monthsInPeriod = startDate && endDate
      ? Math.ceil((new Date(endDate as string).getTime() - new Date(startDate as string).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      : 1;

    const totalLease = parseFloat(vehicleCosts?.total_lease || '0') * monthsInPeriod;
    const totalInsurance = parseFloat(vehicleCosts?.total_insurance || '0') * monthsInPeriod;
    const totalMaintenance = parseFloat(maintenanceCosts?.total_maintenance || '0');
    const totalIncidents = parseFloat(incidentCosts?.total_incidents || '0');

    const totalCosts = totalWages + totalFuel + totalLease + totalInsurance + totalMaintenance + totalIncidents;
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00';

    // Get profitability by trip type
    const tripTypeBreakdown = await query<any>(`
      SELECT
        trip_type,
        COUNT(*) as trip_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as revenue
      FROM tenant_trips
      WHERE tenant_id = $1 ${dateFilter}
      GROUP BY trip_type
      ORDER BY revenue DESC
    `, params);

    // Get top drivers by revenue
    const topDrivers = await query<any>(`
      SELECT
        d.driver_id,
        d.name,
        COUNT(t.trip_id) as trips,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END), 0) as revenue
      FROM tenant_drivers d
      LEFT JOIN tenant_trips t ON d.driver_id = t.driver_id AND d.tenant_id = t.tenant_id ${dateFilter.replace('trip_date', 't.trip_date')}
      WHERE d.tenant_id = $1 AND d.is_active = true
      GROUP BY d.driver_id, d.name
      HAVING COUNT(t.trip_id) > 0
      ORDER BY revenue DESC
      LIMIT 5
    `, params);

    res.json({
      overview: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCosts: parseFloat(totalCosts.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        profitMargin: parseFloat(profitMargin),
        profitable: netProfit > 0
      },
      trips: {
        total: parseInt(revenueStats?.total_trips || '0', 10),
        completed: parseInt(revenueStats?.completed_trips || '0', 10),
        cancelled: parseInt(revenueStats?.cancelled_trips || '0', 10),
        averageRevenue: parseFloat(revenueStats?.avg_revenue_per_trip || '0').toFixed(2)
      },
      costBreakdown: {
        wages: parseFloat(totalWages.toFixed(2)),
        fuel: parseFloat(totalFuel.toFixed(2)),
        vehicleLease: parseFloat(totalLease.toFixed(2)),
        vehicleInsurance: parseFloat(totalInsurance.toFixed(2)),
        maintenance: parseFloat(totalMaintenance.toFixed(2)),
        incidents: parseFloat(totalIncidents.toFixed(2)),
        total: parseFloat(totalCosts.toFixed(2))
      },
      costPercentages: {
        wages: totalCosts > 0 ? ((totalWages / totalCosts) * 100).toFixed(2) : '0.00',
        fuel: totalCosts > 0 ? ((totalFuel / totalCosts) * 100).toFixed(2) : '0.00',
        vehicles: totalCosts > 0 ? (((totalLease + totalInsurance) / totalCosts) * 100).toFixed(2) : '0.00',
        maintenance: totalCosts > 0 ? ((totalMaintenance / totalCosts) * 100).toFixed(2) : '0.00',
        incidents: totalCosts > 0 ? ((totalIncidents / totalCosts) * 100).toFixed(2) : '0.00'
      },
      tripTypeBreakdown: tripTypeBreakdown.map((tt: any) => ({
        tripType: tt.trip_type,
        trips: parseInt(tt.trip_count || '0', 10),
        revenue: parseFloat(tt.revenue || '0')
      })),
      topDrivers: topDrivers.map((d: any) => ({
        driverId: d.driver_id,
        name: d.name,
        trips: parseInt(d.trips || '0', 10),
        revenue: parseFloat(d.revenue || '0')
      })),
      recommendations: generateRecommendations(
        netProfit,
        totalRevenue,
        totalCosts,
        {
          wages: totalWages,
          fuel: totalFuel,
          maintenance: totalMaintenance,
          incidents: totalIncidents
        }
      ),
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
        months: monthsInPeriod
      }
    });
    return;
  })
);

/**
 * Generate cost optimization recommendations
 */
function generateRecommendations(
  netProfit: number,
  totalRevenue: number,
  totalCosts: number,
  costBreakdown: { wages: number; fuel: number; maintenance: number; incidents: number }
): string[] {
  const recommendations: string[] = [];

  // Overall profitability
  if (netProfit < 0) {
    recommendations.push(`⚠️ Fleet is operating at a loss. Total costs (£${totalCosts.toFixed(2)}) exceed revenue (£${totalRevenue.toFixed(2)}).`);
  } else {
    const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(2);
    if (parseFloat(profitMargin) < 10) {
      recommendations.push(`💡 Profit margin is low (${profitMargin}%). Consider optimizing costs or increasing trip prices.`);
    }
  }

  // Wage costs
  const wagePercentage = (costBreakdown.wages / totalCosts) * 100;
  if (wagePercentage > 60) {
    recommendations.push(`💰 Wage costs are ${wagePercentage.toFixed(1)}% of total costs. Review driver utilization to maximize productivity.`);
  }

  // Fuel costs
  const fuelPercentage = (costBreakdown.fuel / totalCosts) * 100;
  if (fuelPercentage > 25) {
    recommendations.push(`⛽ Fuel costs are ${fuelPercentage.toFixed(1)}% of total costs. Consider route optimization or fuel-efficient vehicles.`);
  }

  // Maintenance costs
  const maintenancePercentage = (costBreakdown.maintenance / totalCosts) * 100;
  if (maintenancePercentage > 15) {
    recommendations.push(`🔧 Maintenance costs are ${maintenancePercentage.toFixed(1)}% of total costs. High maintenance may indicate aging fleet.`);
  }

  // Incident costs
  if (costBreakdown.incidents > 5000) {
    recommendations.push(`🚨 Incident costs are £${costBreakdown.incidents.toFixed(2)}. Review driver training and safety protocols.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Fleet operations are performing well. Continue monitoring key metrics.');
  }

  return recommendations;
}

export default router;
