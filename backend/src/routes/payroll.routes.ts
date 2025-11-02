import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import {
  PayrollPeriod,
  CreatePayrollPeriodDto,
  UpdatePayrollPeriodDto,
  PayrollRecord,
  CreatePayrollRecordDto,
  UpdatePayrollRecordDto,
  FreelanceSubmission,
  CreateFreelanceSubmissionDto,
  UpdateFreelanceSubmissionDto,
  PayrollSummary,
  PayrollStats,
  PayrollMovement,
  EmploymentType,
} from '../types/payroll.types';

const router: Router = express.Router();

/**
 * Payroll Routes
 *
 * Complete payroll management system for employee wages, HMRC submissions,
 * and payroll period tracking. Handles both contracted and freelance workers.
 *
 * Database Tables:
 * - tenant_payroll_periods: Payroll periods (weekly/monthly)
 * - tenant_payroll_records: Individual driver pay records
 * - tenant_freelance_submissions: Freelance invoice submissions
 * - tenant_payroll_movements: Joiners and leavers tracking
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate gross pay based on employment type
 */
function calculateGrossPay(
  employmentType: EmploymentType,
  hoursWorked?: number,
  hourlyRate?: number,
  weeklyWage?: number,
  monthlySalary?: number
): number {
  switch (employmentType) {
    case 'contracted_hourly':
      return (hoursWorked || 0) * (hourlyRate || 0);
    case 'contracted_weekly':
      return weeklyWage || 0;
    case 'contracted_monthly':
      return monthlySalary || 0;
    case 'freelance':
      return 0; // Freelance paid via submissions
    default:
      return 0;
  }
}

/**
 * Calculate net pay after deductions
 */
function calculateNetPay(
  grossPay: number,
  taxDeducted: number,
  niDeducted: number,
  pensionDeducted: number,
  otherDeductions: number
): number {
  return grossPay - taxDeducted - niDeducted - pensionDeducted - otherDeductions;
}

/**
 * Recalculate period totals based on all records and submissions
 */
async function recalculatePeriodTotals(tenantId: string | number, periodId: string | number): Promise<void> {
  logger.info('Recalculating period totals', { tenantId, periodId });

  // Get totals from payroll records
  const recordTotals = await queryOne<{
    total_gross: string;
    total_tax: string;
    total_ni: string;
    total_pension: string;
    total_deductions: string;
    total_net: string;
  }>(`
    SELECT
      COALESCE(SUM(gross_pay), 0) as total_gross,
      COALESCE(SUM(tax_deducted), 0) as total_tax,
      COALESCE(SUM(ni_deducted), 0) as total_ni,
      COALESCE(SUM(pension_deducted), 0) as total_pension,
      COALESCE(SUM(other_deductions), 0) as total_deductions,
      COALESCE(SUM(net_pay), 0) as total_net
    FROM tenant_payroll_records
    WHERE tenant_id = $1 AND period_id = $2
  `, [tenantId, periodId]);

  // Get totals from freelance submissions
  const freelanceTotals = await queryOne<{
    total_amount: string;
    total_tax: string;
    total_ni: string;
  }>(`
    SELECT
      COALESCE(SUM(invoice_amount), 0) as total_amount,
      COALESCE(SUM(tax_paid), 0) as total_tax,
      COALESCE(SUM(ni_paid), 0) as total_ni
    FROM tenant_freelance_submissions
    WHERE tenant_id = $1 AND period_id = $2
  `, [tenantId, periodId]);

  if (!recordTotals) {
    logger.warn('No record totals found', { tenantId, periodId });
    return;
  }

  const totalGross = parseFloat(recordTotals.total_gross) + (freelanceTotals ? parseFloat(freelanceTotals.total_amount) : 0);
  const totalTax = parseFloat(recordTotals.total_tax) + (freelanceTotals ? parseFloat(freelanceTotals.total_tax) : 0);
  const totalNi = parseFloat(recordTotals.total_ni) + (freelanceTotals ? parseFloat(freelanceTotals.total_ni) : 0);
  const totalPension = parseFloat(recordTotals.total_pension);
  const totalDeductions = parseFloat(recordTotals.total_deductions);
  const totalNet = parseFloat(recordTotals.total_net) + (freelanceTotals ? parseFloat(freelanceTotals.total_amount) : 0);
  const hmrcPaymentDue = totalTax + totalNi;

  // Update period totals
  await query(`
    UPDATE tenant_payroll_periods
    SET
      total_gross = $3,
      total_tax = $4,
      total_ni = $5,
      total_pension = $6,
      total_deductions = $7,
      total_net = $8,
      hmrc_payment_due = $9,
      updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = $1 AND period_id = $2
  `, [tenantId, periodId, totalGross, totalTax, totalNi, totalPension, totalDeductions, totalNet, hmrcPaymentDue]);

  logger.info('Period totals recalculated', {
    tenantId,
    periodId,
    totalGross,
    totalNet,
    hmrcPaymentDue,
  });
}

