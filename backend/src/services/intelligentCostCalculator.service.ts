/**
 * Intelligent Cost Calculator Service for Section 22 Bus Services
 *
 * Combines:
 * - Google Maps API (distance, duration, traffic-aware routing)
 * - AI/ML cost prediction (historical patterns, seasonal adjustments)
 * - Real-time operational cost tracking
 * - Cooperative pricing model integration
 *
 * Used for:
 * - Pre-calculating service costs before bookings open
 * - Dynamic pricing as bookings accumulate
 * - Surplus distribution calculations
 * - Break-even analysis
 */

import { calculateDistance } from './routeOptimization.service';
import { logger } from '../utils/logger';
import { calculateAvailableSubsidy } from './surplusManagement.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ServiceCostCalculation {
  timetable_id: number;
  service_date: string;
  route_info: {
    route_number: string;
    origin: string;
    destination: string;
    distance_miles: number;
    duration_minutes: number;
  };

  cost_breakdown: {
    driver_wages: number;
    fuel_cost: number;
    vehicle_depreciation: number;
    vehicle_maintenance_allocation: number;
    insurance_allocation: number;
    admin_overhead: number;
    other_costs: number;
    total_cost: number;
  };

  pricing_info: {
    pricing_model: string;
    minimum_fare_floor: number;
    maximum_acceptable_fare: number;
    minimum_passengers_needed: number;
    minimum_passengers_with_subsidy?: number;
  };

  current_bookings: number;
  calculated_price_per_passenger: number;
  is_viable: boolean;

  surplus_smoothing?: {
    subsidy_available: number;
    effective_cost: number;
    passengers_saved: number;
    break_even_fare_with_subsidy: number;
  };

  ai_insights?: {
    predicted_demand: number;
    confidence_level: number;
    seasonal_adjustment_factor: number;
    traffic_delay_probability: number;
    recommended_minimum_passengers: number;
  };
}

interface CostCalculationParams {
  route_id: number;
  origin: string;
  destination: string;
  service_date: string;
  departure_time: string;
  driver_id?: number;
  vehicle_id?: number;
  use_ai_prediction?: boolean;
}

// ============================================================================
// COST COMPONENT CALCULATORS
// ============================================================================

/**
 * Calculate driver wages for a service
 * Uses Google Maps duration + buffer for delays
 */
export async function calculateDriverWages(
  origin: string,
  destination: string,
  departureTime: string,
  driverHourlyRate: number = 12.21
): Promise<{ duration_hours: number; driver_cost: number; ai_buffer_applied: boolean }> {
  try {
    // Get real-time duration from Google Maps
    const distanceData = await calculateDistance(
      { address: origin },
      { address: destination }
    );

    if (!distanceData) {
      // Fallback to estimated duration
      logger.warn('Google Maps unavailable, using estimated duration');
      const estimatedHours = 1.5; // Fallback estimate
      return {
        duration_hours: estimatedHours,
        driver_cost: estimatedHours * driverHourlyRate,
        ai_buffer_applied: false
      };
    }

    const durationHours = distanceData.duration / 3600; // Convert seconds to hours

    // AI: Add buffer for potential delays based on time of day
    const hour = parseInt(departureTime.split(':')[0]);
    let delayBuffer = 0;

    // Peak hours: add 20% buffer
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
      delayBuffer = 0.20;
      logger.info('AI: Peak hour detected, adding 20% delay buffer');
    }
    // Off-peak: add 10% buffer
    else {
      delayBuffer = 0.10;
    }

    const adjustedDuration = durationHours * (1 + delayBuffer);

    return {
      duration_hours: adjustedDuration,
      driver_cost: adjustedDuration * driverHourlyRate,
      ai_buffer_applied: true
    };
  } catch (error: any) {
    logger.error('Error calculating driver wages', { error: error.message });
    // Fallback
    return {
      duration_hours: 1.5,
      driver_cost: 1.5 * driverHourlyRate,
      ai_buffer_applied: false
    };
  }
}

/**
 * Calculate fuel cost using Google Maps distance
 * AI: Adjusts for seasonal variations and fuel price trends
 */
