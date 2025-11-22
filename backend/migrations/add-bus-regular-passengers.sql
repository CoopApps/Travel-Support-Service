-- Regular Passengers and Absence System for Section 22 Bus Services
-- Allows recurring seat assignments with self-service absence reporting

-- ====================================================================================
-- PART 1: REGULAR PASSENGERS (Recurring Seat Assignments)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS section22_regular_passengers (
    regular_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
    timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,

    -- Seat assignment
    seat_number VARCHAR(10) NOT NULL, -- e.g., "1", "2", "W1" (wheelchair)
    requires_wheelchair_space BOOLEAN DEFAULT false,

    -- Days of operation (which days this passenger travels)
    travels_monday BOOLEAN DEFAULT false,
    travels_tuesday BOOLEAN DEFAULT false,
    travels_wednesday BOOLEAN DEFAULT false,
    travels_thursday BOOLEAN DEFAULT false,
    travels_friday BOOLEAN DEFAULT false,
    travels_saturday BOOLEAN DEFAULT false,
    travels_sunday BOOLEAN DEFAULT false,

    -- Boarding/alighting points
    boarding_stop_id INTEGER REFERENCES section22_route_stops(stop_id),
    alighting_stop_id INTEGER REFERENCES section22_route_stops(stop_id),

    -- Validity period
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE, -- NULL = ongoing

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active' | 'suspended' | 'ended'

    -- Notes
    special_requirements TEXT,
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),

    -- Ensure a seat isn't double-booked for the same timetable and day pattern
    CONSTRAINT unique_regular_seat_assignment UNIQUE(timetable_id, seat_number, valid_from),
    CONSTRAINT valid_regular_dates CHECK (valid_until IS NULL OR valid_until >= valid_from),
    CONSTRAINT at_least_one_day CHECK (
        travels_monday OR travels_tuesday OR travels_wednesday OR
        travels_thursday OR travels_friday OR travels_saturday OR travels_sunday
    )
);

CREATE INDEX IF NOT EXISTS idx_regular_passengers_tenant ON section22_regular_passengers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regular_passengers_customer ON section22_regular_passengers(customer_id);
CREATE INDEX IF NOT EXISTS idx_regular_passengers_timetable ON section22_regular_passengers(timetable_id);
CREATE INDEX IF NOT EXISTS idx_regular_passengers_active ON section22_regular_passengers(timetable_id, status)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_regular_passengers_validity ON section22_regular_passengers(valid_from, valid_until);

COMMENT ON TABLE section22_regular_passengers IS 'Recurring seat assignments for regular bus passengers';
COMMENT ON COLUMN section22_regular_passengers.seat_number IS 'Assigned seat for this passenger on their travel days';
COMMENT ON COLUMN section22_regular_passengers.status IS 'active = travelling, suspended = temporarily not travelling, ended = no longer on this service';

-- ====================================================================================
-- PART 2: PASSENGER ABSENCES (Sick Days, Holidays, One-off cancellations)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS section22_passenger_absences (
    absence_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,

    -- Absence details
    absence_date DATE NOT NULL,
    absence_reason VARCHAR(100) NOT NULL, -- 'sick' | 'holiday' | 'appointment' | 'other'
    reason_notes TEXT, -- Additional details if needed

    -- Scope: which services is this absence for?
    -- NULL = all services that day, otherwise specific timetable
    timetable_id INTEGER REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,

    -- Who reported it
    reported_by VARCHAR(50) DEFAULT 'staff', -- 'customer' | 'staff' | 'carer'
    reported_by_user_id INTEGER REFERENCES users(id), -- If staff reported
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Status
    status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed' | 'cancelled' (if they change their mind)

    -- Pricing impact tracking
    fare_adjustment_applied BOOLEAN DEFAULT false,
    fare_adjustment_amount DECIMAL(10,2), -- Amount other passengers' fares changed

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Can't have duplicate absences for same customer/date/service
    CONSTRAINT unique_customer_absence UNIQUE(customer_id, absence_date, timetable_id)
);

