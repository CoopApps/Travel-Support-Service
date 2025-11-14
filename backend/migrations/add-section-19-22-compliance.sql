-- Migration: Add Section 19 and Section 22 Regulatory Compliance Features
-- Date: 2025-01-14
-- Purpose: Full compliance with Transport Act 1985 and EU Regulation 1071/2009

-- =======================================================================================
-- 1. ORGANIZATIONAL PERMITS - Add regulatory compliance fields
-- =======================================================================================

ALTER TABLE tenant_organizational_permits
ADD COLUMN IF NOT EXISTS permit_size_type VARCHAR(50) DEFAULT 'standard',
-- 'standard' (≤16 passengers) | 'large_bus' (17+ passengers)

ADD COLUMN IF NOT EXISTS permitted_passenger_classes TEXT[] DEFAULT '{}',
-- Section 19 only: Array of classes ['A', 'B', 'C', 'D', 'E', 'F']

ADD COLUMN IF NOT EXISTS class_e_geographic_definition TEXT,
-- For Class E: Description of local community (e.g., "Residents of villages X, Y, Z")

ADD COLUMN IF NOT EXISTS class_e_radius_miles INTEGER,
-- For Class E: Radius in miles from central point

ADD COLUMN IF NOT EXISTS class_e_center_point TEXT,
-- For Class E: Central point description (e.g., "Village Hall, Main Street")

ADD COLUMN IF NOT EXISTS class_f_description TEXT,
-- For Class F: Description of other permitted passenger classes

ADD COLUMN IF NOT EXISTS issued_by_type VARCHAR(50) DEFAULT 'traffic_commissioner',
-- 'traffic_commissioner' | 'designated_body'

ADD COLUMN IF NOT EXISTS issuing_body_name VARCHAR(255),
-- Name of issuing body (e.g., 'Scout Association', 'Hampshire County Council')

ADD COLUMN IF NOT EXISTS designated_body_id VARCHAR(100),
-- ID of designated body if applicable

ADD COLUMN IF NOT EXISTS disc_number VARCHAR(100),
-- Physical disc number that must be displayed in vehicle

ADD COLUMN IF NOT EXISTS permit_conditions TEXT,
-- Any specific conditions attached to the permit

ADD COLUMN IF NOT EXISTS renewal_reminder_sent BOOLEAN DEFAULT false,
-- Track if renewal reminder has been sent

ADD COLUMN IF NOT EXISTS renewal_reminder_date DATE;
-- Date when renewal reminder was sent

COMMENT ON COLUMN tenant_organizational_permits.permit_size_type IS 'Standard permit (≤16 pass) or large bus permit (17+ pass)';
COMMENT ON COLUMN tenant_organizational_permits.permitted_passenger_classes IS 'Section 19: Permitted passenger classes (A-F)';
COMMENT ON COLUMN tenant_organizational_permits.class_e_geographic_definition IS 'Section 19 Class E: Geographic community definition';
COMMENT ON COLUMN tenant_organizational_permits.issued_by_type IS 'Issued by traffic commissioner or designated body';

-- =======================================================================================
-- 2. TENANTS - Add EU Regulation and not-for-profit tracking
-- =======================================================================================

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS eu_exemption_type VARCHAR(100),
-- 'non_commercial_purposes' | 'main_occupation' | 'short_distance'

ADD COLUMN IF NOT EXISTS is_charity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS charity_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS charity_registration_date DATE,
ADD COLUMN IF NOT EXISTS charity_name VARCHAR(255),

ADD COLUMN IF NOT EXISTS operating_structure VARCHAR(100),
-- 'registered_charity' | 'cic_no_shares' | 'cic_with_shares' |
-- 'company_limited_guarantee' | 'unincorporated_association' | 'partnership'

ADD COLUMN IF NOT EXISTS not_for_profit_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS not_for_profit_verification_date DATE,
ADD COLUMN IF NOT EXISTS not_for_profit_verification_notes TEXT,

-- Main occupation exemption fields
ADD COLUMN IF NOT EXISTS main_occupation_description TEXT,
ADD COLUMN IF NOT EXISTS transport_income_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS other_income_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS main_occupation_evidence_date DATE,

-- Short distance exemption fields
ADD COLUMN IF NOT EXISTS short_distance_method VARCHAR(50),
-- 'radius' | 'point_to_point'

