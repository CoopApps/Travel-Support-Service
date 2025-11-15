-- Dual Service Architecture Migration
-- Adds support for both Community Transport (cars) and Community Bus (Section 22) services
-- within a single multi-tenant platform

-- ====================================================================================
-- PART 1: TENANT SERVICE CONFIGURATION
-- ====================================================================================

-- Add service type columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS service_transport_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS service_bus_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS active_service_view VARCHAR(50) DEFAULT 'transport';

COMMENT ON COLUMN tenants.service_transport_enabled IS 'Enable community transport (car-based) service module';
COMMENT ON COLUMN tenants.service_bus_enabled IS 'Enable community bus (Section 22) service module';
COMMENT ON COLUMN tenants.active_service_view IS 'Currently active service view for multi-service tenants (transport|bus)';

-- ====================================================================================
-- PART 2: SECTION 22 BUS ROUTES
-- ====================================================================================

CREATE TABLE IF NOT EXISTS section22_bus_routes (
    route_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    route_number VARCHAR(20) NOT NULL,
    route_name VARCHAR(200) NOT NULL,
    description TEXT,
    registration_number VARCHAR(100), -- Links to local_bus_service_registrations

    -- Route details
    origin_point VARCHAR(200) NOT NULL,
    destination_point VARCHAR(200) NOT NULL,
    total_distance_miles DECIMAL(6,2),
    estimated_duration_minutes INTEGER,

    -- Service pattern
    service_pattern VARCHAR(50) NOT NULL DEFAULT 'weekdays', -- 'daily' | 'weekdays' | 'weekends' | 'custom'
    operates_monday BOOLEAN DEFAULT false,
    operates_tuesday BOOLEAN DEFAULT false,
    operates_wednesday BOOLEAN DEFAULT false,
    operates_thursday BOOLEAN DEFAULT false,
    operates_friday BOOLEAN DEFAULT false,
    operates_saturday BOOLEAN DEFAULT false,
    operates_sunday BOOLEAN DEFAULT false,

    -- Status
    status VARCHAR(50) DEFAULT 'planning', -- 'planning' | 'registered' | 'active' | 'suspended' | 'cancelled'
    start_date DATE,
    end_date DATE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),

    CONSTRAINT unique_tenant_route_number UNIQUE(tenant_id, route_number)
);

CREATE INDEX IF NOT EXISTS idx_section22_routes_tenant ON section22_bus_routes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_section22_routes_registration ON section22_bus_routes(registration_number);
CREATE INDEX IF NOT EXISTS idx_section22_routes_dates ON section22_bus_routes(start_date, end_date);

COMMENT ON TABLE section22_bus_routes IS 'Section 22 local bus service routes';
COMMENT ON COLUMN section22_bus_routes.service_pattern IS 'Operating pattern: daily, weekdays, weekends, or custom';
COMMENT ON COLUMN section22_bus_routes.status IS 'Route lifecycle status: planning, registered (with TC), active, suspended, cancelled';

