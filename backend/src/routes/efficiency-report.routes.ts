import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route GET /api/tenants/:tenantId/efficiency-report
 * @desc Generate comprehensive schedule efficiency report
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/efficiency-report',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    logger.info('Generating efficiency report', { tenantId, startDate, endDate });

    // 1. Vehicle Utilization Metrics
    const vehicleUtilization = await query(
      `SELECT
        v.vehicle_id,
        v.registration,
        v.make,
        v.model,
        v.seats as capacity,
        COUNT(DISTINCT t.trip_id) as total_trips,
        COUNT(DISTINCT t.trip_date) as days_used,
        COALESCE(AVG(
          (SELECT COUNT(DISTINCT t2.customer_id)
           FROM tenant_trips t2
           WHERE t2.tenant_id = t.tenant_id
             AND t2.vehicle_id = t.vehicle_id
             AND t2.driver_id = t.driver_id
             AND t2.pickup_time = t.pickup_time
             AND t2.destination = t.destination
             AND t2.trip_date = t.trip_date
             AND t2.status IN ('completed', 'in_progress'))
        ), 1) as avg_passengers,
        v.seats as vehicle_capacity,
        ROUND(
          (COALESCE(AVG(
            (SELECT COUNT(DISTINCT t2.customer_id)
             FROM tenant_trips t2
             WHERE t2.tenant_id = t.tenant_id
               AND t2.vehicle_id = t.vehicle_id
               AND t2.driver_id = t.driver_id
               AND t2.pickup_time = t.pickup_time
               AND t2.destination = t.destination
               AND t2.trip_date = t.trip_date
               AND t2.status IN ('completed', 'in_progress'))
          ), 1) / NULLIF(v.seats, 0)) * 100, 2
        ) as utilization_percentage,
        SUM(COALESCE(t.price, 0)) as total_revenue
      FROM tenant_vehicles v
      LEFT JOIN tenant_trips t ON v.vehicle_id = t.vehicle_id AND v.tenant_id = t.tenant_id
        AND t.trip_date BETWEEN $2 AND $3
        AND t.status IN ('completed', 'in_progress', 'scheduled')
      WHERE v.tenant_id = $1
        AND v.is_active = true
      GROUP BY v.vehicle_id, v.registration, v.make, v.model, v.seats
      ORDER BY utilization_percentage DESC`,
      [tenantId, startDate, endDate]
    );

    // 2. Driver Productivity Metrics
    const driverProductivity = await query(
      `SELECT
        d.driver_id,
        d.name as driver_name,
        COUNT(DISTINCT t.trip_id) as total_trips,
        COUNT(DISTINCT t.trip_date) as days_worked,
        ROUND(COUNT(DISTINCT t.trip_id)::DECIMAL / NULLIF(COUNT(DISTINCT t.trip_date), 0), 2) as avg_trips_per_day,
        SUM(COALESCE(t.price, 0)) as total_revenue,
        ROUND(SUM(COALESCE(t.price, 0)) / NULLIF(COUNT(DISTINCT t.trip_id), 0), 2) as revenue_per_trip,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN t.status = 'no_show' THEN 1 END) as no_show_trips,
        COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelled_trips,
        ROUND(
          (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::DECIMAL /
           NULLIF(COUNT(DISTINCT t.trip_id), 0)) * 100, 2
        ) as completion_rate
      FROM tenant_drivers d
      LEFT JOIN tenant_trips t ON d.driver_id = t.driver_id AND d.tenant_id = t.tenant_id
        AND t.trip_date BETWEEN $2 AND $3
      WHERE d.tenant_id = $1
        AND d.is_active = true
      GROUP BY d.driver_id, d.name
      HAVING COUNT(DISTINCT t.trip_id) > 0
      ORDER BY total_trips DESC`,
      [tenantId, startDate, endDate]
    );

    // 3. Empty Seat Analysis (Missed Revenue)
    const emptySeatAnalysis = await query(
      `SELECT
        DATE(t.trip_date) as date,
        COUNT(DISTINCT CONCAT(t.driver_id, '_', t.vehicle_id, '_', t.pickup_time, '_', t.destination)) as unique_trips,
        SUM(v.seats - (
          SELECT COUNT(DISTINCT t2.customer_id)
          FROM tenant_trips t2
          WHERE t2.tenant_id = t.tenant_id
            AND t2.driver_id = t.driver_id
            AND t2.vehicle_id = t.vehicle_id
            AND t2.pickup_time = t.pickup_time
            AND t2.destination = t.destination
            AND t2.trip_date = t.trip_date
            AND t2.status IN ('completed', 'in_progress', 'scheduled')
        )) as total_empty_seats,
        ROUND(AVG(t.price), 2) as avg_trip_price,
        ROUND(SUM(v.seats - (
          SELECT COUNT(DISTINCT t2.customer_id)
          FROM tenant_trips t2
          WHERE t2.tenant_id = t.tenant_id
            AND t2.driver_id = t.driver_id
            AND t2.vehicle_id = t.vehicle_id
            AND t2.pickup_time = t.pickup_time
            AND t2.destination = t.destination
            AND t2.trip_date = t.trip_date
            AND t2.status IN ('completed', 'in_progress', 'scheduled')
        )) * AVG(t.price), 2) as missed_revenue
      FROM tenant_trips t
      JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      WHERE t.tenant_id = $1
        AND t.trip_date BETWEEN $2 AND $3
        AND t.status IN ('completed', 'in_progress', 'scheduled')
        AND v.seats >= 4
      GROUP BY DATE(t.trip_date)
      ORDER BY date DESC`,
      [tenantId, startDate, endDate]
    );

    // 4. Route Efficiency (Top Destinations)
    const routeEfficiency = await query(
      `SELECT
        t.destination,
        COUNT(DISTINCT t.trip_id) as trip_count,
        COUNT(DISTINCT t.driver_id) as drivers_used,
        COUNT(DISTINCT t.vehicle_id) as vehicles_used,
        ROUND(AVG(
          (SELECT COUNT(DISTINCT t2.customer_id)
           FROM tenant_trips t2
           WHERE t2.tenant_id = t.tenant_id
             AND t2.driver_id = t.driver_id
             AND t2.vehicle_id = t.vehicle_id
             AND t2.pickup_time = t.pickup_time
             AND t2.destination = t.destination
             AND t2.trip_date = t.trip_date
             AND t2.status IN ('completed', 'in_progress', 'scheduled'))
        ), 2) as avg_passengers_per_trip,
        SUM(COALESCE(t.price, 0)) as total_revenue,
        ROUND(SUM(COALESCE(t.price, 0)) / NULLIF(COUNT(DISTINCT t.trip_id), 0), 2) as revenue_per_trip
      FROM tenant_trips t
      WHERE t.tenant_id = $1
        AND t.trip_date BETWEEN $2 AND $3
        AND t.status IN ('completed', 'in_progress', 'scheduled')
        AND t.destination IS NOT NULL
      GROUP BY t.destination
      ORDER BY trip_count DESC
      LIMIT 10`,
      [tenantId, startDate, endDate]
    );

    // 5. Time-based Analysis (Busiest Times)
    const timeAnalysis = await query(
      `SELECT
        EXTRACT(HOUR FROM t.pickup_time::time) as hour,
        COUNT(DISTINCT t.trip_id) as trip_count,
        COUNT(DISTINCT t.driver_id) as active_drivers,
        COUNT(DISTINCT t.vehicle_id) as active_vehicles,
        SUM(COALESCE(t.price, 0)) as total_revenue,
        ROUND(AVG(t.price), 2) as avg_price
      FROM tenant_trips t
      WHERE t.tenant_id = $1
        AND t.trip_date BETWEEN $2 AND $3
        AND t.status IN ('completed', 'in_progress', 'scheduled')
        AND t.pickup_time IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM t.pickup_time::time)
      ORDER BY hour`,
      [tenantId, startDate, endDate]
    );

    // 6. Overall Summary Metrics
    const summary = await query(
      `SELECT
        COUNT(DISTINCT t.trip_id) as total_trips,
        COUNT(DISTINCT t.trip_date) as operating_days,
        COUNT(DISTINCT t.driver_id) as active_drivers,
        COUNT(DISTINCT t.vehicle_id) as active_vehicles,
        COUNT(DISTINCT t.customer_id) as customers_served,
        SUM(COALESCE(t.price, 0)) as total_revenue,
        ROUND(AVG(t.price), 2) as avg_revenue_per_trip,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN t.status = 'no_show' THEN 1 END) as no_show_trips,
        COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelled_trips,
        ROUND(
          (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::DECIMAL /
           NULLIF(COUNT(DISTINCT t.trip_id), 0)) * 100, 2
        ) as completion_rate,
        ROUND(
          (COUNT(CASE WHEN t.status = 'no_show' THEN 1 END)::DECIMAL /
           NULLIF(COUNT(DISTINCT t.trip_id), 0)) * 100, 2
        ) as no_show_rate
      FROM tenant_trips t
      WHERE t.tenant_id = $1
        AND t.trip_date BETWEEN $2 AND $3`,
      [tenantId, startDate, endDate]
    );

    // Calculate aggregate metrics
    const totalEmptySeats = emptySeatAnalysis.reduce((sum, day) => sum + (parseInt(day.total_empty_seats) || 0), 0);
    const totalMissedRevenue = emptySeatAnalysis.reduce((sum, day) => sum + (parseFloat(day.missed_revenue) || 0), 0);
    const avgUtilization = vehicleUtilization.length > 0
      ? vehicleUtilization.reduce((sum, v) => sum + (parseFloat(v.utilization_percentage) || 0), 0) / vehicleUtilization.length
      : 0;

    return res.json({
      success: true,
      dateRange: { startDate, endDate },
      summary: {
        totalTrips: parseInt(summary[0]?.total_trips) || 0,
        operatingDays: parseInt(summary[0]?.operating_days) || 0,
        activeDrivers: parseInt(summary[0]?.active_drivers) || 0,
        activeVehicles: parseInt(summary[0]?.active_vehicles) || 0,
        customersServed: parseInt(summary[0]?.customers_served) || 0,
        totalRevenue: parseFloat(summary[0]?.total_revenue) || 0,
        avgRevenuePerTrip: parseFloat(summary[0]?.avg_revenue_per_trip) || 0,
        completionRate: parseFloat(summary[0]?.completion_rate) || 0,
        noShowRate: parseFloat(summary[0]?.no_show_rate) || 0,
        avgVehicleUtilization: Math.round(avgUtilization * 100) / 100,
        totalEmptySeats,
        totalMissedRevenue: Math.round(totalMissedRevenue * 100) / 100
      },
      vehicleUtilization: vehicleUtilization.map(v => ({
        vehicleId: v.vehicle_id,
        registration: v.registration,
        make: v.make,
        model: v.model,
        capacity: parseInt(v.capacity) || 0,
        totalTrips: parseInt(v.total_trips) || 0,
        daysUsed: parseInt(v.days_used) || 0,
        avgPassengers: parseFloat(v.avg_passengers) || 0,
        utilizationPercentage: parseFloat(v.utilization_percentage) || 0,
        totalRevenue: parseFloat(v.total_revenue) || 0
      })),
      driverProductivity: driverProductivity.map(d => ({
        driverId: d.driver_id,
        driverName: d.driver_name,
        totalTrips: parseInt(d.total_trips) || 0,
        daysWorked: parseInt(d.days_worked) || 0,
        avgTripsPerDay: parseFloat(d.avg_trips_per_day) || 0,
        totalRevenue: parseFloat(d.total_revenue) || 0,
        revenuePerTrip: parseFloat(d.revenue_per_trip) || 0,
        completedTrips: parseInt(d.completed_trips) || 0,
        noShowTrips: parseInt(d.no_show_trips) || 0,
        cancelledTrips: parseInt(d.cancelled_trips) || 0,
        completionRate: parseFloat(d.completion_rate) || 0
      })),
      emptySeatAnalysis: emptySeatAnalysis.map(e => ({
        date: e.date,
        uniqueTrips: parseInt(e.unique_trips) || 0,
        totalEmptySeats: parseInt(e.total_empty_seats) || 0,
        avgTripPrice: parseFloat(e.avg_trip_price) || 0,
        missedRevenue: parseFloat(e.missed_revenue) || 0
      })),
      routeEfficiency: routeEfficiency.map(r => ({
        destination: r.destination,
        tripCount: parseInt(r.trip_count) || 0,
        driversUsed: parseInt(r.drivers_used) || 0,
        vehiclesUsed: parseInt(r.vehicles_used) || 0,
        avgPassengersPerTrip: parseFloat(r.avg_passengers_per_trip) || 0,
        totalRevenue: parseFloat(r.total_revenue) || 0,
        revenuePerTrip: parseFloat(r.revenue_per_trip) || 0
      })),
      timeAnalysis: timeAnalysis.map(t => ({
        hour: parseInt(t.hour) || 0,
        tripCount: parseInt(t.trip_count) || 0,
        activeDrivers: parseInt(t.active_drivers) || 0,
        activeVehicles: parseInt(t.active_vehicles) || 0,
        totalRevenue: parseFloat(t.total_revenue) || 0,
        avgPrice: parseFloat(t.avg_price) || 0
      }))
    });
  })
);

export default router;
