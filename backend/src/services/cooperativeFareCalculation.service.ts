/**
 * Cooperative Fare Calculation Service
 *
 * Implements break-even, capacity-based fare pricing for Section 22 bus services.
 * Core principle: The more passengers share the journey, the cheaper the fare
 * (as fixed costs are divided among more people).
 *
 * UK Minimum Wage Rates (April 2025):
 * - £12.21/hour (aged 21+) - National Living Wage
 * - £10.00/hour (aged 18-20)
 * - £7.55/hour (under 18 or apprentice)
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface DriverWageRate {
  age_category: '21_plus' | '18_to_20' | 'under_18' | 'apprentice';
  hourly_rate: number;
  effective_date: Date;
}

export interface JourneyCostBreakdown {
  // Driver costs
  driver_hourly_rate: number;
  journey_duration_hours: number;
  driver_cost: number;

  // Vehicle costs
  distance_miles: number;
  fuel_cost_per_mile: number;
  fuel_cost: number;

  depreciation_per_journey: number;
  insurance_per_journey: number;
  maintenance_per_journey: number;

  // Administrative
  admin_overhead_percentage: number;
  admin_overhead: number;

  // Total
  total_fixed_cost: number;
}

export interface FareQuote {
  // Journey details
  route_name: string;
  origin: string;
  destination: string;
  distance_miles: number;
  duration_minutes: number;

  // Cost breakdown
  cost_breakdown: JourneyCostBreakdown;

  // Capacity-based fares
  vehicle_capacity: number;
  current_passengers: number;
  fare_at_current_capacity: number;

  // Fare tiers (show how fare drops as more book)
  fare_tiers: FareTier[];

  // Viability
  minimum_viable_passengers: number;
  is_viable: boolean;
  break_even_passengers: number;

  // Cooperative surplus (if applicable)
  surplus_allocation?: SurplusAllocation;
}

export interface FareTier {
  passenger_count: number;
  fare_per_passenger: number;
  total_revenue: number;
  is_break_even: boolean;
  is_current: boolean;
  is_minimum_viable: boolean;
}

export interface SurplusAllocation {
  total_surplus: number;
  to_reserves: number;
  to_commonwealth: number;
  to_dividends: number;
}

export interface RouteViabilityAnalysis {
  proposal_id: number;
  route_name: string;

  // Pledged passengers
  total_pledges: number;
  average_willing_to_pay: number;

  // Cost analysis
  estimated_cost_per_journey: number;
  fare_at_pledged_capacity: number;

  // Viability verdict
  is_financially_viable: boolean;
  monthly_revenue: number;
  monthly_cost: number;
  monthly_surplus_or_deficit: number;

  // Recommendations
  minimum_passengers_needed: number;
  recommended_fare: number;
  viability_status: 'highly_viable' | 'viable' | 'marginal' | 'not_viable';
}

// ============================================================================
// UK MINIMUM WAGE RATES (April 2025)
// ============================================================================

export const UK_MINIMUM_WAGE_2025: Record<string, DriverWageRate> = {
  '21_plus': {
    age_category: '21_plus',
    hourly_rate: 12.21,
    effective_date: new Date('2025-04-01')
  },
  '18_to_20': {
    age_category: '18_to_20',
    hourly_rate: 10.00,
    effective_date: new Date('2025-04-01')
  },
  'under_18': {
    age_category: 'under_18',
    hourly_rate: 7.55,
    effective_date: new Date('2025-04-01')
  },
  'apprentice': {
    age_category: 'apprentice',
    hourly_rate: 7.55,
    effective_date: new Date('2025-04-01')
  }
};

// ============================================================================
// DEFAULT COST ASSUMPTIONS
// ============================================================================

export const DEFAULT_COSTS = {
  // Fuel (diesel bus, ~6 miles per liter, £1.45/liter)
  fuel_cost_per_mile: 0.15, // £0.15 per mile

  // Vehicle depreciation (£10k minibus, 5-year life, 20k miles/year)
  depreciation_monthly: 200, // £200/month
  depreciation_per_journey: 5.00, // Assuming 40 services/month

  // Insurance
  insurance_monthly: 150, // £150/month
  insurance_per_journey: 3.75, // £150 ÷ 40 services

  // Maintenance reserve
  maintenance_monthly: 100, // £100/month
  maintenance_per_journey: 2.50, // £100 ÷ 40 services

  // Admin overhead (office costs, admin staff, software, etc.)
  admin_overhead_percentage: 0.10, // 10% of direct costs

  // Minimum viable fare
  minimum_fare: 1.00, // Never charge less than £1.00 (even at full capacity)
  maximum_fare: 10.00, // Cap at £10.00 (even with 1 passenger)
};

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate the total fixed cost for a single bus journey
 */
