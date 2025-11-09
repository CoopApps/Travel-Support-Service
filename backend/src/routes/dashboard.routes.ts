import express, { Request, Response, Router } from 'express';
import { pool } from '../config/database';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';

const router: Router = express.Router();

/**
 * Get all notifications (invoice + operational alerts)
 * GET /api/tenants/:tenantId/dashboard/all-notifications
 */
router.get('/tenants/:tenantId/dashboard/all-notifications', verifyTenantAccess, async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Calculate date 30 days from now for license expiry warnings
      const licenseWarningDate = new Date(today);
      licenseWarningDate.setDate(licenseWarningDate.getDate() + 30);
      const licenseWarningStr = licenseWarningDate.toISOString().split('T')[0];

      // ===== INVOICE ALERTS =====

      // Ready to send invoices
      const readyToSendResult = await pool.query(`
        SELECT
          invoice_id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount as total,
          paying_org as provider_name,
          customer_name,
          invoice_status as status
        FROM tenant_invoices
        WHERE tenant_id = $1
          AND invoice_status IN ('draft', 'pending')
          AND invoice_date <= $2
        ORDER BY invoice_date ASC
        LIMIT 50
      `, [tenantId, todayStr]);

      // Overdue invoices
      const overdueResult = await pool.query(`
        SELECT
          invoice_id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount as total,
          paying_org as provider_name,
          customer_name,
          invoice_status as status,
          ($2::date - due_date::date) as days_overdue
        FROM tenant_invoices
        WHERE tenant_id = $1
          AND invoice_status IN ('sent', 'overdue')
          AND due_date < $2
        ORDER BY due_date ASC
        LIMIT 50
      `, [tenantId, todayStr]);

      // ===== DRIVER ALERTS =====

      // Drivers without assigned vehicles
      const driversNeedVehicleResult = await pool.query(`
        SELECT
          driver_id,
          name,
          phone,
          email,
          employment_type
        FROM tenant_drivers
        WHERE tenant_id = $1
          AND is_active = true
          AND (vehicle_id IS NULL OR vehicle_id = 0)
        ORDER BY name
        LIMIT 50
      `, [tenantId]);

      // Drivers with expiring licenses (within 30 days)
      const expiringLicensesResult = await pool.query(`
        SELECT
          driver_id,
          name,
          phone,
          license_number,
          license_expiry,
          ($2::date - license_expiry::date) as days_until_expiry
        FROM tenant_drivers
        WHERE tenant_id = $1
          AND is_active = true
          AND license_expiry IS NOT NULL
          AND license_expiry <= $2
          AND license_expiry >= $3
        ORDER BY license_expiry ASC
        LIMIT 50
      `, [tenantId, licenseWarningStr, todayStr]);

      // Drivers with expired licenses
      const expiredLicensesResult = await pool.query(`
        SELECT
          driver_id,
          name,
          phone,
          license_number,
          license_expiry,
          ($2::date - license_expiry::date) as days_expired
        FROM tenant_drivers
        WHERE tenant_id = $1
          AND is_active = true
          AND license_expiry IS NOT NULL
          AND license_expiry < $2
        ORDER BY license_expiry ASC
        LIMIT 50
      `, [tenantId, todayStr]);

      // ===== DRIVER MESSAGE READS =====
      // Recently read messages (within last 24 hours)
      const recentlyReadMessagesResult = await pool.query(`
        SELECT
          m.message_id,
          m.title,
          m.priority,
          d.driver_id,
          d.name as driver_name,
          mr.read_at
        FROM driver_message_reads mr
        INNER JOIN driver_messages m ON mr.message_id = m.message_id
        INNER JOIN tenant_drivers d ON mr.driver_id = d.driver_id
        WHERE m.tenant_id = $1
          AND mr.read_at >= NOW() - INTERVAL '24 hours'
        ORDER BY mr.read_at DESC
        LIMIT 50
      `, [tenantId]);

      // Calculate pending payments total (from freelance submissions)
      const pendingPaymentsResult = await pool.query(`
        SELECT COALESCE(SUM(invoice_amount), 0) as total_pending
        FROM tenant_freelance_submissions
        WHERE tenant_id = $1
          AND payment_status = 'pending'
      `, [tenantId]);

      const totalPendingPayments = parseFloat(pendingPaymentsResult.rows[0]?.total_pending || '0');

      // Calculate totals
      const invoiceAlerts = readyToSendResult.rows.length + overdueResult.rows.length;
      const driverAlerts = driversNeedVehicleResult.rows.length +
                          expiringLicensesResult.rows.length +
                          expiredLicensesResult.rows.length;
      const messageReadNotifications = recentlyReadMessagesResult.rows.length;
      const totalAlerts = invoiceAlerts + driverAlerts + messageReadNotifications;
      const criticalAlerts = overdueResult.rows.length + expiredLicensesResult.rows.length;

      res.json({
        // Invoice notifications
        invoices: {
          readyToSend: {
            count: readyToSendResult.rows.length,
            items: readyToSendResult.rows
          },
          overdue: {
            count: overdueResult.rows.length,
            items: overdueResult.rows
          }
        },
        // Driver/Operational notifications
        drivers: {
          needVehicle: {
            count: driversNeedVehicleResult.rows.length,
            items: driversNeedVehicleResult.rows
          },
          expiringLicenses: {
            count: expiringLicensesResult.rows.length,
            items: expiringLicensesResult.rows
          },
          expiredLicenses: {
            count: expiredLicensesResult.rows.length,
            items: expiredLicensesResult.rows
          }
        },
        // Message notifications
        messages: {
          recentlyRead: {
            count: recentlyReadMessagesResult.rows.length,
            items: recentlyReadMessagesResult.rows
          }
        },
        // Summary
        summary: {
          totalAlerts,
          invoiceAlerts,
          driverAlerts,
          messageReadNotifications,
          criticalAlerts,
          pendingPayments: totalPendingPayments,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('Error fetching all notifications:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to fetch notifications',
          code: 'FETCH_NOTIFICATIONS_ERROR'
        }
      });
    }
  });

