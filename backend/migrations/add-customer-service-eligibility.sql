/**
 * Migration: Add Section 19/22 Service Eligibility to Customers
 *
 * Adds fields to track which services customers/passengers are eligible for:
 * - Section 19: Community transport (car-based, door-to-door)
 * - Section 22: Community bus (scheduled route services)
 *
 * Customers can be eligible for one or both services.
 */

-- Add service eligibility columns to tenant_customers
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS section_19_eligible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS section_22_eligible BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN tenant_customers.section_19_eligible IS 'Eligible for Section 19 community transport (car-based services)';
COMMENT ON COLUMN tenant_customers.section_22_eligible IS 'Eligible for Section 22 community bus services (scheduled routes)';

-- Add check constraint to ensure at least one service is selected
ALTER TABLE tenant_customers
ADD CONSTRAINT customers_service_eligibility_check
CHECK (section_19_eligible = true OR section_22_eligible = true);

-- Create index for filtering by service type
CREATE INDEX IF NOT EXISTS idx_customers_section_19 ON tenant_customers(tenant_id, section_19_eligible) WHERE section_19_eligible = true;
CREATE INDEX IF NOT EXISTS idx_customers_section_22 ON tenant_customers(tenant_id, section_22_eligible) WHERE section_22_eligible = true;

-- Update existing customers to be Section 19 eligible by default
UPDATE tenant_customers
SET section_19_eligible = true,
    section_22_eligible = false
WHERE section_19_eligible IS NULL;

COMMIT;
