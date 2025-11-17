/**
 * Surplus Management Service
 *
 * Handles all surplus-related operations for cooperative bus services:
 * - Surplus pool initialization and tracking
 * - Subsidy calculation and application
 * - Surplus allocation (reserves, business, dividends)
 * - Transaction history and transparency
 *
 * Core concept: Profitable trips help less profitable ones within same route
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// ============================================================================
// INTERFACES
// ============================================================================

export interface RouteSurplusPool {
  pool_id: number;
  route_id: number;
  tenant_id: number;
  accumulated_surplus: number;
  available_for_subsidy: number;
  reserved_for_reserves: number;
  reserved_for_business: number;
  total_distributed_dividends: number;
  lifetime_total_revenue: number;
  lifetime_total_costs: number;
  lifetime_gross_surplus: number;
  total_services_run: number;
  total_profitable_services: number;
  total_subsidized_services: number;
}

export interface SubsidyCalculation {
  raw_cost: number;
  available_subsidy: number;
  subsidy_applied: number;
  effective_cost: number;
  minimum_passengers_needed: number;
  break_even_fare: number;
  subsidy_source: string;
}

export interface SurplusAllocationResult {
  gross_surplus: number;
  to_reserves: number;
  to_business: number;
  to_dividends: number;
  to_pool: number;
  allocation_breakdown: string[];
}

// ============================================================================
// SURPLUS POOL MANAGEMENT
// ============================================================================

/**
 * Initialize surplus pool for a route (if doesn't exist)
 */
export async function initializeSurplusPool(
  routeId: number,
  tenantId: number
): Promise<RouteSurplusPool> {
  try {
    const result = await pool.query(`
      INSERT INTO section22_route_surplus_pool (route_id, tenant_id)
      VALUES ($1, $2)
      ON CONFLICT (route_id, tenant_id) DO UPDATE
      SET last_updated = CURRENT_TIMESTAMP
      RETURNING *
    `, [routeId, tenantId]);

    logger.info('Surplus pool initialized', { routeId, tenantId });
    return result.rows[0];
  } catch (error: any) {
    logger.error('Error initializing surplus pool', { error: error.message, routeId, tenantId });
    throw error;
  }
}

/**
 * Get surplus pool for a route
 */
export async function getSurplusPool(routeId: number): Promise<RouteSurplusPool | null> {
  try {
    const result = await pool.query(`
      SELECT * FROM section22_route_surplus_pool
      WHERE route_id = $1
    `, [routeId]);

    return result.rows[0] || null;
  } catch (error: any) {
    logger.error('Error fetching surplus pool', { error: error.message, routeId });
    throw error;
  }
}

// ============================================================================
// SUBSIDY CALCULATION
// ============================================================================

/**
 * Calculate how much subsidy can be applied to a service
 * Uses database function for calculation
 */
export async function calculateAvailableSubsidy(
  routeId: number,
  serviceCost: number,
  _maxSurplusPercent: number = 50, // TODO: Use for configurable thresholds
  _maxServicePercent: number = 30 // TODO: Use for configurable thresholds
): Promise<SubsidyCalculation> {
  try {
    // Use database function to calculate threshold with smoothing
    const result = await pool.query(`
      SELECT * FROM calculate_threshold_with_smoothing($1, $2, $3)
    `, [routeId, serviceCost, 20.00]); // Using £20 as default max acceptable fare

    const calculation = result.rows[0];

    return {
      raw_cost: parseFloat(calculation.raw_cost),
      available_subsidy: parseFloat(calculation.subsidy_applied),
      subsidy_applied: parseFloat(calculation.subsidy_applied),
      effective_cost: parseFloat(calculation.effective_cost),
      minimum_passengers_needed: calculation.minimum_passengers,
      break_even_fare: parseFloat(calculation.break_even_fare),
      subsidy_source: 'route_surplus_pool'
    };
  } catch (error: any) {
    logger.error('Error calculating subsidy', { error: error.message, routeId, serviceCost });
    throw error;
  }
}

/**
 * Apply subsidy to a service
 * Records transaction and updates pool balance
 */
