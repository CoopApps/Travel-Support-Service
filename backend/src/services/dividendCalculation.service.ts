/**
 * Dividend Calculation Service - Multi-Model Support
 *
 * Calculates and distributes dividends to cooperative members based on the tenant's cooperative model:
 *
 * PASSENGER CO-OP (consumer cooperative):
 * - Members: Customers who use the service
 * - Patronage: Trips taken
 * - Formula: (Member trips / Total trips) × Dividend pool
 *
 * WORKER CO-OP (worker cooperative):
 * - Members: Drivers who provide the service
 * - Patronage: Hours worked or trips driven
 * - Formula: (Driver hours / Total hours) × Dividend pool
 *
 * HYBRID CO-OP (multi-stakeholder):
 * - Members: Both customers AND drivers
 * - Split: 50% to customers (by trips), 50% to drivers (by hours)
 * - Formula: Split dividend pool, then apply patronage formula to each group
 */

import { query, queryOne } from '../config/database';
import { logger } from '../utils/logger';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DividendDistributionPeriod {
  distribution_id?: number;
  tenant_id: number;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_costs: number;
  gross_surplus: number;
  reserves_amount: number;
  business_costs_amount: number;
  dividend_pool: number;
  eligible_members: number;
  total_member_trips: number;
  status: 'pending' | 'calculated' | 'distributed' | 'cancelled';
}

export interface MemberDividend {
  member_id: number;
  member_name: string;
  membership_number: string;
  member_type: 'customer' | 'driver'; // Type of member in the cooperative
  patronage_value: number; // Trips (customer) or hours (driver)
  patronage_percentage: number; // Percentage of total patronage
  dividend_amount: number;
  // Legacy fields for backward compatibility
  trips_count?: number;
  trip_percentage?: number;
}

export interface DividendCalculationResult {
  distribution: DividendDistributionPeriod;
  member_dividends: MemberDividend[];
  summary: {
    total_eligible_members: number;
    total_trips: number;
    total_dividend_pool: number;
    average_dividend_per_member: number;
    average_dividend_per_trip: number;
  };
}

// ============================================================================
// DIVIDEND CALCULATION HELPERS - BY COOPERATIVE MODEL
// ============================================================================

/**
 * Calculate dividends for PASSENGER CO-OP (consumer cooperative)
 * Members are customers, patronage is trips taken
 */
async function calculatePassengerDividends(
  tenantId: number,
  periodStart: string,
  periodEnd: string,
  dividendPool: number
): Promise<{ memberDividends: MemberDividend[]; eligibleMembers: number; totalPatronage: number }> {
  // Get customer members and their trip counts
  const memberTrips = await query(
    `SELECT
      m.member_id,
      m.membership_number,
      c.name as member_name,
      COUNT(DISTINCT b.booking_id) as trips_count
     FROM section22_cooperative_members m
     JOIN tenant_customers c ON m.customer_id = c.customer_id
     LEFT JOIN section22_bus_bookings b ON b.customer_id = m.customer_id
       AND b.service_date >= $2
       AND b.service_date <= $3
       AND b.booking_status IN ('confirmed', 'boarded')
     WHERE m.tenant_id = $1
       AND m.is_active = true
       AND m.dividend_eligible = true
     GROUP BY m.member_id, m.membership_number, c.name
     HAVING COUNT(DISTINCT b.booking_id) > 0
     ORDER BY trips_count DESC`,
    [tenantId, periodStart, periodEnd]
  );

  const totalTrips = memberTrips.reduce((sum, m) => sum + parseInt(m.trips_count), 0);
  const eligibleMembers = memberTrips.length;

  const memberDividends: MemberDividend[] = memberTrips.map((member) => {
    const tripsCount = parseInt(member.trips_count);
    const tripPercentage = totalTrips > 0 ? (tripsCount / totalTrips) * 100 : 0;
    const dividendAmount = totalTrips > 0 ? (tripsCount / totalTrips) * dividendPool : 0;

    return {
      member_id: member.member_id,
      member_name: member.member_name,
      membership_number: member.membership_number,
      member_type: 'customer',
      patronage_value: tripsCount,
      patronage_percentage: Math.round(tripPercentage * 100) / 100,
      dividend_amount: Math.round(dividendAmount * 100) / 100,
      // Legacy fields
      trips_count: tripsCount,
      trip_percentage: Math.round(tripPercentage * 100) / 100,
    };
  });

  return { memberDividends, eligibleMembers, totalPatronage: totalTrips };
}

