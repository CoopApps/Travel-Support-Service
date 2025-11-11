import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route POST /api/tenants/:tenantId/suggest-driver
 * @desc Intelligently suggest best driver for a trip
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/suggest-driver',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { customerId, tripDate, pickupTime, requiresWheelchair, passengersCount } = req.body;

    if (!customerId || !tripDate || !pickupTime) {
      return res.status(400).json({ error: 'Customer ID, trip date, and pickup time are required' });
    }

    logger.info('Suggesting driver', { tenantId, customerId, tripDate, pickupTime });

    // Get all active drivers with their vehicles and workload
    const drivers = await query(
      `SELECT
        d.driver_id,
        d.name as driver_name,
        d.phone,
        v.vehicle_id,
        v.registration,
        v.make,
        v.model,
        v.seats,
        v.wheelchair_accessible,
        -- Check if driver has trip at this time (availability)
        (
          SELECT COUNT(*)
          FROM tenant_trips t
          WHERE t.driver_id = d.driver_id
            AND t.tenant_id = d.tenant_id
            AND t.trip_date = $2
            AND t.pickup_time = $3
            AND t.status IN ('scheduled', 'in_progress')
        ) as conflicts,
        -- Count regular customer assignments
        (
          SELECT COUNT(DISTINCT t.trip_id)
          FROM tenant_trips t
          WHERE t.driver_id = d.driver_id
            AND t.tenant_id = d.tenant_id
            AND t.customer_id = $4
            AND t.status = 'completed'
        ) as regular_customer_trips,
        -- Driver workload (trips on this date)
        (
          SELECT COUNT(*)
          FROM tenant_trips t
          WHERE t.driver_id = d.driver_id
            AND t.tenant_id = d.tenant_id
            AND t.trip_date = $2
            AND t.status IN ('scheduled', 'in_progress')
        ) as daily_workload,
        -- Driver completion rate
        COALESCE(
          (SELECT
            ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL /
                   NULLIF(COUNT(*), 0)) * 100, 2)
           FROM tenant_trips t
           WHERE t.driver_id = d.driver_id
             AND t.tenant_id = d.tenant_id
             AND t.trip_date >= CURRENT_DATE - INTERVAL '30 days'
          ), 100.0
        ) as completion_rate
      FROM tenant_drivers d
      LEFT JOIN tenant_vehicles v ON d.current_vehicle_id = v.vehicle_id AND d.tenant_id = v.tenant_id
      WHERE d.tenant_id = $1
        AND d.is_active = true
        AND (v.is_active = true OR v.is_active IS NULL)
      ORDER BY d.name`,
      [tenantId, tripDate, pickupTime, customerId]
    );

    // Score each driver
    const scoredDrivers = drivers.map((driver: any) => {
      let score = 100;
      let reasons: string[] = [];

      // Availability check (critical)
      if (driver.conflicts > 0) {
        score = 0; // Not available = 0 score
        reasons.push('⛔ Not available at this time');
        return {
          ...driver,
          score: 0,
          reasons,
          recommendation: 'unavailable'
        };
      }

      // Vehicle suitability
      if (requiresWheelchair && !driver.wheelchair_accessible) {
        score -= 50;
        reasons.push('❌ No wheelchair access');
      } else if (requiresWheelchair && driver.wheelchair_accessible) {
        score += 15;
        reasons.push('✅ Wheelchair accessible');
      }

      if (passengersCount && driver.seats) {
        if (passengersCount > driver.seats) {
          score -= 40;
          reasons.push(`❌ Insufficient capacity (${driver.seats} seats, need ${passengersCount})`);
        } else if (passengersCount <= driver.seats) {
          score += 10;
          reasons.push(`✅ Suitable capacity (${driver.seats} seats)`);
        }
      }

      // Regular customer preference (strong weight)
      if (driver.regular_customer_trips > 0) {
        score += Math.min(driver.regular_customer_trips * 10, 40);
        reasons.push(`⭐ Regular driver (${driver.regular_customer_trips} previous trips)`);
      }

      // Workload balance
      if (driver.daily_workload === 0) {
        score += 5;
        reasons.push('📅 No trips scheduled yet today');
      } else if (driver.daily_workload < 3) {
        score += 3;
        reasons.push(`📅 Light workload (${driver.daily_workload} trips today)`);
      } else if (driver.daily_workload > 6) {
        score -= 10;
        reasons.push(`📅 Heavy workload (${driver.daily_workload} trips today)`);
      }

      // Performance rating
      if (driver.completion_rate >= 95) {
        score += 10;
        reasons.push(`✨ Excellent performance (${driver.completion_rate}% completion)`);
      } else if (driver.completion_rate < 80) {
        score -= 15;
        reasons.push(`⚠️ Lower completion rate (${driver.completion_rate}%)`);
      }

      // No vehicle assigned
      if (!driver.vehicle_id) {
        score -= 20;
        reasons.push('⚠️ No vehicle assigned');
      }

      // Determine recommendation level
      let recommendation = 'not_recommended';
      if (score >= 80) recommendation = 'highly_recommended';
      else if (score >= 60) recommendation = 'recommended';
      else if (score >= 40) recommendation = 'acceptable';

      return {
        ...driver,
        score: Math.max(score, 0),
        reasons,
        recommendation
      };
    });

    // Sort by score (highest first)
    scoredDrivers.sort((a, b) => b.score - a.score);

    // Get top recommendations
    const topRecommendations = scoredDrivers.filter(d => d.score > 0).slice(0, 5);

    return res.json({
      success: true,
      recommendations: topRecommendations.map(d => ({
        driverId: d.driver_id,
        driverName: d.driver_name,
        phone: d.phone,
        vehicle: d.vehicle_id ? {
          id: d.vehicle_id,
          registration: d.registration,
          make: d.make,
          model: d.model,
          seats: d.seats,
          wheelchairAccessible: d.wheelchair_accessible
        } : null,
        score: d.score,
        reasons: d.reasons,
        recommendation: d.recommendation,
        isRegularDriver: d.regular_customer_trips > 0,
        dailyWorkload: d.daily_workload,
        completionRate: parseFloat(d.completion_rate)
      })),
      totalDriversAnalyzed: scoredDrivers.length,
      availableDrivers: scoredDrivers.filter(d => d.score > 0).length
    });
  })
);

export default router;