/**
 * Get comprehensive dashboard data (tasks + stats)
 * GET /api/tenants/:tenantId/dashboard/overview
 */
router.get('/tenants/:tenantId/dashboard/overview', verifyTenantAccess, async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Get start and end of current week
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

      // Calculate date 30 days from now for expiry warnings
      const warningDate = new Date(today);
      warningDate.setDate(warningDate.getDate() + 30);
      const warningDateStr = warningDate.toISOString().split('T')[0];

      // ===== TASKS/ALERTS =====

      // 1. Unassigned Journeys - Customers without driver assignments in schedule
      const unassignedJourneysResult = await pool.query(`
        SELECT
          customer_id,
          name,
          phone,
          email,
          schedule
        FROM tenant_customers
        WHERE tenant_id = $1
          AND is_active = true
          AND schedule IS NOT NULL
          AND schedule != '{}'
          AND schedule::text NOT LIKE '%driver%'
        LIMIT 50
      `, [tenantId]);

      // 2. Expiring Vehicle MOTs (within 30 days)
      const expiringMotsResult = await pool.query(`
        SELECT
          vehicle_id,
          registration,
          make,
          model,
          mot_date,
          ($2::date - mot_date::date) as days_until_expiry,
          driver_id,
          (SELECT name FROM tenant_drivers WHERE driver_id = v.driver_id AND tenant_id = v.tenant_id) as driver_name
        FROM tenant_vehicles v
        WHERE tenant_id = $1
          AND is_active = true
          AND mot_date IS NOT NULL
          AND mot_date <= $2
          AND mot_date >= $3
        ORDER BY mot_date ASC
        LIMIT 50
      `, [tenantId, warningDateStr, todayStr]);

      // 3. Expired Vehicle MOTs
      const expiredMotsResult = await pool.query(`
        SELECT
          vehicle_id,
          registration,
          make,
          model,
          mot_date,
          ($2::date - mot_date::date) as days_expired,
          driver_id,
          (SELECT name FROM tenant_drivers WHERE driver_id = v.driver_id AND tenant_id = v.tenant_id) as driver_name
        FROM tenant_vehicles v
        WHERE tenant_id = $1
          AND is_active = true
          AND mot_date IS NOT NULL
          AND mot_date < $2
        ORDER BY mot_date ASC
        LIMIT 50
      `, [tenantId, todayStr]);

      // 4. Pending Timesheet/Hours Submissions (from freelance submissions)
      const pendingTimesheetsResult = await pool.query(`
        SELECT
          submission_id,
          driver_id,
          invoice_date,
          invoice_amount,
          payment_status,
          created_at,
          (SELECT name FROM tenant_drivers WHERE driver_id = fs.driver_id AND tenant_id = fs.tenant_id) as driver_name
        FROM tenant_freelance_submissions fs
        WHERE tenant_id = $1
          AND payment_status = 'pending'
        ORDER BY created_at DESC
        LIMIT 50
      `, [tenantId]);

      // 5. Pending Leave/Holiday Requests
      const pendingLeaveResult = await pool.query(`
        SELECT
          request_id,
          driver_id,
          customer_id,
          start_date,
          end_date,
          days,
          notes,
          requested_date,
          (SELECT name FROM tenant_drivers WHERE driver_id = hr.driver_id AND tenant_id = hr.tenant_id) as driver_name
        FROM tenant_holiday_requests hr
        WHERE tenant_id = $1
          AND status = 'pending'
          AND driver_id IS NOT NULL
        ORDER BY requested_date ASC
        LIMIT 50
      `, [tenantId]);

      // 6. Customer Holiday Notifications
      const customerHolidaysResult = await pool.query(`
        SELECT
          request_id,
          customer_id,
          start_date,
          end_date,
          days,
          notes,
          status,
          requested_date,
          (SELECT name FROM tenant_customers WHERE customer_id = hr.customer_id AND tenant_id = hr.tenant_id) as customer_name
        FROM tenant_holiday_requests hr
        WHERE tenant_id = $1
          AND customer_id IS NOT NULL
          AND status IN ('approved', 'pending')
          AND end_date >= $2
        ORDER BY start_date ASC
        LIMIT 50
      `, [tenantId, todayStr]);

      // 7. Expiring Training Records (within 30 days)
      const expiringTrainingResult = await pool.query(`
        SELECT
          tr.training_record_id,
          tr.driver_id,
          tr.training_type_id,
          tr.completed_date,
          tr.expiry_date,
          ($2::date - tr.expiry_date::date) as days_until_expiry,
          d.name as driver_name,
          tt.name as training_type_name,
          tt.is_mandatory
        FROM tenant_training_records tr
        INNER JOIN tenant_drivers d ON tr.driver_id = d.driver_id AND tr.tenant_id = d.tenant_id
        INNER JOIN tenant_training_types tt ON tr.training_type_id = tt.training_type_id AND tr.tenant_id = tt.tenant_id
        WHERE tr.tenant_id = $1
          AND d.is_active = true
          AND tr.expiry_date IS NOT NULL
          AND tr.expiry_date <= $2
          AND tr.expiry_date >= $3
        ORDER BY tr.expiry_date ASC, tt.is_mandatory DESC
        LIMIT 50
      `, [tenantId, warningDateStr, todayStr]);

      // 8. Expiring Driver Permits (within 30 days)
      const expiringPermitsResult = await pool.query(`
        SELECT
          dp.driver_id,
          dp.permit_type,
          dp.expiry_date,
          dp.issue_date,
          ($2::date - dp.expiry_date::date) as days_until_expiry,
          d.name as driver_name
        FROM tenant_driver_permits dp
        INNER JOIN tenant_drivers d ON dp.driver_id = d.driver_id AND dp.tenant_id = d.tenant_id
        WHERE dp.tenant_id = $1
          AND d.is_active = true
          AND dp.has_permit = true
          AND dp.expiry_date IS NOT NULL
          AND dp.expiry_date <= $2
          AND dp.expiry_date >= $3
        ORDER BY dp.expiry_date ASC
        LIMIT 50
      `, [tenantId, warningDateStr, todayStr]);

      // 9. Expiring/Expired Documents
      const expiringDocumentsResult = await pool.query(`
        SELECT
          document_id,
          original_filename,
          document_category,
          expiry_date,
          module,
          entity_type,
          entity_id,
          CASE
            WHEN expiry_date < $2 THEN 'expired'
            WHEN expiry_date <= ($2::date + INTERVAL '7 days')::date THEN 'critical'
            WHEN expiry_date <= $3 THEN 'warning'
            ELSE 'valid'
          END as expiry_status,
          ($2::date - expiry_date::date) as days_until_expiry
        FROM tenant_documents
        WHERE tenant_id = $1
          AND is_active = true
          AND expiry_date IS NOT NULL
          AND expiry_date <= $3
        ORDER BY
          CASE
            WHEN expiry_date < $2 THEN 1
            WHEN expiry_date <= ($2::date + INTERVAL '7 days')::date THEN 2
            ELSE 3
          END,
          expiry_date ASC
        LIMIT 50
      `, [tenantId, todayStr, warningDateStr]);

      // Get entity names for documents
      const documentsWithNames = await Promise.all(
        expiringDocumentsResult.rows.map(async (doc: any) => {
          let entityName = '';
          if (doc.module === 'drivers' && doc.entity_id) {
            const driverResult = await pool.query(
              'SELECT name FROM tenant_drivers WHERE tenant_id = $1 AND driver_id = $2',
              [tenantId, doc.entity_id]
            );
            entityName = driverResult.rows[0]?.name || '';
          } else if (doc.module === 'customers' && doc.entity_id) {
            const customerResult = await pool.query(
              'SELECT name FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2',
              [tenantId, doc.entity_id]
            );
            entityName = customerResult.rows[0]?.name || '';
          } else if (doc.module === 'vehicles' && doc.entity_id) {
            const vehicleResult = await pool.query(
              'SELECT registration FROM tenant_vehicles WHERE tenant_id = $1 AND vehicle_id = $2',
              [tenantId, doc.entity_id]
            );
            entityName = vehicleResult.rows[0]?.registration || '';
          }
          return {
            ...doc,
            entity_name: entityName
          };
        })
      );

      // 10. Unreviewed Safeguarding Reports
      const safeguardingReportsResult = await pool.query(`
        SELECT
          report_id,
          driver_id,
          customer_id,
          incident_type,
          severity,
          incident_date,
          location,
          status,
          created_at,
          (SELECT name FROM tenant_drivers WHERE driver_id = sr.driver_id AND tenant_id = sr.tenant_id) as driver_name,
          (SELECT name FROM tenant_customers WHERE customer_id = sr.customer_id AND tenant_id = sr.tenant_id) as customer_name
        FROM tenant_safeguarding_reports sr
        WHERE tenant_id = $1
          AND status IN ('submitted', 'under_review')
        ORDER BY severity DESC, created_at DESC
        LIMIT 50
      `, [tenantId]);

      // 10. Overdue Invoices
      const overdueInvoicesResult = await pool.query(`
        SELECT
          invoice_id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount as total,
          paying_org as provider_name,
          customer_name,
          invoice_status as status,
          ($2::date - due_date::date) as days_overdue
        FROM tenant_invoices
        WHERE tenant_id = $1
          AND invoice_status IN ('sent', 'overdue')
          AND due_date < $2
        ORDER BY due_date ASC
        LIMIT 50
      `, [tenantId, todayStr]);

      // 11. Social Outing Suggestions (from customers)
      const outingSuggestionsResult = await pool.query(`
        SELECT
          id as outing_id,
          name,
          outing_date,
          destination,
          description,
          status,
          created_at,
          created_by
        FROM tenant_social_outings
        WHERE tenant_id = $1
          AND status = 'suggested'
          AND (outing_date >= $2 OR outing_date IS NULL)
        ORDER BY created_at DESC
        LIMIT 50
      `, [tenantId, todayStr]);

      // 12. Unread Driver Messages (to office)
      const driverMessagesResult = await pool.query(`
        SELECT
          message_id,
          driver_id,
          subject,
          message,
          status,
          created_at,
          (SELECT name FROM tenant_drivers WHERE driver_id = dm.driver_id AND tenant_id = dm.tenant_id) as driver_name
        FROM driver_to_office_messages dm
        WHERE tenant_id = $1
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 50
      `, [tenantId]);

      // 13. Unread Customer Messages (to office)
      const customerMessagesResult = await pool.query(`
        SELECT
          message_id,
          customer_id,
          subject,
          message,
          status,
          created_at,
          (SELECT name FROM tenant_customers WHERE customer_id = cm.customer_id AND tenant_id = cm.tenant_id) as customer_name
        FROM customer_messages_to_office cm
        WHERE tenant_id = $1
          AND status = 'unread'
        ORDER BY created_at DESC
        LIMIT 50
      `, [tenantId]);

      // ===== STATS =====

      // Journeys this week (estimated from active customer schedules)
      const journeysThisWeekResult = await pool.query(`
        SELECT
          COUNT(*) as active_customers,
          COALESCE(SUM(
            CASE WHEN schedule IS NOT NULL AND schedule::text != '{}'
            THEN jsonb_array_length(jsonb_path_query_array(schedule::jsonb, '$.*[*] ? (@.destination != null)'))
            ELSE 0 END
          ), 0) as estimated_weekly_journeys
        FROM tenant_customers
        WHERE tenant_id = $1 AND is_active = true
      `, [tenantId]);

      // Revenue this week (estimated from customer weekly costs)
      const revenueThisWeekResult = await pool.query(`
        SELECT
          COALESCE(SUM(
            CASE WHEN schedule IS NOT NULL AND schedule::text != '{}'
            THEN (
              SELECT COALESCE(SUM((value->>'dailyPrice')::decimal), 0)
              FROM jsonb_each(schedule::jsonb) AS kv(key, value)
              WHERE value->>'destination' IS NOT NULL
            )
            ELSE 0 END
          ), 0) as estimated_weekly_revenue
        FROM tenant_customers
        WHERE tenant_id = $1 AND is_active = true
      `, [tenantId]);

      // Active drivers and customers
      const activeCountsResult = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM tenant_drivers WHERE tenant_id = $1 AND is_active = true) as active_drivers,
          (SELECT COUNT(*) FROM tenant_customers WHERE tenant_id = $1 AND is_active = true) as active_customers
      `, [tenantId]);

      // Journeys today (estimated)
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayDayName = dayNames[today.getDay()];

      const journeysTodayResult = await pool.query(`
        SELECT
          COUNT(*) as journeys_today
        FROM tenant_customers
        WHERE tenant_id = $1
          AND is_active = true
          AND schedule IS NOT NULL
          AND schedule::jsonb->$2 IS NOT NULL
          AND schedule::jsonb->$2->>'destination' IS NOT NULL
      `, [tenantId, todayDayName]);

      // ===== FINANCIAL SUMMARY =====

      // Get start and end of current month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

      // Outstanding invoices (unpaid, total amount)
      const outstandingInvoicesResult = await pool.query(`
        SELECT
          COUNT(*) as invoice_count,
          COALESCE(SUM(total_amount), 0) as total_outstanding
        FROM tenant_invoices
        WHERE tenant_id = $1
          AND invoice_status = 'unpaid'
          AND archived = false
      `, [tenantId]);

      // Month-to-date revenue (from paid invoices)
      const monthlyRevenueResult = await pool.query(`
        SELECT
          COALESCE(SUM(total_amount), 0) as revenue_mtd
        FROM tenant_invoices
        WHERE tenant_id = $1
          AND invoice_status = 'paid'
          AND archived = false
          AND invoice_date >= $2
          AND invoice_date <= $3
      `, [tenantId, startOfMonthStr, endOfMonthStr]);

      // Payroll costs this month (from payroll records)
      const payrollCostsResult = await pool.query(`
        SELECT
          COALESCE(SUM(pr.gross_pay), 0) as payroll_costs
        FROM tenant_payroll_records pr
        JOIN tenant_payroll_periods pp ON pr.period_id = pp.period_id AND pr.tenant_id = pp.tenant_id
        WHERE pr.tenant_id = $1
          AND pp.period_start >= $2
          AND pp.period_end <= $3
      `, [tenantId, startOfMonthStr, endOfMonthStr]);

      // ===== DRIVER COMPLIANCE STATUS =====

      // Get all active drivers
      const allActiveDriversResult = await pool.query(`
        SELECT COUNT(*) as total_drivers
        FROM tenant_drivers
        WHERE tenant_id = $1 AND is_active = true
      `, [tenantId]);

      // Drivers with expired or expiring training (within 30 days)
      const driversTrainingIssuesResult = await pool.query(`
        SELECT DISTINCT driver_id
        FROM tenant_training_records
        WHERE tenant_id = $1
          AND is_active = true
          AND expiry_date IS NOT NULL
          AND expiry_date <= $2
      `, [tenantId, warningDateStr]);

      // Drivers with expired or expiring permits (within 30 days)
      const driversPermitIssuesResult = await pool.query(`
        SELECT DISTINCT driver_id
        FROM tenant_driver_permits
        WHERE tenant_id = $1
          AND is_active = true
          AND expiry_date IS NOT NULL
          AND expiry_date <= $2
      `, [tenantId, warningDateStr]);

      // Drivers with expired or expiring documents (within 30 days)
      const driversDocumentIssuesResult = await pool.query(`
        SELECT DISTINCT entity_id as driver_id
        FROM tenant_documents
        WHERE tenant_id = $1
          AND module = 'drivers'
          AND is_active = true
          AND expiry_date IS NOT NULL
          AND expiry_date <= $2
      `, [tenantId, warningDateStr]);

      // Combine all driver compliance issues
      const driversWithIssues = new Set<number>();
      driversTrainingIssuesResult.rows.forEach((row: any) => driversWithIssues.add(row.driver_id));
      driversPermitIssuesResult.rows.forEach((row: any) => driversWithIssues.add(row.driver_id));
      driversDocumentIssuesResult.rows.forEach((row: any) => driversWithIssues.add(row.driver_id));

      const totalDrivers = parseInt(allActiveDriversResult.rows[0]?.total_drivers || '0');
      const nonCompliantDrivers = driversWithIssues.size;
      const compliantDrivers = totalDrivers - nonCompliantDrivers;
      const compliancePercentage = totalDrivers > 0 ? Math.round((compliantDrivers / totalDrivers) * 100) : 100;

      // ===== FLEET UTILIZATION =====

      // Fleet statistics
      const fleetStatsResult = await pool.query(`
        SELECT
          COUNT(*) as total_vehicles,
          COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END) as assigned_vehicles,
          COUNT(CASE WHEN driver_id IS NULL AND is_active = true THEN 1 END) as available_vehicles,
          COUNT(CASE WHEN vehicle_status = 'maintenance' OR vehicle_status = 'out_of_service' THEN 1 END) as maintenance_vehicles
        FROM tenant_vehicles
        WHERE tenant_id = $1 AND is_active = true
      `, [tenantId]);

      // Maintenance due soon (within 30 days)
      const maintenanceDueResult = await pool.query(`
        SELECT
          v.vehicle_id,
          v.registration,
          v.make,
          v.model,
          v.last_service_date,
          v.next_service_date,
          v.mot_expiry,
          CASE
            WHEN v.next_service_date < $2 THEN 'overdue'
            WHEN v.next_service_date <= ($2::date + INTERVAL '7 days')::date THEN 'due_this_week'
            WHEN v.next_service_date <= ($2::date + INTERVAL '30 days')::date THEN 'due_this_month'
            ELSE 'scheduled'
          END as service_status,
          ($2::date - v.next_service_date::date) as days_overdue
        FROM tenant_vehicles v
        WHERE v.tenant_id = $1
          AND v.is_active = true
          AND v.next_service_date IS NOT NULL
          AND v.next_service_date <= ($2::date + INTERVAL '30 days')::date
        ORDER BY v.next_service_date ASC
        LIMIT 20
      `, [tenantId, todayStr]);

      // MOT expiring soon (within 30 days)
      const motExpiringResult = await pool.query(`
        SELECT
          v.vehicle_id,
          v.registration,
          v.make,
          v.model,
          v.mot_expiry,
          (v.mot_expiry::date - $2::date) as days_until_expiry,
          CASE
            WHEN v.mot_expiry < $2 THEN 'expired'
            WHEN v.mot_expiry <= ($2::date + INTERVAL '7 days')::date THEN 'critical'
            WHEN v.mot_expiry <= ($2::date + INTERVAL '30 days')::date THEN 'warning'
            ELSE 'valid'
          END as mot_status
        FROM tenant_vehicles v
        WHERE v.tenant_id = $1
          AND v.is_active = true
          AND v.mot_expiry IS NOT NULL
          AND v.mot_expiry <= ($2::date + INTERVAL '30 days')::date
        ORDER BY v.mot_expiry ASC
        LIMIT 10
      `, [tenantId, todayStr]);

      // Recent maintenance activities
      const recentMaintenanceResult = await pool.query(`
        SELECT
          m.maintenance_id,
          m.vehicle_id,
          m.maintenance_type,
          m.maintenance_date,
          m.description,
          m.cost,
          m.completed,
          v.registration,
          v.make,
          v.model
        FROM tenant_vehicle_maintenance m
        JOIN tenant_vehicles v ON m.vehicle_id = v.vehicle_id AND m.tenant_id = v.tenant_id
        WHERE m.tenant_id = $1
          AND m.maintenance_date >= ($2::date - INTERVAL '30 days')::date
        ORDER BY m.maintenance_date DESC
        LIMIT 10
      `, [tenantId, todayStr]);

      const totalVehicles = parseInt(fleetStatsResult.rows[0]?.total_vehicles || '0');
      const assignedVehicles = parseInt(fleetStatsResult.rows[0]?.assigned_vehicles || '0');
      const availableVehicles = parseInt(fleetStatsResult.rows[0]?.available_vehicles || '0');
      const maintenanceVehicles = parseInt(fleetStatsResult.rows[0]?.maintenance_vehicles || '0');
      const utilizationPercentage = totalVehicles > 0 ? Math.round((assignedVehicles / totalVehicles) * 100) : 0;

      // Count maintenance issues
      const maintenanceOverdue = maintenanceDueResult.rows.filter((m: any) => m.service_status === 'overdue').length;
      const maintenanceDueThisWeek = maintenanceDueResult.rows.filter((m: any) => m.service_status === 'due_this_week').length;

      // ===== TODAY'S OPERATIONAL DATA =====

      // Today's Journey Details
      const todaysJourneysResult = await pool.query(`
        SELECT
          customer_id,
          name as customer_name,
          phone,
          schedule::jsonb->$2 as today_schedule,
          mobility_requirements,
          special_requirements
        FROM tenant_customers
        WHERE tenant_id = $1
          AND is_active = true
          AND schedule IS NOT NULL
          AND schedule::jsonb->$2 IS NOT NULL
          AND schedule::jsonb->$2->>'destination' IS NOT NULL
        ORDER BY schedule::jsonb->$2->>'pickupTime'
        LIMIT 50
      `, [tenantId, todayDayName]);

      // Driver Roster for Today
      const driversRosterResult = await pool.query(`
        SELECT
          d.driver_id,
          d.name,
          d.phone,
          d.vehicle_id,
          d.is_active,
          v.registration,
          v.make,
          v.model,
          (
            SELECT COUNT(*)
            FROM tenant_customers c
            WHERE c.tenant_id = $1
              AND c.is_active = true
              AND c.schedule::jsonb->$2 IS NOT NULL
              AND c.schedule::jsonb->$2->>'destination' IS NOT NULL
          ) as assigned_journeys,
          (
            SELECT hr.status
            FROM tenant_holiday_requests hr
            WHERE hr.tenant_id = d.tenant_id
              AND hr.driver_id = d.driver_id
              AND $3 BETWEEN hr.start_date AND hr.end_date
              AND hr.status = 'approved'
            LIMIT 1
          ) as on_leave
        FROM tenant_drivers d
        LEFT JOIN tenant_vehicles v ON d.vehicle_id = v.vehicle_id AND d.tenant_id = v.tenant_id
        WHERE d.tenant_id = $1
          AND d.is_active = true
        ORDER BY d.name
      `, [tenantId, todayDayName, todayStr]);

      // Customer Alerts for Today
      const customerAlertsTodayResult = await pool.query(`
        SELECT
          'holiday' as alert_type,
          c.customer_id,
          c.name,
          hr.start_date,
          hr.end_date,
          hr.notes
        FROM tenant_holiday_requests hr
        INNER JOIN tenant_customers c ON hr.customer_id = c.customer_id AND hr.tenant_id = c.tenant_id
        WHERE hr.tenant_id = $1
          AND hr.customer_id IS NOT NULL
          AND hr.status = 'approved'
          AND $2 BETWEEN hr.start_date AND hr.end_date

        UNION ALL

        SELECT
          'special_requirement' as alert_type,
          customer_id,
          name,
          NULL as start_date,
          NULL as end_date,
          special_requirements as notes
        FROM tenant_customers
        WHERE tenant_id = $1
          AND is_active = true
          AND special_requirements IS NOT NULL
          AND special_requirements != ''
          AND schedule IS NOT NULL
          AND schedule::jsonb->$3 IS NOT NULL

        ORDER BY alert_type DESC
        LIMIT 20
      `, [tenantId, todayStr, todayDayName]);

      // Vehicle Status Today
      const vehicleStatusResult = await pool.query(`
        SELECT
          v.vehicle_id,
          v.registration,
          v.make,
          v.model,
          v.mot_date,
          v.is_active,
          v.driver_id,
          d.name as driver_name,
          CASE
            WHEN v.mot_date < $2 THEN 'expired_mot'
            WHEN v.mot_date <= ($2::date + INTERVAL '7 days')::date THEN 'mot_expiring_soon'
            WHEN v.driver_id IS NULL THEN 'unassigned'
            ELSE 'active'
          END as status
        FROM tenant_vehicles v
        LEFT JOIN tenant_drivers d ON v.driver_id = d.driver_id AND v.tenant_id = d.tenant_id
        WHERE v.tenant_id = $1
          AND v.is_active = true
        ORDER BY
          CASE
            WHEN v.mot_date < $2 THEN 1
            WHEN v.mot_date <= ($2::date + INTERVAL '7 days')::date THEN 2
            WHEN v.driver_id IS NULL THEN 3
            ELSE 4
          END,
          v.registration
      `, [tenantId, todayStr]);

      // Total pending approvals
      const totalPendingApprovals =
        pendingTimesheetsResult.rows.length +
        pendingLeaveResult.rows.length +
        safeguardingReportsResult.rows.length;

      // Calculate pending payments total (from freelance submissions)
      const totalPendingPayments = pendingTimesheetsResult.rows.reduce((sum: number, item: any) => {
        return sum + parseFloat(item.invoice_amount || '0');
      }, 0);

      // Calculate task counts
      const totalTasks =
        unassignedJourneysResult.rows.length +
        expiringMotsResult.rows.length +
        expiredMotsResult.rows.length +
        pendingTimesheetsResult.rows.length +
        pendingLeaveResult.rows.length +
        customerHolidaysResult.rows.length +
        expiringTrainingResult.rows.length +
        expiringPermitsResult.rows.length +
        safeguardingReportsResult.rows.length +
        overdueInvoicesResult.rows.length +
        outingSuggestionsResult.rows.length +
        driverMessagesResult.rows.length +
        customerMessagesResult.rows.length +
        documentsWithNames.length;

      const criticalTasks =
        expiredMotsResult.rows.length +
        safeguardingReportsResult.rows.filter((r: any) => r.severity === 'high' || r.severity === 'critical').length +
        overdueInvoicesResult.rows.filter((r: any) => r.days_overdue > 7).length +
        documentsWithNames.filter((d: any) => d.expiry_status === 'expired' || d.expiry_status === 'critical').length;

      res.json({
        tasks: {
          unassignedJourneys: {
            count: unassignedJourneysResult.rows.length,
            items: unassignedJourneysResult.rows
          },
          expiringMots: {
            count: expiringMotsResult.rows.length,
            items: expiringMotsResult.rows
          },
          expiredMots: {
            count: expiredMotsResult.rows.length,
            items: expiredMotsResult.rows
          },
          pendingTimesheets: {
            count: pendingTimesheetsResult.rows.length,
            items: pendingTimesheetsResult.rows
          },
          pendingLeaveRequests: {
            count: pendingLeaveResult.rows.length,
            items: pendingLeaveResult.rows
          },
          customerHolidays: {
            count: customerHolidaysResult.rows.length,
            items: customerHolidaysResult.rows
          },
          expiringTraining: {
            count: expiringTrainingResult.rows.length,
            items: expiringTrainingResult.rows
          },
          expiringPermits: {
            count: expiringPermitsResult.rows.length,
            items: expiringPermitsResult.rows
          },
          safeguardingReports: {
            count: safeguardingReportsResult.rows.length,
            items: safeguardingReportsResult.rows
          },
          overdueInvoices: {
            count: overdueInvoicesResult.rows.length,
            items: overdueInvoicesResult.rows
          },
          outingSuggestions: {
            count: outingSuggestionsResult.rows.length,
            items: outingSuggestionsResult.rows
          },
          driverMessages: {
            count: driverMessagesResult.rows.length,
            items: driverMessagesResult.rows
          },
          customerMessages: {
            count: customerMessagesResult.rows.length,
            items: customerMessagesResult.rows
          },
          expiringDocuments: {
            count: documentsWithNames.length,
            items: documentsWithNames
          }
        },
        stats: {
          journeysThisWeek: parseInt(journeysThisWeekResult.rows[0]?.estimated_weekly_journeys || '0'),
          revenueThisWeek: parseFloat(revenueThisWeekResult.rows[0]?.estimated_weekly_revenue || '0'),
          activeDrivers: parseInt(activeCountsResult.rows[0]?.active_drivers || '0'),
          activeCustomers: parseInt(activeCountsResult.rows[0]?.active_customers || '0'),
          journeysToday: parseInt(journeysTodayResult.rows[0]?.journeys_today || '0'),
          pendingApprovals: totalPendingApprovals,
          pendingPayments: totalPendingPayments,
          weekStart: startOfWeekStr,
          weekEnd: endOfWeekStr,
          // Financial Summary
          outstandingInvoicesCount: parseInt(outstandingInvoicesResult.rows[0]?.invoice_count || '0'),
          outstandingInvoicesTotal: parseFloat(outstandingInvoicesResult.rows[0]?.total_outstanding || '0'),
          revenueMTD: parseFloat(monthlyRevenueResult.rows[0]?.revenue_mtd || '0'),
          payrollCosts: parseFloat(payrollCostsResult.rows[0]?.payroll_costs || '0'),
          monthStart: startOfMonthStr,
          monthEnd: endOfMonthStr,
          // Driver Compliance
          totalDrivers: totalDrivers,
          compliantDrivers: compliantDrivers,
          nonCompliantDrivers: nonCompliantDrivers,
          compliancePercentage: compliancePercentage,
          // Fleet Utilization
          totalVehicles: totalVehicles,
          assignedVehicles: assignedVehicles,
          availableVehicles: availableVehicles,
          maintenanceVehicles: maintenanceVehicles,
          utilizationPercentage: utilizationPercentage,
          maintenanceOverdue: maintenanceOverdue,
          maintenanceDueThisWeek: maintenanceDueThisWeek,
          motExpiringSoon: motExpiringResult.rows.length
        },
        fleet: {
          maintenanceDue: {
            count: maintenanceDueResult.rows.length,
            items: maintenanceDueResult.rows
          },
          motExpiring: {
            count: motExpiringResult.rows.length,
            items: motExpiringResult.rows
          },
          recentMaintenance: {
            count: recentMaintenanceResult.rows.length,
            items: recentMaintenanceResult.rows
          }
        },
        today: {
          journeys: {
            count: todaysJourneysResult.rows.length,
            items: todaysJourneysResult.rows
          },
          drivers: {
            count: driversRosterResult.rows.filter((d: any) => !d.on_leave).length,
            onLeave: driversRosterResult.rows.filter((d: any) => d.on_leave).length,
            items: driversRosterResult.rows
          },
          customerAlerts: {
            count: customerAlertsTodayResult.rows.length,
            items: customerAlertsTodayResult.rows
          },
          vehicles: {
            active: vehicleStatusResult.rows.filter((v: any) => v.status === 'active').length,
            issues: vehicleStatusResult.rows.filter((v: any) => v.status !== 'active').length,
            items: vehicleStatusResult.rows
          }
        },
        summary: {
          totalTasks,
          criticalTasks,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('Error fetching dashboard overview:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to fetch dashboard overview',
          code: 'FETCH_DASHBOARD_ERROR'
        }
      });
    }
  });

export default router;