/**
 * Calculate dividends for WORKER CO-OP (worker cooperative)
 * Members are drivers, patronage is trips driven
 */
async function calculateWorkerDividends(
  tenantId: number,
  periodStart: string,
  periodEnd: string,
  dividendPool: number
): Promise<{ memberDividends: MemberDividend[]; eligibleMembers: number; totalPatronage: number }> {
  // Get driver trips as patronage (could be hours worked if we track that)
  const driverTrips = await query(
    `SELECT
      d.driver_id as member_id,
      CONCAT('DRV-', d.driver_id::TEXT) as membership_number,
      d.name as member_name,
      COUNT(DISTINCT b.booking_id) as trips_driven
     FROM tenant_drivers d
     LEFT JOIN section22_bus_bookings b ON b.driver_id = d.driver_id
       AND b.service_date >= $2
       AND b.service_date <= $3
       AND b.booking_status IN ('confirmed', 'boarded', 'completed')
     WHERE d.tenant_id = $1
       AND d.is_active = true
     GROUP BY d.driver_id, d.name
     HAVING COUNT(DISTINCT b.booking_id) > 0
     ORDER BY trips_driven DESC`,
    [tenantId, periodStart, periodEnd]
  );

  const totalTrips = driverTrips.reduce((sum, d) => sum + parseInt(d.trips_driven), 0);
  const eligibleMembers = driverTrips.length;

  const memberDividends: MemberDividend[] = driverTrips.map((driver) => {
    const tripsDriven = parseInt(driver.trips_driven);
    const tripPercentage = totalTrips > 0 ? (tripsDriven / totalTrips) * 100 : 0;
    const dividendAmount = totalTrips > 0 ? (tripsDriven / totalTrips) * dividendPool : 0;

    return {
      member_id: driver.member_id,
      member_name: driver.member_name,
      membership_number: driver.membership_number,
      member_type: 'driver',
      patronage_value: tripsDriven,
      patronage_percentage: Math.round(tripPercentage * 100) / 100,
      dividend_amount: Math.round(dividendAmount * 100) / 100,
    };
  });

  return { memberDividends, eligibleMembers, totalPatronage: totalTrips };
}

/**
 * Calculate dividends for HYBRID CO-OP (multi-stakeholder)
 * Members are both customers AND drivers, split dividend pool 50/50
 */
async function calculateHybridDividends(
  tenantId: number,
  periodStart: string,
  periodEnd: string,
  dividendPool: number
): Promise<{ memberDividends: MemberDividend[]; eligibleMembers: number; totalPatronage: number }> {
  // Split dividend pool: 50% to customers, 50% to drivers
  const customerPool = dividendPool * 0.5;
  const driverPool = dividendPool * 0.5;

  // Calculate customer dividends
  const customerResult = await calculatePassengerDividends(tenantId, periodStart, periodEnd, customerPool);

  // Calculate driver dividends
  const driverResult = await calculateWorkerDividends(tenantId, periodStart, periodEnd, driverPool);

  // Combine both groups
  const memberDividends = [...customerResult.memberDividends, ...driverResult.memberDividends];
  const eligibleMembers = customerResult.eligibleMembers + driverResult.eligibleMembers;
  const totalPatronage = customerResult.totalPatronage + driverResult.totalPatronage;

  return { memberDividends, eligibleMembers, totalPatronage };
}

// ============================================================================
// MAIN DIVIDEND CALCULATION
// ============================================================================

/**
 * Calculate dividends for a period based on tenant's cooperative model and member patronage
 */