export function calculateJourneyCost(
  distanceMiles: number,
  durationMinutes: number,
  driverHourlyRate: number = UK_MINIMUM_WAGE_2025['21_plus'].hourly_rate,
  customCosts?: Partial<typeof DEFAULT_COSTS>
): JourneyCostBreakdown {
  const costs = { ...DEFAULT_COSTS, ...customCosts };
  const durationHours = durationMinutes / 60;

  // Driver wages
  const driverCost = driverHourlyRate * durationHours;

  // Fuel
  const fuelCost = distanceMiles * costs.fuel_cost_per_mile;

  // Vehicle costs
  const depreciationCost = costs.depreciation_per_journey;
  const insuranceCost = costs.insurance_per_journey;
  const maintenanceCost = costs.maintenance_per_journey;

  // Subtotal (before admin)
  const subtotal = driverCost + fuelCost + depreciationCost + insuranceCost + maintenanceCost;

  // Admin overhead
  const adminOverhead = subtotal * costs.admin_overhead_percentage;

  // Total fixed cost
  const totalFixedCost = subtotal + adminOverhead;

  return {
    driver_hourly_rate: driverHourlyRate,
    journey_duration_hours: durationHours,
    driver_cost: parseFloat(driverCost.toFixed(2)),

    distance_miles: distanceMiles,
    fuel_cost_per_mile: costs.fuel_cost_per_mile,
    fuel_cost: parseFloat(fuelCost.toFixed(2)),

    depreciation_per_journey: depreciationCost,
    insurance_per_journey: insuranceCost,
    maintenance_per_journey: maintenanceCost,

    admin_overhead_percentage: costs.admin_overhead_percentage,
    admin_overhead: parseFloat(adminOverhead.toFixed(2)),

    total_fixed_cost: parseFloat(totalFixedCost.toFixed(2))
  };
}

/**
 * Calculate fare per passenger based on current passenger count
 * Core cooperative principle: More passengers = lower fare
 */
export function calculateFarePerPassenger(
  totalFixedCost: number,
  passengerCount: number,
  minimumFare: number = DEFAULT_COSTS.minimum_fare,
  maximumFare: number = DEFAULT_COSTS.maximum_fare
): number {
  if (passengerCount === 0) return maximumFare;

  const farePerPassenger = totalFixedCost / passengerCount;

  // Apply min/max bounds
  return parseFloat(Math.max(minimumFare, Math.min(maximumFare, farePerPassenger)).toFixed(2));
}

/**
 * Generate fare tiers showing how fare drops as more passengers book
 */
export function generateFareTiers(
  totalFixedCost: number,
  vehicleCapacity: number,
  currentPassengers: number
): FareTier[] {
  const tiers: FareTier[] = [];

  // Generate tiers at key capacity levels
  const tierSteps = [1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32];
  const relevantSteps = tierSteps.filter(step => step <= vehicleCapacity);

  // Ensure current passenger count is included
  if (!relevantSteps.includes(currentPassengers) && currentPassengers > 0) {
    relevantSteps.push(currentPassengers);
    relevantSteps.sort((a, b) => a - b);
  }

  for (const passengerCount of relevantSteps) {
    const farePerPassenger = calculateFarePerPassenger(totalFixedCost, passengerCount);
    const totalRevenue = farePerPassenger * passengerCount;
    const isBreakEven = totalRevenue >= totalFixedCost;

    tiers.push({
      passenger_count: passengerCount,
      fare_per_passenger: farePerPassenger,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      is_break_even: isBreakEven,
      is_current: passengerCount === currentPassengers,
      is_minimum_viable: passengerCount >= 8 // Typically 8+ is viable
    });
  }

  return tiers;
}

/**
 * Calculate minimum number of passengers needed to break even
 */
export function calculateBreakEvenPassengers(
  totalFixedCost: number,
  maximumFare: number = DEFAULT_COSTS.maximum_fare
): number {
  return Math.ceil(totalFixedCost / maximumFare);
}

/**
 * Calculate minimum passengers for "reasonable" fare (e.g., £3.00)
 */
