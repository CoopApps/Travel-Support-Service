/**
 * Permit Type Definitions
 * Handles driver permits, roles, and organizational permits
 * Compliance with Transport Act 1985 and EU Regulation 1071/2009
 */

export type PermitType = 'dbs' | 'section19' | 'section22' | 'mot';
export type OrganizationalPermitType = 'section19' | 'section22';
export type PermitSizeType = 'standard' | 'large_bus';
export type PassengerClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type IssuingBodyType = 'traffic_commissioner' | 'designated_body';
export type EUExemptionType = 'non_commercial_purposes' | 'main_occupation' | 'short_distance';
export type OperatingStructure =
  | 'registered_charity'
  | 'cic_no_shares'
  | 'cic_with_shares'
  | 'company_limited_guarantee'
  | 'unincorporated_association'
  | 'partnership'
  | 'other';
export type TrafficCommissionerArea =
  | 'North Eastern'
  | 'North Western'
  | 'Eastern'
  | 'West Midlands'
  | 'Welsh'
  | 'Western'
  | 'South Eastern'
  | 'Scottish';

export interface DriverPermit {
  hasPermit: boolean;
  expiryDate?: string;
  issueDate?: string;
  notes?: string;
}

export interface DriverPermits {
  dbs: DriverPermit;
  section19: DriverPermit;
  section22: DriverPermit;
  mot: DriverPermit;
}

export interface DriverRole {
  vulnerablePassengers: boolean;
  section19Driver: boolean;
  section22Driver: boolean;
  vehicleOwner: boolean;
}

export interface OrganizationalPermit {
  id?: number;
  permit_id?: number;
  permit_type: OrganizationalPermitType;
  organisation_name: string;
  permit_number: string;
  issue_date?: string;
  expiry_date: string;
  notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;

  // Enhanced Section 19/22 compliance fields
  permit_size_type?: PermitSizeType;
  permitted_passenger_classes?: PassengerClass[];
  class_e_geographic_definition?: string;
  class_e_radius_miles?: number;
  class_e_center_point?: string;
  class_f_description?: string;
  issued_by_type?: IssuingBodyType;
  issuing_body_name?: string;
  designated_body_id?: string;
  disc_number?: string;
  permit_conditions?: string;
  renewal_reminder_sent?: boolean;
  renewal_reminder_date?: string;
}

export interface PermitsOverview {
  organizational: {
    totalPermits: number;
    section19Count: number;
    section22Count: number;
    expiredCount: number;
    expiringCount: number;
  };
  drivers: {
    totalDrivers: number;
    driversWithPermits: number;
    totalDriverPermits: number;
    expiredDriverPermits: number;
    expiringDriverPermits: number;
  };
  summary: {
    totalPermits: number;
    alertsCount: number;
  };
}

export interface PermitsStats {
  drivers: {
    total: number;
    compliant: number;
    expiring: number;
    expired: number;
    missing: number;
  };
  organizational: {
    section19: {
      total: number;
      expiring: number;
      expired: number;
    };
    section22: {
      total: number;
      expiring: number;
      expired: number;
    };
  };
}

export interface DriverPermitsData {
  driverPermits: Record<number, DriverPermits>;
  driverRoles: Record<number, DriverRole>;
}

export interface OrganizationalPermitsData {
  section19: OrganizationalPermit[];
  section22: OrganizationalPermit[];
}

export interface CreateOrganizationalPermitDto {
  permit_type: OrganizationalPermitType;
  organisation_name: string;
  permit_number: string;
  issue_date?: string;
  expiry_date: string;
  notes?: string;
}

export interface UpdateOrganizationalPermitDto extends Partial<CreateOrganizationalPermitDto> {}

export interface PermitStatus {
  text: string;
  color: string;
  level: 'ok' | 'warning' | 'expired' | 'missing';
}

export interface ComplianceStatus {
  text: string;
  color: string;
}

// ===== NEW COMPLIANCE TYPES =====

/**
 * EU Regulation Exemption Tracking
 */
export interface EUExemption {
  exemption_type: EUExemptionType;
  is_charity: boolean;
  charity_number?: string;
  charity_registration_date?: string;
  charity_name?: string;
  operating_structure?: OperatingStructure;
  not_for_profit_verified: boolean;
  not_for_profit_verification_date?: string;
  not_for_profit_verification_notes?: string;

