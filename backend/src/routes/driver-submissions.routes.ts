import express, { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import Joi from 'joi';

const router: Router = express.Router();

/**
 * Driver Hours & Fuel Submissions Routes
 *
 * For freelance drivers to submit:
 * - Weekly hours worked
 * - Fuel costs for reimbursement
 */

// Validation schemas
const hoursSubmissionSchema = Joi.object({
  driver_id: Joi.number().integer().required(),
  week_ending: Joi.string().isoDate().required(),
  regular_hours: Joi.number().min(0).max(80).required(),
  overtime_hours: Joi.number().min(0).max(40).default(0),
  notes: Joi.string().allow('').optional(),
});

const fuelSubmissionSchema = Joi.object({
  driver_id: Joi.number().integer().required(),
  date: Joi.string().isoDate().required(),
  station: Joi.string().min(1).max(100).required(),
  litres: Joi.number().min(0.01).max(100).required(),
  cost: Joi.number().min(0.01).max(200).required(),
  mileage: Joi.number().integer().min(0).allow(null).optional(),
  notes: Joi.string().allow('').optional(),
});

// =====================================================
// DRIVER HOURS ENDPOINTS
// =====================================================

/**
 * Submit weekly hours
 * POST /api/tenants/:tenantId/driver-hours
 */
router.post(
  '/tenants/:tenantId/driver-hours',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Validate request body
    const { error, value } = hoursSubmissionSchema.validate(req.body);
    if (error) {
      throw new ValidationError(
        error.details.map(d => d.message).join(', ')
      );
    }

    const { driver_id, week_ending, regular_hours, overtime_hours, notes } = value;

    // Verify driver belongs to tenant and is freelance
    const driver = await queryOne(
      `SELECT driver_id, hourly_rate, employment_type
       FROM tenant_drivers
       WHERE driver_id = $1 AND tenant_id = $2`,
      [driver_id, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    if (driver.employment_type !== 'freelance') {
      throw new ValidationError('Only freelance drivers can submit hours');
    }

    // Check for duplicate submission
    const duplicate = await queryOne(
      `SELECT hours_id FROM tenant_driver_hours
       WHERE driver_id = $1 AND tenant_id = $2 AND week_ending = $3`,
      [driver_id, tenantId, week_ending]
    );

    if (duplicate) {
      return res.status(409).json({
        error: 'Hours already submitted for this week',
        existing_id: duplicate.hours_id
      });
    }

    // Get rates
    const hourly_rate = driver.hourly_rate || 12.50;
    const overtime_rate = hourly_rate * 1.5;

    // Insert hours submission
    const submission = await queryOne(
      `INSERT INTO tenant_driver_hours (
        tenant_id,
        driver_id,
        week_ending,
        regular_hours,
        overtime_hours,
        hourly_rate,
        overtime_rate,
        status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', $8)
      RETURNING
        hours_id,
        week_ending,
        regular_hours,
        overtime_hours,
        total_hours,
        hourly_rate,
        overtime_rate,
        regular_pay,
        overtime_pay,
        total_pay,
        status,
        created_at`,
      [
        tenantId,
        driver_id,
        week_ending,
        regular_hours,
        overtime_hours,
        hourly_rate,
        overtime_rate,
        notes || null,
      ]
    );

    return res.status(201).json({
      message: 'Hours submitted successfully',
      submission,
    });
  })
);

/**
 * Get driver hours submissions
 * GET /api/tenants/:tenantId/driver-hours
 */
router.get(
  '/tenants/:tenantId/driver-hours',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { driver_id, status, from_date, to_date } = req.query;

    let queryStr = `
      SELECT
        h.*,
        d.name as driver_name
      FROM tenant_driver_hours h
      LEFT JOIN tenant_drivers d ON h.driver_id = d.driver_id AND h.tenant_id = d.tenant_id
      WHERE h.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (driver_id) {
      queryStr += ` AND h.driver_id = $${paramIndex}`;
      params.push(driver_id);
      paramIndex++;
    }

    if (status) {
      queryStr += ` AND h.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (from_date) {
      queryStr += ` AND h.week_ending >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      queryStr += ` AND h.week_ending <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    queryStr += ' ORDER BY h.week_ending DESC, h.created_at DESC';

    const submissions = await query(queryStr, params);

    return res.json({
      submissions,
      total: submissions.length,
    });
  })
);

/**
 * Approve/reject hours submission (admin only)
 * PUT /api/tenants/:tenantId/driver-hours/:hoursId
 */
