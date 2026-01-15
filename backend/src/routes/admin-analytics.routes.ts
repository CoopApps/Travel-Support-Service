import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Admin Analytics Routes
 *
 * Financial reporting and business intelligence for company administrators
 * Includes profitability analysis, cost breakdowns, and optimization recommendations
 */

/**
 * ========================================
 * DRIVER PROFITABILITY ANALYSIS
 * ========================================
 */

/**
 * @route GET /api/tenants/:tenantId/admin/analytics/driver-profitability
 * @desc Analyze profitability per driver (revenue vs costs)
 * @access Protected (Admin)
 */
router.get(
  '/tenants/:tenantId/admin/analytics/driver-profitability',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate, minTrips = '5' } = req.query;

    logger.info('Fetching driver profitability analysis', { tenantId, startDate, endDate });

    // Build date filter
    const dateConditions: string[] = [];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      dateConditions.push(`t.trip_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateConditions.push(`t.trip_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

    // Get revenue per driver (completed trips only)
    const driverRevenue = await query<any>(`
      SELECT
        d.driver_id,
        d.name as driver_name,
        d.employment_type,
        d.weekly_wage,
        COUNT(t.trip_id) as total_trips,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trips,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END), 0) as total_revenue,
        MIN(t.trip_date) as first_trip_date,
        MAX(t.trip_date) as last_trip_date
      FROM tenant_drivers d
      LEFT JOIN tenant_trips t ON d.driver_id = t.driver_id AND d.tenant_id = t.tenant_id
      WHERE d.tenant_id = $1 AND d.is_active = true ${dateFilter}
      GROUP BY d.driver_id, d.name, d.employment_type, d.weekly_wage
      HAVING COUNT(t.trip_id) >= ${parseInt(minTrips as string, 10)}
    `, params);

    // Get fuel costs per driver
    const fuelCosts = await query<any>(`
      SELECT
        driver_id,
        COALESCE(SUM(cost), 0) as total_fuel_cost,
        COUNT(*) as fuel_entries
      FROM tenant_driver_fuel
      WHERE tenant_id = $1 ${dateFilter.replace(/t\.trip_date/g, 'date')}
      GROUP BY driver_id
    `, params);

    const fuelMap = new Map();
    fuelCosts.forEach((fc: any) => {
      fuelMap.set(fc.driver_id, {
        totalFuelCost: parseFloat(fc.total_fuel_cost || '0'),
        fuelEntries: parseInt(fc.fuel_entries || '0', 10)
      });
    });

    // Get payroll costs per driver
    const payrollCosts = await query<any>(`
      SELECT
        pr.driver_id,
        COALESCE(SUM(pr.gross_pay), 0) as total_wages,
        COUNT(*) as payroll_records
      FROM tenant_payroll_records pr
      WHERE pr.tenant_id = $1
      GROUP BY pr.driver_id
    `, [tenantId]);

    const payrollMap = new Map();
    payrollCosts.forEach((pc: any) => {
      payrollMap.set(pc.driver_id, {
        totalWages: parseFloat(pc.total_wages || '0'),
        payrollRecords: parseInt(pc.payroll_records || '0', 10)
      });
    });

    // Get vehicle costs from actual trips (not current assignment)
    // Only count costs for company-owned or leased vehicles (exclude 'personal')
    const vehicleCosts = await query<any>(`
      SELECT
        t.driver_id,
        COALESCE(SUM(CASE
          WHEN v.ownership IN ('owned', 'leased')
          THEN (v.lease_monthly_cost + v.insurance_monthly_cost) / 80.0
          ELSE 0
        END), 0) as total_vehicle_cost,
        COUNT(DISTINCT t.vehicle_id) as vehicles_used
      FROM tenant_trips t
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      WHERE t.tenant_id = $1 ${dateFilter}
      GROUP BY t.driver_id
    `, params);

    const vehicleMap = new Map();
    vehicleCosts.forEach((vc: any) => {
      vehicleMap.set(vc.driver_id, {
        totalVehicleCost: parseFloat(vc.total_vehicle_cost || '0'),
        vehiclesUsed: parseInt(vc.vehicles_used || '0', 10)
      });
    });

    // Calculate profitability for each driver
    const profitability = driverRevenue.map((driver: any) => {
      const totalRevenue = parseFloat(driver.total_revenue || '0');
      const totalTrips = parseInt(driver.total_trips || '0', 10);
      const completedTrips = parseInt(driver.completed_trips || '0', 10);

      // Calculate wage cost
      const payrollData = payrollMap.get(driver.driver_id);
      const weeklyWage = parseFloat(driver.weekly_wage || '0');
      const weeksInPeriod = startDate && endDate
        ? Math.ceil((new Date(endDate as string).getTime() - new Date(startDate as string).getTime()) / (1000 * 60 * 60 * 24 * 7))
        : 4; // Default to 4 weeks if no date range

      const wageCost = payrollData ? payrollData.totalWages : (weeklyWage * weeksInPeriod);

      // Get other costs
      const fuelData = fuelMap.get(driver.driver_id) || { totalFuelCost: 0, fuelEntries: 0 };
      const vehicleData = vehicleMap.get(driver.driver_id) || { totalVehicleCost: 0 };

      const totalCosts = wageCost + fuelData.totalFuelCost + vehicleData.totalVehicleCost;
      const netProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00';
      const revenuePerTrip = completedTrips > 0 ? (totalRevenue / completedTrips).toFixed(2) : '0.00';
      const costPerTrip = totalTrips > 0 ? (totalCosts / totalTrips).toFixed(2) : '0.00';

      return {
        driverId: driver.driver_id,
        driverName: driver.driver_name,
        employmentType: driver.employment_type,
        totalTrips,
        completedTrips,
        revenue: {
          total: parseFloat(totalRevenue.toFixed(2)),
          perTrip: parseFloat(revenuePerTrip)
        },
        costs: {
          wages: parseFloat(wageCost.toFixed(2)),
          fuel: fuelData.totalFuelCost,
          vehicle: vehicleData.totalVehicleCost,
          total: parseFloat(totalCosts.toFixed(2)),
          perTrip: parseFloat(costPerTrip)
        },
        profitability: {
          netProfit: parseFloat(netProfit.toFixed(2)),
          profitMargin: parseFloat(profitMargin),
          profitable: netProfit > 0
        },
        period: {
          firstTrip: driver.first_trip_date,
          lastTrip: driver.last_trip_date,
          weeks: weeksInPeriod
        }
      };
    });

    // Sort by net profit descending
    profitability.sort((a, b) => b.profitability.netProfit - a.profitability.netProfit);

    // Calculate summary statistics
    const summary = {
      totalDrivers: profitability.length,
      profitableDrivers: profitability.filter(d => d.profitability.profitable).length,
      unprofitableDrivers: profitability.filter(d => !d.profitability.profitable).length,
      totalRevenue: profitability.reduce((sum, d) => sum + d.revenue.total, 0),
      totalCosts: profitability.reduce((sum, d) => sum + d.costs.total, 0),
      totalNetProfit: profitability.reduce((sum, d) => sum + d.profitability.netProfit, 0),
      averageProfitMargin: profitability.length > 0
        ? (profitability.reduce((sum, d) => sum + d.profitability.profitMargin, 0) / profitability.length).toFixed(2)
        : '0.00'
    };

    res.json({
      summary,
      drivers: profitability
    });
    return;
  })
);

