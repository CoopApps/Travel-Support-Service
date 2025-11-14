import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, getDbClient } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Compliance Alerts Routes
 *
 * Automated compliance monitoring for:
 * - Permit expiry warnings
 * - Driver license expiry
 * - Vehicle compliance (COIF, MOT)
 * - Service registration requirements
 * - Financial surplus reviews
 * - Not-for-profit verification
 *
 * Database Tables:
 * - permit_compliance_alerts
 */

/**
 * @route GET /api/tenants/:tenantId/compliance-alerts
 * @desc Get all compliance alerts
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/compliance-alerts',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { status, severity, alertType, entityType } = req.query;

    logger.info('Fetching compliance alerts', { tenantId, status, severity });

    let queryStr = `
      SELECT *
      FROM permit_compliance_alerts
      WHERE tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      queryStr += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (severity) {
      queryStr += ` AND severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }

    if (alertType) {
      queryStr += ` AND alert_type = $${paramCount}`;
      params.push(alertType);
      paramCount++;
    }

    if (entityType) {
      queryStr += ` AND entity_type = $${paramCount}`;
      params.push(entityType);
      paramCount++;
    }

    queryStr += ' ORDER BY severity DESC, created_at DESC';

    const result = await query(queryStr, params);

    logger.info('Compliance alerts loaded', {
      tenantId,
      count: result.length,
    });

    res.json(result);
  })
);

/**
 * @route GET /api/tenants/:tenantId/compliance-alerts/:alertId
 * @desc Get specific compliance alert
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/compliance-alerts/:alertId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, alertId } = req.params;

    logger.info('Fetching compliance alert', { tenantId, alertId });

    const result = await query(
      `SELECT *
       FROM permit_compliance_alerts
       WHERE tenant_id = $1 AND alert_id = $2`,
      [tenantId, alertId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Compliance alert not found');
    }

    res.json(result[0]);
  })
);

/**
 * @route GET /api/tenants/:tenantId/compliance-alerts/summary
 * @desc Get compliance alerts summary
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/compliance-alerts/summary',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching compliance alerts summary', { tenantId });

    const result = await query(
      `SELECT
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_alerts,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_alerts,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_alerts,
        COUNT(CASE WHEN acknowledged THEN 1 END) as acknowledged_count,
        COUNT(CASE WHEN resolved THEN 1 END) as resolved_count,
        COUNT(CASE WHEN alert_type = 'permit_expiring' THEN 1 END) as permit_expiring_count,
        COUNT(CASE WHEN alert_type = 'permit_expired' THEN 1 END) as permit_expired_count,
        COUNT(CASE WHEN alert_type = 'driver_license_expiring' THEN 1 END) as license_expiring_count,
        COUNT(CASE WHEN alert_type = 'coif_expired' THEN 1 END) as coif_expired_count
       FROM permit_compliance_alerts
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const typeBreakdown = await query(
      `SELECT
        alert_type,
        severity,
        COUNT(*) as count
       FROM permit_compliance_alerts
       WHERE tenant_id = $1 AND status = 'active'
       GROUP BY alert_type, severity
       ORDER BY severity DESC, count DESC`,
      [tenantId]
    );

    const summary = {
      overall: result[0],
      by_type: typeBreakdown,
    };

    res.json(summary);
  })
);

/**
 * @route POST /api/tenants/:tenantId/compliance-alerts
 * @desc Create new compliance alert
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/compliance-alerts',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const alertData = req.body;

    logger.info('Creating compliance alert', { tenantId, alertType: alertData.alert_type });

    // Validate required fields
    const requiredFields = ['alert_type', 'severity', 'alert_title', 'alert_message'];

    for (const field of requiredFields) {
      if (!alertData[field]) {
        throw new ValidationError(`${field} is required`);
      }
    }

    // Validate alert type
    const validAlertTypes = [
      'permit_expiring',
      'permit_expired',
      'driver_license_expiring',
      'coif_expired',
      'midas_expiring',
      'dbs_expiring',
      'service_registration_required',
      'surplus_review_required',
      'not_for_profit_verification_required',
    ];

    if (!validAlertTypes.includes(alertData.alert_type)) {
      throw new ValidationError('Invalid alert type');
    }

    // Validate severity
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    if (!validSeverities.includes(alertData.severity)) {
      throw new ValidationError('Invalid severity level');
    }

    // Check for duplicate active alert
    if (alertData.entity_type && alertData.entity_id) {
      const duplicateCheck = await query(
        `SELECT alert_id FROM permit_compliance_alerts
         WHERE tenant_id = $1
         AND alert_type = $2
         AND entity_type = $3
         AND entity_id = $4
         AND status = 'active'`,
        [tenantId, alertData.alert_type, alertData.entity_type, alertData.entity_id]
      );

      if (duplicateCheck.length > 0) {
        logger.warn('Duplicate alert already exists', {
          tenantId,
          alertType: alertData.alert_type,
          entityType: alertData.entity_type,
          entityId: alertData.entity_id,
        });
        return res.status(200).json(duplicateCheck[0]);
      }
    }

    const result = await query(
      `INSERT INTO permit_compliance_alerts (
        tenant_id,
        alert_type,
        severity,
        alert_title,
        alert_message,
        entity_type,
        entity_id,
        action_required,
        action_deadline,
        status,
        acknowledged,
        resolved,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *`,
      [
        tenantId,
        alertData.alert_type,
        alertData.severity,
        alertData.alert_title,
        alertData.alert_message,
        alertData.entity_type || null,
        alertData.entity_id || null,
        alertData.action_required || null,
        alertData.action_deadline || null,
        alertData.status || 'active',
        alertData.acknowledged || false,
        alertData.resolved || false,
      ]
    );

    logger.info('Compliance alert created', {
      tenantId,
      alertId: result[0].alert_id,
      alertType: result[0].alert_type,
    });

    res.status(201).json(result[0]);
  })
);

/**
 * @route POST /api/tenants/:tenantId/compliance-alerts/:alertId/acknowledge
 * @desc Acknowledge compliance alert
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/compliance-alerts/:alertId/acknowledge',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, alertId } = req.params;
    const { acknowledged_by } = req.body;

    logger.info('Acknowledging compliance alert', { tenantId, alertId });

    const result = await query(
      `UPDATE permit_compliance_alerts
       SET acknowledged = true,
           acknowledged_by = $3,
           acknowledged_at = NOW(),
           updated_at = NOW()
       WHERE tenant_id = $1 AND alert_id = $2
       RETURNING *`,
      [tenantId, alertId, acknowledged_by || null]
    );

    if (result.length === 0) {
      throw new NotFoundError('Compliance alert not found');
    }

    logger.info('Compliance alert acknowledged', { tenantId, alertId });

    res.json(result[0]);
  })
);

/**
 * @route POST /api/tenants/:tenantId/compliance-alerts/:alertId/resolve
 * @desc Resolve compliance alert
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/compliance-alerts/:alertId/resolve',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, alertId } = req.params;
    const { resolved_by, resolution_notes } = req.body;

    logger.info('Resolving compliance alert', { tenantId, alertId });

    const result = await query(
      `UPDATE permit_compliance_alerts
       SET resolved = true,
           resolved_by = $3,
           resolved_at = NOW(),
           resolution_notes = $4,
           status = 'resolved',
           updated_at = NOW()
       WHERE tenant_id = $1 AND alert_id = $2
       RETURNING *`,
      [tenantId, alertId, resolved_by || null, resolution_notes || null]
    );

    if (result.length === 0) {
      throw new NotFoundError('Compliance alert not found');
    }

    logger.info('Compliance alert resolved', { tenantId, alertId });

    res.json(result[0]);
  })
);

/**
 * @route POST /api/tenants/:tenantId/compliance-alerts/:alertId/dismiss
 * @desc Dismiss compliance alert
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/compliance-alerts/:alertId/dismiss',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, alertId } = req.params;
    const { resolution_notes } = req.body;

    logger.info('Dismissing compliance alert', { tenantId, alertId });

    const result = await query(
      `UPDATE permit_compliance_alerts
       SET status = 'dismissed',
           resolution_notes = $3,
           updated_at = NOW()
       WHERE tenant_id = $1 AND alert_id = $2
       RETURNING *`,
      [tenantId, alertId, resolution_notes || 'Dismissed by user']
    );

    if (result.length === 0) {
      throw new NotFoundError('Compliance alert not found');
    }

    logger.info('Compliance alert dismissed', { tenantId, alertId });

    res.json(result[0]);
  })
);

/**
 * @route POST /api/tenants/:tenantId/compliance-alerts/generate
 * @desc Generate compliance alerts based on current data
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/compliance-alerts/generate',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Generating compliance alerts', { tenantId });

    const client = await getDbClient();
    const alertsCreated: any[] = [];

    try {
      await client.query('BEGIN');

      // 1. Check for expiring organizational permits (within 30 days)
      const expiringPermits = await client.query(
        `SELECT permit_id, organisation_name, permit_type, expiry_date
         FROM tenant_organizational_permits
         WHERE tenant_id = $1
         AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
         AND NOT EXISTS (
           SELECT 1 FROM permit_compliance_alerts
           WHERE tenant_id = $1
           AND entity_type = 'permit'
           AND entity_id = permit_id
           AND alert_type = 'permit_expiring'
           AND status = 'active'
         )`,
        [tenantId]
      );

      for (const permit of expiringPermits.rows) {
        const daysUntilExpiry = Math.ceil(
          (new Date(permit.expiry_date).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const alert = await client.query(
          `INSERT INTO permit_compliance_alerts (
            tenant_id, alert_type, severity, alert_title, alert_message,
            entity_type, entity_id, action_required, action_deadline,
            status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING *`,
          [
            tenantId,
            'permit_expiring',
            daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 14 ? 'high' : 'medium',
            `${permit.permit_type} permit expiring soon`,
            `${permit.organisation_name} ${permit.permit_type} permit expires in ${daysUntilExpiry} days`,
            'permit',
            permit.permit_id,
            'Renew permit before expiry date',
            permit.expiry_date,
            'active',
          ]
        );

        alertsCreated.push(alert.rows[0]);
      }

      // 2. Check for expired permits
      const expiredPermits = await client.query(
        `SELECT permit_id, organisation_name, permit_type, expiry_date
         FROM tenant_organizational_permits
         WHERE tenant_id = $1
         AND expiry_date < CURRENT_DATE
         AND NOT EXISTS (
           SELECT 1 FROM permit_compliance_alerts
           WHERE tenant_id = $1
           AND entity_type = 'permit'
           AND entity_id = permit_id
           AND alert_type = 'permit_expired'
           AND status = 'active'
         )`,
        [tenantId]
      );

      for (const permit of expiredPermits.rows) {
        const alert = await client.query(
          `INSERT INTO permit_compliance_alerts (
            tenant_id, alert_type, severity, alert_title, alert_message,
            entity_type, entity_id, action_required, status,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING *`,
          [
            tenantId,
            'permit_expired',
            'critical',
            `${permit.permit_type} permit expired`,
            `${permit.organisation_name} ${permit.permit_type} permit expired on ${permit.expiry_date}`,
            'permit',
            permit.permit_id,
            'URGENT: Renew permit immediately. Operations may be illegal.',
            'active',
          ]
        );

        alertsCreated.push(alert.rows[0]);
      }

      // 3. Check for expiring driver COIF (within 60 days)
      const expiringCOIF = await client.query(
        `SELECT driver_id, name, coif_expiry_date
         FROM tenant_drivers
         WHERE tenant_id = $1
         AND coif_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
         AND NOT EXISTS (
           SELECT 1 FROM permit_compliance_alerts
           WHERE tenant_id = $1
           AND entity_type = 'driver'
           AND entity_id = driver_id
           AND alert_type = 'coif_expired'
           AND status = 'active'
         )`,
        [tenantId]
      );

      for (const driver of expiringCOIF.rows) {
        const alert = await client.query(
          `INSERT INTO permit_compliance_alerts (
            tenant_id, alert_type, severity, alert_title, alert_message,
            entity_type, entity_id, action_required, action_deadline,
            status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING *`,
          [
            tenantId,
            'coif_expired',
            'high',
            'Driver COIF expiring',
            `${driver.name} COIF expires soon`,
            'driver',
            driver.driver_id,
            'Schedule COIF renewal',
            driver.coif_expiry_date,
            'active',
          ]
        );

        alertsCreated.push(alert.rows[0]);
      }

      // 4. Check for expiring MiDAS certifications (within 90 days)
      const expiringMIDAS = await client.query(
        `SELECT driver_id, name, midas_expiry_date
         FROM tenant_drivers
         WHERE tenant_id = $1
         AND midas_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
         AND NOT EXISTS (
           SELECT 1 FROM permit_compliance_alerts
           WHERE tenant_id = $1
           AND entity_type = 'driver'
           AND entity_id = driver_id
           AND alert_type = 'midas_expiring'
           AND status = 'active'
         )`,
        [tenantId]
      );

      for (const driver of expiringMIDAS.rows) {
        const alert = await client.query(
          `INSERT INTO permit_compliance_alerts (
            tenant_id, alert_type, severity, alert_title, alert_message,
            entity_type, entity_id, action_required, action_deadline,
            status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING *`,
          [
            tenantId,
            'midas_expiring',
            'medium',
            'Driver MiDAS certification expiring',
            `${driver.name} MiDAS certification expires soon`,
            'driver',
            driver.driver_id,
            'Schedule MiDAS recertification',
            driver.midas_expiry_date,
            'active',
          ]
        );

        alertsCreated.push(alert.rows[0]);
      }

      await client.query('COMMIT');

      logger.info('Compliance alerts generated', {
        tenantId,
        alertsCreated: alertsCreated.length,
      });

      res.json({
        success: true,
        alertsCreated: alertsCreated.length,
        alerts: alertsCreated,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/compliance-alerts/:alertId
 * @desc Delete compliance alert (permanent delete)
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/compliance-alerts/:alertId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, alertId } = req.params;

    logger.info('Deleting compliance alert', { tenantId, alertId });

    const result = await query(
      `DELETE FROM permit_compliance_alerts
       WHERE tenant_id = $1 AND alert_id = $2
       RETURNING alert_id`,
      [tenantId, alertId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Compliance alert not found');
    }

    logger.info('Compliance alert deleted', { tenantId, alertId });

    res.json({ success: true, message: 'Compliance alert deleted successfully' });
  })
);

export default router;
