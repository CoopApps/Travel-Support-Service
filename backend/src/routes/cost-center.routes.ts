import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import {
  CostCenter,
  CreateCostCenterDto,
  UpdateCostCenterDto,
  CostCenterExpense,
  CreateCostCenterExpenseDto,
  UpdateCostCenterExpenseDto,
  CostCenterUtilization,
  CostCenterSummary,
} from '../types/cost-center.types';

const router: Router = express.Router();

/**
 * Cost Center Routes
 *
 * Manages cost centers for budget tracking and expense allocation across
 * different business areas (operations, fleet, compliance, etc.)
 *
 * Database Tables:
 * - tenant_cost_centers: Cost center definitions
 * - tenant_cost_center_expenses: Individual expense records
 * - view_cost_center_utilization: Budget vs spend analysis
 */

// ============================================================================
// COST CENTER ENDPOINTS
// ============================================================================

/**
 * GET /api/tenants/:tenantId/cost-centers
 * Get all cost centers for a tenant
 */
router.get(
  '/tenants/:tenantId/cost-centers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { category, is_active } = req.query;

    logger.info('Fetching cost centers', { tenantId, category, is_active });

    let sql = `
      SELECT * FROM tenant_cost_centers
      WHERE tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (is_active !== undefined) {
      sql += ` AND is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    sql += ' ORDER BY code';

    const costCenters = await query<CostCenter>(sql, params);

    res.json(costCenters);
  })
);

/**
 * GET /api/tenants/:tenantId/cost-centers/utilization
 * Get cost center utilization with budget vs spend analysis
 */
router.get(
  '/tenants/:tenantId/cost-centers/utilization',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching cost center utilization', { tenantId });

    const utilization = await query<CostCenterUtilization>(`
      SELECT * FROM view_cost_center_utilization
      WHERE tenant_id = $1
      ORDER BY code
    `, [tenantId]);

    res.json(utilization);
  })
);

/**
 * GET /api/tenants/:tenantId/cost-centers/summary
 * Get summary statistics for cost centers
 */
router.get(
  '/tenants/:tenantId/cost-centers/summary',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching cost center summary', { tenantId });

    // Get total and active counts
    const counts = await queryOne<{ total_cost_centers: number; active_cost_centers: number }>(`
      SELECT
        COUNT(*)::int as total_cost_centers,
        COUNT(CASE WHEN is_active = true THEN 1 END)::int as active_cost_centers
      FROM tenant_cost_centers
      WHERE tenant_id = $1
    `, [tenantId]);

    // Get budget totals
    const budgets = await queryOne<{ total_budget_annual: string; total_spent_ytd: string; total_spent_this_month: string }>(`
      SELECT
        COALESCE(SUM(budget_annual), 0) as total_budget_annual,
        COALESCE(SUM(total_spent_ytd), 0) as total_spent_ytd,
        COALESCE(SUM(total_spent_this_month), 0) as total_spent_this_month
      FROM view_cost_center_utilization
      WHERE tenant_id = $1
    `, [tenantId]);

    // Get by category
    const byCategory = await query<{ category: string; count: number; budget: string; spent: string }>(`
      SELECT
        cc.category,
        COUNT(*)::int as count,
        COALESCE(SUM(cc.budget_annual), 0) as budget,
        COALESCE(SUM(COALESCE(e.total_spent, 0)), 0) as spent
      FROM tenant_cost_centers cc
      LEFT JOIN (
        SELECT cost_center_id, SUM(amount) as total_spent
        FROM tenant_cost_center_expenses
        WHERE tenant_id = $1
        GROUP BY cost_center_id
      ) e ON cc.id = e.cost_center_id
      WHERE cc.tenant_id = $1 AND cc.is_active = true
      GROUP BY cc.category
      ORDER BY count DESC
    `, [tenantId]);

    const summary: CostCenterSummary = {
      total_cost_centers: counts?.total_cost_centers || 0,
      active_cost_centers: counts?.active_cost_centers || 0,
      total_budget_annual: parseFloat(budgets?.total_budget_annual || '0'),
      total_spent_ytd: parseFloat(budgets?.total_spent_ytd || '0'),
      total_spent_this_month: parseFloat(budgets?.total_spent_this_month || '0'),
      by_category: byCategory.map(c => ({
        category: c.category as any,
        count: c.count,
        budget: parseFloat(c.budget),
        spent: parseFloat(c.spent),
      })),
    };

    res.json(summary);
  })
);

/**
 * GET /api/tenants/:tenantId/cost-centers/:costCenterId
 * Get a specific cost center
 */
router.get(
  '/tenants/:tenantId/cost-centers/:costCenterId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, costCenterId } = req.params;

    logger.info('Fetching cost center', { tenantId, costCenterId });

    const costCenter = await queryOne<CostCenter>(`
      SELECT * FROM tenant_cost_centers
      WHERE id = $1 AND tenant_id = $2
    `, [costCenterId, tenantId]);

    if (!costCenter) {
      throw new NotFoundError('Cost center not found');
    }

    res.json(costCenter);
  })
);

