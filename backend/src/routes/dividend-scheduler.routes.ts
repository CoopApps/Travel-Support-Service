/**
 * Dividend Scheduler Routes
 *
 * API endpoints for managing automated dividend calculation settings:
 * - Get/update scheduler settings
 * - Enable/disable automation
 * - Configure frequency and allocations
 * - Trigger manual calculation
 */

import { Router, Request, Response } from 'express';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';
import {
  getDividendScheduleSettings,
  updateDividendScheduleSettings,
  triggerManualDividendCalculation,
} from '../services/dividendScheduler.service';

const router = Router();

// ============================================================================
// SCHEDULER SETTINGS
// ============================================================================

/**
 * GET /tenants/:tenantId/dividends/scheduler/settings
 * Get dividend scheduler settings
 */
router.get(
  '/tenants/:tenantId/dividends/scheduler/settings',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    try {
      const settings = await getDividendScheduleSettings(parseInt(tenantId));

      if (!settings) {
        // Return default settings if none exist
        return res.json({
          tenant_id: parseInt(tenantId),
          enabled: false,
          frequency: 'monthly',
          reserves_percent: 20,
          business_percent: 30,
          dividend_percent: 50,
          auto_distribute: false,
          notification_email: null,
        });
      }

      return res.json(settings);
    } catch (error: any) {
      logger.error('Error fetching dividend scheduler settings', {
        error: error.message,
        tenantId,
      });
      return res.status(500).json({
        error: 'Failed to fetch scheduler settings',
        details: error.message,
      });
    }
  }
);

/**
 * PUT /tenants/:tenantId/dividends/scheduler/settings
 * Update dividend scheduler settings
 */
router.put(
  '/tenants/:tenantId/dividends/scheduler/settings',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      enabled,
      frequency,
      reserves_percent,
      business_percent,
      dividend_percent,
      auto_distribute,
      notification_email,
    } = req.body;

    try {
      // Validate percentages if provided
      if (
        reserves_percent !== undefined &&
        business_percent !== undefined &&
        dividend_percent !== undefined
      ) {
        const total = reserves_percent + business_percent + dividend_percent;
        if (Math.abs(total - 100) > 0.01) {
          return res.status(400).json({
            error: 'Allocation percentages must total 100%',
            current_total: total,
          });
        }
      }

      // Validate frequency
      if (frequency && !['monthly', 'quarterly'].includes(frequency)) {
        return res.status(400).json({
          error: 'Invalid frequency',
          valid_values: ['monthly', 'quarterly'],
        });
      }

      await updateDividendScheduleSettings(parseInt(tenantId), {
        enabled,
        frequency,
        reserves_percent,
        business_percent,
        dividend_percent,
        auto_distribute,
        notification_email,
      });

      // Fetch updated settings
      const updatedSettings = await getDividendScheduleSettings(parseInt(tenantId));

      return res.json({
        success: true,
        message: 'Scheduler settings updated',
        settings: updatedSettings,
      });
    } catch (error: any) {
      logger.error('Error updating dividend scheduler settings', {
        error: error.message,
        tenantId,
      });
      return res.status(500).json({
        error: 'Failed to update scheduler settings',
        details: error.message,
      });
    }
  }
);

// ============================================================================
// MANUAL TRIGGER
// ============================================================================

/**
 * POST /tenants/:tenantId/dividends/scheduler/trigger
 * Manually trigger dividend calculation (for testing/debugging)
 */
router.post(
  '/tenants/:tenantId/dividends/scheduler/trigger',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    try {
      logger.info('Manual dividend calculation triggered', {
        tenantId,
        triggeredBy: req.user?.userId,
      });

      // Trigger calculation asynchronously
      triggerManualDividendCalculation().catch((error) => {
        logger.error('Manual dividend calculation failed', {
          error: error.message,
          tenantId,
        });
      });

      return res.json({
        success: true,
        message: 'Dividend calculation triggered',
        note: 'Processing in background. Check logs for results.',
      });
    } catch (error: any) {
      logger.error('Error triggering manual dividend calculation', {
        error: error.message,
        tenantId,
      });
      return res.status(500).json({
        error: 'Failed to trigger calculation',
        details: error.message,
      });
    }
  }
);

export default router;
