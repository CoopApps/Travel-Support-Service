import express, { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Customer Feedback Routes
 *
 * Complete feedback and complaints management system
 * - Customer-submitted feedback (from customer dashboard)
 * - Admin review and resolution tracking
 * - Status workflow management
 * - Analytics and reporting
 */

/**
 * @route GET /api/tenants/:tenantId/feedback
 * @desc Get all feedback with filtering and pagination
 * @access Protected (Admin)
 */
router.get(
  '/tenants/:tenantId/feedback',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = '1',
      limit = '20',
      status,
      feedbackType,
      severity,
      customerId,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    logger.info('Fetching feedback', { tenantId, filters: req.query });

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build WHERE clause dynamically
    const conditions: string[] = ['f.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`f.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (feedbackType) {
      conditions.push(`f.feedback_type = $${paramIndex}`);
      params.push(feedbackType);
      paramIndex++;
    }

    if (severity) {
      conditions.push(`f.severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    if (customerId) {
      conditions.push(`f.customer_id = $${paramIndex}`);
      params.push(customerId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM tenant_customer_feedback f
      WHERE ${whereClause}
    `, params);

    // Get feedback records
    const feedbackResult = await query(`
      SELECT
        f.*,
        c.name as customer_name,
        c.email as customer_email,
        d.name as driver_name,
        v.registration as vehicle_registration
      FROM tenant_customer_feedback f
      LEFT JOIN tenant_customers c ON f.customer_id = c.customer_id
      LEFT JOIN tenant_drivers d ON f.related_driver_id = d.driver_id AND f.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON f.related_vehicle_id = v.vehicle_id AND f.tenant_id = v.tenant_id
      WHERE ${whereClause}
      ORDER BY f.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const totalCount = countResult?.count || '0';

    res.json({
      feedback: Array.isArray(feedbackResult) ? feedbackResult : [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(totalCount),
        totalPages: Math.ceil(parseInt(totalCount) / parseInt(limit as string))
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/feedback/stats
 * @desc Get feedback statistics
 * @access Protected (Admin)
 */
router.get(
  '/tenants/:tenantId/feedback/stats',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching feedback statistics', { tenantId });

    const stats = await queryOne(`
      SELECT
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged,
        COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN feedback_type = 'complaint' THEN 1 END) as complaints,
        COUNT(CASE WHEN feedback_type = 'feedback' THEN 1 END) as feedback,
        COUNT(CASE WHEN feedback_type = 'compliment' THEN 1 END) as compliments,
        COUNT(CASE WHEN feedback_type = 'suggestion' THEN 1 END) as suggestions,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days,
        AVG(satisfaction_rating) as avg_satisfaction_rating
      FROM tenant_customer_feedback
      WHERE tenant_id = $1
    `, [tenantId]);

    res.json(stats);
  })
);

/**
 * @route GET /api/tenants/:tenantId/feedback/:feedbackId
 * @desc Get single feedback record
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/feedback/:feedbackId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, feedbackId } = req.params;

    logger.info('Fetching feedback details', { tenantId, feedbackId });

    const feedback = await queryOne(`
      SELECT
        f.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        d.name as driver_name,
        v.registration as vehicle_registration,
        assigned.name as assigned_to_name,
        acknowledged.name as acknowledged_by_name,
        resolved.name as resolved_by_name
      FROM tenant_customer_feedback f
      LEFT JOIN tenant_customers c ON f.customer_id = c.customer_id
      LEFT JOIN tenant_drivers d ON f.related_driver_id = d.driver_id AND f.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON f.related_vehicle_id = v.vehicle_id AND f.tenant_id = v.tenant_id
      LEFT JOIN tenant_users assigned ON f.assigned_to = assigned.user_id AND f.tenant_id = assigned.tenant_id
      LEFT JOIN tenant_users acknowledged ON f.acknowledged_by = acknowledged.user_id AND f.tenant_id = acknowledged.tenant_id
      LEFT JOIN tenant_users resolved ON f.resolved_by = resolved.user_id AND f.tenant_id = resolved.tenant_id
      WHERE f.feedback_id = $1 AND f.tenant_id = $2
    `, [feedbackId, tenantId]);

    if (!feedback) {
      throw new NotFoundError('Feedback not found');
    }

    res.json(feedback);
  })
);

/**
 * @route POST /api/tenants/:tenantId/feedback
 * @desc Create new feedback (from customer dashboard or admin)
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/feedback',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      customerId,
      feedbackType,
      category,
      subject,
      description,
      severity,
      relatedDriverId,
      relatedVehicleId,
      relatedTripId,
      incidentDate
    } = req.body;

    // Validation
    if (!customerId || !feedbackType || !subject || !description) {
      throw new ValidationError('Customer ID, feedback type, subject, and description are required');
    }

    logger.info('Creating new feedback', { tenantId, customerId, feedbackType });

    const result = await queryOne(`
      INSERT INTO tenant_customer_feedback (
        tenant_id,
        customer_id,
        submitted_by,
        feedback_type,
        category,
        subject,
        description,
        severity,
        status,
        related_driver_id,
        related_vehicle_id,
        related_trip_id,
        incident_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      tenantId,
      customerId,
      req.user?.userId || null,
      feedbackType,
      category || null,
      subject,
      description,
      severity || (feedbackType === 'complaint' ? 'medium' : 'low'),
      'pending',
      relatedDriverId || null,
      relatedVehicleId || null,
      relatedTripId || null,
      incidentDate || null,
      req.user?.userId || null
    ]);

    logger.info('Feedback created successfully', { feedbackId: result.feedback_id });

    res.status(201).json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/feedback/:feedbackId/acknowledge
 * @desc Acknowledge feedback receipt
 * @access Protected (Admin)
 */
router.put(
  '/tenants/:tenantId/feedback/:feedbackId/acknowledge',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, feedbackId } = req.params;
    const userId = req.user?.userId;

    logger.info('Acknowledging feedback', { tenantId, feedbackId, userId });

    const result = await queryOne(`
      UPDATE tenant_customer_feedback
      SET
        status = 'acknowledged',
        acknowledged_at = CURRENT_TIMESTAMP,
        acknowledged_by = $1
      WHERE feedback_id = $2 AND tenant_id = $3
      RETURNING *
    `, [userId, feedbackId, tenantId]);

    if (!result) {
      throw new NotFoundError('Feedback not found');
    }

    res.json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/feedback/:feedbackId/assign
 * @desc Assign feedback to a user
 * @access Protected (Admin)
 */
router.put(
  '/tenants/:tenantId/feedback/:feedbackId/assign',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, feedbackId } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      throw new ValidationError('Assigned user ID is required');
    }

    logger.info('Assigning feedback', { tenantId, feedbackId, assignedTo });

    const result = await queryOne(`
      UPDATE tenant_customer_feedback
      SET assigned_to = $1
      WHERE feedback_id = $2 AND tenant_id = $3
      RETURNING *
    `, [assignedTo, feedbackId, tenantId]);

    if (!result) {
      throw new NotFoundError('Feedback not found');
    }

    res.json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/feedback/:feedbackId/resolve
 * @desc Resolve feedback
 * @access Protected (Admin)
 */
router.put(
  '/tenants/:tenantId/feedback/:feedbackId/resolve',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, feedbackId } = req.params;
    const { resolutionNotes, resolutionAction } = req.body;
    const userId = req.user?.userId;

    if (!resolutionNotes) {
      throw new ValidationError('Resolution notes are required');
    }

    logger.info('Resolving feedback', { tenantId, feedbackId, userId });

    const result = await queryOne(`
      UPDATE tenant_customer_feedback
      SET
        status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP,
        resolved_by = $1,
        resolution_notes = $2,
        resolution_action = $3
      WHERE feedback_id = $4 AND tenant_id = $5
      RETURNING *
    `, [userId, resolutionNotes, resolutionAction || null, feedbackId, tenantId]);

    if (!result) {
      throw new NotFoundError('Feedback not found');
    }

    res.json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/feedback/:feedbackId/status
 * @desc Update feedback status
 * @access Protected (Admin)
 */
router.put(
  '/tenants/:tenantId/feedback/:feedbackId/status',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, feedbackId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'acknowledged', 'investigating', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    logger.info('Updating feedback status', { tenantId, feedbackId, status });

    const result = await queryOne(`
      UPDATE tenant_customer_feedback
      SET status = $1
      WHERE feedback_id = $2 AND tenant_id = $3
      RETURNING *
    `, [status, feedbackId, tenantId]);

    if (!result) {
      throw new NotFoundError('Feedback not found');
    }

    res.json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/feedback/:feedbackId
 * @desc Update feedback details
 * @access Protected (Admin)
 */
router.put(
  '/tenants/:tenantId/feedback/:feedbackId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, feedbackId } = req.params;
    const {
      category,
      severity,
      priority,
      followUpRequired,
      followUpDate,
      followUpNotes
    } = req.body;

    logger.info('Updating feedback', { tenantId, feedbackId });

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (severity !== undefined) {
      updates.push(`severity = $${paramIndex++}`);
      params.push(severity);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (followUpRequired !== undefined) {
      updates.push(`follow_up_required = $${paramIndex++}`);
      params.push(followUpRequired);
    }
    if (followUpDate !== undefined) {
      updates.push(`follow_up_date = $${paramIndex++}`);
      params.push(followUpDate);
    }
    if (followUpNotes !== undefined) {
      updates.push(`follow_up_notes = $${paramIndex++}`);
      params.push(followUpNotes);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    params.push(feedbackId, tenantId);

    const result = await queryOne(`
      UPDATE tenant_customer_feedback
      SET ${updates.join(', ')}
      WHERE feedback_id = $${paramIndex++} AND tenant_id = $${paramIndex}
      RETURNING *
    `, params);

    if (!result) {
      throw new NotFoundError('Feedback not found');
    }

    res.json(result);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/feedback/:feedbackId
 * @desc Delete feedback (soft delete by setting status to closed)
 * @access Protected (Admin)
 */
router.delete(
  '/tenants/:tenantId/feedback/:feedbackId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, feedbackId } = req.params;

    logger.info('Deleting feedback', { tenantId, feedbackId });

    const result = await queryOne(`
      UPDATE tenant_customer_feedback
      SET status = 'closed'
      WHERE feedback_id = $1 AND tenant_id = $2
      RETURNING *
    `, [feedbackId, tenantId]);

    if (!result) {
      throw new NotFoundError('Feedback not found');
    }

    res.json({ message: 'Feedback closed successfully', feedback: result });
  })
);

/**
 * @route GET /api/tenants/:tenantId/feedback/customer/:customerId
 * @desc Get all feedback for a specific customer
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/feedback/customer/:customerId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    logger.info('Fetching feedback for customer', { tenantId, customerId });

    const feedback = await query(`
      SELECT
        f.*,
        d.name as driver_name,
        v.registration as vehicle_registration
      FROM tenant_customer_feedback f
      LEFT JOIN tenant_drivers d ON f.related_driver_id = d.driver_id AND f.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON f.related_vehicle_id = v.vehicle_id AND f.tenant_id = v.tenant_id
      WHERE f.customer_id = $1 AND f.tenant_id = $2
      ORDER BY f.created_at DESC
    `, [customerId, tenantId]);

    res.json(feedback);
  })
);

export default router;
