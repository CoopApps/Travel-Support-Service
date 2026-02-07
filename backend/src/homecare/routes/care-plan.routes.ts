import express, { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger, careEventLog } from '../utils/logger';
import { sanitizeCareNotes } from '../utils/sanitize';

const router: Router = express.Router();

/**
 * Care Plan Routes for Home Care Co-operative System
 *
 * Care plans define the regular care needs and tasks for each client.
 */

/**
 * @route GET /api/tenants/:tenantId/care-plans
 * @desc Get all care plans
 */
router.get(
  '/tenants/:tenantId/care-plans',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { clientId, status, page = 1, limit = 20 } = req.query;

    const conditions: string[] = ['cp.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (clientId) {
      conditions.push(`cp.client_id = $${paramCount}`);
      params.push(clientId);
      paramCount++;
    }

    if (status) {
      conditions.push(`cp.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (Number(page) - 1) * Number(limit);

    const carePlans = await query(
      `SELECT
        cp.care_plan_id as id, cp.client_id, cp.version,
        cp.start_date, cp.end_date, cp.status,
        cp.weekly_hours, cp.visits_per_week,
        cp.review_date, cp.reviewed_by,
        cl.first_name as client_first_name, cl.last_name as client_last_name,
        cp.created_at, cp.updated_at
      FROM tenant_care_plans cp
      JOIN tenant_clients cl ON cp.client_id = cl.client_id AND cp.tenant_id = cl.tenant_id
      WHERE ${whereClause}
      ORDER BY cp.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    res.json({ carePlans });
  })
);

/**
 * @route GET /api/tenants/:tenantId/care-plans/:carePlanId
 * @desc Get a specific care plan
 */
