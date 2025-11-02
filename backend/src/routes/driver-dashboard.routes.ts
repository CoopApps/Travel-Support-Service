import express, { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Driver Dashboard Routes
 *
 * Endpoints for driver-facing dashboard
 * Provides driver-specific data: schedules, holidays, hours, performance
 */

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/overview
 * @desc Get driver dashboard overview with key metrics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/overview',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting driver dashboard overview', { tenantId, driverId });

    // Get driver info
    const driver = await queryOne(
      `SELECT driver_id, name, email, phone, employment_type, is_active
       FROM tenant_drivers
       WHERE driver_id = $1 AND tenant_id = $2`,
      [driverId, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Get today's schedules
    const todaySchedules = await query(
      `SELECT COUNT(*) as count
       FROM tenant_schedule_assignments
       WHERE driver_id = $1 AND tenant_id = $2
         AND assignment_date = CURRENT_DATE
         AND is_active = true`,
      [driverId, tenantId]
    );

    // Get upcoming schedules (next 7 days)
    const upcomingSchedules = await query(
      `SELECT COUNT(*) as count
       FROM tenant_schedule_assignments
       WHERE driver_id = $1 AND tenant_id = $2
         AND assignment_date > CURRENT_DATE
         AND assignment_date <= CURRENT_DATE + INTERVAL '7 days'
         AND is_active = true`,
      [driverId, tenantId]
    );

    // Get pending holiday requests
    const pendingHolidays = await query(
      `SELECT COUNT(*) as count
       FROM tenant_holiday_requests
       WHERE driver_id = $1 AND tenant_id = $2
         AND status = 'pending'`,
      [driverId, tenantId]
    );

    // Get current/upcoming holidays
    const activeHolidays = await query(
      `SELECT request_id, start_date, end_date, days, type, status
       FROM tenant_holiday_requests
       WHERE driver_id = $1 AND tenant_id = $2
         AND status = 'approved'
         AND end_date >= CURRENT_DATE
       ORDER BY start_date ASC
       LIMIT 5`,
      [driverId, tenantId]
    );

    // Get trip stats (last 30 days)
    const tripStats = await queryOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show_count,
        COUNT(*) as total_count
       FROM tenant_trips
       WHERE driver_id = $1 AND tenant_id = $2
         AND trip_date >= CURRENT_DATE - INTERVAL '30 days'
         AND trip_date <= CURRENT_DATE`,
      [driverId, tenantId]
    );

    // Get recent alerts (last 7 days)
    const recentAlerts = await query(
      `SELECT request_id, start_date, end_date, status, rejection_reason, approved_date
       FROM tenant_holiday_requests
       WHERE driver_id = $1 AND tenant_id = $2
         AND status IN ('approved', 'rejected')
         AND approved_date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY approved_date DESC
       LIMIT 5`,
      [driverId, tenantId]
    );

    return res.json({
      driver,
      metrics: {
        todaySchedules: parseInt(todaySchedules[0]?.count || '0', 10),
        upcomingSchedules: parseInt(upcomingSchedules[0]?.count || '0', 10),
        pendingHolidays: parseInt(pendingHolidays[0]?.count || '0', 10),
        activeHolidays: activeHolidays.length
      },
      tripStats: {
        completed: parseInt(tripStats?.completed_count || '0', 10),
        cancelled: parseInt(tripStats?.cancelled_count || '0', 10),
        noShows: parseInt(tripStats?.no_show_count || '0', 10),
        total: parseInt(tripStats?.total_count || '0', 10),
        completionRate: tripStats?.total_count > 0
          ? Math.round((parseInt(tripStats.completed_count || '0', 10) / parseInt(tripStats.total_count, 10)) * 100)
          : 0
      },
      activeHolidays,
      recentAlerts: recentAlerts.map((alert: any) => ({
        request_id: alert.request_id,
        start_date: alert.start_date,
        end_date: alert.end_date,
        status: alert.status,
        message:
          alert.status === 'approved'
            ? `Your holiday request from ${alert.start_date} to ${alert.end_date} has been approved.`
            : `Your holiday request from ${alert.start_date} to ${alert.end_date} was declined.${alert.rejection_reason ? ' Reason: ' + alert.rejection_reason : ''}`,
        type: alert.status === 'approved' ? 'success' : 'warning'
      }))
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/schedule
 * @desc Get driver's schedule for a specific date range
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/schedule',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { startDate, endDate } = req.query;

    logger.info('Getting driver schedule', { tenantId, driverId, startDate, endDate });

    // Use provided dates or default to current date
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const schedules = await query(
      `SELECT
        sa.assignment_id,
        sa.assignment_date,
        sa.customer_id,
        sa.is_active,
        c.name as customer_name,
        c.address as customer_address,
        c.phone as customer_phone,
        c.mobility_requirements,
        c.driver_notes,
        c.medical_notes,
        c.accessibility_needs
      FROM tenant_schedule_assignments sa
      LEFT JOIN tenant_customers c ON sa.customer_id = c.customer_id AND sa.tenant_id = c.tenant_id
      WHERE sa.driver_id = $1 AND sa.tenant_id = $2
        AND sa.assignment_date >= $3
        AND sa.assignment_date <= $4
      ORDER BY sa.assignment_date ASC`,
      [driverId, tenantId, start, end]
    );

    return res.json({
      schedules
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/holidays
 * @desc Get driver's holiday requests and balance
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/holidays',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting driver holidays', { tenantId, driverId });

    // Get holiday requests
    const requests = await query(
      `SELECT
        request_id,
        start_date,
        end_date,
        days,
        type,
        notes,
        status,
        requested_date,
        approved_date,
        rejection_reason,
        created_at
      FROM tenant_holiday_requests
      WHERE driver_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC`,
      [driverId, tenantId]
    );

    // Get holiday balance
    const settingsRow = await queryOne(
      `SELECT settings
       FROM tenant_settings
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const holidaySettings = settingsRow?.settings?.holidays || {};
    const annualAllowance = holidaySettings.annualAllowance || 28;

    const balance = await queryOne(
      `SELECT
        COALESCE(SUM(CASE
          WHEN status = 'approved' AND type = 'annual'
          AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          THEN days ELSE 0 END), 0) as used_days,
        COALESCE(SUM(CASE
          WHEN status = 'pending' AND type = 'annual'
          THEN days ELSE 0 END), 0) as pending_days
      FROM tenant_holiday_requests
      WHERE driver_id = $1 AND tenant_id = $2`,
      [driverId, tenantId]
    );

    return res.json({
      requests,
      balance: {
        allowance: annualAllowance,
        used_days: parseInt(balance?.used_days || '0', 10),
        pending_days: parseInt(balance?.pending_days || '0', 10),
        remaining_days: annualAllowance - parseInt(balance?.used_days || '0', 10)
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/performance
 * @desc Get driver performance metrics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/performance',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting driver performance', { tenantId, driverId });

    // Get total trips completed (last 30 days)
    const tripsCompleted = await query(
      `SELECT COUNT(*) as count
       FROM tenant_schedule_assignments
       WHERE driver_id = $1 AND tenant_id = $2
         AND assignment_date >= CURRENT_DATE - INTERVAL '30 days'
         AND assignment_date < CURRENT_DATE
         AND is_active = true`,
      [driverId, tenantId]
    );

    // Get holiday days used this year
    const holidaysUsed = await query(
      `SELECT COALESCE(SUM(days), 0) as total
       FROM tenant_holiday_requests
       WHERE driver_id = $1 AND tenant_id = $2
         AND status = 'approved'
         AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [driverId, tenantId]
    );

    return res.json({
      performance: {
        tripsLast30Days: parseInt(tripsCompleted[0]?.count || '0', 10),
        holidayDaysUsed: parseInt(holidaysUsed[0]?.total || '0', 10)
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/alerts
 * @desc Get driver alerts and notifications
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/alerts',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting driver alerts', { tenantId, driverId });

    // Get recent holiday decisions (last 30 days)
    const holidayAlerts = await query(
      `SELECT
        request_id,
        start_date,
        end_date,
        days,
        type,
        status,
        rejection_reason,
        approved_date,
        notes
      FROM tenant_holiday_requests
      WHERE driver_id = $1 AND tenant_id = $2
        AND status IN ('approved', 'rejected')
        AND approved_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY approved_date DESC`,
      [driverId, tenantId]
    );

    // Format alerts with messages
    const formattedAlerts = holidayAlerts.map((alert: any) => ({
      ...alert,
      message:
        alert.status === 'approved'
          ? `Your holiday request from ${alert.start_date} to ${alert.end_date} has been approved.`
          : `Your holiday request from ${alert.start_date} to ${alert.end_date} was declined.${alert.rejection_reason ? ' Reason: ' + alert.rejection_reason : ''}`,
      type: alert.status === 'approved' ? 'success' : 'warning'
    }));

    return res.json({
      alerts: formattedAlerts
    });
  })
);

export default router;
