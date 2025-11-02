import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import {
  DriverTimesheet,
  CreateTimesheetDto,
  UpdateTimesheetDto,
  ApproveTimesheetDto,
  RejectTimesheetDto,
  TimesheetWithDriver,
  TimesheetSummary,
} from '../types/timesheet.types';

const router: Router = express.Router();

/**
 * Timesheet Routes
 *
 * Manages driver timesheets for freelance and hourly workers.
 * Includes submission workflow with draft → submitted → approved → paid status.
 *
 * Database Tables:
 * - tenant_driver_timesheets: Weekly timesheet records
 * - view_pending_timesheet_approvals: View for approval workflow
 */

// ============================================================================
// TIMESHEET ENDPOINTS
// ============================================================================

/**
 * GET /api/tenants/:tenantId/timesheets
 * Get all timesheets for a tenant with optional filters
 */
router.get(
  '/tenants/:tenantId/timesheets',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { driver_id, status, week_starting, week_ending } = req.query;

    logger.info('Fetching timesheets', { tenantId, driver_id, status, week_starting, week_ending });

    let sql = `
      SELECT
        t.*,
        d.name as driver_name,
        d.employment_type,
        d.hourly_rate
      FROM tenant_driver_timesheets t
      INNER JOIN tenant_drivers d ON t.driver_id = d.driver_id
      WHERE t.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (driver_id) {
      sql += ` AND t.driver_id = $${paramIndex}`;
      params.push(driver_id);
      paramIndex++;
    }

    if (status) {
      sql += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (week_starting) {
      sql += ` AND t.week_starting >= $${paramIndex}`;
      params.push(week_starting);
      paramIndex++;
    }

    if (week_ending) {
      sql += ` AND t.week_ending <= $${paramIndex}`;
      params.push(week_ending);
      paramIndex++;
    }

    sql += ' ORDER BY t.week_starting DESC, d.name';

    const timesheets = await query<TimesheetWithDriver>(sql, params);

    res.json(timesheets);
  })
);

/**
 * GET /api/tenants/:tenantId/timesheets/pending
 * Get timesheets pending approval
 */
router.get(
  '/tenants/:tenantId/timesheets/pending',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching pending timesheets', { tenantId });

    const pending = await query<TimesheetWithDriver>(`
      SELECT * FROM view_pending_timesheet_approvals
      WHERE tenant_id = $1
      ORDER BY submitted_at ASC
    `, [tenantId]);

    res.json(pending);
  })
);

/**
 * GET /api/tenants/:tenantId/timesheets/summary
 * Get summary statistics for timesheets
 */
router.get(
  '/tenants/:tenantId/timesheets/summary',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching timesheet summary', { tenantId });

    // Get counts by status
    const totals = await queryOne<{ total_timesheets: number; pending_approval: number; approved_this_week: number }>(`
      SELECT
        COUNT(*)::int as total_timesheets,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END)::int as pending_approval,
        COUNT(CASE
          WHEN status = 'approved'
          AND approved_at >= CURRENT_DATE - INTERVAL '7 days'
          THEN 1
        END)::int as approved_this_week
      FROM tenant_driver_timesheets
      WHERE tenant_id = $1
    `, [tenantId]);

    // Get total hours this week
    const hoursThisWeek = await queryOne<{ total_hours: string }>(`
      SELECT COALESCE(SUM(total_hours), 0) as total_hours
      FROM tenant_driver_timesheets
      WHERE tenant_id = $1
        AND week_starting >= CURRENT_DATE - INTERVAL '7 days'
    `, [tenantId]);

    // Get total pay pending
    const payPending = await queryOne<{ total_pay_pending: string }>(`
      SELECT COALESCE(SUM(total_pay), 0) as total_pay_pending
      FROM tenant_driver_timesheets
      WHERE tenant_id = $1
        AND status IN ('approved')
        AND payroll_period_id IS NULL
    `, [tenantId]);

    // Get by status
    const byStatus = await query<{ status: string; count: number }>(`
      SELECT
        status,
        COUNT(*)::int as count
      FROM tenant_driver_timesheets
      WHERE tenant_id = $1
      GROUP BY status
      ORDER BY count DESC
    `, [tenantId]);

    const summary: TimesheetSummary = {
      total_timesheets: totals?.total_timesheets || 0,
      pending_approval: totals?.pending_approval || 0,
      approved_this_week: totals?.approved_this_week || 0,
      total_hours_this_week: parseFloat(hoursThisWeek?.total_hours || '0'),
      total_pay_pending: parseFloat(payPending?.total_pay_pending || '0'),
      by_status: byStatus.map(s => ({
        status: s.status as any,
        count: s.count,
      })),
    };

    res.json(summary);
  })
);

/**
 * GET /api/tenants/:tenantId/timesheets/:timesheetId
 * Get a specific timesheet
 */
router.get(
  '/tenants/:tenantId/timesheets/:timesheetId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, timesheetId } = req.params;

    logger.info('Fetching timesheet', { tenantId, timesheetId });

    const timesheet = await queryOne<TimesheetWithDriver>(`
      SELECT
        t.*,
        d.name as driver_name,
        d.employment_type,
        d.hourly_rate
      FROM tenant_driver_timesheets t
      INNER JOIN tenant_drivers d ON t.driver_id = d.driver_id
      WHERE t.id = $1 AND t.tenant_id = $2
    `, [timesheetId, tenantId]);

    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    res.json(timesheet);
  })
);

/**
 * POST /api/tenants/:tenantId/timesheets
 * Create a new timesheet
 */
router.post(
  '/tenants/:tenantId/timesheets',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const dto: CreateTimesheetDto = req.body;

    logger.info('Creating timesheet', { tenantId, dto });

    // Validation
    if (!dto.driver_id || !dto.week_starting || !dto.week_ending) {
      throw new ValidationError('Missing required fields: driver_id, week_starting, week_ending');
    }

    // Check for duplicate timesheet for this driver and week
    const existing = await queryOne<{ id: number }>(`
      SELECT id FROM tenant_driver_timesheets
      WHERE tenant_id = $1 AND driver_id = $2 AND week_starting = $3
    `, [tenantId, dto.driver_id, dto.week_starting]);

    if (existing) {
      throw new ValidationError('Timesheet already exists for this driver and week');
    }

    // Verify driver exists
    const driver = await queryOne<{ driver_id: number; hourly_rate?: number }>(`
      SELECT driver_id, hourly_rate FROM tenant_drivers
      WHERE driver_id = $1 AND tenant_id = $2
    `, [dto.driver_id, tenantId]);

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    const newTimesheet = await queryOne<DriverTimesheet>(`
      INSERT INTO tenant_driver_timesheets (
        tenant_id, driver_id, week_starting, week_ending,
        monday_hours, tuesday_hours, wednesday_hours, thursday_hours,
        friday_hours, saturday_hours, sunday_hours,
        notes, driver_notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *
    `, [
      tenantId,
      dto.driver_id,
      dto.week_starting,
      dto.week_ending,
      dto.monday_hours || 0,
      dto.tuesday_hours || 0,
      dto.wednesday_hours || 0,
      dto.thursday_hours || 0,
      dto.friday_hours || 0,
      dto.saturday_hours || 0,
      dto.sunday_hours || 0,
      dto.notes || null,
      dto.driver_notes || null,
      dto.status || 'draft',
    ]);

    logger.info('Timesheet created', { tenantId, timesheetId: newTimesheet?.id });

    res.status(201).json(newTimesheet);
  })
);

/**
 * PUT /api/tenants/:tenantId/timesheets/:timesheetId
 * Update a timesheet (only if not approved or paid)
 */
router.put(
  '/tenants/:tenantId/timesheets/:timesheetId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, timesheetId } = req.params;
    const dto: UpdateTimesheetDto = req.body;

    logger.info('Updating timesheet', { tenantId, timesheetId, dto });

    // Check if timesheet exists and get status
    const existing = await queryOne<{ id: number; status: string }>(`
      SELECT id, status FROM tenant_driver_timesheets
      WHERE id = $1 AND tenant_id = $2
    `, [timesheetId, tenantId]);

    if (!existing) {
      throw new NotFoundError('Timesheet not found');
    }

    // Prevent updates to approved or paid timesheets
    if (existing.status === 'approved' || existing.status === 'paid') {
      throw new ValidationError('Cannot update timesheet that has been approved or paid');
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.week_starting !== undefined) {
      updates.push(`week_starting = $${paramIndex++}`);
      values.push(dto.week_starting);
    }
    if (dto.week_ending !== undefined) {
      updates.push(`week_ending = $${paramIndex++}`);
      values.push(dto.week_ending);
    }
    if (dto.monday_hours !== undefined) {
      updates.push(`monday_hours = $${paramIndex++}`);
      values.push(dto.monday_hours);
    }
    if (dto.tuesday_hours !== undefined) {
      updates.push(`tuesday_hours = $${paramIndex++}`);
      values.push(dto.tuesday_hours);
    }
    if (dto.wednesday_hours !== undefined) {
      updates.push(`wednesday_hours = $${paramIndex++}`);
      values.push(dto.wednesday_hours);
    }
    if (dto.thursday_hours !== undefined) {
      updates.push(`thursday_hours = $${paramIndex++}`);
      values.push(dto.thursday_hours);
    }
    if (dto.friday_hours !== undefined) {
      updates.push(`friday_hours = $${paramIndex++}`);
      values.push(dto.friday_hours);
    }
    if (dto.saturday_hours !== undefined) {
      updates.push(`saturday_hours = $${paramIndex++}`);
      values.push(dto.saturday_hours);
    }
    if (dto.sunday_hours !== undefined) {
      updates.push(`sunday_hours = $${paramIndex++}`);
      values.push(dto.sunday_hours);
    }
    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(dto.notes);
    }
    if (dto.driver_notes !== undefined) {
      updates.push(`driver_notes = $${paramIndex++}`);
      values.push(dto.driver_notes);
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(dto.status);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(timesheetId, tenantId);

    const updatedTimesheet = await queryOne<DriverTimesheet>(`
      UPDATE tenant_driver_timesheets
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
      RETURNING *
    `, values);

    logger.info('Timesheet updated', { tenantId, timesheetId });

    res.json(updatedTimesheet);
  })
);

/**
 * POST /api/tenants/:tenantId/timesheets/:timesheetId/submit
 * Submit a timesheet for approval
 */
router.post(
  '/tenants/:tenantId/timesheets/:timesheetId/submit',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, timesheetId } = req.params;

    logger.info('Submitting timesheet', { tenantId, timesheetId });

    // Check if timesheet exists and is in draft status
    const existing = await queryOne<{ id: number; status: string }>(`
      SELECT id, status FROM tenant_driver_timesheets
      WHERE id = $1 AND tenant_id = $2
    `, [timesheetId, tenantId]);

    if (!existing) {
      throw new NotFoundError('Timesheet not found');
    }

    if (existing.status !== 'draft') {
      throw new ValidationError('Only draft timesheets can be submitted');
    }

    const updatedTimesheet = await queryOne<DriverTimesheet>(`
      UPDATE tenant_driver_timesheets
      SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [timesheetId, tenantId]);

    logger.info('Timesheet submitted', { tenantId, timesheetId });

    res.json(updatedTimesheet);
  })
);

