import express, { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { query, queryOne } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errorTypes';
import { logger } from '../../utils/logger';
import { sanitizeInput } from '../../utils/sanitize';

const router: Router = express.Router();

/**
 * Home Care Plan Routes
 * Manages care plans for clients
 */

/**
 * GET /api/homecare/tenants/:tenantId/care-plans
 * List all care plans (optionally filtered by client)
 */
router.get(
  '/tenants/:tenantId/care-plans',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { client_id, status = 'active' } = req.query;

    let sql = `
      SELECT
        cp.care_plan_id,
        cp.client_id,
        cp.category,
        cp.care_needs,
        cp.support_required,
        cp.goals,
        cp.frequency,
        cp.preferred_time,
        cp.last_review_date,
        cp.next_review_date,
        cp.status,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        cp.created_at
      FROM tenant_care_plans cp
      JOIN tenant_care_clients c ON cp.client_id = c.client_id AND cp.tenant_id = c.tenant_id
      WHERE cp.tenant_id = $1
    `;

    const params: any[] = [tenantId];

    if (client_id) {
      sql += ` AND cp.client_id = $${params.length + 1}`;
      params.push(client_id);
    }

    if (status && status !== 'all') {
      sql += ` AND cp.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ' ORDER BY c.last_name, c.first_name, cp.category';

    const carePlans = await query(sql, params);

    logger.info(`Listed ${carePlans.length} care plans for tenant ${tenantId}`);
    res.json(carePlans);
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/clients/:clientId/care-plans
 * Get all care plans for a specific client
 */
router.get(
  '/tenants/:tenantId/clients/:clientId/care-plans',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;

    const carePlans = await query(
      `SELECT * FROM tenant_care_plans
       WHERE tenant_id = $1 AND client_id = $2
       AND status = 'active'
       ORDER BY category`,
      [tenantId, clientId]
    );

    res.json(carePlans);
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/care-plans/:carePlanId
 * Get a specific care plan by ID
 */
router.get(
  '/tenants/:tenantId/care-plans/:carePlanId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carePlanId } = req.params;

    const carePlan = await queryOne(
      `SELECT
        cp.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.medical_conditions,
        c.mobility_needs
       FROM tenant_care_plans cp
       JOIN tenant_care_clients c ON cp.client_id = c.client_id AND cp.tenant_id = c.tenant_id
       WHERE cp.tenant_id = $1 AND cp.care_plan_id = $2`,
      [tenantId, carePlanId]
    );

    if (!carePlan) {
      throw new NotFoundError('Care plan not found');
    }

    res.json(carePlan);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/clients/:clientId/care-plans
 * Create a new care plan for a client
 */
router.post(
  '/tenants/:tenantId/clients/:clientId/care-plans',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;
    const {
      category,
      care_needs,
      support_required,
      goals,
      frequency,
      preferred_time,
      next_review_date,
    } = req.body;

    // Validate required fields
    if (!category || !care_needs) {
      throw new ValidationError('Category and care needs are required');
    }

    const result = await queryOne(
      `INSERT INTO tenant_care_plans (
        tenant_id, client_id, category,
        care_needs, support_required, goals,
        frequency, preferred_time,
        created_date, next_review_date,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, 'active'
      ) RETURNING *`,
      [
        tenantId,
        clientId,
        sanitizeInput(category),
        sanitizeInput(care_needs),
        support_required ? sanitizeInput(support_required) : null,
        goals ? sanitizeInput(goals) : null,
        frequency || 'as_needed',
        preferred_time || null,
        next_review_date || null,
      ]
    );

    logger.info(`Created care plan ${result.care_plan_id} for client ${clientId} in tenant ${tenantId}`);
    res.status(201).json(result);
  })
);

/**
 * PUT /api/homecare/tenants/:tenantId/care-plans/:carePlanId
 * Update an existing care plan
 */
router.put(
  '/tenants/:tenantId/care-plans/:carePlanId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carePlanId } = req.params;
    const {
      category,
      care_needs,
      support_required,
      goals,
      frequency,
      preferred_time,
      last_review_date,
      next_review_date,
      status,
    } = req.body;

    // Check if care plan exists
    const existing = await queryOne(
      'SELECT care_plan_id FROM tenant_care_plans WHERE tenant_id = $1 AND care_plan_id = $2',
      [tenantId, carePlanId]
    );

    if (!existing) {
      throw new NotFoundError('Care plan not found');
    }

    const result = await queryOne(
      `UPDATE tenant_care_plans SET
        category = COALESCE($3, category),
        care_needs = COALESCE($4, care_needs),
        support_required = COALESCE($5, support_required),
        goals = COALESCE($6, goals),
        frequency = COALESCE($7, frequency),
        preferred_time = COALESCE($8, preferred_time),
        last_review_date = COALESCE($9, last_review_date),
        next_review_date = COALESCE($10, next_review_date),
        status = COALESCE($11, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND care_plan_id = $2
      RETURNING *`,
      [
        tenantId,
        carePlanId,
        category ? sanitizeInput(category) : null,
        care_needs ? sanitizeInput(care_needs) : null,
        support_required ? sanitizeInput(support_required) : null,
        goals ? sanitizeInput(goals) : null,
        frequency,
        preferred_time,
        last_review_date,
        next_review_date,
        status,
      ]
    );

    logger.info(`Updated care plan ${carePlanId} for tenant ${tenantId}`);
    res.json(result);
  })
);

/**
 * DELETE /api/homecare/tenants/:tenantId/care-plans/:carePlanId
 * Delete (archive) a care plan
 */
router.delete(
  '/tenants/:tenantId/care-plans/:carePlanId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carePlanId } = req.params;

    // Soft delete by setting status to archived
    const result = await queryOne(
      `UPDATE tenant_care_plans
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND care_plan_id = $2
       RETURNING care_plan_id`,
      [tenantId, carePlanId]
    );

    if (!result) {
      throw new NotFoundError('Care plan not found');
    }

    logger.info(`Archived care plan ${carePlanId} for tenant ${tenantId}`);
    res.json({ message: 'Care plan archived successfully' });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/care-plans/review/due
 * Get care plans that are due for review
 */
router.get(
  '/tenants/:tenantId/care-plans/review/due',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    const dueForReview = await query(
      `SELECT
        cp.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        EXTRACT(DAY FROM (next_review_date - CURRENT_DATE)) as days_until_review
       FROM tenant_care_plans cp
       JOIN tenant_care_clients c ON cp.client_id = c.client_id AND cp.tenant_id = c.tenant_id
       WHERE cp.tenant_id = $1
       AND cp.status = 'active'
       AND cp.next_review_date IS NOT NULL
       AND cp.next_review_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY cp.next_review_date`,
      [tenantId]
    );

    res.json(dueForReview);
  })
);

export default router;