-- ====================================================================================
-- PART 3: ROUTE STOPS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS section22_route_stops (
    stop_id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES section22_bus_routes(route_id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    stop_sequence INTEGER NOT NULL,
    stop_name VARCHAR(200) NOT NULL,
    stop_address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Timing
    arrival_offset_minutes INTEGER, -- Minutes from route start
    departure_offset_minutes INTEGER,
    dwell_time_minutes INTEGER DEFAULT 2,

    -- Stop features
    is_timing_point BOOLEAN DEFAULT false,
    is_pickup_point BOOLEAN DEFAULT true,
    is_setdown_point BOOLEAN DEFAULT true,
    accessibility_features TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_route_stop_sequence UNIQUE(route_id, stop_sequence),
    CONSTRAINT valid_stop_sequence CHECK (stop_sequence > 0),
    CONSTRAINT valid_timing CHECK (
        arrival_offset_minutes IS NULL OR
        departure_offset_minutes IS NULL OR
        departure_offset_minutes >= arrival_offset_minutes
    )
);

CREATE INDEX IF NOT EXISTS idx_section22_stops_route ON section22_route_stops(route_id, stop_sequence);
CREATE INDEX IF NOT EXISTS idx_section22_stops_location ON section22_route_stops(latitude, longitude) WHERE latitude IS NOT NULL;

COMMENT ON TABLE section22_route_stops IS 'Stops along Section 22 bus routes';
COMMENT ON COLUMN section22_route_stops.stop_sequence IS 'Order of stop along route (1, 2, 3, ...)';
COMMENT ON COLUMN section22_route_stops.is_timing_point IS 'Whether this stop is a scheduled timing point';
COMMENT ON COLUMN section22_route_stops.arrival_offset_minutes IS 'Minutes from route start to arrival at this stop';

-- ====================================================================================
-- PART 4: TIMETABLES
-- ====================================================================================

CREATE TABLE IF NOT EXISTS section22_timetables (
    timetable_id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES section22_bus_routes(route_id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    service_name VARCHAR(200) NOT NULL, -- e.g., "Morning Service", "Afternoon Service"

    -- Timing
    departure_time TIME NOT NULL, -- First departure time
    direction VARCHAR(50) NOT NULL DEFAULT 'outbound', -- 'outbound' | 'inbound' | 'circular'

    -- Vehicle assignment
    vehicle_id INTEGER REFERENCES tenant_vehicles(vehicle_id),
    driver_id INTEGER REFERENCES tenant_drivers(driver_id),

    -- Capacity
    total_seats INTEGER NOT NULL,
    wheelchair_spaces INTEGER DEFAULT 0,

    -- Recurrence
    valid_from DATE NOT NULL,
    valid_until DATE,
    recurrence_pattern JSONB, -- Stores complex recurrence rules

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled' | 'active' | 'cancelled' | 'completed'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_capacity CHECK (total_seats > 0 AND wheelchair_spaces >= 0 AND wheelchair_spaces <= total_seats),
    CONSTRAINT valid_dates CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_section22_timetables_route ON section22_timetables(route_id, departure_time);
CREATE INDEX IF NOT EXISTS idx_section22_timetables_vehicle ON section22_timetables(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_section22_timetables_driver ON section22_timetables(driver_id);
CREATE INDEX IF NOT EXISTS idx_section22_timetables_dates ON section22_timetables(valid_from, valid_until);

COMMENT ON TABLE section22_timetables IS 'Service patterns (schedules) for bus routes';
COMMENT ON COLUMN section22_timetables.service_name IS 'Display name for this service (e.g., Morning Service)';
COMMENT ON COLUMN section22_timetables.direction IS 'Direction of travel: outbound, inbound, or circular';
COMMENT ON COLUMN section22_timetables.recurrence_pattern IS 'JSON pattern for complex recurrence (holidays, specific dates, etc.)';

-- ====================================================================================
-- PART 5: BUS BOOKINGS (Seat-based)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS section22_bus_bookings (
    booking_id SERIAL PRIMARY KEY,
    timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    -- Passenger
    customer_id INTEGER REFERENCES tenant_customers(customer_id),
    passenger_name VARCHAR(200) NOT NULL,
    passenger_phone VARCHAR(50),
    passenger_email VARCHAR(200),

    -- Journey details
    boarding_stop_id INTEGER REFERENCES section22_route_stops(stop_id),
    alighting_stop_id INTEGER REFERENCES section22_route_stops(stop_id),
    service_date DATE NOT NULL,

    -- Seat assignment
    seat_number VARCHAR(10), -- e.g., "1A", "2B", "W1" (wheelchair)
    requires_wheelchair_space BOOLEAN DEFAULT false,

    -- Booking metadata
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    booking_status VARCHAR(50) DEFAULT 'confirmed', -- 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed'

    -- Pricing
    fare_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid' | 'paid' | 'refunded'
    payment_method VARCHAR(50), -- 'cash' | 'card' | 'account' | 'concessionary'

    -- Notes
    special_requirements TEXT,
    internal_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),

    CONSTRAINT valid_journey CHECK (boarding_stop_id != alighting_stop_id),
    CONSTRAINT valid_fare CHECK (fare_amount IS NULL OR fare_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_section22_bookings_timetable ON section22_bus_bookings(timetable_id, service_date);
CREATE INDEX IF NOT EXISTS idx_section22_bookings_customer ON section22_bus_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_section22_bookings_reference ON section22_bus_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_section22_bookings_date ON section22_bus_bookings(service_date, booking_status);
CREATE INDEX IF NOT EXISTS idx_section22_bookings_status ON section22_bus_bookings(booking_status) WHERE booking_status IN ('confirmed', 'pending');

COMMENT ON TABLE section22_bus_bookings IS 'Individual seat bookings for bus services';
COMMENT ON COLUMN section22_bus_bookings.seat_number IS 'Specific seat assignment (e.g., 1A, 2B, W1 for wheelchair)';
COMMENT ON COLUMN section22_bus_bookings.booking_reference IS 'Unique booking reference for customer communication';
COMMENT ON COLUMN section22_bus_bookings.payment_method IS 'Payment method: cash, card, account billing, concessionary pass';

-- ====================================================================================
-- PART 6: SEAT AVAILABILITY CACHE
-- ====================================================================================

CREATE TABLE IF NOT EXISTS section22_seat_availability (
    availability_id SERIAL PRIMARY KEY,
    timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
    service_date DATE NOT NULL,

    total_seats INTEGER NOT NULL,
    booked_seats INTEGER DEFAULT 0,
    available_seats INTEGER GENERATED ALWAYS AS (total_seats - booked_seats) STORED,

    wheelchair_spaces INTEGER NOT NULL,
    booked_wheelchair_spaces INTEGER DEFAULT 0,
    available_wheelchair_spaces INTEGER GENERATED ALWAYS AS (wheelchair_spaces - booked_wheelchair_spaces) STORED,

    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_timetable_date UNIQUE(timetable_id, service_date),
    CONSTRAINT valid_bookings CHECK (booked_seats <= total_seats AND booked_wheelchair_spaces <= wheelchair_spaces)
);

CREATE INDEX IF NOT EXISTS idx_section22_availability_date ON section22_seat_availability(service_date, timetable_id);
CREATE INDEX IF NOT EXISTS idx_section22_availability_timetable ON section22_seat_availability(timetable_id) WHERE available_seats > 0;

COMMENT ON TABLE section22_seat_availability IS 'Real-time seat availability cache for quick lookups';
COMMENT ON COLUMN section22_seat_availability.available_seats IS 'Auto-calculated available seats';
COMMENT ON COLUMN section22_seat_availability.available_wheelchair_spaces IS 'Auto-calculated available wheelchair spaces';

-- ====================================================================================
-- PART 7: USER SERVICE PREFERENCES
-- ====================================================================================

CREATE TABLE IF NOT EXISTS user_service_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    preferred_service_view VARCHAR(50) DEFAULT 'transport', -- 'transport' | 'bus'

    -- Service-specific settings
    transport_default_view VARCHAR(50) DEFAULT 'calendar', -- 'calendar' | 'list' | 'map'
    bus_default_view VARCHAR(50) DEFAULT 'routes', -- 'routes' | 'timetables' | 'bookings'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_tenant_preferences UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_service_preferences(user_id);

COMMENT ON TABLE user_service_preferences IS 'User-specific preferences for service views and defaults';

-- ====================================================================================
-- PART 8: SUBSCRIPTION MODULE SUPPORT
-- ====================================================================================

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS module_transport BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS module_bus BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transport_vehicle_limit INTEGER,
ADD COLUMN IF NOT EXISTS bus_route_limit INTEGER;

COMMENT ON COLUMN subscriptions.module_transport IS 'Enable community transport service module';
COMMENT ON COLUMN subscriptions.module_bus IS 'Enable community bus service module';
COMMENT ON COLUMN subscriptions.transport_vehicle_limit IS 'Max vehicles for transport service (NULL = unlimited)';
COMMENT ON COLUMN subscriptions.bus_route_limit IS 'Max routes for bus service (NULL = unlimited)';

-- ====================================================================================
-- PART 9: TRIGGER FUNCTIONS FOR SEAT AVAILABILITY
-- ====================================================================================

-- Function to update seat availability when bookings change
CREATE OR REPLACE FUNCTION update_seat_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT or UPDATE to confirmed status
    IF (TG_OP = 'INSERT' AND NEW.booking_status = 'confirmed') OR
       (TG_OP = 'UPDATE' AND OLD.booking_status != 'confirmed' AND NEW.booking_status = 'confirmed') THEN

        INSERT INTO section22_seat_availability (timetable_id, service_date, total_seats, booked_seats, wheelchair_spaces, booked_wheelchair_spaces)
        SELECT
            NEW.timetable_id,
            NEW.service_date,
            t.total_seats,
            CASE WHEN NEW.requires_wheelchair_space THEN 0 ELSE 1 END,
            t.wheelchair_spaces,
            CASE WHEN NEW.requires_wheelchair_space THEN 1 ELSE 0 END
        FROM section22_timetables t
        WHERE t.timetable_id = NEW.timetable_id
        ON CONFLICT (timetable_id, service_date)
        DO UPDATE SET
            booked_seats = section22_seat_availability.booked_seats + CASE WHEN NEW.requires_wheelchair_space THEN 0 ELSE 1 END,
            booked_wheelchair_spaces = section22_seat_availability.booked_wheelchair_spaces + CASE WHEN NEW.requires_wheelchair_space THEN 1 ELSE 0 END,
            last_updated = CURRENT_TIMESTAMP;

    -- Handle UPDATE from confirmed to cancelled
    ELSIF TG_OP = 'UPDATE' AND OLD.booking_status = 'confirmed' AND NEW.booking_status IN ('cancelled', 'no_show') THEN

        UPDATE section22_seat_availability
        SET booked_seats = booked_seats - CASE WHEN OLD.requires_wheelchair_space THEN 0 ELSE 1 END,
            booked_wheelchair_spaces = booked_wheelchair_spaces - CASE WHEN OLD.requires_wheelchair_space THEN 1 ELSE 0 END,
            last_updated = CURRENT_TIMESTAMP
        WHERE timetable_id = OLD.timetable_id AND service_date = OLD.service_date;

    -- Handle DELETE of confirmed booking
    ELSIF TG_OP = 'DELETE' AND OLD.booking_status = 'confirmed' THEN

        UPDATE section22_seat_availability
        SET booked_seats = booked_seats - CASE WHEN OLD.requires_wheelchair_space THEN 0 ELSE 1 END,
            booked_wheelchair_spaces = booked_wheelchair_spaces - CASE WHEN OLD.requires_wheelchair_space THEN 1 ELSE 0 END,
            last_updated = CURRENT_TIMESTAMP
        WHERE timetable_id = OLD.timetable_id AND service_date = OLD.service_date;

    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trg_update_seat_availability ON section22_bus_bookings;
CREATE TRIGGER trg_update_seat_availability
AFTER INSERT OR UPDATE OR DELETE ON section22_bus_bookings
FOR EACH ROW
EXECUTE FUNCTION update_seat_availability();

COMMENT ON FUNCTION update_seat_availability() IS 'Automatically updates seat availability cache when bookings change';

-- ====================================================================================
-- PART 10: HELPER VIEWS
-- ====================================================================================

-- View for active routes with stop counts
CREATE OR REPLACE VIEW v_active_bus_routes AS
SELECT
    r.route_id,
    r.tenant_id,
    r.route_number,
    r.route_name,
    r.origin_point,
    r.destination_point,
    r.status,
    r.start_date,
    r.end_date,
    COUNT(s.stop_id) as stop_count,
    COUNT(DISTINCT t.timetable_id) as timetable_count
FROM section22_bus_routes r
LEFT JOIN section22_route_stops s ON r.route_id = s.route_id
LEFT JOIN section22_timetables t ON r.route_id = t.route_id
WHERE r.status IN ('active', 'registered')
GROUP BY r.route_id;

COMMENT ON VIEW v_active_bus_routes IS 'Active bus routes with stop and timetable counts';

-- View for today's bus services with availability
CREATE OR REPLACE VIEW v_todays_bus_services AS
SELECT
    t.timetable_id,
    t.tenant_id,
    r.route_number,
    r.route_name,
    t.service_name,
    t.departure_time,
    t.total_seats,
    COALESCE(a.available_seats, t.total_seats) as available_seats,
    COALESCE(a.booked_seats, 0) as booked_seats,
    v.registration as vehicle_registration,
    d.name as driver_name
FROM section22_timetables t
JOIN section22_bus_routes r ON t.route_id = r.route_id
LEFT JOIN section22_seat_availability a ON t.timetable_id = a.timetable_id AND a.service_date = CURRENT_DATE
LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id
LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id
WHERE t.status = 'active'
  AND r.status = 'active'
  AND t.valid_from <= CURRENT_DATE
  AND (t.valid_until IS NULL OR t.valid_until >= CURRENT_DATE);

COMMENT ON VIEW v_todays_bus_services IS 'All active bus services for today with real-time availability';

-- ====================================================================================
-- MIGRATION COMPLETE
-- ====================================================================================

-- Summary of changes:
-- ✓ Added service configuration to tenants table (transport/bus enabled flags)
-- ✓ Created section22_bus_routes table for route management
-- ✓ Created section22_route_stops table for stop sequences
-- ✓ Created section22_timetables table for service schedules
-- ✓ Created section22_bus_bookings table for seat-based bookings
-- ✓ Created section22_seat_availability table for real-time availability tracking
-- ✓ Created user_service_preferences table for user-specific settings
-- ✓ Updated subscriptions table with module support
-- ✓ Created automatic triggers for seat availability management
-- ✓ Created helpful views for common queries
