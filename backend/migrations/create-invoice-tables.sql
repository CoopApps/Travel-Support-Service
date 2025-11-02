-- Invoice Management System - Complete Schema
-- Multi-tenant invoice system with automated generation, reminders, and payment tracking

-- ============================================================================
-- 1. MAIN INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_invoices (
    invoice_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    -- Invoice identification
    invoice_number VARCHAR(50) NOT NULL,

    -- Customer/Provider information
    customer_id INTEGER REFERENCES tenant_customers(customer_id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    paying_org VARCHAR(255) NOT NULL, -- Provider name or 'Self-Pay'

    -- Dates
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amounts
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,

    -- Status and type
    invoice_status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    invoice_type VARCHAR(20) DEFAULT 'standard', -- standard, provider, split

    -- Split payment support
    is_split_payment BOOLEAN DEFAULT FALSE,
    split_provider VARCHAR(255),
    split_percentage DECIMAL(5, 2),

    -- Email tracking
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,

    -- Notes and metadata
    notes TEXT,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,
    archived_by INTEGER,

    -- Audit
    created_by INTEGER REFERENCES tenant_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX idx_tenant_invoices_tenant ON tenant_invoices(tenant_id);
CREATE INDEX idx_tenant_invoices_customer ON tenant_invoices(customer_id);
CREATE INDEX idx_tenant_invoices_status ON tenant_invoices(invoice_status);
CREATE INDEX idx_tenant_invoices_paying_org ON tenant_invoices(paying_org);
CREATE INDEX idx_tenant_invoices_date ON tenant_invoices(invoice_date);
CREATE INDEX idx_tenant_invoices_due_date ON tenant_invoices(due_date);
CREATE INDEX idx_tenant_invoices_archived ON tenant_invoices(archived);

-- ============================================================================
-- 2. INVOICE LINE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_invoice_line_items (
    line_item_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE,

    -- Line item details
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,

    -- Service details
    service_date DATE,
    trip_id INTEGER, -- Reference to tenant_trips if applicable

    -- Split payment details
    provider_name VARCHAR(255),
    provider_percentage DECIMAL(5, 2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, invoice_id, line_number)
);

CREATE INDEX idx_invoice_line_items_invoice ON tenant_invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_trip ON tenant_invoice_line_items(trip_id);

-- ============================================================================
-- 3. PAYMENT RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_payment_records (
    payment_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE,

    -- Payment details
    payment_amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50), -- bank_transfer, card, cash, direct_debit, etc.
    reference_number VARCHAR(100),

    -- Notes
    notes TEXT,

    -- Audit
    processed_by INTEGER REFERENCES tenant_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (payment_amount > 0)
);

CREATE INDEX idx_payment_records_invoice ON tenant_payment_records(invoice_id);
CREATE INDEX idx_payment_records_date ON tenant_payment_records(payment_date);

-- ============================================================================
-- 4. INVOICE EMAIL LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_invoice_emails (
    email_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE,

    -- Email details
    recipient_email VARCHAR(255) NOT NULL,
    cc_emails TEXT, -- Comma-separated or JSON array
    subject VARCHAR(500) NOT NULL,
    body TEXT,

    -- Delivery tracking
    delivery_status VARCHAR(20) DEFAULT 'sent', -- sent, failed, bounced
    error_message TEXT,

    -- Email type
    email_type VARCHAR(50), -- invoice, reminder, overdue, final_warning

    -- Timestamps
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_emails_invoice ON tenant_invoice_emails(invoice_id);
CREATE INDEX idx_invoice_emails_status ON tenant_invoice_emails(delivery_status);

-- ============================================================================
-- 5. INVOICE REMINDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_invoice_reminders (
    reminder_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE,

    -- Reminder details
    reminder_type VARCHAR(50) NOT NULL, -- pre_due, overdue_1st, overdue_2nd, overdue_3rd, final_warning
    scheduled_date DATE NOT NULL,

    -- Execution tracking
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled
    sent_at TIMESTAMP,
    error_message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_reminders_invoice ON tenant_invoice_reminders(invoice_id);
CREATE INDEX idx_invoice_reminders_scheduled ON tenant_invoice_reminders(scheduled_date, status);

-- ============================================================================
-- 6. EMAIL TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_email_templates (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    -- Template details
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,

    -- Template type
    template_type VARCHAR(50), -- invoice, reminder, overdue, final_warning, payment_received

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_email_templates_type ON tenant_email_templates(template_type);

-- ============================================================================
-- 7. INVOICE SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_invoice_settings (
    tenant_id INTEGER PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    -- General settings
    default_payment_terms_days INTEGER DEFAULT 30,
    invoice_prefix VARCHAR(10) DEFAULT 'INV',

    -- Auto-generation settings
    auto_generate_enabled BOOLEAN DEFAULT FALSE,
    auto_send_enabled BOOLEAN DEFAULT FALSE,

    -- Per-organization billing days (JSON: {"Provider Name": day_of_month})
    organization_invoice_days JSONB DEFAULT '{}',

    -- Cancellation and no-show policies
    cancellation_charge_hours INTEGER DEFAULT 24,
    partial_cancellation_hours INTEGER DEFAULT 2,
    partial_cancellation_percentage INTEGER DEFAULT 50,
    no_show_charge_percentage INTEGER DEFAULT 100,

    -- Audit
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. INVOICE ALERTS TABLE (for dashboard notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_invoice_alerts (
    alert_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE,

    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- overdue, payment_received, reminder_sent, provider_unpaid
    alert_message TEXT NOT NULL,

    -- Target
    target_user_type VARCHAR(20), -- admin, customer, driver
    target_user_id INTEGER, -- customer_id or user_id

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_alerts_tenant ON tenant_invoice_alerts(tenant_id);
CREATE INDEX idx_invoice_alerts_target ON tenant_invoice_alerts(target_user_type, target_user_id);
CREATE INDEX idx_invoice_alerts_unread ON tenant_invoice_alerts(is_read) WHERE is_read = FALSE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Note: Adjust these based on your actual database user setup
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
