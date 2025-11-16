/**
 * Dynamic Pricing Service for Section 22 Bus Services
 *
 * Calculates real-time pricing based on:
 * - Service costs (driver, fuel, vehicle, overhead)
 * - Current booking count
 * - Available surplus for subsidy
 * - Member vs non-member pricing
 * - Configured pricing model
 */

import { query, queryOne } from '../config/database';
import { logger } from '../utils/logger';
import { calculateServiceCostWithSurplus } from './intelligentCostCalculator.service';
import { getSurplusPool } from './surplusManagement.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DynamicPriceCalculation {
  service_info: {
    timetable_id: number;
    service_date: string;
    route_id: number;
    route_number: string;
    pricing_model: string;
  };

  cost_breakdown: {
    total_cost: number;
    subsidy_applied: number;
    effective_cost: number;
  };

  booking_info: {
    current_bookings: number;
    total_capacity: number;
    minimum_passengers_needed: number;
    minimum_with_subsidy: number;
    spaces_remaining: number;
  };

  pricing: {
    base_price_per_passenger: number;
    member_price: number;
    non_member_price: number;
    non_member_surcharge_percent: number;
    floor_reached: boolean;
    is_viable: boolean;
  };

  surplus_info?: {
    pool_balance: number;
    subsidy_available: number;
    passengers_saved: number;
  };

  message: string;
}

// ============================================================================
// PRICE CALCULATION
// ============================================================================

/**
 * Calculate current dynamic price for a service
 */
