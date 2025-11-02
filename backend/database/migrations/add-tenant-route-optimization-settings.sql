-- Migration: Add Route Optimization Settings to Tenants
-- Created: 2025-01-30
-- Description: Adds settings column for route optimization configuration

-- Add settings column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants'
    AND column_name = 'settings'
  ) THEN
    ALTER TABLE tenants ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;
END $$;

-- Set default settings for existing tenants
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{routeOptimization}',
  '{
    "enabled": true,
    "useGoogleMaps": false,
    "maxDetourMinutes": 15,
    "maxDetourMiles": 5
  }'::jsonb
)
WHERE settings IS NULL
   OR settings->'routeOptimization' IS NULL;

-- Create index for faster settings queries
CREATE INDEX IF NOT EXISTS idx_tenants_settings ON tenants USING gin(settings);

-- Add comment
COMMENT ON COLUMN tenants.settings IS 'JSON configuration for tenant-specific settings including route optimization';
