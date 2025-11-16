-- Surplus Smoothing System for Cooperative Pricing
-- Allows profitable trips to subsidize less profitable ones within the same route

-- ============================================================================
-- PART 1: Route Surplus Pool
-- ============================================================================

-- Track accumulated surplus per route that can be used to subsidize future trips
CREATE TABLE IF NOT EXISTS section22_route_surplus_pool (
  pool_id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES section22_bus_routes(route_id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Surplus tracking
  accumulated_surplus DECIMAL(10,2) DEFAULT 0.00,
  available_for_subsidy DECIMAL(10,2) DEFAULT 0.00,
  reserved_for_reserves DECIMAL(10,2) DEFAULT 0.00,
  reserved_for_business DECIMAL(10,2) DEFAULT 0.00,
  total_distributed_dividends DECIMAL(10,2) DEFAULT 0.00,

  -- Lifetime totals
  lifetime_total_revenue DECIMAL(10,2) DEFAULT 0.00,
  lifetime_total_costs DECIMAL(10,2) DEFAULT 0.00,
  lifetime_gross_surplus DECIMAL(10,2) DEFAULT 0.00,

  -- Statistics
  total_services_run INTEGER DEFAULT 0,
  total_profitable_services INTEGER DEFAULT 0,
  total_subsidized_services INTEGER DEFAULT 0,

  last_surplus_date DATE,
  last_subsidy_date DATE,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(route_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_surplus_pool_route ON section22_route_surplus_pool(route_id);
CREATE INDEX IF NOT EXISTS idx_surplus_pool_tenant ON section22_route_surplus_pool(tenant_id);

COMMENT ON TABLE section22_route_surplus_pool IS
'Accumulated surplus per route - profitable trips subsidize less profitable ones';

COMMENT ON COLUMN section22_route_surplus_pool.available_for_subsidy IS
'Amount available to subsidize future trips (typically 50-100% of accumulated surplus)';

-- ============================================================================
-- PART 2: Surplus Transaction History
-- ============================================================================

-- Track every surplus generation and subsidy application for transparency
CREATE TABLE IF NOT EXISTS section22_surplus_transactions (
  transaction_id SERIAL PRIMARY KEY,
  pool_id INTEGER NOT NULL REFERENCES section22_route_surplus_pool(pool_id) ON DELETE CASCADE,
  route_id INTEGER NOT NULL REFERENCES section22_bus_routes(route_id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Related service
  timetable_id INTEGER REFERENCES section22_timetables(timetable_id) ON DELETE SET NULL,
  service_date DATE NOT NULL,
  cost_id INTEGER REFERENCES section22_service_costs(cost_id) ON DELETE SET NULL,

  -- Transaction type
  transaction_type VARCHAR(20) NOT NULL
    CHECK (transaction_type IN ('surplus_added', 'subsidy_applied', 'dividend_paid', 'reserves_allocated', 'business_allocated')),

  -- Amounts
  amount DECIMAL(10,2) NOT NULL,
  pool_balance_before DECIMAL(10,2) NOT NULL,
  pool_balance_after DECIMAL(10,2) NOT NULL,

  -- Context
  passenger_count INTEGER,
  service_revenue DECIMAL(10,2),
  service_cost DECIMAL(10,2),
  description TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_surplus_trans_pool ON section22_surplus_transactions(pool_id);
CREATE INDEX IF NOT EXISTS idx_surplus_trans_route ON section22_surplus_transactions(route_id);
CREATE INDEX IF NOT EXISTS idx_surplus_trans_date ON section22_surplus_transactions(service_date);
CREATE INDEX IF NOT EXISTS idx_surplus_trans_type ON section22_surplus_transactions(transaction_type);

COMMENT ON TABLE section22_surplus_transactions IS
'Complete audit trail of all surplus generation and subsidy applications';

-- ============================================================================
-- PART 3: Enhanced Route Configuration
-- ============================================================================

-- Add surplus smoothing configuration to routes
ALTER TABLE section22_bus_routes
ADD COLUMN IF NOT EXISTS use_surplus_smoothing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_surplus_subsidy_percent DECIMAL(5,2) DEFAULT 50.00
  CHECK (max_surplus_subsidy_percent >= 0 AND max_surplus_subsidy_percent <= 100),
ADD COLUMN IF NOT EXISTS max_service_subsidy_percent DECIMAL(5,2) DEFAULT 30.00
  CHECK (max_service_subsidy_percent >= 0 AND max_service_subsidy_percent <= 100),
ADD COLUMN IF NOT EXISTS cancellation_policy VARCHAR(30) DEFAULT 'cancel_with_refund'
  CHECK (cancellation_policy IN ('cancel_with_refund', 'run_anyway_absorb_loss', 'use_surplus_to_run'));

COMMENT ON COLUMN section22_bus_routes.use_surplus_smoothing IS
'Whether to use accumulated surplus to lower minimum passenger thresholds';

COMMENT ON COLUMN section22_bus_routes.max_surplus_subsidy_percent IS
'Maximum % of accumulated surplus that can be used per service (e.g., 50% = use max half the surplus pool)';

COMMENT ON COLUMN section22_bus_routes.max_service_subsidy_percent IS
'Maximum % of service cost that can be subsidized (e.g., 30% = never subsidize more than 30% of actual cost)';

COMMENT ON COLUMN section22_bus_routes.cancellation_policy IS
'What happens if minimum passengers not met: cancel with refund, run anyway (loss), or use surplus to run';

-- ============================================================================
-- PART 4: Enhanced Service Costs Tracking
-- ============================================================================

-- Add subsidy tracking to service costs
ALTER TABLE section22_service_costs
ADD COLUMN IF NOT EXISTS subsidy_applied DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS subsidy_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS effective_cost DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_surplus DECIMAL(10,2) DEFAULT 0.00;

COMMENT ON COLUMN section22_service_costs.subsidy_applied IS
'Amount subsidized from route surplus pool to lower minimum passenger threshold';

COMMENT ON COLUMN section22_service_costs.effective_cost IS
'Actual cost after subsidy (calculated: total_cost - subsidy_applied) - used for break-even calculation';

COMMENT ON COLUMN section22_service_costs.net_surplus IS
'Net surplus after accounting for subsidy received (calculated: total_revenue - effective_cost)';

-- ============================================================================
-- PART 5: Helper Functions
-- ============================================================================

-- Function to calculate available subsidy for a service
CREATE OR REPLACE FUNCTION calculate_available_subsidy(
  p_route_id INTEGER,
  p_service_cost DECIMAL,
  p_max_surplus_percent DECIMAL DEFAULT 50,
  p_max_service_percent DECIMAL DEFAULT 30
) RETURNS DECIMAL AS $$
DECLARE
  v_accumulated_surplus DECIMAL;
  v_max_from_pool DECIMAL;
  v_max_for_service DECIMAL;
  v_available_subsidy DECIMAL;
BEGIN
  -- Get accumulated surplus for this route
  SELECT available_for_subsidy INTO v_accumulated_surplus
  FROM section22_route_surplus_pool
  WHERE route_id = p_route_id;

  -- If no surplus pool exists, return 0
  IF v_accumulated_surplus IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate maximum from pool (% of accumulated surplus)
  v_max_from_pool := v_accumulated_surplus * (p_max_surplus_percent / 100);

  -- Calculate maximum for this service (% of service cost)
  v_max_for_service := p_service_cost * (p_max_service_percent / 100);

  -- Available subsidy is the minimum of both limits
  v_available_subsidy := LEAST(v_max_from_pool, v_max_for_service);

  RETURN GREATEST(v_available_subsidy, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_available_subsidy IS
'Calculate how much subsidy can be applied to a service based on pool balance and configured limits';

-- Function to calculate threshold with surplus smoothing
CREATE OR REPLACE FUNCTION calculate_threshold_with_smoothing(
  p_route_id INTEGER,
  p_service_cost DECIMAL,
  p_max_acceptable_fare DECIMAL
) RETURNS TABLE(
  raw_cost DECIMAL,
  subsidy_applied DECIMAL,
  effective_cost DECIMAL,
  minimum_passengers INTEGER,
  break_even_fare DECIMAL
) AS $$
DECLARE
  v_route_config RECORD;
  v_available_subsidy DECIMAL;
  v_effective_cost DECIMAL;
  v_min_passengers INTEGER;
BEGIN
  -- Get route configuration
  SELECT
    use_surplus_smoothing,
    max_surplus_subsidy_percent,
    max_service_subsidy_percent
  INTO v_route_config
  FROM section22_bus_routes
  WHERE route_id = p_route_id;

  -- If surplus smoothing disabled, no subsidy
  IF NOT v_route_config.use_surplus_smoothing THEN
    v_available_subsidy := 0;
  ELSE
    -- Calculate available subsidy
    v_available_subsidy := calculate_available_subsidy(
      p_route_id,
      p_service_cost,
      v_route_config.max_surplus_subsidy_percent,
      v_route_config.max_service_subsidy_percent
    );
  END IF;

  -- Calculate effective cost after subsidy
  v_effective_cost := GREATEST(p_service_cost - v_available_subsidy, 0);

  -- Calculate minimum passengers needed
  v_min_passengers := CEIL(v_effective_cost / NULLIF(p_max_acceptable_fare, 0));

  RETURN QUERY SELECT
    p_service_cost,
    v_available_subsidy,
    v_effective_cost,
    v_min_passengers,
    v_effective_cost / NULLIF(v_min_passengers, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_threshold_with_smoothing IS
'Calculate minimum passenger threshold with surplus smoothing applied';

-- ============================================================================
-- PART 6: Enhanced Service Viability View
-- ============================================================================

-- Drop and recreate view with surplus smoothing
DROP VIEW IF EXISTS section22_service_viability;

CREATE VIEW section22_service_viability AS
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

  -- Cost calculation
  COALESCE(sc.total_cost, 0) as raw_cost,
  COALESCE(sc.subsidy_applied, 0) as subsidy_applied,
  COALESCE(sc.effective_cost, sc.total_cost, 0) as effective_cost,

  -- Surplus pool info
  COALESCE(sp.available_for_subsidy, 0) as route_surplus_available,

  -- Booking counts
  COUNT(b.booking_id) as current_bookings,

  -- Viability calculation (using effective cost, not raw cost!)
  CASE
    WHEN COALESCE(sc.effective_cost, sc.total_cost, 0) = 0 THEN 0
    ELSE CEIL(COALESCE(sc.effective_cost, sc.total_cost, 0) / NULLIF(r.maximum_acceptable_fare, 0))
  END as minimum_passengers_needed,

  CASE
    WHEN COUNT(b.booking_id) >= CEIL(COALESCE(sc.effective_cost, sc.total_cost, 0) / NULLIF(r.maximum_acceptable_fare, 0))
    THEN true
    ELSE false
  END as is_viable,

  -- Current price (using effective cost)
  CASE
    WHEN COUNT(b.booking_id) = 0 THEN r.maximum_acceptable_fare
    WHEN COALESCE(sc.effective_cost, sc.total_cost, 0) / NULLIF(COUNT(b.booking_id), 0) < r.minimum_fare_floor
    THEN r.minimum_fare_floor
    ELSE COALESCE(sc.effective_cost, sc.total_cost, 0) / NULLIF(COUNT(b.booking_id), 0)
  END as current_price_per_passenger

FROM section22_timetables t
JOIN section22_bus_routes r ON t.route_id = r.route_id
LEFT JOIN section22_service_costs sc ON sc.timetable_id = t.timetable_id
  AND sc.service_date = t.valid_from
LEFT JOIN section22_route_surplus_pool sp ON sp.route_id = r.route_id
LEFT JOIN section22_bus_bookings b ON b.timetable_id = t.timetable_id
  AND b.service_date = t.valid_from
  AND b.booking_status IN ('confirmed', 'boarded')
GROUP BY
  t.timetable_id, t.tenant_id, r.route_number, r.origin_point, r.destination_point,
  t.valid_from, t.departure_time, r.pricing_model, r.maximum_acceptable_fare,
  r.minimum_fare_floor, sc.total_cost, sc.subsidy_applied, sc.effective_cost,
  sp.available_for_subsidy;

COMMENT ON VIEW section22_service_viability IS
'Real-time service viability with surplus smoothing - shows how surplus lowers minimum passenger thresholds';

-- ============================================================================
-- PART 7: Verify Migration
-- ============================================================================

-- Check new tables
SELECT
  'Tables created:' as status,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('section22_route_surplus_pool', 'section22_surplus_transactions');

-- Check new columns
SELECT
  'New columns on section22_bus_routes:' as status,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_name = 'section22_bus_routes'
AND column_name IN ('use_surplus_smoothing', 'max_surplus_subsidy_percent', 'max_service_subsidy_percent', 'cancellation_policy');

-- Check functions
SELECT
  'Functions created:' as status,
  COUNT(*) as count
FROM pg_proc
WHERE proname IN ('calculate_available_subsidy', 'calculate_threshold_with_smoothing');