router.put(
  '/tenants/:tenantId/driver-hours/:hoursId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, hoursId } = req.params;
    const { status, rejection_reason } = req.body;

    if (!['approved', 'rejected', 'paid'].includes(status)) {
      throw new ValidationError('Invalid status. Must be: approved, rejected, or paid');
    }

    const updates: string[] = [`status = $1`];
    const params: any[] = [status];
    let paramIndex = 2;

    if (status === 'approved') {
      updates.push(`approved_by = $${paramIndex}`);
      params.push(req.user?.userId);
      paramIndex++;
      updates.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'rejected' && rejection_reason) {
      updates.push(`rejection_reason = $${paramIndex}`);
      params.push(rejection_reason);
      paramIndex++;
    }

    if (status === 'paid') {
      updates.push(`paid_date = CURRENT_DATE`);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(hoursId, tenantId);
    const queryStr = `
      UPDATE tenant_driver_hours
      SET ${updates.join(', ')}
      WHERE hours_id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const submission = await queryOne(queryStr, params);

    if (!submission) {
      throw new NotFoundError('Hours submission not found');
    }

    return res.json({
      message: `Hours submission ${status} successfully`,
      submission,
    });
  })
);

// =====================================================
// DRIVER FUEL COSTS ENDPOINTS
// =====================================================

/**
 * Submit fuel costs
 * POST /api/tenants/:tenantId/driver-fuel
 */
router.post(
  '/tenants/:tenantId/driver-fuel',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Validate request body
    const { error, value } = fuelSubmissionSchema.validate(req.body);
    if (error) {
      throw new ValidationError(
        error.details.map(d => d.message).join(', ')
      );
    }

    const { driver_id, date, station, litres, cost, mileage, notes } = value;

    // Verify driver belongs to tenant and is freelance
    const driver = await queryOne(
      `SELECT driver_id, employment_type
       FROM tenant_drivers
       WHERE driver_id = $1 AND tenant_id = $2`,
      [driver_id, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    if (driver.employment_type !== 'freelance') {
      throw new ValidationError('Only freelance drivers can submit fuel costs');
    }

    // Check date is not in future
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
      throw new ValidationError('Fuel date cannot be in the future');
    }

    // Insert fuel submission
    const submission = await queryOne(
      `INSERT INTO tenant_driver_fuel (
        tenant_id,
        driver_id,
        date,
        station,
        litres,
        cost,
        mileage,
        status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', $8)
      RETURNING
        fuel_id,
        date,
        station,
        litres,
        cost,
        price_per_litre,
        mileage,
        status,
        created_at`,
      [
        tenantId,
        driver_id,
        date,
        station,
        litres,
        cost,
        mileage || null,
        notes || null,
      ]
    );

    return res.status(201).json({
      message: 'Fuel costs submitted successfully',
      submission,
    });
  })
);

/**
 * Get driver fuel submissions
 * GET /api/tenants/:tenantId/driver-fuel
 */
router.get(
  '/tenants/:tenantId/driver-fuel',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { driver_id, status, from_date, to_date } = req.query;

    let queryStr = `
      SELECT
        f.*,
        d.name as driver_name
      FROM tenant_driver_fuel f
      LEFT JOIN tenant_drivers d ON f.driver_id = d.driver_id AND f.tenant_id = d.tenant_id
      WHERE f.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (driver_id) {
      queryStr += ` AND f.driver_id = $${paramIndex}`;
      params.push(driver_id);
      paramIndex++;
    }

    if (status) {
      queryStr += ` AND f.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (from_date) {
      queryStr += ` AND f.date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      queryStr += ` AND f.date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    queryStr += ' ORDER BY f.date DESC, f.created_at DESC';

    const submissions = await query(queryStr, params);

    return res.json({
      submissions,
      total: submissions.length,
    });
  })
);

/**
 * Approve/reject fuel submission (admin only)
 * PUT /api/tenants/:tenantId/driver-fuel/:fuelId
 */
router.put(
  '/tenants/:tenantId/driver-fuel/:fuelId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, fuelId } = req.params;
    const { status, rejection_reason, reimbursement_reference } = req.body;

    if (!['approved', 'rejected', 'reimbursed'].includes(status)) {
      throw new ValidationError('Invalid status. Must be: approved, rejected, or reimbursed');
    }

    const updates: string[] = [`status = $1`];
    const params: any[] = [status];
    let paramIndex = 2;

    if (status === 'approved') {
      updates.push(`approved_by = $${paramIndex}`);
      params.push(req.user?.userId);
      paramIndex++;
      updates.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'rejected' && rejection_reason) {
      updates.push(`rejection_reason = $${paramIndex}`);
      params.push(rejection_reason);
      paramIndex++;
    }

    if (status === 'reimbursed') {
      updates.push(`reimbursed_date = CURRENT_DATE`);
      if (reimbursement_reference) {
        updates.push(`reimbursement_reference = $${paramIndex}`);
        params.push(reimbursement_reference);
        paramIndex++;
      }
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(fuelId, tenantId);
    const queryStr = `
      UPDATE tenant_driver_fuel
      SET ${updates.join(', ')}
      WHERE fuel_id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const submission = await queryOne(queryStr, params);

    if (!submission) {
      throw new NotFoundError('Fuel submission not found');
    }

    return res.json({
      message: `Fuel submission ${status} successfully`,
      submission,
    });
  })
);

export default router;