/**
 * POST /api/tenants/:tenantId/cost-centers
 * Create a new cost center
 */
router.post(
  '/tenants/:tenantId/cost-centers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const dto: CreateCostCenterDto = req.body;

    logger.info('Creating cost center', { tenantId, dto });

    // Validation
    if (!dto.code || !dto.name || !dto.category) {
      throw new ValidationError('Missing required fields: code, name, category');
    }

    // Check for duplicate code
    const existing = await queryOne<{ id: number }>(`
      SELECT id FROM tenant_cost_centers
      WHERE tenant_id = $1 AND code = $2
    `, [tenantId, dto.code]);

    if (existing) {
      throw new ValidationError('Cost center code already exists');
    }

    const newCostCenter = await queryOne<CostCenter>(`
      INSERT INTO tenant_cost_centers (
        tenant_id, code, name, description, category,
        budget_annual, budget_monthly, owner_id, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING *
    `, [
      tenantId,
      dto.code,
      dto.name,
      dto.description || null,
      dto.category,
      dto.budget_annual || null,
      dto.budget_monthly || null,
      dto.owner_id || null,
      dto.is_active !== undefined ? dto.is_active : true,
    ]);

    logger.info('Cost center created', { tenantId, costCenterId: newCostCenter?.id });

    res.status(201).json(newCostCenter);
  })
);

/**
 * PUT /api/tenants/:tenantId/cost-centers/:costCenterId
 * Update a cost center
 */
router.put(
  '/tenants/:tenantId/cost-centers/:costCenterId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, costCenterId } = req.params;
    const dto: UpdateCostCenterDto = req.body;

    logger.info('Updating cost center', { tenantId, costCenterId, dto });

    // Check if cost center exists
    const existing = await queryOne<{ id: number }>(`
      SELECT id FROM tenant_cost_centers
      WHERE id = $1 AND tenant_id = $2
    `, [costCenterId, tenantId]);

    if (!existing) {
      throw new NotFoundError('Cost center not found');
    }

    // Check for duplicate code if being updated
    if (dto.code) {
      const duplicate = await queryOne<{ id: number }>(`
        SELECT id FROM tenant_cost_centers
        WHERE tenant_id = $1 AND code = $2 AND id != $3
      `, [tenantId, dto.code, costCenterId]);

      if (duplicate) {
        throw new ValidationError('Cost center code already exists');
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      values.push(dto.code);
    }
    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }
    if (dto.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(dto.category);
    }
    if (dto.budget_annual !== undefined) {
      updates.push(`budget_annual = $${paramIndex++}`);
      values.push(dto.budget_annual);
    }
    if (dto.budget_monthly !== undefined) {
      updates.push(`budget_monthly = $${paramIndex++}`);
      values.push(dto.budget_monthly);
    }
    if (dto.owner_id !== undefined) {
      updates.push(`owner_id = $${paramIndex++}`);
      values.push(dto.owner_id);
    }
    if (dto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(dto.is_active);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(costCenterId, tenantId);

    const updatedCostCenter = await queryOne<CostCenter>(`
      UPDATE tenant_cost_centers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
      RETURNING *
    `, values);

    logger.info('Cost center updated', { tenantId, costCenterId });

    res.json(updatedCostCenter);
  })
);

/**
 * DELETE /api/tenants/:tenantId/cost-centers/:costCenterId
 * Delete a cost center
 */
