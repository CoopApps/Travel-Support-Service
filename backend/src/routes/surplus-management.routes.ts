/**
 * Surplus Management Routes
 *
 * API endpoints for cooperative surplus pooling and smoothing:
 * - View route surplus pools
 * - Calculate available subsidies
 * - View transaction history
 * - View surplus statistics
 */

import { Router, Request, Response } from 'express';
import {
  initializeSurplusPool,
  getSurplusPool,
  calculateAvailableSubsidy,
  applySubsidy,
  allocateSurplus,
  getSurplusTransactions,
  getSurplusStatistics
} from '../services/surplusManagement.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// SURPLUS POOL ENDPOINTS
// ============================================================================

/**
 * GET /api/tenants/:tenantId/routes/:routeId/surplus-pool
 * Get current surplus pool state for a route
 */
router.get('/tenants/:tenantId/routes/:routeId/surplus-pool', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;

    const pool = await getSurplusPool(parseInt(routeId));

    if (!pool) {
      return res.status(404).json({
        error: 'Surplus pool not found',
        message: 'No surplus pool exists for this route yet. Pool will be created when first surplus is generated.'
      });
    }

    return res.json(pool);
  } catch (error: any) {
    logger.error('Error fetching surplus pool', { error: error.message, routeId: req.params.routeId });
    return res.status(500).json({ error: 'Failed to fetch surplus pool', details: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/routes/:routeId/surplus-pool/initialize
 * Initialize surplus pool for a route (if doesn't exist)
 */
router.post('/tenants/:tenantId/routes/:routeId/surplus-pool/initialize', async (req: Request, res: Response) => {
  try {
    const { tenantId, routeId } = req.params;

    const pool = await initializeSurplusPool(parseInt(routeId), parseInt(tenantId));

    return res.json({
      success: true,
      message: 'Surplus pool initialized successfully',
      pool
    });
  } catch (error: any) {
    logger.error('Error initializing surplus pool', { error: error.message, routeId: req.params.routeId });
    return res.status(500).json({ error: 'Failed to initialize surplus pool', details: error.message });
  }
});

// ============================================================================
// SUBSIDY CALCULATION ENDPOINTS
// ============================================================================

/**
 * POST /api/tenants/:tenantId/routes/:routeId/calculate-subsidy
 * Calculate available subsidy for a service
 *
 * Body: {
 *   service_cost: number,
 *   max_surplus_percent?: number,
 *   max_service_percent?: number
 * }
 */
router.post('/tenants/:tenantId/routes/:routeId/calculate-subsidy', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    const { service_cost, max_surplus_percent, max_service_percent } = req.body;

    if (!service_cost || service_cost <= 0) {
      return res.status(400).json({ error: 'Valid service_cost is required' });
    }

    const subsidyCalc = await calculateAvailableSubsidy(
      parseInt(routeId),
      parseFloat(service_cost),
      max_surplus_percent,
      max_service_percent
    );

    return res.json(subsidyCalc);
  } catch (error: any) {
    logger.error('Error calculating subsidy', { error: error.message, routeId: req.params.routeId });
    return res.status(500).json({ error: 'Failed to calculate subsidy', details: error.message });
  }
});

/**
 * POST /api/tenants/:tenantId/routes/:routeId/apply-subsidy
 * Apply subsidy to a service (internal use - typically called by booking system)
 *
 * Body: {
 *   timetable_id: number,
 *   service_date: string,
 *   cost_id: number,
 *   subsidy_amount: number,
 *   passenger_count: number,
 *   service_cost: number
 * }
 */
router.post('/tenants/:tenantId/routes/:routeId/apply-subsidy', async (req: Request, res: Response) => {
  try {
    const { tenantId, routeId } = req.params;
    const {
      timetable_id,
      service_date,
      cost_id,
      subsidy_amount,
      passenger_count,
      service_cost
    } = req.body;

    // Validation
    if (!timetable_id || !service_date || !cost_id || !subsidy_amount || !passenger_count || !service_cost) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['timetable_id', 'service_date', 'cost_id', 'subsidy_amount', 'passenger_count', 'service_cost']
      });
    }

    const result = await applySubsidy(
      parseInt(routeId),
      parseInt(tenantId),
      timetable_id,
      service_date,
      cost_id,
      parseFloat(subsidy_amount),
      passenger_count,
      parseFloat(service_cost)
    );

    return res.json({
      success: result.success,
      message: 'Subsidy applied successfully',
      transaction_id: result.transaction_id
    });
  } catch (error: any) {
    logger.error('Error applying subsidy', { error: error.message, routeId: req.params.routeId });
    return res.status(500).json({ error: 'Failed to apply subsidy', details: error.message });
  }
});

