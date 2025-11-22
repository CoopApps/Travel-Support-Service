-- Service Cancellations Table
-- Stores date-specific cancellations for bus services

CREATE TABLE IF NOT EXISTS section22_service_cancellations (
    cancellation_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    reason TEXT,
    cancelled_by INTEGER REFERENCES users(user_id),
    notify_passengers BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique cancellation per service/date
    CONSTRAINT uk_service_cancellation UNIQUE (tenant_id, timetable_id, service_date)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_service_cancellations_date
ON section22_service_cancellations(tenant_id, service_date);

CREATE INDEX IF NOT EXISTS idx_service_cancellations_timetable
ON section22_service_cancellations(timetable_id, service_date);

COMMENT ON TABLE section22_service_cancellations IS 'Stores date-specific service cancellations for bus timetables';
COMMENT ON COLUMN section22_service_cancellations.reason IS 'Reason for cancellation (driver sick, vehicle breakdown, weather, etc.)';
COMMENT ON COLUMN section22_service_cancellations.notify_passengers IS 'Whether passengers should be notified of cancellation';
COMMENT ON COLUMN section22_service_cancellations.notification_sent IS 'Whether notifications have been sent to affected passengers';
