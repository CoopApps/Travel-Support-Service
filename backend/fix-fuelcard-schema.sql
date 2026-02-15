-- Fix fuel card schema for demo data import
-- Run this on Railway database before importing demo data

BEGIN;

-- Drop dependent view
DROP VIEW IF EXISTS view_tenant_fuelcard_summary_existing CASCADE;

-- Fix column type from CHARACTER(1) to VARCHAR(4)
ALTER TABLE tenant_fuelcards
ALTER COLUMN card_number_last_four TYPE VARCHAR(4);

-- Add archive fields if they don't exist
ALTER TABLE tenant_fuelcards
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by INTEGER,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Add index for archived field
CREATE INDEX IF NOT EXISTS idx_tenant_fuelcards_archived
  ON tenant_fuelcards(tenant_id, archived);

-- Recreate the view
CREATE OR REPLACE VIEW view_tenant_fuelcard_summary_existing AS
SELECT
  fc.fuel_card_id,
  fc.tenant_id,
  fc.card_number_last_four,
  fc.provider,
  fc.driver_id,
  fc.vehicle_id,
  fc.monthly_limit,
  fc.daily_limit,
  fc.status,
  fc.created_at AS card_created_at,
  d.name AS driver_name,
  d.phone AS driver_phone,
  d.employment_type,
  v.make AS vehicle_make,
  v.model AS vehicle_model,
  v.registration AS vehicle_registration,
  v.ownership AS vehicle_ownership,
  COALESCE(tm.transaction_count, 0) AS current_month_transactions,
  COALESCE(tm.total_cost, 0) AS current_month_cost,
  COALESCE(tm.total_litres, 0) AS current_month_litres,
  lt.transaction_date AS last_transaction_date,
  lt.station_name AS last_fuel_station
FROM tenant_fuelcards fc
LEFT JOIN tenant_drivers d ON fc.driver_id = d.driver_id AND fc.tenant_id = d.tenant_id
LEFT JOIN tenant_vehicles v ON fc.vehicle_id = v.vehicle_id AND fc.tenant_id = v.tenant_id
LEFT JOIN (
  SELECT
    card_id AS fuel_card_id,
    COUNT(*) AS transaction_count,
    SUM(total_cost) AS total_cost,
    SUM(litres) AS total_litres
  FROM tenant_fuel_transactions
  WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND transaction_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY card_id
) tm ON fc.fuel_card_id = tm.fuel_card_id
LEFT JOIN (
  SELECT DISTINCT ON (card_id)
    card_id AS fuel_card_id,
    transaction_date,
    station_name
  FROM tenant_fuel_transactions
  ORDER BY card_id, transaction_date DESC, transaction_time DESC
) lt ON fc.fuel_card_id = lt.fuel_card_id
WHERE fc.is_active = true;

COMMIT;

-- Verify the fix
SELECT
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'tenant_fuelcards'
  AND column_name IN ('card_number_last_four', 'archived')
ORDER BY column_name;
