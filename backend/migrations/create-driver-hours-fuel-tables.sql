-- =====================================================
-- DRIVER HOURS & FUEL TABLES (FREELANCE DRIVERS)
-- =====================================================
-- For freelance drivers to submit weekly hours and fuel costs
-- =====================================================

-- =====================================================
-- DRIVER HOURS SUBMISSION
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_driver_hours (
  hours_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,

  -- Week Information
  week_ending DATE NOT NULL,  -- Sunday at end of work week

  -- Hours Worked
  regular_hours DECIMAL(5,2) NOT NULL DEFAULT 0,   -- Max 80 hours
  overtime_hours DECIMAL(5,2) DEFAULT 0,            -- Max 40 hours
  total_hours DECIMAL(5,2) GENERATED ALWAYS AS (regular_hours + overtime_hours) STORED,

  -- Rates (stored for historical record)
  hourly_rate DECIMAL(6,2),
  overtime_rate DECIMAL(6,2),

  -- Payment Calculation
  regular_pay DECIMAL(8,2) GENERATED ALWAYS AS (regular_hours * hourly_rate) STORED,
  overtime_pay DECIMAL(8,2) GENERATED ALWAYS AS (overtime_hours * overtime_rate) STORED,
  total_pay DECIMAL(8,2) GENERATED ALWAYS AS ((regular_hours * hourly_rate) + (overtime_hours * overtime_rate)) STORED,

  -- Status
  status VARCHAR(20) DEFAULT 'submitted',  -- submitted, approved, paid, rejected
  notes TEXT,

  -- Approval
  approved_by INTEGER,
  approved_at TIMESTAMP,
  rejection_reason TEXT,

  -- Payment
  paid_date DATE,
  payment_reference VARCHAR(100),

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT fk_hours_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_hours_driver FOREIGN KEY (driver_id, tenant_id) REFERENCES tenant_drivers(driver_id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT chk_regular_hours CHECK (regular_hours >= 0 AND regular_hours <= 80),
  CONSTRAINT chk_overtime_hours CHECK (overtime_hours >= 0 AND overtime_hours <= 40),
  CONSTRAINT unique_driver_week UNIQUE (tenant_id, driver_id, week_ending)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hours_tenant ON tenant_driver_hours(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hours_driver ON tenant_driver_hours(driver_id);
CREATE INDEX IF NOT EXISTS idx_hours_week ON tenant_driver_hours(week_ending);
CREATE INDEX IF NOT EXISTS idx_hours_status ON tenant_driver_hours(status);
CREATE INDEX IF NOT EXISTS idx_hours_created ON tenant_driver_hours(created_at);

-- Comments
COMMENT ON TABLE tenant_driver_hours IS 'Weekly hours submissions for freelance drivers';
COMMENT ON COLUMN tenant_driver_hours.week_ending IS 'Sunday date at end of work week';
COMMENT ON COLUMN tenant_driver_hours.total_hours IS 'Auto-calculated: regular + overtime';
COMMENT ON COLUMN tenant_driver_hours.total_pay IS 'Auto-calculated: (regular * rate) + (overtime * ot_rate)';

-- =====================================================
-- DRIVER FUEL COSTS
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_driver_fuel (
  fuel_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,

  -- Transaction Details
  date DATE NOT NULL,
  station VARCHAR(100) NOT NULL,

  -- Fuel Details
  litres DECIMAL(6,2) NOT NULL,           -- Litres purchased
  cost DECIMAL(6,2) NOT NULL,             -- Total cost in £
  price_per_litre DECIMAL(5,3) GENERATED ALWAYS AS (cost / NULLIF(litres, 0)) STORED,

  -- Vehicle Information
  mileage INTEGER,                         -- Odometer reading

  -- Receipt
  receipt_path VARCHAR(500),               -- Path to receipt image/PDF
  receipt_uploaded_at TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'submitted',  -- submitted, approved, reimbursed, rejected
  notes TEXT,

  -- Approval
  approved_by INTEGER,
  approved_at TIMESTAMP,
  rejection_reason TEXT,

  -- Reimbursement
  reimbursed_date DATE,
  reimbursement_reference VARCHAR(100),

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT fk_fuel_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_fuel_driver FOREIGN KEY (driver_id, tenant_id) REFERENCES tenant_drivers(driver_id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT chk_litres CHECK (litres > 0 AND litres <= 100),
  CONSTRAINT chk_cost CHECK (cost > 0 AND cost <= 200)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fuel_tenant ON tenant_driver_fuel(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_driver ON tenant_driver_fuel(driver_id);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON tenant_driver_fuel(date);
CREATE INDEX IF NOT EXISTS idx_fuel_status ON tenant_driver_fuel(status);
CREATE INDEX IF NOT EXISTS idx_fuel_created ON tenant_driver_fuel(created_at);

-- Comments
COMMENT ON TABLE tenant_driver_fuel IS 'Fuel cost submissions for freelance drivers';
COMMENT ON COLUMN tenant_driver_fuel.price_per_litre IS 'Auto-calculated: cost / litres';
COMMENT ON COLUMN tenant_driver_fuel.mileage IS 'Odometer reading at time of refuel';

-- =====================================================
-- UPDATE TIMESTAMP TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_driver_hours_timestamp'
    ) THEN
        CREATE TRIGGER update_driver_hours_timestamp
        BEFORE UPDATE ON tenant_driver_hours
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_driver_fuel_timestamp'
    ) THEN
        CREATE TRIGGER update_driver_fuel_timestamp
        BEFORE UPDATE ON tenant_driver_fuel
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_safeguarding_timestamp'
    ) THEN
        CREATE TRIGGER update_safeguarding_timestamp
        BEFORE UPDATE ON tenant_safeguarding_reports
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
