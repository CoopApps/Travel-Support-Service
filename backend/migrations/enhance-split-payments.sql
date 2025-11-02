-- Enhanced Split Payment Tracking System
-- Allows invoices to be split across multiple providers with individual payment tracking

-- ==============================================================================
-- TABLE: tenant_invoice_split_payments
-- ==============================================================================
-- Tracks each provider's share of a split invoice
-- Allows multiple providers per invoice with flexible percentage splits

CREATE TABLE IF NOT EXISTS tenant_invoice_split_payments (
    split_payment_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE,

    -- Provider details
    provider_name VARCHAR(255) NOT NULL,
    provider_id INTEGER, -- Optional reference to tenant_providers table if it exists

    -- Split details
    split_percentage DECIMAL(5, 2) NOT NULL CHECK (split_percentage > 0 AND split_percentage <= 100),
    split_amount DECIMAL(10, 2) NOT NULL CHECK (split_amount >= 0),

    -- Payment tracking for this provider's portion
    amount_paid DECIMAL(10, 2) DEFAULT 0.00 CHECK (amount_paid >= 0),
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'overdue')),

    -- Notes specific to this provider's payment
    notes TEXT,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES tenant_users(user_id) ON DELETE SET NULL,

    -- Constraints
    CHECK (amount_paid <= split_amount) -- Can't pay more than the split amount
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_split_payments_tenant ON tenant_invoice_split_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_invoice ON tenant_invoice_split_payments(tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_provider ON tenant_invoice_split_payments(provider_name);
CREATE INDEX IF NOT EXISTS idx_split_payments_status ON tenant_invoice_split_payments(payment_status);

-- ==============================================================================
-- TABLE: tenant_split_payment_records
-- ==============================================================================
-- Tracks individual payment transactions for each provider's share
-- Links payments to specific split portions

CREATE TABLE IF NOT EXISTS tenant_split_payment_records (
    split_payment_record_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE,
    split_payment_id INTEGER NOT NULL REFERENCES tenant_invoice_split_payments(split_payment_id) ON DELETE CASCADE,

    -- Payment details
    payment_amount DECIMAL(10, 2) NOT NULL CHECK (payment_amount > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50), -- bank_transfer, card, cash, direct_debit, etc.
    reference_number VARCHAR(100),

    -- Provider information
    paid_by_provider VARCHAR(255) NOT NULL, -- Which provider made this payment

    -- Notes
    notes TEXT,

    -- Audit
    processed_by INTEGER REFERENCES tenant_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_split_payment_records_invoice ON tenant_split_payment_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_split_payment_records_split ON tenant_split_payment_records(split_payment_id);
CREATE INDEX IF NOT EXISTS idx_split_payment_records_date ON tenant_split_payment_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_split_payment_records_provider ON tenant_split_payment_records(paid_by_provider);

-- ==============================================================================
-- ADD COLUMN TO PAYMENT_RECORDS (if it doesn't exist)
-- ==============================================================================
-- Link regular payment records to split payments for backwards compatibility

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenant_payment_records'
        AND column_name = 'split_payment_id'
    ) THEN
        ALTER TABLE tenant_payment_records
        ADD COLUMN split_payment_id INTEGER REFERENCES tenant_invoice_split_payments(split_payment_id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_payment_records_split ON tenant_payment_records(split_payment_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenant_payment_records'
        AND column_name = 'paid_by_provider'
    ) THEN
        ALTER TABLE tenant_payment_records
        ADD COLUMN paid_by_provider VARCHAR(255);
    END IF;
END $$;

-- ==============================================================================
-- TRIGGERS FOR AUTOMATIC STATUS UPDATES
-- ==============================================================================

-- Function to update split payment status based on amount paid
CREATE OR REPLACE FUNCTION update_split_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the split payment status
    IF NEW.amount_paid = 0 THEN
        NEW.payment_status = 'unpaid';
    ELSIF NEW.amount_paid >= NEW.split_amount THEN
        NEW.payment_status = 'paid';
    ELSE
        NEW.payment_status = 'partially_paid';
    END IF;

    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on split_payments table
DROP TRIGGER IF EXISTS trg_update_split_payment_status ON tenant_invoice_split_payments;
CREATE TRIGGER trg_update_split_payment_status
    BEFORE INSERT OR UPDATE OF amount_paid
    ON tenant_invoice_split_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_split_payment_status();

-- Function to automatically update split payment amounts when a payment is recorded
CREATE OR REPLACE FUNCTION update_split_payment_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the amount_paid in the split payment record
    UPDATE tenant_invoice_split_payments
    SET amount_paid = amount_paid + NEW.payment_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE split_payment_id = NEW.split_payment_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on split_payment_records table
DROP TRIGGER IF EXISTS trg_update_split_payment_on_payment ON tenant_split_payment_records;
CREATE TRIGGER trg_update_split_payment_on_payment
    AFTER INSERT
    ON tenant_split_payment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_split_payment_on_payment();

-- ==============================================================================
-- HELPER FUNCTION: Calculate Split Payment Summary
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_invoice_split_summary(p_invoice_id INTEGER)
RETURNS TABLE (
    total_invoice_amount DECIMAL(10, 2),
    total_split_amount DECIMAL(10, 2),
    total_paid DECIMAL(10, 2),
    total_outstanding DECIMAL(10, 2),
    num_providers INTEGER,
    all_paid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.total_amount,
        COALESCE(SUM(sp.split_amount), 0) as total_split_amount,
        COALESCE(SUM(sp.amount_paid), 0) as total_paid,
        COALESCE(SUM(sp.split_amount - sp.amount_paid), 0) as total_outstanding,
        COUNT(sp.split_payment_id)::INTEGER as num_providers,
        BOOL_AND(sp.payment_status = 'paid') as all_paid
    FROM tenant_invoices i
    LEFT JOIN tenant_invoice_split_payments sp ON i.invoice_id = sp.invoice_id
    WHERE i.invoice_id = p_invoice_id
    GROUP BY i.total_amount;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================================================

COMMENT ON TABLE tenant_invoice_split_payments IS 'Tracks multiple providers shares of split invoices with individual payment tracking';
COMMENT ON TABLE tenant_split_payment_records IS 'Individual payment transactions for each providers portion of a split invoice';

COMMENT ON COLUMN tenant_invoice_split_payments.split_percentage IS 'Percentage of total invoice amount allocated to this provider (0-100)';
COMMENT ON COLUMN tenant_invoice_split_payments.split_amount IS 'Dollar amount allocated to this provider (calculated from percentage)';
COMMENT ON COLUMN tenant_invoice_split_payments.amount_paid IS 'Amount paid by this provider so far';
COMMENT ON COLUMN tenant_invoice_split_payments.payment_status IS 'Payment status for this providers portion: unpaid, partially_paid, paid, overdue';

COMMENT ON FUNCTION get_invoice_split_summary IS 'Returns summary of split payment status for an invoice including totals and provider count';