/**
 * ========================================
 * TRIP PROFITABILITY ANALYSIS
 * ========================================
 */

/**
 * @route GET /api/tenants/:tenantId/admin/analytics/trip-profitability
 * @desc Analyze profitability per trip (identifies profitable vs unprofitable trips)
 * @access Protected (Admin)
 */
router.get(
  '/tenants/:tenantId/admin/analytics/trip-profitability',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { limit = '100', tripType, driverId, status = 'completed' } = req.query;

    logger.info('Fetching trip profitability analysis', { tenantId, limit, tripType, driverId });

    // Build filter conditions
    const conditions: string[] = ['t.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (tripType) {
      conditions.push(`t.trip_type = $${paramIndex}`);
      params.push(tripType);
      paramIndex++;
    }

    if (driverId) {
      conditions.push(`t.driver_id = $${paramIndex}`);
      params.push(driverId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get trip details with driver and vehicle info
    const trips = await query<any>(`
      SELECT
        t.trip_id,
        t.trip_date,
        t.pickup_time,
        t.trip_type,
        t.status,
        t.price,
        t.distance,
        t.estimated_duration,
        t.driver_id,
        d.name as driver_name,
        d.weekly_wage,
        d.employment_type,
        t.vehicle_id,
        v.ownership,
        v.lease_monthly_cost,
        v.insurance_monthly_cost,
        c.name as customer_name
      FROM tenant_trips t
      LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id AND t.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id
      WHERE ${whereClause}
      ORDER BY t.trip_date DESC, t.pickup_time DESC
      LIMIT ${parseInt(limit as string, 10)}
    `, params);

    // Calculate average costs for estimation
    const avgMaintenance = await queryOne<{ avg_cost: string }>(`
      SELECT COALESCE(AVG(cost), 0) as avg_cost
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND completed = true
    `, [tenantId]);

    const avgMaintenancePerTrip = parseFloat(avgMaintenance?.avg_cost || '0') / 80; // Assume ~80 trips per maintenance

    // Estimate fuel cost per km (UK average ~£0.15/km)
    const fuelCostPerKm = 0.15;

    // Calculate profitability for each trip
    const tripProfitability = trips.map((trip: any) => {
      const revenue = parseFloat(trip.price || '0');
      const distance = parseFloat(trip.distance || '0');
      const estimatedDuration = parseFloat(trip.estimated_duration || '60'); // Default 60 mins

      // Calculate driver wage cost for this trip
      const weeklyWage = parseFloat(trip.weekly_wage || '0');
      const hourlyRate = weeklyWage / 40; // Assume 40-hour week
      const durationHours = estimatedDuration / 60;
      const wageCost = hourlyRate * durationHours;

      // Calculate fuel cost estimate
      const fuelCost = distance * fuelCostPerKm;

      // Calculate vehicle cost allocation (monthly cost / ~80 trips per month)
      // Only charge for company-owned or leased vehicles (not personal)
      const ownership = trip.ownership;
      const monthlyLease = parseFloat(trip.lease_monthly_cost || '0');
      const monthlyInsurance = parseFloat(trip.insurance_monthly_cost || '0');
      const vehicleCostPerTrip = (ownership === 'owned' || ownership === 'leased')
        ? (monthlyLease + monthlyInsurance) / 80
        : 0; // No cost for personal vehicles

      // Total costs
      const totalCosts = wageCost + fuelCost + vehicleCostPerTrip + avgMaintenancePerTrip;
      const netProfit = revenue - totalCosts;
      const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : '0.00';

      return {
        tripId: trip.trip_id,
        tripDate: trip.trip_date,
        pickupTime: trip.pickup_time,
        tripType: trip.trip_type,
        status: trip.status,
        customerName: trip.customer_name,
        driverName: trip.driver_name,
        distance: distance,
        duration: estimatedDuration,
        revenue: parseFloat(revenue.toFixed(2)),
        costs: {
          driverWage: parseFloat(wageCost.toFixed(2)),
          fuel: parseFloat(fuelCost.toFixed(2)),
          vehicle: parseFloat(vehicleCostPerTrip.toFixed(2)),
          maintenance: parseFloat(avgMaintenancePerTrip.toFixed(2)),
          total: parseFloat(totalCosts.toFixed(2))
        },
        profitability: {
          netProfit: parseFloat(netProfit.toFixed(2)),
          profitMargin: parseFloat(profitMargin),
          profitable: netProfit > 0
        }
      };
    });

    // Calculate summary
    const summary = {
      totalTrips: tripProfitability.length,
      profitableTrips: tripProfitability.filter(t => t.profitability.profitable).length,
      unprofitableTrips: tripProfitability.filter(t => !t.profitability.profitable).length,
      totalRevenue: tripProfitability.reduce((sum, t) => sum + t.revenue, 0),
      totalCosts: tripProfitability.reduce((sum, t) => sum + t.costs.total, 0),
      totalNetProfit: tripProfitability.reduce((sum, t) => sum + t.profitability.netProfit, 0),
      averageProfitPerTrip: tripProfitability.length > 0
        ? (tripProfitability.reduce((sum, t) => sum + t.profitability.netProfit, 0) / tripProfitability.length).toFixed(2)
        : '0.00',
      averageProfitMargin: tripProfitability.length > 0
        ? (tripProfitability.reduce((sum, t) => sum + parseFloat(t.profitability.profitMargin.toString()), 0) / tripProfitability.length).toFixed(2)
        : '0.00'
    };

    res.json({
      summary,
      trips: tripProfitability
    });
    return;
  })
);

