/**
 * Migration: Add Organization Types and Co-operative Features
 *
 * Adds support for:
 * - Different organization types (charity, CIC, co-operative)
 * - Co-operative models (worker, passenger, hybrid)
 * - Discount tiers based on organization type
 * - Co-operative governance tracking (meetings, reporting)
 * - Feature flags based on organization structure
 */

-- Add organization type fields to tenants table
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'charity'
    CHECK (organization_type IN ('charity', 'cic', 'third_sector', 'cooperative', 'cooperative_commonwealth')),
  ADD COLUMN IF NOT EXISTS cooperative_model VARCHAR(50)
    CHECK (cooperative_model IN ('worker', 'passenger', 'hybrid', NULL)),
  ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0.00
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  ADD COLUMN IF NOT EXISTS governance_requirements JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN tenants.organization_type IS 'Type of organization: charity (0% discount), cic (0%), third_sector (0%), cooperative (30%), cooperative_commonwealth (50%)';
COMMENT ON COLUMN tenants.cooperative_model IS 'For cooperatives: worker (driver-owned), passenger (customer-owned), hybrid (both)';
COMMENT ON COLUMN tenants.discount_percentage IS 'Percentage discount on subscription (0-100)';
COMMENT ON COLUMN tenants.governance_requirements IS 'JSON object tracking governance obligations like meetings, reporting deadlines';
COMMENT ON COLUMN tenants.enabled_modules IS 'JSON object defining which modules are enabled for this organization type';

-- Create co-operative governance tracking table
CREATE TABLE IF NOT EXISTS cooperative_meetings (
  meeting_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  meeting_type VARCHAR(50) NOT NULL CHECK (meeting_type IN ('general_assembly', 'board_meeting', 'worker_meeting', 'member_meeting')),
  scheduled_date DATE NOT NULL,
  held_date DATE,
  attendees_count INTEGER,
  quorum_met BOOLEAN,
  minutes_url TEXT,
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cooperative_meetings_tenant ON cooperative_meetings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cooperative_meetings_date ON cooperative_meetings(scheduled_date);

COMMENT ON TABLE cooperative_meetings IS 'Tracks governance meetings for cooperatives to ensure compliance';

-- Create co-operative reporting table
CREATE TABLE IF NOT EXISTS cooperative_reports (
  report_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('annual', 'quarterly', 'structure', 'membership')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  submitted_date TIMESTAMP,
  report_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cooperative_reports_tenant ON cooperative_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cooperative_reports_status ON cooperative_reports(status);

COMMENT ON TABLE cooperative_reports IS 'Tracks required reporting submissions for cooperatives';

-- Create membership structure table (for tracking ownership stakes)
CREATE TABLE IF NOT EXISTS cooperative_membership (
  membership_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('driver', 'customer', 'worker', 'other')),
  member_reference_id INTEGER, -- Links to driver_id, customer_id, etc.
  ownership_shares INTEGER DEFAULT 1,
  voting_rights BOOLEAN DEFAULT true,
  joined_date DATE NOT NULL,
  left_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cooperative_membership_tenant ON cooperative_membership(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cooperative_membership_member ON cooperative_membership(member_type, member_reference_id);

COMMENT ON TABLE cooperative_membership IS 'Tracks membership and ownership structure for cooperatives';

-- Set default values for existing tenants
UPDATE tenants
SET
  organization_type = 'charity',
  discount_percentage = 0.00,
  governance_requirements = '{"meetings_required": false, "reporting_required": false}',
  enabled_modules = '{
    "admin": {
      "governance": false,
      "membership": false,
      "voting": false
    },
    "driver": {
      "ownership_dashboard": false,
      "profit_sharing": false
    },
    "customer": {
      "membership_portal": false,
      "voting": false
    }
  }'::jsonb
WHERE organization_type IS NULL;

-- Create function to automatically set discount based on organization type
CREATE OR REPLACE FUNCTION update_discount_on_org_type_change()
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

-- Create trigger to automatically update discount and modules
DROP TRIGGER IF EXISTS trg_update_discount_on_org_type ON tenants;
CREATE TRIGGER trg_update_discount_on_org_type
  BEFORE INSERT OR UPDATE OF organization_type, cooperative_model ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_on_org_type_change();

-- Create view for easy querying of cooperative status
CREATE OR REPLACE VIEW cooperative_overview AS
SELECT
  t.tenant_id,
  t.company_name,
  t.subdomain,
  t.organization_type,
  t.cooperative_model,
  t.discount_percentage,
  t.subscription_tier,
  t.governance_requirements,
  t.enabled_modules,
  COUNT(DISTINCT cm.membership_id) FILTER (WHERE cm.is_active = true) as active_members,
  COUNT(DISTINCT cm.membership_id) FILTER (WHERE cm.member_type = 'driver' AND cm.is_active = true) as driver_members,
  COUNT(DISTINCT cm.membership_id) FILTER (WHERE cm.member_type = 'customer' AND cm.is_active = true) as customer_members,
  COUNT(DISTINCT cmeet.meeting_id) FILTER (WHERE cmeet.scheduled_date >= CURRENT_DATE - INTERVAL '1 year') as meetings_last_year,
  COUNT(DISTINCT crep.report_id) FILTER (WHERE crep.status = 'submitted' AND crep.period_end >= CURRENT_DATE - INTERVAL '1 year') as reports_submitted_last_year
FROM tenants t
LEFT JOIN cooperative_membership cm ON t.tenant_id = cm.tenant_id
LEFT JOIN cooperative_meetings cmeet ON t.tenant_id = cmeet.tenant_id
LEFT JOIN cooperative_reports crep ON t.tenant_id = crep.tenant_id
WHERE t.organization_type IN ('cooperative', 'cooperative_commonwealth')
GROUP BY t.tenant_id;

COMMENT ON VIEW cooperative_overview IS 'Overview of all cooperative tenants with membership and governance statistics';
