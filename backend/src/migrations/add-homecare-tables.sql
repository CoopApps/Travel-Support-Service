-- Homecare Service Database Schema Migration
-- Created: 2026-02-07
-- Description: Adds tables for Home Care Co-operative service

-- Care Recipients (Clients receiving home care)
CREATE TABLE IF NOT EXISTS tenant_care_clients (
    client_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES tenant_customers(customer_id), -- Link to transport customer if exists

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    nhs_number VARCHAR(20),

    -- Contact Information
    address TEXT,
    postcode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(200),

    -- Emergency Contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),

    -- Medical Information
    medical_conditions TEXT,
    allergies TEXT,
    mobility_needs TEXT,
    communication_needs TEXT,
    dietary_requirements TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT unique_care_client_per_tenant UNIQUE (tenant_id, client_id)
);

CREATE INDEX idx_care_clients_tenant ON tenant_care_clients(tenant_id);
CREATE INDEX idx_care_clients_customer ON tenant_care_clients(customer_id);
CREATE INDEX idx_care_clients_status ON tenant_care_clients(status);
CREATE INDEX idx_care_clients_postcode ON tenant_care_clients(postcode);

-- Care Workers (Carers who are co-op members)
CREATE TABLE IF NOT EXISTS tenant_carers (
    carer_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES tenant_drivers(driver_id), -- Link if carer also drives
    user_id INTEGER REFERENCES tenant_users(user_id), -- Link to user account

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,

    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(200),
    address TEXT,
    postcode VARCHAR(10),

    -- Compliance & Qualifications
    dbs_check_date DATE,
    dbs_expiry_date DATE,
    dbs_certificate_number VARCHAR(100),
    training_completed JSONB DEFAULT '[]'::jsonb, -- Array of completed training courses
    qualifications TEXT,
    care_certificate BOOLEAN DEFAULT false,

    -- Employment
    employment_type VARCHAR(20) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'casual', 'volunteer')),
    hourly_rate DECIMAL(10,2),
    contracted_hours INTEGER,

    -- Availability
    availability JSONB DEFAULT '{}'::jsonb, -- Weekly availability schedule
    max_daily_hours INTEGER DEFAULT 8,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'suspended', 'inactive')),

    -- Performance
    total_visits_completed INTEGER DEFAULT 0,
    on_time_percentage DECIMAL(5,2),
    client_rating DECIMAL(3,2),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_carer_per_tenant UNIQUE (tenant_id, carer_id)
);

CREATE INDEX idx_carers_tenant ON tenant_carers(tenant_id);
CREATE INDEX idx_carers_driver ON tenant_carers(driver_id);
CREATE INDEX idx_carers_user ON tenant_carers(user_id);
CREATE INDEX idx_carers_status ON tenant_carers(status);
CREATE INDEX idx_carers_dbs_expiry ON tenant_carers(dbs_expiry_date);

-- Care Visits (Scheduled and completed care visits)
CREATE TABLE IF NOT EXISTS tenant_care_visits (
    visit_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES tenant_care_clients(client_id) ON DELETE CASCADE,
    carer_id INTEGER REFERENCES tenant_carers(carer_id),
    transport_schedule_id INTEGER REFERENCES tenant_schedules(schedule_id), -- Link to transport if needed

    -- Scheduling
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (scheduled_end - scheduled_start))/60) STORED,

    -- Actual Times
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,

    -- Location Tracking
    check_in_location VARCHAR(100),
    check_in_lat DECIMAL(10, 8),
    check_in_lng DECIMAL(11, 8),
    check_out_location VARCHAR(100),
    check_out_lat DECIMAL(10, 8),
    check_out_lng DECIMAL(11, 8),

    -- Visit Details
    visit_type VARCHAR(50), -- personal_care, medication, companionship, etc.
    tasks_planned JSONB DEFAULT '[]'::jsonb,
    tasks_completed JSONB DEFAULT '[]'::jsonb,
    notes TEXT,

    -- Medication Administration
    medication_administered JSONB DEFAULT '[]'::jsonb, -- MAR records

    -- Mileage (if carer travels)
    mileage_claimed DECIMAL(10,2),

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    cancellation_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_visit_per_tenant UNIQUE (tenant_id, visit_id)
);

