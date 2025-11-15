/**
 * Cooperative Fare Transparency Types
 *
 * Models transparent, cost-based pricing where:
 * - Customers see actual trip costs (wages, fuel, vehicle, overhead)
 * - Fares decrease as more passengers book (cost-sharing)
 * - Surplus above break-even goes to reserves, dividends, and cooperative commonwealth
 */

/**
 * Cost Breakdown for a Bus Trip
 */
export interface TripCostBreakdown {
  // Direct Operating Costs
  driverWages: number;           // Hourly rate × trip duration
  fuelCost: number;              // Distance × fuel price per mile
  vehicleDepreciation: number;   // Per-mile depreciation or lease allocation

  // Allocated Costs
  insuranceAllocation: number;   // Trip's share of annual insurance
  maintenanceAllocation: number; // Trip's share of maintenance budget
  overheadAllocation: number;    // Administrative costs, permits, compliance

  // Total
  totalTripCost: number;         // Sum of all above

  // Calculation metadata
  tripDistanceMiles: number;
  tripDurationHours: number;
  vehicleCapacity: number;       // Total seats on bus
  calculatedAt: string;          // ISO timestamp
}

/**
 * Dynamic Fare Calculation Based on Passenger Count
 */
export interface DynamicFareStructure {
  tripCostBreakdown: TripCostBreakdown;

  // Current booking status
  currentPassengers: number;
  availableSeats: number;

  // Break-even point
  breakEvenPassengers: number;   // Minimum passengers to cover costs
  breakEvenFarePerPerson: number; // Cost ÷ breakEvenPassengers

  // Current fare (cost-sharing)
  currentFarePerPerson: number;  // totalCost ÷ currentPassengers

  // Fare progression (what-if scenarios)
  fareAtCapacity: number;        // If bus fills completely
  savingsVsBreakEven: number;    // How much cheaper than break-even

  // Surplus if above break-even
  surplusAmount?: number;        // If currentPassengers > breakEvenPassengers
  surplusAllocation?: SurplusAllocation;
}

/**
 * Allocation of Surplus Above Break-Even
 */
export interface SurplusAllocation {
  totalSurplus: number;

  // Allocation percentages (should sum to 100%)
  businessReservePercent: number;      // Building capital for growth
  dividendPercent: number;             // Returns to members
  cooperativeCommonwealthPercent: number; // Contribution to broader movement

  // Actual amounts
  toBusinessReserve: number;
  toDividends: number;
  toCooperativeCommonwealth: number;

  // Context
  allocationDate: string;
  tripId?: number;
  routeId?: number;
}

/**
 * Fare Tier (Adult, Child, Concessionary, etc.)
 */
export interface FareTier {
  tierType: 'adult' | 'child' | 'concessionary' | 'wheelchair' | 'companion';
  multiplier: number;            // % of base fare (e.g., 0.5 for child)
  description: string;
  requiresProof?: boolean;       // Concessionary pass verification
}

/**
 * Real-Time Fare Display for Booking
 */
export interface FareQuote {
  tripId: number;
  routeId: number;
  serviceName: string;
  serviceDate: string;
  departureTime: string;

  // Cost transparency
  costBreakdown: TripCostBreakdown;

  // Dynamic pricing
  dynamicFare: DynamicFareStructure;

  // Passenger-specific quote
  passengerTier: FareTier;
  quotedFare: number;            // After applying tier multiplier

  // Incentive messaging
  fareReductionMessage?: string; // "Book now! Fare drops to £X.XX when 2 more passengers join"
  communityImpactMessage?: string; // "This trip has generated £X.XX for the cooperative commonwealth"

  validUntil: string;            // Quote expiry (fares change as bookings come in)
}

/**
 * Cooperative Commonwealth Fund Tracking
 */
export interface CooperativeCommonwealthFund {
  fundId: number;
  tenantId: number;

  // Totals
  totalContributed: number;
  totalDistributed: number;
  currentBalance: number;

  // Contributions
  contributionHistory: CommonwealthContribution[];

  // Distributions (to broader cooperative movement)
  distributionHistory: CommonwealthDistribution[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CommonwealthContribution {
  contributionId: number;
  tripId?: number;
  routeId?: number;
  amount: number;
  surplusTotal: number;          // Original surplus that generated this
  percentage: number;            // What % of surplus went to commonwealth
  contributedAt: string;
}

export interface CommonwealthDistribution {
  distributionId: number;
  recipientOrganization: string; // E.g., "UK Co-operative Federation"
  amount: number;
  purpose: string;               // Why this distribution was made
  distributedAt: string;
}

/**
 * Fare Calculation Settings (Tenant Configuration)
 */
export interface FareCalculationSettings {
  tenantId: number;

  // Cost inputs
  driverHourlyRate: number;
  fuelPricePerMile: number;
  vehicleDepreciationPerMile: number;
  annualInsuranceCost: number;
  annualMaintenanceBudget: number;
  monthlyOverheadCosts: number;

  // Break-even targets
  defaultBreakEvenOccupancy: number; // % of seats (e.g., 60% = 12/20 seats)

  // Surplus allocation percentages
  businessReservePercent: number;
  dividendPercent: number;
  cooperativeCommonwealthPercent: number;

  // Fare tier multipliers
  fareTiers: FareTier[];

  // Transparency settings
  showCostBreakdown: boolean;
  showSurplusAllocation: boolean;
  showCommonwealthImpact: boolean;

  updatedAt: string;
}

/**
 * API Request/Response Types
 */
export interface CalculateFareRequest {
  routeId: number;
  timetableId?: number;
  tripDistanceMiles: number;
  tripDurationHours: number;
  vehicleCapacity: number;
  currentPassengers: number;
  passengerTier?: 'adult' | 'child' | 'concessionary' | 'wheelchair' | 'companion';
}

export interface CalculateFareResponse {
  fareQuote: FareQuote;
  message: string;
}

export interface UpdateFareSettingsRequest extends Partial<FareCalculationSettings> {}

export interface GetCommonwealthFundResponse {
  fund: CooperativeCommonwealthFund;
  recentContributions: CommonwealthContribution[];
  totalImpact: {
    allTimeContributions: number;
    monthlyAverage: number;
    tripsContributed: number;
  };
}
