import express, { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest, requireMember } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger, auditLog } from '../utils/logger';
import { sanitizeInput, sanitizeEmail } from '../utils/sanitize';

const router: Router = express.Router();

/**
 * Co-operative Member Routes for Home Care Co-operative System
 *
 * Manages worker-owner membership in the co-operative.
 */

/**
 * @route GET /api/tenants/:tenantId/members
 * @desc Get all co-op members
 */
router.get(
  '/tenants/:tenantId/members',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { status, page = 1, limit = 50 } = req.query;

    const conditions: string[] = ['m.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      conditions.push(`m.member_status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (Number(page) - 1) * Number(limit);

    const members = await query(
      `SELECT
        m.member_id as id, m.user_id, m.carer_id,
        m.member_number, m.member_status,
        m.share_capital, m.shares_held,
        m.join_date, m.probation_end_date,
        m.voting_rights, m.board_member,
        c.first_name, c.last_name, c.email
      FROM tenant_members m
      LEFT JOIN tenant_carers c ON m.carer_id = c.carer_id AND m.tenant_id = c.tenant_id
      WHERE ${whereClause}
      ORDER BY m.join_date DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    // Get summary stats
    const stats = await queryOne<{
      total_members: string;
      active_members: string;
      total_share_capital: string;
    }>(
      `SELECT
        COUNT(*) as total_members,
        COUNT(*) FILTER (WHERE member_status = 'active') as active_members,
        COALESCE(SUM(share_capital), 0) as total_share_capital
      FROM tenant_members WHERE tenant_id = $1`,
      [tenantId]
    );

    res.json({
      members,
      stats: {
        totalMembers: parseInt(stats?.total_members || '0', 10),
        activeMembers: parseInt(stats?.active_members || '0', 10),
        totalShareCapital: parseFloat(stats?.total_share_capital || '0'),
      },
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/members/:memberId
 * @desc Get a specific member
 */
router.get(
  '/tenants/:tenantId/members/:memberId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, memberId } = req.params;

    const member = await queryOne(
      `SELECT
        m.*,
        c.first_name, c.last_name, c.email, c.phone,
        c.start_date as employment_start_date,
        u.username, u.last_login
      FROM tenant_members m
      LEFT JOIN tenant_carers c ON m.carer_id = c.carer_id AND m.tenant_id = c.tenant_id
      LEFT JOIN tenant_users u ON m.user_id = u.user_id AND m.tenant_id = u.tenant_id
      WHERE m.tenant_id = $1 AND m.member_id = $2`,
      [tenantId, memberId]
    );

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    res.json(member);
  })
);

/**
 * @route POST /api/tenants/:tenantId/members
 * @desc Create a new member (enroll carer as co-op member)
 */
router.post(
  '/tenants/:tenantId/members',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;
    const memberData = req.body;

    if (!memberData.carerId) {
      throw new ValidationError('Carer ID is required to create a member');
    }

    // Check if carer exists
    const carer = await queryOne<{ user_id: number; first_name: string; last_name: string }>(
      'SELECT user_id, first_name, last_name FROM tenant_carers WHERE tenant_id = $1 AND carer_id = $2 AND is_active = true',
      [tenantId, memberData.carerId]
    );

    if (!carer) {
      throw new NotFoundError('Carer not found');
    }

    // Check if already a member
    const existingMember = await queryOne(
      'SELECT member_id FROM tenant_members WHERE tenant_id = $1 AND carer_id = $2',
      [tenantId, memberData.carerId]
    );

    if (existingMember) {
      throw new ValidationError('This carer is already a member');
    }

    // Generate member number
    const lastMember = await queryOne<{ member_number: string }>(
      'SELECT member_number FROM tenant_members WHERE tenant_id = $1 ORDER BY member_id DESC LIMIT 1',
      [tenantId]
    );

    const nextNumber = lastMember
      ? String(parseInt(lastMember.member_number.replace(/\D/g, ''), 10) + 1).padStart(4, '0')
      : '0001';
    const memberNumber = `M${nextNumber}`;

    const result = await queryOne<{ id: number }>(
      `INSERT INTO tenant_members (
        tenant_id, user_id, carer_id, member_number,
        member_status, share_capital, shares_held,
        join_date, probation_end_date,
        voting_rights, board_member,
        created_at, created_by
      ) VALUES (
        $1, $2, $3, $4,
        'probationary', $5, 1,
        CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months',
        false, false,
        NOW(), $6
      ) RETURNING member_id as id`,
      [
        tenantId,
        carer.user_id,
        memberData.carerId,
        memberNumber,
        memberData.initialShareCapital || 0,
        user.userId,
      ]
    );

    // Link member to carer
    await query(
      'UPDATE tenant_carers SET member_id = $1 WHERE tenant_id = $2 AND carer_id = $3',
      [result?.id, tenantId, memberData.carerId]
    );

    auditLog('MEMBER_CREATED', {
      tenantId,
      memberId: result?.id,
      memberNumber,
      carerId: memberData.carerId,
      carerName: `${carer.first_name} ${carer.last_name}`,
      createdBy: user.userId,
    });

    res.status(201).json({
      id: result?.id,
      memberNumber,
      message: 'Member enrolled successfully',
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/members/:memberId/status
 * @desc Update member status (e.g., probationary -> active)
 */
router.put(
  '/tenants/:tenantId/members/:memberId/status',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, memberId } = req.params;
    const user = req.user!;
    const { status, reason } = req.body;

    const validStatuses = ['probationary', 'active', 'suspended', 'resigned', 'expelled'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const existing = await queryOne(
      'SELECT member_status FROM tenant_members WHERE tenant_id = $1 AND member_id = $2',
      [tenantId, memberId]
    );

    if (!existing) {
      throw new NotFoundError('Member not found');
    }

    // If becoming active, grant voting rights
    const votingRights = status === 'active';

    await query(
      `UPDATE tenant_members SET
        member_status = $3,
        voting_rights = $4,
        status_change_reason = $5,
        status_changed_at = NOW(),
        status_changed_by = $6
      WHERE tenant_id = $1 AND member_id = $2`,
      [tenantId, memberId, status, votingRights, sanitizeInput(reason, { maxLength: 500 }), user.userId]
    );

    auditLog('MEMBER_STATUS_CHANGED', {
      tenantId,
      memberId,
      previousStatus: existing.member_status,
      newStatus: status,
      reason,
      changedBy: user.userId,
    });

    res.json({ message: 'Member status updated successfully' });
  })
);

/**
 * @route POST /api/tenants/:tenantId/members/:memberId/shares
 * @desc Add or update share capital
 */
router.post(
  '/tenants/:tenantId/members/:memberId/shares',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, memberId } = req.params;
    const user = req.user!;
    const { amount, type, notes } = req.body;

    if (!amount || amount <= 0) {
      throw new ValidationError('Amount must be positive');
    }

    const validTypes = ['buy_in', 'additional', 'dividend_reinvestment', 'withdrawal'];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const member = await queryOne<{ share_capital: number }>(
      'SELECT share_capital FROM tenant_members WHERE tenant_id = $1 AND member_id = $2',
      [tenantId, memberId]
    );

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const adjustment = type === 'withdrawal' ? -amount : amount;
    const newTotal = parseFloat(member.share_capital.toString()) + adjustment;

    if (newTotal < 0) {
      throw new ValidationError('Withdrawal would result in negative share capital');
    }

    // Update share capital
    await query(
      'UPDATE tenant_members SET share_capital = $3 WHERE tenant_id = $1 AND member_id = $2',
      [tenantId, memberId, newTotal]
    );

    // Record transaction
    await query(
      `INSERT INTO tenant_share_transactions (
        tenant_id, member_id, transaction_type, amount,
        balance_after, notes, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [tenantId, memberId, type, adjustment, newTotal, sanitizeInput(notes, { maxLength: 500 }), user.userId]
    );

    auditLog('SHARE_TRANSACTION', {
      tenantId,
      memberId,
      type,
      amount: adjustment,
      newBalance: newTotal,
      processedBy: user.userId,
    });

    res.json({
      message: 'Share capital updated successfully',
      newBalance: newTotal,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/members/me
 * @desc Get current user's membership details
 */
router.get(
  '/tenants/:tenantId/members/me',
  verifyTenantAccess,
  requireMember(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;

    const member = await queryOne(
      `SELECT
        m.*,
        c.first_name, c.last_name
      FROM tenant_members m
      LEFT JOIN tenant_carers c ON m.carer_id = c.carer_id AND m.tenant_id = c.tenant_id
      WHERE m.tenant_id = $1 AND m.member_id = $2`,
      [tenantId, user.memberId]
    );

    if (!member) {
      throw new NotFoundError('Membership not found');
    }

    // Get dividend history
    const dividends = await query(
      `SELECT
        dividend_id as id, amount, dividend_period,
        calculation_date, payment_date, status
      FROM tenant_member_dividends
      WHERE tenant_id = $1 AND member_id = $2
      ORDER BY calculation_date DESC
      LIMIT 10`,
      [tenantId, user.memberId]
    );

    res.json({
      membership: member,
      dividends,
    });
  })
);

export default router;
