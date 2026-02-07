import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest, requireCareWorker } from '../../middleware/verifyTenantAccess';
import { query, queryOne, transaction } from '../../config/database';
import { NotFoundError, ValidationError, VisitConflictError } from '../../utils/errorTypes';
import { logger, careEventLog, auditLog } from '../../utils/logger';
import { sanitizeInput, sanitizeCareNotes } from '../../utils/sanitize';

const router: Router = express.Router();

/**
 * Care Visit Routes for Home Care Co-operative System
 */

/**
 * @route GET /api/tenants/:tenantId/visits
 * @desc Get all visits with filtering
 */
router.get(
  '/tenants/:tenantId/visits',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = 1,
      limit = 50,
      clientId,
      carerId,
      status,
      visitType,
      dateFrom,
      dateTo,
      sortBy = 'scheduled_date',
      sortOrder = 'asc'
    } = req.query;

    const conditions: string[] = ['v.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (clientId) {
      conditions.push(`v.client_id = $${paramCount}`);
      params.push(clientId);
      paramCount++;
    }

    if (carerId) {
      conditions.push(`v.carer_id = $${paramCount}`);
      params.push(carerId);
      paramCount++;
    }

    if (status) {
      conditions.push(`v.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (visitType) {
      conditions.push(`v.visit_type = $${paramCount}`);
      params.push(visitType);
      paramCount++;
    }

    if (dateFrom) {
      conditions.push(`v.scheduled_date >= $${paramCount}`);
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      conditions.push(`v.scheduled_date <= $${paramCount}`);
      params.push(dateTo);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_visits v WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    const validSortColumns: Record<string, string> = {
      scheduled_date: 'v.scheduled_date, v.scheduled_start_time',
      status: 'v.status',
      client_name: 'cl.last_name',
      carer_name: 'c.last_name',
    };
    const sortColumn = validSortColumns[sortBy as string] || 'v.scheduled_date, v.scheduled_start_time';
    const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const offset = (Number(page) - 1) * Number(limit);

    const visits = await query(
      `SELECT
        v.visit_id as id, v.tenant_id, v.client_id, v.carer_id,
        v.scheduled_date, v.scheduled_start_time, v.scheduled_end_time, v.scheduled_duration,
        v.actual_start_time, v.actual_end_time, v.actual_duration,
        v.visit_type, v.status, v.tasks,
        v.check_in_time, v.check_out_time, v.check_in_method,
        cl.first_name as client_first_name, cl.last_name as client_last_name,
        cl.address as client_address, cl.postcode as client_postcode,
        c.first_name as carer_first_name, c.last_name as carer_last_name
      FROM tenant_visits v
      JOIN tenant_clients cl ON v.client_id = cl.client_id AND v.tenant_id = cl.tenant_id
      LEFT JOIN tenant_carers c ON v.carer_id = c.carer_id AND v.tenant_id = c.tenant_id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    res.json({
      visits,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/visits/:visitId
 * @desc Get a specific visit by ID
 */
router.get(
  '/tenants/:tenantId/visits/:visitId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;

    const visit = await queryOne(
      `SELECT
        v.*,
        cl.first_name as client_first_name, cl.last_name as client_last_name,
        cl.address as client_address, cl.postcode as client_postcode,
        cl.phone as client_phone, cl.mobility_level, cl.care_level,
        cl.access_notes, cl.keyholder_details,
        c.first_name as carer_first_name, c.last_name as carer_last_name,
        c.phone as carer_phone
      FROM tenant_visits v
      JOIN tenant_clients cl ON v.client_id = cl.client_id AND v.tenant_id = cl.tenant_id
      LEFT JOIN tenant_carers c ON v.carer_id = c.carer_id AND v.tenant_id = c.tenant_id
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
 * @route POST /api/tenants/:tenantId/visits
 * @desc Create a new visit
 */
router.post(
  '/tenants/:tenantId/visits',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;
    const visitData = req.body;

    if (!visitData.clientId) {
      throw new ValidationError('Client ID is required');
    }

    if (!visitData.scheduledDate || !visitData.scheduledStartTime || !visitData.scheduledEndTime) {
      throw new ValidationError('Scheduled date and times are required');
    }

    // Check for conflicts if carer is assigned
    if (visitData.carerId) {
      const conflict = await queryOne(
        `SELECT visit_id FROM tenant_visits
         WHERE tenant_id = $1 AND carer_id = $2
           AND scheduled_date = $3
           AND status NOT IN ('cancelled')
           AND (
             (scheduled_start_time <= $4 AND scheduled_end_time > $4) OR
             (scheduled_start_time < $5 AND scheduled_end_time >= $5) OR
             (scheduled_start_time >= $4 AND scheduled_end_time <= $5)
           )`,
        [tenantId, visitData.carerId, visitData.scheduledDate, visitData.scheduledStartTime, visitData.scheduledEndTime]
      );

      if (conflict) {
        throw new VisitConflictError('Carer already has a visit scheduled at this time');
      }
    }

    // Calculate duration
    const [startHour, startMin] = visitData.scheduledStartTime.split(':').map(Number);
    const [endHour, endMin] = visitData.scheduledEndTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    const result = await queryOne<{ id: number }>(
      `INSERT INTO tenant_visits (
        tenant_id, client_id, carer_id,
        scheduled_date, scheduled_start_time, scheduled_end_time, scheduled_duration,
        visit_type, care_plan_id, tasks,
        pre_visit_notes, status, check_in_method,
        created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled', 'app',
        NOW(), NOW(), $12
      ) RETURNING visit_id as id`,
      [
        tenantId, visitData.clientId, visitData.carerId || null,
        visitData.scheduledDate, visitData.scheduledStartTime, visitData.scheduledEndTime, duration,
        visitData.visitType || 'regular',
        visitData.carePlanId || null,
        JSON.stringify(visitData.tasks || []),
        sanitizeCareNotes(visitData.preVisitNotes),
        user.userId,
      ]
    );

    careEventLog('VISIT_CREATED', {
      tenantId,
      visitId: result?.id,
      clientId: visitData.clientId,
      carerId: visitData.carerId,
      scheduledDate: visitData.scheduledDate,
      createdBy: user.userId,
    });

    res.status(201).json({
      id: result?.id,
      message: 'Visit created successfully',
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/visits/:visitId
 * @desc Update a visit
 */
router.put(
  '/tenants/:tenantId/visits/:visitId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;
    const user = req.user!;
    const visitData = req.body;

    const existing = await queryOne<{ status: string }>(
      'SELECT status FROM tenant_visits WHERE tenant_id = $1 AND visit_id = $2',
      [tenantId, visitId]
    );

    if (!existing) {
      throw new NotFoundError('Visit not found');
    }

    if (existing.status === 'completed') {
      throw new ValidationError('Cannot modify a completed visit');
    }

    await query(
      `UPDATE tenant_visits SET
        carer_id = COALESCE($3, carer_id),
        scheduled_date = COALESCE($4, scheduled_date),
        scheduled_start_time = COALESCE($5, scheduled_start_time),
        scheduled_end_time = COALESCE($6, scheduled_end_time),
        visit_type = COALESCE($7, visit_type),
        tasks = COALESCE($8, tasks),
        pre_visit_notes = COALESCE($9, pre_visit_notes),
        status = COALESCE($10, status),
        updated_at = NOW(),
        updated_by = $11
      WHERE tenant_id = $1 AND visit_id = $2`,
      [
        tenantId, visitId,
        visitData.carerId,
        visitData.scheduledDate,
        visitData.scheduledStartTime,
        visitData.scheduledEndTime,
        visitData.visitType,
        visitData.tasks ? JSON.stringify(visitData.tasks) : null,
        visitData.preVisitNotes ? sanitizeCareNotes(visitData.preVisitNotes) : null,
        visitData.status,
        user.userId,
      ]
    );

    careEventLog('VISIT_UPDATED', {
      tenantId,
      visitId,
      updatedBy: user.userId,
    });

    res.json({ message: 'Visit updated successfully' });
  })
);

/**
 * @route POST /api/tenants/:tenantId/visits/:visitId/check-in
 * @desc Check in to a visit (start visit)
 */
router.post(
  '/tenants/:tenantId/visits/:visitId/check-in',
  verifyTenantAccess,
  requireCareWorker(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;
    const user = req.user!;
    const { location, method = 'app' } = req.body;

    const visit = await queryOne<{ status: string; carer_id: number }>(
      'SELECT status, carer_id FROM tenant_visits WHERE tenant_id = $1 AND visit_id = $2',
      [tenantId, visitId]
    );

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    if (visit.status !== 'scheduled' && visit.status !== 'confirmed') {
      throw new ValidationError(`Cannot check in to a visit with status: ${visit.status}`);
    }

    await query(
      `UPDATE tenant_visits SET
        status = 'in_progress',
        actual_start_time = NOW(),
        check_in_time = NOW(),
        check_in_location = $3,
        check_in_method = $4,
        actual_carer_id = $5,
        updated_at = NOW()
      WHERE tenant_id = $1 AND visit_id = $2`,
      [tenantId, visitId, location ? JSON.stringify(location) : null, method, user.carerId || visit.carer_id]
    );

    careEventLog('VISIT_CHECK_IN', {
      tenantId,
      visitId,
      carerId: user.carerId || visit.carer_id,
      method,
      location,
    });

    res.json({ message: 'Checked in successfully' });
  })
);

/**
 * @route POST /api/tenants/:tenantId/visits/:visitId/check-out
 * @desc Check out of a visit (complete visit)
 */
router.post(
  '/tenants/:tenantId/visits/:visitId/check-out',
  verifyTenantAccess,
  requireCareWorker(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;
    const user = req.user!;
    const {
      tasks,
      visitNotes,
      privateNotes,
      alerts,
      medicationsAdministered,
      clientSignature,
      carerSignature,
      milesClaimed,
      location
    } = req.body;

    const visit = await queryOne<{ status: string; check_in_time: Date }>(
      'SELECT status, check_in_time FROM tenant_visits WHERE tenant_id = $1 AND visit_id = $2',
      [tenantId, visitId]
    );

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    if (visit.status !== 'in_progress') {
      throw new ValidationError(`Cannot check out of a visit with status: ${visit.status}`);
    }

    // Calculate actual duration
    const checkInTime = new Date(visit.check_in_time);
    const checkOutTime = new Date();
    const actualDuration = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

    // Check for safeguarding concerns in alerts
    const hasSafeguardingConcern = alerts?.some((a: any) => a.type === 'safeguarding' || a.severity === 'urgent');

    await query(
      `UPDATE tenant_visits SET
        status = 'completed',
        actual_end_time = NOW(),
        actual_duration = $3,
        check_out_time = NOW(),
        check_out_location = $4,
        tasks = COALESCE($5, tasks),
        visit_notes = $6,
        private_notes = $7,
        alerts = $8,
        medications_administered = $9,
        client_signature = $10,
        carer_signature = $11,
        miles_claimed = $12,
        safeguarding_concern = $13,
        updated_at = NOW()
      WHERE tenant_id = $1 AND visit_id = $2`,
      [
        tenantId, visitId,
        actualDuration,
        location ? JSON.stringify(location) : null,
        tasks ? JSON.stringify(tasks) : null,
        sanitizeCareNotes(visitNotes),
        sanitizeCareNotes(privateNotes),
        alerts ? JSON.stringify(alerts) : null,
        medicationsAdministered ? JSON.stringify(medicationsAdministered) : null,
        clientSignature,
        carerSignature,
        milesClaimed,
        hasSafeguardingConcern || false,
      ]
    );

    careEventLog('VISIT_COMPLETED', {
      tenantId,
      visitId,
      carerId: user.carerId,
      actualDuration,
      hasSafeguardingConcern,
    });

    // If there's a safeguarding concern, log it separately
    if (hasSafeguardingConcern) {
      auditLog('SAFEGUARDING_CONCERN', {
        tenantId,
        visitId,
        reportedBy: user.carerId,
        alerts,
      });
    }

    res.json({
      message: 'Visit completed successfully',
      duration: actualDuration,
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/visits/:visitId/cancel
 * @desc Cancel a visit
 */
router.post(
  '/tenants/:tenantId/visits/:visitId/cancel',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, visitId } = req.params;
    const user = req.user!;
    const { reason } = req.body;

    if (!reason) {
      throw new ValidationError('Cancellation reason is required');
    }

    const visit = await queryOne<{ status: string }>(
      'SELECT status FROM tenant_visits WHERE tenant_id = $1 AND visit_id = $2',
      [tenantId, visitId]
    );

    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    if (visit.status === 'completed') {
      throw new ValidationError('Cannot cancel a completed visit');
    }

    await query(
      `UPDATE tenant_visits SET
        status = 'cancelled',
        cancellation_reason = $3,
        cancelled_by = $4,
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE tenant_id = $1 AND visit_id = $2`,
      [tenantId, visitId, sanitizeInput(reason, { maxLength: 500 }), user.userId]
    );

    careEventLog('VISIT_CANCELLED', {
      tenantId,
      visitId,
      reason,
      cancelledBy: user.userId,
    });

    res.json({ message: 'Visit cancelled successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/visits/today
 * @desc Get today's visits
 */
router.get(
  '/tenants/:tenantId/visits/today',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;

    // If user is a carer, only show their visits
    const carerCondition = user.carerId ? 'AND v.carer_id = $2' : '';
    const params = user.carerId ? [tenantId, user.carerId] : [tenantId];

    const visits = await query(
      `SELECT
        v.visit_id as id, v.client_id, v.carer_id,
        v.scheduled_start_time, v.scheduled_end_time, v.scheduled_duration,
        v.status, v.visit_type, v.tasks,
        cl.first_name as client_first_name, cl.last_name as client_last_name,
        cl.address as client_address, cl.postcode as client_postcode,
        cl.phone as client_phone, cl.access_notes,
        c.first_name as carer_first_name, c.last_name as carer_last_name
      FROM tenant_visits v
      JOIN tenant_clients cl ON v.client_id = cl.client_id AND v.tenant_id = cl.tenant_id
      LEFT JOIN tenant_carers c ON v.carer_id = c.carer_id AND v.tenant_id = c.tenant_id
      WHERE v.tenant_id = $1 AND v.scheduled_date = CURRENT_DATE ${carerCondition}
      ORDER BY v.scheduled_start_time`,
      params
    );

    res.json({ visits, date: new Date().toISOString().split('T')[0] });
  })
);

export default router;
