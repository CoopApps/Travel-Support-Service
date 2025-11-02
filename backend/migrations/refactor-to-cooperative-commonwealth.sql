/**
 * Migration: Refactor to Co-operative Commonwealth Platform
 *
 * Changes:
 * 1. Remove subscription_tier (replaced by organization_type for pricing)
 * 2. Remove max_users and max_customers limits (unlimited for all)
 * 3. Add multi-app support (Co-operative Commonwealth hosts multiple apps)
 * 4. Rebrand platform_admins to commonwealth_admins
 * 5. Add apps table to manage multiple applications
 */

-- ============================================================================
-- PART 1: Create Apps Table for Multi-App Support
-- ============================================================================

CREATE TABLE IF NOT EXISTS commonwealth_apps (
  app_id SERIAL PRIMARY KEY,
  app_name VARCHAR(255) NOT NULL UNIQUE,
  app_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  app_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,

  -- App-specific configuration
  config JSONB DEFAULT '{}',

  -- Branding
  logo_url VARCHAR(255),
  primary_color VARCHAR(7),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_app_code CHECK (app_code ~ '^[a-z0-9_]+$')
);

CREATE INDEX IF NOT EXISTS idx_commonwealth_apps_code ON commonwealth_apps(app_code);
CREATE INDEX IF NOT EXISTS idx_commonwealth_apps_active ON commonwealth_apps(is_active);

COMMENT ON TABLE commonwealth_apps IS 'Applications managed by the Co-operative Commonwealth platform';

-- Insert the Travel Support App as the first app
INSERT INTO commonwealth_apps (app_name, app_code, description, is_active)
VALUES (
  'Travel Support System',
  'travel_support',
  'Accessible transportation management system for third sector organizations',
  true
) ON CONFLICT (app_code) DO NOTHING;

-- ============================================================================
-- PART 2: Modify Tenants Table
-- ============================================================================

-- Add app_id to link tenants to apps
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS app_id INTEGER REFERENCES commonwealth_apps(app_id) ON DELETE RESTRICT;

-- Set default app_id to travel_support for existing tenants
UPDATE tenants
SET app_id = (SELECT app_id FROM commonwealth_apps WHERE app_code = 'travel_support')
WHERE app_id IS NULL;

-- Make app_id required going forward
ALTER TABLE tenants
  ALTER COLUMN app_id SET NOT NULL;

-- Drop check constraint on subscription_tier before dropping column
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_subscription_tier_check;

-- Drop subscription_tier (replaced by organization_type)
ALTER TABLE tenants
  DROP COLUMN IF EXISTS subscription_tier;

-- Drop user and customer limits (no limits in new model)
ALTER TABLE tenants
  DROP COLUMN IF EXISTS max_users,
  DROP COLUMN IF EXISTS max_customers;

-- Add pricing fields
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual'));

-- Update pricing based on organization type
UPDATE tenants
SET base_price = 100.00
WHERE base_price IS NULL;

COMMENT ON COLUMN tenants.app_id IS 'Which Co-operative Commonwealth app this tenant belongs to';
COMMENT ON COLUMN tenants.base_price IS 'Base monthly price before discount (in local currency)';
COMMENT ON COLUMN tenants.currency IS 'Currency code (ISO 4217)';
COMMENT ON COLUMN tenants.billing_cycle IS 'Billing frequency';

-- ============================================================================
-- PART 3: Rename Platform Admins to Commonwealth Admins
-- ============================================================================

-- Rename table
ALTER TABLE IF EXISTS platform_admins RENAME TO commonwealth_admins;

-- Rename primary key
ALTER TABLE commonwealth_admins RENAME COLUMN admin_id TO commonwealth_admin_id;

-- Add app permissions (commonwealth admins can manage specific apps or all apps)
ALTER TABLE commonwealth_admins
  ADD COLUMN IF NOT EXISTS app_permissions JSONB DEFAULT '{"all_apps": true}'::jsonb;

-- Add commonwealth-specific fields
ALTER TABLE commonwealth_admins
  ADD COLUMN IF NOT EXISTS commonwealth_role VARCHAR(50) DEFAULT 'app_admin'
    CHECK (commonwealth_role IN ('super_admin', 'app_admin', 'support_admin', 'financial_admin'));