// ============================================================================
// PAYROLL PERIOD ROUTES
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/payroll/periods
 * @desc Get all payroll periods with pagination and filtering
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/payroll/periods',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = '1',
      limit = '20',
      status = '',
      periodType = '',
      sortBy = 'period_start',
      sortOrder = 'desc',
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    logger.info('Fetching payroll periods', { tenantId, page, limit, status });

    // Build WHERE clause
    let whereConditions = 'WHERE pp.tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      whereConditions += ` AND pp.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (periodType) {
      whereConditions += ` AND pp.period_type = $${paramCount}`;
      params.push(periodType);
      paramCount++;
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_payroll_periods pp ${whereConditions}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0', 10);

    // Get periods with counts
    const validSortColumns = ['period_start', 'period_end', 'status', 'total_gross', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'period_start';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    params.push(limit, offset);

    const periods = await query<PayrollPeriod>(`
      SELECT
        pp.*,
        u.full_name as submitted_by_name,
        (SELECT COUNT(*) FROM tenant_payroll_records WHERE period_id = pp.period_id) as record_count,
        (SELECT COUNT(*) FROM tenant_freelance_submissions WHERE period_id = pp.period_id) as freelance_count,
        (SELECT COUNT(*) FROM tenant_payroll_movements WHERE period_id = pp.period_id AND movement_type = 'joiner') as joiner_count,
        (SELECT COUNT(*) FROM tenant_payroll_movements WHERE period_id = pp.period_id AND movement_type = 'leaver') as leaver_count
      FROM tenant_payroll_periods pp
      LEFT JOIN tenant_users u ON pp.submitted_by = u.user_id
      ${whereConditions}
      ORDER BY pp.${sortColumn} ${order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, params);

    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      periods,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages,
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/payroll/periods
 * @desc Create new payroll period
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/payroll/periods',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const periodData: CreatePayrollPeriodDto = req.body;

    logger.info('Creating payroll period', { tenantId, periodData });

    // Validate required fields
    if (!periodData.period_start || !periodData.period_end) {
      throw new ValidationError('Period start and end dates are required');
    }

    // Check for overlapping periods
    const overlap = await query<{ period_id: number }>(`
      SELECT period_id
      FROM tenant_payroll_periods
      WHERE tenant_id = $1
        AND (
          (period_start <= $2 AND period_end >= $2)
          OR (period_start <= $3 AND period_end >= $3)
          OR (period_start >= $2 AND period_end <= $3)
        )
    `, [tenantId, periodData.period_start, periodData.period_end]);

    if (overlap.length > 0) {
      throw new ValidationError('Period overlaps with an existing payroll period');
    }

    const result = await query<PayrollPeriod>(`
      INSERT INTO tenant_payroll_periods (
        tenant_id,
        period_start,
        period_end,
        period_type,
        status,
        notes,
        total_gross,
        total_tax,
        total_ni,
        total_pension,
        total_deductions,
        total_net,
        hmrc_payment_due
      ) VALUES ($1, $2, $3, $4, 'draft', $5, 0, 0, 0, 0, 0, 0, 0)
      RETURNING *
    `, [
      tenantId,
      periodData.period_start,
      periodData.period_end,
      periodData.period_type || 'monthly',
      periodData.notes || null,
    ]);

    logger.info('Payroll period created', { periodId: result[0].period_id });

    res.status(201).json(result[0]);
  })
);

/**
 * @route GET /api/tenants/:tenantId/payroll/periods/:periodId
 * @desc Get specific payroll period details
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/payroll/periods/:periodId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Fetching payroll period', { tenantId, periodId });

    const period = await queryOne<PayrollPeriod>(`
      SELECT
        pp.*,
        u.full_name as submitted_by_name,
        (SELECT COUNT(*) FROM tenant_payroll_records WHERE period_id = pp.period_id) as record_count,
        (SELECT COUNT(*) FROM tenant_freelance_submissions WHERE period_id = pp.period_id) as freelance_count,
        (SELECT COUNT(*) FROM tenant_payroll_movements WHERE period_id = pp.period_id AND movement_type = 'joiner') as joiner_count,
        (SELECT COUNT(*) FROM tenant_payroll_movements WHERE period_id = pp.period_id AND movement_type = 'leaver') as leaver_count
      FROM tenant_payroll_periods pp
      LEFT JOIN tenant_users u ON pp.submitted_by = u.user_id
      WHERE pp.tenant_id = $1 AND pp.period_id = $2
    `, [tenantId, periodId]);

    if (!period) {
      throw new NotFoundError('Payroll period not found');
    }

    res.json(period);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/payroll/periods/:periodId
 * @desc Update payroll period
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/payroll/periods/:periodId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;
    const updateData: UpdatePayrollPeriodDto = req.body;

    logger.info('Updating payroll period', { tenantId, periodId, updateData });

    // Check if period exists
    const existingPeriod = await queryOne<PayrollPeriod>(
      'SELECT * FROM tenant_payroll_periods WHERE tenant_id = $1 AND period_id = $2',
      [tenantId, periodId]
    );

    if (!existingPeriod) {
      throw new NotFoundError('Payroll period not found');
    }

    // If changing status to submitted, record submission details
    if (updateData.status === 'submitted' && existingPeriod.status !== 'submitted') {
      const userId = (req as any).user?.userId;
      await query(`
        UPDATE tenant_payroll_periods
        SET
          status = 'submitted',
          submitted_date = CURRENT_TIMESTAMP,
          submitted_by = $3,
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND period_id = $2
      `, [tenantId, periodId, userId, updateData.notes]);

      logger.info('Payroll period submitted', { periodId, userId });
    } else {
      // Standard update
      const setClauses: string[] = [];
      const values: any[] = [tenantId, periodId];
      let paramCount = 3;

      if (updateData.status !== undefined) {
        setClauses.push(`status = $${paramCount}`);
        values.push(updateData.status);
        paramCount++;
      }

      if (updateData.notes !== undefined) {
        setClauses.push(`notes = $${paramCount}`);
        values.push(updateData.notes);
        paramCount++;
      }

      if (updateData.total_gross !== undefined) {
        setClauses.push(`total_gross = $${paramCount}`);
        values.push(updateData.total_gross);
        paramCount++;
      }

      if (updateData.total_tax !== undefined) {
        setClauses.push(`total_tax = $${paramCount}`);
        values.push(updateData.total_tax);
        paramCount++;
      }

      if (updateData.total_ni !== undefined) {
        setClauses.push(`total_ni = $${paramCount}`);
        values.push(updateData.total_ni);
        paramCount++;
      }

      if (updateData.total_pension !== undefined) {
        setClauses.push(`total_pension = $${paramCount}`);
        values.push(updateData.total_pension);
        paramCount++;
      }

      if (updateData.total_deductions !== undefined) {
        setClauses.push(`total_deductions = $${paramCount}`);
        values.push(updateData.total_deductions);
        paramCount++;
      }

      if (updateData.total_net !== undefined) {
        setClauses.push(`total_net = $${paramCount}`);
        values.push(updateData.total_net);
        paramCount++;
      }

      if (updateData.hmrc_payment_due !== undefined) {
        setClauses.push(`hmrc_payment_due = $${paramCount}`);
        values.push(updateData.hmrc_payment_due);
        paramCount++;
      }

      if (setClauses.length === 0) {
        throw new ValidationError('No update data provided');
      }

      setClauses.push('updated_at = CURRENT_TIMESTAMP');

      await query(`
        UPDATE tenant_payroll_periods
        SET ${setClauses.join(', ')}
        WHERE tenant_id = $1 AND period_id = $2
      `, values);
    }

    // Fetch updated period
    const updatedPeriod = await queryOne<PayrollPeriod>(
      'SELECT * FROM tenant_payroll_periods WHERE tenant_id = $1 AND period_id = $2',
      [tenantId, periodId]
    );

    logger.info('Payroll period updated', { periodId });

    res.json(updatedPeriod);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/payroll/periods/:periodId
 * @desc Delete payroll period (only if draft)
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/payroll/periods/:periodId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Deleting payroll period', { tenantId, periodId });

    // Check if period is in draft status
    const period = await queryOne<PayrollPeriod>(
      'SELECT * FROM tenant_payroll_periods WHERE tenant_id = $1 AND period_id = $2',
      [tenantId, periodId]
    );

    if (!period) {
      throw new NotFoundError('Payroll period not found');
    }

    if (period.status !== 'draft') {
      throw new ValidationError('Only draft periods can be deleted');
    }

    // Delete associated records
    await query('DELETE FROM tenant_payroll_movements WHERE tenant_id = $1 AND period_id = $2', [tenantId, periodId]);
    await query('DELETE FROM tenant_freelance_submissions WHERE tenant_id = $1 AND period_id = $2', [tenantId, periodId]);
    await query('DELETE FROM tenant_payroll_records WHERE tenant_id = $1 AND period_id = $2', [tenantId, periodId]);

    // Delete period
    await query('DELETE FROM tenant_payroll_periods WHERE tenant_id = $1 AND period_id = $2', [tenantId, periodId]);

    logger.info('Payroll period deleted', { periodId });

    res.json({
      message: 'Payroll period deleted successfully',
      periodId: parseInt(periodId),
    });
  })
);

// ============================================================================
// PAYROLL RECORDS (Individual Driver Pay)
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/payroll/periods/:periodId/records
 * @desc Get all payroll records for a period
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/payroll/periods/:periodId/records',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Fetching payroll records', { tenantId, periodId });

    const records = await query<PayrollRecord>(`
      SELECT
        pr.*,
        d.name as driver_name,
        d.phone as driver_phone,
        d.email as driver_email,
        d.tax_code,
        d.ni_number,
        d.bank_account_name,
        d.bank_sort_code,
        d.bank_account_number
      FROM tenant_payroll_records pr
      JOIN tenant_drivers d ON pr.driver_id = d.driver_id AND pr.tenant_id = d.tenant_id
      WHERE pr.tenant_id = $1 AND pr.period_id = $2
      ORDER BY d.name ASC
    `, [tenantId, periodId]);

    res.json(records);
  })
);

/**
 * @route POST /api/tenants/:tenantId/payroll/periods/:periodId/records
 * @desc Create payroll record for a driver
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/payroll/periods/:periodId/records',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;
    const recordData: CreatePayrollRecordDto = req.body;

    logger.info('Creating payroll record', { tenantId, periodId, driverId: recordData.driver_id });

    // Validate required fields
    if (!recordData.driver_id) {
      throw new ValidationError('Driver ID is required');
    }

    // Check if record already exists for this driver in this period
    const existing = await query(
      'SELECT record_id FROM tenant_payroll_records WHERE tenant_id = $1 AND period_id = $2 AND driver_id = $3',
      [tenantId, periodId, recordData.driver_id]
    );

    if (existing.length > 0) {
      throw new ValidationError('Payroll record already exists for this driver in this period');
    }

    // Calculate totals
    const grossPay = recordData.gross_pay || calculateGrossPay(
      recordData.employment_type,
      recordData.hours_worked,
      recordData.hourly_rate,
      recordData.weekly_wage,
      recordData.monthly_salary
    );

    const netPay = recordData.net_pay || calculateNetPay(
      grossPay,
      recordData.tax_deducted || 0,
      recordData.ni_deducted || 0,
      recordData.pension_deducted || 0,
      recordData.other_deductions || 0
    );

    const result = await query<PayrollRecord>(`
      INSERT INTO tenant_payroll_records (
        tenant_id,
        period_id,
        driver_id,
        employment_type,
        hours_worked,
        hourly_rate,
        weekly_wage,
        monthly_salary,
        gross_pay,
        tax_deducted,
        ni_deducted,
        pension_deducted,
        other_deductions,
        deduction_notes,
        net_pay,
        is_new_joiner,
        is_leaver,
        leaving_date,
        payment_status,
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'pending', $19
      )
      RETURNING *
    `, [
      tenantId,
      periodId,
      recordData.driver_id,
      recordData.employment_type,
      recordData.hours_worked || null,
      recordData.hourly_rate || null,
      recordData.weekly_wage || null,
      recordData.monthly_salary || null,
      grossPay,
      recordData.tax_deducted || 0,
      recordData.ni_deducted || 0,
      recordData.pension_deducted || 0,
      recordData.other_deductions || 0,
      recordData.deduction_notes || null,
      netPay,
      recordData.is_new_joiner || false,
      recordData.is_leaver || false,
      recordData.leaving_date || null,
      recordData.notes || null,
    ]);

    logger.info('Payroll record created', { recordId: result[0].record_id });

    // Create movement records if applicable
    if (recordData.is_new_joiner) {
      await query(`
        INSERT INTO tenant_payroll_movements (tenant_id, period_id, driver_id, movement_type, movement_date)
        VALUES ($1, $2, $3, 'joiner', CURRENT_DATE)
      `, [tenantId, periodId, recordData.driver_id]);
    }

    if (recordData.is_leaver && recordData.leaving_date) {
      await query(`
        INSERT INTO tenant_payroll_movements (tenant_id, period_id, driver_id, movement_type, movement_date)
        VALUES ($1, $2, $3, 'leaver', $4)
      `, [tenantId, periodId, recordData.driver_id, recordData.leaving_date]);
    }

    // Recalculate period totals
    await recalculatePeriodTotals(tenantId, periodId);

    res.status(201).json(result[0]);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/payroll/records/:recordId
 * @desc Update payroll record
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/payroll/records/:recordId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, recordId } = req.params;
    const updateData: UpdatePayrollRecordDto = req.body;

    logger.info('Updating payroll record', { tenantId, recordId });

    // Get existing record
    const existingRecord = await queryOne<PayrollRecord>(
      'SELECT * FROM tenant_payroll_records WHERE tenant_id = $1 AND record_id = $2',
      [tenantId, recordId]
    );

    if (!existingRecord) {
      throw new NotFoundError('Payroll record not found');
    }

    // Build update query
    const setClauses: string[] = [];
    const values: any[] = [tenantId, recordId];
    let paramCount = 3;

    if (updateData.hours_worked !== undefined) {
      setClauses.push(`hours_worked = $${paramCount}`);
      values.push(updateData.hours_worked);
      paramCount++;
    }

    if (updateData.gross_pay !== undefined) {
      setClauses.push(`gross_pay = $${paramCount}`);
      values.push(updateData.gross_pay);
      paramCount++;
    }

    if (updateData.tax_deducted !== undefined) {
      setClauses.push(`tax_deducted = $${paramCount}`);
      values.push(updateData.tax_deducted);
      paramCount++;
    }

    if (updateData.ni_deducted !== undefined) {
      setClauses.push(`ni_deducted = $${paramCount}`);
      values.push(updateData.ni_deducted);
      paramCount++;
    }

    if (updateData.pension_deducted !== undefined) {
      setClauses.push(`pension_deducted = $${paramCount}`);
      values.push(updateData.pension_deducted);
      paramCount++;
    }

    if (updateData.other_deductions !== undefined) {
      setClauses.push(`other_deductions = $${paramCount}`);
      values.push(updateData.other_deductions);
      paramCount++;
    }

    if (updateData.deduction_notes !== undefined) {
      setClauses.push(`deduction_notes = $${paramCount}`);
      values.push(updateData.deduction_notes);
      paramCount++;
    }

    if (updateData.net_pay !== undefined) {
      setClauses.push(`net_pay = $${paramCount}`);
      values.push(updateData.net_pay);
      paramCount++;
    }

    if (updateData.payment_status !== undefined) {
      setClauses.push(`payment_status = $${paramCount}`);
      values.push(updateData.payment_status);
      paramCount++;
    }

    if (updateData.payment_date !== undefined) {
      setClauses.push(`payment_date = $${paramCount}`);
      values.push(updateData.payment_date);
      paramCount++;
    }

    if (updateData.payment_reference !== undefined) {
      setClauses.push(`payment_reference = $${paramCount}`);
      values.push(updateData.payment_reference);
      paramCount++;
    }

    if (updateData.notes !== undefined) {
      setClauses.push(`notes = $${paramCount}`);
      values.push(updateData.notes);
      paramCount++;
    }

    if (setClauses.length === 0) {
      throw new ValidationError('No update data provided');
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    await query(`
      UPDATE tenant_payroll_records
      SET ${setClauses.join(', ')}
      WHERE tenant_id = $1 AND record_id = $2
    `, values);

    // Recalculate period totals
    await recalculatePeriodTotals(tenantId, existingRecord.period_id);

    // Fetch updated record with driver info
    const updatedRecord = await queryOne<PayrollRecord>(`
      SELECT
        pr.*,
        d.name as driver_name,
        d.phone as driver_phone,
        d.email as driver_email,
        d.tax_code,
        d.ni_number,
        d.bank_account_name,
        d.bank_sort_code,
        d.bank_account_number
      FROM tenant_payroll_records pr
      JOIN tenant_drivers d ON pr.driver_id = d.driver_id AND pr.tenant_id = d.tenant_id
      WHERE pr.tenant_id = $1 AND pr.record_id = $2
    `, [tenantId, recordId]);

    logger.info('Payroll record updated', { recordId });

    res.json(updatedRecord);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/payroll/records/:recordId
 * @desc Delete payroll record
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/payroll/records/:recordId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, recordId } = req.params;

    logger.info('Deleting payroll record', { tenantId, recordId });

    // Get record info before deleting
    const record = await queryOne<PayrollRecord>(
      'SELECT * FROM tenant_payroll_records WHERE tenant_id = $1 AND record_id = $2',
      [tenantId, recordId]
    );

    if (!record) {
      throw new NotFoundError('Payroll record not found');
    }

    // Delete the record
    await query('DELETE FROM tenant_payroll_records WHERE tenant_id = $1 AND record_id = $2', [tenantId, recordId]);

    logger.info('Payroll record deleted', { recordId });

    // Recalculate period totals
    await recalculatePeriodTotals(tenantId, record.period_id);

    res.json({
      message: 'Payroll record deleted successfully',
      recordId: parseInt(recordId),
    });
  })
);

// ============================================================================
// FREELANCE SUBMISSIONS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/payroll/periods/:periodId/freelance
 * @desc Get freelance submissions for a period
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/payroll/periods/:periodId/freelance',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Fetching freelance submissions', { tenantId, periodId });

    const submissions = await query<FreelanceSubmission>(`
      SELECT
        fs.*,
        d.name as driver_name,
        d.phone as driver_phone,
        d.email as driver_email
      FROM tenant_freelance_submissions fs
      JOIN tenant_drivers d ON fs.driver_id = d.driver_id AND fs.tenant_id = d.tenant_id
      WHERE fs.tenant_id = $1 AND fs.period_id = $2
      ORDER BY d.name ASC
    `, [tenantId, periodId]);

    res.json(submissions);
  })
);

/**
 * @route POST /api/tenants/:tenantId/payroll/periods/:periodId/freelance
 * @desc Create freelance submission
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/payroll/periods/:periodId/freelance',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;
    const submissionData: CreateFreelanceSubmissionDto = req.body;

    logger.info('Creating freelance submission', { tenantId, periodId, driverId: submissionData.driver_id });

    // Validate required fields
    if (!submissionData.driver_id || !submissionData.invoice_date || !submissionData.invoice_amount) {
      throw new ValidationError('Driver ID, invoice date, and invoice amount are required');
    }

    const result = await query<FreelanceSubmission>(`
      INSERT INTO tenant_freelance_submissions (
        tenant_id,
        period_id,
        driver_id,
        invoice_number,
        invoice_date,
        invoice_amount,
        tax_paid,
        ni_paid,
        payment_status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
      RETURNING *
    `, [
      tenantId,
      periodId,
      submissionData.driver_id,
      submissionData.invoice_number || null,
      submissionData.invoice_date,
      submissionData.invoice_amount,
      submissionData.tax_paid || 0,
      submissionData.ni_paid || 0,
      submissionData.notes || null,
    ]);

    logger.info('Freelance submission created', { submissionId: result[0].submission_id });

    // Recalculate period totals
    await recalculatePeriodTotals(tenantId, periodId);

    res.status(201).json(result[0]);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/payroll/freelance/:submissionId
 * @desc Update freelance submission
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/payroll/freelance/:submissionId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, submissionId } = req.params;
    const updateData: UpdateFreelanceSubmissionDto = req.body;

    logger.info('Updating freelance submission', { tenantId, submissionId });

    // Get existing submission
    const existingSubmission = await queryOne<FreelanceSubmission>(
      'SELECT * FROM tenant_freelance_submissions WHERE tenant_id = $1 AND submission_id = $2',
      [tenantId, submissionId]
    );

    if (!existingSubmission) {
      throw new NotFoundError('Freelance submission not found');
    }

    // Build update query
    const setClauses: string[] = [];
    const values: any[] = [tenantId, submissionId];
    let paramCount = 3;

    if (updateData.invoice_number !== undefined) {
      setClauses.push(`invoice_number = $${paramCount}`);
      values.push(updateData.invoice_number);
      paramCount++;
    }

    if (updateData.invoice_date !== undefined) {
      setClauses.push(`invoice_date = $${paramCount}`);
      values.push(updateData.invoice_date);
      paramCount++;
    }

    if (updateData.invoice_amount !== undefined) {
      setClauses.push(`invoice_amount = $${paramCount}`);
      values.push(updateData.invoice_amount);
      paramCount++;
    }

    if (updateData.tax_paid !== undefined) {
      setClauses.push(`tax_paid = $${paramCount}`);
      values.push(updateData.tax_paid);
      paramCount++;
    }

    if (updateData.ni_paid !== undefined) {
      setClauses.push(`ni_paid = $${paramCount}`);
      values.push(updateData.ni_paid);
      paramCount++;
    }

    if (updateData.payment_status !== undefined) {
      setClauses.push(`payment_status = $${paramCount}`);
      values.push(updateData.payment_status);
      paramCount++;
    }

    if (updateData.payment_date !== undefined) {
      setClauses.push(`payment_date = $${paramCount}`);
      values.push(updateData.payment_date);
      paramCount++;
    }

    if (updateData.payment_reference !== undefined) {
      setClauses.push(`payment_reference = $${paramCount}`);
      values.push(updateData.payment_reference);
      paramCount++;
    }

    if (updateData.notes !== undefined) {
      setClauses.push(`notes = $${paramCount}`);
      values.push(updateData.notes);
      paramCount++;
    }

    if (setClauses.length === 0) {
      throw new ValidationError('No update data provided');
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    await query(`
      UPDATE tenant_freelance_submissions
      SET ${setClauses.join(', ')}
      WHERE tenant_id = $1 AND submission_id = $2
    `, values);

    // Recalculate period totals
    await recalculatePeriodTotals(tenantId, existingSubmission.period_id);

    // Fetch updated submission with driver info
    const updatedSubmission = await queryOne<FreelanceSubmission>(`
      SELECT
        fs.*,
        d.name as driver_name,
        d.phone as driver_phone,
        d.email as driver_email
      FROM tenant_freelance_submissions fs
      JOIN tenant_drivers d ON fs.driver_id = d.driver_id AND fs.tenant_id = d.tenant_id
      WHERE fs.tenant_id = $1 AND fs.submission_id = $2
    `, [tenantId, submissionId]);

    logger.info('Freelance submission updated', { submissionId });

    res.json(updatedSubmission);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/payroll/freelance/:submissionId
 * @desc Delete freelance submission
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/payroll/freelance/:submissionId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, submissionId } = req.params;

    logger.info('Deleting freelance submission', { tenantId, submissionId });

    // Get submission info before deleting
    const submission = await queryOne<FreelanceSubmission>(
      'SELECT * FROM tenant_freelance_submissions WHERE tenant_id = $1 AND submission_id = $2',
      [tenantId, submissionId]
    );

    if (!submission) {
      throw new NotFoundError('Freelance submission not found');
    }

    // Delete the submission
    await query('DELETE FROM tenant_freelance_submissions WHERE tenant_id = $1 AND submission_id = $2', [tenantId, submissionId]);

    logger.info('Freelance submission deleted', { submissionId });

    // Recalculate period totals
    await recalculatePeriodTotals(tenantId, submission.period_id);

    res.json({
      message: 'Freelance submission deleted successfully',
      submissionId: parseInt(submissionId),
    });
  })
);

// ============================================================================
// SUMMARY AND STATS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/payroll/periods/:periodId/summary
 * @desc Get complete payroll summary for a period
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/payroll/periods/:periodId/summary',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Fetching payroll summary', { tenantId, periodId });

    // Get period details
    const period = await queryOne<PayrollPeriod>(
      'SELECT * FROM tenant_payroll_periods WHERE tenant_id = $1 AND period_id = $2',
      [tenantId, periodId]
    );

    if (!period) {
      throw new NotFoundError('Payroll period not found');
    }

    // Get contracted employee count
    const contractedCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_payroll_records
       WHERE tenant_id = $1 AND period_id = $2 AND employment_type != 'freelance'`,
      [tenantId, periodId]
    );

    // Get freelance count
    const freelanceCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_freelance_submissions WHERE tenant_id = $1 AND period_id = $2',
      [tenantId, periodId]
    );

    // Get joiners
    const joiners = await query<PayrollMovement>(`
      SELECT
        pm.*,
        d.name as driver_name,
        d.phone as driver_phone,
        d.employment_type
      FROM tenant_payroll_movements pm
      JOIN tenant_drivers d ON pm.driver_id = d.driver_id AND pm.tenant_id = d.tenant_id
      WHERE pm.tenant_id = $1 AND pm.period_id = $2 AND pm.movement_type = 'joiner'
      ORDER BY pm.movement_date DESC
    `, [tenantId, periodId]);

    // Get leavers
    const leavers = await query<PayrollMovement>(`
      SELECT
        pm.*,
        d.name as driver_name,
        d.phone as driver_phone,
        d.employment_type
      FROM tenant_payroll_movements pm
      JOIN tenant_drivers d ON pm.driver_id = d.driver_id AND pm.tenant_id = d.tenant_id
      WHERE pm.tenant_id = $1 AND pm.period_id = $2 AND pm.movement_type = 'leaver'
      ORDER BY pm.movement_date DESC
    `, [tenantId, periodId]);

    const summary: PayrollSummary = {
      period,
      contracted_count: parseInt(contractedCount?.count || '0', 10),
      freelance_count: parseInt(freelanceCount?.count || '0', 10),
      total_employees: parseInt(contractedCount?.count || '0', 10) + parseInt(freelanceCount?.count || '0', 10),
      joiners,
      leavers,
      total_gross: period.total_gross,
      total_net: period.total_net,
      total_tax: period.total_tax,
      total_ni: period.total_ni,
      total_pension: period.total_pension,
      hmrc_payment_due: period.hmrc_payment_due,
    };

    res.json(summary);
  })
);

