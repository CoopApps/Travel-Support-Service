-- ============================================================================
-- Timesheets Table Migration
-- ============================================================================
-- This migration creates the tenant_timesheets table for tracking driver
-- work hours, submissions, approvals, and payroll integration
-- ============================================================================

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS tenant_timesheets CASCADE;

-- ============================================================================
-- TABLE: tenant_timesheets
-- ============================================================================
-- Stores weekly timesheet records for drivers with hour breakdowns,
-- approval workflow, and payroll integration
-- ============================================================================

CREATE TABLE tenant_timesheets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,

  -- Time Period
  week_starting DATE NOT NULL,
  week_ending DATE NOT NULL,

  -- Hours Breakdown
  regular_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_hours DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Calculated Pay
  regular_pay DECIMAL(10,2),
  overtime_pay DECIMAL(10,2),
  total_pay DECIMAL(10,2),

  -- Daily Hours
  monday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  tuesday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  wednesday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  thursday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  friday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  saturday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  sunday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Notes
  notes TEXT,
  driver_notes TEXT,

  -- Workflow Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),

  -- Submission & Approval
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by INTEGER,
  rejected_at TIMESTAMP,
  rejected_by INTEGER,
  rejection_reason TEXT,

  -- Payment Integration
  payroll_period_id INTEGER,
  paid_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT fk_timesheet_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_timesheet_driver FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE,
  CONSTRAINT check_week_period CHECK (week_ending > week_starting),
  CONSTRAINT check_total_hours CHECK (total_hours = regular_hours + overtime_hours)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_timesheets_tenant ON tenant_timesheets(tenant_id);
CREATE INDEX idx_timesheets_driver ON tenant_timesheets(driver_id);
CREATE INDEX idx_timesheets_status ON tenant_timesheets(status);
CREATE INDEX idx_timesheets_week_starting ON tenant_timesheets(week_starting);
CREATE INDEX idx_timesheets_week_ending ON tenant_timesheets(week_ending);
CREATE INDEX idx_timesheets_tenant_status ON tenant_timesheets(tenant_id, status);
CREATE INDEX idx_timesheets_driver_week ON tenant_timesheets(driver_id, week_starting, week_ending);

-- ============================================================================
-- TRIGGER: Update updated_at on changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timesheet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timesheet_timestamp
  BEFORE UPDATE ON tenant_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION update_timesheet_updated_at();

-- ============================================================================
-- TRIGGER: Auto-calculate total hours
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_timesheet_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total hours from daily breakdown
  NEW.total_hours = NEW.monday_hours + NEW.tuesday_hours + NEW.wednesday_hours +
                    NEW.thursday_hours + NEW.friday_hours + NEW.saturday_hours + NEW.sunday_hours;

  -- Assume standard work week is 40 hours (configurable per tenant)
  IF NEW.total_hours > 40 THEN
    NEW.regular_hours = 40;
    NEW.overtime_hours = NEW.total_hours - 40;
  ELSE
    NEW.regular_hours = NEW.total_hours;
    NEW.overtime_hours = 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_timesheet_totals
  BEFORE INSERT OR UPDATE ON tenant_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_timesheet_totals();

-- ============================================================================
-- View for pending timesheet approvals
-- ============================================================================

CREATE OR REPLACE VIEW view_pending_timesheet_approvals AS
SELECT
  t.id,
  t.tenant_id,
  t.driver_id,
  t.week_starting,
  t.week_ending,
  t.regular_hours,
  t.overtime_hours,
  t.total_hours,
  t.regular_pay,
  t.overtime_pay,
  t.total_pay,
  t.monday_hours,
  t.tuesday_hours,
  t.wednesday_hours,
  t.thursday_hours,
  t.friday_hours,
  t.saturday_hours,
  t.sunday_hours,
  t.status,
  t.submitted_at,
  t.approved_at,
  t.approved_by,
  t.rejected_at,
  t.rejected_by,
  t.rejection_reason,
  t.payroll_period_id,
  t.paid_at,
  t.notes,
  t.driver_notes,
  t.created_at,
  t.updated_at,
  d.name as driver_name,
  d.email as driver_email,
  d.employment_type,
  approver.full_name as approved_by_name,
  rejecter.full_name as rejected_by_name
FROM tenant_timesheets t
JOIN tenant_drivers d ON t.driver_id = d.driver_id AND t.tenant_id = d.tenant_id
LEFT JOIN tenant_users approver ON t.approved_by = approver.user_id
LEFT JOIN tenant_users rejecter ON t.rejected_by = rejecter.user_id
WHERE t.status = 'submitted'
ORDER BY t.submitted_at ASC;

COMMENT ON VIEW view_pending_timesheet_approvals IS 'View of timesheets awaiting approval with driver information';

-- ============================================================================
-- Grant permissions
-- ============================================================================

COMMENT ON TABLE tenant_timesheets IS 'Driver weekly timesheets with approval workflow and payroll integration';
