import express, { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { query, queryOne } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errorTypes';
import { logger } from '../../utils/logger';
import { sanitizeInput } from '../../utils/sanitize';

const router: Router = express.Router();

/**
 * Home Care Visit Routes
 * Manages care visits (scheduled and completed)
 */

/**
 * GET /api/homecare/tenants/:tenantId/visits
 * List all visits for a tenant
 */
router.get(
  '/tenants/:tenantId/visits',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { status, client_id, carer_id, start_date, end_date } = req.query;

    let sql = `
      SELECT
        v.visit_id,
        v.client_id,
        v.carer_id,
        v.scheduled_start,
        v.scheduled_end,
        v.actual_start,
        v.actual_end,
        v.visit_type,
        v.status,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        cr.first_name as carer_first_name,
        cr.last_name as carer_last_name,
        v.created_at
      FROM tenant_care_visits v
      JOIN tenant_care_clients c ON v.client_id = c.client_id AND v.tenant_id = c.tenant_id
      LEFT JOIN tenant_carers cr ON v.carer_id = cr.carer_id AND v.tenant_id = cr.tenant_id
      WHERE v.tenant_id = $1
    `;

    const params: any[] = [tenantId];

    if (status) {
      sql += ` AND v.status = $${params.length + 1}`;
      params.push(status);
    }

    if (client_id) {
      sql += ` AND v.client_id = $${params.length + 1}`;
      params.push(client_id);
    }

    if (carer_id) {
      sql += ` AND v.carer_id = $${params.length + 1}`;
      params.push(carer_id);
    }

    if (start_date) {
      sql += ` AND v.scheduled_start >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND v.scheduled_start <= $${params.length + 1}`;
      params.push(end_date);
    }

    sql += ' ORDER BY v.scheduled_start DESC LIMIT 100';

    const visits = await query(sql, params);

    logger.info(`Listed ${visits.length} visits for tenant ${tenantId}`);
    res.json(visits);
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/visits/today
 * Get today's visits
 */
router.get(
  '/tenants/:tenantId/visits/today',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    const visits = await query(
      `SELECT
        v.visit_id,
        v.client_id,
        v.carer_id,
        v.scheduled_start,
        v.scheduled_end,
        v.actual_start,
        v.actual_end,
        v.visit_type,
        v.status,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.address,
        c.postcode,
        cr.first_name as carer_first_name,
        cr.last_name as carer_last_name
       FROM tenant_care_visits v
       JOIN tenant_care_clients c ON v.client_id = c.client_id AND v.tenant_id = c.tenant_id
       LEFT JOIN tenant_carers cr ON v.carer_id = cr.carer_id AND v.tenant_id = cr.tenant_id
       WHERE v.tenant_id = $1
       AND DATE(v.scheduled_start) = CURRENT_DATE
       ORDER BY v.scheduled_start`,
      [tenantId]
    );

    res.json(visits);
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/visits/:visitId
 * Get a specific visit by ID
 */
router.get(
  '/tenants/:tenantId/visits/:visitId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;

    const visit = await queryOne(
      `SELECT
        v.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.address as client_address,
        c.postcode as client_postcode,
        c.medical_conditions,
        c.mobility_needs,
        cr.first_name as carer_first_name,
        cr.last_name as carer_last_name,
        cr.phone as carer_phone
       FROM tenant_care_visits v
       JOIN tenant_care_clients c ON v.client_id = c.client_id AND v.tenant_id = c.tenant_id
       LEFT JOIN tenant_carers cr ON v.carer_id = cr.carer_id AND v.tenant_id = cr.tenant_id
       WHERE v.tenant_id = $1 AND v.visit_id = $2`,
      [tenantId, visitId]
    );

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    res.json(visit);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/visits
 * Create a new visit
 */
router.post(
  '/tenants/:tenantId/visits',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      client_id,
      carer_id,
      scheduled_start,
      scheduled_end,
      visit_type,
      tasks_planned,
    } = req.body;

    // Validate required fields
    if (!client_id || !scheduled_start || !scheduled_end) {
      throw new ValidationError('Client ID, start time, and end time are required');
    }

    // Check for scheduling conflicts if carer assigned
    if (carer_id) {
      const conflict = await queryOne(
        `SELECT visit_id FROM tenant_care_visits
         WHERE tenant_id = $1
         AND carer_id = $2
         AND status IN ('scheduled', 'confirmed', 'in_progress')
         AND (
           (scheduled_start <= $3 AND scheduled_end > $3) OR
           (scheduled_start < $4 AND scheduled_end >= $4) OR
           (scheduled_start >= $3 AND scheduled_end <= $4)
         )`,
        [tenantId, carer_id, scheduled_start, scheduled_end]
      );

      if (conflict) {
        throw new ConflictError('Carer already has a visit scheduled at this time');
      }
    }

    const result = await queryOne(
      `INSERT INTO tenant_care_visits (
        tenant_id, client_id, carer_id,
        scheduled_start, scheduled_end,
        visit_type, tasks_planned, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'scheduled'
      ) RETURNING *`,
      [
        tenantId,
        client_id,
        carer_id || null,
        scheduled_start,
        scheduled_end,
        visit_type || 'general_care',
        tasks_planned ? JSON.stringify(tasks_planned) : '[]',
      ]
    );

    logger.info(`Created visit ${result.visit_id} for tenant ${tenantId}`);
    res.status(201).json(result);
  })
);

/**
 * PUT /api/homecare/tenants/:tenantId/visits/:visitId
 * Update a visit
 */
router.put(
  '/tenants/:tenantId/visits/:visitId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;
    const {
      carer_id,
      scheduled_start,
      scheduled_end,
      visit_type,
      tasks_planned,
      status,
    } = req.body;

    // Check if visit exists
    const existing = await queryOne(
      'SELECT visit_id FROM tenant_care_visits WHERE tenant_id = $1 AND visit_id = $2',
      [tenantId, visitId]
    );

    if (!existing) {
      throw new NotFoundError('Visit not found');
    }

    const result = await queryOne(
      `UPDATE tenant_care_visits SET
        carer_id = COALESCE($3, carer_id),
        scheduled_start = COALESCE($4, scheduled_start),
        scheduled_end = COALESCE($5, scheduled_end),
        visit_type = COALESCE($6, visit_type),
        tasks_planned = COALESCE($7, tasks_planned),
        status = COALESCE($8, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND visit_id = $2
      RETURNING *`,
      [
        tenantId,
        visitId,
        carer_id,
        scheduled_start,
        scheduled_end,
        visit_type,
        tasks_planned ? JSON.stringify(tasks_planned) : null,
        status,
      ]
    );

    logger.info(`Updated visit ${visitId} for tenant ${tenantId}`);
    res.json(result);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/visits/:visitId/check-in
 * Check in to start a visit
 */
router.post(
  '/tenants/:tenantId/visits/:visitId/check-in',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;
    const { location, latitude, longitude } = req.body;

    const result = await queryOne(
      `UPDATE tenant_care_visits SET
        actual_start = CURRENT_TIMESTAMP,
        check_in_location = $3,
        check_in_lat = $4,
        check_in_lng = $5,
        status = 'in_progress',
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND visit_id = $2
      RETURNING *`,
      [tenantId, visitId, location || null, latitude || null, longitude || null]
    );

    if (!result) {
      throw new NotFoundError('Visit not found');
    }

    logger.info(`Checked in to visit ${visitId} for tenant ${tenantId}`);
    res.json(result);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/visits/:visitId/check-out
 * Check out to complete a visit
 */
router.post(
  '/tenants/:tenantId/visits/:visitId/check-out',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;
    const {
      location,
      latitude,
      longitude,
      tasks_completed,
      notes,
      medication_administered,
      mileage_claimed,
    } = req.body;

    const result = await queryOne(
      `UPDATE tenant_care_visits SET
        actual_end = CURRENT_TIMESTAMP,
        check_out_location = $3,
        check_out_lat = $4,
        check_out_lng = $5,
        tasks_completed = $6,
        notes = $7,
        medication_administered = $8,
        mileage_claimed = $9,
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND visit_id = $2
      AND status = 'in_progress'
      RETURNING *`,
      [
        tenantId,
        visitId,
        location || null,
        latitude || null,
        longitude || null,
        tasks_completed ? JSON.stringify(tasks_completed) : '[]',
        notes ? sanitizeInput(notes) : null,
        medication_administered ? JSON.stringify(medication_administered) : '[]',
        mileage_claimed || null,
      ]
    );

    if (!result) {
      throw new NotFoundError('Visit not found or not in progress');
    }

    logger.info(`Checked out from visit ${visitId} for tenant ${tenantId}`);
    res.json(result);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/visits/:visitId/cancel
 * Cancel a visit
 */
router.post(
  '/tenants/:tenantId/visits/:visitId/cancel',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;
    const { cancellation_reason } = req.body;

    const result = await queryOne(
      `UPDATE tenant_care_visits SET
        status = 'cancelled',
        cancellation_reason = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND visit_id = $2
      AND status IN ('scheduled', 'confirmed')
      RETURNING *`,
      [tenantId, visitId, cancellation_reason ? sanitizeInput(cancellation_reason) : null]
    );

    if (!result) {
      throw new NotFoundError('Visit not found or cannot be cancelled');
    }

    logger.info(`Cancelled visit ${visitId} for tenant ${tenantId}`);
    res.json(result);
  })
);

export default router;
