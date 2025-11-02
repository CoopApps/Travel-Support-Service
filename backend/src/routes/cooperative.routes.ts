import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { query, queryOne } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import {
  CooperativeMeeting,
  CooperativeReport,
  CooperativeMembership,
  CreateCooperativeMeetingDto,
  UpdateCooperativeMeetingDto,
  CreateCooperativeReportDto,
  CreateCooperativeMembershipDto,
} from '../types/tenant.types';

const router: Router = express.Router();

/**
 * Co-operative Governance Routes
 *
 * Provides endpoints for managing cooperative meetings, reports, and membership
 * for cooperatives to fulfill their governance requirements and maintain discount eligibility.
 */

// ============================================================================
// COOPERATIVE MEETINGS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/cooperative/meetings
 * @desc Get all meetings for a cooperative
 * @access Protected (Tenant Admin)
 */
router.get(
  '/tenants/:tenantId/cooperative/meetings',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { year, meeting_type } = req.query;

    logger.info('Fetching cooperative meetings', { tenantId, year, meeting_type });

    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM scheduled_date) = $${paramCount++}`);
      params.push(year);
    }

    if (meeting_type) {
      conditions.push(`meeting_type = $${paramCount++}`);
      params.push(meeting_type);
    }

    const whereClause = conditions.join(' AND ');

    const meetings = await query<CooperativeMeeting>(
      `SELECT * FROM cooperative_meetings
       WHERE ${whereClause}
       ORDER BY scheduled_date DESC`,
      params
    );

    res.json({ meetings });
  })
);

/**
 * @route POST /api/tenants/:tenantId/cooperative/meetings
 * @desc Schedule a new cooperative meeting
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/meetings',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const meetingData: CreateCooperativeMeetingDto = req.body;

    logger.info('Creating cooperative meeting', { tenantId, meetingType: meetingData.meeting_type });

    if (!meetingData.meeting_type || !meetingData.scheduled_date) {
      throw new ValidationError('Meeting type and scheduled date are required');
    }

    const result = await queryOne<CooperativeMeeting>(
      `INSERT INTO cooperative_meetings (
        tenant_id, meeting_type, scheduled_date, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        tenantId,
        meetingData.meeting_type,
        meetingData.scheduled_date,
        meetingData.notes || null,
        (req as any).user?.userId || null,
      ]
    );

    logger.info('Cooperative meeting created', { meetingId: result!.meeting_id });

    res.status(201).json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/cooperative/meetings/:meetingId
 * @desc Update a cooperative meeting (record attendance, upload minutes)
 * @access Protected (Tenant Admin)
 */
router.put(
  '/tenants/:tenantId/cooperative/meetings/:meetingId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, meetingId } = req.params;
    const meetingData: UpdateCooperativeMeetingDto = req.body;

    logger.info('Updating cooperative meeting', { tenantId, meetingId });

    // Check if meeting exists and belongs to tenant
    const existing = await queryOne<CooperativeMeeting>(
      'SELECT * FROM cooperative_meetings WHERE meeting_id = $1 AND tenant_id = $2',
      [meetingId, tenantId]
    );

    if (!existing) {
      throw new NotFoundError('Meeting not found');
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (meetingData.held_date !== undefined) {
      updates.push(`held_date = $${paramCount++}`);
      params.push(meetingData.held_date);
    }
    if (meetingData.attendees_count !== undefined) {
      updates.push(`attendees_count = $${paramCount++}`);
      params.push(meetingData.attendees_count);
    }
    if (meetingData.quorum_met !== undefined) {
      updates.push(`quorum_met = $${paramCount++}`);
      params.push(meetingData.quorum_met);
    }
    if (meetingData.minutes_url !== undefined) {
      updates.push(`minutes_url = $${paramCount++}`);
      params.push(meetingData.minutes_url);
    }
    if (meetingData.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      params.push(meetingData.notes);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    await query(
      `UPDATE cooperative_meetings SET ${updates.join(', ')} WHERE meeting_id = $${paramCount} AND tenant_id = $${paramCount + 1}`,
      [...params, meetingId, tenantId]
    );

    logger.info('Cooperative meeting updated', { meetingId });

    res.json({ message: 'Meeting updated successfully' });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/cooperative/meetings/:meetingId
 * @desc Delete a scheduled meeting
 * @access Protected (Tenant Admin)
 */
router.delete(
  '/tenants/:tenantId/cooperative/meetings/:meetingId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, meetingId } = req.params;

    logger.info('Deleting cooperative meeting', { tenantId, meetingId });

    const result = await query(
      'DELETE FROM cooperative_meetings WHERE meeting_id = $1 AND tenant_id = $2',
      [meetingId, tenantId]
    );

    if ((result as any).rowCount === 0) {
      throw new NotFoundError('Meeting not found');
    }

    res.json({ message: 'Meeting deleted successfully' });
  })
);

// ============================================================================
// COOPERATIVE REPORTS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/cooperative/reports
 * @desc Get all reports for a cooperative
 * @access Protected (Tenant Admin)
 */
router.get(
  '/tenants/:tenantId/cooperative/reports',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { status, report_type, year } = req.query;

    logger.info('Fetching cooperative reports', { tenantId, status, report_type });

    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      conditions.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (report_type) {
      conditions.push(`report_type = $${paramCount++}`);
      params.push(report_type);
    }

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM period_end) = $${paramCount++}`);
      params.push(year);
    }

    const whereClause = conditions.join(' AND ');

    const reports = await query<CooperativeReport>(
      `SELECT * FROM cooperative_reports
       WHERE ${whereClause}
       ORDER BY period_end DESC`,
      params
    );

    res.json({ reports });
  })
);

/**
 * @route POST /api/tenants/:tenantId/cooperative/reports
 * @desc Submit a new cooperative report
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/reports',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const reportData: CreateCooperativeReportDto = req.body;

    logger.info('Creating cooperative report', { tenantId, reportType: reportData.report_type });

    if (!reportData.report_type || !reportData.period_start || !reportData.period_end) {
      throw new ValidationError('Report type, period start, and period end are required');
    }

    const result = await queryOne<CooperativeReport>(
      `INSERT INTO cooperative_reports (
        tenant_id, report_type, period_start, period_end,
        report_data, notes, status, submitted_date
      ) VALUES ($1, $2, $3, $4, $5, $6, 'submitted', CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        tenantId,
        reportData.report_type,
        reportData.period_start,
        reportData.period_end,
        JSON.stringify(reportData.report_data || {}),
        reportData.notes || null,
      ]
    );

    logger.info('Cooperative report created', { reportId: result!.report_id });

    res.status(201).json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/cooperative/reports/:reportId
 * @desc Update report status (for platform admin approval)
 * @access Protected (Platform Admin / Tenant Admin)
 */