ADD COLUMN IF NOT EXISTS short_distance_radius_miles INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS short_distance_center_point TEXT,
ADD COLUMN IF NOT EXISTS short_distance_justification TEXT,
-- For rural areas requesting >10 miles

-- Financial compliance
ADD COLUMN IF NOT EXISTS uses_full_cost_recovery BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_surplus_review_date DATE,
ADD COLUMN IF NOT EXISTS competitive_tendering_allowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS competitive_tendering_percentage DECIMAL(5,2),

-- Traffic commissioner area
ADD COLUMN IF NOT EXISTS traffic_commissioner_area VARCHAR(100);
-- 'North Eastern' | 'North Western' | 'Eastern' | 'West Midlands' |
-- 'Welsh' | 'Western' | 'South Eastern' | 'Scottish'

COMMENT ON COLUMN tenants.eu_exemption_type IS 'EU Regulation 1071/2009 exemption type';
COMMENT ON COLUMN tenants.is_charity IS 'Registered charity status';
COMMENT ON COLUMN tenants.operating_structure IS 'Legal structure of organization';
COMMENT ON COLUMN tenants.main_occupation_description IS 'Main occupation if using main occupation exemption';
COMMENT ON COLUMN tenants.short_distance_method IS 'Short distance calculation method (radius or point-to-point)';
COMMENT ON COLUMN tenants.traffic_commissioner_area IS 'Traffic commissioner jurisdiction area';

-- =======================================================================================
-- 3. DRIVERS - Add driver licensing compliance fields
-- =======================================================================================

ALTER TABLE tenant_drivers
ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_paid_driver BOOLEAN DEFAULT false,

-- PCV licensing
ADD COLUMN IF NOT EXISTS pcv_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS pcv_license_issue_date DATE,
ADD COLUMN IF NOT EXISTS pcv_license_expiry_date DATE,
ADD COLUMN IF NOT EXISTS pcv_categories VARCHAR(50),
-- 'D1' | 'D1+E' | 'D' | 'D+E'

-- D1 entitlement (for pre-1997 licenses)
ADD COLUMN IF NOT EXISTS d1_entitlement_granted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS d1_entitlement_date DATE,
ADD COLUMN IF NOT EXISTS d1_medical_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS d1_medical_expiry_date DATE,

-- Car license (to check pre/post 1997 rules)
ADD COLUMN IF NOT EXISTS car_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS car_license_issue_date DATE,
ADD COLUMN IF NOT EXISTS license_pre_1997 BOOLEAN DEFAULT false,

-- Driver CPC
ADD COLUMN IF NOT EXISTS driver_cpc_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_cpc_exempt BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_cpc_card_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS driver_cpc_expiry_date DATE,
ADD COLUMN IF NOT EXISTS driver_cpc_training_hours INTEGER DEFAULT 0,

-- MiDAS certification (recommended training)
ADD COLUMN IF NOT EXISTS midas_certified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS midas_certificate_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS midas_issue_date DATE,
ADD COLUMN IF NOT EXISTS midas_expiry_date DATE,
ADD COLUMN IF NOT EXISTS midas_assessor VARCHAR(255),

-- Age verification (21+ required for permits)
ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS age_21_verification_date DATE,

-- Volunteer driver exemptions
ADD COLUMN IF NOT EXISTS exempt_from_hours_rules BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hours_rules_exemption_reason TEXT,

-- Driver qualifications
ADD COLUMN IF NOT EXISTS safed_trained BOOLEAN DEFAULT false,
-- Safe and Fuel Efficient Driving
ADD COLUMN IF NOT EXISTS safed_training_date DATE,
ADD COLUMN IF NOT EXISTS first_aid_certified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS first_aid_expiry_date DATE;

COMMENT ON COLUMN tenant_drivers.is_volunteer IS 'Volunteer driver (exempt from hours rules)';
COMMENT ON COLUMN tenant_drivers.is_paid_driver IS 'Paid driver (subject to hours rules)';
COMMENT ON COLUMN tenant_drivers.pcv_license_number IS 'Passenger Carrying Vehicle license number';
COMMENT ON COLUMN tenant_drivers.d1_entitlement_granted IS 'Pre-1997 automatic D1 entitlement';
COMMENT ON COLUMN tenant_drivers.license_pre_1997 IS 'Car license granted before 1 Jan 1997';
COMMENT ON COLUMN tenant_drivers.midas_certified IS 'MiDAS (Minibus Driver Awareness Scheme) certified';
COMMENT ON COLUMN tenant_drivers.driver_cpc_exempt IS 'Exempt from Driver CPC for permit operations';