/**
 * ========================================
 * PROFIT & LOSS DASHBOARD
 * ========================================
 */

/**
 * @route GET /api/tenants/:tenantId/admin/analytics/profitability-dashboard
 * @desc Overall company P&L dashboard with cost breakdowns and recommendations
 * @access Protected (Admin)
 */
router.get(
  '/tenants/:tenantId/admin/analytics/profitability-dashboard',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    logger.info('Fetching profitability dashboard', { tenantId, startDate, endDate });

    // Build date filter
    const dateConditions: string[] = [];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      dateConditions.push(`trip_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateConditions.push(`trip_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

    // Get overall revenue statistics
    const revenueStats = await queryOne<any>(`
      SELECT
        COUNT(*) as total_trips,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN price END), 0) as avg_revenue_per_trip
      FROM tenant_trips
      WHERE tenant_id = $1 ${dateFilter}
    `, params);

    // Get cost summaries
    const payrollCosts = await queryOne<{ total_wages: string }>(`
      SELECT COALESCE(SUM(gross_pay), 0) as total_wages
      FROM tenant_payroll_records
      WHERE tenant_id = $1
    `, [tenantId]);

    const fuelCosts = await queryOne<{ total_fuel: string }>(`
      SELECT COALESCE(SUM(cost), 0) as total_fuel
      FROM tenant_driver_fuel
      WHERE tenant_id = $1 ${dateFilter.replace(/trip_date/g, 'date')}
    `, params);

    const vehicleCosts = await queryOne<any>(`
      SELECT
        COALESCE(SUM(CASE WHEN ownership IN ('owned', 'leased') THEN lease_monthly_cost ELSE 0 END), 0) as total_lease,
        COALESCE(SUM(CASE WHEN ownership IN ('owned', 'leased') THEN insurance_monthly_cost ELSE 0 END), 0) as total_insurance,
        COUNT(*) as active_vehicles,
        COUNT(*) FILTER (WHERE ownership = 'personal') as personal_vehicles
      FROM tenant_vehicles
      WHERE tenant_id = $1 AND is_active = true
    `, [tenantId]);

    const maintenanceCosts = await queryOne<{ total_maintenance: string }>(`
      SELECT COALESCE(SUM(cost), 0) as total_maintenance
      FROM tenant_vehicle_maintenance
      WHERE tenant_id = $1 AND completed = true
    `, [tenantId]);

    const incidentCosts = await queryOne<{ total_incidents: string }>(`
      SELECT COALESCE(SUM(actual_cost), 0) as total_incidents
      FROM tenant_vehicle_incidents
      WHERE tenant_id = $1
    `, [tenantId]);

    // Calculate totals
    const totalRevenue = parseFloat(revenueStats?.total_revenue || '0');
    const totalWages = parseFloat(payrollCosts?.total_wages || '0');
    const totalFuel = parseFloat(fuelCosts?.total_fuel || '0');

    const monthsInPeriod = startDate && endDate
      ? Math.ceil((new Date(endDate as string).getTime() - new Date(startDate as string).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      : 1;

    const totalLease = parseFloat(vehicleCosts?.total_lease || '0') * monthsInPeriod;
    const totalInsurance = parseFloat(vehicleCosts?.total_insurance || '0') * monthsInPeriod;
    const totalMaintenance = parseFloat(maintenanceCosts?.total_maintenance || '0');
    const totalIncidents = parseFloat(incidentCosts?.total_incidents || '0');

    const totalCosts = totalWages + totalFuel + totalLease + totalInsurance + totalMaintenance + totalIncidents;
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00';

    // Get profitability by trip type
    const tripTypeBreakdown = await query<any>(`
      SELECT
        trip_type,
        COUNT(*) as trip_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as revenue
      FROM tenant_trips
      WHERE tenant_id = $1 ${dateFilter}
      GROUP BY trip_type
      ORDER BY revenue DESC
    `, params);

    // Get top drivers by revenue
    const topDrivers = await query<any>(`
      SELECT
        d.driver_id,
        d.name,
        COUNT(t.trip_id) as trips,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.price ELSE 0 END), 0) as revenue
      FROM tenant_drivers d
      LEFT JOIN tenant_trips t ON d.driver_id = t.driver_id AND d.tenant_id = t.tenant_id ${dateFilter.replace('trip_date', 't.trip_date')}
      WHERE d.tenant_id = $1 AND d.is_active = true
      GROUP BY d.driver_id, d.name
      HAVING COUNT(t.trip_id) > 0
      ORDER BY revenue DESC
      LIMIT 5
    `, params);

    res.json({
      overview: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCosts: parseFloat(totalCosts.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        profitMargin: parseFloat(profitMargin),
        profitable: netProfit > 0
      },
      trips: {
        total: parseInt(revenueStats?.total_trips || '0', 10),
        completed: parseInt(revenueStats?.completed_trips || '0', 10),
        cancelled: parseInt(revenueStats?.cancelled_trips || '0', 10),
        averageRevenue: parseFloat(revenueStats?.avg_revenue_per_trip || '0').toFixed(2)
      },
      costBreakdown: {
        wages: parseFloat(totalWages.toFixed(2)),
        fuel: parseFloat(totalFuel.toFixed(2)),
        vehicleLease: parseFloat(totalLease.toFixed(2)),
        vehicleInsurance: parseFloat(totalInsurance.toFixed(2)),
        maintenance: parseFloat(totalMaintenance.toFixed(2)),
        incidents: parseFloat(totalIncidents.toFixed(2)),
        total: parseFloat(totalCosts.toFixed(2))
      },
      costPercentages: {
        wages: totalCosts > 0 ? ((totalWages / totalCosts) * 100).toFixed(2) : '0.00',
        fuel: totalCosts > 0 ? ((totalFuel / totalCosts) * 100).toFixed(2) : '0.00',
        vehicles: totalCosts > 0 ? (((totalLease + totalInsurance) / totalCosts) * 100).toFixed(2) : '0.00',
        maintenance: totalCosts > 0 ? ((totalMaintenance / totalCosts) * 100).toFixed(2) : '0.00',
        incidents: totalCosts > 0 ? ((totalIncidents / totalCosts) * 100).toFixed(2) : '0.00'
      },
      tripTypeBreakdown: tripTypeBreakdown.map((tt: any) => ({
        tripType: tt.trip_type,
        trips: parseInt(tt.trip_count || '0', 10),
        revenue: parseFloat(tt.revenue || '0')
      })),
      topDrivers: topDrivers.map((d: any) => ({
        driverId: d.driver_id,
        name: d.name,
        trips: parseInt(d.trips || '0', 10),
        revenue: parseFloat(d.revenue || '0')
      })),
      recommendations: generateRecommendations(
        netProfit,
        totalRevenue,
        totalCosts,
        {
          wages: totalWages,
          fuel: totalFuel,
          maintenance: totalMaintenance,
          incidents: totalIncidents
        }
      ),
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
        months: monthsInPeriod
      }
    });
    return;
  })
);

