/**
 * AI Status Routes
 *
 * Admin-only endpoints to view AI feature status, configuration, and budget
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import {
  getAIConfig,
  getAIFeaturesSummary,
  getAIBudgetStatus,
  checkAIServicesHealth,
  reloadAIConfig
} from '../config/ai.config';
import { logger } from '../utils/logger';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    tenantId: number;
    role: string;
  };
}

/**
 * @route GET /api/tenants/:tenantId/ai/status
 * @desc Get AI features status and configuration
 * @access Protected (Admin only)
 */
router.get(
  '/tenants/:tenantId/ai/status',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Check if user is admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    logger.info('AI status check requested', {
      tenantId,
      userId: req.user?.userId
    });

    const summary = getAIFeaturesSummary();
    const budget = getAIBudgetStatus();
    const health = await checkAIServicesHealth();

    return res.json({
      status: 'success',
      data: {
        ...summary,
        services: health,
        budget: {
          ...budget,
          warning: budget.percentUsed >= 80
            ? 'Approaching daily budget limit'
            : null,
          critical: budget.budgetExceeded
            ? 'Daily budget exceeded - AI features disabled'
            : null
        }
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/ai/config
 * @desc Get detailed AI configuration
 * @access Protected (Admin only)
 */
router.get(
  '/tenants/:tenantId/ai/config',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check if user is admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const config = getAIConfig();

    // Don't expose sensitive API keys
    const sanitizedConfig = {
      ...config,
      services: {
        pythonAIServiceUrl: config.services.pythonAIServiceUrl
          ? 'configured'
          : 'not configured',
        openAIApiKey: config.services.openAIApiKey
          ? 'configured'
          : 'not configured',
        googleMapsApiKey: config.services.googleMapsApiKey
          ? 'configured'
          : 'not configured'
      }
    };

    return res.json({
      status: 'success',
      data: sanitizedConfig
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/ai/budget
 * @desc Get current AI budget status
 * @access Protected (Admin only)
 */
router.get(
  '/tenants/:tenantId/ai/budget',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check if user is admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const budget = getAIBudgetStatus();

    return res.json({
      status: 'success',
      data: {
        budget,
        alerts: {
          warning: budget.percentUsed >= 80,
          critical: budget.budgetExceeded
        },
        recommendations: budget.percentUsed >= 90
          ? ['Consider increasing daily budget', 'Review AI feature usage']
          : budget.budgetExceeded
          ? ['Daily budget exceeded', 'AI features temporarily disabled', 'Will reset tomorrow']
          : []
      }
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/ai/reload-config
 * @desc Reload AI configuration from environment variables
 * @access Protected (Admin only)
 */
router.post(
  '/tenants/:tenantId/ai/reload-config',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Check if user is admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    logger.info('AI config reload requested', {
      tenantId,
      userId: req.user?.userId
    });

    const newConfig = reloadAIConfig();

    return res.json({
      status: 'success',
      message: 'AI configuration reloaded',
      data: {
        globalEnabled: newConfig.globalEnabled,
        featuresEnabled: Object.entries(newConfig.features)
          .filter(([_, config]) => config.enabled)
          .map(([name]) => name)
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/ai/health
 * @desc Check health status of AI services
 * @access Protected (Admin only)
 */
router.get(
  '/tenants/:tenantId/ai/health',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check if user is admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const health = await checkAIServicesHealth();
    const config = getAIConfig();

    const overallHealth = {
      status: config.globalEnabled ? 'enabled' : 'disabled',
      services: health,
      issues: [] as string[]
    };

    // Check for configuration issues
    if (config.globalEnabled) {
      if (config.features.demandForecasting.enabled && !config.services.pythonAIServiceUrl) {
        overallHealth.issues.push('Demand forecasting enabled but AI service URL not configured');
      }
      if (config.features.predictiveMaintenance.enabled && !config.services.pythonAIServiceUrl) {
        overallHealth.issues.push('Predictive maintenance enabled but AI service URL not configured');
      }
    }

    return res.json({
      status: 'success',
      data: overallHealth
    });
  })
);

export default router;
