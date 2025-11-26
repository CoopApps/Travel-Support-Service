-- Fix: Drop orphaned indexes and recreate timesheets table
-- The indexes exist without the table due to a previous partial migration

-- Drop orphaned indexes
DROP INDEX IF EXISTS idx_timesheets_tenant;
DROP INDEX IF EXISTS idx_timesheets_driver;
DROP INDEX IF EXISTS idx_timesheets_status;
DROP INDEX IF EXISTS idx_timesheets_week_starting;
DROP INDEX IF EXISTS idx_timesheets_week_ending;
DROP INDEX IF EXISTS idx_timesheets_tenant_status;
DROP INDEX IF EXISTS idx_timesheets_driver_week;

-- Drop orphaned functions
DROP FUNCTION IF EXISTS update_timesheet_updated_at() CASCADE;
DROP FUNCTION IF EXISTS calculate_timesheet_totals() CASCADE;

-- Drop orphaned view
DROP VIEW IF EXISTS view_pending_timesheet_approvals;

-- Now create the table fresh
DROP TABLE IF EXISTS tenant_timesheets CASCADE;

CREATE TABLE tenant_timesheets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  week_starting DATE NOT NULL,
  week_ending DATE NOT NULL,
  regular_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  regular_pay DECIMAL(10,2),
  overtime_pay DECIMAL(10,2),
  total_pay DECIMAL(10,2),
  monday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  tuesday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  wednesday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  thursday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  friday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  saturday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  sunday_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  driver_notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by INTEGER,
  rejected_at TIMESTAMP,
  rejected_by INTEGER,
  rejection_reason TEXT,
  payroll_period_id INTEGER,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_timesheet_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_timesheet_driver FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE,
  CONSTRAINT check_week_period CHECK (week_ending > week_starting)
);

CREATE INDEX idx_timesheets_tenant ON tenant_timesheets(tenant_id);
CREATE INDEX idx_timesheets_driver ON tenant_timesheets(driver_id);
CREATE INDEX idx_timesheets_status ON tenant_timesheets(status);
CREATE INDEX idx_timesheets_week_starting ON tenant_timesheets(week_starting);
CREATE INDEX idx_timesheets_week_ending ON tenant_timesheets(week_ending);
CREATE INDEX idx_timesheets_tenant_status ON tenant_timesheets(tenant_id, status);
CREATE INDEX idx_timesheets_driver_week ON tenant_timesheets(driver_id, week_starting, week_ending);

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

CREATE OR REPLACE FUNCTION calculate_timesheet_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_hours = NEW.monday_hours + NEW.tuesday_hours + NEW.wednesday_hours +
                    NEW.thursday_hours + NEW.friday_hours + NEW.saturday_hours + NEW.sunday_hours;
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

COMMENT ON TABLE tenant_timesheets IS 'Driver weekly timesheets with approval workflow and payroll integration';
