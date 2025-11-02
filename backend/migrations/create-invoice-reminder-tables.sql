-- Invoice Reminder System Tables
-- Phase 2: Automated reminder scheduling

-- ==============================================================================
-- TABLE: tenant_invoice_reminders
-- ==============================================================================
-- Tracks scheduled reminders for invoices
CREATE TABLE IF NOT EXISTS tenant_invoice_reminders (
    reminder_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,

    -- Reminder configuration
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('pre_due', 'overdue_1st', 'overdue_2nd', 'overdue_3rd', 'final_warning')),
    scheduled_date DATE NOT NULL,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMP,
    error_message TEXT,

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key
    FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE
);

-- Indexes for tenant_invoice_reminders
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_tenant ON tenant_invoice_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice ON tenant_invoice_reminders(tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_scheduled ON tenant_invoice_reminders(tenant_id, scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_status ON tenant_invoice_reminders(tenant_id, status);

-- ==============================================================================
-- TABLE: tenant_invoice_reminder_config
-- ==============================================================================
-- Tenant-wide reminder configuration (overrides provider-specific settings)
CREATE TABLE IF NOT EXISTS tenant_invoice_reminder_config (
    tenant_id INTEGER NOT NULL PRIMARY KEY,

    -- Global enable/disable
    reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- Default reminder timing (in days)
    default_pre_due_days INTEGER DEFAULT 7,
    default_overdue_1st_days INTEGER DEFAULT 7,
    default_overdue_2nd_days INTEGER DEFAULT 14,
    default_overdue_3rd_days INTEGER DEFAULT 21,
    default_final_warning_days INTEGER DEFAULT 28,

    -- Email configuration
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    reply_to_email VARCHAR(255),

    -- Template customization
    include_company_logo BOOLEAN DEFAULT TRUE,
    include_payment_link BOOLEAN DEFAULT FALSE,

    -- Audit
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER
);

-- ==============================================================================
-- TABLE: tenant_invoice_reminder_log
-- ==============================================================================
-- Detailed log of all reminder attempts for audit trail
CREATE TABLE IF NOT EXISTS tenant_invoice_reminder_log (
    log_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    reminder_id INTEGER,

    -- Event details
    event_type VARCHAR(50) NOT NULL, -- 'scheduled', 'sent', 'failed', 'cancelled', 'skipped'
    reminder_type VARCHAR(20) NOT NULL,

    -- Recipient info
    recipient_email VARCHAR(255),
    cc_emails TEXT,

    -- Result
    success BOOLEAN,
    error_message TEXT,
    email_provider_response TEXT,

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,

    -- Foreign keys
    FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (reminder_id) REFERENCES tenant_invoice_reminders(reminder_id) ON DELETE SET NULL
);

-- Indexes for tenant_invoice_reminder_log
CREATE INDEX IF NOT EXISTS idx_reminder_log_tenant ON tenant_invoice_reminder_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_log_invoice ON tenant_invoice_reminder_log(tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_log_created ON tenant_invoice_reminder_log(created_at);
CREATE INDEX IF NOT EXISTS idx_reminder_log_event ON tenant_invoice_reminder_log(tenant_id, event_type);

-- ==============================================================================
-- COMMENTS
-- ==============================================================================

COMMENT ON TABLE tenant_invoice_reminders IS 'Tracks scheduled reminders for invoices with multi-tier reminder types';
COMMENT ON TABLE tenant_invoice_reminder_config IS 'Tenant-wide reminder configuration and default settings';
COMMENT ON TABLE tenant_invoice_reminder_log IS 'Audit trail for all reminder events and email attempts';

COMMENT ON COLUMN tenant_invoice_reminders.reminder_type IS 'Type of reminder: pre_due (before due date), overdue_1st/2nd/3rd (after due date), final_warning';
COMMENT ON COLUMN tenant_invoice_reminders.scheduled_date IS 'Date when the reminder should be sent';
COMMENT ON COLUMN tenant_invoice_reminders.status IS 'Current status: pending (not sent), sent (successfully sent), failed (error), cancelled (manually cancelled)';

COMMENT ON COLUMN tenant_invoice_reminder_config.reminders_enabled IS 'Master switch to enable/disable all reminders for the tenant';
COMMENT ON COLUMN tenant_invoice_reminder_config.default_pre_due_days IS 'Days before due date to send pre-due reminder (default 7)';
COMMENT ON COLUMN tenant_invoice_reminder_config.default_overdue_1st_days IS 'Days after due date to send 1st overdue reminder (default 7)';

COMMENT ON COLUMN tenant_invoice_reminder_log.event_type IS 'Type of event: scheduled, sent, failed, cancelled, skipped';
COMMENT ON COLUMN tenant_invoice_reminder_log.success IS 'Whether the reminder was successfully sent';
COMMENT ON COLUMN tenant_invoice_reminder_log.email_provider_response IS 'Raw response from email service provider for debugging';
