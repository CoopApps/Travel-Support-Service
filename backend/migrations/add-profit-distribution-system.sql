-- =====================================================
-- Co-operative Profit & Dividend Distribution System
-- =====================================================
-- This migration adds profit sharing and dividend distribution
-- functionality for cooperative organizations.
--
-- Features:
-- - Profit distribution periods (quarterly, annual)
-- - Automatic percentage-based calculations
-- - Worker profit shares (based on ownership shares)
-- - Customer dividends (based on investment percentage)
-- - Distribution history and audit trail
--
-- Usage:
--   psql -U postgres -d travel_support_dev -f add-profit-distribution-system.sql
-- =====================================================

-- =====================================================
-- 1. DISTRIBUTION PERIODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cooperative_distribution_periods (
  period_id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Period details
  period_type VARCHAR(50) NOT NULL, -- 'quarterly', 'annual', 'special'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Financial data
  total_revenue DECIMAL(12,2),
  total_expenses DECIMAL(12,2),
  total_profit DECIMAL(12,2), -- Can be calculated: revenue - expenses

  -- Distribution allocation
  distribution_pool DECIMAL(12,2), -- Amount to distribute (may be less than profit for reserves)
  reserve_percentage DECIMAL(5,2) DEFAULT 20.0, -- Percentage kept as reserves
  distribution_percentage DECIMAL(5,2) DEFAULT 80.0, -- Percentage distributed to members

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'calculated', 'approved', 'distributed', 'cancelled'

  -- Metadata
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT REFERENCES users(user_id),
  approved_at TIMESTAMP,
  distributed_at TIMESTAMP,
  notes TEXT,

  -- Constraints
  CONSTRAINT chk_period_dates CHECK (period_end > period_start),
  CONSTRAINT chk_reserve_percentage CHECK (reserve_percentage >= 0 AND reserve_percentage <= 100),
  CONSTRAINT chk_distribution_percentage CHECK (distribution_percentage >= 0 AND distribution_percentage <= 100),
  CONSTRAINT chk_percentages_sum CHECK (reserve_percentage + distribution_percentage <= 100)
);

-- Indexes
CREATE INDEX idx_distribution_periods_tenant ON cooperative_distribution_periods(tenant_id);
CREATE INDEX idx_distribution_periods_status ON cooperative_distribution_periods(status);
CREATE INDEX idx_distribution_periods_dates ON cooperative_distribution_periods(period_start, period_end);

-- =====================================================
-- 2. MEMBER DISTRIBUTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cooperative_member_distributions (
  distribution_id SERIAL PRIMARY KEY,
  period_id INT NOT NULL REFERENCES cooperative_distribution_periods(period_id) ON DELETE CASCADE,
  member_id INT NOT NULL REFERENCES cooperative_membership(membership_id) ON DELETE CASCADE,

  -- Distribution calculation
  distribution_type VARCHAR(50) NOT NULL, -- 'profit_share' (workers), 'dividend' (customers/investors)
  ownership_shares INT, -- For workers (from membership table)
  ownership_percentage DECIMAL(10,4), -- Calculated percentage of total shares
  investment_amount DECIMAL(12,2), -- For customers/investors
  investment_percentage DECIMAL(10,4), -- Calculated percentage of total investment

  -- Distribution amount
  distribution_amount DECIMAL(12,2) NOT NULL,
  tax_withheld DECIMAL(12,2) DEFAULT 0, -- For tax purposes
  net_amount DECIMAL(12,2), -- Amount after tax

  -- Payment details
  payment_method VARCHAR(50), -- 'bank_transfer', 'check', 'reinvest', 'shares'
  payment_reference VARCHAR(255),
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,

  -- Ensure one distribution per member per period
  UNIQUE(period_id, member_id)
);

-- Indexes
CREATE INDEX idx_member_distributions_period ON cooperative_member_distributions(period_id);
CREATE INDEX idx_member_distributions_member ON cooperative_member_distributions(member_id);
CREATE INDEX idx_member_distributions_paid ON cooperative_member_distributions(paid);

-- =====================================================
-- 3. INVESTMENT TRACKING TABLE
-- =====================================================
-- For passenger co-ops: track customer investments
CREATE TABLE IF NOT EXISTS cooperative_member_investments (
  investment_id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  member_id INT NOT NULL REFERENCES cooperative_membership(membership_id) ON DELETE CASCADE,

  -- Investment details
  investment_amount DECIMAL(12,2) NOT NULL,
  investment_date DATE NOT NULL,
  investment_type VARCHAR(50) DEFAULT 'capital', -- 'capital', 'share_purchase', 'loan'

  -- Returns (if withdrawn)
  returned_amount DECIMAL(12,2) DEFAULT 0,
  returned_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'returned', 'converted'

  -- Metadata
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,

  CONSTRAINT chk_investment_amount CHECK (investment_amount > 0)
);