export function calculateMinimumViablePassengers(
  totalFixedCost: number,
  targetFare: number = 3.00
): number {
  return Math.ceil(totalFixedCost / targetFare);
}

/**
 * Calculate cooperative surplus allocation
 * If revenue > costs, surplus is split: 50% reserves, 30% commonwealth, 20% dividends
 */
export function calculateSurplusAllocation(
  totalRevenue: number,
  totalCost: number,
  organizationType: string = 'cooperative_commonwealth'
): SurplusAllocation | null {
  const surplus = totalRevenue - totalCost;

  if (surplus <= 0) return null; // No surplus

  if (organizationType === 'cooperative_commonwealth') {
    return {
      total_surplus: parseFloat(surplus.toFixed(2)),
      to_reserves: parseFloat((surplus * 0.50).toFixed(2)),      // 50%
      to_commonwealth: parseFloat((surplus * 0.30).toFixed(2)),  // 30%
      to_dividends: parseFloat((surplus * 0.20).toFixed(2))      // 20%
    };
  } else if (organizationType === 'cooperative') {
    return {
      total_surplus: parseFloat(surplus.toFixed(2)),
      to_reserves: parseFloat((surplus * 0.60).toFixed(2)),      // 60%
      to_commonwealth: 0,
      to_dividends: parseFloat((surplus * 0.40).toFixed(2))      // 40%
    };
  } else {
    // Charity/CIC - all surplus to reserves
    return {
      total_surplus: parseFloat(surplus.toFixed(2)),
      to_reserves: surplus,
      to_commonwealth: 0,
      to_dividends: 0
    };
  }
}

// ============================================================================
// MAIN FARE QUOTE GENERATOR
// ============================================================================

/**
 * Generate complete fare quote for a bus journey
 * Shows current fare and how it changes with more passengers
 */
export function generateFareQuote(
  routeName: string,
  origin: string,
  destination: string,
  distanceMiles: number,
  durationMinutes: number,
  vehicleCapacity: number,
  currentPassengers: number,
  driverHourlyRate?: number,
  organizationType?: string
): FareQuote {
  logger.info('Generating fare quote', {
    routeName,
    distanceMiles,
    durationMinutes,
    vehicleCapacity,
    currentPassengers
  });

  // Calculate journey costs
  const costBreakdown = calculateJourneyCost(distanceMiles, durationMinutes, driverHourlyRate);

  // Calculate fare at current capacity
  const fareAtCurrentCapacity = calculateFarePerPassenger(
    costBreakdown.total_fixed_cost,
    Math.max(currentPassengers, 1) // Avoid division by zero
  );

  // Generate fare tiers
  const fareTiers = generateFareTiers(
    costBreakdown.total_fixed_cost,
    vehicleCapacity,
    currentPassengers
  );

  // Calculate viability
  const minimumViablePassengers = calculateMinimumViablePassengers(costBreakdown.total_fixed_cost);
  const breakEvenPassengers = calculateBreakEvenPassengers(costBreakdown.total_fixed_cost);
  const isViable = currentPassengers >= minimumViablePassengers;

  // Calculate surplus (if at full capacity)
  let surplusAllocation: SurplusAllocation | undefined;
  if (currentPassengers >= vehicleCapacity) {
    const totalRevenue = fareAtCurrentCapacity * currentPassengers;
    surplusAllocation = calculateSurplusAllocation(
      totalRevenue,
      costBreakdown.total_fixed_cost,
      organizationType
    ) || undefined;
  }

  return {
    route_name: routeName,
    origin,
    destination,
    distance_miles: distanceMiles,
    duration_minutes: durationMinutes,

    cost_breakdown: costBreakdown,

    vehicle_capacity: vehicleCapacity,
    current_passengers: currentPassengers,
    fare_at_current_capacity: fareAtCurrentCapacity,

    fare_tiers: fareTiers,

    minimum_viable_passengers: minimumViablePassengers,
    is_viable: isViable,
    break_even_passengers: breakEvenPassengers,

    surplus_allocation: surplusAllocation
  };
}

// ============================================================================
// ROUTE PROPOSAL VIABILITY ANALYSIS
// ============================================================================

/**
 * Analyze viability of a customer route proposal
 * Used by admin to decide whether to approve proposal
 */
