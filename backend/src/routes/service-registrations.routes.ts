import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, getDbClient } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Service Registrations Routes (Section 22 Community Bus Services)
 *
 * Section 22 permits require registration with traffic commissioner
 * 28-day notice required for start, variation, or cancellation
 *
 * Database Tables:
 * - local_bus_service_registrations
 */

/**
 * @route GET /api/tenants/:tenantId/service-registrations
 * @desc Get all service registrations for tenant
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/service-registrations',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { status, permitId } = req.query;

    logger.info('Fetching service registrations', { tenantId, status, permitId });

    let queryStr = `
      SELECT
        r.*,
        p.permit_number,
        p.organisation_name
      FROM local_bus_service_registrations r
      LEFT JOIN tenant_organizational_permits p
        ON r.permit_id = p.permit_id
      WHERE r.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      queryStr += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (permitId) {
      queryStr += ` AND r.permit_id = $${paramCount}`;
      params.push(permitId);
      paramCount++;
    }

    queryStr += ' ORDER BY r.service_start_date DESC';

    const result = await query(queryStr, params);

    logger.info('Service registrations loaded', {
      tenantId,
      count: result.length,
    });

    res.json(result);
  })
);

/**
 * @route GET /api/tenants/:tenantId/service-registrations/:registrationId
 * @desc Get specific service registration
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/service-registrations/:registrationId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, registrationId } = req.params;

    logger.info('Fetching service registration', { tenantId, registrationId });

    const result = await query(
      `SELECT
        r.*,
        p.permit_number,
        p.organisation_name,
        p.permit_type
      FROM local_bus_service_registrations r
      LEFT JOIN tenant_organizational_permits p
        ON r.permit_id = p.permit_id
      WHERE r.tenant_id = $1 AND r.registration_id = $2`,
      [tenantId, registrationId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Service registration not found');
    }

    res.json(result[0]);
  })
);

/**
 * @route POST /api/tenants/:tenantId/service-registrations
 * @desc Create new service registration
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/service-registrations',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const registrationData = req.body;

    logger.info('Creating service registration', { tenantId });

    // Validate required fields
    const requiredFields = [
      'registration_number',
      'traffic_commissioner_area',
      'route_description',
      'service_start_date',
    ];

    for (const field of requiredFields) {
      if (!registrationData[field]) {
        throw new ValidationError(`${field} is required`);
      }
    }

    // Validate traffic commissioner area
    const validAreas = [
      'North Eastern',
      'North Western',
      'Eastern',
      'West Midlands',
      'Welsh',
      'Western',
      'South Eastern',
      'Scottish',
    ];

    if (!validAreas.includes(registrationData.traffic_commissioner_area)) {
      throw new ValidationError('Invalid traffic commissioner area');
    }

    // Check for duplicate registration number
    const duplicateCheck = await query(
      `SELECT registration_id FROM local_bus_service_registrations
       WHERE tenant_id = $1 AND registration_number = $2`,
      [tenantId, registrationData.registration_number]
    );

    if (duplicateCheck.length > 0) {
      throw new ValidationError('Registration number already exists');
    }

    // Calculate 28-day notice compliance
    const serviceStartDate = new Date(registrationData.service_start_date);
    const today = new Date();
    const daysDifference = Math.ceil(
      (serviceStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDifference < 28) {
      logger.warn('Service start date is less than 28 days from now', {
        tenantId,
        daysDifference,
      });
    }

    const result = await query(
      `INSERT INTO local_bus_service_registrations (
        tenant_id,
        permit_id,
        registration_number,
        traffic_commissioner_area,
        service_name,
        route_description,
        route_number,
        registration_submitted_date,
        service_start_date,
        service_end_date,
        notice_period_days,
        status,
        route_distance_km,
        is_regular_service,
        has_timetable,
        timetable_data,
        stops_data,
        operating_days,
        frequency_description,
        traffic_regulation_conditions,
        traffic_regulation_notes,
        notes,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
      ) RETURNING *`,
      [
        tenantId,
        registrationData.permit_id || null,
        registrationData.registration_number,
        registrationData.traffic_commissioner_area,
        registrationData.service_name || null,
        registrationData.route_description,
        registrationData.route_number || null,
        registrationData.registration_submitted_date || new Date().toISOString().split('T')[0],
        registrationData.service_start_date,
        registrationData.service_end_date || null,
        registrationData.notice_period_days || 28,
        registrationData.status || 'pending',
        registrationData.route_distance_km || null,
        registrationData.is_regular_service !== undefined
          ? registrationData.is_regular_service
          : true,
        registrationData.has_timetable !== undefined ? registrationData.has_timetable : true,
        registrationData.timetable_data
          ? JSON.stringify(registrationData.timetable_data)
          : null,
        registrationData.stops_data ? JSON.stringify(registrationData.stops_data) : null,
        registrationData.operating_days || null,
        registrationData.frequency_description || null,
        registrationData.traffic_regulation_conditions || false,
        registrationData.traffic_regulation_notes || null,
        registrationData.notes || null,
      ]
    );

    logger.info('Service registration created', {
      tenantId,
      registrationId: result[0].registration_id,
    });

    res.status(201).json(result[0]);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/service-registrations/:registrationId
 * @desc Update service registration (variation)
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/service-registrations/:registrationId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, registrationId } = req.params;
    const updateData = req.body;

    logger.info('Updating service registration', { tenantId, registrationId });

    const client = await getDbClient();

    try {
      await client.query('BEGIN');

      // Get existing registration
      const existingResult = await client.query(
        `SELECT * FROM local_bus_service_registrations
         WHERE tenant_id = $1 AND registration_id = $2`,
        [tenantId, registrationId]
      );

      if (existingResult.rows.length === 0) {
        throw new NotFoundError('Service registration not found');
      }

      const existing = existingResult.rows[0];

      // Create variation history entry
      const variationHistory = existing.variation_history || [];
      variationHistory.push({
        date: new Date().toISOString(),
        changes: updateData,
        previous_status: existing.status,
      });

      // Set variation notice date if not already set
      const variationNoticeDate = updateData.variation_notice_date || new Date().toISOString().split('T')[0];

      // Update registration
      const result = await client.query(
        `UPDATE local_bus_service_registrations
         SET service_name = COALESCE($3, service_name),
             route_description = COALESCE($4, route_description),
             route_number = COALESCE($5, route_number),
             service_start_date = COALESCE($6, service_start_date),
             service_end_date = COALESCE($7, service_end_date),
             status = COALESCE($8, status),
             route_distance_km = COALESCE($9, route_distance_km),
             operating_days = COALESCE($10, operating_days),
             frequency_description = COALESCE($11, frequency_description),
             timetable_data = COALESCE($12, timetable_data),
             stops_data = COALESCE($13, stops_data),
             traffic_regulation_conditions = COALESCE($14, traffic_regulation_conditions),
             traffic_regulation_notes = COALESCE($15, traffic_regulation_notes),
             notes = COALESCE($16, notes),
             variation_notice_date = $17,
             variation_history = $18,
             updated_at = NOW()
         WHERE tenant_id = $1 AND registration_id = $2
         RETURNING *`,
        [
          tenantId,
          registrationId,
          updateData.service_name,
          updateData.route_description,
          updateData.route_number,
          updateData.service_start_date,
          updateData.service_end_date,
          updateData.status || 'varied',
          updateData.route_distance_km,
          updateData.operating_days,
          updateData.frequency_description,
          updateData.timetable_data ? JSON.stringify(updateData.timetable_data) : null,
          updateData.stops_data ? JSON.stringify(updateData.stops_data) : null,
          updateData.traffic_regulation_conditions,
          updateData.traffic_regulation_notes,
          updateData.notes,
          variationNoticeDate,
          JSON.stringify(variationHistory),
        ]
      );

      await client.query('COMMIT');

      logger.info('Service registration updated', {
        tenantId,
        registrationId,
      });

      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

/**
 * @route POST /api/tenants/:tenantId/service-registrations/:registrationId/cancel
 * @desc Cancel service registration (28-day notice required)
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/service-registrations/:registrationId/cancel',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, registrationId } = req.params;
    const { cancellation_date, reason } = req.body;

    logger.info('Cancelling service registration', { tenantId, registrationId });

    const cancellationNoticeDate = new Date().toISOString().split('T')[0];
    const effectiveCancellationDate = cancellation_date || null;

    // Validate 28-day notice if cancellation date provided
    if (effectiveCancellationDate) {
      const cancellationDateObj = new Date(effectiveCancellationDate);
      const today = new Date();
      const daysDifference = Math.ceil(
        (cancellationDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDifference < 28) {
        throw new ValidationError(
          '28-day notice period required for service cancellation'
        );
      }
    }

    const result = await query(
      `UPDATE local_bus_service_registrations
       SET status = 'cancelled',
           cancellation_notice_date = $3,
           service_end_date = $4,
           notes = COALESCE(notes || E'\n\n', '') || 'Cancellation reason: ' || $5,
           updated_at = NOW()
       WHERE tenant_id = $1 AND registration_id = $2
       RETURNING *`,
      [
        tenantId,
        registrationId,
        cancellationNoticeDate,
        effectiveCancellationDate,
        reason || 'Not specified',
      ]
    );

    if (result.length === 0) {
      throw new NotFoundError('Service registration not found');
    }

    logger.info('Service registration cancelled', {
      tenantId,
      registrationId,
      cancellationNoticeDate,
    });

    res.json(result[0]);
  })
);

/**
 * @route GET /api/tenants/:tenantId/service-registrations/check-compliance
 * @desc Check compliance with 28-day notice requirements
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/service-registrations/check-compliance',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Checking service registration compliance', { tenantId });

    // Check pending registrations
    const pendingResult = await query(
      `SELECT
        registration_id,
        registration_number,
        service_name,
        service_start_date,
        registration_submitted_date,
        CURRENT_DATE - CAST(service_start_date AS DATE) as days_until_start
       FROM local_bus_service_registrations
       WHERE tenant_id = $1
       AND status = 'pending'
       AND service_start_date >= CURRENT_DATE`,
      [tenantId]
    );

    // Check services requiring variation notice
    const variationsResult = await query(
      `SELECT
        registration_id,
        registration_number,
        service_name,
        variation_notice_date,
        CURRENT_DATE - CAST(variation_notice_date AS DATE) as days_since_variation
       FROM local_bus_service_registrations
       WHERE tenant_id = $1
       AND status = 'varied'
       AND variation_notice_date IS NOT NULL`,
      [tenantId]
    );

    const compliance = {
      pending_registrations: pendingResult.map((row: any) => ({
        ...row,
        compliant: parseInt(row.days_until_start) >= 28,
        days_remaining: parseInt(row.days_until_start),
      })),
      recent_variations: variationsResult.map((row: any) => ({
        ...row,
        compliant: parseInt(row.days_since_variation) >= 28,
      })),
      summary: {
        total_pending: pendingResult.length,
        compliant_pending: pendingResult.filter(
          (row: any) => parseInt(row.days_until_start) >= 28
        ).length,
        non_compliant_pending: pendingResult.filter(
          (row: any) => parseInt(row.days_until_start) < 28
        ).length,
      },
    };

    res.json(compliance);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/service-registrations/:registrationId
 * @desc Delete service registration
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/service-registrations/:registrationId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, registrationId } = req.params;

    logger.info('Deleting service registration', { tenantId, registrationId });

    const result = await query(
      `DELETE FROM local_bus_service_registrations
       WHERE tenant_id = $1 AND registration_id = $2
       RETURNING registration_id`,
      [tenantId, registrationId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Service registration not found');
    }

    logger.info('Service registration deleted', { tenantId, registrationId });

    res.json({ success: true, message: 'Service registration deleted successfully' });
  })
);

export default router;
