-- Cooperative Pricing Model for Section 22 Bus Services
-- Supports flexible pricing models, member management, and surplus distribution

-- ============================================================================
-- PART 1: Route/Service Group Configuration
-- ============================================================================

-- Add configuration columns to section22_bus_routes
ALTER TABLE section22_bus_routes
ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20) DEFAULT 'dynamic_with_floor'
  CHECK (pricing_model IN ('locked', 'dynamic_until_cutoff', 'threshold_based', 'dynamic_with_floor')),
ADD COLUMN IF NOT EXISTS minimum_fare_floor DECIMAL(10,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS maximum_acceptable_fare DECIMAL(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS booking_opens_days_advance INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS booking_cutoff_hours INTEGER DEFAULT 48,
ADD COLUMN IF NOT EXISTS surplus_reserves_percent DECIMAL(5,2) DEFAULT 20.00,
ADD COLUMN IF NOT EXISTS surplus_business_percent DECIMAL(5,2) DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS surplus_dividend_percent DECIMAL(5,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS dividend_frequency VARCHAR(20) DEFAULT 'monthly'
  CHECK (dividend_frequency IN ('monthly', 'quarterly', 'annually')),
ADD COLUMN IF NOT EXISTS non_member_surcharge_percent DECIMAL(5,2) DEFAULT 20.00,
ADD COLUMN IF NOT EXISTS is_members_only BOOLEAN DEFAULT false;

COMMENT ON COLUMN section22_bus_routes.pricing_model IS
'Pricing model: locked (price set when first booked), dynamic_until_cutoff (price changes until cutoff), threshold_based (needs minimum passengers), dynamic_with_floor (cost÷passengers with £1 floor)';

COMMENT ON COLUMN section22_bus_routes.minimum_fare_floor IS
'Minimum fare per passenger (e.g., £1) - once reached, additional passengers create surplus';

COMMENT ON COLUMN section22_bus_routes.maximum_acceptable_fare IS
'Maximum fare per passenger - used to calculate minimum viable passengers (cost ÷ max_fare = min_passengers)';

COMMENT ON COLUMN section22_bus_routes.booking_opens_days_advance IS
'How many days in advance bookings open (mutually agreed per route)';

COMMENT ON COLUMN section22_bus_routes.booking_cutoff_hours IS
'Hours before departure that bookings close (mutually agreed per route)';

COMMENT ON COLUMN section22_bus_routes.non_member_surcharge_percent IS
'Surcharge for non-members (e.g., 20% = non-members pay 1.2× member price)';

-- ============================================================================
-- PART 2: Member Management
-- ============================================================================

-- Cooperative members table
CREATE TABLE IF NOT EXISTS section22_cooperative_members (
  member_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES tenant_customers(customer_id),
  membership_number VARCHAR(50) UNIQUE,
  membership_type VARCHAR(20) DEFAULT 'standard'
    CHECK (membership_type IN ('founding', 'standard', 'associate')),
  membership_start_date DATE NOT NULL,
  membership_end_date DATE,
  is_active BOOLEAN DEFAULT true,
  voting_rights BOOLEAN DEFAULT true,
  share_capital_invested DECIMAL(10,2) DEFAULT 0.00,
  dividend_eligible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coop_members_tenant ON section22_cooperative_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coop_members_customer ON section22_cooperative_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_coop_members_active ON section22_cooperative_members(tenant_id, is_active);

COMMENT ON TABLE section22_cooperative_members IS
'Cooperative members who receive dividends and have voting rights on service decisions';

-- ============================================================================
-- PART 3: Service Cost Tracking
-- ============================================================================

-- Actual operational costs per service
CREATE TABLE IF NOT EXISTS section22_service_costs (
  cost_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
  service_date DATE NOT NULL,

  -- Cost breakdown
  driver_wages DECIMAL(10,2) DEFAULT 0.00,
  fuel_cost DECIMAL(10,2) DEFAULT 0.00,
  vehicle_depreciation DECIMAL(10,2) DEFAULT 0.00,
  vehicle_maintenance_allocation DECIMAL(10,2) DEFAULT 0.00,
  insurance_allocation DECIMAL(10,2) DEFAULT 0.00,
  admin_overhead DECIMAL(10,2) DEFAULT 0.00,
  other_costs DECIMAL(10,2) DEFAULT 0.00,

  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (
    driver_wages + fuel_cost + vehicle_depreciation +
    vehicle_maintenance_allocation + insurance_allocation +
    admin_overhead + other_costs
  ) STORED,

  -- Calculated fields
  actual_passengers INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  gross_surplus DECIMAL(10,2) GENERATED ALWAYS AS (
    total_revenue - (driver_wages + fuel_cost + vehicle_depreciation +
    vehicle_maintenance_allocation + insurance_allocation +
    admin_overhead + other_costs)
  ) STORED,

  cost_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,

  UNIQUE(timetable_id, service_date)
);

CREATE INDEX IF NOT EXISTS idx_service_costs_tenant ON section22_service_costs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_costs_timetable ON section22_service_costs(timetable_id);
CREATE INDEX IF NOT EXISTS idx_service_costs_date ON section22_service_costs(service_date);

COMMENT ON TABLE section22_service_costs IS
'Actual operational costs per service for break-even calculation and surplus tracking';

-- ============================================================================
-- PART 4: Dynamic Pricing Snapshots
-- ============================================================================

-- Track pricing as bookings come in
CREATE TABLE IF NOT EXISTS section22_pricing_snapshots (
  snapshot_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
  service_date DATE NOT NULL,

  snapshot_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  current_bookings INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,2) DEFAULT 0.00,
  calculated_price_per_passenger DECIMAL(10,2) DEFAULT 0.00,
  floor_applied BOOLEAN DEFAULT false,
  is_viable BOOLEAN DEFAULT false,
  minimum_passengers_needed INTEGER DEFAULT 0,

  pricing_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP,
  final_price DECIMAL(10,2)
);

CREATE INDEX IF NOT EXISTS idx_pricing_snapshots_service ON section22_pricing_snapshots(timetable_id, service_date);
CREATE INDEX IF NOT EXISTS idx_pricing_snapshots_time ON section22_pricing_snapshots(snapshot_time);

COMMENT ON TABLE section22_pricing_snapshots IS
'Tracks price changes as bookings accumulate for dynamic pricing models';

-- ============================================================================
-- PART 5: Surplus Distribution
-- ============================================================================

-- Monthly/quarterly surplus calculations
CREATE TABLE IF NOT EXISTS section22_surplus_distributions (
  distribution_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Aggregate totals
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  total_costs DECIMAL(10,2) DEFAULT 0.00,
  gross_surplus DECIMAL(10,2) DEFAULT 0.00,

  -- Allocations
  reserves_amount DECIMAL(10,2) DEFAULT 0.00,
  business_costs_amount DECIMAL(10,2) DEFAULT 0.00,
  dividend_pool DECIMAL(10,2) DEFAULT 0.00,

  -- Member counts
  eligible_members INTEGER DEFAULT 0,
  total_member_trips INTEGER DEFAULT 0,

  distribution_date DATE,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'calculated', 'distributed', 'cancelled')),

  calculated_at TIMESTAMP,
  distributed_at TIMESTAMP,
  notes TEXT,

  UNIQUE(tenant_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_surplus_dist_tenant ON section22_surplus_distributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_surplus_dist_period ON section22_surplus_distributions(period_start, period_end);

-- Individual member dividend records
CREATE TABLE IF NOT EXISTS section22_member_dividends (
  dividend_id SERIAL PRIMARY KEY,
  distribution_id INTEGER NOT NULL REFERENCES section22_surplus_distributions(distribution_id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES section22_cooperative_members(member_id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  member_trips_count INTEGER DEFAULT 0,
  member_trip_percentage DECIMAL(5,2) DEFAULT 0.00,
  dividend_amount DECIMAL(10,2) DEFAULT 0.00,

  payment_method VARCHAR(20) DEFAULT 'account_credit'
    CHECK (payment_method IN ('account_credit', 'bank_transfer', 'cash', 'reinvest')),
  payment_status VARCHAR(20) DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  payment_date DATE,
  payment_reference VARCHAR(100),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_member_dividends_distribution ON section22_member_dividends(distribution_id);
CREATE INDEX IF NOT EXISTS idx_member_dividends_member ON section22_member_dividends(member_id);

COMMENT ON TABLE section22_member_dividends IS
'Individual dividend records for cooperative members - surplus returned based on usage';

-- ============================================================================
-- PART 6: Update Bookings Table for Member Pricing
-- ============================================================================

-- Add member tracking to bookings
ALTER TABLE section22_bus_bookings
ADD COLUMN IF NOT EXISTS member_id INTEGER REFERENCES section22_cooperative_members(member_id),
ADD COLUMN IF NOT EXISTS is_member_booking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS member_surcharge_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_locked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS locked_fare_amount DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS idx_bookings_member ON section22_bus_bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_member_flag ON section22_bus_bookings(tenant_id, is_member_booking);

COMMENT ON COLUMN section22_bus_bookings.member_id IS
'Link to cooperative member (if applicable) - members get dividend eligibility';

COMMENT ON COLUMN section22_bus_bookings.is_member_booking IS
'Whether booking was made by a cooperative member (affects pricing - no 20% surcharge)';

COMMENT ON COLUMN section22_bus_bookings.locked_fare_amount IS
'Final locked price when booking was made (for locked or cutoff pricing models)';

-- ============================================================================
-- PART 7: Helper Views
-- ============================================================================

-- View: Service viability check
CREATE OR REPLACE VIEW section22_service_viability AS
SELECT
  t.timetable_id,
  t.tenant_id,
  r.route_number,
  r.origin_point as origin,
  r.destination_point as destination,
  t.valid_from as service_date,
  t.departure_time,
  r.pricing_model,
  r.maximum_acceptable_fare,
  r.minimum_fare_floor,

  -- Cost calculation (estimated or actual)
  COALESCE(sc.total_cost, 0) as estimated_cost,

  -- Booking counts
  COUNT(b.booking_id) as current_bookings,

  -- Viability calculation
  CASE
    WHEN COALESCE(sc.total_cost, 0) = 0 THEN 0
    ELSE CEIL(COALESCE(sc.total_cost, 0) / NULLIF(r.maximum_acceptable_fare, 0))
  END as minimum_passengers_needed,

  CASE
    WHEN COUNT(b.booking_id) >= CEIL(COALESCE(sc.total_cost, 0) / NULLIF(r.maximum_acceptable_fare, 0))
    THEN true
    ELSE false
  END as is_viable,

  -- Current price
  CASE
    WHEN COUNT(b.booking_id) = 0 THEN r.maximum_acceptable_fare
    WHEN COALESCE(sc.total_cost, 0) / NULLIF(COUNT(b.booking_id), 0) < r.minimum_fare_floor
    THEN r.minimum_fare_floor
    ELSE COALESCE(sc.total_cost, 0) / NULLIF(COUNT(b.booking_id), 0)
  END as current_price_per_passenger

FROM section22_timetables t
JOIN section22_bus_routes r ON t.route_id = r.route_id
LEFT JOIN section22_service_costs sc ON sc.timetable_id = t.timetable_id
  AND sc.service_date = t.valid_from
LEFT JOIN section22_bus_bookings b ON b.timetable_id = t.timetable_id
  AND b.service_date = t.valid_from
  AND b.booking_status IN ('confirmed', 'boarded')
GROUP BY
  t.timetable_id, t.tenant_id, r.route_number, r.origin_point, r.destination_point,
  t.valid_from, t.departure_time, r.pricing_model, r.maximum_acceptable_fare,
  r.minimum_fare_floor, sc.total_cost;

COMMENT ON VIEW section22_service_viability IS
'Real-time view of service viability - shows if enough passengers booked to meet break-even threshold';

-- Verify schema
SELECT
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name IN (
  'section22_bus_routes',
  'section22_cooperative_members',
  'section22_service_costs',
  'section22_pricing_snapshots',
  'section22_surplus_distributions',
  'section22_member_dividends',
  'section22_bus_bookings'
)
AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
