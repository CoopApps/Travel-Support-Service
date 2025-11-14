import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, getDbClient } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Financial Surplus Routes (Not-for-Profit Compliance)
 *
 * Tracks annual financial performance to ensure operation without
 * a view to profit, as required by Section 19/22 permits
 *
 * Database Tables:
 * - tenant_financial_surplus
 */

/**
 * @route GET /api/tenants/:tenantId/financial-surplus
 * @desc Get all financial surplus records
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/financial-surplus',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching financial surplus records', { tenantId });

    const result = await query(
      `SELECT *
       FROM tenant_financial_surplus
       WHERE tenant_id = $1
       ORDER BY year_start_date DESC`,
      [tenantId]
    );

    logger.info('Financial surplus records loaded', {
      tenantId,
      count: result.length,
    });

    res.json(result);
  })
);

/**
 * @route GET /api/tenants/:tenantId/financial-surplus/:surplusId
 * @desc Get specific financial surplus record
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/financial-surplus/:surplusId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, surplusId } = req.params;

    logger.info('Fetching financial surplus record', { tenantId, surplusId });

    const result = await query(
      `SELECT *
       FROM tenant_financial_surplus
       WHERE tenant_id = $1 AND surplus_id = $2`,
      [tenantId, surplusId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Financial surplus record not found');
    }

    res.json(result[0]);
  })
);

/**
 * @route GET /api/tenants/:tenantId/financial-surplus/year/:financialYear
 * @desc Get financial surplus by year
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/financial-surplus/year/:financialYear',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, financialYear } = req.params;

    logger.info('Fetching financial surplus by year', { tenantId, financialYear });

    const result = await query(
      `SELECT *
       FROM tenant_financial_surplus
       WHERE tenant_id = $1 AND financial_year = $2`,
      [tenantId, financialYear]
    );

    if (result.length === 0) {
      throw new NotFoundError('Financial surplus record not found for this year');
    }

    res.json(result[0]);
  })
);

/**
 * @route POST /api/tenants/:tenantId/financial-surplus
 * @desc Create new financial surplus record
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/financial-surplus',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const surplusData = req.body;

    logger.info('Creating financial surplus record', { tenantId });

    // Validate required fields
    const requiredFields = [
      'financial_year',
      'year_start_date',
      'year_end_date',
      'total_income',
      'total_expenses',
    ];

    for (const field of requiredFields) {
      if (surplusData[field] === undefined || surplusData[field] === null) {
        throw new ValidationError(`${field} is required`);
      }
    }

    // Check for duplicate financial year
    const duplicateCheck = await query(
      `SELECT surplus_id FROM tenant_financial_surplus
       WHERE tenant_id = $1 AND financial_year = $2`,
      [tenantId, surplusData.financial_year]
    );

    if (duplicateCheck.length > 0) {
      throw new ValidationError('Financial surplus record already exists for this year');
    }

    const result = await query(
      `INSERT INTO tenant_financial_surplus (
        tenant_id,
        financial_year,
        year_start_date,
        year_end_date,
        total_income,
        fare_revenue,
        contract_revenue,
        grant_income,
        other_income,
        total_expenses,
        driver_wages,
        fuel_costs,
        vehicle_maintenance,
        insurance,
        depreciation,
        administration_costs,
        other_expenses,
        surplus_reinvestment_plan,
        surplus_reinvestment_actual,
        surplus_reinvested,
        reinvestment_date,
        has_cross_subsidy,
        cross_subsidy_description,
        profitable_routes,
        loss_making_routes,
        uses_fcr_model,
        fcr_calculation_notes,
        reviewed,
        reviewed_by,
        review_date,
        review_notes,
        competitive_contracts_revenue,
        competitive_contracts_percentage,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
        $33, NOW(), NOW()
      ) RETURNING *`,
      [
        tenantId,
        surplusData.financial_year,
        surplusData.year_start_date,
        surplusData.year_end_date,
        surplusData.total_income,
        surplusData.fare_revenue || 0,
        surplusData.contract_revenue || 0,
        surplusData.grant_income || 0,
        surplusData.other_income || 0,
        surplusData.total_expenses,
        surplusData.driver_wages || 0,
        surplusData.fuel_costs || 0,
        surplusData.vehicle_maintenance || 0,
        surplusData.insurance || 0,
        surplusData.depreciation || 0,
        surplusData.administration_costs || 0,
        surplusData.other_expenses || 0,
        surplusData.surplus_reinvestment_plan || null,
        surplusData.surplus_reinvestment_actual || null,
        surplusData.surplus_reinvested || false,
        surplusData.reinvestment_date || null,
        surplusData.has_cross_subsidy || false,
        surplusData.cross_subsidy_description || null,
        surplusData.profitable_routes ? JSON.stringify(surplusData.profitable_routes) : null,
        surplusData.loss_making_routes ? JSON.stringify(surplusData.loss_making_routes) : null,
        surplusData.uses_fcr_model !== undefined ? surplusData.uses_fcr_model : true,
        surplusData.fcr_calculation_notes || null,
        surplusData.reviewed || false,
        surplusData.reviewed_by || null,
        surplusData.review_date || null,
        surplusData.review_notes || null,
        surplusData.competitive_contracts_revenue || 0,
        surplusData.competitive_contracts_percentage || null,
      ]
    );

    logger.info('Financial surplus record created', {
      tenantId,
      surplusId: result[0].surplus_id,
      financialYear: result[0].financial_year,
    });

    res.status(201).json(result[0]);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/financial-surplus/:surplusId
 * @desc Update financial surplus record
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/financial-surplus/:surplusId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, surplusId } = req.params;
    const updateData = req.body;

    logger.info('Updating financial surplus record', { tenantId, surplusId });

    // Check if record exists
    const existingResult = await query(
      `SELECT surplus_id FROM tenant_financial_surplus
       WHERE tenant_id = $1 AND surplus_id = $2`,
      [tenantId, surplusId]
    );

    if (existingResult.length === 0) {
      throw new NotFoundError('Financial surplus record not found');
    }

    const result = await query(
      `UPDATE tenant_financial_surplus
       SET total_income = COALESCE($3, total_income),
           fare_revenue = COALESCE($4, fare_revenue),
           contract_revenue = COALESCE($5, contract_revenue),
           grant_income = COALESCE($6, grant_income),
           other_income = COALESCE($7, other_income),
           total_expenses = COALESCE($8, total_expenses),
           driver_wages = COALESCE($9, driver_wages),
           fuel_costs = COALESCE($10, fuel_costs),
           vehicle_maintenance = COALESCE($11, vehicle_maintenance),
           insurance = COALESCE($12, insurance),
           depreciation = COALESCE($13, depreciation),
           administration_costs = COALESCE($14, administration_costs),
           other_expenses = COALESCE($15, other_expenses),
           surplus_reinvestment_plan = COALESCE($16, surplus_reinvestment_plan),
           surplus_reinvestment_actual = COALESCE($17, surplus_reinvestment_actual),
           surplus_reinvested = COALESCE($18, surplus_reinvested),
           reinvestment_date = COALESCE($19, reinvestment_date),
           has_cross_subsidy = COALESCE($20, has_cross_subsidy),
           cross_subsidy_description = COALESCE($21, cross_subsidy_description),
           profitable_routes = COALESCE($22, profitable_routes),
           loss_making_routes = COALESCE($23, loss_making_routes),
           uses_fcr_model = COALESCE($24, uses_fcr_model),
           fcr_calculation_notes = COALESCE($25, fcr_calculation_notes),
           reviewed = COALESCE($26, reviewed),
           reviewed_by = COALESCE($27, reviewed_by),
           review_date = COALESCE($28, review_date),
           review_notes = COALESCE($29, review_notes),
           competitive_contracts_revenue = COALESCE($30, competitive_contracts_revenue),
           competitive_contracts_percentage = COALESCE($31, competitive_contracts_percentage),
           updated_at = NOW()
       WHERE tenant_id = $1 AND surplus_id = $2
       RETURNING *`,
      [
        tenantId,
        surplusId,
        updateData.total_income,
        updateData.fare_revenue,
        updateData.contract_revenue,
        updateData.grant_income,
        updateData.other_income,
        updateData.total_expenses,
        updateData.driver_wages,
        updateData.fuel_costs,
        updateData.vehicle_maintenance,
        updateData.insurance,
        updateData.depreciation,
        updateData.administration_costs,
        updateData.other_expenses,
        updateData.surplus_reinvestment_plan,
        updateData.surplus_reinvestment_actual,
        updateData.surplus_reinvested,
        updateData.reinvestment_date,
        updateData.has_cross_subsidy,
        updateData.cross_subsidy_description,
        updateData.profitable_routes ? JSON.stringify(updateData.profitable_routes) : null,
        updateData.loss_making_routes ? JSON.stringify(updateData.loss_making_routes) : null,
        updateData.uses_fcr_model,
        updateData.fcr_calculation_notes,
        updateData.reviewed,
        updateData.reviewed_by,
        updateData.review_date,
        updateData.review_notes,
        updateData.competitive_contracts_revenue,
        updateData.competitive_contracts_percentage,
      ]
    );

    logger.info('Financial surplus record updated', { tenantId, surplusId });

    res.json(result[0]);
  })
);

/**
 * @route GET /api/tenants/:tenantId/financial-surplus/summary
 * @desc Get financial surplus summary (multi-year analysis)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/financial-surplus/summary',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching financial surplus summary', { tenantId });

    const result = await query(
      `SELECT
        COUNT(*) as total_years,
        SUM(CASE WHEN is_surplus THEN 1 ELSE 0 END) as surplus_years,
        SUM(CASE WHEN NOT is_surplus THEN 1 ELSE 0 END) as deficit_years,
        AVG(surplus_amount) as avg_surplus,
        SUM(surplus_amount) as total_surplus,
        SUM(total_income) as total_income_all_years,
        SUM(total_expenses) as total_expenses_all_years,
        SUM(competitive_contracts_revenue) as total_competitive_revenue,
        AVG(competitive_contracts_percentage) as avg_competitive_percentage
       FROM tenant_financial_surplus
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const yearsResult = await query(
      `SELECT
        financial_year,
        surplus_amount,
        is_surplus,
        total_income,
        total_expenses,
        surplus_reinvested,
        competitive_contracts_percentage
       FROM tenant_financial_surplus
       WHERE tenant_id = $1
       ORDER BY year_start_date DESC
       LIMIT 5`,
      [tenantId]
    );

    const summary = {
      overall: result[0],
      recent_years: yearsResult,
      compliance_status: {
        operating_not_for_profit:
          result[0].total_surplus === null || parseFloat(result[0].avg_surplus) < 10000,
        // Reasonable surplus threshold
        surplus_reinvestment_tracked: yearsResult.some(
          (year: any) => year.is_surplus && year.surplus_reinvested
        ),
        competitive_contracts_within_limits:
          parseFloat(result[0].avg_competitive_percentage || '0') < 50,
      },
    };

    res.json(summary);
  })
);

/**
 * @route POST /api/tenants/:tenantId/financial-surplus/:surplusId/review
 * @desc Mark financial surplus as reviewed
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/financial-surplus/:surplusId/review',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, surplusId } = req.params;
    const { reviewed_by, review_notes } = req.body;

    logger.info('Reviewing financial surplus record', { tenantId, surplusId });

    const result = await query(
      `UPDATE tenant_financial_surplus
       SET reviewed = true,
           reviewed_by = $3,
           review_date = CURRENT_DATE,
           review_notes = $4,
           updated_at = NOW()
       WHERE tenant_id = $1 AND surplus_id = $2
       RETURNING *`,
      [tenantId, surplusId, reviewed_by || null, review_notes || null]
    );

    if (result.length === 0) {
      throw new NotFoundError('Financial surplus record not found');
    }

    logger.info('Financial surplus record reviewed', { tenantId, surplusId });

    res.json(result[0]);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/financial-surplus/:surplusId
 * @desc Delete financial surplus record
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/financial-surplus/:surplusId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, surplusId } = req.params;

    logger.info('Deleting financial surplus record', { tenantId, surplusId });

    const result = await query(
      `DELETE FROM tenant_financial_surplus
       WHERE tenant_id = $1 AND surplus_id = $2
       RETURNING surplus_id`,
      [tenantId, surplusId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Financial surplus record not found');
    }

    logger.info('Financial surplus record deleted', { tenantId, surplusId });

    res.json({ success: true, message: 'Financial surplus record deleted successfully' });
  })
);

export default router;
