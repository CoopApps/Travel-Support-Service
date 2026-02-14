-- ==================================================================================
-- Section 22 Bus Service - Database Schema
-- ==================================================================================
-- This migration creates all tables needed for the Section 22 bus service module
-- including routes, timetables, regular passengers, absences, and roster management

-- ==================================================================================
-- BUS ROUTES
-- ==================================================================================

CREATE TABLE IF NOT EXISTS section22_bus_routes (
  route_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  route_number VARCHAR(50) NOT NULL,
  route_name VARCHAR(255) NOT NULL,
  description TEXT,
  origin VARCHAR(255),
  destination VARCHAR(255),
  distance_km DECIMAL(10,2),
  estimated_duration_minutes INTEGER,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  vehicle_type VARCHAR(50),
  wheelchair_accessible BOOLEAN DEFAULT true,
  max_capacity INTEGER,
  route_type VARCHAR(50) DEFAULT 'fixed' CHECK (route_type IN ('fixed', 'flexible', 'on_demand')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  UNIQUE(tenant_id, route_number)
);

CREATE INDEX IF NOT EXISTS idx_section22_routes_tenant ON section22_bus_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_section22_routes_status ON section22_bus_routes(status);

-- ==================================================================================
-- ROUTE STOPS
-- ==================================================================================

CREATE TABLE IF NOT EXISTS section22_route_stops (
  stop_id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES section22_bus_routes(route_id) ON DELETE CASCADE,
  stop_sequence INTEGER NOT NULL,
  stop_name VARCHAR(255) NOT NULL,
  stop_address TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  arrival_offset_minutes INTEGER,
  departure_offset_minutes INTEGER,
  is_pickup_point BOOLEAN DEFAULT true,
  is_dropoff_point BOOLEAN DEFAULT true,
  wheelchair_accessible BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(route_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_section22_stops_route ON section22_route_stops(route_id);

-- ==================================================================================
-- BUS TIMETABLES (Services)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS section22_timetables (
  timetable_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  route_id INTEGER NOT NULL REFERENCES section22_bus_routes(route_id) ON DELETE CASCADE,
  service_name VARCHAR(255) NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME,
  operates_monday BOOLEAN DEFAULT false,
  operates_tuesday BOOLEAN DEFAULT false,
  operates_wednesday BOOLEAN DEFAULT false,
  operates_thursday BOOLEAN DEFAULT false,
  operates_friday BOOLEAN DEFAULT false,
  operates_saturday BOOLEAN DEFAULT false,
  operates_sunday BOOLEAN DEFAULT false,
  valid_from DATE,
  valid_until DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  vehicle_registration VARCHAR(50),
  driver_id INTEGER,
  max_passengers INTEGER,
  fare_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_section22_timetables_tenant ON section22_timetables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_section22_timetables_route ON section22_timetables(route_id);
CREATE INDEX IF NOT EXISTS idx_section22_timetables_status ON section22_timetables(status);

-- Add arrival_time column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_timetables'
    AND column_name = 'arrival_time'
  ) THEN
    ALTER TABLE section22_timetables ADD COLUMN arrival_time TIME;
  END IF;
END $$;

-- ==================================================================================
-- REGULAR PASSENGERS
-- ==================================================================================

CREATE TABLE IF NOT EXISTS section22_regular_passengers (
  regular_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
  timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
  seat_number VARCHAR(10) NOT NULL,
  requires_wheelchair_space BOOLEAN DEFAULT false,
  travels_monday BOOLEAN DEFAULT false,
  travels_tuesday BOOLEAN DEFAULT false,
  travels_wednesday BOOLEAN DEFAULT false,
  travels_thursday BOOLEAN DEFAULT false,
  travels_friday BOOLEAN DEFAULT false,
  travels_saturday BOOLEAN DEFAULT false,
  travels_sunday BOOLEAN DEFAULT false,
  boarding_stop_id INTEGER REFERENCES section22_route_stops(stop_id),
  alighting_stop_id INTEGER REFERENCES section22_route_stops(stop_id),
  valid_from DATE NOT NULL,
  valid_until DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'ended')),
  special_requirements TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_section22_regular_passengers_tenant ON section22_regular_passengers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_section22_regular_passengers_customer ON section22_regular_passengers(customer_id);
CREATE INDEX IF NOT EXISTS idx_section22_regular_passengers_timetable ON section22_regular_passengers(timetable_id);
CREATE INDEX IF NOT EXISTS idx_section22_regular_passengers_status ON section22_regular_passengers(status);

-- Add tenant_id column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'section22_regular_passengers'
    AND column_name = 'tenant_id'
  ) THEN
    -- Add column without NOT NULL first
    ALTER TABLE section22_regular_passengers ADD COLUMN tenant_id INTEGER;
    -- Update existing rows (if any) with a tenant_id - assuming tenant_id 2 based on your query
    UPDATE section22_regular_passengers SET tenant_id = 2 WHERE tenant_id IS NULL;
    -- Now make it NOT NULL and add the foreign key
    ALTER TABLE section22_regular_passengers ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE section22_regular_passengers ADD CONSTRAINT fk_regular_passengers_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==================================================================================
-- PASSENGER ABSENCES
-- ==================================================================================

CREATE TABLE IF NOT EXISTS section22_passenger_absences (
  absence_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
  absence_date DATE NOT NULL,
  absence_reason VARCHAR(50) NOT NULL CHECK (absence_reason IN ('sick', 'holiday', 'appointment', 'other')),
  reason_notes TEXT,
  timetable_id INTEGER REFERENCES section22_timetables(timetable_id),
  reported_by VARCHAR(20) DEFAULT 'staff' CHECK (reported_by IN ('staff', 'customer')),
  reported_by_user_id INTEGER,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  fare_adjustment_applied BOOLEAN DEFAULT false,
  fare_adjustment_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_section22_absences_tenant ON section22_passenger_absences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_section22_absences_customer ON section22_passenger_absences(customer_id);
CREATE INDEX IF NOT EXISTS idx_section22_absences_date ON section22_passenger_absences(absence_date);
CREATE INDEX IF NOT EXISTS idx_section22_absences_timetable ON section22_passenger_absences(timetable_id);

-- ==================================================================================
-- BUS BOOKINGS (One-off bookings)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS section22_bus_bookings (
  booking_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
  timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  seat_number VARCHAR(10),
  boarding_stop_id INTEGER REFERENCES section22_route_stops(stop_id),
  alighting_stop_id INTEGER REFERENCES section22_route_stops(stop_id),
  requires_wheelchair_space BOOLEAN DEFAULT false,
  passenger_count INTEGER DEFAULT 1,
  booking_status VARCHAR(20) DEFAULT 'confirmed' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  fare_amount DECIMAL(10,2),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  special_requirements TEXT,
  notes TEXT,
  booked_by_user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_section22_bookings_tenant ON section22_bus_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_section22_bookings_customer ON section22_bus_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_section22_bookings_timetable ON section22_bus_bookings(timetable_id);
CREATE INDEX IF NOT EXISTS idx_section22_bookings_date ON section22_bus_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_section22_bookings_status ON section22_bus_bookings(booking_status);

-- ==================================================================================
-- BUS ROSTER
-- ==================================================================================

CREATE TABLE IF NOT EXISTS section22_bus_roster (
  roster_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
  roster_date DATE NOT NULL,
  driver_id INTEGER NOT NULL REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES tenant_vehicles(vehicle_id),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  actual_departure_time TIME,
  actual_arrival_time TIME,
  passenger_count INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(timetable_id, roster_date)
);

CREATE INDEX IF NOT EXISTS idx_section22_roster_tenant ON section22_bus_roster(tenant_id);
CREATE INDEX IF NOT EXISTS idx_section22_roster_timetable ON section22_bus_roster(timetable_id);
CREATE INDEX IF NOT EXISTS idx_section22_roster_date ON section22_bus_roster(roster_date);
CREATE INDEX IF NOT EXISTS idx_section22_roster_driver ON section22_bus_roster(driver_id);

-- ==================================================================================
-- HELPER FUNCTIONS
-- ==================================================================================

-- Drop existing functions if they exist (to handle return type changes)
DROP FUNCTION IF EXISTS check_regular_seat_available(INTEGER, VARCHAR, DATE, DATE, INTEGER);
DROP FUNCTION IF EXISTS get_effective_passengers(INTEGER, INTEGER, DATE);

-- Function to check if a seat is available for regular passengers
CREATE OR REPLACE FUNCTION check_regular_seat_available(
  p_timetable_id INTEGER,
  p_seat_number VARCHAR,
  p_valid_from DATE,
  p_valid_until DATE,
  p_days_mask INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for overlapping seat assignments
  SELECT COUNT(*) INTO conflict_count
  FROM section22_regular_passengers
  WHERE timetable_id = p_timetable_id
    AND seat_number = p_seat_number
    AND status = 'active'
    AND (
      (valid_from <= COALESCE(p_valid_until, '9999-12-31'::DATE))
      AND (COALESCE(valid_until, '9999-12-31'::DATE) >= p_valid_from)
    )
    AND (
      -- Check if any days overlap using bitmask
      ((travels_monday::int << 0) & (p_days_mask & 1)) > 0 OR
      ((travels_tuesday::int << 1) & (p_days_mask & 2)) > 0 OR
      ((travels_wednesday::int << 2) & (p_days_mask & 4)) > 0 OR
      ((travels_thursday::int << 3) & (p_days_mask & 8)) > 0 OR
      ((travels_friday::int << 4) & (p_days_mask & 16)) > 0 OR
      ((travels_saturday::int << 5) & (p_days_mask & 32)) > 0 OR
      ((travels_sunday::int << 6) & (p_days_mask & 64)) > 0
    );

  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get effective passengers for a specific service date
CREATE OR REPLACE FUNCTION get_effective_passengers(
  p_tenant_id INTEGER,
  p_timetable_id INTEGER,
  p_service_date DATE
) RETURNS TABLE (
  passenger_type VARCHAR,
  customer_id INTEGER,
  first_name VARCHAR,
  last_name VARCHAR,
  seat_number VARCHAR,
  requires_wheelchair_space BOOLEAN,
  boarding_stop_name VARCHAR,
  alighting_stop_name VARCHAR,
  special_requirements TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Regular passengers for this day
  SELECT
    'regular'::VARCHAR as passenger_type,
    c.customer_id,
    c.first_name,
    c.last_name,
    rp.seat_number,
    rp.requires_wheelchair_space,
    s1.stop_name as boarding_stop_name,
    s2.stop_name as alighting_stop_name,
    rp.special_requirements
  FROM section22_regular_passengers rp
  JOIN tenant_customers c ON rp.customer_id = c.customer_id
  LEFT JOIN section22_route_stops s1 ON rp.boarding_stop_id = s1.stop_id
  LEFT JOIN section22_route_stops s2 ON rp.alighting_stop_id = s2.stop_id
  WHERE rp.tenant_id = p_tenant_id
    AND rp.timetable_id = p_timetable_id
    AND rp.status = 'active'
    AND p_service_date >= rp.valid_from
    AND (rp.valid_until IS NULL OR p_service_date <= rp.valid_until)
    AND (
      (EXTRACT(DOW FROM p_service_date) = 1 AND rp.travels_monday) OR
      (EXTRACT(DOW FROM p_service_date) = 2 AND rp.travels_tuesday) OR
      (EXTRACT(DOW FROM p_service_date) = 3 AND rp.travels_wednesday) OR
      (EXTRACT(DOW FROM p_service_date) = 4 AND rp.travels_thursday) OR
      (EXTRACT(DOW FROM p_service_date) = 5 AND rp.travels_friday) OR
      (EXTRACT(DOW FROM p_service_date) = 6 AND rp.travels_saturday) OR
      (EXTRACT(DOW FROM p_service_date) = 0 AND rp.travels_sunday)
    )
    AND NOT EXISTS (
      -- Exclude if they reported an absence for this date
      SELECT 1 FROM section22_passenger_absences a
      WHERE a.customer_id = rp.customer_id
        AND a.absence_date = p_service_date
        AND a.status = 'confirmed'
        AND (a.timetable_id = p_timetable_id OR a.timetable_id IS NULL)
    )

  UNION ALL

  -- One-off bookings for this date
  SELECT
    'booking'::VARCHAR as passenger_type,
    c.customer_id,
    c.first_name,
    c.last_name,
    bb.seat_number,
    bb.requires_wheelchair_space,
    s1.stop_name as boarding_stop_name,
    s2.stop_name as alighting_stop_name,
    bb.special_requirements
  FROM section22_bus_bookings bb
  JOIN tenant_customers c ON bb.customer_id = c.customer_id
  LEFT JOIN section22_route_stops s1 ON bb.boarding_stop_id = s1.stop_id
  LEFT JOIN section22_route_stops s2 ON bb.alighting_stop_id = s2.stop_id
  WHERE bb.tenant_id = p_tenant_id
    AND bb.timetable_id = p_timetable_id
    AND bb.booking_date = p_service_date
    AND bb.booking_status IN ('confirmed', 'completed')

  ORDER BY seat_number;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- VIEW: Customer Upcoming Bus Journeys
-- ==================================================================================

CREATE OR REPLACE VIEW v_customer_upcoming_bus_journeys AS
SELECT
  rp.regular_id,
  rp.tenant_id,
  rp.customer_id,
  c.first_name,
  c.last_name,
  t.timetable_id,
  t.service_name,
  t.departure_time,
  t.arrival_time,
  r.route_number,
  r.route_name,
  rp.seat_number,
  rp.requires_wheelchair_space,
  rp.travels_monday,
  rp.travels_tuesday,
  rp.travels_wednesday,
  rp.travels_thursday,
  rp.travels_friday,
  rp.travels_saturday,
  rp.travels_sunday,
  s1.stop_name as boarding_stop_name,
  s2.stop_name as alighting_stop_name,
  rp.valid_from,
  rp.valid_until,
  rp.status
FROM section22_regular_passengers rp
JOIN tenant_customers c ON rp.customer_id = c.customer_id
JOIN section22_timetables t ON rp.timetable_id = t.timetable_id
JOIN section22_bus_routes r ON t.route_id = r.route_id
LEFT JOIN section22_route_stops s1 ON rp.boarding_stop_id = s1.stop_id
LEFT JOIN section22_route_stops s2 ON rp.alighting_stop_id = s2.stop_id
WHERE rp.status = 'active'
  AND (rp.valid_until IS NULL OR rp.valid_until >= CURRENT_DATE);

-- ==================================================================================
-- COMMENTS
-- ==================================================================================

COMMENT ON TABLE section22_bus_routes IS 'Section 22 bus routes - fixed or flexible routes for accessible transport';
COMMENT ON TABLE section22_route_stops IS 'Stops along each bus route with timing offsets';
COMMENT ON TABLE section22_timetables IS 'Recurring service schedules (when buses run)';
COMMENT ON TABLE section22_regular_passengers IS 'Regular seat assignments for recurring passengers';
COMMENT ON TABLE section22_passenger_absences IS 'Customer-reported absences from regular services';
COMMENT ON TABLE section22_bus_bookings IS 'One-off bookings for non-regular passengers';
COMMENT ON TABLE section22_bus_roster IS 'Daily driver/vehicle assignments for services';
