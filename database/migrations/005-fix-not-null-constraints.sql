-- ==================================================================================
-- Fix NOT NULL Constraints on Section 22 Tables
-- ==================================================================================
-- This migration removes NOT NULL constraints that are preventing inserts

-- Fix section22_bus_routes - make origin_point and destination_point nullable
DO $$
BEGIN
  -- Drop NOT NULL constraint from origin_point if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes'
    AND column_name = 'origin_point'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE section22_bus_routes ALTER COLUMN origin_point DROP NOT NULL;
  END IF;

  -- Drop NOT NULL constraint from destination_point if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes'
    AND column_name = 'destination_point'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE section22_bus_routes ALTER COLUMN destination_point DROP NOT NULL;
  END IF;

  -- Drop NOT NULL constraint from operating_days if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes'
    AND column_name = 'operating_days'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE section22_bus_routes ALTER COLUMN operating_days DROP NOT NULL;
  END IF;
END $$;

-- Add origin_point and destination_point columns if they don't exist (they might be the old names for origin/destination)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'origin_point'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN origin_point VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'destination_point'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN destination_point VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'operating_days'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN operating_days VARCHAR(50);
  END IF;
END $$;

COMMENT ON COLUMN section22_bus_routes.origin_point IS 'Legacy column - use origin instead';
COMMENT ON COLUMN section22_bus_routes.destination_point IS 'Legacy column - use destination instead';
COMMENT ON COLUMN section22_bus_routes.operating_days IS 'Legacy column - use operates_monday through operates_sunday instead';

-- Fix section22_timetables - make total_seats nullable or add it
DO $$
BEGIN
  -- Drop NOT NULL constraint from total_seats if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables'
    AND column_name = 'total_seats'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE section22_timetables ALTER COLUMN total_seats DROP NOT NULL;
  END IF;

  -- Add total_seats column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'total_seats'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN total_seats INTEGER;
  END IF;

  -- Drop NOT NULL constraint from direction if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables'
    AND column_name = 'direction'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE section22_timetables ALTER COLUMN direction DROP NOT NULL;
  END IF;

  -- Add direction column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'direction'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN direction VARCHAR(20);
  END IF;

  -- Drop NOT NULL constraint from valid_from if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables'
    AND column_name = 'valid_from'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE section22_timetables ALTER COLUMN valid_from DROP NOT NULL;
  END IF;
END $$;