  // Main occupation exemption
  main_occupation_description?: string;
  transport_income_percentage?: number;
  other_income_percentage?: number;
  main_occupation_evidence_date?: string;

  // Short distance exemption
  short_distance_method?: 'radius' | 'point_to_point';
  short_distance_radius_miles?: number;
  short_distance_center_point?: string;
  short_distance_justification?: string;

  // Financial compliance
  uses_full_cost_recovery: boolean;
  last_surplus_review_date?: string;
  competitive_tendering_allowed: boolean;
  competitive_tendering_percentage?: number;

  traffic_commissioner_area?: TrafficCommissionerArea;
}

/**
 * Driver Licensing Compliance
 */
export interface DriverLicensingCompliance {
  is_volunteer: boolean;
  is_paid_driver: boolean;

  // PCV licensing
  pcv_license_number?: string;
  pcv_license_issue_date?: string;
  pcv_license_expiry_date?: string;
  pcv_categories?: string; // 'D1' | 'D1+E' | 'D' | 'D+E'

  // D1 entitlement (pre-1997 licenses)
  d1_entitlement_granted: boolean;
  d1_entitlement_date?: string;
  d1_medical_required: boolean;
  d1_medical_expiry_date?: string;

  // Car license
  car_license_number?: string;
  car_license_issue_date?: string;
  license_pre_1997: boolean;

  // Driver CPC
  driver_cpc_required: boolean;
  driver_cpc_exempt: boolean;
  driver_cpc_card_number?: string;
  driver_cpc_expiry_date?: string;
  driver_cpc_training_hours: number;

  // MiDAS certification
  midas_certified: boolean;
  midas_certificate_number?: string;
  midas_issue_date?: string;
  midas_expiry_date?: string;
  midas_assessor?: string;

  // Age verification
  age_verified: boolean;
  age_21_verification_date?: string;

  // Exemptions
  exempt_from_hours_rules: boolean;
  hours_rules_exemption_reason?: string;

  // Additional training
  safed_trained: boolean;
  safed_training_date?: string;
  first_aid_certified: boolean;
  first_aid_expiry_date?: string;
}

/**
 * Vehicle Permit Compliance
 */
export interface VehiclePermitCompliance {
  // Permit eligibility
  eligible_for_section19_standard: boolean;
  eligible_for_section19_large: boolean;
  eligible_for_section22: boolean;

  // Large bus certification
  coif_number?: string;
  coif_issue_date?: string;
  coif_expiry_date?: string;
  certificate_of_conformity?: string;
  ecwvta_approved: boolean;
  nns_approved: boolean;

  // Separate fares requirement
  separate_fares_required: boolean;
  can_hire_as_whole: boolean;

  // Tachograph
  tachograph_fitted: boolean;
  tachograph_type?: 'analogue' | 'digital' | 'none';
  tachograph_calibration_date?: string;
  tachograph_required: boolean;
  tachograph_exempt_reason?: string;

  // Accessibility
  accessibility_compliant: boolean;
  wheelchair_space_count: number;
  boarding_device_type?: 'ramp' | 'lift' | 'none';
  boarding_device_inspection_date?: string;
  priority_seats_count: number;

  // Safety equipment
  fire_extinguisher_check_date?: string;
  fire_extinguisher_type?: string;
  first_aid_kit_check_date?: string;
  first_aid_kit_compliant: boolean;

  // Disc tracking
  current_permit_disc_number?: string;
  disc_displayed: boolean;

  // Testing
  test_class?: 'Class IV' | 'Class V' | 'Class VI';
  annual_test_required: boolean;
  test_station_type?: 'MOT' | 'HGV_LGV' | 'DVSA';
}

/**
 * Local Bus Service Registration (Section 22)
 */
export interface LocalBusServiceRegistration {
  registration_id?: number;
  tenant_id: number;
  permit_id?: number;

  // Registration details
  registration_number: string;
  traffic_commissioner_area: TrafficCommissionerArea;

  // Service details
  service_name?: string;
  route_description: string;
  route_number?: string;

  // Dates
  registration_submitted_date?: string;
  service_start_date: string;
  service_end_date?: string;

  // 28-day notice
  notice_period_days: number;
  variation_notice_date?: string;
  cancellation_notice_date?: string;

  // Status
  status: 'pending' | 'registered' | 'active' | 'varied' | 'cancelled' | 'expired';

  // Route details
  route_distance_km?: number;
  is_regular_service: boolean;
  has_timetable: boolean;

  // Timetable data
  timetable_data?: any;
  stops_data?: any;

