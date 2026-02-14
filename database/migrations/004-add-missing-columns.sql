-- ==================================================================================
-- Add Missing Columns to Existing Section 22 Tables
-- ==================================================================================
-- This migration adds columns that are missing from tables created with older schemas

-- Add missing columns to section22_bus_routes
DO $$
BEGIN
  -- wheelchair_accessible
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'wheelchair_accessible'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN wheelchair_accessible BOOLEAN DEFAULT true;
  END IF;

  -- max_capacity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'max_capacity'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN max_capacity INTEGER;
  END IF;

  -- vehicle_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN vehicle_type VARCHAR(50);
  END IF;

  -- route_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'route_type'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN route_type VARCHAR(50) DEFAULT 'fixed';
  END IF;

  -- distance_km
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'distance_km'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN distance_km DECIMAL(10,2);
  END IF;

  -- estimated_duration_minutes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'estimated_duration_minutes'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN estimated_duration_minutes INTEGER;
  END IF;

  -- origin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'origin'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN origin VARCHAR(255);
  END IF;

  -- destination
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'destination'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN destination VARCHAR(255);
  END IF;

  -- description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_routes' AND column_name = 'description'
  ) THEN
    ALTER TABLE section22_bus_routes ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add missing columns to section22_timetables
DO $$
BEGIN
  -- operates_monday through operates_sunday
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'operates_monday'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN operates_monday BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'operates_tuesday'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN operates_tuesday BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'operates_wednesday'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN operates_wednesday BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'operates_thursday'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN operates_thursday BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'operates_friday'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN operates_friday BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'operates_saturday'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN operates_saturday BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'operates_sunday'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN operates_sunday BOOLEAN DEFAULT false;
  END IF;

  -- valid_from
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'valid_from'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN valid_from DATE;
  END IF;

  -- valid_until
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'valid_until'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN valid_until DATE;
  END IF;

  -- vehicle_registration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'vehicle_registration'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN vehicle_registration VARCHAR(50);
  END IF;

  -- driver_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'driver_id'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN driver_id INTEGER;
  END IF;

  -- max_passengers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'max_passengers'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN max_passengers INTEGER;
  END IF;

  -- fare_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'fare_amount'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN fare_amount DECIMAL(10,2);
  END IF;

  -- notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'notes'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN notes TEXT;
  END IF;

  -- created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN created_by INTEGER;
  END IF;

  -- vehicle_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN vehicle_id INTEGER;
  END IF;

  -- wheelchair_spaces
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'wheelchair_spaces'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN wheelchair_spaces INTEGER;
  END IF;

  -- recurrence_pattern
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'recurrence_pattern'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN recurrence_pattern VARCHAR(50);
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add missing columns to section22_route_stops
DO $$
BEGIN
  -- arrival_offset_minutes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_route_stops' AND column_name = 'arrival_offset_minutes'
  ) THEN
    ALTER TABLE section22_route_stops ADD COLUMN arrival_offset_minutes INTEGER;
  END IF;

  -- departure_offset_minutes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_route_stops' AND column_name = 'departure_offset_minutes'
  ) THEN
    ALTER TABLE section22_route_stops ADD COLUMN departure_offset_minutes INTEGER;
  END IF;

  -- is_pickup_point
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_route_stops' AND column_name = 'is_pickup_point'
  ) THEN
    ALTER TABLE section22_route_stops ADD COLUMN is_pickup_point BOOLEAN DEFAULT true;
  END IF;

  -- is_dropoff_point
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_route_stops' AND column_name = 'is_dropoff_point'
  ) THEN
    ALTER TABLE section22_route_stops ADD COLUMN is_dropoff_point BOOLEAN DEFAULT true;
  END IF;

  -- wheelchair_accessible
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_route_stops' AND column_name = 'wheelchair_accessible'
  ) THEN
    ALTER TABLE section22_route_stops ADD COLUMN wheelchair_accessible BOOLEAN DEFAULT true;
  END IF;

  -- notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_route_stops' AND column_name = 'notes'
  ) THEN
    ALTER TABLE section22_route_stops ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Add missing columns to section22_bus_bookings
DO $$
BEGIN
  -- booking_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'booking_date'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN booking_date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  -- passenger_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'passenger_count'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN passenger_count INTEGER DEFAULT 1;
  END IF;

  -- booking_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'booking_status'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN booking_status VARCHAR(20) DEFAULT 'confirmed';
  END IF;

  -- fare_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'fare_amount'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN fare_amount DECIMAL(10,2);
  END IF;

  -- payment_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid';
  END IF;

  -- special_requirements
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'special_requirements'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN special_requirements TEXT;
  END IF;

  -- notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'notes'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN notes TEXT;
  END IF;

  -- booked_by_user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'booked_by_user_id'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN booked_by_user_id INTEGER;
  END IF;

  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_bus_bookings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE section22_bus_bookings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

COMMENT ON TABLE section22_bus_routes IS 'Section 22 bus routes with all required columns added';
COMMENT ON TABLE section22_timetables IS 'Section 22 timetables with day-of-week operations added';
COMMENT ON TABLE section22_route_stops IS 'Route stops with timing and accessibility information';
COMMENT ON TABLE section22_bus_bookings IS 'Bus bookings with all required columns added';
