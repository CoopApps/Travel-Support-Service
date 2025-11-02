import express, { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router: Router = express.Router();

/**
 * Safeguarding Reports Routes
 *
 * CRITICAL NEW FEATURE - Missing from legacy system!
 * Allows drivers to report safeguarding concerns
 */

// Validation schema
const safeguardingReportSchema = Joi.object({
  driver_id: Joi.number().integer().required(),
  incident_type: Joi.string().valid(
    'child_safety',
    'vulnerable_adult',
    'abuse',
    'neglect',
    'harassment',
    'unsafe_environment',
    'medical_concern',
    'other'
  ).required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  customer_id: Joi.number().integer().allow(null).optional(),
  location: Joi.string().max(255).required(),
  incident_date: Joi.string().isoDate().required(),
  description: Joi.string().min(10).required(),
  action_taken: Joi.string().allow('').optional(),
  confidential: Joi.boolean().default(false),
});

/**
 * Submit new safeguarding report
 * POST /api/tenants/:tenantId/safeguarding-reports
 */
router.post(
  '/tenants/:tenantId/safeguarding-reports',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Validate request body
    const { error, value } = safeguardingReportSchema.validate(req.body);
    if (error) {
      throw new ValidationError(
        error.details.map(d => d.message).join(', ')
      );
    }

    const {
      driver_id,
      incident_type,
      severity,
      customer_id,
      location,
      incident_date,
      description,
      action_taken,
      confidential,
    } = value;

    // Verify driver belongs to tenant
    const driver = await queryOne(
      'SELECT driver_id FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2',
      [driver_id, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Insert safeguarding report
    const result = await queryOne(
      `INSERT INTO tenant_safeguarding_reports (
        tenant_id,
        driver_id,
        customer_id,
        incident_type,
        severity,
        incident_date,
        location,
        description,
        action_taken,
        confidential,
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'submitted', $11)
      RETURNING report_id, incident_type, severity, status, created_at`,
      [
        tenantId,
        driver_id,
        customer_id || null,
        incident_type,
        severity,
        incident_date,
        location,
        description,
        action_taken || 'None',
        confidential,
        req.user?.userId || driver_id,
      ]
    );

    // Log critical reports
    if (severity === 'high' || severity === 'critical') {
      logger.error(`🚨 CRITICAL SAFEGUARDING REPORT: ${result.report_id} - Severity: ${severity}`, {
        report_id: result.report_id,
        tenant_id: tenantId,
        driver_id,
        severity,
        incident_type,
      });
      // TODO: Send email/SMS to management
    }

    res.status(201).json({
      message: 'Safeguarding report submitted successfully',
      report_id: result.report_id,
      reference_number: `SG-${tenantId}-${result.report_id}`,
      status: result.status,
      created_at: result.created_at,
    });
  })
);

/**
 * Get all safeguarding reports for tenant (admin only)
 * GET /api/tenants/:tenantId/safeguarding-reports
 */
router.get(
  '/tenants/:tenantId/safeguarding-reports',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { status, severity, driver_id, from_date, to_date } = req.query;

    let queryStr = `
      SELECT
        sr.*,
        d.name as driver_name,
        c.name as customer_name,
        u.full_name as assigned_to_name
      FROM tenant_safeguarding_reports sr
      LEFT JOIN tenant_drivers d ON sr.driver_id = d.driver_id AND sr.tenant_id = d.tenant_id
      LEFT JOIN tenant_customers c ON sr.customer_id = c.customer_id AND sr.tenant_id = c.tenant_id
      LEFT JOIN tenant_users u ON sr.assigned_to = u.user_id
      WHERE sr.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      queryStr += ` AND sr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (severity) {
      queryStr += ` AND sr.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (driver_id) {
      queryStr += ` AND sr.driver_id = $${paramIndex}`;
      params.push(driver_id);
      paramIndex++;
    }

    if (from_date) {
      queryStr += ` AND sr.incident_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      queryStr += ` AND sr.incident_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    queryStr += ' ORDER BY sr.created_at DESC';

    const reports = await query(queryStr, params);

    res.json({
      reports,
      total: reports.length,
    });
  })
);

/**
 * Get specific safeguarding report
 * GET /api/tenants/:tenantId/safeguarding-reports/:reportId
 */
router.get(
  '/tenants/:tenantId/safeguarding-reports/:reportId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, reportId } = req.params;

    const report = await queryOne(
      `SELECT
        sr.*,
        d.name as driver_name,
        d.phone as driver_phone,
        c.name as customer_name,
        c.address as customer_address,
        u.full_name as assigned_to_name
      FROM tenant_safeguarding_reports sr
      LEFT JOIN tenant_drivers d ON sr.driver_id = d.driver_id AND sr.tenant_id = d.tenant_id
      LEFT JOIN tenant_customers c ON sr.customer_id = c.customer_id AND sr.tenant_id = c.tenant_id
      LEFT JOIN tenant_users u ON sr.assigned_to = u.user_id
      WHERE sr.report_id = $1 AND sr.tenant_id = $2`,
      [reportId, tenantId]
    );

    if (!report) {
      throw new NotFoundError('Safeguarding report not found');
    }

    res.json(report);
  })
);

/**
 * Update safeguarding report status (admin only)
 * PUT /api/tenants/:tenantId/safeguarding-reports/:reportId
 */
router.put(
  '/tenants/:tenantId/safeguarding-reports/:reportId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, reportId } = req.params;
    const { status, assigned_to, investigation_notes, resolution } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`);
      params.push(assigned_to);
      paramIndex++;
    }

    if (investigation_notes) {
      updates.push(`investigation_notes = $${paramIndex}`);
      params.push(investigation_notes);
      paramIndex++;
    }

    if (resolution) {
      updates.push(`resolution = $${paramIndex}`);
      params.push(resolution);
      paramIndex++;

      if (status === 'resolved') {
        updates.push(`resolved_date = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.length === 0) {
      throw new ValidationError('No updates provided');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(reportId, tenantId);
    const queryStr = `
      UPDATE tenant_safeguarding_reports
      SET ${updates.join(', ')}
      WHERE report_id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const report = await queryOne(queryStr, params);

    if (!report) {
      throw new NotFoundError('Safeguarding report not found');
    }

    res.json({
      message: 'Safeguarding report updated successfully',
      report,
    });
  })
);

export default router;
