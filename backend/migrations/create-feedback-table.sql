-- Customer Feedback and Complaints Management
-- Tracks customer feedback, complaints, and resolutions

CREATE TABLE IF NOT EXISTS tenant_customer_feedback (
    feedback_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    customer_id INTEGER NOT NULL,
    submitted_by INTEGER,
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('feedback', 'complaint', 'compliment', 'suggestion')),
    category VARCHAR(100),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'investigating', 'resolved', 'closed')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- Related entities
    related_driver_id INTEGER,
    related_vehicle_id INTEGER,
    related_trip_id INTEGER,
    incident_date TIMESTAMP,

    -- Resolution tracking
    assigned_to INTEGER,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER,
    resolved_at TIMESTAMP,
    resolved_by INTEGER,
    resolution_notes TEXT,
    resolution_action TEXT,

    -- Satisfaction and follow-up
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Audit trail
    created_by INTEGER,

    -- Constraints
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_feedback_tenant ON tenant_customer_feedback(tenant_id);
CREATE INDEX idx_feedback_customer ON tenant_customer_feedback(customer_id);
CREATE INDEX idx_feedback_status ON tenant_customer_feedback(status);
CREATE INDEX idx_feedback_type ON tenant_customer_feedback(feedback_type);
CREATE INDEX idx_feedback_created ON tenant_customer_feedback(created_at);
CREATE INDEX idx_feedback_assigned ON tenant_customer_feedback(assigned_to);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback_timestamp
    BEFORE UPDATE ON tenant_customer_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_timestamp();

-- Comments
COMMENT ON TABLE tenant_customer_feedback IS 'Customer feedback, complaints, and compliments tracking';
COMMENT ON COLUMN tenant_customer_feedback.feedback_type IS 'Type: feedback, complaint, compliment, suggestion';
COMMENT ON COLUMN tenant_customer_feedback.severity IS 'Severity level for complaints (low, medium, high, critical)';
COMMENT ON COLUMN tenant_customer_feedback.status IS 'Current status: pending, acknowledged, investigating, resolved, closed';
COMMENT ON COLUMN tenant_customer_feedback.satisfaction_rating IS 'Customer satisfaction rating (1-5)';