export async function calculateDividends(
  tenantId: number,
  periodStart: string,
  periodEnd: string,
  reservesPercent: number = 20,
  businessPercent: number = 30,
  dividendPercent: number = 50
): Promise<DividendCalculationResult> {
  try {
    // Step 0: Get tenant's cooperative model
    const tenantData = await queryOne(
      `SELECT cooperative_model FROM tenants WHERE tenant_id = $1`,
      [tenantId]
    );

    const cooperativeModel = tenantData?.cooperative_model || 'passenger'; // Default to passenger if not set

    logger.info('Calculating dividends', {
      tenantId,
      cooperativeModel,
      periodStart,
      periodEnd,
    });

    // Step 1: Calculate total surplus for period
    const surplusData = await queryOne(
      `SELECT
        COALESCE(SUM(total_revenue), 0) as total_revenue,
        COALESCE(SUM(total_cost), 0) as total_costs,
        COALESCE(SUM(gross_surplus), 0) as gross_surplus
       FROM section22_service_costs
       WHERE tenant_id = $1
         AND service_date >= $2
         AND service_date <= $3`,
      [tenantId, periodStart, periodEnd]
    );

    const grossSurplus = parseFloat(surplusData.gross_surplus || '0');
    const totalRevenue = parseFloat(surplusData.total_revenue || '0');
    const totalCosts = parseFloat(surplusData.total_costs || '0');

    // Step 2: Allocate surplus
    const reservesAmount = grossSurplus * (reservesPercent / 100);
    const businessAmount = grossSurplus * (businessPercent / 100);
    const dividendPool = grossSurplus * (dividendPercent / 100);

    // Step 3: Calculate member dividends based on cooperative model
    let memberDividends: MemberDividend[];
    let eligibleMembers: number;
    let totalPatronage: number;

    switch (cooperativeModel) {
      case 'worker':
        // Worker co-op: Distribute to drivers based on hours/trips driven
        ({ memberDividends, eligibleMembers, totalPatronage } = await calculateWorkerDividends(
          tenantId,
          periodStart,
          periodEnd,
          dividendPool
        ));
        break;

      case 'hybrid':
        // Hybrid co-op: Split between customers and drivers
        ({ memberDividends, eligibleMembers, totalPatronage } = await calculateHybridDividends(
          tenantId,
          periodStart,
          periodEnd,
          dividendPool
        ));
        break;

      case 'passenger':
      default:
        // Passenger co-op: Distribute to customers based on trips taken (current implementation)
        ({ memberDividends, eligibleMembers, totalPatronage } = await calculatePassengerDividends(
          tenantId,
          periodStart,
          periodEnd,
          dividendPool
        ));
        break;
    }

    // Step 4: Create distribution record
    const distribution: DividendDistributionPeriod = {
      tenant_id: tenantId,
      period_start: periodStart,
      period_end: periodEnd,
      total_revenue: totalRevenue,
      total_costs: totalCosts,
      gross_surplus: grossSurplus,
      reserves_amount: reservesAmount,
      business_costs_amount: businessAmount,
      dividend_pool: dividendPool,
      eligible_members: eligibleMembers,
      total_member_trips: totalPatronage, // Total patronage (trips, hours, or combined)
      status: 'calculated',
    };

    const summary = {
      total_eligible_members: eligibleMembers,
      total_trips: totalPatronage, // Generic patronage value
      total_dividend_pool: dividendPool,
      average_dividend_per_member: eligibleMembers > 0 ? dividendPool / eligibleMembers : 0,
      average_dividend_per_trip: totalPatronage > 0 ? dividendPool / totalPatronage : 0,
    };

    logger.info('Dividends calculated', {
      tenantId,
      cooperativeModel,
      periodStart,
      periodEnd,
      grossSurplus,
      dividendPool,
      eligibleMembers,
      totalPatronage,
    });

    return {
      distribution,
      member_dividends: memberDividends,
      summary,
    };
  } catch (error: any) {
    logger.error('Error calculating dividends', {
      error: error.message,
      tenantId,
      periodStart,
      periodEnd,
    });
    throw error;
  }
}

/**
 * Save dividend distribution to database
 */
