import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Holiday Routes
 *
 * Complete holiday management system for drivers and customers
 * - Driver holiday requests (pending approval)
 * - Customer absence requests (auto-approved)
 * - Schedule integration (filters unavailable drivers)
 * - Dashboard alerts for admins
 * - Holiday balance tracking
 */

/**
 * @route GET /api/tenants/:tenantId/holidays
 * @desc Get holidays overview and statistics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/holidays',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching holidays overview', { tenantId });

    // Get holiday requests statistics
    const requestsStats = await queryOne<{
      total_requests: string;
      pending_requests: string;
      approved_requests: string;
      rejected_requests: string;
      cancelled_requests: string;
      current_holidays: string;
      upcoming_holidays: string;
      recent_requests: string;
      total_days_approved_this_year: string;
    }>(`
      SELECT
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_requests,
        COUNT(CASE WHEN status = 'approved' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 1 END) as current_holidays,
        COUNT(CASE WHEN status = 'approved' AND start_date > CURRENT_DATE THEN 1 END) as upcoming_holidays,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_requests,
        SUM(CASE WHEN status = 'approved' AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN days ELSE 0 END) as total_days_approved_this_year
      FROM tenant_holiday_requests
      WHERE tenant_id = $1
    `, [tenantId]);

    // Get driver participation statistics
    const driversStats = await queryOne<{
      total_drivers: string;
      drivers_with_requests: string;
      drivers_with_approved_holidays: string;
    }>(`
      SELECT
        COUNT(DISTINCT d.driver_id) as total_drivers,
        COUNT(DISTINCT hr.driver_id) as drivers_with_requests,
        COUNT(DISTINCT CASE WHEN hr.status = 'approved' THEN hr.driver_id END) as drivers_with_approved_holidays
      FROM tenant_drivers d
      LEFT JOIN tenant_holiday_requests hr ON d.driver_id = hr.driver_id AND d.tenant_id = hr.tenant_id
      WHERE d.tenant_id = $1 AND d.is_active = true
    `, [tenantId]);

    // Get customer impact statistics
    const customersStats = await queryOne<{
      customers_affected: string;
      current_affected_customers: string;
    }>(`
      SELECT
        COUNT(DISTINCT hr.customer_id) as customers_affected,
        COUNT(CASE WHEN hr.status = 'approved' AND hr.start_date <= CURRENT_DATE AND hr.end_date >= CURRENT_DATE THEN 1 END) as current_affected_customers
      FROM tenant_holiday_requests hr
      WHERE hr.tenant_id = $1 AND hr.customer_id IS NOT NULL
    `, [tenantId]);

    // Get upcoming decisions needed
    const upcomingStats = await queryOne<{
      upcoming_decisions_needed: string;
    }>(`
      SELECT
        COUNT(*) as upcoming_decisions_needed
      FROM tenant_holiday_requests
      WHERE tenant_id = $1
        AND status = 'pending'
        AND start_date <= CURRENT_DATE + INTERVAL '7 days'
    `, [tenantId]);

    // Get holiday settings
    const settingsResult = await queryOne<{ settings: any }>(`
      SELECT settings
      FROM tenant_settings
      WHERE tenant_id = $1
    `, [tenantId]);

    const defaultSettings = {
      annualAllowance: 28,
      yearStart: 'january',
      allowCarryOver: true,
      maxCarryOver: 5,
      requireApproval: true,
      minNotice: 14,
      autoNotifyDrivers: true,
      blockDates: []
    };

    const holidaySettings = settingsResult?.settings?.holidays || defaultSettings;

    // Get balance summary
    const balancesStats = await queryOne<{
      total_annual_days_used: string;
      drivers_using_annual_leave: string;
    }>(`
      SELECT
        SUM(CASE WHEN status = 'approved' AND type = 'annual' AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN days ELSE 0 END) as total_annual_days_used,
        COUNT(DISTINCT driver_id) as drivers_using_annual_leave
      FROM tenant_holiday_requests
      WHERE tenant_id = $1
    `, [tenantId]);

    // Calculate derived metrics
    const totalRequests = parseInt(requestsStats?.total_requests || '0', 10);
    const pendingRequests = parseInt(requestsStats?.pending_requests || '0', 10);
    const approvedRequests = parseInt(requestsStats?.approved_requests || '0', 10);
    const totalDrivers = parseInt(driversStats?.total_drivers || '0', 10);
    const driversWithRequests = parseInt(driversStats?.drivers_with_requests || '0', 10);
    const totalAnnualDaysUsed = parseInt(balancesStats?.total_annual_days_used || '0', 10);
    const driversUsingAnnualLeave = parseInt(balancesStats?.drivers_using_annual_leave || '0', 10);
    const upcomingDecisionsNeeded = parseInt(upcomingStats?.upcoming_decisions_needed || '0', 10);
    const currentHolidays = parseInt(requestsStats?.current_holidays || '0', 10);

    // Calculate rates
    const participationRate = totalDrivers > 0 ? Math.round((driversWithRequests / totalDrivers) * 100) : 0;
    const averageDaysUsedPerDriver = driversUsingAnnualLeave > 0 ? Math.round(totalAnnualDaysUsed / driversUsingAnnualLeave) : 0;
    const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;
    const alertsCount = pendingRequests + upcomingDecisionsNeeded;

    res.json({
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: parseInt(requestsStats?.rejected_requests || '0', 10),
        cancelled: parseInt(requestsStats?.cancelled_requests || '0', 10),
        currentHolidays: currentHolidays,
        upcomingHolidays: parseInt(requestsStats?.upcoming_holidays || '0', 10),
        recentRequests: parseInt(requestsStats?.recent_requests || '0', 10)
      },
      drivers: {
        totalDrivers: totalDrivers,
        driversWithRequests: driversWithRequests,
        driversWithApprovedHolidays: parseInt(driversStats?.drivers_with_approved_holidays || '0', 10),
        participationRate: participationRate
      },
      customers: {
        customersAffected: parseInt(customersStats?.customers_affected || '0', 10),
        currentAffectedCustomers: parseInt(customersStats?.current_affected_customers || '0', 10)
      },
      balances: {
        totalAnnualDaysUsed: totalAnnualDaysUsed,
        driversUsingAnnualLeave: driversUsingAnnualLeave,
        averageDaysUsedPerDriver: averageDaysUsedPerDriver
      },
      alerts: {
        pendingApprovals: pendingRequests,
        upcomingDecisionsNeeded: upcomingDecisionsNeeded,
        currentHolidays: currentHolidays,
        total: alertsCount
      },
      settings: holidaySettings,
      summary: {
        totalRequests: totalRequests,
        alertsCount: alertsCount,
        approvalRate: approvalRate
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/holiday-settings
 * @desc Get tenant holiday settings
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/holiday-settings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching holiday settings', { tenantId });

    const result = await queryOne<{ settings: any }>(`
      SELECT settings
      FROM tenant_settings
      WHERE tenant_id = $1
    `, [tenantId]);

    const defaultSettings = {
      annualAllowance: 28,
      yearStart: 'january',
      allowCarryOver: true,
      maxCarryOver: 5,
      requireApproval: true,
      minNotice: 14,
      autoNotifyDrivers: true,
      blockDates: []
    };

    const settings = result?.settings?.holidays || defaultSettings;

    res.json({ settings });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/holiday-settings
 * @desc Update tenant holiday settings
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/holiday-settings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { settings } = req.body;

    logger.info('Updating holiday settings', { tenantId });

    // Get current settings
    const current = await queryOne<{ settings: any }>(`
      SELECT settings
      FROM tenant_settings
      WHERE tenant_id = $1
    `, [tenantId]);

    const currentSettings = current?.settings || {};
    const newSettings = {
      ...currentSettings,
      holidays: {
        ...currentSettings.holidays,
        ...settings
      }
    };

    // Update or insert settings
    if (current) {
      await query(`
        UPDATE tenant_settings
        SET settings = $2, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1
      `, [tenantId, JSON.stringify(newSettings)]);
    } else {
      await query(`
        INSERT INTO tenant_settings (tenant_id, settings, created_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, [tenantId, JSON.stringify(newSettings)]);
    }

    res.json({ settings: newSettings.holidays, message: 'Holiday settings updated successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/holiday-balances
 * @desc Get all driver holiday balances
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/holiday-balances',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching holiday balances', { tenantId });

    // Get settings for annual allowance
    const settingsResult = await queryOne<{ settings: any }>(`
      SELECT settings
      FROM tenant_settings
      WHERE tenant_id = $1
    `, [tenantId]);

    const annualAllowance = settingsResult?.settings?.holidays?.annualAllowance || 28;

    // Get balances for all drivers with pending days and carried over days
    const balances = await query(`
      SELECT
        d.driver_id,
        d.name,
        d.email,
        d.employment_type,
        COALESCE(SUM(CASE
          WHEN hr.status = 'approved'
          AND hr.type = 'annual'
          AND EXTRACT(YEAR FROM hr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          THEN hr.days
          ELSE 0
        END), 0) as used_days,
        COALESCE(SUM(CASE
          WHEN hr.status = 'pending'
          AND hr.type = 'annual'
          THEN hr.days
          ELSE 0
        END), 0) as pending_days,
        ${annualAllowance} as allowance,
        ${annualAllowance} - COALESCE(SUM(CASE
          WHEN hr.status = 'approved'
          AND hr.type = 'annual'
          AND EXTRACT(YEAR FROM hr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          THEN hr.days
          ELSE 0
        END), 0) as remaining_days,
        0 as carried_over,
        CURRENT_TIMESTAMP as last_updated
      FROM tenant_drivers d
      LEFT JOIN tenant_holiday_requests hr ON d.driver_id = hr.driver_id AND d.tenant_id = hr.tenant_id
      WHERE d.tenant_id = $1 AND d.is_active = true
      GROUP BY d.driver_id, d.name, d.email, d.employment_type
      ORDER BY d.name
    `, [tenantId]);

    res.json({ balances });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/drivers/:driverId/holiday-balance
 * @desc Manually adjust driver holiday balance
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/drivers/:driverId/holiday-balance',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { adjustment, reason } = req.body;

    logger.info('Adjusting holiday balance', { tenantId, driverId, adjustment });

    if (!adjustment || !reason) {
      throw new ValidationError('Adjustment amount and reason are required');
    }

    // Create adjustment record as a special holiday request
    const userId = (req as any).user?.userId || null;
    await query(`
      INSERT INTO tenant_holiday_requests (
        tenant_id, driver_id, start_date, end_date, days, type,
        notes, status, requested_date, requested_by, approved_date, approved_by
      ) VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE, $3, 'adjustment', $4, 'approved', CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP, $5)
    `, [tenantId, driverId, adjustment, reason, userId]);

    res.json({ message: 'Holiday balance adjusted successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/holiday-requests
 * @desc Get all holiday requests with optional filters
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/holiday-requests',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { status, driver_id, customer_id, start_date, end_date, type, limit = '100' } = req.query;

    logger.info('Fetching holiday requests', { tenantId, filters: req.query });

    let whereClause = 'WHERE hr.tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND hr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (driver_id) {
      whereClause += ` AND hr.driver_id = $${paramIndex}`;
      params.push(driver_id);
      paramIndex++;
    }

    if (customer_id) {
      whereClause += ` AND hr.customer_id = $${paramIndex}`;
      params.push(customer_id);
      paramIndex++;
    }

    if (start_date) {
      whereClause += ` AND hr.end_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND hr.start_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (type) {
      whereClause += ` AND hr.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    params.push(parseInt(limit as string, 10));

    const requests = await query(`
      SELECT
        hr.*,
        d.name as driver_name,
        d.email as driver_email,
        c.name as customer_name,
        c.address as customer_address,
        req_user.username as requested_by_name,
        app_user.username as approved_by_name
      FROM tenant_holiday_requests hr
      LEFT JOIN tenant_drivers d ON hr.driver_id = d.driver_id AND hr.tenant_id = d.tenant_id
      LEFT JOIN tenant_customers c ON hr.customer_id = c.customer_id AND hr.tenant_id = c.tenant_id
      LEFT JOIN tenant_users req_user ON hr.requested_by = req_user.user_id AND hr.tenant_id = req_user.tenant_id
      LEFT JOIN tenant_users app_user ON hr.approved_by = app_user.user_id AND hr.tenant_id = app_user.tenant_id
      ${whereClause}
      ORDER BY hr.created_at DESC
      LIMIT $${paramIndex}
    `, params);

    res.json({ requests });
  })
);

/**
 * @route POST /api/tenants/:tenantId/holiday-requests
 * @desc Create new holiday request
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/holiday-requests',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      driver_id,
      customer_id,
      start_date,
      end_date,
      type,
      notes,
      auto_approve = false
    } = req.body;

    logger.info('Creating holiday request', { tenantId, driver_id, customer_id, auto_approve });

    if (!start_date || !end_date) {
      throw new ValidationError('Start date and end date are required');
    }

    // Validate driver availability if creating for driver
    if (driver_id && !auto_approve) {
      const conflicts = await checkHolidayConflicts(parseInt(tenantId), driver_id, null, start_date, end_date);
      if (conflicts.length > 0) {
        throw new ValidationError(`Driver has conflicting holiday from ${conflicts[0].start_date} to ${conflicts[0].end_date}`);
      }
    }

    // Calculate days
    const days = calculateDays(start_date, end_date);
    const status = auto_approve ? 'approved' : 'pending';
    const userId = (req as any).user?.userId || null;

    const request = await queryOne(`
      INSERT INTO tenant_holiday_requests (
        tenant_id, driver_id, customer_id, start_date, end_date, days, type,
        notes, status, requested_date, requested_by,
        approved_date, approved_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      tenantId, driver_id, customer_id, start_date, end_date, days, type || 'annual',
      notes, status, userId,
      auto_approve ? new Date() : null, auto_approve ? userId : null
    ]);

    logger.info('Holiday request created', { tenantId, requestId: request.request_id, status });

    // Update schedule availability if auto-approved
    if (auto_approve && (driver_id || customer_id)) {
      await updateScheduleAvailability(
        parseInt(tenantId),
        driver_id || null,
        customer_id || null,
        start_date,
        end_date,
        false // Mark as unavailable
      );

      // Notify driver if auto-approved
      if (driver_id) {
        await notifyDriverOfHolidayDecision(parseInt(tenantId), request.request_id, 'approved');
      }
    }

    res.status(201).json({
      request,
      message: auto_approve ? 'Holiday request created and approved' : 'Holiday request submitted for approval'
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/holiday-requests/:requestId
 * @desc Update holiday request status (approve/reject/cancel)
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/holiday-requests/:requestId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, requestId } = req.params;
    const { status, rejection_reason, notes } = req.body;

    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      throw new ValidationError('Invalid status');
    }

    logger.info('Updating holiday request', { tenantId, requestId, status });

    // Get current request
    const currentRequest = await queryOne(`
      SELECT * FROM tenant_holiday_requests
      WHERE tenant_id = $1 AND request_id = $2
    `, [tenantId, requestId]);

    if (!currentRequest) {
      throw new NotFoundError('Holiday request not found');
    }

    const userId = (req as any).user?.userId || null;

    // Update request
    let updateQuery: string;
    let params: any[];

    if (status === 'approved') {
      updateQuery = `
        UPDATE tenant_holiday_requests
        SET status = $3, approved_date = CURRENT_TIMESTAMP, approved_by = $4,
            notes = COALESCE($5, notes), updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND request_id = $2
        RETURNING *
      `;
      params = [tenantId, requestId, status, userId, notes];
    } else if (status === 'rejected') {
      updateQuery = `
        UPDATE tenant_holiday_requests
        SET status = $3, rejection_reason = $4, approved_date = CURRENT_TIMESTAMP,
            approved_by = $5, notes = COALESCE($6, notes), updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND request_id = $2
        RETURNING *
      `;
      params = [tenantId, requestId, status, rejection_reason, userId, notes];
    } else {
      updateQuery = `
        UPDATE tenant_holiday_requests
        SET status = $3, notes = COALESCE($4, notes), updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND request_id = $2
        RETURNING *
      `;
      params = [tenantId, requestId, status, notes];
    }

    const updatedRequest = await queryOne(updateQuery, params);

    logger.info('Holiday request updated', { tenantId, requestId, status });

    // Update schedule availability and send notifications
    if (status === 'approved' || status === 'cancelled') {
      const isAvailable = status === 'cancelled'; // If cancelled, mark as available again

      await updateScheduleAvailability(
        parseInt(tenantId),
        currentRequest.driver_id || null,
        currentRequest.customer_id || null,
        currentRequest.start_date,
        currentRequest.end_date,
        isAvailable
      );
    }

    // Notify driver of decision
    if (currentRequest.driver_id && (status === 'approved' || status === 'rejected')) {
      await notifyDriverOfHolidayDecision(
        parseInt(tenantId),
        parseInt(requestId),
        status,
        rejection_reason
      );
    }

    res.json({
      request: updatedRequest,
      message: `Holiday request ${status}`
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/holiday-requests/:requestId
 * @desc Get single holiday request details
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/holiday-requests/:requestId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, requestId } = req.params;

    logger.info('Fetching holiday request', { tenantId, requestId });

    const request = await queryOne(`
      SELECT
        hr.*,
        d.name as driver_name,
        d.email as driver_email,
        c.name as customer_name,
        c.address as customer_address,
        req_user.username as requested_by_name,
        app_user.username as approved_by_name
      FROM tenant_holiday_requests hr
      LEFT JOIN tenant_drivers d ON hr.driver_id = d.driver_id AND hr.tenant_id = d.tenant_id
      LEFT JOIN tenant_customers c ON hr.customer_id = c.customer_id AND hr.tenant_id = c.tenant_id
      LEFT JOIN tenant_users req_user ON hr.requested_by = req_user.user_id AND hr.tenant_id = req_user.tenant_id
      LEFT JOIN tenant_users app_user ON hr.approved_by = app_user.user_id AND hr.tenant_id = app_user.tenant_id
      WHERE hr.tenant_id = $1 AND hr.request_id = $2
    `, [tenantId, requestId]);

    if (!request) {
      throw new NotFoundError('Holiday request not found');
    }

    res.json({ request });
  })
);

/**
 * @route GET /api/tenants/:tenantId/drivers/:driverId/alerts
 * @desc Get driver holiday alerts/notifications
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/drivers/:driverId/alerts',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Fetching driver holiday alerts', { tenantId, driverId });

    // Get recent holiday decisions (last 30 days)
    const alerts = await query(`
      SELECT
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
      WHERE tenant_id = $1
        AND driver_id = $2
        AND status IN ('approved', 'rejected')
        AND approved_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY approved_date DESC
    `, [tenantId, driverId]);

    // Format alerts with messages
    const formattedAlerts = alerts.map((alert: any) => ({
      ...alert,
      message: alert.status === 'approved'
        ? `Your holiday request for ${formatDateRange(alert.start_date, alert.end_date)} has been approved.`
        : `Your holiday request for ${formatDateRange(alert.start_date, alert.end_date)} was declined.${alert.rejection_reason ? ' Reason: ' + alert.rejection_reason : ''}`,
      type: alert.status === 'approved' ? 'success' : 'warning'
    }));

    res.json({ alerts: formattedAlerts });
  })
);

/**
 * @route GET /api/tenants/:tenantId/drivers/available
 * @desc Get drivers available on specific date
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/drivers/available',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { date } = req.query;

    logger.info('Fetching available drivers', { tenantId, date });

    const checkDate = date || new Date().toISOString().split('T')[0];

    const drivers = await query(`
      SELECT
        d.driver_id,
        d.name,
        d.email,
        d.phone,
        d.employment_type,
        CASE
          WHEN hr.request_id IS NOT NULL THEN false
          ELSE true
        END as available
      FROM tenant_drivers d
      LEFT JOIN tenant_holiday_requests hr ON d.driver_id = hr.driver_id
        AND d.tenant_id = hr.tenant_id
        AND hr.status = 'approved'
        AND hr.start_date <= $2
        AND hr.end_date >= $2
      WHERE d.tenant_id = $1 AND d.is_active = true
      ORDER BY d.name
    `, [tenantId, checkDate]);

    res.json({ drivers });
  })
);

/**
 * @route GET /api/tenants/:tenantId/holiday-calendar/:year/:month
 * @desc Get holiday calendar data for specific month
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/holiday-calendar/:year/:month',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, year, month } = req.params;

    logger.info('Fetching holiday calendar', { tenantId, year, month });

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

    const holidays = await query(`
      SELECT
        hr.*,
        d.name as driver_name,
        c.name as customer_name
      FROM tenant_holiday_requests hr
      LEFT JOIN tenant_drivers d ON hr.driver_id = d.driver_id AND hr.tenant_id = d.tenant_id
      LEFT JOIN tenant_customers c ON hr.customer_id = c.customer_id AND hr.tenant_id = c.tenant_id
      WHERE hr.tenant_id = $1
        AND hr.status = 'approved'
        AND (
          (hr.start_date >= $2 AND hr.start_date <= $3)
          OR (hr.end_date >= $2 AND hr.end_date <= $3)
          OR (hr.start_date <= $2 AND hr.end_date >= $3)
        )
      ORDER BY hr.start_date, hr.driver_id, hr.customer_id
    `, [tenantId, startDate, endDate]);

    res.json({
      holidays,
      month: parseInt(month),
      year: parseInt(year)
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/holiday-availability-check
 * @desc Check availability for date range (conflict detection)
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/holiday-availability-check',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { start_date, end_date, driver_id, customer_id } = req.body;

    logger.info('Checking holiday availability', { tenantId, driver_id, customer_id });

    if (!start_date || !end_date) {
      throw new ValidationError('Start date and end date are required');
    }

    const conflicts = await checkHolidayConflicts(parseInt(tenantId), driver_id || null, customer_id || null, start_date, end_date);

    res.json({
      available: conflicts.length === 0,
      conflicts
    });
  })
);

/**
 * Helper Functions
 */

