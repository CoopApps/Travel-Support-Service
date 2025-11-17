/**
 * Driver Rostering Routes
 *
 * API endpoints for advanced driver roster management
 */

import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { driverRosteringService } from '../services/driverRostering.service';
import { query } from '../config/database';

const router = Router();

/**
 * GET /api/tenants/:tenantId/roster/availability/:driverId
 * Check driver availability for a specific date/time
 */
router.get(
  '/tenants/:tenantId/roster/availability/:driverId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { date, startTime, durationMinutes = 60 } = req.query;

    if (!date || !startTime) {
      return res.status(400).json({ error: 'date and startTime are required' });
    }

    const result = await driverRosteringService.checkDriverAvailability(
      parseInt(tenantId),
      parseInt(driverId),
      date as string,
      startTime as string,
      parseInt(durationMinutes as string)
    );

    return res.json(result);
  })
);

/**
 * GET /api/tenants/:tenantId/roster/conflicts
 * Detect all roster conflicts in a date range
 */
router.get(
  '/tenants/:tenantId/roster/conflicts',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const conflicts = await driverRosteringService.detectRosterConflicts(
      parseInt(tenantId),
      startDate as string,
      endDate as string
    );

    return res.json({
      conflicts,
      summary: {
        total: conflicts.length,
        critical: conflicts.filter(c => c.severity === 'critical').length,
        warnings: conflicts.filter(c => c.severity === 'warning').length,
        info: conflicts.filter(c => c.severity === 'info').length
      }
    });
  })
);

/**
 * POST /api/tenants/:tenantId/roster/auto-assign
 * Automatically assign drivers to unassigned trips
 */
router.post(
  '/tenants/:tenantId/roster/auto-assign',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { date, balanceWorkload = true, considerProximity = false, maxAssignments = 100, applyChanges = false } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const result = await driverRosteringService.autoAssignDrivers(
      parseInt(tenantId),
      date,
      { balanceWorkload, considerProximity, maxAssignments }
    );

    // If applyChanges is true, actually update the database
    if (applyChanges && result.assignments.length > 0) {
      for (const assignment of result.assignments) {
        await query(
          `UPDATE tenant_trips
           SET driver_id = $1
           WHERE trip_id = $2 AND tenant_id = $3`,
          [assignment.driver_id, assignment.trip_id, tenantId]
        );
      }
    }

    return res.json({
      success: true,
      assigned: result.assignments.length,
      unassigned: result.unassigned.length,
      assignments: result.assignments,
      unassignedTripIds: result.unassigned,
      applied: applyChanges
    });
  })
);

/**
 * GET /api/tenants/:tenantId/roster/workload
 * Get workload metrics for all drivers
 */
router.get(
  '/tenants/:tenantId/roster/workload',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const metrics = await driverRosteringService.calculateWorkloadMetrics(
      parseInt(tenantId),
      startDate as string,
      endDate as string
    );

    // Calculate summary statistics
    const totalHours = metrics.reduce((sum, m) => sum + m.total_hours, 0);
    const avgUtilization = metrics.reduce((sum, m) => sum + m.utilization_percentage, 0) / metrics.length;
    const underutilized = metrics.filter(m => m.utilization_percentage < 50).length;
    const overutilized = metrics.filter(m => m.utilization_percentage > 90).length;

    return res.json({
      metrics,
      summary: {
        totalDrivers: metrics.length,
        totalHours: parseFloat(totalHours.toFixed(2)),
        averageUtilization: parseFloat(avgUtilization.toFixed(1)),
        underutilized,
        overutilized,
        balanced: metrics.length - underutilized - overutilized
      }
    });
  })
);

/**
 * GET /api/tenants/:tenantId/roster/dashboard
 * Get comprehensive roster dashboard data
 */
router.get(
  '/tenants/:tenantId/roster/dashboard',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Get workload metrics
    const workloadMetrics = await driverRosteringService.calculateWorkloadMetrics(
      parseInt(tenantId),
      startDate as string,
      endDate as string
    );

    // Get conflicts
    const conflicts = await driverRosteringService.detectRosterConflicts(
      parseInt(tenantId),
      startDate as string,
      endDate as string
    );

    // Get unassigned trips count
    const unassignedResult = await query(
      `SELECT COUNT(*) as count
       FROM tenant_trips
       WHERE tenant_id = $1
         AND trip_date >= $2
         AND trip_date <= $3
         AND driver_id IS NULL
         AND status != 'cancelled'`,
      [tenantId, startDate, endDate]
    );

    const unassignedCount = parseInt(unassignedResult[0]?.count || '0');

    return res.json({
      workload: {
        metrics: workloadMetrics,
        summary: {
          totalDrivers: workloadMetrics.length,
          averageUtilization: workloadMetrics.reduce((sum, m) => sum + m.utilization_percentage, 0) / workloadMetrics.length,
          underutilized: workloadMetrics.filter(m => m.utilization_percentage < 50).length,
          overutilized: workloadMetrics.filter(m => m.utilization_percentage > 90).length
        }
      },
      conflicts: {
        items: conflicts,
        summary: {
          total: conflicts.length,
          critical: conflicts.filter(c => c.severity === 'critical').length,
          warnings: conflicts.filter(c => c.severity === 'warning').length
        }
      },
      unassignedTrips: unassignedCount
    });
  })
);

export default router;
