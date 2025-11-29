/**
 * GDPR Compliance Routes
 *
 * Provides endpoints for GDPR data subject rights:
 * - Data export (Article 20 - Right to data portability)
 * - Data deletion (Article 17 - Right to erasure)
 *
 * SECURITY: These endpoints require admin role and are rate-limited
 */

import express, { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, requireRole, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { ValidationError } from '../utils/errorTypes';
import { successResponse } from '../utils/responseWrapper';
import { logger } from '../utils/logger';
import { sanitizeInteger } from '../utils/sanitize';
import {
  deleteCustomerData,
  deleteDriverData,
  exportCustomerData,
  exportDriverData,
} from '../services/gdprCompliance.service';
import { logAudit } from '../middleware/auditLogger';

const router: Router = express.Router();

/**
 * @route GET /api/tenants/:tenantId/gdpr/customers/:customerId/export
 * @desc Export all personal data for a customer (GDPR Article 20)
 * @access Admin only
 */
router.get(
  '/tenants/:tenantId/gdpr/customers/:customerId/export',
  verifyTenantAccess,
  requireRole('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = sanitizeInteger(req.params.tenantId);
    const customerId = sanitizeInteger(req.params.customerId);

    if (!tenantId || !customerId) {
      throw new ValidationError('Invalid tenant or customer ID');
    }

    logger.info('GDPR data export requested', {
      tenantId,
      customerId,
      requestedBy: req.user?.userId,
    });

    // Log the export request for compliance
    await logAudit({
      tenantId,
      userId: req.user?.userId,
      action: 'create',
      resourceType: 'gdpr_data_export',
      resourceId: customerId,
      newData: { subjectType: 'customer', customerId },
    }, req);

    const exportData = await exportCustomerData(tenantId, customerId);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="customer_${customerId}_data_export_${new Date().toISOString().split('T')[0]}.json"`
    );

    res.json(exportData);
  })
);

/**
 * @route GET /api/tenants/:tenantId/gdpr/drivers/:driverId/export
 * @desc Export all personal data for a driver (GDPR Article 20)
 * @access Admin only
 */
router.get(
  '/tenants/:tenantId/gdpr/drivers/:driverId/export',
  verifyTenantAccess,
  requireRole('admin', 'manager'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = sanitizeInteger(req.params.tenantId);
    const driverId = sanitizeInteger(req.params.driverId);

    if (!tenantId || !driverId) {
      throw new ValidationError('Invalid tenant or driver ID');
    }

    logger.info('GDPR driver data export requested', {
      tenantId,
      driverId,
      requestedBy: req.user?.userId,
    });

    await logAudit({
      tenantId,
      userId: req.user?.userId,
      action: 'create',
      resourceType: 'gdpr_data_export',
      resourceId: driverId,
      newData: { subjectType: 'driver', driverId },
    }, req);

    const exportData = await exportDriverData(tenantId, driverId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="driver_${driverId}_data_export_${new Date().toISOString().split('T')[0]}.json"`
    );

    res.json(exportData);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/gdpr/customers/:customerId
 * @desc Delete/anonymize all personal data for a customer (GDPR Article 17)
 * @access Admin only
 * @body { reason: string, confirmDeletion: boolean }
 */
router.delete(
  '/tenants/:tenantId/gdpr/customers/:customerId',
  verifyTenantAccess,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = sanitizeInteger(req.params.tenantId);
    const customerId = sanitizeInteger(req.params.customerId);
    const { reason, confirmDeletion } = req.body;

    if (!tenantId || !customerId) {
      throw new ValidationError('Invalid tenant or customer ID');
    }

    if (!reason || reason.length < 10) {
      throw new ValidationError('Deletion reason is required (minimum 10 characters)');
    }

    if (confirmDeletion !== true) {
      throw new ValidationError('You must confirm deletion by setting confirmDeletion: true');
    }

    logger.warn('GDPR customer data deletion requested', {
      tenantId,
      customerId,
      requestedBy: req.user?.userId,
      reason,
    });

    const result = await deleteCustomerData({
      tenantId,
      requesterId: req.user?.userId || 0,
      subjectType: 'customer',
      subjectId: customerId,
      reason,
    });

    successResponse(res, {
      message: 'Customer data has been deleted/anonymized per GDPR request',
      ...result,
    });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/gdpr/drivers/:driverId
 * @desc Delete/anonymize all personal data for a driver (GDPR Article 17)
 * @access Admin only
 * @body { reason: string, confirmDeletion: boolean }
 */
router.delete(
  '/tenants/:tenantId/gdpr/drivers/:driverId',
  verifyTenantAccess,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = sanitizeInteger(req.params.tenantId);
    const driverId = sanitizeInteger(req.params.driverId);
    const { reason, confirmDeletion } = req.body;

    if (!tenantId || !driverId) {
      throw new ValidationError('Invalid tenant or driver ID');
    }

    if (!reason || reason.length < 10) {
      throw new ValidationError('Deletion reason is required (minimum 10 characters)');
    }

    if (confirmDeletion !== true) {
      throw new ValidationError('You must confirm deletion by setting confirmDeletion: true');
    }

    logger.warn('GDPR driver data deletion requested', {
      tenantId,
      driverId,
      requestedBy: req.user?.userId,
      reason,
    });

    const result = await deleteDriverData({
      tenantId,
      requesterId: req.user?.userId || 0,
      subjectType: 'driver',
      subjectId: driverId,
      reason,
    });

    successResponse(res, {
      message: 'Driver data has been deleted/anonymized per GDPR request',
      ...result,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/gdpr/audit-log
 * @desc View GDPR-related audit log entries
 * @access Admin only
 */
router.get(
  '/tenants/:tenantId/gdpr/audit-log',
  verifyTenantAccess,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = sanitizeInteger(req.params.tenantId);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    // Import query function
    const { query } = await import('../config/database');

    const result = await query(
      `SELECT
         log_id,
         user_id,
         action,
         resource_type,
         resource_id,
         ip_address,
         created_at
       FROM audit_logs
       WHERE tenant_id = $1
         AND resource_type LIKE 'gdpr%'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM audit_logs
       WHERE tenant_id = $1
         AND resource_type LIKE 'gdpr%'`,
      [tenantId]
    );

    successResponse(res, {
      logs: result,
      pagination: {
        total: parseInt(countResult[0]?.total || '0'),
        limit,
        offset,
      },
    });
  })
);

export default router;