export async function calculateFuelCost(
  origin: string,
  destination: string,
  serviceDate: string,
  fuelPricePerLiter: number = 1.45,
  vehicleMpg: number = 35
): Promise<{ distance_miles: number; fuel_cost: number; seasonal_adjustment: number }> {
  try {
    // Get accurate distance from Google Maps
    const distanceData = await calculateDistance(
      { address: origin },
      { address: destination }
    );

    if (!distanceData) {
      logger.warn('Google Maps unavailable, using estimated distance');
      return {
        distance_miles: 20, // Fallback
        fuel_cost: 20 / vehicleMpg * fuelPricePerLiter * 4.546, // Convert to liters
        seasonal_adjustment: 1.0
      };
    }

    const distanceMiles = distanceData.distance / 1609.34; // Convert meters to miles

    // AI: Seasonal adjustment (winter = worse MPG)
    const month = new Date(serviceDate).getMonth();
    let seasonalFactor = 1.0;

    if (month >= 11 || month <= 2) { // Dec, Jan, Feb - winter
      seasonalFactor = 1.15; // 15% more fuel in winter
      logger.info('AI: Winter season detected, increasing fuel cost by 15%');
    } else if (month >= 6 && month <= 8) { // Summer - better MPG
      seasonalFactor = 0.95; // 5% less fuel in summer
    }

    const adjustedMpg = vehicleMpg / seasonalFactor;
    const litersUsed = (distanceMiles / adjustedMpg) * 4.546; // MPG to liters
    const fuelCost = litersUsed * fuelPricePerLiter;

    return {
      distance_miles: distanceMiles,
      fuel_cost: fuelCost,
      seasonal_adjustment: seasonalFactor
    };
  } catch (error: any) {
    logger.error('Error calculating fuel cost', { error: error.message });
    return {
      distance_miles: 20,
      fuel_cost: 8.00,
      seasonal_adjustment: 1.0
    };
  }
}

/**
 * Calculate vehicle operating costs (depreciation, maintenance, insurance)
 * Based on mileage and vehicle type
 */
export function calculateVehicleOperatingCosts(
  distanceMiles: number,
  vehicleType: 'minibus' | 'bus' = 'minibus'
): {
  depreciation: number;
  maintenance: number;
  insurance_per_service: number;
} {
  // Cost per mile estimates (UK bus/minibus industry averages)
  const depreciationPerMile = vehicleType === 'bus' ? 0.50 : 0.30;
  const maintenancePerMile = vehicleType === 'bus' ? 0.25 : 0.15;

  // Insurance allocated per service (annual cost / estimated services per year)
  const annualInsurance = vehicleType === 'bus' ? 3000 : 1800;
  const estimatedServicesPerYear = 250; // ~5 services/week
  const insurancePerService = annualInsurance / estimatedServicesPerYear;

  return {
    depreciation: distanceMiles * depreciationPerMile,
    maintenance: distanceMiles * maintenancePerMile,
    insurance_per_service: insurancePerService
  };
}

/**
 * Calculate admin overhead
 */
export function calculateAdminOverhead(
  baseCost: number,
  overheadPercent: number = 15
): number {
  return baseCost * (overheadPercent / 100);
}

// ============================================================================
// AI DEMAND PREDICTION
// ============================================================================

/**
 * AI: Predict passenger demand based on historical patterns
 * (Simplified version - would use ML model in production)
 */
export function predictPassengerDemand(
  serviceDate: string,
  departureTime: string,
  historicalAverages?: { weekday_avg: number; weekend_avg: number }
): {
  predicted_demand: number;
  confidence_level: number;
  reasoning: string[];
} {
  const date = new Date(serviceDate);
  const dayOfWeek = date.getDay();
  const hour = parseInt(departureTime.split(':')[0]);
  const reasoning: string[] = [];

  let baseDemand = 12; // Default estimate
  let confidence = 0.5;

  // Use historical data if available
  if (historicalAverages) {
    baseDemand = dayOfWeek === 0 || dayOfWeek === 6
      ? historicalAverages.weekend_avg
      : historicalAverages.weekday_avg;
    confidence = 0.8;
    reasoning.push(`Based on historical ${dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday'} average`);
  }

  // Weekday vs weekend adjustment
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    baseDemand *= 0.6; // 40% fewer passengers on weekends
    reasoning.push('Weekend service - typically lower demand');
  }

  // Time of day adjustment
  if (hour >= 7 && hour <= 9) {
    baseDemand *= 1.3; // Morning commute peak
    reasoning.push('Morning peak hours - increased demand expected');
    confidence = Math.min(confidence + 0.1, 0.95);
  } else if (hour >= 16 && hour <= 18) {
    baseDemand *= 1.2; // Evening commute peak
    reasoning.push('Evening peak hours - increased demand expected');
  } else if (hour < 7 || hour > 20) {
    baseDemand *= 0.5; // Very early or late - low demand
    reasoning.push('Off-peak hours - reduced demand expected');
  }

  // Month/seasonal adjustment
  const month = date.getMonth();
  if (month >= 11 || month <= 2) {
    baseDemand *= 0.9; // Slightly lower in winter
    reasoning.push('Winter season - small reduction in demand');
  } else if (month === 7 || month === 8) {
    baseDemand *= 0.8; // Lower in summer holidays
    reasoning.push('Summer holiday period - reduced commuter demand');
  }

  return {
    predicted_demand: Math.round(baseDemand),
    confidence_level: confidence,
    reasoning
  };
}