COMMENT ON COLUMN commonwealth_admins.commonwealth_role IS 'Role within the Co-operative Commonwealth: super_admin (all access), app_admin (specific apps), support_admin (support only), financial_admin (billing/finance)';
COMMENT ON COLUMN commonwealth_admins.app_permissions IS 'JSON defining which apps this admin can manage. {"all_apps": true} or {"apps": ["travel_support", "other_app"]}';

-- ============================================================================
-- PART 4: Update Trigger for Organization Type Changes
-- ============================================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS trg_update_discount_on_org_type ON tenants;
DROP FUNCTION IF EXISTS update_discount_on_org_type_change();

-- Create updated function
CREATE OR REPLACE FUNCTION update_organization_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Set discount based on organization type
  IF NEW.organization_type = 'cooperative' THEN
    NEW.discount_percentage := 30.00;
    NEW.governance_requirements := '{"meetings_required": true, "reporting_required": true, "annual_report_deadline": "12-31"}'::jsonb;
  ELSIF NEW.organization_type = 'cooperative_commonwealth' THEN
    NEW.discount_percentage := 50.00;
    NEW.governance_requirements := '{"meetings_required": true, "reporting_required": true, "commonwealth_sharing": true}'::jsonb;
  ELSE
    -- charity, cic, third_sector all pay full price
    NEW.discount_percentage := 0.00;
    NEW.governance_requirements := '{"meetings_required": false, "reporting_required": false}'::jsonb;
  END IF;

  -- Set enabled modules based on cooperative model
  IF NEW.organization_type IN ('cooperative', 'cooperative_commonwealth') THEN
    IF NEW.cooperative_model = 'worker' THEN
      NEW.enabled_modules := '{
        "admin": {"governance": true, "membership": true, "voting": true, "worker_management": true},
        "driver": {"ownership_dashboard": true, "profit_sharing": true, "voting": true},
        "customer": {"membership_portal": false, "voting": false}
      }'::jsonb;
    ELSIF NEW.cooperative_model = 'passenger' THEN
      NEW.enabled_modules := '{
        "admin": {"governance": true, "membership": true, "voting": true, "customer_management": true},
        "driver": {"ownership_dashboard": false, "profit_sharing": false, "voting": false},
        "customer": {"membership_portal": true, "voting": true, "employment_decisions": true}
      }'::jsonb;
    ELSIF NEW.cooperative_model = 'hybrid' THEN
      NEW.enabled_modules := '{
        "admin": {"governance": true, "membership": true, "voting": true, "hybrid_management": true},
        "driver": {"ownership_dashboard": true, "profit_sharing": true, "voting": true},
        "customer": {"membership_portal": true, "voting": true, "employment_decisions": true}
      }'::jsonb;
    END IF;

    -- Add commonwealth-specific modules for commonwealth cooperatives
    IF NEW.organization_type = 'cooperative_commonwealth' THEN
      NEW.enabled_modules := jsonb_set(
        NEW.enabled_modules,
        '{admin,commonwealth_network}',
        'true'::jsonb
      );
    END IF;
  ELSE
    NEW.enabled_modules := '{
      "admin": {"governance": false, "membership": false, "voting": false},
      "driver": {"ownership_dashboard": false, "profit_sharing": false, "voting": false},
      "customer": {"membership_portal": false, "voting": false}
    }'::jsonb;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trg_update_organization_config
  BEFORE INSERT OR UPDATE OF organization_type, cooperative_model ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_config();

