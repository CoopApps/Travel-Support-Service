-- ==================================================================================
-- Verify Section 22 Bus Service Schema
-- ==================================================================================
-- Run this in pgAdmin connected to Railway database to verify all columns exist

-- Check section22_regular_passengers columns
SELECT
  'section22_regular_passengers' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'section22_regular_passengers'
ORDER BY ordinal_position;

-- Check section22_timetables columns
SELECT
  'section22_timetables' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'section22_timetables'
ORDER BY ordinal_position;

-- Check section22_bus_routes columns
SELECT
  'section22_bus_routes' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'section22_bus_routes'
ORDER BY ordinal_position;

-- Check section22_route_stops columns
SELECT
  'section22_route_stops' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'section22_route_stops'
ORDER BY ordinal_position;

-- Check section22_passenger_absences columns
SELECT
  'section22_passenger_absences' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'section22_passenger_absences'
ORDER BY ordinal_position;

-- Check section22_bus_bookings columns
SELECT
  'section22_bus_bookings' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'section22_bus_bookings'
ORDER BY ordinal_position;

-- Check if the helper function exists
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('check_regular_seat_available', 'get_effective_passengers');

-- Check if the view exists
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'v_customer_upcoming_bus_journeys';