-- =======================================================================================
-- 4. VEHICLES - Add vehicle permit compliance fields
-- =======================================================================================

ALTER TABLE tenant_vehicles
-- Permit eligibility
ADD COLUMN IF NOT EXISTS eligible_for_section19_standard BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS eligible_for_section19_large BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eligible_for_section22 BOOLEAN DEFAULT true,

-- Large bus certification (required for 17+ passengers)
ADD COLUMN IF NOT EXISTS coif_number VARCHAR(100),
-- Certificate of Initial Fitness
ADD COLUMN IF NOT EXISTS coif_issue_date DATE,
ADD COLUMN IF NOT EXISTS coif_expiry_date DATE,
ADD COLUMN IF NOT EXISTS certificate_of_conformity VARCHAR(100),
-- CoC for type-approved vehicles
ADD COLUMN IF NOT EXISTS ecwvta_approved BOOLEAN DEFAULT false,
-- European Whole Vehicle Type Approval
ADD COLUMN IF NOT EXISTS nns_approved BOOLEAN DEFAULT false,
-- New National Scheme approval

-- Separate fares requirement (for small vehicles ≤8 passengers)
ADD COLUMN IF NOT EXISTS separate_fares_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_hire_as_whole BOOLEAN DEFAULT true,

-- Tachograph requirements
ADD COLUMN IF NOT EXISTS tachograph_fitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tachograph_type VARCHAR(50),
-- 'analogue' | 'digital' | 'none'
ADD COLUMN IF NOT EXISTS tachograph_calibration_date DATE,
ADD COLUMN IF NOT EXISTS tachograph_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tachograph_exempt_reason VARCHAR(255),

-- Accessibility compliance (PSV Accessibility Regulations 2000)
ADD COLUMN IF NOT EXISTS accessibility_compliant BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wheelchair_space_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS boarding_device_type VARCHAR(100),
-- 'ramp' | 'lift' | 'none'
ADD COLUMN IF NOT EXISTS boarding_device_inspection_date DATE,
ADD COLUMN IF NOT EXISTS priority_seats_count INTEGER DEFAULT 0,

-- Safety equipment compliance
ADD COLUMN IF NOT EXISTS fire_extinguisher_check_date DATE,
ADD COLUMN IF NOT EXISTS fire_extinguisher_type VARCHAR(100),
-- BS 5423 or EN3 compliant
ADD COLUMN IF NOT EXISTS first_aid_kit_check_date DATE,
ADD COLUMN IF NOT EXISTS first_aid_kit_compliant BOOLEAN DEFAULT false,

-- Vehicle disc tracking
ADD COLUMN IF NOT EXISTS current_permit_disc_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS disc_displayed BOOLEAN DEFAULT false,

-- Vehicle testing requirements
ADD COLUMN IF NOT EXISTS test_class VARCHAR(50),
-- 'Class IV' (≤12 pass) | 'Class V' (13-16 pass) | 'Class VI' (17+ pass)
ADD COLUMN IF NOT EXISTS annual_test_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS test_station_type VARCHAR(100);
-- 'MOT' | 'HGV_LGV' | 'DVSA'

COMMENT ON COLUMN tenant_vehicles.eligible_for_section19_standard IS 'Can be used under Section 19 standard permit (≤16 passengers)';
COMMENT ON COLUMN tenant_vehicles.eligible_for_section19_large IS 'Can be used under Section 19 large bus permit (17+ passengers)';
COMMENT ON COLUMN tenant_vehicles.coif_number IS 'Certificate of Initial Fitness number (required for large buses)';
COMMENT ON COLUMN tenant_vehicles.separate_fares_required IS 'Small vehicles must charge separate fares under Section 19';
COMMENT ON COLUMN tenant_vehicles.tachograph_required IS 'Tachograph required based on route length and service type';
COMMENT ON COLUMN tenant_vehicles.accessibility_compliant IS 'Complies with PSV Accessibility Regulations 2000';

-- =======================================================================================
-- 5. LOCAL BUS SERVICE REGISTRATIONS (Section 22)
-- =======================================================================================