export async function calculateCurrentPrice(
  tenantId: number,
  timetableId: number,
  serviceDate: string
): Promise<DynamicPriceCalculation> {
  try {
    // Step 1: Get timetable and route details
    const timetable = await queryOne(
      `SELECT
        t.timetable_id,
        t.route_id,
        t.total_seats,
        t.wheelchair_spaces,
        r.route_number,
        r.route_name,
        r.origin_point,
        r.destination_point,
        r.pricing_model,
        r.minimum_fare_floor,
        r.maximum_acceptable_fare,
        r.non_member_surcharge_percent,
        r.use_surplus_smoothing,
        r.max_surplus_subsidy_percent,
        r.max_service_subsidy_percent
       FROM section22_timetables t
       JOIN section22_bus_routes r ON t.route_id = r.route_id
       WHERE t.tenant_id = $1 AND t.timetable_id = $2`,
      [tenantId, timetableId]
    );

    if (!timetable) {
      throw new Error('Timetable not found');
    }

    // Step 2: Get current booking count
    const bookingCount = await queryOne(
      `SELECT COUNT(*) as count
       FROM section22_bus_bookings
       WHERE tenant_id = $1
         AND timetable_id = $2
         AND service_date = $3
         AND booking_status IN ('confirmed', 'boarded')`,
      [tenantId, timetableId, serviceDate]
    );

    const currentBookings = parseInt(bookingCount?.count || '0');

    // Step 3: Get or calculate service cost
    let serviceCost = await queryOne(
      `SELECT * FROM section22_service_costs
       WHERE tenant_id = $1 AND timetable_id = $2 AND service_date = $3`,
      [tenantId, timetableId, serviceDate]
    );

    let totalCost = 0;
    let subsidyApplied = 0;
    let effectiveCost = 0;

    if (!serviceCost) {
      // Calculate cost using intelligent cost calculator
      const costCalc = await calculateServiceCostWithSurplus(
        {
          route_id: timetable.route_id,
          origin: timetable.origin_point,
          destination: timetable.destination_point,
          service_date: serviceDate,
          departure_time: timetable.departure_time || '08:00',
          apply_surplus_smoothing: timetable.use_surplus_smoothing
        },
        {
          max_surplus_percent: timetable.max_surplus_subsidy_percent,
          max_service_percent: timetable.max_service_subsidy_percent
        }
      );

      totalCost = costCalc.cost_breakdown.total_cost;
      subsidyApplied = costCalc.surplus_smoothing?.subsidy_available || 0;
      effectiveCost = costCalc.surplus_smoothing?.effective_cost || totalCost;
    } else {
      totalCost = parseFloat(serviceCost.total_cost);
      subsidyApplied = parseFloat(serviceCost.subsidy_applied || '0');
      effectiveCost = parseFloat(serviceCost.effective_cost || serviceCost.total_cost);
    }

    // Step 4: Calculate price per passenger
    const minimumFloor = parseFloat(timetable.minimum_fare_floor);
    const maxAcceptableFare = parseFloat(timetable.maximum_acceptable_fare);

    let basePricePerPassenger = 0;
    let floorReached = false;

    if (currentBookings > 0) {
      const calculatedPrice = effectiveCost / currentBookings;
      if (calculatedPrice < minimumFloor) {
        basePricePerPassenger = minimumFloor;
        floorReached = true;
      } else {
        basePricePerPassenger = calculatedPrice;
      }
    } else {
      basePricePerPassenger = maxAcceptableFare;
    }

    // Step 5: Apply member/non-member pricing
    const nonMemberSurchargePercent = parseFloat(timetable.non_member_surcharge_percent || '0');
    const memberPrice = Math.round(basePricePerPassenger * 100) / 100;
    const nonMemberPrice = Math.round(basePricePerPassenger * (1 + nonMemberSurchargePercent / 100) * 100) / 100;

    // Step 6: Calculate viability
    const minimumPassengersNeeded = Math.ceil(totalCost / maxAcceptableFare);
    const minimumWithSubsidy = Math.ceil(effectiveCost / maxAcceptableFare);
    const isViable = currentBookings >= minimumWithSubsidy;

    // Step 7: Get surplus pool info if smoothing enabled
    let surplusInfo;
    if (timetable.use_surplus_smoothing) {
      const pool = await getSurplusPool(timetable.route_id);
      if (pool) {
        surplusInfo = {
          pool_balance: parseFloat(pool.available_for_subsidy),
          subsidy_available: subsidyApplied,
          passengers_saved: minimumPassengersNeeded - minimumWithSubsidy
        };
      }
    }

    // Step 8: Generate user-friendly message
    let message = '';
    if (isViable) {
      if (floorReached) {
        message = `Service is viable! Price has reached minimum floor of £${memberPrice.toFixed(2)}. Additional passengers generate surplus.`;
      } else {
        message = `Service is viable! Current price: £${memberPrice.toFixed(2)} per passenger.`;
      }
    } else {
      const passengersNeeded = minimumWithSubsidy - currentBookings;
      message = `Need ${passengersNeeded} more ${passengersNeeded === 1 ? 'passenger' : 'passengers'} to reach break-even.`;

      if (surplusInfo && surplusInfo.passengers_saved > 0) {
        message += ` Surplus saved ${surplusInfo.passengers_saved} passengers!`;
      }
    }

    return {
      service_info: {
        timetable_id: timetable.timetable_id,
        service_date: serviceDate,
        route_id: timetable.route_id,
        route_number: timetable.route_number,
        pricing_model: timetable.pricing_model
      },
      cost_breakdown: {
        total_cost: totalCost,
        subsidy_applied: subsidyApplied,
        effective_cost: effectiveCost
      },
      booking_info: {
        current_bookings: currentBookings,
        total_capacity: timetable.total_seats + timetable.wheelchair_spaces,
        minimum_passengers_needed: minimumPassengersNeeded,
        minimum_with_subsidy: minimumWithSubsidy,
        spaces_remaining: (timetable.total_seats + timetable.wheelchair_spaces) - currentBookings
      },
      pricing: {
        base_price_per_passenger: basePricePerPassenger,
        member_price: memberPrice,
        non_member_price: nonMemberPrice,
        non_member_surcharge_percent: nonMemberSurchargePercent,
        floor_reached: floorReached,
        is_viable: isViable
      },
      surplus_info: surplusInfo,
      message
    };
  } catch (error: any) {
    logger.error('Error calculating dynamic price', {
      error: error.message,
      tenantId,
      timetableId,
      serviceDate
    });
    throw error;
  }
}

/**
 * Get price for a new booking (determines member vs non-member)
 */
export async function getPriceForBooking(
  tenantId: number,
  timetableId: number,
  serviceDate: string,
  customerId?: number
): Promise<{ price: number; is_member: boolean; pricing_details: DynamicPriceCalculation }> {
  try {
    // Calculate current price
    const pricingDetails = await calculateCurrentPrice(tenantId, timetableId, serviceDate);

    // Check if customer is a cooperative member
    let isMember = false;
    if (customerId) {
      const memberCheck = await queryOne(
        `SELECT member_id, is_active
         FROM section22_cooperative_members
         WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true`,
        [tenantId, customerId]
      );
      isMember = !!memberCheck;
    }

    // Determine price
    const price = isMember
      ? pricingDetails.pricing.member_price
      : pricingDetails.pricing.non_member_price;

    return {
      price,
      is_member: isMember,
      pricing_details: pricingDetails
    };
  } catch (error: any) {
    logger.error('Error getting booking price', {
      error: error.message,
      tenantId,
      timetableId,
      customerId
    });
    throw error;
  }
}

export default {
  calculateCurrentPrice,
  getPriceForBooking
};