CREATE INDEX idx_care_visits_tenant ON tenant_care_visits(tenant_id);
CREATE INDEX idx_care_visits_client ON tenant_care_visits(client_id);
CREATE INDEX idx_care_visits_carer ON tenant_care_visits(carer_id);
CREATE INDEX idx_care_visits_scheduled_start ON tenant_care_visits(scheduled_start);
CREATE INDEX idx_care_visits_status ON tenant_care_visits(status);
CREATE INDEX idx_care_visits_transport ON tenant_care_visits(transport_schedule_id);

-- Care Plans (Documented care needs for each client)
CREATE TABLE IF NOT EXISTS tenant_care_plans (
    care_plan_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES tenant_care_clients(client_id) ON DELETE CASCADE,

    -- Care Plan Details
    category VARCHAR(50), -- personal_care, medication, mobility, nutrition, social, etc.
    care_needs TEXT NOT NULL,
    support_required TEXT,
    goals TEXT,

    -- Frequency
    frequency VARCHAR(50), -- daily, twice_daily, weekly, as_needed
    preferred_time VARCHAR(50), -- morning, afternoon, evening, night

    -- Review Dates
    created_date DATE DEFAULT CURRENT_DATE,
    last_review_date DATE,
    next_review_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'archived')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_care_plans_tenant ON tenant_care_plans(tenant_id);
CREATE INDEX idx_care_plans_client ON tenant_care_plans(client_id);
CREATE INDEX idx_care_plans_category ON tenant_care_plans(category);
CREATE INDEX idx_care_plans_review_date ON tenant_care_plans(next_review_date);

-- Homecare Invoices (Billing for care services)
CREATE TABLE IF NOT EXISTS tenant_homecare_invoices (
    invoice_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES tenant_care_clients(client_id),

    -- Invoice Details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Period Covered
    period_start DATE,
    period_end DATE,

    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),

    -- Payment
    payment_method VARCHAR(50),
    payment_date DATE,
    payment_reference VARCHAR(100),

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_homecare_invoices_tenant ON tenant_homecare_invoices(tenant_id);
CREATE INDEX idx_homecare_invoices_client ON tenant_homecare_invoices(client_id);
CREATE INDEX idx_homecare_invoices_status ON tenant_homecare_invoices(status);
CREATE INDEX idx_homecare_invoices_due_date ON tenant_homecare_invoices(due_date);

