/**
 * Migration: Cooperative Fare Transparency System
 *
 * Creates tables for:
 * - Transparent cost-based fare calculations
 * - Dynamic pricing as passengers join
 * - Surplus allocation (reserves, dividends, cooperative commonwealth)
 * - Commonwealth fund tracking
 */

-- Fare Calculation Settings (per tenant)
CREATE TABLE IF NOT EXISTS fare_calculation_settings (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Cost inputs
  driver_hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
  fuel_price_per_mile DECIMAL(10, 4) NOT NULL DEFAULT 0.18,
  vehicle_depreciation_per_mile DECIMAL(10, 4) NOT NULL DEFAULT 0.12,
  annual_insurance_cost DECIMAL(10, 2) NOT NULL DEFAULT 3000.00,
  annual_maintenance_budget DECIMAL(10, 2) NOT NULL DEFAULT 2400.00,
  monthly_overhead_costs DECIMAL(10, 2) NOT NULL DEFAULT 500.00,

  -- Break-even targets
  default_break_even_occupancy DECIMAL(5, 2) NOT NULL DEFAULT 0.60, -- 60%

  -- Surplus allocation percentages (must sum to 100)
  business_reserve_percent DECIMAL(5, 2) NOT NULL DEFAULT 40.00,
  dividend_percent DECIMAL(5, 2) NOT NULL DEFAULT 40.00,
  cooperative_commonwealth_percent DECIMAL(5, 2) NOT NULL DEFAULT 20.00,

  -- Transparency settings
  show_cost_breakdown BOOLEAN DEFAULT true,
  show_surplus_allocation BOOLEAN DEFAULT true,
  show_commonwealth_impact BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint to ensure allocation percentages sum to 100
ALTER TABLE fare_calculation_settings
ADD CONSTRAINT allocation_percentages_sum_100
CHECK (business_reserve_percent + dividend_percent + cooperative_commonwealth_percent = 100);

-- Cooperative Commonwealth Fund (per tenant)
CREATE TABLE IF NOT EXISTS cooperative_commonwealth_fund (
  fund_id SERIAL PRIMARY KEY,
  tenant_id INTEGER UNIQUE NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Totals
  total_contributed DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_distributed DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commonwealth Contributions (from surplus)
CREATE TABLE IF NOT EXISTS cooperative_commonwealth_contributions (
  contribution_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  trip_id INTEGER,  -- Reference to completed trip (future: link to section22_timetables)
  route_id INTEGER, -- Reference to bus route

  -- Contribution details
  amount DECIMAL(10, 2) NOT NULL,
  surplus_total DECIMAL(10, 2) NOT NULL,  -- Original surplus amount
  percentage DECIMAL(5, 2) NOT NULL,      -- What % went to commonwealth

  contributed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commonwealth_contrib_tenant ON cooperative_commonwealth_contributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commonwealth_contrib_date ON cooperative_commonwealth_contributions(contributed_at DESC);

-- Commonwealth Distributions (to cooperative movement)
CREATE TABLE IF NOT EXISTS cooperative_commonwealth_distributions (
  distribution_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Distribution details
  recipient_organization TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  purpose TEXT,

  distributed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commonwealth_dist_tenant ON cooperative_commonwealth_distributions(tenant_id);

-- Fare Tiers (Adult, Child, Concessionary, etc.)
CREATE TABLE IF NOT EXISTS fare_tiers (
  tier_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  tier_type VARCHAR(50) NOT NULL, -- 'adult', 'child', 'concessionary', 'wheelchair', 'companion'
  multiplier DECIMAL(5, 2) NOT NULL DEFAULT 1.00, -- % of base fare
  description TEXT,
  requires_proof BOOLEAN DEFAULT false,  -- Concessionary pass verification
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, tier_type)
);

-- Insert default fare tiers for all existing tenants
INSERT INTO fare_tiers (tenant_id, tier_type, multiplier, description, requires_proof)
SELECT
  tenant_id,
  tier_type,
  multiplier,
  description,
  requires_proof
FROM tenants,
LATERAL (
  VALUES
    ('adult', 1.00, 'Standard adult fare', false),
    ('child', 0.50, 'Half price for children under 16', false),
    ('concessionary', 0.50, 'Concessionary pass holders', true),
    ('wheelchair', 1.00, 'Wheelchair user (companion free)', false),
    ('companion', 0.00, 'Free companion for wheelchair user', false)
) AS default_tiers(tier_type, multiplier, description, requires_proof)
ON CONFLICT (tenant_id, tier_type) DO NOTHING;

-- Trip Fare Records (actual fares charged for completed trips)
CREATE TABLE IF NOT EXISTS trip_fare_records (
  record_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  trip_id INTEGER,  -- Reference to timetable/trip
  route_id INTEGER,

  -- Cost breakdown snapshot
  trip_cost_breakdown JSONB NOT NULL,  -- Full TripCostBreakdown object

  -- Fare structure snapshot
  passengers_count INTEGER NOT NULL,
  break_even_passengers INTEGER NOT NULL,
  break_even_fare DECIMAL(10, 2) NOT NULL,
  actual_fare_per_person DECIMAL(10, 2) NOT NULL,

  -- Surplus (if any)
  surplus_generated DECIMAL(10, 2) DEFAULT 0.00,
  surplus_allocation JSONB,  -- SurplusAllocation object

  -- Total revenue
  total_revenue DECIMAL(10, 2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_fare_records_tenant ON trip_fare_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trip_fare_records_route ON trip_fare_records(route_id);
CREATE INDEX IF NOT EXISTS idx_trip_fare_records_date ON trip_fare_records(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE fare_calculation_settings IS 'Tenant-specific settings for transparent, cost-based fare calculations';
COMMENT ON TABLE cooperative_commonwealth_fund IS 'Tracks contributions to broader cooperative movement from surplus revenue';
COMMENT ON TABLE cooperative_commonwealth_contributions IS 'Individual contributions from trip surplus to the commonwealth fund';
COMMENT ON TABLE cooperative_commonwealth_distributions IS 'Distributions from the commonwealth fund to cooperative organizations';
COMMENT ON TABLE fare_tiers IS 'Fare multipliers for different passenger types (adult, child, concessionary, etc.)';
COMMENT ON TABLE trip_fare_records IS 'Historical record of fares charged and surplus generated for each trip';

COMMENT ON COLUMN fare_calculation_settings.default_break_even_occupancy IS 'Target occupancy % to break even (e.g., 0.60 = 60% of seats)';
COMMENT ON COLUMN fare_calculation_settings.cooperative_commonwealth_percent IS 'Percentage of surplus contributed to broader cooperative movement';

COMMIT;