CREATE TABLE IF NOT EXISTS local_bus_service_registrations (
  registration_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  permit_id INTEGER REFERENCES tenant_organizational_permits(permit_id) ON DELETE SET NULL,

  -- Registration details
  registration_number VARCHAR(100) NOT NULL,
  -- Format varies by traffic commissioner area
  traffic_commissioner_area VARCHAR(100) NOT NULL,
  -- 'North Eastern' | 'North Western' | 'Eastern' | 'West Midlands' |
  -- 'Welsh' | 'Western' | 'South Eastern' | 'Scottish'

  -- Service details
  service_name VARCHAR(255),
  route_description TEXT NOT NULL,
  route_number VARCHAR(50),

  -- Dates
  registration_submitted_date DATE,
  service_start_date DATE NOT NULL,
  service_end_date DATE,

  -- 28-day notice requirements
  notice_period_days INTEGER DEFAULT 28,
  variation_notice_date DATE,
  cancellation_notice_date DATE,

  -- Service status
  status VARCHAR(50) DEFAULT 'pending',
  -- 'pending' | 'registered' | 'active' | 'varied' | 'cancelled' | 'expired'

  -- Route details
  route_distance_km DECIMAL(10,2),
  is_regular_service BOOLEAN DEFAULT true,
  -- Regular service = specified intervals, specified routes, predetermined stops
  has_timetable BOOLEAN DEFAULT true,

  -- Stops and timetable
  timetable_data JSONB,
  -- Store complete timetable as JSON
  stops_data JSONB,
  -- Store stop locations and times

  -- Operating details
  operating_days VARCHAR(255),
  -- 'Monday-Friday' | 'Daily' | 'Monday,Wednesday,Friday' etc.
  frequency_description VARCHAR(255),
  -- 'Every 30 minutes' | 'Hourly' | 'Twice daily'

  -- Traffic regulation conditions
  traffic_regulation_conditions BOOLEAN DEFAULT false,
  traffic_regulation_notes TEXT,

  -- Notes and history
  notes TEXT,
  variation_history JSONB,
  -- Track all variations as JSON array

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_registration_number UNIQUE(tenant_id, registration_number)
);

CREATE INDEX idx_local_bus_registrations_tenant ON local_bus_service_registrations(tenant_id);
CREATE INDEX idx_local_bus_registrations_permit ON local_bus_service_registrations(permit_id);
CREATE INDEX idx_local_bus_registrations_status ON local_bus_service_registrations(status);
CREATE INDEX idx_local_bus_registrations_start_date ON local_bus_service_registrations(service_start_date);

COMMENT ON TABLE local_bus_service_registrations IS 'Section 22 community bus service registrations with traffic commissioner';
COMMENT ON COLUMN local_bus_service_registrations.registration_number IS 'Service registration number issued by traffic commissioner';
COMMENT ON COLUMN local_bus_service_registrations.is_regular_service IS 'Regular service (specified intervals/routes/stops) vs non-regular';
COMMENT ON COLUMN local_bus_service_registrations.notice_period_days IS '28 days required for start, vary, or cancel';

-- =======================================================================================
-- 6. FINANCIAL SURPLUS TRACKING (Not-for-profit compliance)
-- =======================================================================================

CREATE TABLE IF NOT EXISTS tenant_financial_surplus (
  surplus_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Financial year
  financial_year VARCHAR(20) NOT NULL,
  -- Format: '2024-2025'
  year_start_date DATE NOT NULL,
  year_end_date DATE NOT NULL,

  -- Income breakdown
  total_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  fare_revenue DECIMAL(12,2) DEFAULT 0,
  contract_revenue DECIMAL(12,2) DEFAULT 0,
  grant_income DECIMAL(12,2) DEFAULT 0,
  other_income DECIMAL(12,2) DEFAULT 0,

  -- Expense breakdown
  total_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
  driver_wages DECIMAL(12,2) DEFAULT 0,
  fuel_costs DECIMAL(12,2) DEFAULT 0,
  vehicle_maintenance DECIMAL(12,2) DEFAULT 0,
  insurance DECIMAL(12,2) DEFAULT 0,
  depreciation DECIMAL(12,2) DEFAULT 0,
  administration_costs DECIMAL(12,2) DEFAULT 0,
  other_expenses DECIMAL(12,2) DEFAULT 0,

  -- Surplus/deficit
  surplus_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_income - total_expenses) STORED,
  is_surplus BOOLEAN GENERATED ALWAYS AS (total_income > total_expenses) STORED,

  -- Surplus reinvestment
  surplus_reinvestment_plan TEXT,
  surplus_reinvestment_actual TEXT,
  surplus_reinvested BOOLEAN DEFAULT false,
  reinvestment_date DATE,

  -- Cross-subsidy tracking
  has_cross_subsidy BOOLEAN DEFAULT false,
  cross_subsidy_description TEXT,
  profitable_routes TEXT[],
  loss_making_routes TEXT[],

  -- Full Cost Recovery compliance
  uses_fcr_model BOOLEAN DEFAULT true,
  fcr_calculation_notes TEXT,

  -- Audit and compliance
  reviewed BOOLEAN DEFAULT false,
  reviewed_by VARCHAR(255),
  review_date DATE,
  review_notes TEXT,

  -- Competitive tendering (if applicable)
  competitive_contracts_revenue DECIMAL(12,2) DEFAULT 0,
  competitive_contracts_percentage DECIMAL(5,2),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_tenant_financial_year UNIQUE(tenant_id, financial_year)
);

