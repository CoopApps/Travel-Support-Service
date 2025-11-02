import express, { Request, Response, Router } from 'express';
import { query } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';

const router: Router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    tenantId: number;
    role: string;
  };
}

/**
 * GET /tenants/:tenantId/admin/driver-dashboard
 * Get aggregated driver dashboard data for admin monitoring
 */
router.get(
  '/tenants/:tenantId/admin/driver-dashboard',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Get all drivers with their login info
    const drivers = await query(
      `SELECT
        d.driver_id,
        d.name,
        d.email,
        d.phone,
        d.employment_type,
        d.is_login_enabled,
        d.is_active,
        d.created_at as driver_created,
        u.user_id,
        u.username,
        u.last_login,
        u.created_at as user_created
      FROM tenant_drivers d
      LEFT JOIN tenant_users u ON d.user_id = u.user_id AND u.role = 'driver'
      WHERE d.tenant_id = $1 AND d.is_active = true
      ORDER BY d.name ASC`,
      [tenantId]
    );

    // Calculate summary statistics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: drivers.length,
      loginEnabled: drivers.filter(d => d.is_login_enabled).length,
      loginDisabled: drivers.filter(d => !d.is_login_enabled).length,
      neverLoggedIn: drivers.filter(d => d.is_login_enabled && !d.last_login).length,
      loggedInLast7Days: drivers.filter(d => d.last_login && new Date(d.last_login) >= sevenDaysAgo).length,
      loggedInLast30Days: drivers.filter(d => d.last_login && new Date(d.last_login) >= thirtyDaysAgo).length,
      byEmploymentType: {
        contracted: drivers.filter(d => d.employment_type === 'contracted').length,
        freelance: drivers.filter(d => d.employment_type === 'freelance').length,
        employed: drivers.filter(d => d.employment_type === 'employed').length,
      }
    };

    // Format driver list with activity status
    const driverList = drivers.map(d => {
      let activityStatus = 'Never Logged In';
      let activityClass = 'inactive';

      if (d.last_login) {
        const lastLogin = new Date(d.last_login);
        if (lastLogin >= sevenDaysAgo) {
          activityStatus = 'Active (Last 7 Days)';
          activityClass = 'active';
        } else if (lastLogin >= thirtyDaysAgo) {
          activityStatus = 'Active (Last 30 Days)';
          activityClass = 'moderate';
        } else {
          activityStatus = 'Inactive (30+ Days)';
          activityClass = 'inactive';
        }
      }

      return {
        driver_id: d.driver_id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        employment_type: d.employment_type,
        is_login_enabled: d.is_login_enabled,
        username: d.username,
        last_login: d.last_login,
        user_created: d.user_created,
        driver_created: d.driver_created,
        activity_status: activityStatus,
        activity_class: activityClass,
      };
    });

    return res.json({
      stats,
      drivers: driverList,
    });
  })
);

/**
 * GET /tenants/:tenantId/admin/driver-dashboard/activity-chart
 * Get driver login activity data for chart visualization
 */
router.get(
  '/tenants/:tenantId/admin/driver-dashboard/activity-chart',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { days = 30 } = req.query;

    // Get login activity over time (last N days)
    const activityData = await query(
      `SELECT
        DATE(u.last_login) as login_date,
        COUNT(DISTINCT u.user_id) as login_count
      FROM tenant_users u
      INNER JOIN tenant_drivers d ON u.user_id = d.user_id
      WHERE u.tenant_id = $1
        AND u.role = 'driver'
        AND u.last_login >= NOW() - INTERVAL '${parseInt(days as string)} days'
      GROUP BY DATE(u.last_login)
      ORDER BY login_date ASC`,
      [tenantId]
    );

    return res.json({ activityData });
  })
);

export default router;