/**
 * POST /api/tenants/:tenantId/timesheets/:timesheetId/approve
 * Approve a submitted timesheet
 */
router.post(
  '/tenants/:tenantId/timesheets/:timesheetId/approve',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, timesheetId } = req.params;
    const dto: ApproveTimesheetDto = req.body;

    logger.info('Approving timesheet', { tenantId, timesheetId, dto });

    // Validation
    if (!dto.approved_by) {
      throw new ValidationError('Missing required field: approved_by');
    }

    // Check if timesheet exists and is submitted
    const existing = await queryOne<{ id: number; status: string }>(`
      SELECT id, status FROM tenant_driver_timesheets
      WHERE id = $1 AND tenant_id = $2
    `, [timesheetId, tenantId]);

    if (!existing) {
      throw new NotFoundError('Timesheet not found');
    }

    if (existing.status !== 'submitted') {
      throw new ValidationError('Only submitted timesheets can be approved');
    }

    const updatedTimesheet = await queryOne<DriverTimesheet>(`
      UPDATE tenant_driver_timesheets
      SET
        status = 'approved',
        approved_at = CURRENT_TIMESTAMP,
        approved_by = $1,
        notes = CASE
          WHEN $2::TEXT IS NOT NULL THEN COALESCE(notes || E'\\n', '') || $2::TEXT
          ELSE notes
        END
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [dto.approved_by, dto.notes || null, timesheetId, tenantId]);

    logger.info('Timesheet approved', { tenantId, timesheetId, approvedBy: dto.approved_by });

    res.json(updatedTimesheet);
  })
);

/**
 * POST /api/tenants/:tenantId/timesheets/:timesheetId/reject
 * Reject a submitted timesheet
 */
router.post(
  '/tenants/:tenantId/timesheets/:timesheetId/reject',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, timesheetId } = req.params;
    const dto: RejectTimesheetDto = req.body;

    logger.info('Rejecting timesheet', { tenantId, timesheetId, dto });

    // Validation
    if (!dto.rejected_by || !dto.rejection_reason) {
      throw new ValidationError('Missing required fields: rejected_by, rejection_reason');
    }

    // Check if timesheet exists and is submitted
    const existing = await queryOne<{ id: number; status: string }>(`
      SELECT id, status FROM tenant_driver_timesheets
      WHERE id = $1 AND tenant_id = $2
    `, [timesheetId, tenantId]);

    if (!existing) {
      throw new NotFoundError('Timesheet not found');
    }

    if (existing.status !== 'submitted') {
      throw new ValidationError('Only submitted timesheets can be rejected');
    }

    const updatedTimesheet = await queryOne<DriverTimesheet>(`
      UPDATE tenant_driver_timesheets
      SET
        status = 'rejected',
        rejected_at = CURRENT_TIMESTAMP,
        rejected_by = $1,
        rejection_reason = $2
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [dto.rejected_by, dto.rejection_reason, timesheetId, tenantId]);

    logger.info('Timesheet rejected', { tenantId, timesheetId, rejectedBy: dto.rejected_by });

    res.json(updatedTimesheet);
  })
);

/**
 * DELETE /api/tenants/:tenantId/timesheets/:timesheetId
 * Delete a timesheet (only if draft or rejected)
 */
router.delete(
  '/tenants/:tenantId/timesheets/:timesheetId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, timesheetId } = req.params;

    logger.info('Deleting timesheet', { tenantId, timesheetId });

    // Check if timesheet exists and get status
    const existing = await queryOne<{ id: number; status: string }>(`
      SELECT id, status FROM tenant_driver_timesheets
      WHERE id = $1 AND tenant_id = $2
    `, [timesheetId, tenantId]);

    if (!existing) {
      throw new NotFoundError('Timesheet not found');
    }

    // Only allow deletion of draft or rejected timesheets
    if (existing.status !== 'draft' && existing.status !== 'rejected') {
      throw new ValidationError('Can only delete draft or rejected timesheets');
    }

    await queryOne<{ id: number }>(`
      DELETE FROM tenant_driver_timesheets
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [timesheetId, tenantId]);

    logger.info('Timesheet deleted', { tenantId, timesheetId });

    res.status(204).send();
  })
);

export default router;