// Calculate number of days between dates
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end date
}

// Format date range for display
function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return 'Invalid date';

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (startDate === endDate) {
    return start.toLocaleDateString('en-GB');
  }

  return `${start.toLocaleDateString('en-GB')} - ${end.toLocaleDateString('en-GB')}`;
}

// Check for holiday conflicts
async function checkHolidayConflicts(
  tenantId: number,
  driverId: number | null,
  customerId: number | null,
  startDate: string,
  endDate: string
): Promise<any[]> {
  let whereClause = `
    WHERE tenant_id = $1
      AND status = 'approved'
      AND (
        (start_date <= $3 AND end_date >= $2)
      )
  `;
  const params: any[] = [tenantId, startDate, endDate];

  if (driverId) {
    params.push(driverId);
    whereClause += ` AND driver_id = $${params.length}`;
  }

  if (customerId) {
    params.push(customerId);
    whereClause += ` AND customer_id = $${params.length}`;
  }

  const conflicts = await query(`
    SELECT hr.*, d.name as driver_name, c.name as customer_name
    FROM tenant_holiday_requests hr
    LEFT JOIN tenant_drivers d ON hr.driver_id = d.driver_id AND hr.tenant_id = d.tenant_id
    LEFT JOIN tenant_customers c ON hr.customer_id = c.id AND hr.tenant_id = c.tenant_id
    ${whereClause}
  `, params);

  return conflicts;
}