CREATE INDEX IF NOT EXISTS idx_absences_tenant ON section22_passenger_absences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_absences_customer ON section22_passenger_absences(customer_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON section22_passenger_absences(absence_date);
CREATE INDEX IF NOT EXISTS idx_absences_timetable ON section22_passenger_absences(timetable_id, absence_date);
CREATE INDEX IF NOT EXISTS idx_absences_active ON section22_passenger_absences(absence_date, status)
    WHERE status = 'confirmed';

COMMENT ON TABLE section22_passenger_absences IS 'Passenger absences - sick days, holidays, cancellations';
COMMENT ON COLUMN section22_passenger_absences.absence_reason IS 'Reason for absence: sick, holiday, appointment, other';
COMMENT ON COLUMN section22_passenger_absences.timetable_id IS 'NULL = absent from all services that day, otherwise specific service only';
COMMENT ON COLUMN section22_passenger_absences.reported_by IS 'Who reported the absence: customer (self-service), staff, or carer';
COMMENT ON COLUMN section22_passenger_absences.fare_adjustment_applied IS 'Whether dynamic pricing has been recalculated for remaining passengers';

-- ====================================================================================
-- PART 3: VIEW FOR EFFECTIVE PASSENGERS ON A GIVEN DATE
-- ====================================================================================

-- This view calculates who should be on the bus for any given date
-- Takes regular passengers, applies day-of-week filter, excludes absences
CREATE OR REPLACE FUNCTION get_effective_passengers(
    p_tenant_id INTEGER,
    p_timetable_id INTEGER,
    p_service_date DATE
) RETURNS TABLE (
    customer_id INTEGER,
    customer_name TEXT,
    seat_number VARCHAR(10),
    requires_wheelchair_space BOOLEAN,
    boarding_stop_id INTEGER,
    alighting_stop_id INTEGER,
    is_regular BOOLEAN,
    booking_id INTEGER
) AS $$
DECLARE
    v_day_of_week INTEGER;
BEGIN
    -- Get day of week (0=Sunday, 1=Monday, etc.)
    v_day_of_week := EXTRACT(DOW FROM p_service_date);

    RETURN QUERY
    -- Regular passengers (not absent)
    SELECT
        rp.customer_id,
        (c.first_name || ' ' || c.last_name)::TEXT as customer_name,
        rp.seat_number,
        rp.requires_wheelchair_space,
        rp.boarding_stop_id,
        rp.alighting_stop_id,
        true as is_regular,
        NULL::INTEGER as booking_id
    FROM section22_regular_passengers rp
    JOIN tenant_customers c ON rp.customer_id = c.customer_id
    WHERE rp.tenant_id = p_tenant_id
      AND rp.timetable_id = p_timetable_id
      AND rp.status = 'active'
      AND rp.valid_from <= p_service_date
      AND (rp.valid_until IS NULL OR rp.valid_until >= p_service_date)
      -- Check day of week
      AND (
          (v_day_of_week = 0 AND rp.travels_sunday) OR
          (v_day_of_week = 1 AND rp.travels_monday) OR
          (v_day_of_week = 2 AND rp.travels_tuesday) OR
          (v_day_of_week = 3 AND rp.travels_wednesday) OR
          (v_day_of_week = 4 AND rp.travels_thursday) OR
          (v_day_of_week = 5 AND rp.travels_friday) OR
          (v_day_of_week = 6 AND rp.travels_saturday)
      )
      -- Exclude if absent
      AND NOT EXISTS (
          SELECT 1 FROM section22_passenger_absences a
          WHERE a.customer_id = rp.customer_id
            AND a.absence_date = p_service_date
            AND a.status = 'confirmed'
            AND (a.timetable_id IS NULL OR a.timetable_id = p_timetable_id)
      )

    UNION ALL

    -- One-off bookings (not already a regular passenger for this day)
    SELECT
        b.customer_id,
        b.passenger_name::TEXT,
        b.seat_number,
        b.requires_wheelchair_space,
        b.boarding_stop_id,
        b.alighting_stop_id,
        false as is_regular,
        b.booking_id
    FROM section22_bus_bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.timetable_id = p_timetable_id
      AND b.service_date = p_service_date
      AND b.booking_status IN ('confirmed', 'pending')
      -- Exclude if this is actually a regular passenger (avoid duplicates)
      AND NOT EXISTS (
          SELECT 1 FROM section22_regular_passengers rp
          WHERE rp.customer_id = b.customer_id
            AND rp.timetable_id = b.timetable_id
            AND rp.status = 'active'
            AND rp.valid_from <= p_service_date
            AND (rp.valid_until IS NULL OR rp.valid_until >= p_service_date)
      );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_effective_passengers IS 'Returns all passengers expected on a service for a given date, combining regular passengers and one-off bookings, excluding absences';

-- ====================================================================================
-- PART 4: VIEW FOR UPCOMING CUSTOMER BUS JOURNEYS (for Customer Dashboard)
-- ====================================================================================

CREATE OR REPLACE VIEW v_customer_upcoming_bus_journeys AS
SELECT
    rp.customer_id,
    rp.tenant_id,
    t.timetable_id,
    r.route_number,
    r.route_name,
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
  AND t.status IN ('active', 'scheduled')
  AND r.status = 'active';

COMMENT ON VIEW v_customer_upcoming_bus_journeys IS 'View for customer dashboard showing their regular bus service registrations';

-- ====================================================================================
-- PART 5: FUNCTION TO CHECK SEAT AVAILABILITY FOR REGULAR ASSIGNMENT
-- ====================================================================================

CREATE OR REPLACE FUNCTION check_regular_seat_available(
    p_timetable_id INTEGER,
    p_seat_number VARCHAR(10),
    p_valid_from DATE,
    p_valid_until DATE,
    p_days_mask INTEGER, -- Bitmask: 1=Mon, 2=Tue, 4=Wed, 8=Thu, 16=Fri, 32=Sat, 64=Sun
    p_exclude_regular_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_conflict_count INTEGER;
BEGIN
    -- Check for overlapping regular passenger assignments on the same seat
    SELECT COUNT(*) INTO v_conflict_count
    FROM section22_regular_passengers rp
    WHERE rp.timetable_id = p_timetable_id
      AND rp.seat_number = p_seat_number
      AND rp.status = 'active'
      AND (p_exclude_regular_id IS NULL OR rp.regular_id != p_exclude_regular_id)
      -- Date overlap check
      AND rp.valid_from <= COALESCE(p_valid_until, '9999-12-31'::DATE)
      AND (rp.valid_until IS NULL OR rp.valid_until >= p_valid_from)
      -- Day overlap check (any common day)
      AND (
          ((p_days_mask & 1) > 0 AND rp.travels_monday) OR
          ((p_days_mask & 2) > 0 AND rp.travels_tuesday) OR
          ((p_days_mask & 4) > 0 AND rp.travels_wednesday) OR
          ((p_days_mask & 8) > 0 AND rp.travels_thursday) OR
          ((p_days_mask & 16) > 0 AND rp.travels_friday) OR
          ((p_days_mask & 32) > 0 AND rp.travels_saturday) OR
          ((p_days_mask & 64) > 0 AND rp.travels_sunday)
      );

    RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_regular_seat_available IS 'Check if a seat is available for a new regular passenger assignment on specified days';

-- ====================================================================================
-- MIGRATION COMPLETE
-- ====================================================================================

-- Summary:
-- + section22_regular_passengers: Recurring seat assignments by day of week
-- + section22_passenger_absences: Sick days, holidays, cancellations (self-service capable)
-- + get_effective_passengers(): Returns actual passengers for a specific date
-- + v_customer_upcoming_bus_journeys: For customer dashboard
-- + check_regular_seat_available(): Validation function for seat assignment
