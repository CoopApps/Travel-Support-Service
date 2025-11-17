/**
 * Member Dividend History Routes
 *
 * API endpoints for members (customers/drivers) to view their dividend history:
 * - Get dividend payment history
 * - View total dividends received
 * - Track patronage over time
 */

import { Router, Request, Response } from 'express';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';
import { query, queryOne } from '../config/database';

const router = Router();

// ============================================================================
// MEMBER DIVIDEND HISTORY
// ============================================================================

/**
 * GET /tenants/:tenantId/members/:memberId/dividends
 * Get dividend history for a specific member (customer or driver)
 */
router.get(
  '/tenants/:tenantId/members/:memberId/dividends',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, memberId } = req.params;
    const { member_type = 'customer', limit = 12 } = req.query;

    try {
      // Get member's dividend history
      const dividends = await query(
        `SELECT
          md.dividend_id,
          md.distribution_id,
          md.member_type,
          md.member_trips_count as patronage_value,
          md.member_trip_percentage as patronage_percentage,
          md.dividend_amount,
          md.payment_status,
          md.payment_method,
          md.payment_date,
          md.created_at,
          sd.period_start,
          sd.period_end,
          sd.gross_surplus,
          sd.dividend_pool,
          sd.eligible_members,
          sd.total_member_trips as total_patronage,
          sd.distributed_at
         FROM section22_member_dividends md
         JOIN section22_surplus_distributions sd ON md.distribution_id = sd.distribution_id
         WHERE md.tenant_id = $1
           AND md.member_id = $2
           AND md.member_type = $3
         ORDER BY sd.period_end DESC
         LIMIT $4`,
        [tenantId, memberId, member_type, limit]
      );

      // Calculate totals
      const totalDividends = dividends.reduce(
        (sum: number, d: any) => sum + parseFloat(d.dividend_amount || '0'),
        0
      );

      const totalPatronage = dividends.reduce(
        (sum: number, d: any) => sum + parseInt(d.patronage_value || '0'),
        0
      );

      const paidDividends = dividends.filter((d: any) => d.payment_status === 'paid');
      const totalPaid = paidDividends.reduce(
        (sum: number, d: any) => sum + parseFloat(d.dividend_amount || '0'),
        0
      );

      const pendingDividends = dividends.filter((d: any) => d.payment_status === 'pending');
      const totalPending = pendingDividends.reduce(
        (sum: number, d: any) => sum + parseFloat(d.dividend_amount || '0'),
        0
      );

      res.json({
        dividends,
        summary: {
          total_distributions: dividends.length,
          total_dividends: totalDividends,
          total_paid: totalPaid,
          total_pending: totalPending,
          total_patronage: totalPatronage,
          member_type: member_type,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching member dividend history', {
        error: error.message,
        tenantId,
        memberId,
        member_type,
      });
      res.status(500).json({
        error: 'Failed to fetch dividend history',
        details: error.message,
      });
    }
  }
);

/**
 * GET /tenants/:tenantId/customers/:customerId/dividends
 * Convenience endpoint for customer dividend history
 */
router.get(
  '/tenants/:tenantId/customers/:customerId/dividends',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { limit = 12 } = req.query;

    try {
      // Get customer's member_id from cooperative_members table
      const member = await queryOne(
        `SELECT member_id FROM section22_cooperative_members
         WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true`,
        [tenantId, customerId]
      );

      if (!member) {
        return res.status(404).json({
          error: 'Not a cooperative member',
          message: 'This customer is not registered as a cooperative member',
        });
      }

      // Forward to member dividends endpoint
      req.params.memberId = member.member_id.toString();
      req.query.member_type = 'customer';
      req.query.limit = limit;

      // Re-route to member dividends handler
      return router.handle(
        Object.assign(req, { url: `/tenants/${tenantId}/members/${member.member_id}/dividends` }),
        res,
        () => {}
      );
    } catch (error: any) {
      logger.error('Error fetching customer dividend history', {
        error: error.message,
        tenantId,
        customerId,
      });
      res.status(500).json({
        error: 'Failed to fetch dividend history',
        details: error.message,
      });
    }
  }
);

/**
 * GET /tenants/:tenantId/drivers/:driverId/dividends
 * Convenience endpoint for driver dividend history
 */
router.get(
  '/tenants/:tenantId/drivers/:driverId/dividends',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { limit = 12 } = req.query;

    try {
      // For worker/hybrid co-ops, drivers ARE the members (member_id = driver_id)
      // Get driver dividends directly
      const dividends = await query(
        `SELECT
          md.dividend_id,
          md.distribution_id,
          md.member_type,
          md.member_trips_count as patronage_value,
          md.member_trip_percentage as patronage_percentage,
          md.dividend_amount,
          md.payment_status,
          md.payment_method,
          md.payment_date,
          md.created_at,
          sd.period_start,
          sd.period_end,
          sd.gross_surplus,
          sd.dividend_pool,
          sd.eligible_members,
          sd.total_member_trips as total_patronage,
          sd.distributed_at
         FROM section22_member_dividends md
         JOIN section22_surplus_distributions sd ON md.distribution_id = sd.distribution_id
         WHERE md.tenant_id = $1
           AND md.member_id = $2
           AND md.member_type = 'driver'
         ORDER BY sd.period_end DESC
         LIMIT $3`,
        [tenantId, driverId, limit]
      );

      // Calculate totals
      const totalDividends = dividends.reduce(
        (sum: number, d: any) => sum + parseFloat(d.dividend_amount || '0'),
        0
      );

      const totalPatronage = dividends.reduce(
        (sum: number, d: any) => sum + parseInt(d.patronage_value || '0'),
        0
      );

      const paidDividends = dividends.filter((d: any) => d.payment_status === 'paid');
      const totalPaid = paidDividends.reduce(
        (sum: number, d: any) => sum + parseFloat(d.dividend_amount || '0'),
        0
      );

      const pendingDividends = dividends.filter((d: any) => d.payment_status === 'pending');
      const totalPending = pendingDividends.reduce(
        (sum: number, d: any) => sum + parseFloat(d.dividend_amount || '0'),
        0
      );

      res.json({
        dividends,
        summary: {
          total_distributions: dividends.length,
          total_dividends: totalDividends,
          total_paid: totalPaid,
          total_pending: totalPending,
          total_patronage: totalPatronage,
          member_type: 'driver',
        },
      });
    } catch (error: any) {
      logger.error('Error fetching driver dividend history', {
        error: error.message,
        tenantId,
        driverId,
      });
      res.status(500).json({
        error: 'Failed to fetch dividend history',
        details: error.message,
      });
    }
  }
);

export default router;