router.put(
  '/tenants/:tenantId/cooperative/reports/:reportId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, reportId } = req.params;
    const { status, notes } = req.body;

    logger.info('Updating cooperative report', { tenantId, reportId, status });

    if (!status) {
      throw new ValidationError('Status is required');
    }

    const result = await query(
      `UPDATE cooperative_reports
       SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
       WHERE report_id = $3 AND tenant_id = $4`,
      [status, notes || null, reportId, tenantId]
    );

    if ((result as any).rowCount === 0) {
      throw new NotFoundError('Report not found');
    }

    res.json({ message: 'Report updated successfully' });
  })
);

// ============================================================================
// COOPERATIVE MEMBERSHIP
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/cooperative/membership
 * @desc Get all members of the cooperative
 * @access Protected (Tenant Admin)
 */
router.get(
  '/tenants/:tenantId/cooperative/membership',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { member_type, is_active } = req.query;

    logger.info('Fetching cooperative membership', { tenantId, member_type, is_active });

    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (member_type) {
      conditions.push(`member_type = $${paramCount++}`);
      params.push(member_type);
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramCount++}`);
      params.push(is_active === 'true');
    }

    const whereClause = conditions.join(' AND ');

    const members = await query<CooperativeMembership>(
      `SELECT * FROM cooperative_membership
       WHERE ${whereClause}
       ORDER BY joined_date DESC`,
      params
    );

    // Get membership statistics
    const stats = await queryOne<any>(
      `SELECT
        COUNT(*) FILTER (WHERE is_active = true) as active_members,
        COUNT(*) FILTER (WHERE member_type = 'driver' AND is_active = true) as driver_members,
        COUNT(*) FILTER (WHERE member_type = 'customer' AND is_active = true) as customer_members,
        SUM(ownership_shares) FILTER (WHERE is_active = true) as total_shares,
        COUNT(*) FILTER (WHERE voting_rights = true AND is_active = true) as voting_members
       FROM cooperative_membership
       WHERE tenant_id = $1`,
      [tenantId]
    );

    res.json({
      members,
      stats: {
        active_members: parseInt(stats?.active_members || '0'),
        driver_members: parseInt(stats?.driver_members || '0'),
        customer_members: parseInt(stats?.customer_members || '0'),
        total_shares: parseInt(stats?.total_shares || '0'),
        voting_members: parseInt(stats?.voting_members || '0'),
      },
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/cooperative/membership
 * @desc Add a new member to the cooperative
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/membership',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const memberData: CreateCooperativeMembershipDto = req.body;

    logger.info('Adding cooperative member', { tenantId, memberType: memberData.member_type });

    if (!memberData.member_type || !memberData.joined_date) {
      throw new ValidationError('Member type and joined date are required');
    }

    const result = await queryOne<CooperativeMembership>(
      `INSERT INTO cooperative_membership (
        tenant_id, member_type, member_reference_id,
        ownership_shares, voting_rights, joined_date, notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *`,
      [
        tenantId,
        memberData.member_type,
        memberData.member_reference_id || null,
        memberData.ownership_shares || 1,
        memberData.voting_rights !== undefined ? memberData.voting_rights : true,
        memberData.joined_date,
        memberData.notes || null,
      ]
    );

    logger.info('Cooperative member added', { membershipId: result!.membership_id });

    res.status(201).json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/cooperative/membership/:membershipId
 * @desc Update member ownership shares or voting rights
 * @access Protected (Tenant Admin)
 */
router.put(
  '/tenants/:tenantId/cooperative/membership/:membershipId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, membershipId } = req.params;
    const { ownership_shares, voting_rights, notes } = req.body;

    logger.info('Updating cooperative membership', { tenantId, membershipId });

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (ownership_shares !== undefined) {
      updates.push(`ownership_shares = $${paramCount++}`);
      params.push(ownership_shares);
    }

    if (voting_rights !== undefined) {
      updates.push(`voting_rights = $${paramCount++}`);
      params.push(voting_rights);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(
      `UPDATE cooperative_membership SET ${updates.join(', ')} WHERE membership_id = $${paramCount} AND tenant_id = $${paramCount + 1}`,
      [...params, membershipId, tenantId]
    );

    if ((result as any).rowCount === 0) {
      throw new NotFoundError('Membership not found');
    }

    res.json({ message: 'Membership updated successfully' });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/cooperative/membership/:membershipId
 * @desc Remove a member from the cooperative (soft delete)
 * @access Protected (Tenant Admin)
 */
router.delete(
  '/tenants/:tenantId/cooperative/membership/:membershipId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, membershipId } = req.params;

    logger.info('Removing cooperative member', { tenantId, membershipId });

    const result = await query(
      `UPDATE cooperative_membership
       SET is_active = false, left_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
       WHERE membership_id = $1 AND tenant_id = $2`,
      [membershipId, tenantId]
    );

    if ((result as any).rowCount === 0) {
      throw new NotFoundError('Membership not found');
    }

    res.json({ message: 'Member removed successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/cooperative/overview
 * @desc Get cooperative overview with compliance status
 * @access Protected (Tenant Admin)
 */
router.get(
  '/tenants/:tenantId/cooperative/overview',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching cooperative overview', { tenantId });

    // Get tenant info
    const tenant = await queryOne<any>(
      `SELECT organization_type, cooperative_model, discount_percentage,
              governance_requirements, enabled_modules
       FROM tenants
       WHERE tenant_id = $1`,
      [tenantId]
    );

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // Get meetings compliance (last 12 months)
    const meetings = await queryOne<any>(
      `SELECT
        COUNT(*) as total_meetings,
        COUNT(*) FILTER (WHERE held_date IS NOT NULL) as held_meetings,
        COUNT(*) FILTER (WHERE quorum_met = true) as quorum_met_meetings
       FROM cooperative_meetings
       WHERE tenant_id = $1
         AND scheduled_date >= CURRENT_DATE - INTERVAL '12 months'`,
      [tenantId]
    );

    // Get reports compliance
    const reports = await queryOne<any>(
      `SELECT
        COUNT(*) as total_reports,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted_reports,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_reports
       FROM cooperative_reports
       WHERE tenant_id = $1
         AND period_end >= CURRENT_DATE - INTERVAL '12 months'`,
      [tenantId]
    );

    // Get membership stats
    const membership = await queryOne<any>(
      `SELECT
        COUNT(*) FILTER (WHERE is_active = true) as active_members,
        COUNT(*) FILTER (WHERE member_type = 'driver' AND is_active = true) as driver_members,
        COUNT(*) FILTER (WHERE member_type = 'customer' AND is_active = true) as customer_members,
        SUM(ownership_shares) FILTER (WHERE is_active = true) as total_shares
       FROM cooperative_membership
       WHERE tenant_id = $1`,
      [tenantId]
    );

    res.json({
      organization_type: tenant.organization_type,
      cooperative_model: tenant.cooperative_model,
      discount_percentage: tenant.discount_percentage,
      governance_requirements: tenant.governance_requirements,
      enabled_modules: tenant.enabled_modules,
      compliance: {
        meetings: {
          total: parseInt(meetings?.total_meetings || '0'),
          held: parseInt(meetings?.held_meetings || '0'),
          quorum_met: parseInt(meetings?.quorum_met_meetings || '0'),
        },
        reports: {
          total: parseInt(reports?.total_reports || '0'),
          submitted: parseInt(reports?.submitted_reports || '0'),
          approved: parseInt(reports?.approved_reports || '0'),
        },
      },
      membership: {
        active: parseInt(membership?.active_members || '0'),
        drivers: parseInt(membership?.driver_members || '0'),
        customers: parseInt(membership?.customer_members || '0'),
        total_shares: parseInt(membership?.total_shares || '0'),
      },
    });
  })
);

export default router;
