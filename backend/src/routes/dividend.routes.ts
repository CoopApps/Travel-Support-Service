/**
 * Dividend Management Routes
 *
 * API endpoints for calculating and distributing dividends:
 * - Calculate dividends for a period
 * - View distribution history
 * - View member dividend history
 * - Mark distributions as paid
 */

import { Router, Request, Response } from 'express';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';
import {
  calculateDividends,
  saveDividendDistribution,
  markDistributionPaid,
  getDistributionHistory,
  getMemberDividendHistory,
} from '../services/dividendCalculation.service';

const router = Router();

// ============================================================================
// DIVIDEND CALCULATION
// ============================================================================

/**
 * POST /tenants/:tenantId/dividends/calculate
 * Calculate dividends for a period
 */
router.post(
  '/tenants/:tenantId/dividends/calculate',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      period_start,
      period_end,
      reserves_percent = 20,
      business_percent = 30,
      dividend_percent = 50,
      save = false,
    } = req.body;

    if (!period_start || !period_end) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['period_start', 'period_end'],
      });
    }

    try {
      const calculation = await calculateDividends(
        parseInt(tenantId),
        period_start,
        period_end,
        reserves_percent,
        business_percent,
        dividend_percent
      );

      // Optionally save to database
      if (save) {
        const distributionId = await saveDividendDistribution(calculation);
        return res.json({
          ...calculation,
          distribution_id: distributionId,
          saved: true,
        });
      }

      return res.json(calculation);
    } catch (error: any) {
      logger.error('Error calculating dividends', { error: error.message, tenantId });
      return res.status(500).json({ error: 'Failed to calculate dividends', details: error.message });
    }
  }
);

/**
 * POST /tenants/:tenantId/dividends/:distributionId/pay
 * Mark distribution as paid
 */
router.post(
  '/tenants/:tenantId/dividends/:distributionId/pay',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { distributionId } = req.params;
    const { payment_method = 'account_credit' } = req.body;

    try {
      await markDistributionPaid(parseInt(distributionId), payment_method);

      return res.json({
        success: true,
        message: 'Distribution marked as paid',
        distribution_id: distributionId,
      });
    } catch (error: any) {
      logger.error('Error marking distribution paid', {
        error: error.message,
        distributionId,
      });
      return res.status(500).json({ error: 'Failed to mark as paid', details: error.message });
    }
  }
);

// ============================================================================
// DISTRIBUTION HISTORY
// ============================================================================

/**
 * GET /tenants/:tenantId/dividends/distributions
 * Get distribution history
 */
router.get(
  '/tenants/:tenantId/dividends/distributions',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const limit = parseInt((req.query.limit as string) || '12');

    try {
      const distributions = await getDistributionHistory(parseInt(tenantId), limit);

      return res.json(distributions);
    } catch (error: any) {
      logger.error('Error fetching distributions', { error: error.message, tenantId });
      return res.status(500).json({ error: 'Failed to fetch distributions', details: error.message });
    }
  }
);

/**
 * GET /tenants/:tenantId/dividends/members/:memberId
 * Get member dividend history
 */
router.get(
  '/tenants/:tenantId/dividends/members/:memberId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { memberId } = req.params;
    const limit = parseInt((req.query.limit as string) || '12');

    try {
      const dividends = await getMemberDividendHistory(parseInt(memberId), limit);

      return res.json(dividends);
    } catch (error: any) {
      logger.error('Error fetching member dividends', { error: error.message, memberId });
      return res.status(500).json({ error: 'Failed to fetch dividends', details: error.message });
    }
  }
);

export default router;
