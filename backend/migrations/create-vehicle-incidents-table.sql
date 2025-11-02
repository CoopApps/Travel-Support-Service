-- Vehicle Incidents Table
-- Tracks all incidents involving fleet vehicles (accidents, damages, near-misses, etc.)

CREATE TABLE IF NOT EXISTS tenant_vehicle_incidents (
    incident_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL,

    -- Incident details
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('accident', 'damage', 'near_miss', 'breakdown', 'theft', 'vandalism', 'other')),
    incident_date TIMESTAMP NOT NULL,
    location VARCHAR(500),
    description TEXT NOT NULL,

    -- People involved
    driver_id INTEGER,
    reported_by INTEGER,
    witnesses TEXT,

    -- Severity and impact
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('minor', 'moderate', 'serious', 'critical')),
    injuries_occurred BOOLEAN DEFAULT false,
    injury_details TEXT,
    vehicle_driveable BOOLEAN DEFAULT true,

    -- Damage assessment
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    damage_description TEXT,

    -- Third party information
    third_party_involved BOOLEAN DEFAULT false,
    third_party_name VARCHAR(255),
    third_party_contact VARCHAR(255),
    third_party_vehicle_reg VARCHAR(50),
    third_party_insurance VARCHAR(255),

    -- Insurance and claims
    insurance_claim_number VARCHAR(100),
    insurance_notified_date DATE,
    claim_status VARCHAR(50) CHECK (claim_status IN ('not_filed', 'filed', 'pending', 'approved', 'rejected', 'settled')),

    -- Police and authorities
    police_notified BOOLEAN DEFAULT false,
    police_reference VARCHAR(100),
    police_report_file VARCHAR(500),

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'under_investigation', 'resolved', 'closed')),
    resolution_notes TEXT,
    resolved_date DATE,
    resolved_by INTEGER,

    -- Follow-up actions
    actions_required TEXT,
    preventive_measures TEXT,
    vehicle_repair_required BOOLEAN DEFAULT false,
    repair_status VARCHAR(50) CHECK (repair_status IN ('not_required', 'scheduled', 'in_progress', 'completed')),

    -- Attachments and documents
    photos_uploaded BOOLEAN DEFAULT false,
    documents_uploaded BOOLEAN DEFAULT false,
    attachment_urls TEXT[], -- Array of file URLs

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,

    -- Foreign keys
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_vehicle FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id) ON DELETE CASCADE,
    CONSTRAINT fk_driver FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON tenant_vehicle_incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidents_vehicle ON tenant_vehicle_incidents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_incidents_driver ON tenant_vehicle_incidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON tenant_vehicle_incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON tenant_vehicle_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON tenant_vehicle_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON tenant_vehicle_incidents(severity);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_vehicle_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_incidents_updated_at
    BEFORE UPDATE ON tenant_vehicle_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_incidents_updated_at();
