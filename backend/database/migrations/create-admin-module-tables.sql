-- =============================================
-- Company Admin Module - Database Migration
-- =============================================
-- Creates tables for office staff, cost centers, and timesheets
-- Run this migration after payroll tables are created

-- =============================================
-- 1. OFFICE STAFF TABLE
-- =============================================
-- Manages non-driver employees (office staff, managers, admins)
CREATE TABLE IF NOT EXISTS tenant_office_staff (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  -- Employment Details
  employee_number VARCHAR(50),
  job_title VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  employment_type VARCHAR(20) NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary')),
  start_date DATE NOT NULL,
  end_date DATE,

  -- Compensation
  salary_annual DECIMAL(10, 2),
  hourly_rate DECIMAL(10, 2),

  -- Manager & Reporting
  manager_id INTEGER REFERENCES tenant_office_staff(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint on employee number per tenant
  UNIQUE(tenant_id, employee_number)
);

-- Index for common queries
CREATE INDEX idx_office_staff_tenant ON tenant_office_staff(tenant_id);
CREATE INDEX idx_office_staff_active ON tenant_office_staff(tenant_id, is_active);
CREATE INDEX idx_office_staff_department ON tenant_office_staff(tenant_id, department);
CREATE INDEX idx_office_staff_manager ON tenant_office_staff(manager_id);

-- =============================================
-- 2. COST CENTER TABLE
-- =============================================
-- Tracks budgets, expenses, and recurring costs
CREATE TABLE IF NOT EXISTS tenant_cost_centers (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Cost Center Details
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('operational', 'administrative', 'fleet', 'compliance', 'marketing', 'it', 'facilities', 'other')),

  -- Budget Information
  budget_annual DECIMAL(12, 2),
  budget_monthly DECIMAL(12, 2),

  -- Responsible Person
  owner_id INTEGER REFERENCES tenant_office_staff(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint on code per tenant
  UNIQUE(tenant_id, code)
);

-- Index for common queries
CREATE INDEX idx_cost_centers_tenant ON tenant_cost_centers(tenant_id);
CREATE INDEX idx_cost_centers_active ON tenant_cost_centers(tenant_id, is_active);
CREATE INDEX idx_cost_centers_category ON tenant_cost_centers(tenant_id, category);

-- =============================================
-- 3. COST CENTER EXPENSES TABLE
-- =============================================
-- Records individual expenses against cost centers
CREATE TABLE IF NOT EXISTS tenant_cost_center_expenses (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  cost_center_id INTEGER NOT NULL REFERENCES tenant_cost_centers(id) ON DELETE CASCADE,

  -- Expense Details
  expense_date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR(50),

  -- Reference
  reference_number VARCHAR(100),
  invoice_number VARCHAR(100),

  -- Payment
  payment_method VARCHAR(50),
  paid_date DATE,

  -- Who logged it
  logged_by INTEGER REFERENCES tenant_office_staff(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for common queries
CREATE INDEX idx_expenses_tenant ON tenant_cost_center_expenses(tenant_id);
CREATE INDEX idx_expenses_cost_center ON tenant_cost_center_expenses(cost_center_id);
CREATE INDEX idx_expenses_date ON tenant_cost_center_expenses(tenant_id, expense_date);

-- =============================================
-- 4. DRIVER TIMESHEETS TABLE
-- =============================================
-- Tracks time worked by drivers (especially freelance/contractors)
CREATE TABLE IF NOT EXISTS tenant_driver_timesheets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE,

  -- Time Period
  week_starting DATE NOT NULL,
  week_ending DATE NOT NULL,

  -- Hours Breakdown
  regular_hours DECIMAL(5, 2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(5, 2) NOT NULL DEFAULT 0,
  total_hours DECIMAL(5, 2) NOT NULL DEFAULT 0,

  -- Calculated Pay (read-only, calculated from driver rates)
  regular_pay DECIMAL(10, 2),
  overtime_pay DECIMAL(10, 2),
  total_pay DECIMAL(10, 2),

  -- Daily Hours (for detailed tracking)
  monday_hours DECIMAL(5, 2) DEFAULT 0,
  tuesday_hours DECIMAL(5, 2) DEFAULT 0,
  wednesday_hours DECIMAL(5, 2) DEFAULT 0,
  thursday_hours DECIMAL(5, 2) DEFAULT 0,
  friday_hours DECIMAL(5, 2) DEFAULT 0,
  saturday_hours DECIMAL(5, 2) DEFAULT 0,
  sunday_hours DECIMAL(5, 2) DEFAULT 0,

  -- Notes
  notes TEXT,
  driver_notes TEXT,

  -- Workflow Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),

  -- Submission & Approval
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by INTEGER REFERENCES tenant_office_staff(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP,
  rejected_by INTEGER REFERENCES tenant_office_staff(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- Payment Integration
  payroll_period_id INTEGER REFERENCES tenant_payroll_periods(period_id) ON DELETE SET NULL,
  paid_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one timesheet per driver per week
  UNIQUE(tenant_id, driver_id, week_starting)
);

-- Index for common queries
CREATE INDEX idx_timesheets_tenant ON tenant_driver_timesheets(tenant_id);
CREATE INDEX idx_timesheets_driver ON tenant_driver_timesheets(driver_id);
CREATE INDEX idx_timesheets_status ON tenant_driver_timesheets(tenant_id, status);
CREATE INDEX idx_timesheets_week ON tenant_driver_timesheets(tenant_id, week_starting);
CREATE INDEX idx_timesheets_approval ON tenant_driver_timesheets(tenant_id, status, approved_by);

-- =============================================
-- 5. COMPANY SETTINGS TABLE
-- =============================================
-- Stores tenant-level configuration settings
CREATE TABLE IF NOT EXISTS tenant_company_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Company Information
  legal_name VARCHAR(255),
  trading_name VARCHAR(255),
  company_number VARCHAR(50),
  vat_number VARCHAR(50),

  -- Contact Details
  primary_phone VARCHAR(20),
  primary_email VARCHAR(255),
  support_email VARCHAR(255),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  county VARCHAR(100),
  postcode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United Kingdom',

  -- Business Settings
  fiscal_year_start DATE,
  default_timezone VARCHAR(50) DEFAULT 'Europe/London',
  default_currency VARCHAR(3) DEFAULT 'GBP',

  -- Payroll Settings
  standard_work_hours_per_week DECIMAL(5, 2) DEFAULT 40.00,
  overtime_multiplier DECIMAL(3, 2) DEFAULT 1.50,

  -- Timesheet Settings
  timesheet_approval_required BOOLEAN DEFAULT true,
  timesheet_cutoff_day INTEGER DEFAULT 0 CHECK (timesheet_cutoff_day BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One settings record per tenant
  UNIQUE(tenant_id)
);

-- Index for tenant lookup
CREATE INDEX idx_company_settings_tenant ON tenant_company_settings(tenant_id);

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- Update timestamp trigger for office staff
CREATE OR REPLACE FUNCTION update_office_staff_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_office_staff_timestamp
BEFORE UPDATE ON tenant_office_staff
FOR EACH ROW
EXECUTE FUNCTION update_office_staff_timestamp();

-- Update timestamp trigger for cost centers
CREATE OR REPLACE FUNCTION update_cost_center_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cost_center_timestamp
BEFORE UPDATE ON tenant_cost_centers
FOR EACH ROW
EXECUTE FUNCTION update_cost_center_timestamp();

-- Update timestamp trigger for expenses
CREATE OR REPLACE FUNCTION update_expense_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expense_timestamp
BEFORE UPDATE ON tenant_cost_center_expenses
FOR EACH ROW
EXECUTE FUNCTION update_expense_timestamp();

-- Update timestamp trigger for timesheets
CREATE OR REPLACE FUNCTION update_timesheet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timesheet_timestamp
BEFORE UPDATE ON tenant_driver_timesheets
FOR EACH ROW
EXECUTE FUNCTION update_timesheet_timestamp();

-- Calculate total hours and pay for timesheets
CREATE OR REPLACE FUNCTION calculate_timesheet_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total hours from daily breakdown
  NEW.total_hours = COALESCE(NEW.monday_hours, 0) +
                    COALESCE(NEW.tuesday_hours, 0) +
                    COALESCE(NEW.wednesday_hours, 0) +
                    COALESCE(NEW.thursday_hours, 0) +
                    COALESCE(NEW.friday_hours, 0) +
                    COALESCE(NEW.saturday_hours, 0) +
                    COALESCE(NEW.sunday_hours, 0);

  -- Split into regular and overtime hours (assuming 40 hour standard week)
  IF NEW.total_hours <= 40 THEN
    NEW.regular_hours = NEW.total_hours;
    NEW.overtime_hours = 0;
  ELSE
    NEW.regular_hours = 40;
    NEW.overtime_hours = NEW.total_hours - 40;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_timesheet_totals
BEFORE INSERT OR UPDATE ON tenant_driver_timesheets
FOR EACH ROW
EXECUTE FUNCTION calculate_timesheet_totals();

-- Update timestamp trigger for company settings
CREATE OR REPLACE FUNCTION update_company_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_settings_timestamp
BEFORE UPDATE ON tenant_company_settings
FOR EACH ROW
EXECUTE FUNCTION update_company_settings_timestamp();

-- =============================================
-- VIEWS
-- =============================================

-- View: Active office staff with manager names
CREATE OR REPLACE VIEW view_office_staff_with_managers AS
SELECT
  s.*,
  m.first_name || ' ' || m.last_name AS manager_name
FROM tenant_office_staff s
LEFT JOIN tenant_office_staff m ON s.manager_id = m.id
WHERE s.is_active = true;

-- View: Cost center budget utilization
CREATE OR REPLACE VIEW view_cost_center_utilization AS
SELECT
  cc.id,
  cc.tenant_id,
  cc.code,
  cc.name,
  cc.category,
  cc.budget_annual,
  cc.budget_monthly,
  COALESCE(SUM(e.amount), 0) AS total_spent_ytd,
  COALESCE(SUM(CASE
    WHEN EXTRACT(MONTH FROM e.expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    THEN e.amount
    ELSE 0
  END), 0) AS total_spent_this_month,
  cc.budget_annual - COALESCE(SUM(e.amount), 0) AS remaining_annual,
  cc.budget_monthly - COALESCE(SUM(CASE
    WHEN EXTRACT(MONTH FROM e.expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    THEN e.amount
    ELSE 0
  END), 0) AS remaining_monthly
FROM tenant_cost_centers cc
LEFT JOIN tenant_cost_center_expenses e ON cc.id = e.cost_center_id
WHERE cc.is_active = true
GROUP BY cc.id, cc.tenant_id, cc.code, cc.name, cc.category, cc.budget_annual, cc.budget_monthly;

-- View: Pending timesheet approvals
CREATE OR REPLACE VIEW view_pending_timesheet_approvals AS
SELECT
  t.*,
  d.name AS driver_name,
  d.employment_type,
  d.hourly_rate
FROM tenant_driver_timesheets t
INNER JOIN tenant_drivers d ON t.driver_id = d.driver_id
WHERE t.status = 'submitted'
ORDER BY t.submitted_at ASC;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE tenant_office_staff IS 'Manages non-driver employees (office staff, managers, administrators)';
COMMENT ON TABLE tenant_cost_centers IS 'Tracks budgets and cost allocation across different business areas';
COMMENT ON TABLE tenant_cost_center_expenses IS 'Individual expense records against cost centers';
COMMENT ON TABLE tenant_driver_timesheets IS 'Weekly timesheets submitted by drivers, especially freelance/contractors';
COMMENT ON TABLE tenant_company_settings IS 'Tenant-level configuration and business settings';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Company Admin module tables created successfully!';
  RAISE NOTICE '   ✓ tenant_office_staff';
  RAISE NOTICE '   ✓ tenant_cost_centers';
  RAISE NOTICE '   ✓ tenant_cost_center_expenses';
  RAISE NOTICE '   ✓ tenant_driver_timesheets';
  RAISE NOTICE '   ✓ tenant_company_settings';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created views:';
  RAISE NOTICE '   ✓ view_office_staff_with_managers';
  RAISE NOTICE '   ✓ view_cost_center_utilization';
  RAISE NOTICE '   ✓ view_pending_timesheet_approvals';
END $$;