router.get(
  '/tenants/:tenantId/care-plans/:carePlanId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carePlanId } = req.params;

    const carePlan = await queryOne(
      `SELECT
        cp.*,
        cl.first_name as client_first_name, cl.last_name as client_last_name,
        cl.date_of_birth, cl.medical_conditions, cl.allergies, cl.medications,
        cl.mobility_level, cl.care_level, cl.mental_capacity
      FROM tenant_care_plans cp
      JOIN tenant_clients cl ON cp.client_id = cl.client_id AND cp.tenant_id = cl.tenant_id
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
 * @route POST /api/tenants/:tenantId/care-plans
 * @desc Create a new care plan
 */
router.post(
  '/tenants/:tenantId/care-plans',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;
    const planData = req.body;

    if (!planData.clientId) {
      throw new ValidationError('Client ID is required');
    }

    // Get current version for this client
    const currentVersion = await queryOne<{ version: number }>(
      `SELECT COALESCE(MAX(version), 0) as version FROM tenant_care_plans
       WHERE tenant_id = $1 AND client_id = $2`,
      [tenantId, planData.clientId]
    );

    const newVersion = (currentVersion?.version || 0) + 1;

    // Deactivate any existing active plans
    await query(
      `UPDATE tenant_care_plans SET status = 'superseded', is_active = false, end_date = CURRENT_DATE
       WHERE tenant_id = $1 AND client_id = $2 AND status = 'active'`,
      [tenantId, planData.clientId]
    );

    const result = await queryOne<{ id: number }>(
      `INSERT INTO tenant_care_plans (
        tenant_id, client_id, version,
        start_date, review_date, status,
        weekly_hours, visits_per_week,
        care_needs, personal_care_tasks, medication_tasks, nutrition_tasks,
        mobility_tasks, domestic_tasks, social_tasks, health_monitoring_tasks,
        preferences, risk_assessment, goals,
        is_active, created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, COALESCE($4, CURRENT_DATE), $5, 'active',
        $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        true, NOW(), NOW(), $19
      ) RETURNING care_plan_id as id`,
      [
        tenantId, planData.clientId, newVersion,
        planData.startDate,
        planData.reviewDate,
        planData.weeklyHours,
        planData.visitsPerWeek,
        sanitizeCareNotes(planData.careNeeds),
        JSON.stringify(planData.personalCareTasks || []),
        JSON.stringify(planData.medicationTasks || []),
        JSON.stringify(planData.nutritionTasks || []),
        JSON.stringify(planData.mobilityTasks || []),
        JSON.stringify(planData.domesticTasks || []),
        JSON.stringify(planData.socialTasks || []),
        JSON.stringify(planData.healthMonitoringTasks || []),
        JSON.stringify(planData.preferences || {}),
        JSON.stringify(planData.riskAssessment || {}),
        JSON.stringify(planData.goals || []),
        user.userId,
      ]
    );

    careEventLog('CARE_PLAN_CREATED', {
      tenantId,
      carePlanId: result?.id,
      clientId: planData.clientId,
      version: newVersion,
      createdBy: user.userId,
    });

    res.status(201).json({
      id: result?.id,
      version: newVersion,
      message: 'Care plan created successfully',
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/care-plans/:carePlanId
 * @desc Update a care plan
 */
router.put(
  '/tenants/:tenantId/care-plans/:carePlanId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carePlanId } = req.params;
    const user = req.user!;
    const planData = req.body;

    const existing = await queryOne(
      'SELECT care_plan_id FROM tenant_care_plans WHERE tenant_id = $1 AND care_plan_id = $2',
      [tenantId, carePlanId]
    );

    if (!existing) {
      throw new NotFoundError('Care plan not found');
    }

    await query(
      `UPDATE tenant_care_plans SET
        weekly_hours = COALESCE($3, weekly_hours),
        visits_per_week = COALESCE($4, visits_per_week),
        care_needs = COALESCE($5, care_needs),
        personal_care_tasks = COALESCE($6, personal_care_tasks),
        medication_tasks = COALESCE($7, medication_tasks),
        preferences = COALESCE($8, preferences),
        risk_assessment = COALESCE($9, risk_assessment),
        goals = COALESCE($10, goals),
        review_date = COALESCE($11, review_date),
        updated_at = NOW(),
        updated_by = $12
      WHERE tenant_id = $1 AND care_plan_id = $2`,
      [
        tenantId, carePlanId,
        planData.weeklyHours,
        planData.visitsPerWeek,
        planData.careNeeds ? sanitizeCareNotes(planData.careNeeds) : null,
        planData.personalCareTasks ? JSON.stringify(planData.personalCareTasks) : null,
        planData.medicationTasks ? JSON.stringify(planData.medicationTasks) : null,
        planData.preferences ? JSON.stringify(planData.preferences) : null,
        planData.riskAssessment ? JSON.stringify(planData.riskAssessment) : null,
        planData.goals ? JSON.stringify(planData.goals) : null,
        planData.reviewDate,
        user.userId,
      ]
    );

    careEventLog('CARE_PLAN_UPDATED', {
      tenantId,
      carePlanId,
      updatedBy: user.userId,
    });

    res.json({ message: 'Care plan updated successfully' });
  })
);

/**
 * @route POST /api/tenants/:tenantId/care-plans/:carePlanId/review
 * @desc Mark care plan as reviewed
 */
router.post(
  '/tenants/:tenantId/care-plans/:carePlanId/review',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carePlanId } = req.params;
    const user = req.user!;
    const { nextReviewDate, reviewNotes } = req.body;

    await query(
      `UPDATE tenant_care_plans SET
        last_reviewed = CURRENT_DATE,
        reviewed_by = $3,
        review_notes = $4,
        review_date = $5,
        updated_at = NOW()
      WHERE tenant_id = $1 AND care_plan_id = $2`,
      [tenantId, carePlanId, user.userId, sanitizeCareNotes(reviewNotes), nextReviewDate]
    );

    careEventLog('CARE_PLAN_REVIEWED', {
      tenantId,
      carePlanId,
      reviewedBy: user.userId,
      nextReviewDate,
    });

    res.json({ message: 'Care plan reviewed successfully' });
  })
);

export default router;