-- Indexes
CREATE INDEX idx_member_investments_tenant ON cooperative_member_investments(tenant_id);
CREATE INDEX idx_member_investments_member ON cooperative_member_investments(member_id);
CREATE INDEX idx_member_investments_status ON cooperative_member_investments(status);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate profit distribution for a period
CREATE OR REPLACE FUNCTION calculate_profit_distribution(p_period_id INT)
RETURNS JSONB AS $$
DECLARE
  v_period RECORD;
  v_distribution_pool DECIMAL(12,2);
  v_total_shares INT;
  v_total_investment DECIMAL(12,2);
  v_member RECORD;
  v_member_percentage DECIMAL(10,4);
  v_member_amount DECIMAL(12,2);
  v_distributions_created INT := 0;
  v_cooperative_model VARCHAR(50);
BEGIN
  -- Get period details
  SELECT dp.*, t.cooperative_model
  INTO v_period, v_cooperative_model
  FROM cooperative_distribution_periods dp
  JOIN tenants t ON dp.tenant_id = t.tenant_id
  WHERE dp.period_id = p_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Distribution period not found';
  END IF;

  -- Calculate distribution pool if not set
  IF v_period.distribution_pool IS NULL THEN
    v_distribution_pool := v_period.total_profit * (v_period.distribution_percentage / 100.0);

    UPDATE cooperative_distribution_periods
    SET distribution_pool = v_distribution_pool
    WHERE period_id = p_period_id;
  ELSE
    v_distribution_pool := v_period.distribution_pool;
  END IF;

  -- Delete existing distributions for this period (recalculation)
  DELETE FROM cooperative_member_distributions WHERE period_id = p_period_id;

  -- Calculate for worker co-ops (profit shares based on ownership)
  IF v_cooperative_model IN ('worker', 'hybrid') THEN
    -- Get total active shares
    SELECT COALESCE(SUM(ownership_shares), 0)
    INTO v_total_shares
    FROM cooperative_membership
    WHERE tenant_id = v_period.tenant_id
      AND is_active = TRUE
      AND member_type = 'driver'; -- Workers

    IF v_total_shares > 0 THEN
      -- Calculate distribution for each worker
      FOR v_member IN
        SELECT membership_id, ownership_shares
        FROM cooperative_membership
        WHERE tenant_id = v_period.tenant_id
          AND is_active = TRUE
          AND member_type = 'driver'
          AND ownership_shares > 0
      LOOP
        v_member_percentage := (v_member.ownership_shares::DECIMAL / v_total_shares) * 100;
        v_member_amount := v_distribution_pool * (v_member_percentage / 100.0);

        INSERT INTO cooperative_member_distributions (
          period_id, member_id, distribution_type,
          ownership_shares, ownership_percentage,
          distribution_amount, net_amount
        ) VALUES (
          p_period_id, v_member.membership_id, 'profit_share',
          v_member.ownership_shares, v_member_percentage,
          v_member_amount, v_member_amount
        );

        v_distributions_created := v_distributions_created + 1;
      END LOOP;
    END IF;
  END IF;

  -- Calculate for passenger co-ops (dividends based on investment)
  IF v_cooperative_model IN ('consumer', 'hybrid') THEN
    -- Get total active investments
    SELECT COALESCE(SUM(investment_amount - returned_amount), 0)
    INTO v_total_investment
    FROM cooperative_member_investments
    WHERE tenant_id = v_period.tenant_id
      AND status = 'active';

    IF v_total_investment > 0 THEN
      -- Calculate dividend for each investor
      FOR v_member IN
        SELECT
          cm.membership_id,
          COALESCE(SUM(cmi.investment_amount - cmi.returned_amount), 0) as total_investment
        FROM cooperative_membership cm
        JOIN cooperative_member_investments cmi ON cm.membership_id = cmi.member_id
        WHERE cm.tenant_id = v_period.tenant_id
          AND cm.is_active = TRUE
          AND cm.member_type = 'customer'
          AND cmi.status = 'active'
        GROUP BY cm.membership_id
        HAVING SUM(cmi.investment_amount - cmi.returned_amount) > 0
      LOOP
        v_member_percentage := (v_member.total_investment / v_total_investment) * 100;
        v_member_amount := v_distribution_pool * (v_member_percentage / 100.0);

        INSERT INTO cooperative_member_distributions (
          period_id, member_id, distribution_type,
          investment_amount, investment_percentage,
          distribution_amount, net_amount
        ) VALUES (
          p_period_id, v_member.membership_id, 'dividend',
          v_member.total_investment, v_member_percentage,
          v_member_amount, v_member_amount
        );

        v_distributions_created := v_distributions_created + 1;
      END LOOP;
    END IF;
  END IF;

  -- Update period status
  UPDATE cooperative_distribution_periods
  SET status = 'calculated', updated_at = CURRENT_TIMESTAMP
  WHERE period_id = p_period_id;

  RETURN jsonb_build_object(
    'period_id', p_period_id,
    'distribution_pool', v_distribution_pool,
    'total_shares', v_total_shares,
    'total_investment', v_total_investment,
    'distributions_created', v_distributions_created
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get distribution summary
CREATE OR REPLACE FUNCTION get_distribution_summary(p_period_id INT)
RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_distributions', COUNT(*),
    'total_amount', COALESCE(SUM(distribution_amount), 0),
    'total_paid', COALESCE(SUM(distribution_amount) FILTER (WHERE paid = TRUE), 0),
    'total_unpaid', COALESCE(SUM(distribution_amount) FILTER (WHERE paid = FALSE), 0),
    'profit_shares', COALESCE(SUM(distribution_amount) FILTER (WHERE distribution_type = 'profit_share'), 0),
    'dividends', COALESCE(SUM(distribution_amount) FILTER (WHERE distribution_type = 'dividend'), 0),
    'members_count', COUNT(*),
    'paid_count', COUNT(*) FILTER (WHERE paid = TRUE),
    'unpaid_count', COUNT(*) FILTER (WHERE paid = FALSE)
  )
  INTO v_summary
  FROM cooperative_member_distributions
  WHERE period_id = p_period_id;

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to mark distribution as paid
CREATE OR REPLACE FUNCTION mark_distribution_paid(
  p_distribution_id INT,
  p_payment_method VARCHAR(50),
  p_payment_reference VARCHAR(255)
)
RETURNS void AS $$
BEGIN
  UPDATE cooperative_member_distributions
  SET
    paid = TRUE,
    paid_at = CURRENT_TIMESTAMP,
    payment_method = p_payment_method,
    payment_reference = p_payment_reference,
    updated_at = CURRENT_TIMESTAMP
  WHERE distribution_id = p_distribution_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_distribution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_distribution_periods_updated_at
