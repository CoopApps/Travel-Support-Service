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
 * GET /tenants/:tenantId/admin/customer-dashboard
 * Get aggregated customer dashboard data for admin monitoring
 */
router.get(
  '/tenants/:tenantId/admin/customer-dashboard',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Get all customers with their login info
    const customers = await query(
      `SELECT
        c.customer_id,
        c.name,
        c.email,
        c.phone,
        c.address,
        c.is_login_enabled,
        c.is_active,
        c.has_split_payment,
        c.created_at as customer_created,
        u.user_id,
        u.username,
        u.last_login,
        u.created_at as user_created
      FROM tenant_customers c
      LEFT JOIN tenant_users u ON c.user_id = u.user_id AND u.role = 'customer'
      WHERE c.tenant_id = $1 AND c.is_active = true
      ORDER BY c.name ASC`,
      [tenantId]
    );

    // Calculate summary statistics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: customers.length,
      loginEnabled: customers.filter(c => c.is_login_enabled).length,
      loginDisabled: customers.filter(c => !c.is_login_enabled).length,
      neverLoggedIn: customers.filter(c => c.is_login_enabled && !c.last_login).length,
      loggedInLast7Days: customers.filter(c => c.last_login && new Date(c.last_login) >= sevenDaysAgo).length,
      loggedInLast30Days: customers.filter(c => c.last_login && new Date(c.last_login) >= thirtyDaysAgo).length,
      splitPayment: customers.filter(c => c.has_split_payment).length,
    };

    // Format customer list with activity status
    const customerList = customers.map(c => {
      let activityStatus = 'Never Logged In';
      let activityClass = 'inactive';

      if (c.last_login) {
        const lastLogin = new Date(c.last_login);
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
        customer_id: c.customer_id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        is_login_enabled: c.is_login_enabled,
        has_split_payment: c.has_split_payment,
        username: c.username,
        last_login: c.last_login,
        user_created: c.user_created,
        customer_created: c.customer_created,
        activity_status: activityStatus,
        activity_class: activityClass,
      };
    });

    return res.json({
      stats,
      customers: customerList,
    });
  })
);

/**
 * GET /tenants/:tenantId/admin/customer-dashboard/activity-chart
 * Get customer login activity data for chart visualization
 */
router.get(
  '/tenants/:tenantId/admin/customer-dashboard/activity-chart',
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
      INNER JOIN tenant_customers c ON u.user_id = c.user_id
      WHERE u.tenant_id = $1
        AND u.role = 'customer'
        AND u.last_login >= NOW() - INTERVAL '${parseInt(days as string)} days'
      GROUP BY DATE(u.last_login)
      ORDER BY login_date ASC`,
      [tenantId]
    );

    return res.json({ activityData });
  })
);

export default router;
