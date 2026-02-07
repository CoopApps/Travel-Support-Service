import express, { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Dashboard Routes for Home Care Co-operative System
 *
 * Provides aggregated data for various dashboards.
 */

/**
 * @route GET /api/tenants/:tenantId/dashboard/overview
 * @desc Get main dashboard overview stats
 */
router.get(
  '/tenants/:tenantId/dashboard/overview',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching dashboard overview', { tenantId });

    // Get client stats
    const clientStats = await queryOne<{
      total: string;
      active: string;
      on_hold: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold
      FROM tenant_clients
      WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    // Get carer stats
    const carerStats = await queryOne<{
      total: string;
      active: string;
      on_leave: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'on_leave') as on_leave
      FROM tenant_carers
      WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    // Get member stats
    const memberStats = await queryOne<{
      total: string;
      active: string;
      probationary: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE member_status = 'active') as active,
        COUNT(*) FILTER (WHERE member_status = 'probationary') as probationary
      FROM tenant_members
      WHERE tenant_id = $1`,
      [tenantId]
    );

    // Get today's visit stats
    const todayStats = await queryOne<{
      total: string;
      completed: string;
      in_progress: string;
      scheduled: string;
      cancelled: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'scheduled' OR status = 'confirmed') as scheduled,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM tenant_visits
      WHERE tenant_id = $1 AND scheduled_date = CURRENT_DATE`,
      [tenantId]
    );

    // Get this week's hours
    const weeklyHours = await queryOne<{ hours: string }>(
      `SELECT COALESCE(SUM(actual_duration), 0) / 60.0 as hours
       FROM tenant_visits
       WHERE tenant_id = $1
         AND status = 'completed'
         AND scheduled_date >= date_trunc('week', CURRENT_DATE)
         AND scheduled_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'`,
      [tenantId]
    );

    // Get compliance alerts
    const complianceAlerts = await query(
      `SELECT
        'dbs_expiring' as type,
        COUNT(*) as count
      FROM tenant_carers
      WHERE tenant_id = $1
        AND is_active = true
        AND dbs_check_date IS NOT NULL
        AND dbs_check_date + INTERVAL '3 years' < CURRENT_DATE + INTERVAL '30 days'
      UNION ALL
      SELECT
        'training_expiring' as type,
        COUNT(*) as count
      FROM tenant_training_records
      WHERE tenant_id = $1
        AND expiry_date IS NOT NULL
        AND expiry_date < CURRENT_DATE + INTERVAL '30 days'
        AND status != 'expired'`,
      [tenantId]
    );

    // Get active votes
    const activeVotes = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_votes
       WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    res.json({
      clients: {
        total: parseInt(clientStats?.total || '0', 10),
        active: parseInt(clientStats?.active || '0', 10),
        onHold: parseInt(clientStats?.on_hold || '0', 10),
      },
      carers: {
        total: parseInt(carerStats?.total || '0', 10),
        active: parseInt(carerStats?.active || '0', 10),
        onLeave: parseInt(carerStats?.on_leave || '0', 10),
      },
      members: {
        total: parseInt(memberStats?.total || '0', 10),
        active: parseInt(memberStats?.active || '0', 10),
        probationary: parseInt(memberStats?.probationary || '0', 10),
      },
      today: {
        total: parseInt(todayStats?.total || '0', 10),
        completed: parseInt(todayStats?.completed || '0', 10),
        inProgress: parseInt(todayStats?.in_progress || '0', 10),
        scheduled: parseInt(todayStats?.scheduled || '0', 10),
        cancelled: parseInt(todayStats?.cancelled || '0', 10),
      },
      weeklyHours: parseFloat(weeklyHours?.hours || '0'),
      complianceAlerts,
      activeVotes: parseInt(activeVotes?.count || '0', 10),
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/dashboard/carer
 * @desc Get carer-specific dashboard data
 */
router.get(
  '/tenants/:tenantId/dashboard/carer',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;

    if (!user.carerId) {
      res.json({ message: 'Not a carer', data: null });
      return;
    }

    // Get today's visits for this carer
    const todayVisits = await query(
      `SELECT
        v.visit_id as id, v.scheduled_start_time, v.scheduled_end_time,
        v.status, v.visit_type, v.tasks,
        cl.first_name as client_first_name, cl.last_name as client_last_name,
        cl.address, cl.postcode, cl.phone, cl.access_notes
      FROM tenant_visits v
      JOIN tenant_clients cl ON v.client_id = cl.client_id AND v.tenant_id = cl.tenant_id
      WHERE v.tenant_id = $1 AND v.carer_id = $2 AND v.scheduled_date = CURRENT_DATE
      ORDER BY v.scheduled_start_time`,
      [tenantId, user.carerId]
    );

    // Get this week's stats
    const weekStats = await queryOne<{
      total: string;
      completed: string;
      hours: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COALESCE(SUM(actual_duration), 0) / 60.0 as hours
      FROM tenant_visits
      WHERE tenant_id = $1 AND carer_id = $2
        AND scheduled_date >= date_trunc('week', CURRENT_DATE)
        AND scheduled_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'`,
      [tenantId, user.carerId]
    );

    // Get training status
    const trainingStatus = await query(
      `SELECT
        course_name, status, expiry_date, is_mandatory
      FROM tenant_training_records
      WHERE tenant_id = $1 AND carer_id = $2
        AND (status = 'required' OR (expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE + INTERVAL '60 days'))
      ORDER BY is_mandatory DESC, expiry_date ASC`,
      [tenantId, user.carerId]
    );

    res.json({
      todayVisits,
      weekStats: {
        total: parseInt(weekStats?.total || '0', 10),
        completed: parseInt(weekStats?.completed || '0', 10),
        hours: parseFloat(weekStats?.hours || '0'),
      },
      trainingStatus,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/dashboard/visits/weekly
 * @desc Get weekly visit statistics
 */
router.get(
  '/tenants/:tenantId/dashboard/visits/weekly',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    const weeklyData = await query(
      `SELECT
        scheduled_date::date as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'missed') as missed,
        COALESCE(SUM(actual_duration), 0) / 60.0 as hours
      FROM tenant_visits
      WHERE tenant_id = $1
        AND scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
        AND scheduled_date <= CURRENT_DATE
      GROUP BY scheduled_date::date
      ORDER BY scheduled_date::date`,
      [tenantId]
    );

    res.json({ weeklyData });
  })
);

/**
 * @route GET /api/tenants/:tenantId/dashboard/kpis
 * @desc Get KPIs for the co-operative
 */
router.get(
  '/tenants/:tenantId/dashboard/kpis',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Visit completion rate (last 30 days)
    const completionRate = await queryOne<{ rate: string }>(
      `SELECT
        ROUND(
          COUNT(*) FILTER (WHERE status = 'completed')::numeric /
          NULLIF(COUNT(*) FILTER (WHERE status != 'cancelled'), 0) * 100,
          1
        ) as rate
      FROM tenant_visits
      WHERE tenant_id = $1
        AND scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
        AND scheduled_date <= CURRENT_DATE`,
      [tenantId]
    );

    // Punctuality rate
    const punctualityRate = await queryOne<{ rate: string }>(
      `SELECT
        ROUND(
          COUNT(*) FILTER (WHERE
            actual_start_time IS NOT NULL AND
            actual_start_time <= (scheduled_date + scheduled_start_time::time + INTERVAL '15 minutes')
          )::numeric /
          NULLIF(COUNT(*) FILTER (WHERE actual_start_time IS NOT NULL), 0) * 100,
          1
        ) as rate
      FROM tenant_visits
      WHERE tenant_id = $1
        AND scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
        AND status = 'completed'`,
      [tenantId]
    );

    // Staff retention (carers active for >6 months / total carers)
    const retention = await queryOne<{ rate: string }>(
      `SELECT
        ROUND(
          COUNT(*) FILTER (WHERE start_date < CURRENT_DATE - INTERVAL '6 months')::numeric /
          NULLIF(COUNT(*), 0) * 100,
          1
        ) as rate
      FROM tenant_carers
      WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    // Member engagement (% of members who voted in last vote)
    const memberEngagement = await queryOne<{ rate: string }>(
      `WITH latest_vote AS (
        SELECT vote_id FROM tenant_votes
        WHERE tenant_id = $1 AND status = 'closed'
        ORDER BY closed_at DESC LIMIT 1
      )
      SELECT
        ROUND(
          (SELECT COUNT(DISTINCT member_id) FROM tenant_vote_records
           WHERE vote_id = (SELECT vote_id FROM latest_vote))::numeric /
          NULLIF((SELECT COUNT(*) FROM tenant_members WHERE tenant_id = $1 AND voting_rights = true), 0) * 100,
          1
        ) as rate`,
      [tenantId]
    );

    res.json({
      kpis: {
        visitCompletionRate: parseFloat(completionRate?.rate || '0'),
        punctualityRate: parseFloat(punctualityRate?.rate || '0'),
        staffRetention: parseFloat(retention?.rate || '0'),
        memberEngagement: parseFloat(memberEngagement?.rate || '0'),
      },
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/dashboard/coop
 * @desc Get co-operative specific dashboard stats
 */
router.get(
  '/tenants/:tenantId/dashboard/coop',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Member stats
    const memberStats = await queryOne<{
      total_members: string;
      voting_members: string;
      probationary_members: string;
      total_share_capital: string;
    }>(
      `SELECT
        COUNT(*) as total_members,
        COUNT(*) FILTER (WHERE voting_rights = true) as voting_members,
        COUNT(*) FILTER (WHERE member_status = 'probationary') as probationary_members,
        COALESCE(SUM(shares_held), 0) as total_share_capital
      FROM tenant_members
      WHERE tenant_id = $1 AND member_status IN ('active', 'probationary')`,
      [tenantId]
    );

    // Active votes
    const activeVotes = await query(
      `SELECT vote_id, title, vote_type, status, opens_at, closes_at,
              (SELECT COUNT(*) FROM tenant_vote_records WHERE vote_id = v.vote_id) as votes_cast
       FROM tenant_votes v
       WHERE tenant_id = $1 AND status = 'active'
       ORDER BY closes_at ASC
       LIMIT 5`,
      [tenantId]
    );

    // Pending member approvals
    const pendingApprovals = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_members
       WHERE tenant_id = $1 AND member_status = 'pending'`,
      [tenantId]
    );

    // Recent distributions
    const recentDistributions = await query(
      `SELECT distribution_id, year, total_amount, status, distributed_at
       FROM tenant_surplus_distributions
       WHERE tenant_id = $1
       ORDER BY year DESC
       LIMIT 3`,
      [tenantId]
    );

    res.json({
      members: {
        total: parseInt(memberStats?.total_members || '0', 10),
        withVotingRights: parseInt(memberStats?.voting_members || '0', 10),
        probationary: parseInt(memberStats?.probationary_members || '0', 10),
        totalShareCapital: parseInt(memberStats?.total_share_capital || '0', 10),
      },
      activeVotes: activeVotes.rows,
      pendingApprovals: parseInt(pendingApprovals?.count || '0', 10),
      recentDistributions: recentDistributions.rows,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/dashboard/stats
 * @desc Get general dashboard stats (alias for overview)
 */
router.get(
  '/tenants/:tenantId/dashboard/stats',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Get client count
    const clientStats = await queryOne<{ total: string; active: string }>(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active
       FROM tenant_clients WHERE tenant_id = $1`,
      [tenantId]
    );

    // Get carer count
    const carerStats = await queryOne<{ total: string; active: string }>(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active
       FROM tenant_carers WHERE tenant_id = $1`,
      [tenantId]
    );

    // Get today's visits
    const todayVisits = await queryOne<{
      total: string;
      completed: string;
      scheduled: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status IN ('scheduled', 'confirmed')) as scheduled
       FROM tenant_visits
       WHERE tenant_id = $1 AND scheduled_date = CURRENT_DATE`,
      [tenantId]
    );

    // Get hours this week
    const weekHours = await queryOne<{ hours: string }>(
      `SELECT COALESCE(SUM(actual_duration), 0) / 60.0 as hours
       FROM tenant_visits
       WHERE tenant_id = $1
         AND status = 'completed'
         AND scheduled_date >= date_trunc('week', CURRENT_DATE)`,
      [tenantId]
    );

    res.json({
      clients: {
        total: parseInt(clientStats?.total || '0', 10),
        active: parseInt(clientStats?.active || '0', 10),
      },
      carers: {
        total: parseInt(carerStats?.total || '0', 10),
        active: parseInt(carerStats?.active || '0', 10),
      },
      visitsToday: {
        total: parseInt(todayVisits?.total || '0', 10),
        completed: parseInt(todayVisits?.completed || '0', 10),
        scheduled: parseInt(todayVisits?.scheduled || '0', 10),
      },
      hoursThisWeek: parseFloat(weekHours?.hours || '0'),
    });
  })
);

export default router;