  // Operating details
  operating_days?: string;
  frequency_description?: string;

  // Traffic regulation
  traffic_regulation_conditions: boolean;
  traffic_regulation_notes?: string;

  // Notes
  notes?: string;
  variation_history?: any[];

  created_at?: string;
  updated_at?: string;
}

/**
 * Financial Surplus Tracking
 */
export interface FinancialSurplus {
  surplus_id?: number;
  tenant_id: number;

  // Financial year
  financial_year: string;
  year_start_date: string;
  year_end_date: string;

  // Income
  total_income: number;
  fare_revenue: number;
  contract_revenue: number;
  grant_income: number;
  other_income: number;

  // Expenses
  total_expenses: number;
  driver_wages: number;
  fuel_costs: number;
  vehicle_maintenance: number;
  insurance: number;
  depreciation: number;
  administration_costs: number;
  other_expenses: number;

  // Surplus/deficit
  surplus_amount: number;
  is_surplus: boolean;

  // Reinvestment
  surplus_reinvestment_plan?: string;
  surplus_reinvestment_actual?: string;
  surplus_reinvested: boolean;
  reinvestment_date?: string;

  // Cross-subsidy
  has_cross_subsidy: boolean;
  cross_subsidy_description?: string;
  profitable_routes?: string[];
  loss_making_routes?: string[];

  // Full Cost Recovery
  uses_fcr_model: boolean;
  fcr_calculation_notes?: string;

  // Audit
  reviewed: boolean;
  reviewed_by?: string;
  review_date?: string;
  review_notes?: string;

  // Competitive tendering
  competitive_contracts_revenue: number;
  competitive_contracts_percentage?: number;

  created_at?: string;
  updated_at?: string;
}

/**
 * Section 19 Passenger Class Definition
 */
export interface PassengerClassDefinition {
  class_id?: number;
  tenant_id: number;
  permit_id?: number;

  // Class details
  class_code: PassengerClass;
  class_name: string;
  class_description: string;
  eligibility_criteria?: string;

  // Class E (local community)
  geographic_area?: string;
  radius_miles?: number;
  center_point?: string;

  // Class F (other)
  custom_class_definition?: string;

  // Verification
  verification_required: boolean;
  verification_method?: 'membership_card' | 'signed_application' | 'referral' | 'none';

  is_active: boolean;

  created_at?: string;
  updated_at?: string;
}

/**
 * Compliance Alert
 */
export interface ComplianceAlert {
  alert_id?: number;
  tenant_id: number;

  // Alert type
  alert_type:
    | 'permit_expiring'
    | 'permit_expired'
    | 'driver_license_expiring'
    | 'coif_expired'
    | 'midas_expiring'
    | 'dbs_expiring'
    | 'service_registration_required'
    | 'surplus_review_required'
    | 'not_for_profit_verification_required';

  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';

  // Alert details
  alert_title: string;
  alert_message: string;

  // Related entity
  entity_type?: 'permit' | 'driver' | 'vehicle' | 'service_registration' | 'financial';
  entity_id?: number;

  // Action
  action_required?: string;
  action_deadline?: string;

  // Status
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledged: boolean;
  acknowledged_by?: number;
  acknowledged_at?: string;

  resolved: boolean;
  resolved_by?: number;
  resolved_at?: string;
  resolution_notes?: string;

  created_at?: string;
  updated_at?: string;
}

/**
 * DTOs for API requests/responses
 */
export interface CreateServiceRegistrationDto {
  permit_id?: number;
  registration_number: string;
  traffic_commissioner_area: TrafficCommissionerArea;
  service_name?: string;
  route_description: string;
  route_number?: string;
  service_start_date: string;
  service_end_date?: string;
  is_regular_service: boolean;
  has_timetable: boolean;
  operating_days?: string;
  frequency_description?: string;
  notes?: string;
}

export interface CreateFinancialSurplusDto {
  financial_year: string;
  year_start_date: string;
  year_end_date: string;
  total_income: number;
  total_expenses: number;
  surplus_reinvestment_plan?: string;
  uses_fcr_model: boolean;
}

export interface CreatePassengerClassDto {
  permit_id?: number;
  class_code: PassengerClass;
  class_name: string;
  class_description: string;
  eligibility_criteria?: string;
  geographic_area?: string;
  radius_miles?: number;
  center_point?: string;
  verification_required: boolean;
  verification_method?: string;
}
