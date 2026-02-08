-- Add homecare_client_id link to tenant_customers
-- This provides bidirectional linking between transport customers and homecare clients
-- Allows easy querying from either direction

ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS homecare_client_id INTEGER REFERENCES tenant_care_clients(client_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customers_homecare_client ON tenant_customers(homecare_client_id);

-- Add service eligibility flags (for multi-service organizations)
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS section_19_eligible BOOLEAN DEFAULT true, -- Transport services
ADD COLUMN IF NOT EXISTS section_22_eligible BOOLEAN DEFAULT false; -- Bus services

-- Add comment
COMMENT ON COLUMN tenant_customers.homecare_client_id IS 'Link to homecare client if customer also receives home care services';
COMMENT ON COLUMN tenant_customers.section_19_eligible IS 'Eligible for Section 19 transport services';
COMMENT ON COLUMN tenant_customers.section_22_eligible IS 'Eligible for Section 22 bus services';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Added bidirectional homecare/transport linking and service eligibility flags';
END $$;
