/**
 * Cooperative Fare Calculation Routes
 *
 * API endpoints for transparent, cost-based pricing
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { FareCalculationService } from '../services/fareCalculation.service';
import { OrganizationalConfigService } from '../services/organizationalConfig.service';

const router = express.Router();
const fareService = new FareCalculationService(pool);
const orgConfigService = new OrganizationalConfigService(pool);

  /**
   * GET /api/tenants/:tenantId/organizational-config
   * Get organizational configuration (type, cooperative model, surplus rules)
   */
  router.get('/tenants/:tenantId/organizational-config', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;

      const config = await orgConfigService.getOrganizationalConfig(Number(tenantId));
      const description = orgConfigService.getOrganizationDescription(config);
      const serviceConfig = orgConfigService.getServiceConfig(config);

      res.json({
        config,
        description,
        serviceConfig,
      });
    } catch (error: any) {
      console.error('Error fetching organizational config:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to fetch organizational configuration',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * GET /api/tenants/:tenantId/fare-settings
   * Get fare calculation settings for tenant
   */
  router.get('/tenants/:tenantId/fare-settings', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;

      const settings = await fareService.getFareSettings(Number(tenantId));

      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching fare settings:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to fetch fare settings',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * PUT /api/tenants/:tenantId/fare-settings
   * Update fare calculation settings
   */
  router.put('/tenants/:tenantId/fare-settings', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const settings = req.body;

      const client = await pool.connect();
      try {
        const result = await client.query(
          `INSERT INTO fare_calculation_settings (
            tenant_id, driver_hourly_rate, fuel_price_per_mile, vehicle_depreciation_per_mile,
            annual_insurance_cost, annual_maintenance_budget, monthly_overhead_costs,
            default_break_even_occupancy, business_reserve_percent, dividend_percent,
            cooperative_commonwealth_percent, show_cost_breakdown, show_surplus_allocation,
            show_commonwealth_impact, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          ON CONFLICT (tenant_id)
          DO UPDATE SET
            driver_hourly_rate = EXCLUDED.driver_hourly_rate,
            fuel_price_per_mile = EXCLUDED.fuel_price_per_mile,
            vehicle_depreciation_per_mile = EXCLUDED.vehicle_depreciation_per_mile,
            annual_insurance_cost = EXCLUDED.annual_insurance_cost,
            annual_maintenance_budget = EXCLUDED.annual_maintenance_budget,
            monthly_overhead_costs = EXCLUDED.monthly_overhead_costs,
            default_break_even_occupancy = EXCLUDED.default_break_even_occupancy,
            business_reserve_percent = EXCLUDED.business_reserve_percent,
            dividend_percent = EXCLUDED.dividend_percent,
            cooperative_commonwealth_percent = EXCLUDED.cooperative_commonwealth_percent,
            show_cost_breakdown = EXCLUDED.show_cost_breakdown,
            show_surplus_allocation = EXCLUDED.show_surplus_allocation,
            show_commonwealth_impact = EXCLUDED.show_commonwealth_impact,
            updated_at = NOW()
          RETURNING *`,
          [
            tenantId,
            settings.driverHourlyRate,
            settings.fuelPricePerMile,
            settings.vehicleDepreciationPerMile,
            settings.annualInsuranceCost,
            settings.annualMaintenanceBudget,
            settings.monthlyOverheadCosts,
            settings.defaultBreakEvenOccupancy,
            settings.businessReservePercent,
            settings.dividendPercent,
            settings.cooperativeCommonwealthPercent,
            settings.showCostBreakdown ?? true,
            settings.showSurplusAllocation ?? true,
            settings.showCommonwealthImpact ?? true,
          ]
        );

        res.json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Error updating fare settings:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to update fare settings',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * POST /api/tenants/:tenantId/calculate-fare
   * Calculate fare quote for a trip
   */
  router.post('/tenants/:tenantId/calculate-fare', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const {
        routeId,
        tripDistanceMiles,
        tripDurationHours,
        vehicleCapacity,
        currentPassengers,
        passengerTier = 'adult',
      } = req.body;

      const fareQuote = await fareService.calculateFareQuote(
        Number(tenantId),
        routeId,
        tripDistanceMiles,
        tripDurationHours,
        vehicleCapacity,
        currentPassengers,
        passengerTier
      );

      res.json({
        fareQuote,
        message: 'Fare calculated successfully',
      });
    } catch (error: any) {
      console.error('Error calculating fare:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to calculate fare',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * GET /api/tenants/:tenantId/commonwealth-fund
   * Get cooperative commonwealth fund summary
   */
  router.get('/tenants/:tenantId/commonwealth-fund', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;

      const summary = await fareService.getCommonwealthFundSummary(Number(tenantId));

      res.json(summary);
    } catch (error: any) {
      console.error('Error fetching commonwealth fund:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to fetch commonwealth fund',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * POST /api/tenants/:tenantId/commonwealth-contribution
   * Record a contribution to the commonwealth fund
   */
  router.post('/tenants/:tenantId/commonwealth-contribution', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { tripId, routeId, surplusAmount, percentage } = req.body;

      const result = await fareService.recordCommonwealthContribution(
        Number(tenantId),
        tripId,
        routeId,
        surplusAmount,
        percentage
      );

      res.json(result);
    } catch (error: any) {
      console.error('Error recording commonwealth contribution:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to record contribution',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * GET /api/tenants/:tenantId/fare-tiers
   * Get fare tiers for tenant
   */
  router.get('/tenants/:tenantId/fare-tiers', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT * FROM fare_tiers WHERE tenant_id = $1 AND is_active = true ORDER BY tier_type`,
          [tenantId]
        );

        res.json(result.rows);
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Error fetching fare tiers:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Failed to fetch fare tiers',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

export default router;
