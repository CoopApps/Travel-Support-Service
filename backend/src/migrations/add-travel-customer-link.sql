-- Add travel_customer_id link to tenant_care_clients
-- This allows homecare clients to be synced with travel support customers

ALTER TABLE tenant_care_clients
ADD COLUMN IF NOT EXISTS travel_customer_id INTEGER REFERENCES tenant_customers(customer_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_care_clients_travel_customer ON tenant_care_clients(travel_customer_id);

-- Add comment
COMMENT ON COLUMN tenant_care_clients.travel_customer_id IS 'Link to transport customer if client also uses travel services';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Added travel_customer_id link to tenant_care_clients';
END $$;
