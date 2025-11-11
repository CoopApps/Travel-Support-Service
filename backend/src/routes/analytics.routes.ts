import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { getDbClient } from '../config/database';

const router = Router();

/**
 * GET /api/tenants/:tenantId/analytics/trips-summary
 * Get analytics summary for trips over a date range
 */
router.get(
  '/tenants/:tenantId/analytics/trips-summary',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const client = await getDbClient();

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Overview metrics
      const overviewQuery = `
        SELECT
          COUNT(*) as total_trips,
          COUNT(DISTINCT driver_id) as active_drivers,
          ROUND(
            COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 /
            NULLIF(COUNT(*), 0),
            1
          ) as completion_rate
        FROM tenant_trips
        WHERE tenant_id = $1
          AND trip_date >= $2
          AND trip_date <= $3
      `;

      const overviewResult = await client.query(overviewQuery, [tenantId, startDateStr, endDateStr]);
      const overview = overviewResult.rows[0];

      const avgTripsPerDriver = overview.active_drivers > 0
        ? (overview.total_trips / overview.active_drivers).toFixed(1)
        : '0';

      // Trips by day of week
      const tripsByDayQuery = `
        SELECT
          CASE
            WHEN EXTRACT(DOW FROM trip_date) = 0 THEN 'Sunday'
            WHEN EXTRACT(DOW FROM trip_date) = 1 THEN 'Monday'
            WHEN EXTRACT(DOW FROM trip_date) = 2 THEN 'Tuesday'
            WHEN EXTRACT(DOW FROM trip_date) = 3 THEN 'Wednesday'
            WHEN EXTRACT(DOW FROM trip_date) = 4 THEN 'Thursday'
            WHEN EXTRACT(DOW FROM trip_date) = 5 THEN 'Friday'
            WHEN EXTRACT(DOW FROM trip_date) = 6 THEN 'Saturday'
          END as day,
          EXTRACT(DOW FROM trip_date) as day_num,
          COUNT(*) as count
        FROM tenant_trips
        WHERE tenant_id = $1
          AND trip_date >= $2
          AND trip_date <= $3
        GROUP BY day, day_num
        ORDER BY day_num
      `;

      const tripsByDayResult = await client.query(tripsByDayQuery, [tenantId, startDateStr, endDateStr]);

      // Ensure all days are present
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const tripsByDay = daysOfWeek.map(day => {
        const found = tripsByDayResult.rows.find((r: any) => r.day === day);
        return {
          day,
          count: found ? parseInt(found.count) : 0
        };
      });

      // Trips by status
      const tripsByStatusQuery = `
        SELECT
          COALESCE(status, 'unknown') as status,
          COUNT(*) as count
        FROM tenant_trips
        WHERE tenant_id = $1
          AND trip_date >= $2
          AND trip_date <= $3
        GROUP BY status
        ORDER BY count DESC
      `;

      const tripsByStatusResult = await client.query(tripsByStatusQuery, [tenantId, startDateStr, endDateStr]);

      // Top destinations
      const topDestinationsQuery = `
        SELECT
          destination,
          COUNT(*) as count
        FROM tenant_trips
        WHERE tenant_id = $1
          AND trip_date >= $2
          AND trip_date <= $3
          AND destination IS NOT NULL
          AND destination != ''
        GROUP BY destination
        ORDER BY count DESC
        LIMIT 10
      `;

      const topDestinationsResult = await client.query(topDestinationsQuery, [tenantId, startDateStr, endDateStr]);

      // Driver performance
      const driverPerformanceQuery = `
        SELECT
          d.driver_id,
          CONCAT(d.first_name, ' ', d.last_name) as driver_name,
          COUNT(t.trip_id) as total_trips,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trips,
          ROUND(
            COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0 /
            NULLIF(COUNT(t.trip_id), 0),
            1
          ) as completion_rate
        FROM tenant_drivers d
        LEFT JOIN tenant_trips t ON d.driver_id = t.driver_id
          AND t.trip_date >= $2
          AND t.trip_date <= $3
        WHERE d.tenant_id = $1
          AND d.is_active = true
        GROUP BY d.driver_id, d.first_name, d.last_name
        HAVING COUNT(t.trip_id) > 0
        ORDER BY total_trips DESC
        LIMIT 10
      `;

      const driverPerformanceResult = await client.query(driverPerformanceQuery, [tenantId, startDateStr, endDateStr]);

      client.release();

      return res.json({
        overview: {
          totalTrips: parseInt(overview.total_trips) || 0,
          activeDrivers: parseInt(overview.active_drivers) || 0,
          completionRate: parseFloat(overview.completion_rate) || 0,
          avgTripsPerDriver: parseFloat(avgTripsPerDriver) || 0
        },
        tripsByDay,
        tripsByStatus: tripsByStatusResult.rows.map((r: any) => ({
          status: r.status,
          count: parseInt(r.count)
        })),
        topDestinations: topDestinationsResult.rows.map((r: any) => ({
          destination: r.destination,
          count: parseInt(r.count)
        })),
        driverPerformance: driverPerformanceResult.rows.map((r: any) => ({
          driverId: r.driver_id,
          driverName: r.driver_name,
          totalTrips: parseInt(r.total_trips),
          completedTrips: parseInt(r.completed_trips),
          completionRate: parseFloat(r.completion_rate) || 0
        }))
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      client.release();
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  })
);

export default router;
