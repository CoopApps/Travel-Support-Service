import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { UpdateMaintenanceDto, MaintenanceRecord } from '../types/vehicle.types';

const router: Router = express.Router();

/**
 * Maintenance Routes
 *
 * Vehicle maintenance tracking system
 * Database Table: tenant_vehicle_maintenance
 */

/**
 * @route GET /api/tenants/:tenantId/maintenance/overview
 * @desc Get maintenance overview statistics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/maintenance/overview',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching maintenance overview', { tenantId });

    // Get vehicle maintenance status counts
    const vehicles = await query<{
      vehicle_id: number;
      registration: string;
      make: string;
      model: string;
      mot_date: Date | null;
      insurance_expiry: Date | null;
      last_service_date: Date | null;
      service_interval_months: number | null;
    }>(`
      SELECT
        vehicle_id,
        registration,
        make,
        model,
        mot_date,
        insurance_expiry,
        last_service_date,
        service_interval_months
      FROM tenant_vehicles
      WHERE tenant_id = $1 AND is_active = true AND is_basic_record = false
    `, [tenantId]);

    // Calculate status counts
    let overdue_count = 0;
    let due_soon_count = 0;
    let due_this_month_count = 0;
    let up_to_date_count = 0;
    const upcoming_services: any[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    vehicles.forEach(vehicle => {
      let hasOverdue = false;
      let hasDueSoon = false;
      let hasDueThisMonth = false;

      // Check MOT
      if (vehicle.mot_date) {
        const motDate = new Date(vehicle.mot_date);
        const daysUntil = Math.ceil((motDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) hasOverdue = true;
        else if (daysUntil <= 7) hasDueSoon = true;
        else if (daysUntil <= 30) hasDueThisMonth = true;

        if (daysUntil >= 0 && daysUntil <= 60) {
          upcoming_services.push({
            vehicle_id: vehicle.vehicle_id,
            registration: vehicle.registration,
            make: vehicle.make,
            model: vehicle.model,
            service_type: 'MOT',
            due_date: vehicle.mot_date,
            days_until_due: daysUntil
          });
        }
      }

      // Check Insurance
      if (vehicle.insurance_expiry) {
        const insuranceDate = new Date(vehicle.insurance_expiry);
        const daysUntil = Math.ceil((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) hasOverdue = true;
        else if (daysUntil <= 7) hasDueSoon = true;
        else if (daysUntil <= 30) hasDueThisMonth = true;

        if (daysUntil >= 0 && daysUntil <= 60) {
          upcoming_services.push({
            vehicle_id: vehicle.vehicle_id,
            registration: vehicle.registration,
            make: vehicle.make,
            model: vehicle.model,
            service_type: 'Insurance',
            due_date: vehicle.insurance_expiry,
            days_until_due: daysUntil
          });
        }
      }

      // Check Service
      if (vehicle.last_service_date && vehicle.service_interval_months) {
        const lastService = new Date(vehicle.last_service_date);
        const nextServiceDue = new Date(lastService);
        nextServiceDue.setMonth(nextServiceDue.getMonth() + vehicle.service_interval_months);

        const daysUntil = Math.ceil((nextServiceDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= 0) hasOverdue = true;
        else if (daysUntil <= 7) hasDueSoon = true;
        else if (daysUntil <= 30) hasDueThisMonth = true;

        if (daysUntil >= 0 && daysUntil <= 60) {
          upcoming_services.push({
            vehicle_id: vehicle.vehicle_id,
            registration: vehicle.registration,
            make: vehicle.make,
            model: vehicle.model,
            service_type: 'Service',
            due_date: nextServiceDue.toISOString().split('T')[0],
            days_until_due: daysUntil
          });
        }
      }

      // Categorize vehicle
      if (hasOverdue) overdue_count++;
      else if (hasDueSoon) due_soon_count++;
      else if (hasDueThisMonth) due_this_month_count++;
      else up_to_date_count++;
    });

    // Sort upcoming services by days until due
    upcoming_services.sort((a, b) => a.days_until_due - b.days_until_due);

    // Get cost statistics
    const costs = await queryOne<{
      this_month: string;
      last_3_months: string;
      year_to_date: string;
      total_vehicles: string;
    }>(`
      SELECT
        SUM(CASE WHEN maintenance_date >= DATE_TRUNC('month', CURRENT_DATE) THEN cost ELSE 0 END) as this_month,
        SUM(CASE WHEN maintenance_date >= CURRENT_DATE - INTERVAL '3 months' THEN cost ELSE 0 END) as last_3_months,
        SUM(CASE WHEN maintenance_date >= DATE_TRUNC('year', CURRENT_DATE) THEN cost ELSE 0 END) as year_to_date,
        (SELECT COUNT(*) FROM tenant_vehicles WHERE tenant_id = $1 AND is_active = true) as total_vehicles
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND completed = true
    `, [tenantId]);

    const totalVehicles = parseInt(costs?.total_vehicles || '1');
    const yearToDate = parseFloat(costs?.year_to_date || '0');

    res.json({
      overdue_count,
      due_soon_count,
      due_this_month_count,
      up_to_date_count,
      recent_costs: {
        this_month: parseFloat(costs?.this_month || '0'),
        last_3_months: parseFloat(costs?.last_3_months || '0'),
        year_to_date: yearToDate,
        avg_per_vehicle: yearToDate / totalVehicles
      },
      upcoming_services
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/maintenance/alerts
 * @desc Get maintenance alerts for vehicles
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/maintenance/alerts',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const days = parseInt((req.query.days as string) || '30');

    logger.info('Fetching maintenance alerts', { tenantId, days });

    const vehicles = await query<{
      vehicle_id: number;
      make: string;
      model: string;
      registration: string;
      mot_date: Date | null;
      insurance_expiry: Date | null;
      last_service_date: Date | null;
      service_interval_months: number | null;
      driver_name: string | null;
    }>(`
      SELECT
        v.vehicle_id,
        v.make,
        v.model,
        v.registration,
        v.mot_date,
        v.insurance_expiry,
        v.last_service_date,
        v.service_interval_months,
        d.name as driver_name
      FROM tenant_vehicles v
      LEFT JOIN tenant_drivers d ON v.driver_id = d.driver_id AND v.tenant_id = d.tenant_id
      WHERE v.tenant_id = $1
        AND v.is_active = true
        AND v.is_basic_record = false
        AND (
          v.mot_date <= CURRENT_DATE + INTERVAL '${days} days'
          OR v.insurance_expiry <= CURRENT_DATE + INTERVAL '${days} days'
          OR (
            v.last_service_date IS NOT NULL
            AND v.service_interval_months IS NOT NULL
            AND v.last_service_date + (v.service_interval_months || ' months')::INTERVAL <= CURRENT_DATE + INTERVAL '${days} days'
          )
        )
      ORDER BY v.make, v.model
    `, [tenantId]);

    // Process alerts
    const alerts = vehicles.map(vehicle => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const vehicleAlerts: any = {
        vehicleId: vehicle.vehicle_id,
        vehicle: `${vehicle.make} ${vehicle.model}`,
        registration: vehicle.registration,
        driverName: vehicle.driver_name,
        alerts: []
      };

      // MOT alerts
      if (vehicle.mot_date) {
        const motDate = new Date(vehicle.mot_date);
        const daysUntil = Math.ceil((motDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= days) {
          vehicleAlerts.alerts.push({
            type: 'MOT',
            daysUntil,
            date: vehicle.mot_date,
            severity: daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'urgent' : 'warning',
            message: daysUntil < 0
              ? `MOT expired ${Math.abs(daysUntil)} days ago`
              : `MOT due in ${daysUntil} days`
          });
        }
      }

      // Insurance alerts
      if (vehicle.insurance_expiry) {
        const insuranceDate = new Date(vehicle.insurance_expiry);
        const daysUntil = Math.ceil((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= days) {
          vehicleAlerts.alerts.push({
            type: 'Insurance',
            daysUntil,
            date: vehicle.insurance_expiry,
            severity: daysUntil < 0 ? 'expired' : daysUntil <= 7 ? 'urgent' : 'warning',
            message: daysUntil < 0
              ? `Insurance expired ${Math.abs(daysUntil)} days ago`
              : `Insurance due in ${daysUntil} days`
          });
        }
      }

      // Service alerts
      if (vehicle.last_service_date && vehicle.service_interval_months) {
        const lastService = new Date(vehicle.last_service_date);
        const nextServiceDue = new Date(lastService);
        nextServiceDue.setMonth(nextServiceDue.getMonth() + vehicle.service_interval_months);

        const daysUntil = Math.ceil((nextServiceDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= days) {
          vehicleAlerts.alerts.push({
            type: 'Service',
            daysUntil,
            date: nextServiceDue.toISOString().split('T')[0],
            severity: daysUntil <= 0 ? 'due' : daysUntil <= 7 ? 'urgent' : 'warning',
            message: daysUntil <= 0
              ? 'Service overdue'
              : `Service due in ${daysUntil} days`
          });
        }
      }

      return vehicleAlerts;
    }).filter(v => v.alerts.length > 0);

    res.json({ alerts });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/maintenance/history
 * @desc Get complete service history
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/maintenance/history',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { vehicle_id, maintenance_type, limit = '100' } = req.query;

    logger.info('Fetching maintenance history', { tenantId, vehicle_id, maintenance_type });

    const conditions: string[] = ['m.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (vehicle_id) {
      conditions.push(`m.vehicle_id = $${paramIndex}`);
      params.push(vehicle_id);
      paramIndex++;
    }

    if (maintenance_type) {
      conditions.push(`m.maintenance_type = $${paramIndex}`);
      params.push(maintenance_type);
      paramIndex++;
    }

    params.push(parseInt(limit as string));

    const history = await query<MaintenanceRecord>(`
      SELECT
        m.maintenance_id,
        m.vehicle_id,
        m.maintenance_date as service_date,
        m.maintenance_type as service_type,
        m.description,
        m.cost,
        m.mileage_at_service,
        m.service_provider as provider,
        m.provider_contact,
        m.notes,
        m.invoice_number,
        m.completed,
        m.created_at,
        v.make as vehicle_make,
        v.model as vehicle_model,
        v.registration as vehicle_registration
      FROM tenant_vehicle_maintenance m
      INNER JOIN tenant_vehicles v ON m.vehicle_id = v.vehicle_id AND m.tenant_id = v.tenant_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.maintenance_date DESC, m.created_at DESC
      LIMIT $${paramIndex}
    `, params);

    res.json(history);
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/maintenance/vehicle/:vehicleId
 * @desc Get maintenance history for specific vehicle
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/maintenance/vehicle/:vehicleId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId } = req.params;

    logger.info('Fetching vehicle maintenance', { tenantId, vehicleId });

    const records = await query<MaintenanceRecord>(`
      SELECT
        m.maintenance_id,
        m.vehicle_id,
        m.maintenance_date as service_date,
        m.maintenance_type as service_type,
        m.description,
        m.cost,
        m.mileage_at_service,
        m.service_provider as provider,
        m.provider_contact,
        m.notes,
        m.invoice_number,
        m.completed,
        m.created_at,
        m.updated_at,
        v.make as vehicle_make,
        v.model as vehicle_model,
        v.registration as vehicle_registration
      FROM tenant_vehicle_maintenance m
      INNER JOIN tenant_vehicles v ON m.vehicle_id = v.vehicle_id AND m.tenant_id = v.tenant_id
      WHERE m.tenant_id = $1 AND m.vehicle_id = $2
      ORDER BY m.maintenance_date DESC, m.created_at DESC
    `, [tenantId, vehicleId]);

    // Calculate stats
    const serviceTypes: Record<string, number> = {};
    records.forEach(record => {
      const type = (record as any).service_type;
      serviceTypes[type] = (serviceTypes[type] || 0) + 1;
    });

    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

    res.json({
      vehicleId: parseInt(vehicleId),
      records,
      stats: {
        totalRecords: records.length,
        totalCost,
        lastService: records.length > 0 ? (records[0] as any).service_date : null,
        serviceTypes
      }
    });
    return;
  })
);

/**
 * @route POST /api/tenants/:tenantId/maintenance/record
 * @desc Create maintenance record
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/maintenance/record',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const recordData = req.body;

    logger.info('Creating maintenance record', { tenantId, recordData });

    // Map frontend field names to backend field names
    const maintenance_date = recordData.service_date || recordData.maintenance_date;
    const maintenance_type = recordData.service_type || recordData.maintenance_type;
    const service_provider = recordData.provider || recordData.service_provider;
    const vehicle_id = recordData.vehicle_id;

    // Validate required fields
    if (!vehicle_id || !maintenance_date || !maintenance_type) {
      throw new ValidationError('Missing required fields: vehicle_id, service_date (or maintenance_date), service_type (or maintenance_type)');
    }

    // Verify vehicle exists
    const vehicle = await queryOne<{ vehicle_id: number }>(`
      SELECT vehicle_id FROM tenant_vehicles
      WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
    `, [tenantId, vehicle_id]);

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Prepare notes - combine notes with parts_replaced and warranty info if provided
    let combinedNotes = recordData.notes || '';
    if (recordData.parts_replaced && Array.isArray(recordData.parts_replaced) && recordData.parts_replaced.length > 0) {
      combinedNotes += (combinedNotes ? '\n\n' : '') + 'Parts replaced: ' + recordData.parts_replaced.join(', ');
    }
    if (recordData.is_warranty_work) {
      combinedNotes += (combinedNotes ? '\n' : '') + 'Warranty work';
    }

    // Insert maintenance record
    const result = await query<{ maintenance_id: number; maintenance_date: Date; maintenance_type: string }>(`
      INSERT INTO tenant_vehicle_maintenance (
        tenant_id,
        vehicle_id,
        maintenance_date,
        maintenance_type,
        description,
        cost,
        mileage_at_service,
        service_provider,
        provider_contact,
        notes,
        invoice_number,
        completed,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING maintenance_id, maintenance_date, maintenance_type
    `, [
      tenantId,
      vehicle_id,
      maintenance_date,
      maintenance_type,
      recordData.description || null,
      recordData.cost || 0,
      recordData.mileage_at_service || null,
      service_provider || null,
      recordData.provider_contact || null,
      combinedNotes || null,
      recordData.invoice_number || null,
      recordData.completed !== undefined ? recordData.completed : true
    ]);

    // Update vehicle's last service date if this is a service
    const serviceTypeNormalized = maintenance_type.toLowerCase();
    if (serviceTypeNormalized.includes('service') || serviceTypeNormalized === 'mot') {
      await query(`
        UPDATE tenant_vehicles
        SET last_service_date = $1, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $2 AND vehicle_id = $3
      `, [maintenance_date, tenantId, vehicle_id]);
    }

    // Update vehicle mileage if provided
    if (recordData.mileage_at_service) {
      await query(`
        UPDATE tenant_vehicles
        SET mileage = $1, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $2 AND vehicle_id = $3 AND (mileage IS NULL OR mileage < $1)
      `, [recordData.mileage_at_service, tenantId, vehicle_id]);
    }

    const newRecord = result[0];
    logger.info('Maintenance record created', { maintenanceId: newRecord.maintenance_id, tenantId });

    res.status(201).json({
      maintenance_id: newRecord.maintenance_id,
      service_date: newRecord.maintenance_date,
      service_type: newRecord.maintenance_type,
      message: 'Maintenance record created successfully'
    });
    return;
  })
);

/**
 * @route PUT /api/tenants/:tenantId/maintenance/record/:maintenanceId
 * @desc Update maintenance record
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/maintenance/record/:maintenanceId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, maintenanceId } = req.params;
    const updateData: UpdateMaintenanceDto = req.body;

    logger.info('Updating maintenance record', { tenantId, maintenanceId, updateData });

    // Verify record exists
    const existing = await queryOne<{ maintenance_id: number }>(`
      SELECT maintenance_id FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND maintenance_id = $2
    `, [tenantId, maintenanceId]);

    if (!existing) {
      throw new NotFoundError('Maintenance record not found');
    }

    // Build dynamic update query
    const setClauses: string[] = [];
    const params: any[] = [tenantId, maintenanceId];
    let paramIndex = 3;

    const fieldMap: Record<string, string> = {
      maintenance_date: 'maintenance_date',
      maintenance_type: 'maintenance_type',
      description: 'description',
      cost: 'cost',
      mileage_at_service: 'mileage_at_service',
      service_provider: 'service_provider',
      provider_contact: 'provider_contact',
      notes: 'notes',
      invoice_number: 'invoice_number',
      completed: 'completed'
    };

    for (const [key, dbColumn] of Object.entries(fieldMap)) {
      if (updateData.hasOwnProperty(key as keyof UpdateMaintenanceDto)) {
        setClauses.push(`${dbColumn} = $${paramIndex}`);
        params.push(updateData[key as keyof UpdateMaintenanceDto]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.json({ message: 'No fields to update' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await query<{ maintenance_id: number; maintenance_type: string; maintenance_date: Date }>(`
      UPDATE tenant_vehicle_maintenance
      SET ${setClauses.join(', ')}
      WHERE tenant_id = $1 AND maintenance_id = $2
      RETURNING maintenance_id, maintenance_type, maintenance_date
    `, params);

    const updated = result[0];
    logger.info('Maintenance record updated', { maintenanceId: updated.maintenance_id, tenantId });

    res.json({
      maintenance_id: updated.maintenance_id,
      message: 'Maintenance record updated successfully'
    });
    return;
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/maintenance/record/:maintenanceId
 * @desc Delete maintenance record
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/maintenance/record/:maintenanceId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, maintenanceId } = req.params;

    logger.info('Deleting maintenance record', { tenantId, maintenanceId });

    const result = await query<{ maintenance_id: number; maintenance_type: string; maintenance_date: Date }>(`
      DELETE FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND maintenance_id = $2
      RETURNING maintenance_id, maintenance_type, maintenance_date
    `, [tenantId, maintenanceId]);

    if (result.length === 0) {
      throw new NotFoundError('Maintenance record not found');
    }

    const deleted = result[0];
    logger.info('Maintenance record deleted', { maintenanceId: deleted.maintenance_id, tenantId });

    res.json({
      message: 'Maintenance record deleted successfully',
      deleted
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/maintenance/costs
 * @desc Get cost analysis
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/maintenance/costs',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching maintenance costs', { tenantId });

    const costs = await query<{
      month: Date;
      maintenance_type: string;
      record_count: string;
      total_cost: string;
      avg_cost: string;
    }>(`
      SELECT
        DATE_TRUNC('month', maintenance_date) as month,
        maintenance_type,
        COUNT(*) as record_count,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1
        AND maintenance_date >= CURRENT_DATE - INTERVAL '12 months'
        AND completed = true
      GROUP BY DATE_TRUNC('month', maintenance_date), maintenance_type
      ORDER BY month DESC, maintenance_type
    `, [tenantId]);

    // Get vehicle count
    const vehicleCount = await queryOne<{ vehicle_count: string }>(`
      SELECT COUNT(*) as vehicle_count
      FROM tenant_vehicles
      WHERE tenant_id = $1 AND is_active = true
    `, [tenantId]);

    const vehicleCountNum = parseInt(vehicleCount?.vehicle_count || '1');
    const totalCost = costs.reduce((sum, row) => sum + parseFloat(row.total_cost), 0);
    const avgPerVehicle = totalCost / vehicleCountNum;

    res.json({
      monthlyCosts: costs,
      summary: {
        totalCost,
        avgPerVehicle,
        vehicleCount: vehicleCountNum,
        recordCount: costs.reduce((sum, row) => sum + parseInt(row.record_count), 0)
      }
    });
    return;
  })
);

/**
 * @route GET /api/tenants/:tenantId/maintenance/providers
 * @desc Get service providers list
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/maintenance/providers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching maintenance providers', { tenantId });

    const providers = await query<{
      service_provider: string;
      provider_contact: string | null;
      service_count: string;
      total_cost: string;
      avg_cost: string;
      last_service_date: Date;
      service_types: string[];
    }>(`
      SELECT
        service_provider,
        provider_contact,
        COUNT(*) as service_count,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost,
        MAX(maintenance_date) as last_service_date,
        ARRAY_AGG(DISTINCT maintenance_type) as service_types
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1
        AND service_provider IS NOT NULL
        AND service_provider != ''
      GROUP BY service_provider, provider_contact
      ORDER BY service_count DESC, last_service_date DESC
    `, [tenantId]);

    res.json({ providers });
    return;
  })
);

export default router;