export async function applySubsidy(
  routeId: number,
  tenantId: number,
  timetableId: number,
  serviceDate: string,
  costId: number,
  subsidyAmount: number,
  passengerCount: number,
  serviceCost: number
): Promise<{ success: boolean; transaction_id: number }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current pool
    const poolResult = await client.query(`
      SELECT * FROM section22_route_surplus_pool
      WHERE route_id = $1 AND tenant_id = $2
      FOR UPDATE
    `, [routeId, tenantId]);

    if (poolResult.rows.length === 0) {
      throw new Error('Surplus pool not found');
    }

    const currentPool = poolResult.rows[0];
    const poolBalanceBefore = currentPool.available_for_subsidy;

    // Check if enough surplus available
    if (poolBalanceBefore < subsidyAmount) {
      throw new Error(`Insufficient surplus: need ${subsidyAmount}, have ${poolBalanceBefore}`);
    }

    // Update pool balance
    const newBalance = poolBalanceBefore - subsidyAmount;
    await client.query(`
      UPDATE section22_route_surplus_pool
      SET
        available_for_subsidy = $1,
        accumulated_surplus = accumulated_surplus - $2,
        total_subsidized_services = total_subsidized_services + 1,
        last_subsidy_date = $3,
        last_updated = CURRENT_TIMESTAMP
      WHERE pool_id = $4
    `, [newBalance, subsidyAmount, serviceDate, currentPool.pool_id]);

    // Record transaction
    const transactionResult = await client.query(`
      INSERT INTO section22_surplus_transactions (
        pool_id, route_id, tenant_id, timetable_id, service_date, cost_id,
        transaction_type, amount, pool_balance_before, pool_balance_after,
        passenger_count, service_cost, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING transaction_id
    `, [
      currentPool.pool_id,
      routeId,
      tenantId,
      timetableId,
      serviceDate,
      costId,
      'subsidy_applied',
      subsidyAmount,
      poolBalanceBefore,
      newBalance,
      passengerCount,
      serviceCost,
      `Subsidy applied to lower minimum passengers from ${Math.ceil(serviceCost / 20)} to ${Math.ceil((serviceCost - subsidyAmount) / 20)}`
    ]);

    // Update service cost record
    await client.query(`
      UPDATE section22_service_costs
      SET
        subsidy_applied = $1,
        subsidy_source = 'route_surplus_pool',
        effective_cost = total_cost - $1,
        net_surplus = total_revenue - (total_cost - $1)
      WHERE cost_id = $2
    `, [subsidyAmount, costId]);

    await client.query('COMMIT');

    logger.info('Subsidy applied successfully', {
      routeId,
      timetableId,
      subsidyAmount,
      newBalance,
      transaction_id: transactionResult.rows[0].transaction_id
    });

    return {
      success: true,
      transaction_id: transactionResult.rows[0].transaction_id
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error applying subsidy', { error: error.message, routeId, timetableId });
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// SURPLUS ALLOCATION
// ============================================================================

/**
 * Allocate surplus from a profitable service
 * Distributes to reserves, business costs, dividends, and pool
 */
export async function allocateSurplus(
  routeId: number,
  tenantId: number,
  timetableId: number,
  serviceDate: string,
  costId: number,
  grossSurplus: number,
  reservesPercent: number = 20,
  businessPercent: number = 30,
  dividendPercent: number = 50
): Promise<SurplusAllocationResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Calculate allocations
    const toReserves = grossSurplus * (reservesPercent / 100);
    const toBusiness = grossSurplus * (businessPercent / 100);
    const toDividends = grossSurplus * (dividendPercent / 100);

    // Remaining goes to pool for future subsidies
    const toPool = grossSurplus - toReserves - toBusiness - toDividends;

    // Get/create pool
    const poolResult = await client.query(`
      SELECT * FROM section22_route_surplus_pool
      WHERE route_id = $1 AND tenant_id = $2
      FOR UPDATE
    `, [routeId, tenantId]);

    let currentPool;
    if (poolResult.rows.length === 0) {
      // Initialize pool
      const initResult = await client.query(`
        INSERT INTO section22_route_surplus_pool (route_id, tenant_id)
        VALUES ($1, $2)
        RETURNING *
      `, [routeId, tenantId]);
      currentPool = initResult.rows[0];
    } else {
      currentPool = poolResult.rows[0];
    }

    const poolBalanceBefore = currentPool.available_for_subsidy;

    // Update pool with allocations
    await client.query(`
      UPDATE section22_route_surplus_pool
      SET
        accumulated_surplus = accumulated_surplus + $1,
        available_for_subsidy = available_for_subsidy + $2,
        reserved_for_reserves = reserved_for_reserves + $3,
        reserved_for_business = reserved_for_business + $4,
        total_distributed_dividends = total_distributed_dividends + $5,
        total_profitable_services = total_profitable_services + 1,
        last_surplus_date = $6,
        last_updated = CURRENT_TIMESTAMP
      WHERE pool_id = $7
    `, [
      grossSurplus,
      toPool,
      toReserves,
      toBusiness,
      toDividends,
      serviceDate,
      currentPool.pool_id
    ]);

    // Record transaction for surplus added
    await client.query(`
      INSERT INTO section22_surplus_transactions (
        pool_id, route_id, tenant_id, timetable_id, service_date, cost_id,
        transaction_type, amount, pool_balance_before, pool_balance_after,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      currentPool.pool_id,
      routeId,
      tenantId,
      timetableId,
      serviceDate,
      costId,
      'surplus_added',
      grossSurplus,
      poolBalanceBefore,
      poolBalanceBefore + toPool,
      `Surplus allocated: ${reservesPercent}% reserves (£${toReserves.toFixed(2)}), ${businessPercent}% business (£${toBusiness.toFixed(2)}), ${dividendPercent}% dividends (£${toDividends.toFixed(2)}), pool (£${toPool.toFixed(2)})`
    ]);

    await client.query('COMMIT');

    const allocationBreakdown = [
      `${reservesPercent}% to reserves: £${toReserves.toFixed(2)}`,
      `${businessPercent}% to business: £${toBusiness.toFixed(2)}`,
      `${dividendPercent}% to dividends: £${toDividends.toFixed(2)}`,
      `Remainder to pool: £${toPool.toFixed(2)}`
    ];

    logger.info('Surplus allocated successfully', {
      routeId,
      timetableId,
      grossSurplus,
      allocationBreakdown
    });

    return {
      gross_surplus: grossSurplus,
      to_reserves: toReserves,
      to_business: toBusiness,
      to_dividends: toDividends,
      to_pool: toPool,
      allocation_breakdown: allocationBreakdown
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error allocating surplus', { error: error.message, routeId, timetableId });
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// TRANSACTION HISTORY
// ============================================================================

/**
 * Get surplus transaction history for a route
 */
export async function getSurplusTransactions(
  routeId: number,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT
        t.*,
        tt.departure_time,
        r.route_number
      FROM section22_surplus_transactions t
      LEFT JOIN section22_timetables tt ON t.timetable_id = tt.timetable_id
      LEFT JOIN section22_bus_routes r ON t.route_id = r.route_id
      WHERE t.route_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [routeId, limit, offset]);

    return result.rows;
  } catch (error: any) {
    logger.error('Error fetching surplus transactions', { error: error.message, routeId });
    throw error;
  }
}

/**
 * Get surplus statistics for a route
 */
export async function getSurplusStatistics(routeId: number): Promise<any> {
  try {
    const result = await pool.query(`
      SELECT
        pool_id,
        accumulated_surplus,
        available_for_subsidy,
        reserved_for_reserves,
        reserved_for_business,
        total_distributed_dividends,
        total_services_run,
        total_profitable_services,
        total_subsidized_services,
        CASE
          WHEN total_services_run > 0
          THEN ROUND((total_profitable_services::DECIMAL / total_services_run) * 100, 1)
          ELSE 0
        END as profitability_rate,
        lifetime_total_revenue,
        lifetime_total_costs,
        lifetime_gross_surplus
      FROM section22_route_surplus_pool
      WHERE route_id = $1
    `, [routeId]);

    return result.rows[0] || null;
  } catch (error: any) {
    logger.error('Error fetching surplus statistics', { error: error.message, routeId });
    throw error;
  }
}

export default {
  initializeSurplusPool,
  getSurplusPool,
  calculateAvailableSubsidy,
  applySubsidy,
  allocateSurplus,
  getSurplusTransactions,
  getSurplusStatistics
};