CREATE INDEX idx_financial_surplus_tenant ON tenant_financial_surplus(tenant_id);
CREATE INDEX idx_financial_surplus_year ON tenant_financial_surplus(financial_year);
CREATE INDEX idx_financial_surplus_surplus ON tenant_financial_surplus(is_surplus);

COMMENT ON TABLE tenant_financial_surplus IS 'Annual financial surplus tracking for not-for-profit compliance';
COMMENT ON COLUMN tenant_financial_surplus.surplus_amount IS 'Calculated as total_income - total_expenses';
COMMENT ON COLUMN tenant_financial_surplus.surplus_reinvestment_plan IS 'Plan for how surplus will be reinvested';
COMMENT ON COLUMN tenant_financial_surplus.has_cross_subsidy IS 'Cross-subsidy between profitable and loss-making routes';
COMMENT ON COLUMN tenant_financial_surplus.uses_fcr_model IS 'Uses Full Cost Recovery pricing model';

-- =======================================================================================
-- 7. PASSENGER CLASS ELIGIBILITY (Section 19)
-- =======================================================================================

CREATE TABLE IF NOT EXISTS section19_passenger_class_definitions (
  class_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  permit_id INTEGER REFERENCES tenant_organizational_permits(permit_id) ON DELETE CASCADE,

  -- Passenger class
  class_code VARCHAR(10) NOT NULL,
  -- 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

  class_name VARCHAR(100) NOT NULL,
  -- 'Members' | 'Beneficiaries' | 'Disabled persons' | 'Students' | 'Local community' | 'Other'

  -- Class definition
  class_description TEXT NOT NULL,
  eligibility_criteria TEXT,

  -- For Class E (local community)
  geographic_area TEXT,
  radius_miles INTEGER,
  center_point TEXT,

  -- For Class F (other)
  custom_class_definition TEXT,

  -- Verification requirements
  verification_required BOOLEAN DEFAULT false,
  verification_method VARCHAR(255),
  -- 'membership_card' | 'signed_application' | 'referral' | 'none'

  -- Active status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_permit_class UNIQUE(permit_id, class_code)
);

CREATE INDEX idx_passenger_class_tenant ON section19_passenger_class_definitions(tenant_id);
CREATE INDEX idx_passenger_class_permit ON section19_passenger_class_definitions(permit_id);
CREATE INDEX idx_passenger_class_code ON section19_passenger_class_definitions(class_code);

COMMENT ON TABLE section19_passenger_class_definitions IS 'Section 19 permitted passenger class definitions';
COMMENT ON COLUMN section19_passenger_class_definitions.class_code IS 'Class A-F as defined in Transport Act 1985';
COMMENT ON COLUMN section19_passenger_class_definitions.verification_method IS 'How passenger eligibility is verified';

-- =======================================================================================
-- 8. PERMIT COMPLIANCE ALERTS
-- =======================================================================================