/**
 * @route GET /api/tenants/:tenantId/payroll/stats
 * @desc Get overall payroll statistics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/payroll/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching payroll stats', { tenantId });

    // Total periods
    const periodCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_payroll_periods WHERE tenant_id = $1',
      [tenantId]
    );

    // Active employees (from drivers with employment_type not freelance)
    const activeEmployees = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_drivers
       WHERE tenant_id = $1 AND is_active = true AND employment_type != 'freelance'`,
      [tenantId]
    );

    // Freelance count
    const freelanceDrivers = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_drivers
       WHERE tenant_id = $1 AND is_active = true AND employment_type = 'freelance'`,
      [tenantId]
    );

    // This month's stats (current month period)
    const thisMonthStats = await queryOne<{
      total_gross: string;
      total_net: string;
      hmrc_payment_due: string;
    }>(`
      SELECT
        COALESCE(SUM(total_gross), 0) as total_gross,
        COALESCE(SUM(total_net), 0) as total_net,
        COALESCE(SUM(hmrc_payment_due), 0) as hmrc_payment_due
      FROM tenant_payroll_periods
      WHERE tenant_id = $1
        AND period_start >= DATE_TRUNC('month', CURRENT_DATE)
        AND period_end <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    `, [tenantId]);

    // Year to date stats
    const ytdStats = await queryOne<{
      total_gross: string;
      total_net: string;
      hmrc_payment_due: string;
    }>(`
      SELECT
        COALESCE(SUM(total_gross), 0) as total_gross,
        COALESCE(SUM(total_net), 0) as total_net,
        COALESCE(SUM(hmrc_payment_due), 0) as hmrc_payment_due
      FROM tenant_payroll_periods
      WHERE tenant_id = $1
        AND period_start >= DATE_TRUNC('year', CURRENT_DATE)
    `, [tenantId]);

    const stats: PayrollStats = {
      total_periods: parseInt(periodCount?.count || '0', 10),
      active_employees: parseInt(activeEmployees?.count || '0', 10),
      freelance_count: parseInt(freelanceDrivers?.count || '0', 10),
      this_month_gross: parseFloat(thisMonthStats?.total_gross || '0'),
      this_month_net: parseFloat(thisMonthStats?.total_net || '0'),
      this_month_hmrc: parseFloat(thisMonthStats?.hmrc_payment_due || '0'),
      ytd_gross: parseFloat(ytdStats?.total_gross || '0'),
      ytd_net: parseFloat(ytdStats?.total_net || '0'),
      ytd_hmrc: parseFloat(ytdStats?.hmrc_payment_due || '0'),
    };

    res.json(stats);
  })
);

// ============================================================================
// AUTO-GENERATION
// ============================================================================

/**
 * @route POST /api/tenants/:tenantId/payroll/periods/:periodId/generate
 * @desc Auto-generate payroll records for all active drivers
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/payroll/periods/:periodId/generate',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, periodId } = req.params;

    logger.info('Auto-generating payroll records', { tenantId, periodId });

    // Check period exists and is in draft status
    const period = await queryOne<PayrollPeriod>(
      'SELECT * FROM tenant_payroll_periods WHERE tenant_id = $1 AND period_id = $2',
      [tenantId, periodId]
    );

    if (!period) {
      throw new NotFoundError('Payroll period not found');
    }

    if (period.status !== 'draft') {
      throw new ValidationError('Can only auto-generate for draft periods');
    }

    // Get all active drivers
    const drivers = await query<{
      driver_id: number;
      employment_type: string;
      weekly_wage: number;
      monthly_salary: number;
      hourly_rate: number;
      tax_code: string;
      ni_number: string;
    }>(`
      SELECT
        driver_id,
        employment_type,
        weekly_wage,
        salary_structure->>'monthlySalary' as monthly_salary,
        salary_structure->>'hourlyRate' as hourly_rate,
        tax_code,
        ni_number
      FROM tenant_drivers
      WHERE tenant_id = $1 AND is_active = true AND employment_type != 'freelance'
    `, [tenantId]);

    let createdCount = 0;
    let skippedCount = 0;

    for (const driver of drivers) {
      // Check if record already exists
      const existing = await query(
        'SELECT record_id FROM tenant_payroll_records WHERE tenant_id = $1 AND period_id = $2 AND driver_id = $3',
        [tenantId, periodId, driver.driver_id]
      );

      if (existing.length > 0) {
        skippedCount++;
        continue;
      }

      // Calculate gross pay based on employment type
      let grossPay = 0;
      let hoursWorked = null;
      let hourlyRate = null;
      let weeklyWage = null;
      let monthlySalary = null;

      const employmentType = driver.employment_type as EmploymentType;

      switch (employmentType) {
        case 'contracted_monthly':
          monthlySalary = parseFloat(driver.monthly_salary?.toString() || '0');
          grossPay = monthlySalary;
          break;
        case 'contracted_weekly':
          weeklyWage = driver.weekly_wage || 0;
          grossPay = weeklyWage;
          break;
        case 'contracted_hourly':
          hourlyRate = parseFloat(driver.hourly_rate?.toString() || '0');
          hoursWorked = 40; // Default 40 hours, can be adjusted later
          grossPay = hoursWorked * hourlyRate;
          break;
      }

      // Simple tax calculation (20% basic rate, simplified)
      const taxDeducted = grossPay * 0.20;
      const niDeducted = grossPay * 0.12;
      const pensionDeducted = grossPay * 0.05;
      const netPay = grossPay - taxDeducted - niDeducted - pensionDeducted;

      // Create record
      await query(`
        INSERT INTO tenant_payroll_records (
          tenant_id,
          period_id,
          driver_id,
          employment_type,
          hours_worked,
          hourly_rate,
          weekly_wage,
          monthly_salary,
          gross_pay,
          tax_deducted,
          ni_deducted,
          pension_deducted,
          other_deductions,
          net_pay,
          payment_status,
          is_new_joiner,
          is_leaver
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13, 'pending', false, false)
      `, [
        tenantId,
        periodId,
        driver.driver_id,
        employmentType,
        hoursWorked,
        hourlyRate,
        weeklyWage,
        monthlySalary,
        grossPay,
        taxDeducted,
        niDeducted,
        pensionDeducted,
        netPay,
      ]);

      createdCount++;
    }

    // Recalculate period totals
    await recalculatePeriodTotals(tenantId, periodId);

    logger.info('Payroll records auto-generated', { createdCount, skippedCount });

    res.json({
      message: 'Payroll records generated successfully',
      created: createdCount,
      skipped: skippedCount,
      total: drivers.length,
    });
  })
);

export default router;