export async function saveDividendDistribution(
  calculation: DividendCalculationResult
): Promise<number> {
  try {
    const { distribution, member_dividends } = calculation;

    // Insert distribution record
    const distResult = await queryOne(
      `INSERT INTO section22_surplus_distributions (
        tenant_id,
        period_start,
        period_end,
        total_revenue,
        total_costs,
        gross_surplus,
        reserves_amount,
        business_costs_amount,
        dividend_pool,
        eligible_members,
        total_member_trips,
        status,
        calculated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
       RETURNING distribution_id`,
      [
        distribution.tenant_id,
        distribution.period_start,
        distribution.period_end,
        distribution.total_revenue,
        distribution.total_costs,
        distribution.gross_surplus,
        distribution.reserves_amount,
        distribution.business_costs_amount,
        distribution.dividend_pool,
        distribution.eligible_members,
        distribution.total_member_trips,
        'calculated',
      ]
    );

    const distributionId = distResult.distribution_id;

    // Insert individual member dividends
    for (const dividend of member_dividends) {
      await query(
        `INSERT INTO section22_member_dividends (
          distribution_id,
          member_id,
          tenant_id,
          member_type,
          member_trips_count,
          member_trip_percentage,
          dividend_amount,
          payment_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [
          distributionId,
          dividend.member_id,
          distribution.tenant_id,
          dividend.member_type,
          dividend.patronage_value,
          dividend.patronage_percentage,
          dividend.dividend_amount,
        ]
      );
    }

    logger.info('Dividend distribution saved', {
      distributionId,
      tenantId: distribution.tenant_id,
      memberCount: member_dividends.length,
    });

    return distributionId;
  } catch (error: any) {
    logger.error('Error saving dividend distribution', { error: error.message });
    throw error;
  }
}

/**
 * Mark distribution as distributed (paid out)
 */
export async function markDistributionPaid(
  distributionId: number,
  paymentMethod: 'account_credit' | 'bank_transfer' | 'cash' | 'reinvest' = 'account_credit'
): Promise<void> {
  try {
    // Update distribution status
    await query(
      `UPDATE section22_surplus_distributions
       SET status = 'distributed', distributed_at = CURRENT_TIMESTAMP
       WHERE distribution_id = $1`,
      [distributionId]
    );

    // Update member dividend statuses
    await query(
      `UPDATE section22_member_dividends
       SET
         payment_status = 'paid',
         payment_method = $2,
         payment_date = CURRENT_DATE
       WHERE distribution_id = $1 AND payment_status = 'pending'`,
      [distributionId, paymentMethod]
    );

    logger.info('Distribution marked as paid', { distributionId, paymentMethod });
  } catch (error: any) {
    logger.error('Error marking distribution paid', { error: error.message, distributionId });
    throw error;
  }
}

/**
 * Get distribution history
 */
export async function getDistributionHistory(
  tenantId: number,
  limit: number = 12
): Promise<any[]> {
  try {
    const distributions = await query(
      `SELECT * FROM section22_surplus_distributions
       WHERE tenant_id = $1
       ORDER BY period_end DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return distributions;
  } catch (error: any) {
    logger.error('Error fetching distribution history', { error: error.message, tenantId });
    throw error;
  }
}

/**
 * Get member dividend history
 */
export async function getMemberDividendHistory(
  memberId: number,
  limit: number = 12
): Promise<any[]> {
  try {
    const dividends = await query(
      `SELECT
        md.*,
        sd.period_start,
        sd.period_end,
        sd.gross_surplus,
        sd.dividend_pool
       FROM section22_member_dividends md
       JOIN section22_surplus_distributions sd ON md.distribution_id = sd.distribution_id
       WHERE md.member_id = $1
       ORDER BY sd.period_end DESC
       LIMIT $2`,
      [memberId, limit]
    );

    return dividends;
  } catch (error: any) {
    logger.error('Error fetching member dividend history', {
      error: error.message,
      memberId,
    });
    throw error;
  }
}

export default {
  calculateDividends,
  saveDividendDistribution,
  markDistributionPaid,
  getDistributionHistory,
  getMemberDividendHistory,
};