CREATE TABLE IF NOT EXISTS permit_compliance_alerts (
  alert_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Alert type
  alert_type VARCHAR(100) NOT NULL,
  -- 'permit_expiring' | 'permit_expired' | 'driver_license_expiring' |
  -- 'coif_expired' | 'midas_expiring' | 'dbs_expiring' |
  -- 'service_registration_required' | 'surplus_review_required' |
  -- 'not_for_profit_verification_required'

  -- Severity
  severity VARCHAR(50) NOT NULL,
  -- 'critical' | 'high' | 'medium' | 'low' | 'info'

  -- Alert details
  alert_title VARCHAR(255) NOT NULL,
  alert_message TEXT NOT NULL,

  -- Related entity
  entity_type VARCHAR(100),
  -- 'permit' | 'driver' | 'vehicle' | 'service_registration' | 'financial'
  entity_id INTEGER,

  -- Action required
  action_required TEXT,
  action_deadline DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  -- 'active' | 'acknowledged' | 'resolved' | 'dismissed'

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by INTEGER,
  acknowledged_at TIMESTAMP,

  resolved BOOLEAN DEFAULT false,
  resolved_by INTEGER,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compliance_alerts_tenant ON permit_compliance_alerts(tenant_id);
CREATE INDEX idx_compliance_alerts_type ON permit_compliance_alerts(alert_type);
CREATE INDEX idx_compliance_alerts_severity ON permit_compliance_alerts(severity);
CREATE INDEX idx_compliance_alerts_status ON permit_compliance_alerts(status);
CREATE INDEX idx_compliance_alerts_deadline ON permit_compliance_alerts(action_deadline);

COMMENT ON TABLE permit_compliance_alerts IS 'Automated compliance alerts for Section 19/22 permit holders';
COMMENT ON COLUMN permit_compliance_alerts.alert_type IS 'Type of compliance alert';
COMMENT ON COLUMN permit_compliance_alerts.severity IS 'Alert severity level';
COMMENT ON COLUMN permit_compliance_alerts.action_deadline IS 'Deadline for required action';

-- =======================================================================================
-- 9. DATA POPULATION AND DEFAULTS
-- =======================================================================================

-- Set default permit size type for existing organizational permits
UPDATE tenant_organizational_permits
SET permit_size_type = 'standard'
WHERE permit_size_type IS NULL;

-- Set default EU exemption type for existing tenants (most common)
UPDATE tenants
SET eu_exemption_type = 'non_commercial_purposes'
WHERE eu_exemption_type IS NULL;

-- Set default short distance method
UPDATE tenants
SET short_distance_method = 'radius',
    short_distance_radius_miles = 10
WHERE short_distance_method IS NULL;

-- Mark existing drivers as volunteers by default (can be updated)
UPDATE tenant_drivers
SET is_volunteer = true,
    is_paid_driver = false
WHERE is_volunteer IS NULL;

-- Set vehicle eligibility based on seats
UPDATE tenant_vehicles
SET eligible_for_section19_standard = (seats <= 16),
    eligible_for_section19_large = (seats >= 17),
    eligible_for_section22 = (seats >= 9),
    separate_fares_required = (seats <= 8)
WHERE eligible_for_section19_standard IS NULL;

-- =======================================================================================
-- 10. CONSTRAINTS AND VALIDATIONS
-- =======================================================================================

-- Ensure permit size type is valid
ALTER TABLE tenant_organizational_permits
ADD CONSTRAINT check_permit_size_type
CHECK (permit_size_type IN ('standard', 'large_bus'));

-- Ensure EU exemption type is valid
ALTER TABLE tenants
ADD CONSTRAINT check_eu_exemption_type
CHECK (eu_exemption_type IN ('non_commercial_purposes', 'main_occupation', 'short_distance'));

-- Ensure operating structure is valid
ALTER TABLE tenants
ADD CONSTRAINT check_operating_structure
CHECK (operating_structure IN (
  'registered_charity',
  'cic_no_shares',
  'cic_with_shares',
  'company_limited_guarantee',
  'unincorporated_association',
  'partnership',
  'other'
));

-- Ensure short distance method is valid
ALTER TABLE tenants
ADD CONSTRAINT check_short_distance_method
CHECK (short_distance_method IN ('radius', 'point_to_point'));

-- Ensure traffic commissioner area is valid
ALTER TABLE tenants
ADD CONSTRAINT check_traffic_commissioner_area
CHECK (traffic_commissioner_area IN (
  'North Eastern',
  'North Western',
  'Eastern',
  'West Midlands',
  'Welsh',
  'Western',
  'South Eastern',
  'Scottish'
));

-- =======================================================================================
-- MIGRATION COMPLETE
-- =======================================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Section 19/22 compliance migration completed successfully';
  RAISE NOTICE 'Tables updated: tenant_organizational_permits, tenants, tenant_drivers, tenant_vehicles';
  RAISE NOTICE 'Tables created: local_bus_service_registrations, tenant_financial_surplus, section19_passenger_class_definitions, permit_compliance_alerts';
END $$;
