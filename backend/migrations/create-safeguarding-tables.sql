-- =====================================================
-- SAFEGUARDING REPORTS TABLE
-- =====================================================
-- CRITICAL NEW FEATURE: Missing from legacy system!
-- Allows drivers to report safety concerns about passengers
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_safeguarding_reports (
  report_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  customer_id INTEGER,  -- Optional: may be null for anonymous reports

  -- Incident Details
  incident_type VARCHAR(50) NOT NULL,  -- child_safety, vulnerable_adult, abuse, neglect, harassment, unsafe_environment, medical_concern, other
  severity VARCHAR(20) NOT NULL,        -- low, medium, high, critical
  incident_date TIMESTAMP NOT NULL,
  location VARCHAR(255),

  -- Description
  description TEXT NOT NULL,
  action_taken TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'submitted',  -- submitted, under_review, investigated, resolved, closed
  confidential BOOLEAN DEFAULT false,

  -- Investigation
  assigned_to INTEGER,  -- Admin user assigned to investigate
  investigation_notes TEXT,
  resolution TEXT,
  resolved_date TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,

  -- Indexes
  CONSTRAINT fk_safeguarding_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_safeguarding_driver FOREIGN KEY (driver_id, tenant_id) REFERENCES tenant_drivers(driver_id, tenant_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_safeguarding_tenant ON tenant_safeguarding_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_safeguarding_driver ON tenant_safeguarding_reports(driver_id);
CREATE INDEX IF NOT EXISTS idx_safeguarding_customer ON tenant_safeguarding_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_safeguarding_status ON tenant_safeguarding_reports(status);
CREATE INDEX IF NOT EXISTS idx_safeguarding_severity ON tenant_safeguarding_reports(severity);
CREATE INDEX IF NOT EXISTS idx_safeguarding_date ON tenant_safeguarding_reports(incident_date);
CREATE INDEX IF NOT EXISTS idx_safeguarding_created ON tenant_safeguarding_reports(created_at);

-- Comments
COMMENT ON TABLE tenant_safeguarding_reports IS 'Critical safeguarding incident reports submitted by drivers';
COMMENT ON COLUMN tenant_safeguarding_reports.confidential IS 'If true, only senior management can view this report';
COMMENT ON COLUMN tenant_safeguarding_reports.incident_type IS 'Type of safeguarding concern';
COMMENT ON COLUMN tenant_safeguarding_reports.severity IS 'Severity level for prioritization';

-- =====================================================
-- SAFEGUARDING REPORT ATTACHMENTS (Optional - for future use)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_safeguarding_attachments (
  attachment_id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,

  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,

  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER,

  CONSTRAINT fk_attachment_report FOREIGN KEY (report_id) REFERENCES tenant_safeguarding_reports(report_id) ON DELETE CASCADE,
  CONSTRAINT fk_attachment_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_safeguarding_attach_report ON tenant_safeguarding_attachments(report_id);
