import express, { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { query, queryOne } from '../../config/database';
import { logger } from '../../utils/logger';

const router: Router = express.Router();

/**
 * Home Care Dashboard Routes
 * Provides overview statistics and KPIs for home care service
 */

/**
 * GET /api/homecare/tenants/:tenantId/dashboard/overview
 * Get main dashboard statistics
 */
router.get(
  '/tenants/:tenantId/dashboard/overview',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Get total clients
    const clientStats = await queryOne(
      `SELECT
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE status = 'active') as active_clients
       FROM tenant_care_clients
       WHERE tenant_id = $1`,
      [tenantId]
    );

    // Get total carers
    const carerStats = await queryOne(
      `SELECT
        COUNT(*) as total_carers,
        COUNT(*) FILTER (WHERE status = 'active') as active_carers
       FROM tenant_carers
       WHERE tenant_id = $1`,
      [tenantId]
    );

    // Get visit statistics for today
    const visitStats = await queryOne(
      `SELECT
        COUNT(*) as total_visits_today,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_visits_today,
        COUNT(*) FILTER (WHERE status = 'in_progress') as ongoing_visits,
        COUNT(*) FILTER (WHERE status = 'scheduled') as upcoming_visits_today
       FROM tenant_care_visits
       WHERE tenant_id = $1
       AND DATE(scheduled_start) = CURRENT_DATE`,
      [tenantId]
    );

    // Get this week's statistics
    const weekStats = await queryOne(
      `SELECT
        COUNT(*) as total_visits_this_week,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_visits_this_week
       FROM tenant_care_visits
       WHERE tenant_id = $1
       AND scheduled_start >= DATE_TRUNC('week', CURRENT_DATE)
       AND scheduled_start < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'`,
      [tenantId]
    );

    // Upcoming visits (next 24 hours)
    const upcomingVisits = await query(
      `SELECT
        v.visit_id,
        v.scheduled_start,
        v.scheduled_end,
        v.visit_type,
        v.status,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        cr.first_name as carer_first_name,
        cr.last_name as carer_last_name
       FROM tenant_care_visits v
       JOIN tenant_care_clients c ON v.client_id = c.client_id AND v.tenant_id = c.tenant_id
       LEFT JOIN tenant_carers cr ON v.carer_id = cr.carer_id AND v.tenant_id = cr.tenant_id
       WHERE v.tenant_id = $1
       AND v.scheduled_start >= NOW()
       AND v.scheduled_start < NOW() + INTERVAL '24 hours'
       AND v.status IN ('scheduled', 'confirmed')
       ORDER BY v.scheduled_start
       LIMIT 10`,
      [tenantId]
    );

    // Carers with DBS expiring soon (within 30 days)
    const dbsExpiring = await query(
      `SELECT
        carer_id,
        first_name,
        last_name,
        dbs_expiry_date,
        EXTRACT(DAY FROM (dbs_expiry_date - CURRENT_DATE)) as days_until_expiry
       FROM tenant_carers
       WHERE tenant_id = $1
       AND status = 'active'
       AND dbs_expiry_date IS NOT NULL
       AND dbs_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       ORDER BY dbs_expiry_date`,
      [tenantId]
    );

    const dashboard = {
      clients: {
        total: parseInt(clientStats.total_clients || '0'),
        active: parseInt(clientStats.active_clients || '0'),
      },
      carers: {
        total: parseInt(carerStats.total_carers || '0'),
        active: parseInt(carerStats.active_carers || '0'),
      },
      visits: {
        today: {
          total: parseInt(visitStats.total_visits_today || '0'),
          completed: parseInt(visitStats.completed_visits_today || '0'),
          ongoing: parseInt(visitStats.ongoing_visits || '0'),
          upcoming: parseInt(visitStats.upcoming_visits_today || '0'),
        },
        week: {
          total: parseInt(weekStats.total_visits_this_week || '0'),
          completed: parseInt(weekStats.completed_visits_this_week || '0'),
        },
      },
      upcomingVisits,
      alerts: {
        dbsExpiring: dbsExpiring.length,
        dbsExpiringList: dbsExpiring,
      },
    };

    logger.info(`Dashboard data retrieved for tenant ${tenantId}`);
    res.json(dashboard);
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/dashboard/kpis
 * Get key performance indicators
 */
router.get(
  '/tenants/:tenantId/dashboard/kpis',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { period = '30' } = req.query; // days

    // Visit completion rate
    const completionRate = await queryOne(
      `SELECT
        COUNT(*) as total_scheduled,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL /
           NULLIF(COUNT(*), 0) * 100), 2
        ) as completion_rate
       FROM tenant_care_visits
       WHERE tenant_id = $1
       AND scheduled_start >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days'`,
      [tenantId]
    );

    // Average visit duration
    const avgDuration = await queryOne(
      `SELECT
        AVG(EXTRACT(EPOCH FROM (actual_end - actual_start))/60) as avg_minutes
       FROM tenant_care_visits
       WHERE tenant_id = $1
       AND status = 'completed'
       AND actual_start IS NOT NULL
       AND actual_end IS NOT NULL
       AND scheduled_start >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days'`,
      [tenantId]
    );

    // On-time visit percentage
    const onTimeRate = await queryOne(
      `SELECT
        COUNT(*) as total_completed,
        COUNT(*) FILTER (WHERE
          actual_start IS NOT NULL AND
          actual_start <= scheduled_start + INTERVAL '15 minutes'
        ) as on_time,
        ROUND(
          (COUNT(*) FILTER (WHERE
            actual_start IS NOT NULL AND
            actual_start <= scheduled_start + INTERVAL '15 minutes'
          )::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2
        ) as on_time_rate
       FROM tenant_care_visits
       WHERE tenant_id = $1
       AND status = 'completed'
       AND scheduled_start >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days'`,
      [tenantId]
    );

    // Active carers utilization
    const carerUtilization = await query(
      `SELECT
        cr.carer_id,
        cr.first_name,
        cr.last_name,
        COUNT(v.visit_id) as visits_this_period,
        cr.contracted_hours,
        SUM(EXTRACT(EPOCH FROM (v.actual_end - v.actual_start))/3600) as hours_worked
       FROM tenant_carers cr
       LEFT JOIN tenant_care_visits v ON
         v.carer_id = cr.carer_id AND
         v.tenant_id = cr.tenant_id AND
         v.status = 'completed' AND
         v.scheduled_start >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days'
       WHERE cr.tenant_id = $1
       AND cr.status = 'active'
       GROUP BY cr.carer_id, cr.first_name, cr.last_name, cr.contracted_hours
       ORDER BY visits_this_period DESC`,
      [tenantId]
    );

    const kpis = {
      visitCompletion: {
        totalScheduled: parseInt(completionRate.total_scheduled || '0'),
        completed: parseInt(completionRate.completed || '0'),
        rate: parseFloat(completionRate.completion_rate || '0'),
      },
      averageVisitDuration: {
        minutes: parseFloat(avgDuration.avg_minutes || '0'),
      },
      onTimePerformance: {
        totalCompleted: parseInt(onTimeRate.total_completed || '0'),
        onTime: parseInt(onTimeRate.on_time || '0'),
        rate: parseFloat(onTimeRate.on_time_rate || '0'),
      },
      carerUtilization,
      period: `${period} days`,
    };

    res.json(kpis);
  })
);

export default router;
