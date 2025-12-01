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
