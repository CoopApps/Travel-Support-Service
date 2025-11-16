/**
 * Cooperative Fare Calculation Service
 *
 * Implements transparent, cost-based pricing where:
 * - Customers see real trip costs
 * - Fares decrease as more passengers join (solidarity pricing)
 * - Surplus flows to reserves, dividends, and cooperative commonwealth
 */

import { Pool } from 'pg';
import { OrganizationalConfigService } from './organizationalConfig.service';

interface FareCalculationSettings {
  tenantId: number;
  driverHourlyRate: number;
  fuelPricePerMile: number;
  vehicleDepreciationPerMile: number;
  annualInsuranceCost: number;
  annualMaintenanceBudget: number;
  monthlyOverheadCosts: number;
  defaultBreakEvenOccupancy: number;
  businessReservePercent: number;
  dividendPercent: number;
  cooperativeCommonwealthPercent: number;
}

interface TripCostBreakdown {
  driverWages: number;
  fuelCost: number;
  vehicleDepreciation: number;
  insuranceAllocation: number;
  maintenanceAllocation: number;
  overheadAllocation: number;
  totalTripCost: number;
  tripDistanceMiles: number;
  tripDurationHours: number;
  vehicleCapacity: number;
  calculatedAt: string;
}

interface DynamicFareStructure {
  tripCostBreakdown: TripCostBreakdown;
  currentPassengers: number;
  availableSeats: number;
  breakEvenPassengers: number;
  breakEvenFarePerPerson: number;
  currentFarePerPerson: number;
  fareAtCapacity: number;
  savingsVsBreakEven: number;
  surplusAmount?: number;
  surplusAllocation?: SurplusAllocation;
}

interface SurplusAllocation {
  totalSurplus: number;
  businessReservePercent: number;
  dividendPercent: number;
  cooperativeCommonwealthPercent: number;
  toBusinessReserve: number;
  toDividends: number;
  toCooperativeCommonwealth: number;
  allocationDate: string;
}