-- Homecare Invoice Line Items
CREATE TABLE IF NOT EXISTS tenant_homecare_invoice_items (
    item_id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES tenant_homecare_invoices(invoice_id) ON DELETE CASCADE,
    visit_id INTEGER REFERENCES tenant_care_visits(visit_id),

    -- Item Details
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_homecare_invoice_items_invoice ON tenant_homecare_invoice_items(invoice_id);
CREATE INDEX idx_homecare_invoice_items_visit ON tenant_homecare_invoice_items(visit_id);

-- Homecare Documents (Care plans, assessments, etc.)
CREATE TABLE IF NOT EXISTS tenant_homecare_documents (
    document_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES tenant_care_clients(client_id) ON DELETE CASCADE,
    carer_id INTEGER REFERENCES tenant_carers(carer_id),

    -- Document Details
    document_type VARCHAR(50) NOT NULL, -- care_plan, risk_assessment, consent_form, etc.
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Compliance
    expiry_date DATE,
    review_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'expired')),

    -- Uploaded By
    uploaded_by INTEGER REFERENCES tenant_users(user_id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_homecare_documents_tenant ON tenant_homecare_documents(tenant_id);
CREATE INDEX idx_homecare_documents_client ON tenant_homecare_documents(client_id);
CREATE INDEX idx_homecare_documents_carer ON tenant_homecare_documents(carer_id);
CREATE INDEX idx_homecare_documents_type ON tenant_homecare_documents(document_type);
CREATE INDEX idx_homecare_documents_expiry ON tenant_homecare_documents(expiry_date);

-- Homecare Members (Co-operative membership for carers)
CREATE TABLE IF NOT EXISTS tenant_homecare_members (
    member_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    carer_id INTEGER NOT NULL REFERENCES tenant_carers(carer_id) ON DELETE CASCADE,

    -- Membership Details
    member_number VARCHAR(50),
    member_since DATE DEFAULT CURRENT_DATE,
    membership_type VARCHAR(20) DEFAULT 'worker' CHECK (membership_type IN ('worker', 'associate')),

    -- Financial
    membership_fee DECIMAL(10,2) DEFAULT 0,
    share_capital DECIMAL(10,2) DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- Governance
    voting_rights BOOLEAN DEFAULT true,
    board_member BOOLEAN DEFAULT false,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_homecare_member UNIQUE (tenant_id, carer_id)
);

CREATE INDEX idx_homecare_members_tenant ON tenant_homecare_members(tenant_id);
CREATE INDEX idx_homecare_members_carer ON tenant_homecare_members(carer_id);
CREATE INDEX idx_homecare_members_status ON tenant_homecare_members(status);

-- Homecare Voting (Democratic governance for co-op)
CREATE TABLE IF NOT EXISTS tenant_homecare_votes (
    vote_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    -- Vote Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    vote_type VARCHAR(50), -- motion, election, policy, etc.

    -- Voting Period
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,

    -- Requirements
    quorum_required INTEGER,
    majority_required DECIMAL(5,2) DEFAULT 50.00, -- Percentage

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'passed', 'failed')),

    -- Results
    votes_cast INTEGER DEFAULT 0,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,

    -- Created By
    created_by INTEGER REFERENCES tenant_users(user_id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_homecare_votes_tenant ON tenant_homecare_votes(tenant_id);
CREATE INDEX idx_homecare_votes_status ON tenant_homecare_votes(status);
CREATE INDEX idx_homecare_votes_end_date ON tenant_homecare_votes(end_date);

-- Homecare Vote Ballots (Individual member votes)
CREATE TABLE IF NOT EXISTS tenant_homecare_ballots (
    ballot_id SERIAL PRIMARY KEY,
    vote_id INTEGER NOT NULL REFERENCES tenant_homecare_votes(vote_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES tenant_homecare_members(member_id) ON DELETE CASCADE,

    -- Vote Cast
    vote_choice VARCHAR(20) NOT NULL CHECK (vote_choice IN ('for', 'against', 'abstain')),

    -- Timestamp
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_ballot_per_vote UNIQUE (vote_id, member_id)
);

CREATE INDEX idx_homecare_ballots_vote ON tenant_homecare_ballots(vote_id);
CREATE INDEX idx_homecare_ballots_member ON tenant_homecare_ballots(member_id);

-- Update tenants table to track homecare service enablement
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS homecare_enabled BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON TABLE tenant_care_clients IS 'Clients receiving home care services';
COMMENT ON TABLE tenant_carers IS 'Care workers who are co-operative members';
COMMENT ON TABLE tenant_care_visits IS 'Scheduled and completed care visits';
COMMENT ON TABLE tenant_care_plans IS 'Documented care needs for each client';
COMMENT ON TABLE tenant_homecare_invoices IS 'Billing for home care services';
COMMENT ON TABLE tenant_homecare_members IS 'Co-operative membership for carers';
COMMENT ON TABLE tenant_homecare_votes IS 'Democratic governance votes';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Homecare tables created successfully';
END $$;
