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

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/document-expiry-alerts
 * @desc Get document expiry alerts for driver (license, DBS, permits, MOT)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/document-expiry-alerts',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting driver document expiry alerts', { tenantId, driverId });

    // Get driver details with all document dates
    const driver = await queryOne(
      `SELECT
        name,
        license_number,
        license_expiry,
        dbs_check_date,
        dbs_expiry_date,
        section19_driver_auth,
        section19_driver_expiry,
        section22_driver_auth,
        section22_driver_expiry
      FROM tenant_drivers
      WHERE driver_id = $1 AND tenant_id = $2 AND is_active = true`,
      [driverId, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Get assigned vehicle details (MOT, insurance)
    const vehicle = await queryOne(
      `SELECT
        v.registration,
        v.mot_date,
        v.mot_expiry,
        v.insurance_expiry,
        v.next_inspection
      FROM tenant_vehicles v
      WHERE v.driver_id = $1 AND v.tenant_id = $2 AND v.is_active = true`,
      [driverId, tenantId]
    );

    // Get driver permits
    const permits = await query(
      `SELECT
        permit_type,
        has_permit,
        expiry_date,
        permit_number
      FROM tenant_driver_permits
      WHERE driver_id = $1 AND tenant_id = $2 AND has_permit = true`,
      [driverId, tenantId]
    );

    // Calculate expiry status for each document
    const now = new Date();

    const alerts: any[] = [];

    const checkExpiry = (date: any, label: string, category: string) => {
      if (!date) return;
      const expiryDate = new Date(date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status = 'valid';
      let priority = 'low';
      let message = `${label} is valid until ${expiryDate.toDateString()}`;

      if (daysUntilExpiry < 0) {
        status = 'expired';
        priority = 'critical';
        message = `${label} expired ${Math.abs(daysUntilExpiry)} days ago`;
      } else if (daysUntilExpiry <= 7) {
        status = 'expiring_soon';
        priority = 'critical';
        message = `${label} expires in ${daysUntilExpiry} days`;
      } else if (daysUntilExpiry <= 30) {
        status = 'expiring_soon';
        priority = 'high';
        message = `${label} expires in ${daysUntilExpiry} days`;
      }

      alerts.push({
        category,
        label,
        expiryDate: expiryDate.toISOString().split('T')[0],
        daysUntilExpiry,
        status,
        priority,
        message,
        actionRequired: status !== 'valid'
      });
    };

    // Check driver documents
    checkExpiry(driver.license_expiry, 'Driving License', 'license');
    checkExpiry(driver.dbs_expiry_date, 'DBS Check', 'dbs');

    // Check section 19/22 permits
    if (driver.section19_driver_auth && driver.section19_driver_expiry) {
      checkExpiry(driver.section19_driver_expiry, 'Section 19 Driver Authorization', 'permit');
    }
    if (driver.section22_driver_auth && driver.section22_driver_expiry) {
      checkExpiry(driver.section22_driver_expiry, 'Section 22 Driver Authorization', 'permit');
    }

    // Check vehicle documents
    if (vehicle) {
      checkExpiry(vehicle.mot_expiry, `Vehicle MOT (${vehicle.registration})`, 'vehicle');
      checkExpiry(vehicle.insurance_expiry, `Vehicle Insurance (${vehicle.registration})`, 'vehicle');
      checkExpiry(vehicle.next_inspection, `Vehicle Inspection (${vehicle.registration})`, 'vehicle');
    }

    // Check additional permits
    permits.forEach((permit: any) => {
      if (permit.expiry_date) {
        checkExpiry(permit.expiry_date, `${permit.permit_type} Permit`, 'permit');
      }
    });

    // Sort alerts by priority and expiry date
    alerts.sort((a, b) => {
      const priorityOrder: any = { critical: 0, high: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });

    const summary = {
      total: alerts.length,
      expired: alerts.filter(a => a.status === 'expired').length,
      expiringSoon: alerts.filter(a => a.status === 'expiring_soon').length,
      critical: alerts.filter(a => a.priority === 'critical').length,
      actionRequired: alerts.filter(a => a.actionRequired).length
    };

    return res.json({
      summary,
      alerts
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/vehicle-maintenance
 * @desc Get vehicle maintenance alerts and history for driver
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/vehicle-maintenance',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting driver vehicle maintenance', { tenantId, driverId });

    // Get assigned vehicle
    const vehicle = await queryOne(
      `SELECT
        vehicle_id,
        registration,
        make,
        model,
        year,
        mileage,
        last_service_date,
        service_interval_months,
        next_inspection,
        maintenance_notes
      FROM tenant_vehicles
      WHERE driver_id = $1 AND tenant_id = $2 AND is_active = true`,
      [driverId, tenantId]
    );

    if (!vehicle) {
      return res.json({
        hasVehicle: false,
        message: 'No vehicle assigned to this driver'
      });
    }

    // Get maintenance history (last 6 months)
    const maintenanceHistory = await query(
      `SELECT
        maintenance_id,
        maintenance_date,
        maintenance_type,
        description,
        cost,
        mileage_at_service,
        service_provider,
        next_service_date,
        severity,
        completed,
        created_at
      FROM tenant_vehicle_maintenance
      WHERE vehicle_id = $1 AND tenant_id = $2
        AND maintenance_date >= CURRENT_DATE - INTERVAL '6 months'
      ORDER BY maintenance_date DESC
      LIMIT 10`,
      [vehicle.vehicle_id, tenantId]
    );

    // Get upcoming maintenance
    const upcomingMaintenance = await query(
      `SELECT
        maintenance_id,
        maintenance_type,
        description,
        next_service_date,
        next_service_mileage,
        severity
      FROM tenant_vehicle_maintenance
      WHERE vehicle_id = $1 AND tenant_id = $2
        AND completed = false
        AND next_service_date IS NOT NULL
        AND next_service_date >= CURRENT_DATE
      ORDER BY next_service_date ASC`,
      [vehicle.vehicle_id, tenantId]
    );

    // Calculate maintenance alerts
    const now = new Date();
    const alerts: any[] = [];

    // Check service interval
    if (vehicle.last_service_date && vehicle.service_interval_months) {
      const lastService = new Date(vehicle.last_service_date);
      const monthsSinceService = Math.floor((now.getTime() - lastService.getTime()) / (1000 * 60 * 60 * 24 * 30));

      if (monthsSinceService >= vehicle.service_interval_months) {
        alerts.push({
          type: 'service_due',
          priority: 'high',
          message: `Regular service is overdue (last serviced ${monthsSinceService} months ago)`,
          actionRequired: true
        });
      } else if (monthsSinceService >= vehicle.service_interval_months - 1) {
        alerts.push({
          type: 'service_soon',
          priority: 'medium',
          message: `Regular service due soon (last serviced ${monthsSinceService} months ago)`,
          actionRequired: false
        });
      }
    }

    // Check next inspection
    if (vehicle.next_inspection) {
      const inspectionDate = new Date(vehicle.next_inspection);
      const daysUntilInspection = Math.ceil((inspectionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilInspection < 0) {
        alerts.push({
          type: 'inspection_overdue',
          priority: 'critical',
          message: `Vehicle inspection is overdue by ${Math.abs(daysUntilInspection)} days`,
          actionRequired: true
        });
      } else if (daysUntilInspection <= 14) {
        alerts.push({
          type: 'inspection_soon',
          priority: 'high',
          message: `Vehicle inspection due in ${daysUntilInspection} days`,
          actionRequired: true
        });
      }
    }

    // Check incomplete maintenance with high severity
    const criticalMaintenance = upcomingMaintenance.filter((m: any) => m.severity === 'high' || m.severity === 'critical');
    if (criticalMaintenance.length > 0) {
      alerts.push({
        type: 'critical_maintenance',
        priority: 'critical',
        message: `${criticalMaintenance.length} critical maintenance item(s) pending`,
        actionRequired: true,
        items: criticalMaintenance.map((m: any) => ({
          type: m.maintenance_type,
          description: m.description,
          dueDate: m.next_service_date
        }))
      });
    }

    return res.json({
      hasVehicle: true,
      vehicle: {
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        currentMileage: vehicle.mileage,
        lastServiceDate: vehicle.last_service_date,
        nextInspection: vehicle.next_inspection
      },
      alerts,
      maintenanceHistory,
      upcomingMaintenance,
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.priority === 'critical').length,
        completedLastSixMonths: maintenanceHistory.filter((m: any) => m.completed).length,
        upcomingCount: upcomingMaintenance.length
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/performance-metrics
 * @desc Get detailed performance metrics for driver
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/performance-metrics',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting driver performance metrics', { tenantId, driverId });

    // Get performance metrics from table
    const metrics = await queryOne(
      `SELECT
        completed_journeys,
        no_shows,
        cancellations,
        total_revenue,
        average_rating,
        punctuality_score,
        last_updated
      FROM tenant_driver_performance_metrics
      WHERE driver_id = $1 AND tenant_id = $2`,
      [driverId, tenantId]
    );

    // Get trip stats for last 30/90 days
    const tripStats30 = await queryOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as revenue
      FROM tenant_trips
      WHERE driver_id = $1 AND tenant_id = $2
        AND trip_date >= CURRENT_DATE - INTERVAL '30 days'
        AND trip_date <= CURRENT_DATE`,
      [driverId, tenantId]
    );

    const tripStats90 = await queryOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as revenue
      FROM tenant_trips
      WHERE driver_id = $1 AND tenant_id = $2
        AND trip_date >= CURRENT_DATE - INTERVAL '90 days'
        AND trip_date <= CURRENT_DATE`,
      [driverId, tenantId]
    );

    // Calculate completion rate
    const completionRate30 = tripStats30?.total > 0
      ? Math.round((parseInt(tripStats30.completed || '0') / parseInt(tripStats30.total)) * 100)
      : 0;

    const completionRate90 = tripStats90?.total > 0
      ? Math.round((parseInt(tripStats90.completed || '0') / parseInt(tripStats90.total)) * 100)
      : 0;

    return res.json({
      overall: {
        totalCompletedJourneys: parseInt(metrics?.completed_journeys || '0'),
        totalNoShows: parseInt(metrics?.no_shows || '0'),
        totalCancellations: parseInt(metrics?.cancellations || '0'),
        totalRevenue: parseFloat(metrics?.total_revenue || '0'),
        averageRating: parseFloat(metrics?.average_rating || '0'),
        punctualityScore: parseFloat(metrics?.punctuality_score || '0'),
        lastUpdated: metrics?.last_updated
      },
      last30Days: {
        completed: parseInt(tripStats30?.completed || '0'),
        cancelled: parseInt(tripStats30?.cancelled || '0'),
        noShows: parseInt(tripStats30?.no_shows || '0'),
        total: parseInt(tripStats30?.total || '0'),
        revenue: parseFloat(tripStats30?.revenue || '0'),
        completionRate: completionRate30
      },
      last90Days: {
        completed: parseInt(tripStats90?.completed || '0'),
        cancelled: parseInt(tripStats90?.cancelled || '0'),
        noShows: parseInt(tripStats90?.no_shows || '0'),
        total: parseInt(tripStats90?.total || '0'),
        revenue: parseFloat(tripStats90?.revenue || '0'),
        completionRate: completionRate90
      },
      performanceGrade: {
        overall: completionRate90 >= 95 ? 'Excellent' : completionRate90 >= 85 ? 'Good' : completionRate90 >= 75 ? 'Satisfactory' : 'Needs Improvement',
        punctuality: parseFloat(metrics?.punctuality_score || '0') >= 95 ? 'Excellent' : parseFloat(metrics?.punctuality_score || '0') >= 85 ? 'Good' : 'Needs Improvement',
        reliability: (parseInt(metrics?.no_shows || '0') / Math.max(parseInt(metrics?.completed_journeys || '1'), 1)) < 0.05 ? 'Excellent' : 'Good'
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/mileage-tracking
 * @desc Get mileage tracking and reimbursement summary
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/mileage-tracking',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { startDate, endDate } = req.query;

    logger.info('Getting driver mileage tracking', { tenantId, driverId, startDate, endDate });

    // Get driver's fuel submissions for mileage tracking
    const fuelSubmissions = await query(
      `SELECT
        fuel_id,
        date,
        station,
        litres,
        cost,
        price_per_litre,
        mileage,
        status,
        notes,
        approved_at,
        reimbursed_date,
        reimbursement_reference
      FROM tenant_driver_fuel
      WHERE driver_id = $1 AND tenant_id = $2
        ${startDate ? 'AND date >= $3' : ''}
        ${endDate ? 'AND date <= $' + (startDate ? '4' : '3') : ''}
      ORDER BY date DESC
      LIMIT 50`,
      startDate && endDate
        ? [driverId, tenantId, startDate, endDate]
        : startDate
        ? [driverId, tenantId, startDate]
        : [driverId, tenantId]
    );

    // Calculate mileage statistics
    let totalCost = 0;
    let totalReimbursed = 0;
    let pendingReimbursement = 0;

    fuelSubmissions.forEach((submission: any) => {
      totalCost += parseFloat(submission.cost || '0');

      if (submission.status === 'approved' && submission.reimbursed_date) {
        totalReimbursed += parseFloat(submission.cost || '0');
      } else if (submission.status === 'approved') {
        pendingReimbursement += parseFloat(submission.cost || '0');
      }
    });

    // Get vehicle mileage if assigned
    const vehicle = await queryOne(
      `SELECT mileage, make, model, registration
      FROM tenant_vehicles
      WHERE driver_id = $1 AND tenant_id = $2 AND is_active = true`,
      [driverId, tenantId]
    );

    // Get trips with mileage estimates (last 30 days)
    const recentTrips = await query(
      `SELECT
        trip_id,
        trip_date,
        pickup_location,
        destination,
        estimated_duration,
        status
      FROM tenant_trips
      WHERE driver_id = $1 AND tenant_id = $2
        AND trip_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY trip_date DESC
      LIMIT 20`,
      [driverId, tenantId]
    );

    return res.json({
      vehicle: vehicle
        ? {
            currentMileage: vehicle.mileage,
            registration: vehicle.registration,
            make: vehicle.make,
            model: vehicle.model
          }
        : null,
      fuelSummary: {
        totalSubmissions: fuelSubmissions.length,
        totalCost: totalCost.toFixed(2),
        totalReimbursed: totalReimbursed.toFixed(2),
        pendingReimbursement: pendingReimbursement.toFixed(2),
        pendingCount: fuelSubmissions.filter((f: any) => f.status === 'pending').length,
        approvedCount: fuelSubmissions.filter((f: any) => f.status === 'approved').length
      },
      fuelSubmissions,
      recentTrips: recentTrips.map((trip: any) => ({
        trip_id: trip.trip_id,
        date: trip.trip_date,
        route: `${trip.pickup_location} → ${trip.destination}`,
        duration: trip.estimated_duration,
        status: trip.status
      }))
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/trips-detailed
 * @desc Get detailed trip information with routes and customer notes
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/trips-detailed',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { date, status, limit = '20' } = req.query;

    logger.info('Getting detailed trips for driver', { tenantId, driverId, date, status });

    let whereClause = 'WHERE t.driver_id = $1 AND t.tenant_id = $2';
    const params: any[] = [driverId, tenantId];
    let paramCount = 3;

    if (date) {
      whereClause += ` AND t.trip_date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    if (status) {
      whereClause += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    params.push(parseInt(limit as string));

    const trips = await query(
      `SELECT
        t.trip_id,
        t.trip_date,
        t.day_of_week,
        t.pickup_time,
        t.estimated_duration,
        t.pickup_location,
        t.pickup_address,
        t.destination,
        t.destination_address,
        t.trip_type,
        t.status,
        t.price,
        t.requires_wheelchair,
        t.requires_escort,
        t.passenger_count,
        t.special_requirements,
        t.notes as trip_notes,
        c.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.mobility_requirements,
        c.driver_notes as customer_driver_notes,
        c.medical_notes,
        v.registration as vehicle_registration,
        v.make as vehicle_make,
        v.model as vehicle_model
      FROM tenant_trips t
      LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      ${whereClause}
      ORDER BY t.trip_date DESC, t.pickup_time DESC
      LIMIT $${paramCount}`,
      params
    );

    return res.json({
      trips: trips.map((trip: any) => ({
        trip_id: trip.trip_id,
        date: trip.trip_date,
        dayOfWeek: trip.day_of_week,
        pickupTime: trip.pickup_time,
        estimatedDuration: trip.estimated_duration,
        route: {
          pickup: {
            location: trip.pickup_location,
            address: trip.pickup_address
          },
          destination: {
            location: trip.destination,
            address: trip.destination_address
          }
        },
        customer: {
          id: trip.customer_id,
          name: trip.customer_name,
          phone: trip.customer_phone,
          mobilityRequirements: trip.mobility_requirements,
          driverNotes: trip.customer_driver_notes,
          medicalNotes: trip.medical_notes
        },
        tripDetails: {
          type: trip.trip_type,
          status: trip.status,
          price: parseFloat(trip.price || '0'),
          requiresWheelchair: trip.requires_wheelchair,
          requiresEscort: trip.requires_escort,
          passengerCount: trip.passenger_count,
          specialRequirements: trip.special_requirements,
          notes: trip.trip_notes
        },
        vehicle: trip.vehicle_registration
          ? {
              registration: trip.vehicle_registration,
              make: trip.vehicle_make,
              model: trip.vehicle_model
            }
          : null
      })),
      totalReturned: trips.length
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/earnings-summary
 * @desc Get earnings and payment summary for driver
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/earnings-summary',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting driver earnings summary', { tenantId, driverId });

    // Get driver salary structure
    const driver = await queryOne(
      `SELECT
        name,
        employment_type,
        salary_structure,
        weekly_wage,
        weekly_lease,
        monthly_salary,
        hourly_rate
      FROM tenant_drivers
      WHERE driver_id = $1 AND tenant_id = $2 AND is_active = true`,
      [driverId, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Parse salary structure
    const salaryStructure = typeof driver.salary_structure === 'string'
      ? JSON.parse(driver.salary_structure)
      : driver.salary_structure || {};

    // Get completed trips revenue (last 30/90 days)
    const revenue30 = await queryOne(
      `SELECT COALESCE(SUM(price), 0) as total
      FROM tenant_trips
      WHERE driver_id = $1 AND tenant_id = $2
        AND status = 'completed'
        AND trip_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [driverId, tenantId]
    );

    const revenue90 = await queryOne(
      `SELECT COALESCE(SUM(price), 0) as total
      FROM tenant_trips
      WHERE driver_id = $1 AND tenant_id = $2
        AND status = 'completed'
        AND trip_date >= CURRENT_DATE - INTERVAL '90 days'`,
      [driverId, tenantId]
    );

    // Get fuel reimbursements pending
    const fuelPending = await queryOne(
      `SELECT COALESCE(SUM(cost), 0) as total
      FROM tenant_driver_fuel
      WHERE driver_id = $1 AND tenant_id = $2
        AND status = 'approved'
        AND reimbursed_date IS NULL`,
      [driverId, tenantId]
    );

    // Calculate estimated monthly earnings
    let estimatedMonthly = 0;
    if (driver.employment_type === 'freelance' && driver.hourly_rate) {
      // Estimate based on average hours (assume 160 hours/month)
      estimatedMonthly = parseFloat(driver.hourly_rate) * 160;
    } else if (driver.monthly_salary) {
      estimatedMonthly = parseFloat(driver.monthly_salary);
    } else if (driver.weekly_wage) {
      estimatedMonthly = parseFloat(driver.weekly_wage) * 4.33; // Average weeks per month
    }

    return res.json({
      employmentType: driver.employment_type,
      salaryStructure: {
        type: salaryStructure.type || 'fixed_weekly',
        weeklyWage: parseFloat(driver.weekly_wage || '0'),
        monthlySalary: parseFloat(driver.monthly_salary || '0'),
        hourlyRate: parseFloat(driver.hourly_rate || '0'),
        fuelAllowance: parseFloat(salaryStructure.fuelAllowance || '0'),
        hasFuelCard: salaryStructure.hasFuelCard || false,
        holidayPay: salaryStructure.holidayPay || false,
        sickPay: salaryStructure.sickPay || false
      },
      earnings: {
        estimatedMonthly: estimatedMonthly.toFixed(2),
        tripsRevenueLast30Days: parseFloat(revenue30?.total || '0').toFixed(2),
        tripsRevenueLast90Days: parseFloat(revenue90?.total || '0').toFixed(2),
        fuelReimbursementPending: parseFloat(fuelPending?.total || '0').toFixed(2)
      },
      breakdown: {
        baseWage: driver.employment_type === 'freelance'
          ? 'Hourly rate: £' + (driver.hourly_rate || '0')
          : driver.monthly_salary
          ? 'Monthly: £' + driver.monthly_salary
          : 'Weekly: £' + (driver.weekly_wage || '0'),
        fuelAllowance: salaryStructure.hasFuelCard
          ? 'Fuel card provided'
          : salaryStructure.fuelAllowance
          ? '£' + salaryStructure.fuelAllowance + ' per week'
          : 'Reimbursement on submission',
        benefits: [
          salaryStructure.holidayPay ? 'Holiday pay included' : null,
          salaryStructure.sickPay ? 'Sick pay included' : null
        ].filter(Boolean)
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/fuel-card-usage
 * @desc Get fuel card usage tracking for driver
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/fuel-card-usage',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting fuel card usage for driver', { tenantId, driverId });

    // Get driver's fuel card info from salary structure
    const driver = await queryOne(
      `SELECT salary_structure
      FROM tenant_drivers
      WHERE driver_id = $1 AND tenant_id = $2 AND is_active = true`,
      [driverId, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    const salaryStructure = typeof driver.salary_structure === 'string'
      ? JSON.parse(driver.salary_structure)
      : driver.salary_structure || {};

    const hasFuelCard = salaryStructure.hasFuelCard || false;
    const fuelCardId = salaryStructure.fuelCardId || null;

    // Get fuel submissions (last 90 days)
    const fuelUsage = await query(
      `SELECT
        fuel_id,
        date,
        station,
        litres,
        cost,
        price_per_litre,
        mileage,
        status,
        notes,
        approved_at,
        reimbursed_date
      FROM tenant_driver_fuel
      WHERE driver_id = $1 AND tenant_id = $2
        AND date >= CURRENT_DATE - INTERVAL '90 days'
      ORDER BY date DESC`,
      [driverId, tenantId]
    );

    // Calculate fuel statistics
    const totalLitres = fuelUsage.reduce((sum: number, f: any) => sum + parseFloat(f.litres || '0'), 0);
    const totalCost = fuelUsage.reduce((sum: number, f: any) => sum + parseFloat(f.cost || '0'), 0);
    const averagePricePerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;

    // Group by month
    const monthlyUsage: any = {};
    fuelUsage.forEach((f: any) => {
      const month = f.date.substring(0, 7); // YYYY-MM
      if (!monthlyUsage[month]) {
        monthlyUsage[month] = { litres: 0, cost: 0, count: 0 };
      }
      monthlyUsage[month].litres += parseFloat(f.litres || '0');
      monthlyUsage[month].cost += parseFloat(f.cost || '0');
      monthlyUsage[month].count++;
    });

    return res.json({
      hasFuelCard,
      fuelCardId,
      summary: {
        totalSubmissions: fuelUsage.length,
        totalLitres: totalLitres.toFixed(2),
        totalCost: totalCost.toFixed(2),
        averagePricePerLitre: averagePricePerLitre.toFixed(3),
        averageCostPerFill: fuelUsage.length > 0 ? (totalCost / fuelUsage.length).toFixed(2) : '0.00'
      },
      monthlyBreakdown: Object.keys(monthlyUsage)
        .sort()
        .reverse()
        .map(month => ({
          month,
          litres: monthlyUsage[month].litres.toFixed(2),
          cost: monthlyUsage[month].cost.toFixed(2),
          fillCount: monthlyUsage[month].count
        })),
      recentUsage: fuelUsage.slice(0, 10).map((f: any) => ({
        fuel_id: f.fuel_id,
        date: f.date,
        station: f.station,
        litres: parseFloat(f.litres || '0').toFixed(2),
        cost: parseFloat(f.cost || '0').toFixed(2),
        pricePerLitre: parseFloat(f.price_per_litre || '0').toFixed(3),
        mileage: f.mileage,
        status: f.status
      }))
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/vehicle-assignment-history
 * @desc Get vehicle assignment history for driver
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/vehicle-assignment-history',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting vehicle assignment history for driver', { tenantId, driverId });

    // Get current vehicle assignment
    const currentVehicle = await queryOne(
      `SELECT
        vehicle_id,
        registration,
        make,
        model,
        year,
        type,
        fuel_type,
        mileage,
        wheelchair_accessible,
        created_at
      FROM tenant_vehicles
      WHERE driver_id = $1 AND tenant_id = $2 AND is_active = true`,
      [driverId, tenantId]
    );

    // Get trips with vehicle information (shows vehicle assignment history)
    const assignmentHistory = await query(
      `SELECT DISTINCT ON (t.vehicle_id)
        t.vehicle_id,
        v.registration,
        v.make,
        v.model,
        v.year,
        MIN(t.trip_date) as first_used,
        MAX(t.trip_date) as last_used,
        COUNT(*) as trip_count
      FROM tenant_trips t
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      WHERE t.driver_id = $1 AND t.tenant_id = $2 AND t.vehicle_id IS NOT NULL
      GROUP BY t.vehicle_id, v.registration, v.make, v.model, v.year
      ORDER BY t.vehicle_id, MAX(t.trip_date) DESC`,
      [driverId, tenantId]
    );

    return res.json({
      currentVehicle: currentVehicle
        ? {
            vehicle_id: currentVehicle.vehicle_id,
            registration: currentVehicle.registration,
            make: currentVehicle.make,
            model: currentVehicle.model,
            year: currentVehicle.year,
            type: currentVehicle.type,
            fuelType: currentVehicle.fuel_type,
            mileage: currentVehicle.mileage,
            wheelchairAccessible: currentVehicle.wheelchair_accessible,
            assignedSince: currentVehicle.created_at
          }
        : null,
      assignmentHistory: assignmentHistory.map((v: any) => ({
        vehicle_id: v.vehicle_id,
        registration: v.registration,
        make: v.make,
        model: v.model,
        year: v.year,
        firstUsed: v.first_used,
        lastUsed: v.last_used,
        tripCount: parseInt(v.trip_count || '0'),
        isCurrent: currentVehicle && v.vehicle_id === currentVehicle.vehicle_id
      }))
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/driver-dashboard/:driverId/training-progress
 * @desc Get training certification progress and expiry warnings
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/driver-dashboard/:driverId/training-progress',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting training progress for driver', { tenantId, driverId });

    // Get all training types
    const trainingTypes = await query(
      `SELECT
        training_type_id,
        name,
        category,
        validity_period_months,
        is_mandatory
      FROM tenant_training_types
      WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    // Get driver's training records
    const trainingRecords = await query(
      `SELECT
        tr.training_record_id,
        tr.training_type_id,
        tr.completed_date,
        tr.expiry_date,
        tr.provider,
        tr.certificate_number,
        tr.notes,
        tt.name as training_name,
        tt.category,
        tt.is_mandatory
      FROM tenant_training_records tr
      LEFT JOIN tenant_training_types tt ON tr.training_type_id = tt.training_type_id AND tr.tenant_id = tt.tenant_id
      WHERE tr.driver_id = $1 AND tr.tenant_id = $2
      ORDER BY tr.completed_date DESC`,
      [driverId, tenantId]
    );

    // Calculate training status
    const now = new Date();

    const trainingStatus: any[] = [];
    const alerts: any[] = [];

    trainingTypes.forEach((type: any) => {
      const record = trainingRecords.find((r: any) => r.training_type_id === type.training_type_id);

      let status = 'not_completed';
      let priority = 'low';
      let message = '';
      let daysUntilExpiry = null;

      if (record && record.expiry_date) {
        const expiryDate = new Date(record.expiry_date);
        daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          status = 'expired';
          priority = type.is_mandatory ? 'critical' : 'high';
          message = `${type.name} expired ${Math.abs(daysUntilExpiry)} days ago`;
        } else if (daysUntilExpiry <= 30) {
          status = 'expiring_soon';
          priority = type.is_mandatory ? 'high' : 'medium';
          message = `${type.name} expires in ${daysUntilExpiry} days`;
        } else {
          status = 'valid';
          priority = 'low';
          message = `${type.name} valid until ${expiryDate.toDateString()}`;
        }

        if (status !== 'valid') {
          alerts.push({
            training: type.name,
            category: type.category,
            status,
            priority,
            message,
            daysUntilExpiry,
            isMandatory: type.is_mandatory,
            expiryDate: record.expiry_date
          });
        }
      } else if (type.is_mandatory) {
        status = 'not_completed';
        priority = 'high';
        message = `${type.name} (mandatory) not completed`;
        alerts.push({
          training: type.name,
          category: type.category,
          status,
          priority,
          message,
          isMandatory: true
        });
      }

      trainingStatus.push({
        trainingType: type.name,
        category: type.category,
        isMandatory: type.is_mandatory,
        status,
        completedDate: record?.completed_date || null,
        expiryDate: record?.expiry_date || null,
        daysUntilExpiry,
        provider: record?.provider || null,
        certificateNumber: record?.certificate_number || null
      });
    });

    // Sort alerts by priority
    alerts.sort((a, b) => {
      const priorityOrder: any = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const summary = {
      totalTrainingTypes: trainingTypes.length,
      mandatoryCount: trainingTypes.filter((t: any) => t.is_mandatory).length,
      completedCount: trainingStatus.filter(t => t.status === 'valid' || t.status === 'expiring_soon').length,
      expiredCount: trainingStatus.filter(t => t.status === 'expired').length,
      expiringSoonCount: trainingStatus.filter(t => t.status === 'expiring_soon').length,
      notCompletedCount: trainingStatus.filter(t => t.status === 'not_completed').length,
      complianceRate: trainingTypes.length > 0
        ? Math.round((trainingStatus.filter(t => t.status === 'valid').length / trainingTypes.length) * 100)
        : 0
    };

    return res.json({
      summary,
      trainingStatus,
      alerts,
      recentTraining: trainingRecords.slice(0, 5).map((r: any) => ({
        training_record_id: r.training_record_id,
        trainingName: r.training_name,
        category: r.category,
        completedDate: r.completed_date,
        expiryDate: r.expiry_date,
        provider: r.provider,
        isMandatory: r.is_mandatory
      }))
    });
  })
);

export default router;