/**
 * Generate cost optimization recommendations
 */
function generateRecommendations(
  netProfit: number,
  totalRevenue: number,
  totalCosts: number,
  costBreakdown: { wages: number; fuel: number; maintenance: number; incidents: number }
): string[] {
  const recommendations: string[] = [];

  // Overall profitability
  if (netProfit < 0) {
    recommendations.push(`[WARNING] Fleet is operating at a loss. Total costs (£${totalCosts.toFixed(2)}) exceed revenue (£${totalRevenue.toFixed(2)}).`);
  } else {
    const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(2);
    if (parseFloat(profitMargin) < 10) {
      recommendations.push(`[INFO] Profit margin is low (${profitMargin}%). Consider optimizing costs or increasing trip prices.`);
    }
  }

  // Wage costs
  const wagePercentage = (costBreakdown.wages / totalCosts) * 100;
  if (wagePercentage > 60) {
    recommendations.push(`[COST] Wage costs are ${wagePercentage.toFixed(1)}% of total costs. Review driver utilization to maximize productivity.`);
  }

  // Fuel costs
  const fuelPercentage = (costBreakdown.fuel / totalCosts) * 100;
  if (fuelPercentage > 25) {
    recommendations.push(`[FUEL] Fuel costs are ${fuelPercentage.toFixed(1)}% of total costs. Consider route optimization or fuel-efficient vehicles.`);
  }

  // Maintenance costs
  const maintenancePercentage = (costBreakdown.maintenance / totalCosts) * 100;
  if (maintenancePercentage > 15) {
    recommendations.push(`[MAINTENANCE] Maintenance costs are ${maintenancePercentage.toFixed(1)}% of total costs. High maintenance may indicate aging fleet.`);
  }

  // Incident costs
  if (costBreakdown.incidents > 5000) {
    recommendations.push(`[ALERT] Incident costs are £${costBreakdown.incidents.toFixed(2)}. Review driver training and safety protocols.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('[SUCCESS] Fleet operations are performing well. Continue monitoring key metrics.');
  }

  return recommendations;
}

export default router;
