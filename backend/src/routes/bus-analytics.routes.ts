/**
 * Bus Analytics API Routes
 *
 * Advanced analytics for Section 22 bus services:
 * - Route profitability analysis
 * - Demand forecasting
 * - Occupancy trends
 * - Revenue analytics
 * - Passenger demographics
 * - Service efficiency metrics
 * - Booking patterns
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/tenants/:tenantId/bus-analytics/overview
 * Get overall analytics overview
 */
router.get('/tenants/:tenantId/bus-analytics/overview', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { period = '30' } = req.query; // days

    const client = await pool.connect();
    try {
      // Revenue analytics
      const revenueData = await client.query(
        `SELECT
          COUNT(*) as total_bookings,
          COALESCE(SUM(fare_amount), 0) as total_revenue,
          COALESCE(AVG(fare_amount), 0) as average_fare,
          COUNT(DISTINCT timetable_id) as services_booked
        FROM bus_bookings
        WHERE tenant_id = $1
        AND service_date >= CURRENT_DATE - INTERVAL '${period} days'
        AND booking_status NOT IN ('cancelled', 'no_show')`,
        [tenantId]
      );

      // Occupancy metrics
      const occupancyData = await client.query(
        `SELECT
          AVG(occupancy_rate) as avg_occupancy,
          MAX(occupancy_rate) as peak_occupancy,
          MIN(occupancy_rate) as lowest_occupancy
        FROM (
          SELECT
            t.timetable_id,
            (COUNT(b.booking_id)::DECIMAL / NULLIF(t.vehicle_capacity, 0) * 100) as occupancy_rate
          FROM bus_timetables t
          LEFT JOIN bus_bookings b ON t.timetable_id = b.timetable_id
            AND b.booking_status NOT IN ('cancelled', 'no_show')
          WHERE t.tenant_id = $1
          AND t.service_date >= CURRENT_DATE - INTERVAL '${period} days'
          GROUP BY t.timetable_id, t.vehicle_capacity
        ) occupancy_stats`,
        [tenantId]
      );

      // Route performance
      const routeData = await client.query(
        `SELECT
          r.route_id,
          r.route_name,
          COUNT(DISTINCT t.timetable_id) as services_count,
          COUNT(b.booking_id) as total_bookings,
          COALESCE(SUM(b.fare_amount), 0) as revenue
        FROM bus_routes r
        LEFT JOIN bus_timetables t ON r.route_id = t.route_id
          AND t.service_date >= CURRENT_DATE - INTERVAL '${period} days'
        LEFT JOIN bus_bookings b ON t.timetable_id = b.timetable_id
          AND b.booking_status NOT IN ('cancelled', 'no_show')
        WHERE r.tenant_id = $1
        GROUP BY r.route_id, r.route_name
        ORDER BY revenue DESC
        LIMIT 5`,
        [tenantId]
      );

      res.json({
        period_days: parseInt(period as string),
        revenue: {
          total_revenue: parseFloat(revenueData.rows[0].total_revenue).toFixed(2),
          total_bookings: parseInt(revenueData.rows[0].total_bookings),
          average_fare: parseFloat(revenueData.rows[0].average_fare).toFixed(2),
          services_booked: parseInt(revenueData.rows[0].services_booked)
        },
        occupancy: {
          average: parseFloat(occupancyData.rows[0].avg_occupancy || 0).toFixed(1),
          peak: parseFloat(occupancyData.rows[0].peak_occupancy || 0).toFixed(1),
          lowest: parseFloat(occupancyData.rows[0].lowest_occupancy || 0).toFixed(1)
        },
        top_routes: routeData.rows.map((r: any) => ({
          route_id: r.route_id,
          route_name: r.route_name,
          services_count: parseInt(r.services_count),
          bookings: parseInt(r.total_bookings),
          revenue: parseFloat(r.revenue).toFixed(2)
        }))
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching analytics overview', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch analytics',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/tenants/:tenantId/bus-analytics/route-profitability
 * Get route profitability analysis
 */
router.get('/tenants/:tenantId/bus-analytics/route-profitability', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
          r.route_id,
          r.route_name,
          r.distance_miles,
          COUNT(DISTINCT t.timetable_id) as total_services,
          COUNT(b.booking_id) as total_bookings,
          COALESCE(SUM(b.fare_amount), 0) as total_revenue,
          COALESCE(AVG(b.fare_amount), 0) as average_fare,
          (COUNT(b.booking_id)::DECIMAL / NULLIF(COUNT(DISTINCT t.timetable_id), 0)) as avg_bookings_per_service,
          (COALESCE(SUM(b.fare_amount), 0) / NULLIF(COUNT(DISTINCT t.timetable_id), 0)) as revenue_per_service,
          (COUNT(b.booking_id)::DECIMAL / NULLIF(
            SUM(CASE WHEN t.vehicle_capacity IS NOT NULL THEN t.vehicle_capacity ELSE 0 END), 0
          ) * 100) as overall_occupancy_rate
        FROM bus_routes r
        LEFT JOIN bus_timetables t ON r.route_id = t.route_id
          AND t.service_date >= CURRENT_DATE - INTERVAL '30 days'
        LEFT JOIN bus_bookings b ON t.timetable_id = b.timetable_id
          AND b.booking_status NOT IN ('cancelled', 'no_show')
        WHERE r.tenant_id = $1 AND r.status = 'active'
        GROUP BY r.route_id, r.route_name, r.distance_miles
        ORDER BY total_revenue DESC`,
        [tenantId]
      );

      const routes = result.rows.map((r: any) => {
        const totalRevenue = parseFloat(r.total_revenue);
        const totalServices = parseInt(r.total_services);
        const totalBookings = parseInt(r.total_bookings);
        const distanceMiles = parseFloat(r.distance_miles) || 0;

        // Estimate costs (simplified)
        const estimatedCostPerService = distanceMiles * 2.5; // £2.50 per mile (fuel + depreciation)
        const totalCosts = totalServices * estimatedCostPerService;
        const profit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        return {
          route_id: r.route_id,
          route_name: r.route_name,
          distance_miles: distanceMiles,
          total_services: totalServices,
          total_bookings: totalBookings,
          total_revenue: totalRevenue.toFixed(2),
          average_fare: parseFloat(r.average_fare).toFixed(2),
          avg_bookings_per_service: parseFloat(r.avg_bookings_per_service || 0).toFixed(1),
          revenue_per_service: parseFloat(r.revenue_per_service || 0).toFixed(2),
          occupancy_rate: parseFloat(r.overall_occupancy_rate || 0).toFixed(1),
          estimated_costs: totalCosts.toFixed(2),
          estimated_profit: profit.toFixed(2),
          profit_margin: profitMargin.toFixed(1),
          profitability: profit > 0 ? 'profitable' : profit < 0 ? 'loss' : 'break_even'
        };
      });

      res.json({ routes });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching route profitability', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch route profitability',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/tenants/:tenantId/bus-analytics/demand-forecast
 * Get demand forecasting data
 */
router.get('/tenants/:tenantId/bus-analytics/demand-forecast', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const client = await pool.connect();
    try {
      // Daily demand pattern
      const dailyPattern = await client.query(
        `SELECT
          EXTRACT(DOW FROM service_date) as day_of_week,
          TO_CHAR(service_date, 'Day') as day_name,
          COUNT(b.booking_id) as bookings,
          COALESCE(AVG(b.fare_amount), 0) as avg_fare
        FROM bus_timetables t
        LEFT JOIN bus_bookings b ON t.timetable_id = b.timetable_id
          AND b.booking_status NOT IN ('cancelled', 'no_show')
        WHERE t.tenant_id = $1
        AND t.service_date >= CURRENT_DATE - INTERVAL '60 days'
        GROUP BY EXTRACT(DOW FROM service_date), TO_CHAR(service_date, 'Day')
        ORDER BY EXTRACT(DOW FROM service_date)`,
        [tenantId]
      );

      // Hourly demand pattern
      const hourlyPattern = await client.query(
        `SELECT
          EXTRACT(HOUR FROM CAST(t.departure_time AS TIME)) as hour,
          COUNT(b.booking_id) as bookings,
          COALESCE(AVG(b.fare_amount), 0) as avg_fare
        FROM bus_timetables t
        LEFT JOIN bus_bookings b ON t.timetable_id = b.timetable_id
          AND b.booking_status NOT IN ('cancelled', 'no_show')
        WHERE t.tenant_id = $1
        AND t.service_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM CAST(t.departure_time AS TIME))
        ORDER BY hour`,
        [tenantId]
      );

      // Weekly trend
      const weeklyTrend = await client.query(
        `SELECT
          DATE_TRUNC('week', service_date) as week_start,
          COUNT(b.booking_id) as bookings,
          COALESCE(SUM(b.fare_amount), 0) as revenue
        FROM bus_timetables t
        LEFT JOIN bus_bookings b ON t.timetable_id = b.timetable_id
          AND b.booking_status NOT IN ('cancelled', 'no_show')
        WHERE t.tenant_id = $1
        AND t.service_date >= CURRENT_DATE - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', service_date)
        ORDER BY week_start`,
        [tenantId]
      );

      res.json({
        daily_pattern: dailyPattern.rows.map((d: any) => ({
          day_of_week: parseInt(d.day_of_week),
          day_name: d.day_name.trim(),
          bookings: parseInt(d.bookings),
          avg_fare: parseFloat(d.avg_fare).toFixed(2)
        })),
        hourly_pattern: hourlyPattern.rows.map((h: any) => ({
          hour: parseInt(h.hour),
          bookings: parseInt(h.bookings),
          avg_fare: parseFloat(h.avg_fare).toFixed(2)
        })),
        weekly_trend: weeklyTrend.rows.map((w: any) => ({
          week_start: w.week_start,
          bookings: parseInt(w.bookings),
          revenue: parseFloat(w.revenue).toFixed(2)
        }))
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching demand forecast', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch demand forecast',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/tenants/:tenantId/bus-analytics/passenger-demographics
 * Get passenger demographics and booking patterns
 */
router.get('/tenants/:tenantId/bus-analytics/passenger-demographics', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const client = await pool.connect();
    try {
      // Passenger tier distribution
      const tierDistribution = await client.query(
        `SELECT
          passenger_tier,
          COUNT(*) as count,
          COALESCE(SUM(fare_amount), 0) as total_revenue,
          COALESCE(AVG(fare_amount), 0) as avg_fare
        FROM bus_bookings
        WHERE tenant_id = $1
        AND service_date >= CURRENT_DATE - INTERVAL '30 days'
        AND booking_status NOT IN ('cancelled', 'no_show')
        GROUP BY passenger_tier
        ORDER BY count DESC`,
        [tenantId]
      );

      // Booking lead time analysis
      const leadTimeAnalysis = await client.query(
        `SELECT
          CASE
            WHEN booking_lead_days <= 1 THEN 'Same day'
            WHEN booking_lead_days <= 3 THEN '2-3 days'
            WHEN booking_lead_days <= 7 THEN '4-7 days'
            WHEN booking_lead_days <= 14 THEN '1-2 weeks'
            ELSE '2+ weeks'
          END as lead_time_category,
          COUNT(*) as bookings,
          COALESCE(AVG(fare_amount), 0) as avg_fare
        FROM (
          SELECT
            booking_id,
            fare_amount,
            EXTRACT(DAY FROM (service_date - created_at)) as booking_lead_days
          FROM bus_bookings
          WHERE tenant_id = $1
          AND service_date >= CURRENT_DATE - INTERVAL '60 days'
          AND booking_status NOT IN ('cancelled', 'no_show')
        ) lead_times
        GROUP BY lead_time_category
        ORDER BY
          CASE lead_time_category
            WHEN 'Same day' THEN 1
            WHEN '2-3 days' THEN 2
            WHEN '4-7 days' THEN 3
            WHEN '1-2 weeks' THEN 4
            ELSE 5
          END`,
        [tenantId]
      );

      // Repeat passengers
      const repeatPassengers = await client.query(
        `SELECT
          passenger_email,
          COUNT(*) as booking_count,
          COALESCE(SUM(fare_amount), 0) as total_spent,
          MIN(service_date) as first_booking,
          MAX(service_date) as last_booking
        FROM bus_bookings
        WHERE tenant_id = $1
        AND booking_status NOT IN ('cancelled', 'no_show')
        GROUP BY passenger_email
        HAVING COUNT(*) > 1
        ORDER BY booking_count DESC
        LIMIT 20`,
        [tenantId]
      );

      res.json({
        tier_distribution: tierDistribution.rows.map((t: any) => ({
          tier: t.passenger_tier,
          count: parseInt(t.count),
          revenue: parseFloat(t.total_revenue).toFixed(2),
          avg_fare: parseFloat(t.avg_fare).toFixed(2),
          percentage: 0 // Calculated on frontend
        })),
        booking_lead_time: leadTimeAnalysis.rows.map((l: any) => ({
          category: l.lead_time_category,
          bookings: parseInt(l.bookings),
          avg_fare: parseFloat(l.avg_fare).toFixed(2)
        })),
        top_repeat_passengers: repeatPassengers.rows.map((p: any) => ({
          email: p.passenger_email,
          bookings: parseInt(p.booking_count),
          total_spent: parseFloat(p.total_spent).toFixed(2),
          first_booking: p.first_booking,
          last_booking: p.last_booking
        }))
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching passenger demographics', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch demographics',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/tenants/:tenantId/bus-analytics/efficiency-metrics
 * Get service efficiency metrics
 */
router.get('/tenants/:tenantId/bus-analytics/efficiency-metrics', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const client = await pool.connect();
    try {
      const metrics = await client.query(
        `SELECT
          COUNT(DISTINCT t.timetable_id) as total_services,
          COUNT(b.booking_id) as total_bookings,
          COALESCE(SUM(b.fare_amount), 0) as total_revenue,
          COALESCE(AVG(t.vehicle_capacity), 0) as avg_capacity,
          (COUNT(b.booking_id)::DECIMAL / NULLIF(COUNT(DISTINCT t.timetable_id), 0)) as bookings_per_service,
          (COALESCE(SUM(b.fare_amount), 0) / NULLIF(COUNT(b.booking_id), 0)) as revenue_per_booking,
          COUNT(b.booking_id) FILTER (WHERE b.booking_status = 'no_show') as no_shows,
          COUNT(b.booking_id) FILTER (WHERE b.booking_status = 'cancelled') as cancellations
        FROM bus_timetables t
        LEFT JOIN bus_bookings b ON t.timetable_id = b.timetable_id
        WHERE t.tenant_id = $1
        AND t.service_date >= CURRENT_DATE - INTERVAL '30 days'`,
        [tenantId]
      );

      const m = metrics.rows[0];
      const totalBookings = parseInt(m.total_bookings) || 0;
      const noShows = parseInt(m.no_shows) || 0;
      const cancellations = parseInt(m.cancellations) || 0;

      res.json({
        total_services: parseInt(m.total_services),
        total_bookings: totalBookings,
        total_revenue: parseFloat(m.total_revenue).toFixed(2),
        avg_capacity: parseFloat(m.avg_capacity).toFixed(1),
        bookings_per_service: parseFloat(m.bookings_per_service || 0).toFixed(1),
        revenue_per_booking: parseFloat(m.revenue_per_booking || 0).toFixed(2),
        no_show_rate: totalBookings > 0 ? ((noShows / totalBookings) * 100).toFixed(1) : '0.0',
        cancellation_rate: totalBookings > 0 ? ((cancellations / totalBookings) * 100).toFixed(1) : '0.0',
        completion_rate: totalBookings > 0 ? (((totalBookings - noShows - cancellations) / totalBookings) * 100).toFixed(1) : '0.0'
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching efficiency metrics', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch efficiency metrics',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