// ============================================================================
// MAIN COST CALCULATOR
// ============================================================================

/**
 * Calculate complete service cost with AI enhancements
 */
export async function calculateServiceCost(
  params: CostCalculationParams,
  config?: {
    driver_hourly_rate?: number;
    fuel_price_per_liter?: number;
    vehicle_mpg?: number;
    vehicle_type?: 'minibus' | 'bus';
    overhead_percent?: number;
  }
): Promise<ServiceCostCalculation> {
  const {
    origin,
    destination,
    service_date,
    departure_time,
    use_ai_prediction = true
  } = params;

  logger.info('Calculating service cost', { params });

  // Step 1: Driver wages (uses Google Maps duration)
  const driverCost = await calculateDriverWages(
    origin,
    destination,
    departure_time,
    config?.driver_hourly_rate
  );

  // Step 2: Fuel cost (uses Google Maps distance + AI seasonal adjustment)
  const fuelCost = await calculateFuelCost(
    origin,
    destination,
    service_date,
    config?.fuel_price_per_liter,
    config?.vehicle_mpg
  );

  // Step 3: Vehicle operating costs
  const vehicleCosts = calculateVehicleOperatingCosts(
    fuelCost.distance_miles,
    config?.vehicle_type || 'minibus'
  );

  // Step 4: Base costs
  const baseCost =
    driverCost.driver_cost +
    fuelCost.fuel_cost +
    vehicleCosts.depreciation +
    vehicleCosts.maintenance +
    vehicleCosts.insurance_per_service;

  // Step 5: Admin overhead
  const adminOverhead = calculateAdminOverhead(baseCost, config?.overhead_percent);

  // Step 6: Total cost
  const totalCost = baseCost + adminOverhead;

  // Step 7: AI demand prediction (if enabled)
  let aiInsights;
  if (use_ai_prediction) {
    const demandPrediction = predictPassengerDemand(service_date, departure_time);

    aiInsights = {
      predicted_demand: demandPrediction.predicted_demand,
      confidence_level: demandPrediction.confidence_level,
      seasonal_adjustment_factor: fuelCost.seasonal_adjustment,
      traffic_delay_probability: driverCost.ai_buffer_applied ? 0.20 : 0.10,
      recommended_minimum_passengers: Math.ceil(totalCost / 15) // Assume £15 max acceptable fare
    };
  }

  // Step 8: Calculate minimum passengers needed
  const maxAcceptableFare = 20.00; // Could come from route config
  const minimumPassengersNeeded = Math.ceil(totalCost / maxAcceptableFare);

  return {
    timetable_id: 0, // Will be set when saving to DB
    service_date,
    route_info: {
      route_number: 'TBD',
      origin,
      destination,
      distance_miles: fuelCost.distance_miles,
      duration_minutes: Math.round(driverCost.duration_hours * 60)
    },
    cost_breakdown: {
      driver_wages: driverCost.driver_cost,
      fuel_cost: fuelCost.fuel_cost,
      vehicle_depreciation: vehicleCosts.depreciation,
      vehicle_maintenance_allocation: vehicleCosts.maintenance,
      insurance_allocation: vehicleCosts.insurance_per_service,
      admin_overhead: adminOverhead,
      other_costs: 0,
      total_cost: totalCost
    },
    pricing_info: {
      pricing_model: 'dynamic_with_floor',
      minimum_fare_floor: 1.00,
      maximum_acceptable_fare: maxAcceptableFare,
      minimum_passengers_needed: minimumPassengersNeeded
    },
    current_bookings: 0,
    calculated_price_per_passenger: maxAcceptableFare,
    is_viable: false,
    ai_insights: aiInsights
  };
}

/**
 * Calculate service cost WITH surplus smoothing applied
 * This is the preferred method when route has surplus smoothing enabled
 */