export function analyzeRouteProposalViability(
  proposalId: number,
  routeName: string,
  distanceMiles: number,
  durationMinutes: number,
  totalPledges: number,
  averageWillingToPay: number,
  servicesPerMonth: number = 20, // Assuming weekday service (Mon-Fri)
  driverHourlyRate?: number
): RouteViabilityAnalysis {
  logger.info('Analyzing route proposal viability', {
    proposalId,
    routeName,
    totalPledges,
    averageWillingToPay
  });

  // Calculate cost per journey
  const costBreakdown = calculateJourneyCost(distanceMiles, durationMinutes, driverHourlyRate);
  const costPerJourney = costBreakdown.total_fixed_cost;

  // Calculate fare at pledged capacity
  const fareAtPledgedCapacity = calculateFarePerPassenger(costPerJourney, totalPledges);

  // Calculate minimum passengers needed for £3.00 fare (reasonable price)
  const minimumPassengersNeeded = calculateMinimumViablePassengers(costPerJourney, 3.00);

  // Monthly revenue and cost projections
  const monthlyRevenue = averageWillingToPay * totalPledges * servicesPerMonth;
  const monthlyCost = costPerJourney * servicesPerMonth;
  const monthlySurplusOrDeficit = monthlyRevenue - monthlyCost;

  // Viability verdict
  let viabilityStatus: 'highly_viable' | 'viable' | 'marginal' | 'not_viable';
  if (monthlySurplusOrDeficit >= 500) {
    viabilityStatus = 'highly_viable'; // £500+ monthly surplus
  } else if (monthlySurplusOrDeficit >= 0) {
    viabilityStatus = 'viable'; // Break-even or small surplus
  } else if (monthlySurplusOrDeficit >= -200) {
    viabilityStatus = 'marginal'; // Small loss, might work with subsidy
  } else {
    viabilityStatus = 'not_viable'; // Significant loss
  }

  const isFinanciallyViable = viabilityStatus === 'highly_viable' || viabilityStatus === 'viable';

  return {
    proposal_id: proposalId,
    route_name: routeName,

    total_pledges: totalPledges,
    average_willing_to_pay: parseFloat(averageWillingToPay.toFixed(2)),

    estimated_cost_per_journey: costPerJourney,
    fare_at_pledged_capacity: fareAtPledgedCapacity,

    is_financially_viable: isFinanciallyViable,
    monthly_revenue: parseFloat(monthlyRevenue.toFixed(2)),
    monthly_cost: parseFloat(monthlyCost.toFixed(2)),
    monthly_surplus_or_deficit: parseFloat(monthlySurplusOrDeficit.toFixed(2)),

    minimum_passengers_needed: minimumPassengersNeeded,
    recommended_fare: fareAtPledgedCapacity,
    viability_status: viabilityStatus
  };
}

// ============================================================================
// DYNAMIC FARE PREVIEW (for booking pages)
// ============================================================================

/**
 * Calculate how fare will change if N more passengers book
 * Used to show incentives: "Fare drops to £2.50 if 3 more people book!"
 */
export function calculateFareWithAdditionalPassengers(
  totalFixedCost: number,
  currentPassengers: number,
  additionalPassengers: number
): { current_fare: number; new_fare: number; savings: number } {
  const currentFare = calculateFarePerPassenger(totalFixedCost, currentPassengers);
  const newPassengerCount = currentPassengers + additionalPassengers;
  const newFare = calculateFarePerPassenger(totalFixedCost, newPassengerCount);
  const savings = parseFloat((currentFare - newFare).toFixed(2));

  return {
    current_fare: currentFare,
    new_fare: newFare,
    savings: savings
  };
}

/**
 * Get driver wage rate based on age
 */
export function getDriverWageRate(age: number, isApprentice: boolean = false): DriverWageRate {
  if (isApprentice) {
    return UK_MINIMUM_WAGE_2025['apprentice'];
  } else if (age >= 21) {
    return UK_MINIMUM_WAGE_2025['21_plus'];
  } else if (age >= 18) {
    return UK_MINIMUM_WAGE_2025['18_to_20'];
  } else {
    return UK_MINIMUM_WAGE_2025['under_18'];
  }
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  calculateJourneyCost,
  calculateFarePerPassenger,
  generateFareTiers,
  calculateBreakEvenPassengers,
  calculateMinimumViablePassengers,
  calculateSurplusAllocation,
  generateFareQuote,
  analyzeRouteProposalViability,
  calculateFareWithAdditionalPassengers,
  getDriverWageRate,
  UK_MINIMUM_WAGE_2025,
  DEFAULT_COSTS
};