-- ============================================================================
-- PART 5: Create Commonwealth Service Sharing Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS commonwealth_service_sharing (
  sharing_id SERIAL PRIMARY KEY,
  provider_tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  recipient_tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  service_type VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Value tracking
  estimated_value DECIMAL(10,2),
  actual_value DECIMAL(10,2),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT different_tenants CHECK (provider_tenant_id != recipient_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_service_sharing_provider ON commonwealth_service_sharing(provider_tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_sharing_recipient ON commonwealth_service_sharing(recipient_tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_sharing_active ON commonwealth_service_sharing(is_active);

COMMENT ON TABLE commonwealth_service_sharing IS 'Tracks services shared between commonwealth member cooperatives';

-- ============================================================================
-- PART 6: Create Billing History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_billing_history (
  billing_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,

  -- Pricing breakdown
  base_price DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,

  -- Organization details at time of billing
  organization_type VARCHAR(50) NOT NULL,
  cooperative_model VARCHAR(50),

  -- Payment tracking
  invoice_number VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date DATE,

  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_tenant ON tenant_billing_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_period ON tenant_billing_history(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_billing_status ON tenant_billing_history(payment_status);

COMMENT ON TABLE tenant_billing_history IS 'Historical record of tenant billing with discount tracking';

-- ============================================================================
-- PART 7: Update Views
-- ============================================================================

-- Drop old view
DROP VIEW IF EXISTS cooperative_overview;

-- Create updated comprehensive view
CREATE OR REPLACE VIEW commonwealth_tenant_overview AS
SELECT
  t.tenant_id,
  t.company_name,
  t.subdomain,
  t.organization_type,
  t.cooperative_model,
  t.base_price,
  t.discount_percentage,
  ROUND(t.base_price * (1 - t.discount_percentage / 100.0), 2) as actual_price,
  t.currency,
  t.billing_cycle,
  t.governance_requirements,
  t.enabled_modules,
  t.is_active,

  -- App information
  a.app_name,
  a.app_code,

  -- Membership counts
  COUNT(DISTINCT cm.membership_id) FILTER (WHERE cm.is_active = true) as active_members,
  COUNT(DISTINCT cm.membership_id) FILTER (WHERE cm.member_type = 'driver' AND cm.is_active = true) as driver_members,
  COUNT(DISTINCT cm.membership_id) FILTER (WHERE cm.member_type = 'customer' AND cm.is_active = true) as customer_members,

  -- Governance compliance
  COUNT(DISTINCT cmeet.meeting_id) FILTER (WHERE cmeet.scheduled_date >= CURRENT_DATE - INTERVAL '1 year') as meetings_last_year,
  COUNT(DISTINCT cmeet.meeting_id) FILTER (WHERE cmeet.held_date IS NOT NULL AND cmeet.scheduled_date >= CURRENT_DATE - INTERVAL '1 year') as meetings_held_last_year,
  COUNT(DISTINCT crep.report_id) FILTER (WHERE crep.status IN ('submitted', 'approved') AND crep.period_end >= CURRENT_DATE - INTERVAL '1 year') as reports_submitted_last_year,

  -- Commonwealth participation (for commonwealth cooperatives)
  COUNT(DISTINCT css_provider.sharing_id) FILTER (WHERE css_provider.is_active = true) as services_provided,
  COUNT(DISTINCT css_recipient.sharing_id) FILTER (WHERE css_recipient.is_active = true) as services_received,

  t.created_at,
  t.updated_at
FROM tenants t
LEFT JOIN commonwealth_apps a ON t.app_id = a.app_id
LEFT JOIN cooperative_membership cm ON t.tenant_id = cm.tenant_id
LEFT JOIN cooperative_meetings cmeet ON t.tenant_id = cmeet.tenant_id
LEFT JOIN cooperative_reports crep ON t.tenant_id = crep.tenant_id
LEFT JOIN commonwealth_service_sharing css_provider ON t.tenant_id = css_provider.provider_tenant_id
LEFT JOIN commonwealth_service_sharing css_recipient ON t.tenant_id = css_recipient.recipient_tenant_id
GROUP BY t.tenant_id, a.app_name, a.app_code;

COMMENT ON VIEW commonwealth_tenant_overview IS 'Comprehensive overview of all tenants with pricing, compliance, and commonwealth participation';

-- Create view for pricing summary
CREATE OR REPLACE VIEW tenant_pricing_summary AS
SELECT
  organization_type,
  cooperative_model,
  COUNT(*) as tenant_count,
  AVG(base_price) as avg_base_price,
  AVG(discount_percentage) as avg_discount,
  AVG(base_price * (1 - discount_percentage / 100.0)) as avg_actual_price,
  SUM(base_price * (1 - discount_percentage / 100.0)) as total_monthly_revenue
FROM tenants
WHERE is_active = true
GROUP BY organization_type, cooperative_model
ORDER BY organization_type, cooperative_model;

COMMENT ON VIEW tenant_pricing_summary IS 'Pricing and revenue summary by organization type';

-- ============================================================================
-- PART 8: Update Existing Data
-- ============================================================================

-- Trigger will automatically set discount_percentage, but let's ensure consistency
UPDATE tenants
SET
  base_price = COALESCE(base_price, 100.00),
  currency = COALESCE(currency, 'GBP'),
  billing_cycle = COALESCE(billing_cycle, 'monthly')
WHERE base_price IS NULL OR currency IS NULL OR billing_cycle IS NULL;

-- ============================================================================
-- PART 9: Create Helper Functions
-- ============================================================================

-- Function to calculate actual price for a tenant
CREATE OR REPLACE FUNCTION get_tenant_actual_price(p_tenant_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_base_price DECIMAL(10,2);
  v_discount_pct DECIMAL(5,2);
BEGIN
  SELECT base_price, discount_percentage
  INTO v_base_price, v_discount_pct
  FROM tenants
  WHERE tenant_id = p_tenant_id;

  RETURN ROUND(v_base_price * (1 - v_discount_pct / 100.0), 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tenant_actual_price IS 'Calculate the actual price for a tenant after discount';

-- Function to check commonwealth eligibility
CREATE OR REPLACE FUNCTION check_commonwealth_eligibility(p_tenant_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_type VARCHAR(50);
  v_services_provided INTEGER;
  v_compliance BOOLEAN;
BEGIN
  -- Get organization type
  SELECT organization_type INTO v_org_type
  FROM tenants
  WHERE tenant_id = p_tenant_id;

  -- Must be a cooperative to be eligible for commonwealth
  IF v_org_type NOT IN ('cooperative', 'cooperative_commonwealth') THEN
    RETURN FALSE;
  END IF;

  -- Check if providing services to other cooperatives
  SELECT COUNT(*) INTO v_services_provided
  FROM commonwealth_service_sharing
  WHERE provider_tenant_id = p_tenant_id
    AND is_active = true;

  -- Check governance compliance (meetings and reports in last year)
  SELECT EXISTS(
    SELECT 1 FROM cooperative_meetings
    WHERE tenant_id = p_tenant_id
      AND scheduled_date >= CURRENT_DATE - INTERVAL '1 year'
      AND held_date IS NOT NULL
  ) AND EXISTS(
    SELECT 1 FROM cooperative_reports
    WHERE tenant_id = p_tenant_id
      AND period_end >= CURRENT_DATE - INTERVAL '1 year'
      AND status IN ('submitted', 'approved')
  ) INTO v_compliance;

  -- Eligible if providing services AND compliant
  RETURN (v_services_provided > 0 AND v_compliance);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_commonwealth_eligibility IS 'Check if a cooperative is eligible for commonwealth status (50% discount)';

-- ============================================================================
-- PART 10: Add Constraints and Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenants_app ON tenants(app_id);
CREATE INDEX IF NOT EXISTS idx_tenants_org_type ON tenants(organization_type);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- ============================================================================
-- PART 11: Grant Permissions (adjust as needed)
-- ============================================================================

-- Example: Grant permissions to application role
-- GRANT SELECT, INSERT, UPDATE ON commonwealth_apps TO your_app_role;
-- GRANT SELECT, INSERT, UPDATE ON commonwealth_service_sharing TO your_app_role;
-- GRANT SELECT, INSERT ON tenant_billing_history TO your_app_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary of changes
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Co-operative Commonwealth Migration Complete';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary of changes:';
  RAISE NOTICE '- Removed subscription_tier (replaced with organization_type)';
  RAISE NOTICE '- Removed max_users and max_customers (unlimited)';
  RAISE NOTICE '- Added multi-app support (commonwealth_apps table)';
  RAISE NOTICE '- Renamed platform_admins to commonwealth_admins';
  RAISE NOTICE '- Added commonwealth service sharing tracking';
  RAISE NOTICE '- Added billing history with discount tracking';
  RAISE NOTICE '- Created pricing views and helper functions';
  RAISE NOTICE '';
  RAISE NOTICE 'Pricing structure:';
  RAISE NOTICE '- Charity/CIC/Third Sector: 0%% discount (full price)';
  RAISE NOTICE '- Co-operative: 30%% discount (with governance requirements)';
  RAISE NOTICE '- Commonwealth Co-operative: 50%% discount (service sharing + governance)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update backend code to use new schema';
  RAISE NOTICE '2. Update frontend to remove subscription tier references';
  RAISE NOTICE '3. Add commonwealth admin features';
  RAISE NOTICE '4. Implement service sharing tracking';
  RAISE NOTICE '============================================';
END $$;