export async function calculateServiceCostWithSurplus(
  params: CostCalculationParams & { apply_surplus_smoothing?: boolean },
  config?: {
    driver_hourly_rate?: number;
    fuel_price_per_liter?: number;
    vehicle_mpg?: number;
    vehicle_type?: 'minibus' | 'bus';
    overhead_percent?: number;
    max_surplus_percent?: number;
    max_service_percent?: number;
  }
): Promise<ServiceCostCalculation> {
  const { route_id, apply_surplus_smoothing = true } = params;

  // Step 1: Calculate base cost (without surplus)
  const baseCostCalc = await calculateServiceCost(params, config);

  // Step 2: If surplus smoothing not enabled or no route_id, return base calculation
  if (!apply_surplus_smoothing || !route_id) {
    return baseCostCalc;
  }

  try {
    // Step 3: Calculate available subsidy from surplus pool
    const subsidyCalc = await calculateAvailableSubsidy(
      route_id,
      baseCostCalc.cost_breakdown.total_cost,
      config?.max_surplus_percent || 50,
      config?.max_service_percent || 30
    );

    // Step 4: Calculate effective cost after subsidy
    const effectiveCost = subsidyCalc.effective_cost;
    const minimumPassengersWithSubsidy = subsidyCalc.minimum_passengers_needed;
    const passengersSaved = baseCostCalc.pricing_info.minimum_passengers_needed - minimumPassengersWithSubsidy;

    // Step 5: Return enhanced calculation with surplus smoothing data
    return {
      ...baseCostCalc,
      pricing_info: {
        ...baseCostCalc.pricing_info,
        minimum_passengers_with_subsidy: minimumPassengersWithSubsidy
      },
      surplus_smoothing: {
        subsidy_available: subsidyCalc.subsidy_applied,
        effective_cost: effectiveCost,
        passengers_saved: passengersSaved,
        break_even_fare_with_subsidy: subsidyCalc.break_even_fare
      }
    };
  } catch (error: any) {
    logger.warn('Surplus smoothing calculation failed, returning base cost', {
      error: error.message,
      route_id
    });
    // If surplus calculation fails, return base calculation
    return baseCostCalc;
  }
}

/**
 * Calculate dynamic price as bookings accumulate
 */
export function calculateDynamicPrice(
  totalCost: number,
  currentBookings: number,
  minimumFloor: number = 1.00
): {
  price_per_passenger: number;
  floor_applied: boolean;
  surplus_per_passenger: number;
} {
  if (currentBookings === 0) {
    return {
      price_per_passenger: 0,
      floor_applied: false,
      surplus_per_passenger: 0
    };
  }

  const calculatedPrice = totalCost / currentBookings;
  const floorApplied = calculatedPrice < minimumFloor;
  const finalPrice = Math.max(calculatedPrice, minimumFloor);

  const surplusPerPassenger = floorApplied
    ? finalPrice - calculatedPrice
    : 0;

  return {
    price_per_passenger: Math.round(finalPrice * 100) / 100, // Round to 2 decimals
    floor_applied: floorApplied,
    surplus_per_passenger: surplusPerPassenger
  };
}

/**
 * Calculate dynamic price with surplus smoothing applied
 * Shows both regular price and subsidized price
 */
export function calculateDynamicPriceWithSubsidy(
  rawCost: number,
  subsidyApplied: number,
  currentBookings: number,
  minimumFloor: number = 1.00
): {
  without_subsidy: {
    price_per_passenger: number;
    floor_applied: boolean;
  };
  with_subsidy: {
    price_per_passenger: number;
    floor_applied: boolean;
    subsidy_per_passenger: number;
    savings_per_passenger: number;
  };
  subsidy_total: number;
} {
  const effectiveCost = rawCost - subsidyApplied;

  // Calculate price without subsidy
  const withoutSubsidy = calculateDynamicPrice(rawCost, currentBookings, minimumFloor);

  // Calculate price with subsidy
  const withSubsidy = calculateDynamicPrice(effectiveCost, currentBookings, minimumFloor);

  const subsidyPerPassenger = currentBookings > 0 ? subsidyApplied / currentBookings : 0;
  const savingsPerPassenger = withoutSubsidy.price_per_passenger - withSubsidy.price_per_passenger;

  return {
    without_subsidy: {
      price_per_passenger: withoutSubsidy.price_per_passenger,
      floor_applied: withoutSubsidy.floor_applied
    },
    with_subsidy: {
      price_per_passenger: withSubsidy.price_per_passenger,
      floor_applied: withSubsidy.floor_applied,
      subsidy_per_passenger: Math.round(subsidyPerPassenger * 100) / 100,
      savings_per_passenger: Math.round(savingsPerPassenger * 100) / 100
    },
    subsidy_total: subsidyApplied
  };
}

export default {
  calculateServiceCost,
  calculateServiceCostWithSurplus,
  calculateDynamicPrice,
  calculateDynamicPriceWithSubsidy,
  calculateDriverWages,
  calculateFuelCost,
  calculateVehicleOperatingCosts,
  predictPassengerDemand
};
