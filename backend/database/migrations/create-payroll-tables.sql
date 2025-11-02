-- Payroll Tables Migration
-- Created: 2025-10-30
-- Purpose: Payroll management system for tracking employee wages and HMRC submissions

-- ============================================================================
-- 1. Update drivers table to add soft delete and payroll fields
-- ============================================================================
ALTER TABLE tenant_drivers
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) DEFAULT 'contracted_hourly'
  CHECK (employment_type IN ('contracted_monthly', 'contracted_weekly', 'contracted_hourly', 'freelance')),
ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS weekly_wage DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_sort_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS tax_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS ni_number VARCHAR(20);

-- ============================================================================
-- 2. Create payroll periods table
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_payroll_periods (
  period_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'submitted', 'completed')),
  total_gross DECIMAL(12, 2) DEFAULT 0,
  total_tax DECIMAL(12, 2) DEFAULT 0,
  total_ni DECIMAL(12, 2) DEFAULT 0,
  total_pension DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  total_net DECIMAL(12, 2) DEFAULT 0,
  hmrc_payment_due DECIMAL(12, 2) DEFAULT 0,
  submitted_date TIMESTAMP,
  submitted_by INTEGER REFERENCES tenant_users(user_id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, period_start, period_end)
);

CREATE INDEX idx_payroll_periods_tenant ON tenant_payroll_periods(tenant_id);
CREATE INDEX idx_payroll_periods_dates ON tenant_payroll_periods(period_start, period_end);
CREATE INDEX idx_payroll_periods_status ON tenant_payroll_periods(status);

-- ============================================================================
-- 3. Create payroll records table (individual driver payroll per period)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_payroll_records (
  record_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL REFERENCES tenant_payroll_periods(period_id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES tenant_drivers(driver_id),
  employment_type VARCHAR(20) NOT NULL,

  -- Pay calculation
  hours_worked DECIMAL(8, 2),
  hourly_rate DECIMAL(10, 2),
  weekly_wage DECIMAL(10, 2),
  monthly_salary DECIMAL(10, 2),
  gross_pay DECIMAL(10, 2) NOT NULL,

  -- Deductions
  tax_deducted DECIMAL(10, 2) DEFAULT 0,
  ni_deducted DECIMAL(10, 2) DEFAULT 0,
  pension_deducted DECIMAL(10, 2) DEFAULT 0,
  other_deductions DECIMAL(10, 2) DEFAULT 0,
  deduction_notes TEXT,

  -- Net pay
  net_pay DECIMAL(10, 2) NOT NULL,

  -- Status tracking
  is_new_joiner BOOLEAN DEFAULT false,
  is_leaver BOOLEAN DEFAULT false,
  leaving_date DATE,

  -- Payment tracking
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed')),
  payment_date DATE,
  payment_reference VARCHAR(100),

  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(period_id, driver_id)
);

CREATE INDEX idx_payroll_records_tenant ON tenant_payroll_records(tenant_id);
CREATE INDEX idx_payroll_records_period ON tenant_payroll_records(period_id);
CREATE INDEX idx_payroll_records_driver ON tenant_payroll_records(driver_id);
CREATE INDEX idx_payroll_records_status ON tenant_payroll_records(payment_status);

-- ============================================================================
-- 4. Create freelance submissions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_freelance_submissions (
  submission_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL REFERENCES tenant_payroll_periods(period_id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES tenant_drivers(driver_id),

  -- Invoice details
  invoice_number VARCHAR(100),
  invoice_date DATE NOT NULL,
  invoice_amount DECIMAL(10, 2) NOT NULL,

  -- Self-assessment info (provided by freelancer)
  tax_paid DECIMAL(10, 2) DEFAULT 0,
  ni_paid DECIMAL(10, 2) DEFAULT 0,

  -- Payment tracking
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed')),
  payment_date DATE,
  payment_reference VARCHAR(100),

  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_freelance_submissions_tenant ON tenant_freelance_submissions(tenant_id);
CREATE INDEX idx_freelance_submissions_period ON tenant_freelance_submissions(period_id);
CREATE INDEX idx_freelance_submissions_driver ON tenant_freelance_submissions(driver_id);

-- ============================================================================
-- 5. Create payroll movements table (joiners and leavers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_payroll_movements (
  movement_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL REFERENCES tenant_payroll_periods(period_id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES tenant_drivers(driver_id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('joiner', 'leaver')),
  movement_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payroll_movements_tenant ON tenant_payroll_movements(tenant_id);
CREATE INDEX idx_payroll_movements_period ON tenant_payroll_movements(period_id);
CREATE INDEX idx_payroll_movements_type ON tenant_payroll_movements(movement_type);

-- ============================================================================
-- 6. Create update trigger for timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_payroll_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_periods_timestamp
BEFORE UPDATE ON tenant_payroll_periods
FOR EACH ROW EXECUTE FUNCTION update_payroll_timestamp();

CREATE TRIGGER update_payroll_records_timestamp
BEFORE UPDATE ON tenant_payroll_records
FOR EACH ROW EXECUTE FUNCTION update_payroll_timestamp();

CREATE TRIGGER update_freelance_submissions_timestamp
BEFORE UPDATE ON tenant_freelance_submissions
FOR EACH ROW EXECUTE FUNCTION update_payroll_timestamp();

-- ============================================================================
-- 7. Add comments for documentation
-- ============================================================================
COMMENT ON TABLE tenant_payroll_periods IS 'Payroll periods for generating wage reports';
COMMENT ON TABLE tenant_payroll_records IS 'Individual driver payroll records per period';
COMMENT ON TABLE tenant_freelance_submissions IS 'Freelance contractor invoice submissions';
COMMENT ON TABLE tenant_payroll_movements IS 'Track employee joiners and leavers per period';
