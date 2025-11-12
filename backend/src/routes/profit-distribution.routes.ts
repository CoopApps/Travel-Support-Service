import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { query, queryOne } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Co-operative Profit Distribution Routes
 *
 * Provides endpoints for managing profit shares and dividend distributions
 * for worker and passenger cooperatives.
 */

// ============================================================================
// DISTRIBUTION PERIODS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/cooperative/distributions
 * @desc Get all distribution periods
 * @access Protected (Tenant Admin)
 */
router.get(
  '/tenants/:tenantId/cooperative/distributions',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { status, period_type, year } = req.query;

    logger.info('Fetching distribution periods', { tenantId, status, period_type });

    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      conditions.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (period_type) {
      conditions.push(`period_type = $${paramCount++}`);
      params.push(period_type);
    }

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM period_start) = $${paramCount++}`);
      params.push(year);
    }

    const whereClause = conditions.join(' AND ');

    const periods = await query<any>(
      `SELECT * FROM cooperative_distribution_periods
       WHERE ${whereClause}
       ORDER BY period_start DESC`,
      params
    );

    res.json({ periods });
  })
);

/**
 * @route GET /api/tenants/:tenantId/cooperative/distributions/:periodId
 * @desc Get distribution period details with summary
 * @access Protected (Tenant Admin)
 */
router.get(
  '/tenants/:tenantId/cooperative/distributions/:periodId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Fetching distribution period details', { tenantId, periodId });

    const period = await queryOne<any>(
      `SELECT * FROM cooperative_distribution_periods
       WHERE period_id = $1 AND tenant_id = $2`,
      [periodId, tenantId]
    );

    if (!period) {
      throw new NotFoundError('Distribution period not found');
    }

    // Get summary
    const summary = await query<any>(
      'SELECT get_distribution_summary($1) as summary',
      [periodId]
    );

    // Get member distributions
    const distributions = await query<any>(
      `SELECT * FROM v_member_distribution_details
       WHERE period_id = $1
       ORDER BY distribution_amount DESC`,
      [periodId]
    );

    res.json({
      period,
      summary: summary[0]?.summary || {},
      distributions,
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/cooperative/distributions
 * @desc Create a new distribution period
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/distributions',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      period_type,
      period_start,
      period_end,
      total_revenue,
      total_expenses,
      total_profit,
      reserve_percentage,
      distribution_percentage,
      notes,
    } = req.body;

    logger.info('Creating distribution period', { tenantId, period_type });

    if (!period_type || !period_start || !period_end) {
      throw new ValidationError('Period type, start date, and end date are required');
    }

    if (new Date(period_end) <= new Date(period_start)) {
      throw new ValidationError('Period end date must be after start date');
    }

    // Calculate profit if not provided
    const calculatedProfit = total_profit !== undefined
      ? total_profit
      : (total_revenue || 0) - (total_expenses || 0);

    const result = await queryOne<any>(
      `INSERT INTO cooperative_distribution_periods (
        tenant_id, period_type, period_start, period_end,
        total_revenue, total_expenses, total_profit,
        reserve_percentage, distribution_percentage,
        notes, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
      RETURNING *`,
      [
        tenantId,
        period_type,
        period_start,
        period_end,
        total_revenue || null,
        total_expenses || null,
        calculatedProfit,
        reserve_percentage || 20,
        distribution_percentage || 80,
        notes || null,
        (req as any).user?.userId || null,
      ]
    );

    logger.info('Distribution period created', { periodId: result!.period_id });

    res.status(201).json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/cooperative/distributions/:periodId
 * @desc Update distribution period
 * @access Protected (Tenant Admin)
 */
router.put(
  '/tenants/:tenantId/cooperative/distributions/:periodId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;
    const {
      period_type,
      period_start,
      period_end,
      total_revenue,
      total_expenses,
      total_profit,
      reserve_percentage,
      distribution_percentage,
      status,
      notes,
    } = req.body;

    logger.info('Updating distribution period', { tenantId, periodId });

    const existing = await queryOne<any>(
      'SELECT * FROM cooperative_distribution_periods WHERE period_id = $1 AND tenant_id = $2',
      [periodId, tenantId]
    );

    if (!existing) {
      throw new NotFoundError('Distribution period not found');
    }

    if (existing.status === 'distributed') {
      throw new ValidationError('Cannot modify distributed period');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (period_type !== undefined) {
      updates.push(`period_type = $${paramCount++}`);
      params.push(period_type);
    }
    if (period_start !== undefined) {
      updates.push(`period_start = $${paramCount++}`);
      params.push(period_start);
    }
    if (period_end !== undefined) {
      updates.push(`period_end = $${paramCount++}`);
      params.push(period_end);
    }
    if (total_revenue !== undefined) {
      updates.push(`total_revenue = $${paramCount++}`);
      params.push(total_revenue);
    }
    if (total_expenses !== undefined) {
      updates.push(`total_expenses = $${paramCount++}`);
      params.push(total_expenses);
    }
    if (total_profit !== undefined) {
      updates.push(`total_profit = $${paramCount++}`);
      params.push(total_profit);
    }
    if (reserve_percentage !== undefined) {
      updates.push(`reserve_percentage = $${paramCount++}`);
      params.push(reserve_percentage);
    }
    if (distribution_percentage !== undefined) {
      updates.push(`distribution_percentage = $${paramCount++}`);
      params.push(distribution_percentage);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    await query(
      `UPDATE cooperative_distribution_periods SET ${updates.join(', ')}
       WHERE period_id = $${paramCount} AND tenant_id = $${paramCount + 1}`,
      [...params, periodId, tenantId]
    );

    logger.info('Distribution period updated', { periodId });

    res.json({ message: 'Distribution period updated successfully' });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/cooperative/distributions/:periodId
 * @desc Delete distribution period (only draft)
 * @access Protected (Tenant Admin)
 */
router.delete(
  '/tenants/:tenantId/cooperative/distributions/:periodId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Deleting distribution period', { tenantId, periodId });

    const existing = await queryOne<any>(
      'SELECT status FROM cooperative_distribution_periods WHERE period_id = $1 AND tenant_id = $2',
      [periodId, tenantId]
    );

    if (!existing) {
      throw new NotFoundError('Distribution period not found');
    }

    if (existing.status !== 'draft') {
      throw new ValidationError('Only draft periods can be deleted');
    }

    await query(
      'DELETE FROM cooperative_distribution_periods WHERE period_id = $1 AND tenant_id = $2',
      [periodId, tenantId]
    );

    res.json({ message: 'Distribution period deleted successfully' });
  })
);

// ============================================================================
// DISTRIBUTION CALCULATIONS
// ============================================================================

/**
 * @route POST /api/tenants/:tenantId/cooperative/distributions/:periodId/calculate
 * @desc Calculate distributions for all members
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/distributions/:periodId/calculate',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Calculating distributions', { tenantId, periodId });

    const period = await queryOne<any>(
      'SELECT * FROM cooperative_distribution_periods WHERE period_id = $1 AND tenant_id = $2',
      [periodId, tenantId]
    );

    if (!period) {
      throw new NotFoundError('Distribution period not found');
    }

    if (period.status === 'distributed') {
      throw new ValidationError('Cannot recalculate distributed period');
    }

    // Call calculation function
    const result = await query<any>(
      'SELECT calculate_profit_distribution($1) as result',
      [periodId]
    );

    logger.info('Distributions calculated', { result: result[0]?.result });

    res.json({
      message: 'Distributions calculated successfully',
      result: result[0]?.result || {},
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/cooperative/distributions/:periodId/approve
 * @desc Approve calculated distributions
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/distributions/:periodId/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Approving distribution period', { tenantId, periodId });

    const period = await queryOne<any>(
      'SELECT * FROM cooperative_distribution_periods WHERE period_id = $1 AND tenant_id = $2',
      [periodId, tenantId]
    );

    if (!period) {
      throw new NotFoundError('Distribution period not found');
    }

    if (period.status !== 'calculated') {
      throw new ValidationError('Only calculated periods can be approved');
    }

    await query(
      `UPDATE cooperative_distribution_periods
       SET status = 'approved',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP
       WHERE period_id = $2 AND tenant_id = $3`,
      [(req as any).user?.userId || null, periodId, tenantId]
    );

    res.json({ message: 'Distribution period approved successfully' });
  })
);

// ============================================================================
// MEMBER DISTRIBUTIONS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/cooperative/distributions/:periodId/members
 * @desc Get member distributions for a period
 * @access Protected (Tenant Members)
 */
router.get(
  '/tenants/:tenantId/cooperative/distributions/:periodId/members',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Fetching member distributions', { tenantId, periodId });

    const distributions = await query<any>(
      `SELECT * FROM v_member_distribution_details
       WHERE period_id = $1
       ORDER BY distribution_amount DESC`,
      [periodId]
    );

    res.json({ distributions });
  })
);

/**
 * @route POST /api/tenants/:tenantId/cooperative/distributions/members/:distributionId/mark-paid
 * @desc Mark distribution as paid
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/distributions/members/:distributionId/mark-paid',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, distributionId } = req.params;
    const { payment_method, payment_reference } = req.body;

    logger.info('Marking distribution as paid', { tenantId, distributionId });

    if (!payment_method) {
      throw new ValidationError('Payment method is required');
    }

    await query(
      'SELECT mark_distribution_paid($1, $2, $3)',
      [distributionId, payment_method, payment_reference || null]
    );

    res.json({ message: 'Distribution marked as paid' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/cooperative/distributions/my-distributions
 * @desc Get current user's distribution history
 * @access Protected (Tenant Members)
 */
router.get(
  '/tenants/:tenantId/cooperative/distributions/my-distributions',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const userId = (req as any).user?.userId;

    logger.info('Fetching user distributions', { tenantId, userId });

    // Get member ID
    const membership = await queryOne<any>(
      `SELECT membership_id FROM cooperative_membership
       WHERE tenant_id = $1 AND member_reference_id = $2`,
      [tenantId, userId]
    );

    if (!membership) {
      return res.json({ distributions: [] });
    }

    const distributions = await query<any>(
      `SELECT * FROM v_member_distribution_details
       WHERE member_id = $1
       ORDER BY period_start DESC`,
      [membership.membership_id]
    );

    res.json({ distributions });
  })
);

// ============================================================================
// INVESTMENTS (for passenger co-ops)
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/cooperative/investments
 * @desc Get all member investments
 * @access Protected (Tenant Admin)
 */
router.get(
  '/tenants/:tenantId/cooperative/investments',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { member_id, status } = req.query;

    logger.info('Fetching investments', { tenantId, member_id, status });

    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (member_id) {
      conditions.push(`member_id = $${paramCount++}`);
      params.push(member_id);
    }

    if (status) {
      conditions.push(`status = $${paramCount++}`);
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    const investments = await query<any>(
      `SELECT * FROM cooperative_member_investments
       WHERE ${whereClause}
       ORDER BY investment_date DESC`,
      params
    );

    // Get total active investment
    const totals = await queryOne<any>(
      `SELECT
        COALESCE(SUM(investment_amount - returned_amount), 0) as total_invested,
        COALESCE(SUM(investment_amount) FILTER (WHERE status = 'active'), 0) as active_investment,
        COUNT(*) as total_investments
       FROM cooperative_member_investments
       WHERE tenant_id = $1`,
      [tenantId]
    );

    res.json({
      investments,
      totals: {
        total_invested: parseFloat(totals?.total_invested || '0'),
        active_investment: parseFloat(totals?.active_investment || '0'),
        total_investments: parseInt(totals?.total_investments || '0'),
      },
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/cooperative/investments
 * @desc Record a new member investment
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/investments',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      member_id,
      investment_amount,
      investment_date,
      investment_type,
      notes,
    } = req.body;

    logger.info('Recording investment', { tenantId, member_id, investment_amount });

    if (!member_id || !investment_amount || !investment_date) {
      throw new ValidationError('Member ID, investment amount, and investment date are required');
    }

    if (investment_amount <= 0) {
      throw new ValidationError('Investment amount must be positive');
    }

    const result = await queryOne<any>(
      `INSERT INTO cooperative_member_investments (
        tenant_id, member_id, investment_amount, investment_date,
        investment_type, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        tenantId,
        member_id,
        investment_amount,
        investment_date,
        investment_type || 'capital',
        notes || null,
        (req as any).user?.userId || null,
      ]
    );

    logger.info('Investment recorded', { investmentId: result!.investment_id });

    res.status(201).json(result);
  })
);

export default router;