// ============================================================================
// SURPLUS ALLOCATION ENDPOINTS
// ============================================================================

/**
 * POST /api/tenants/:tenantId/routes/:routeId/allocate-surplus
 * Allocate surplus from a profitable service
 * (internal use - typically called by service completion/cost finalization)
 *
 * Body: {
 *   timetable_id: number,
 *   service_date: string,
 *   cost_id: number,
 *   gross_surplus: number,
 *   reserves_percent?: number,
 *   business_percent?: number,
 *   dividend_percent?: number
 * }
 */
router.post('/tenants/:tenantId/routes/:routeId/allocate-surplus', async (req: Request, res: Response) => {
  try {
    const { tenantId, routeId } = req.params;
    const {
      timetable_id,
      service_date,
      cost_id,
      gross_surplus,
      reserves_percent,
      business_percent,
      dividend_percent
    } = req.body;

    // Validation
    if (!timetable_id || !service_date || !cost_id || !gross_surplus) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['timetable_id', 'service_date', 'cost_id', 'gross_surplus']
      });
    }

    if (gross_surplus <= 0) {
      return res.status(400).json({ error: 'gross_surplus must be positive' });
    }

    const result = await allocateSurplus(
      parseInt(routeId),
      parseInt(tenantId),
      timetable_id,
      service_date,
      cost_id,
      parseFloat(gross_surplus),
      reserves_percent,
      business_percent,
      dividend_percent
    );

    return res.json({
      success: true,
      message: 'Surplus allocated successfully',
      allocation: result
    });
  } catch (error: any) {
    logger.error('Error allocating surplus', { error: error.message, routeId: req.params.routeId });
    return res.status(500).json({ error: 'Failed to allocate surplus', details: error.message });
  }
});

// ============================================================================
// REPORTING/TRANSPARENCY ENDPOINTS
// ============================================================================

/**
 * GET /api/tenants/:tenantId/routes/:routeId/surplus-transactions
 * Get surplus transaction history for transparency
 *
 * Query params:
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
router.get('/tenants/:tenantId/routes/:routeId/surplus-transactions', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await getSurplusTransactions(parseInt(routeId), limit, offset);

    return res.json({
      transactions,
      pagination: {
        limit,
        offset,
        count: transactions.length
      }
    });
  } catch (error: any) {
    logger.error('Error fetching surplus transactions', { error: error.message, routeId: req.params.routeId });
    return res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
});

/**
 * GET /api/tenants/:tenantId/routes/:routeId/surplus-statistics
 * Get comprehensive surplus statistics for a route
 */
router.get('/tenants/:tenantId/routes/:routeId/surplus-statistics', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;

    const stats = await getSurplusStatistics(parseInt(routeId));

    if (!stats) {
      return res.status(404).json({
        error: 'No statistics available',
        message: 'No surplus pool exists for this route yet'
      });
    }

    return res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching surplus statistics', { error: error.message, routeId: req.params.routeId });
    return res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
});

// ============================================================================
// BULK/SUMMARY ENDPOINTS
// ============================================================================

/**
 * GET /api/tenants/:tenantId/surplus-summary
 * Get summary of all route surplus pools for a tenant
 */
router.get('/tenants/:tenantId/surplus-summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // This would require a new service function - placeholder for now
    // const summary = await getSurplusSummaryForTenant(parseInt(tenantId));

    return res.json({
      message: 'Summary endpoint - to be implemented',
      tenant_id: tenantId
    });
  } catch (error: any) {
    logger.error('Error fetching surplus summary', { error: error.message, tenantId: req.params.tenantId });
    return res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
});

export default router;
