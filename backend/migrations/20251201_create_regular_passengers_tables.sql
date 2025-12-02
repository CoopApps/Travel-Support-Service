-- Migration: Create Section 22 Regular Passengers Tables
-- Date: 2025-12-01
-- Purpose: Add support for regular passenger seat assignments and absence tracking

-- Create section22_regular_passengers table
CREATE TABLE IF NOT EXISTS section22_regular_passengers (
  regular_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  timetable_id INTEGER NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  requires_wheelchair_space BOOLEAN DEFAULT FALSE,
  travels_monday BOOLEAN DEFAULT FALSE,
  travels_tuesday BOOLEAN DEFAULT FALSE,
  travels_wednesday BOOLEAN DEFAULT FALSE,
  travels_thursday BOOLEAN DEFAULT FALSE,
  travels_friday BOOLEAN DEFAULT FALSE,
  travels_saturday BOOLEAN DEFAULT FALSE,
  travels_sunday BOOLEAN DEFAULT FALSE,
  boarding_stop_id INTEGER,
  alighting_stop_id INTEGER,
  valid_from DATE NOT NULL,
  valid_until DATE,
  status VARCHAR(20) DEFAULT 'active',
  special_requirements TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  CONSTRAINT fk_regular_customer FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id),
  CONSTRAINT fk_regular_timetable FOREIGN KEY (timetable_id) REFERENCES section22_timetables(timetable_id)
);

-- Create indexes for regular passengers
CREATE INDEX IF NOT EXISTS idx_regular_passengers_tenant ON section22_regular_passengers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regular_passengers_customer ON section22_regular_passengers(customer_id);
CREATE INDEX IF NOT EXISTS idx_regular_passengers_timetable ON section22_regular_passengers(timetable_id);

-- Create section22_passenger_absences table
CREATE TABLE IF NOT EXISTS section22_passenger_absences (
  absence_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  absence_date DATE NOT NULL,
  absence_reason VARCHAR(50) NOT NULL,
  reason_notes TEXT,
  timetable_id INTEGER,
  reported_by VARCHAR(20) NOT NULL,
  reported_by_user_id INTEGER,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'confirmed',
  fare_adjustment_applied BOOLEAN DEFAULT FALSE,
  fare_adjustment_amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_absence_customer FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id),
  CONSTRAINT fk_absence_timetable FOREIGN KEY (timetable_id) REFERENCES section22_timetables(timetable_id)
);

-- Create indexes for passenger absences
CREATE INDEX IF NOT EXISTS idx_passenger_absences_tenant ON section22_passenger_absences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_passenger_absences_customer ON section22_passenger_absences(customer_id);
CREATE INDEX IF NOT EXISTS idx_passenger_absences_date ON section22_passenger_absences(absence_date);

-- Create function to check if a regular seat is available
CREATE OR REPLACE FUNCTION check_regular_seat_available(
  p_timetable_id INTEGER,
  p_seat_number VARCHAR(10),
  p_valid_from DATE,
  p_valid_until DATE,
  p_days_mask INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM section22_regular_passengers
  WHERE timetable_id = p_timetable_id
    AND seat_number = p_seat_number
    AND status = 'active'
    AND (
      (valid_from <= p_valid_from AND (valid_until IS NULL OR valid_until >= p_valid_from))
      OR (valid_from <= COALESCE(p_valid_until, '9999-12-31') AND (valid_until IS NULL OR valid_until >= p_valid_from))
      OR (valid_from >= p_valid_from AND valid_from <= COALESCE(p_valid_until, '9999-12-31'))
    )
    AND (
      (CASE WHEN travels_monday THEN 1 ELSE 0 END +
       CASE WHEN travels_tuesday THEN 2 ELSE 0 END +
       CASE WHEN travels_wednesday THEN 4 ELSE 0 END +
       CASE WHEN travels_thursday THEN 8 ELSE 0 END +
       CASE WHEN travels_friday THEN 16 ELSE 0 END +
       CASE WHEN travels_saturday THEN 32 ELSE 0 END +
       CASE WHEN travels_sunday THEN 64 ELSE 0 END) & p_days_mask
    ) > 0;

  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to get effective passengers for a service date
CREATE OR REPLACE FUNCTION get_effective_passengers(
  p_tenant_id INTEGER,
  p_timetable_id INTEGER,
  p_service_date DATE
) RETURNS TABLE (
  passenger_type VARCHAR(20),
  customer_id INTEGER,
  customer_name VARCHAR(255),
  seat_number VARCHAR(10),
  boarding_stop_id INTEGER,
  alighting_stop_id INTEGER,
  requires_wheelchair_space BOOLEAN,
  special_requirements TEXT
) AS $$
DECLARE
  day_of_week INTEGER;
BEGIN
  day_of_week := EXTRACT(DOW FROM p_service_date);

  RETURN QUERY
  SELECT
    'regular'::VARCHAR(20) as passenger_type,
    rp.customer_id,
    c.name as customer_name,
    rp.seat_number,
    rp.boarding_stop_id,
    rp.alighting_stop_id,
    rp.requires_wheelchair_space,
    rp.special_requirements
  FROM section22_regular_passengers rp
  JOIN tenant_customers c ON rp.customer_id = c.customer_id
  WHERE rp.tenant_id = p_tenant_id
    AND rp.timetable_id = p_timetable_id
    AND rp.status = 'active'
    AND rp.valid_from <= p_service_date
    AND (rp.valid_until IS NULL OR rp.valid_until >= p_service_date)
    AND (
      (day_of_week = 0 AND rp.travels_sunday) OR
      (day_of_week = 1 AND rp.travels_monday) OR
      (day_of_week = 2 AND rp.travels_tuesday) OR
      (day_of_week = 3 AND rp.travels_wednesday) OR
      (day_of_week = 4 AND rp.travels_thursday) OR
      (day_of_week = 5 AND rp.travels_friday) OR
      (day_of_week = 6 AND rp.travels_saturday)
    )
    AND NOT EXISTS (
      SELECT 1 FROM section22_passenger_absences a
      WHERE a.customer_id = rp.customer_id
        AND a.absence_date = p_service_date
        AND (a.timetable_id IS NULL OR a.timetable_id = p_timetable_id)
        AND a.status = 'confirmed'
    );
END;
$$ LANGUAGE plpgsql;

-- Create view for customer upcoming bus journeys
CREATE OR REPLACE VIEW v_customer_upcoming_bus_journeys AS
SELECT
  rp.tenant_id,
  rp.customer_id,
  rp.regular_id,
  r.route_id,
  r.route_number,
  r.route_name,
  t.timetable_id,
  t.service_name,
  t.departure_time,
  rp.seat_number,
  rp.travels_monday,
  rp.travels_tuesday,
  rp.travels_wednesday,
  rp.travels_thursday,
  rp.travels_friday,
  rp.travels_saturday,
  rp.travels_sunday,
  s1.stop_name as boarding_stop,
  s2.stop_name as alighting_stop,
  rp.valid_from,
  rp.valid_until,
  rp.status
FROM section22_regular_passengers rp
JOIN section22_timetables t ON rp.timetable_id = t.timetable_id
JOIN section22_bus_routes r ON t.route_id = r.route_id
LEFT JOIN section22_route_stops s1 ON rp.boarding_stop_id = s1.stop_id
LEFT JOIN section22_route_stops s2 ON rp.alighting_stop_id = s2.stop_id
WHERE rp.status = 'active'
  AND (rp.valid_until IS NULL OR rp.valid_until >= CURRENT_DATE);