BEFORE UPDATE ON cooperative_distribution_periods
FOR EACH ROW
EXECUTE FUNCTION update_distribution_updated_at();

CREATE TRIGGER trg_member_distributions_updated_at
BEFORE UPDATE ON cooperative_member_distributions
FOR EACH ROW
EXECUTE FUNCTION update_distribution_updated_at();

CREATE TRIGGER trg_member_investments_updated_at
BEFORE UPDATE ON cooperative_member_investments
FOR EACH ROW
EXECUTE FUNCTION update_distribution_updated_at();

-- =====================================================
-- 6. VIEWS
-- =====================================================

-- View for active distribution periods
CREATE OR REPLACE VIEW v_active_distribution_periods AS
SELECT
  dp.*,
  u.email as created_by_email,
  u.name as created_by_name,
  CASE
    WHEN dp.status = 'distributed' THEN 'completed'
    WHEN dp.status = 'approved' THEN 'ready_to_pay'
    WHEN dp.status = 'calculated' THEN 'awaiting_approval'
    ELSE 'in_progress'
  END as period_status
FROM cooperative_distribution_periods dp
LEFT JOIN users u ON dp.created_by = u.user_id
WHERE dp.status IN ('draft', 'calculated', 'approved')
ORDER BY dp.period_start DESC;

-- View for member distribution details
CREATE OR REPLACE VIEW v_member_distribution_details AS
SELECT
  md.*,
  cm.member_type,
  CASE
    WHEN cm.member_reference_id IS NOT NULL AND cm.member_type = 'driver' THEN d.name
    WHEN cm.member_reference_id IS NOT NULL AND cm.member_type = 'customer' THEN c.name
    ELSE 'Unknown'
  END AS member_name,
  dp.period_type,
  dp.period_start,
  dp.period_end,
  dp.status as period_status
FROM cooperative_member_distributions md
JOIN cooperative_membership cm ON md.member_id = cm.membership_id
JOIN cooperative_distribution_periods dp ON md.period_id = dp.period_id
LEFT JOIN drivers d ON cm.member_type = 'driver' AND cm.member_reference_id = d.driver_id
LEFT JOIN customers c ON cm.member_type = 'customer' AND cm.member_reference_id = c.id
ORDER BY md.created_at DESC;

-- =====================================================
-- 7. SAMPLE DATA (for testing)
-- =====================================================

-- Commented out - uncomment for testing
/*
-- Example: Create a distribution period
INSERT INTO cooperative_distribution_periods (
  tenant_id, period_type, period_start, period_end,
  total_revenue, total_expenses, total_profit,
  reserve_percentage, distribution_percentage,
  created_by
) VALUES (
  1, 'quarterly', '2024-01-01', '2024-03-31',
  150000.00, 100000.00, 50000.00,
  20.0, 80.0,
  1
);

-- Calculate distributions
SELECT calculate_profit_distribution(1);
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================

COMMENT ON TABLE cooperative_distribution_periods IS 'Profit distribution periods for cooperative financial management';
COMMENT ON TABLE cooperative_member_distributions IS 'Individual member profit shares and dividends';
COMMENT ON TABLE cooperative_member_investments IS 'Customer investments for passenger cooperatives';
COMMENT ON FUNCTION calculate_profit_distribution IS 'Calculates and creates distribution records for all members';
COMMENT ON FUNCTION get_distribution_summary IS 'Gets summary statistics for a distribution period';
COMMENT ON FUNCTION mark_distribution_paid IS 'Marks a distribution as paid with payment details';