router.delete(
  '/tenants/:tenantId/cost-centers/:costCenterId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, costCenterId } = req.params;

    logger.info('Deleting cost center', { tenantId, costCenterId });

    const result = await queryOne<{ id: number }>(`
      DELETE FROM tenant_cost_centers
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [costCenterId, tenantId]);

    if (!result) {
      throw new NotFoundError('Cost center not found');
    }

    logger.info('Cost center deleted', { tenantId, costCenterId });

    res.status(204).send();
  })
);

// ============================================================================
// COST CENTER EXPENSE ENDPOINTS
// ============================================================================

/**
 * GET /api/tenants/:tenantId/cost-centers/:costCenterId/expenses
 * Get expenses for a specific cost center
 */
router.get(
  '/tenants/:tenantId/cost-centers/:costCenterId/expenses',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, costCenterId } = req.params;
    const { start_date, end_date } = req.query;

    logger.info('Fetching cost center expenses', { tenantId, costCenterId, start_date, end_date });

    let sql = `
      SELECT * FROM tenant_cost_center_expenses
      WHERE tenant_id = $1 AND cost_center_id = $2
    `;

    const params: any[] = [tenantId, costCenterId];
    let paramIndex = 3;

    if (start_date) {
      sql += ` AND expense_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      sql += ` AND expense_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    sql += ' ORDER BY expense_date DESC';

    const expenses = await query<CostCenterExpense>(sql, params);

    res.json(expenses);
  })
);

/**
 * POST /api/tenants/:tenantId/cost-centers/:costCenterId/expenses
 * Add an expense to a cost center
 */
router.post(
  '/tenants/:tenantId/cost-centers/:costCenterId/expenses',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, costCenterId } = req.params;
    const dto: CreateCostCenterExpenseDto = req.body;

    logger.info('Creating cost center expense', { tenantId, costCenterId, dto });

    // Validation
    if (!dto.expense_date || !dto.description || dto.amount === undefined) {
      throw new ValidationError('Missing required fields: expense_date, description, amount');
    }

    // Verify cost center exists
    const costCenter = await queryOne<{ id: number }>(`
      SELECT id FROM tenant_cost_centers
      WHERE id = $1 AND tenant_id = $2
    `, [costCenterId, tenantId]);

    if (!costCenter) {
      throw new NotFoundError('Cost center not found');
    }

    const newExpense = await queryOne<CostCenterExpense>(`
      INSERT INTO tenant_cost_center_expenses (
        tenant_id, cost_center_id, expense_date, description, amount,
        category, reference_number, invoice_number, payment_method,
        paid_date, logged_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
    `, [
      tenantId,
      costCenterId,
      dto.expense_date,
      dto.description,
      dto.amount,
      dto.category || null,
      dto.reference_number || null,
      dto.invoice_number || null,
      dto.payment_method || null,
      dto.paid_date || null,
      dto.logged_by || null,
    ]);

    logger.info('Cost center expense created', { tenantId, costCenterId, expenseId: newExpense?.id });

    res.status(201).json(newExpense);
  })
);

/**
 * PUT /api/tenants/:tenantId/cost-centers/:costCenterId/expenses/:expenseId
 * Update an expense
 */
router.put(
  '/tenants/:tenantId/cost-centers/:costCenterId/expenses/:expenseId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, costCenterId, expenseId } = req.params;
    const dto: UpdateCostCenterExpenseDto = req.body;

    logger.info('Updating cost center expense', { tenantId, costCenterId, expenseId, dto });

    // Check if expense exists
    const existing = await queryOne<{ id: number }>(`
      SELECT id FROM tenant_cost_center_expenses
      WHERE id = $1 AND tenant_id = $2 AND cost_center_id = $3
    `, [expenseId, tenantId, costCenterId]);

    if (!existing) {
      throw new NotFoundError('Expense not found');
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.cost_center_id !== undefined) {
      updates.push(`cost_center_id = $${paramIndex++}`);
      values.push(dto.cost_center_id);
    }
    if (dto.expense_date !== undefined) {
      updates.push(`expense_date = $${paramIndex++}`);
      values.push(dto.expense_date);
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }
    if (dto.amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(dto.amount);
    }
    if (dto.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(dto.category);
    }
    if (dto.reference_number !== undefined) {
      updates.push(`reference_number = $${paramIndex++}`);
      values.push(dto.reference_number);
    }
    if (dto.invoice_number !== undefined) {
      updates.push(`invoice_number = $${paramIndex++}`);
      values.push(dto.invoice_number);
    }
    if (dto.payment_method !== undefined) {
      updates.push(`payment_method = $${paramIndex++}`);
      values.push(dto.payment_method);
    }
    if (dto.paid_date !== undefined) {
      updates.push(`paid_date = $${paramIndex++}`);
      values.push(dto.paid_date);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(expenseId, tenantId, costCenterId);

    const updatedExpense = await queryOne<CostCenterExpense>(`
      UPDATE tenant_cost_center_expenses
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} AND cost_center_id = $${paramIndex++}
      RETURNING *
    `, values);

    logger.info('Cost center expense updated', { tenantId, costCenterId, expenseId });

    res.json(updatedExpense);
  })
);

/**
 * DELETE /api/tenants/:tenantId/cost-centers/:costCenterId/expenses/:expenseId
 * Delete an expense
 */
router.delete(
  '/tenants/:tenantId/cost-centers/:costCenterId/expenses/:expenseId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, costCenterId, expenseId } = req.params;

    logger.info('Deleting cost center expense', { tenantId, costCenterId, expenseId });

    const result = await queryOne<{ id: number }>(`
      DELETE FROM tenant_cost_center_expenses
      WHERE id = $1 AND tenant_id = $2 AND cost_center_id = $3
      RETURNING id
    `, [expenseId, tenantId, costCenterId]);

    if (!result) {
      throw new NotFoundError('Expense not found');
    }

    logger.info('Cost center expense deleted', { tenantId, costCenterId, expenseId });

    res.status(204).send();
  })
);

export default router;