export class FareCalculationService {
  private pool: Pool;
  private orgConfigService: OrganizationalConfigService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.orgConfigService = new OrganizationalConfigService(pool);
  }

  /**
   * Get fare calculation settings for tenant
   * Auto-initializes based on organizational type if not configured
   */
  async getFareSettings(tenantId: number): Promise<FareCalculationSettings> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM fare_calculation_settings WHERE tenant_id = $1`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        // Initialize settings based on organizational config
        await this.orgConfigService.initializeFareSettings(tenantId);

        // Fetch the newly initialized settings
        const newResult = await client.query(
          `SELECT * FROM fare_calculation_settings WHERE tenant_id = $1`,
          [tenantId]
        );

        if (newResult.rows.length > 0) {
          return newResult.rows[0];
        }

        // Fallback to default settings if initialization failed
        return this.getDefaultSettings(tenantId);
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Default fare calculation settings
   */
  private getDefaultSettings(tenantId: number): FareCalculationSettings {
    return {
      tenantId,
      driverHourlyRate: 15.00,                    // £15/hour
      fuelPricePerMile: 0.18,                     // £0.18/mile (diesel)
      vehicleDepreciationPerMile: 0.12,           // £0.12/mile
      annualInsuranceCost: 3000,                  // £3,000/year
      annualMaintenanceBudget: 2400,              // £2,400/year (£200/month)
      monthlyOverheadCosts: 500,                  // £500/month admin costs
      defaultBreakEvenOccupancy: 0.60,            // 60% occupancy to break even
      businessReservePercent: 40,                 // 40% of surplus to reserves
      dividendPercent: 40,                        // 40% of surplus to dividends
      cooperativeCommonwealthPercent: 20,         // 20% to cooperative commonwealth
    };
  }

  /**
   * Calculate trip cost breakdown
   */
  calculateTripCost(
    tripDistanceMiles: number,
    tripDurationHours: number,
    vehicleCapacity: number,
    settings: FareCalculationSettings
  ): TripCostBreakdown {
    // Direct costs
    const driverWages = settings.driverHourlyRate * tripDurationHours;
    const fuelCost = settings.fuelPricePerMile * tripDistanceMiles;
    const vehicleDepreciation = settings.vehicleDepreciationPerMile * tripDistanceMiles;

    // Allocated costs (per trip)
    // Assume 200 trips per month average
    const avgTripsPerMonth = 200;
    const insuranceAllocation = (settings.annualInsuranceCost / 12) / avgTripsPerMonth;
    const maintenanceAllocation = (settings.annualMaintenanceBudget / 12) / avgTripsPerMonth;
    const overheadAllocation = settings.monthlyOverheadCosts / avgTripsPerMonth;

    const totalTripCost =
      driverWages +
      fuelCost +
      vehicleDepreciation +
      insuranceAllocation +
      maintenanceAllocation +
      overheadAllocation;

    return {
      driverWages: Number(driverWages.toFixed(2)),
      fuelCost: Number(fuelCost.toFixed(2)),
      vehicleDepreciation: Number(vehicleDepreciation.toFixed(2)),
      insuranceAllocation: Number(insuranceAllocation.toFixed(2)),
      maintenanceAllocation: Number(maintenanceAllocation.toFixed(2)),
      overheadAllocation: Number(overheadAllocation.toFixed(2)),
      totalTripCost: Number(totalTripCost.toFixed(2)),
      tripDistanceMiles,
      tripDurationHours,
      vehicleCapacity,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate dynamic fare structure based on passenger count
   */
  calculateDynamicFare(
    costBreakdown: TripCostBreakdown,
    currentPassengers: number,
    settings: FareCalculationSettings
  ): DynamicFareStructure {
    const { totalTripCost, vehicleCapacity } = costBreakdown;

    // Break-even calculation
    const breakEvenPassengers = Math.ceil(vehicleCapacity * settings.defaultBreakEvenOccupancy);
    const breakEvenFarePerPerson = totalTripCost / breakEvenPassengers;

    // Current fare (cost-sharing among current passengers)
    const currentFarePerPerson = currentPassengers > 0
      ? totalTripCost / currentPassengers
      : breakEvenFarePerPerson;

    // Fare if bus fills to capacity
    const fareAtCapacity = totalTripCost / vehicleCapacity;

    // Savings compared to break-even
    const savingsVsBreakEven = breakEvenFarePerPerson - currentFarePerPerson;

    // Available seats
    const availableSeats = vehicleCapacity - currentPassengers;

    // Calculate surplus if above break-even
    let surplusAmount: number | undefined;
    let surplusAllocation: SurplusAllocation | undefined;

    if (currentPassengers > breakEvenPassengers) {
      const totalRevenue = breakEvenFarePerPerson * currentPassengers;
      surplusAmount = totalRevenue - totalTripCost;

      surplusAllocation = {
        totalSurplus: Number(surplusAmount.toFixed(2)),
        businessReservePercent: settings.businessReservePercent,
        dividendPercent: settings.dividendPercent,
        cooperativeCommonwealthPercent: settings.cooperativeCommonwealthPercent,
        toBusinessReserve: Number((surplusAmount * settings.businessReservePercent / 100).toFixed(2)),
        toDividends: Number((surplusAmount * settings.dividendPercent / 100).toFixed(2)),
        toCooperativeCommonwealth: Number((surplusAmount * settings.cooperativeCommonwealthPercent / 100).toFixed(2)),
        allocationDate: new Date().toISOString(),
      };
    }

    return {
      tripCostBreakdown: costBreakdown,
      currentPassengers,
      availableSeats,
      breakEvenPassengers,
      breakEvenFarePerPerson: Number(breakEvenFarePerPerson.toFixed(2)),
      currentFarePerPerson: Number(currentFarePerPerson.toFixed(2)),
      fareAtCapacity: Number(fareAtCapacity.toFixed(2)),
      savingsVsBreakEven: Number(savingsVsBreakEven.toFixed(2)),
      surplusAmount: surplusAmount ? Number(surplusAmount.toFixed(2)) : undefined,
      surplusAllocation,
    };
  }

  /**
   * Calculate fare quote for a specific trip and passenger tier
   */
  async calculateFareQuote(
    tenantId: number,
    _routeId: number,
    tripDistanceMiles: number,
    tripDurationHours: number,
    vehicleCapacity: number,
    currentPassengers: number,
    passengerTier: 'adult' | 'child' | 'concessionary' | 'wheelchair' | 'companion' = 'adult'
  ) {
    const settings = await this.getFareSettings(tenantId);

    const costBreakdown = this.calculateTripCost(
      tripDistanceMiles,
      tripDurationHours,
      vehicleCapacity,
      settings
    );

    const dynamicFare = this.calculateDynamicFare(
      costBreakdown,
      currentPassengers,
      settings
    );

    // Apply tier multiplier
    const tierMultipliers = {
      adult: 1.0,
      child: 0.5,
      concessionary: 0.5,
      wheelchair: 1.0,
      companion: 0.0, // Free companion for wheelchair users
    };

    const multiplier = tierMultipliers[passengerTier];
    const quotedFare = Number((dynamicFare.currentFarePerPerson * multiplier).toFixed(2));

    // Generate incentive messaging
    let fareReductionMessage: string | undefined;
    if (currentPassengers < vehicleCapacity && currentPassengers < dynamicFare.breakEvenPassengers + 5) {
      const nextPassengerFare = costBreakdown.totalTripCost / (currentPassengers + 1);
      fareReductionMessage = `Book now! Your fare drops to £${(nextPassengerFare * multiplier).toFixed(2)} when one more passenger joins`;
    }

    let communityImpactMessage: string | undefined;
    if (dynamicFare.surplusAllocation) {
      communityImpactMessage = `This trip is generating £${dynamicFare.surplusAllocation.toCooperativeCommonwealth.toFixed(2)} for the cooperative commonwealth`;
    }

    return {
      costBreakdown,
      dynamicFare,
      passengerTier,
      quotedFare,
      fareReductionMessage,
      communityImpactMessage,
      validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Valid for 15 minutes
    };
  }

  /**
   * Record surplus contribution to cooperative commonwealth
   */
  async recordCommonwealthContribution(
    tenantId: number,
    tripId: number,
    routeId: number,
    surplusAmount: number,
    percentage: number
  ) {
    const client = await this.pool.connect();
    try {
      const contributionAmount = surplusAmount * (percentage / 100);

      await client.query(
        `INSERT INTO cooperative_commonwealth_contributions
         (tenant_id, trip_id, route_id, amount, surplus_total, percentage, contributed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [tenantId, tripId, routeId, contributionAmount, surplusAmount, percentage]
      );

      // Update commonwealth fund balance
      await client.query(
        `INSERT INTO cooperative_commonwealth_fund (tenant_id, total_contributed, current_balance, updated_at)
         VALUES ($1, $2, $2, NOW())
         ON CONFLICT (tenant_id)
         DO UPDATE SET
           total_contributed = cooperative_commonwealth_fund.total_contributed + $2,
           current_balance = cooperative_commonwealth_fund.current_balance + $2,
           updated_at = NOW()`,
        [tenantId, contributionAmount]
      );

      return { success: true, contributionAmount };
    } finally {
      client.release();
    }
  }

  /**
   * Get commonwealth fund summary for tenant
   */
  async getCommonwealthFundSummary(tenantId: number) {
    const client = await this.pool.connect();
    try {
      const fundResult = await client.query(
        `SELECT * FROM cooperative_commonwealth_fund WHERE tenant_id = $1`,
        [tenantId]
      );

      const contributionsResult = await client.query(
        `SELECT * FROM cooperative_commonwealth_contributions
         WHERE tenant_id = $1
         ORDER BY contributed_at DESC
         LIMIT 50`,
        [tenantId]
      );

      const statsResult = await client.query(
        `SELECT
           COUNT(*) as trips_contributed,
           COALESCE(AVG(amount), 0) as monthly_average
         FROM cooperative_commonwealth_contributions
         WHERE tenant_id = $1
         AND contributed_at >= NOW() - INTERVAL '30 days'`,
        [tenantId]
      );

      return {
        fund: fundResult.rows[0] || { totalContributed: 0, currentBalance: 0 },
        recentContributions: contributionsResult.rows,
        stats: statsResult.rows[0],
      };
    } finally {
      client.release();
    }
  }
}
