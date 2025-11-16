-- Migration: Create database views to map bus_* table names to section22_* tables
-- This allows backend code to use simpler table names while maintaining the section22_ naming in the actual schema

-- Create view for bus_routes -> section22_bus_routes
CREATE OR REPLACE VIEW bus_routes AS
SELECT
    route_id,
    tenant_id,
    route_number,
    route_name,
    description,
    registration_number,
    origin_point,
    destination_point,
    total_distance_miles AS distance_miles,
    estimated_duration_minutes,
    service_pattern,
    operates_monday,
    operates_tuesday,
    operates_wednesday,
    operates_thursday,
    operates_friday,
    operates_saturday,
    operates_sunday,
    status,
    start_date,
    end_date,
    created_at,
    updated_at,
    created_by
FROM section22_bus_routes;

-- Create view for bus_timetables -> section22_timetables
-- Note: The actual schema uses valid_from/valid_until for recurring schedules
-- This view adapts the schema to match backend expectations
CREATE OR REPLACE VIEW bus_timetables AS
SELECT
    timetable_id,
    route_id,
    tenant_id,
    valid_from as service_date, -- Map valid_from to service_date for compatibility
    departure_time,
    departure_time as arrival_time, -- Actual arrival time would need calculation
    vehicle_id,
    total_seats as vehicle_capacity, -- Map total_seats to vehicle_capacity
    driver_id,
    NULL::VARCHAR(50) as fare_tier, -- Not in base schema
    NULL::DECIMAL(10,2) as base_fare, -- Not in base schema
    status,
    NULL::TEXT as cancellation_reason, -- Not in base schema
    created_at,
    updated_at
FROM section22_timetables;

-- Create view for bus_bookings -> section22_bus_bookings
CREATE OR REPLACE VIEW bus_bookings AS
SELECT
    booking_id,
    timetable_id,
    tenant_id,
    passenger_name,
    passenger_email,
    passenger_phone,
    NULL::VARCHAR(50) as passenger_tier, -- Could be derived from customer_id if needed
    boarding_stop_id,
    alighting_stop_id,
    1 as seats_booked, -- Simplification: assume 1 seat per booking (actual seat_number is VARCHAR)
    fare_amount,
    booking_status,
    booking_reference,
    payment_status,
    payment_method,
    NULL::TEXT as cancellation_reason, -- Not in base schema
    service_date,
    created_at,
    updated_at
FROM section22_bus_bookings;

-- Create view for route_stops -> section22_route_stops
CREATE OR REPLACE VIEW bus_route_stops AS
SELECT
    stop_id,
    route_id,
    tenant_id,
    stop_sequence,
    stop_name,
    stop_address,
    latitude,
    longitude,
    arrival_offset_minutes,
    departure_offset_minutes,
    dwell_time_minutes,
    is_timing_point,
    is_pickup_point,
    is_setdown_point,
    accessibility_features,
    created_at
FROM section22_route_stops;

-- Create view for seat_availability -> section22_seat_availability
-- Note: section22_seat_availability has a different schema than expected
-- It tracks overall availability per service date, not per stop-to-stop segment
CREATE OR REPLACE VIEW bus_seat_availability AS
SELECT
    availability_id,
    timetable_id,
    NULL::INTEGER as tenant_id, -- Not in actual schema
    NULL::INTEGER as from_stop_id, -- Not in actual schema (no segment tracking)
    NULL::INTEGER as to_stop_id, -- Not in actual schema (no segment tracking)
    available_seats as seats_available,
    service_date,
    last_updated
FROM section22_seat_availability;

COMMENT ON VIEW bus_routes IS 'View mapping bus_routes to section22_bus_routes for backend compatibility';
COMMENT ON VIEW bus_timetables IS 'View mapping bus_timetables to section22_timetables for backend compatibility';
COMMENT ON VIEW bus_bookings IS 'View mapping bus_bookings to section22_bus_bookings for backend compatibility';
COMMENT ON VIEW bus_route_stops IS 'View mapping bus_route_stops to section22_route_stops for backend compatibility';
COMMENT ON VIEW bus_seat_availability IS 'View mapping bus_seat_availability to section22_seat_availability for backend compatibility';