// Update schedule availability based on holiday status
async function updateScheduleAvailability(
  tenantId: number,
  driverId: number | null,
  customerId: number | null,
  startDate: string,
  endDate: string,
  available: boolean
): Promise<void> {
  try {
    if (driverId) {
      await query(`
        UPDATE tenant_schedule_assignments
        SET is_active = $4, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND driver_id = $2
          AND assignment_date >= $3 AND assignment_date <= $5
      `, [tenantId, driverId, startDate, available, endDate]);

      logger.info(`Updated driver schedule availability for driver ${driverId} from ${startDate} to ${endDate} (${available ? 'active' : 'inactive'})`);
    }

    if (customerId) {
      await query(`
        UPDATE tenant_schedule_assignments
        SET is_active = $4, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND customer_id = $2
          AND assignment_date >= $3 AND assignment_date <= $5
      `, [tenantId, customerId, startDate, available, endDate]);

      logger.info(`Updated customer schedule availability for customer ${customerId} from ${startDate} to ${endDate} (${available ? 'active' : 'inactive'})`);
    }
  } catch (error) {
    logger.error('Error updating schedule availability:', error);
    // Don't throw - schedule update failure shouldn't block the holiday request
  }
}

// Notify driver of holiday decision
async function notifyDriverOfHolidayDecision(
  tenantId: number,
  requestId: number,
  newStatus: string,
  rejectionReason: string | null = null
): Promise<void> {
  try {
    // Get the request details with driver information
    const requestResult = await queryOne<{
      driver_id: number;
      driver_name: string;
      start_date: string;
      end_date: string;
      user_id?: number;
      email?: string;
    }>(`
      SELECT hr.*, d.name as driver_name, d.user_id, d.email
      FROM tenant_holiday_requests hr
      JOIN tenant_drivers d ON hr.driver_id = d.driver_id AND hr.tenant_id = d.tenant_id
      WHERE hr.request_id = $1 AND hr.tenant_id = $2
    `, [requestId, tenantId]);

    if (!requestResult) {
      logger.warn('Holiday request not found for notification:', { requestId });
      return;
    }

    // Create alert message
    const alertMessage = newStatus === 'approved'
      ? `Your holiday request for ${formatDateRange(requestResult.start_date, requestResult.end_date)} has been approved.`
      : `Your holiday request for ${formatDateRange(requestResult.start_date, requestResult.end_date)} was declined.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`;

    logger.info('Holiday decision notification prepared', {
      driverName: requestResult.driver_name,
      driverId: requestResult.driver_id,
      status: newStatus,
      message: alertMessage
    });

    // Note: The actual alert storage/delivery is handled by the driver dashboard
    // which polls the /api/tenants/:tenantId/drivers/:driverId/alerts endpoint
    // The alerts are generated dynamically from the holiday_requests table

  } catch (error) {
    logger.error('Error notifying driver of holiday decision:', error);
    // Don't throw - notification failure shouldn't block the holiday update
  }
}

export default router;
