/**
 * TypeScript Type Definitions - Stage 3
 */

// User and Authentication Types
export interface User {
  id: number;
  email: string;
  role: 'admin' | 'manager' | 'driver' | 'customer' | 'super_admin' | 'staff';
  tenantId: number;
  customerId?: number; // For customer portal users
  customer_id?: number; // Alias
  driverId?: number; // For driver portal users
  driver_id?: number; // Alias for driverId
  employmentType?: string; // For driver users
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// API Error Types
export interface ApiError {
  error: {
    message: string;
    statusCode: number;
    timestamp: string;
    path?: string;
  };
}

// Customer Types - Stage 4
export interface Customer {
  customer_id: number;
  id?: number; // Alias for customer_id
  tenant_id: number;
  name: string;
  first_name?: string; // Some queries return first/last separately
  last_name?: string;
  requires_wheelchair?: boolean;
  mobility_needs?: string;
  address?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  paying_org?: string;
  has_split_payment?: boolean;
  provider_split?: Record<string, number>;
  payment_split?: Record<string, { percentage: number; amount: number }>;
  schedule?: Record<string, any>;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  medication_notes?: string;
  driver_notes?: string;
  mobility_requirements?: string;
  accessibility_needs?: {
    wheelchairUser?: boolean;
    mobilityAids?: string[];
    assistance_required?: string;
  };
  medical_info?: string;
  is_active: boolean;
  is_login_enabled?: boolean;
  user_id?: number;
  username?: string;
  last_login?: string;
  section_19_eligible?: boolean; // Eligible for Section 19 community transport (cars)
  section_22_eligible?: boolean; // Eligible for Section 22 community bus services
  // Reminder preferences
  reminder_opt_in?: boolean;
  reminder_preference?: 'sms' | 'email' | 'both' | 'none';
  // Reliability tracking
  total_trips_attempted?: number;
  reliability_percentage?: number;
  no_show_count?: number;
  last_no_show_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerDto {
  name: string;
  address?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  paying_org?: string;
  has_split_payment?: boolean;
  provider_split?: Record<string, number>;
  payment_split?: Record<string, { percentage: number; amount: number }>;
  schedule?: Record<string, any>;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  medication_notes?: string;
  driver_notes?: string;
  mobility_requirements?: string;
  section_19_eligible?: boolean;
  section_22_eligible?: boolean;
  is_active?: boolean;
  reminder_opt_in?: boolean;
  reminder_preference?: 'sms' | 'email' | 'both' | 'none';
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  paying_org?: string;
  is_login_enabled?: boolean;
  archived?: boolean;
  sortBy?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Schedule Types
export interface DaySchedule {
  enabled: boolean;
  destination?: string;
  pickupTime?: string;
  returnDestination?: string;
  returnTime?: string;
  morningCost?: number;
  afternoonCost?: number;
  dailyCost?: number;
  morningDriverId?: number;
  morningDriverName?: string;
  afternoonDriverId?: number;
  afternoonDriverName?: string;
}

export interface WeeklySchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

// Login Management Types
export interface CustomerLoginInfo {
  is_login_enabled: boolean;
  username?: string;
  user_id?: number;
  last_login?: string;
}

export interface EnableLoginDto {
  username: string;
  password: string;
}

export interface UpdatePasswordDto {
  newPassword: string;
}

// Platform Admin & Tenant Types
export interface Tenant {
  tenant_id: number;
  company_name: string;
  subdomain: string;
  domain?: string;
  subscription_tier?: 'free' | 'basic' | 'professional' | 'enterprise';
  organization_type: 'charity' | 'cic' | 'third_sector' | 'cooperative' | 'cooperative_commonwealth';
  cooperative_model?: 'worker' | 'consumer' | 'producer' | 'multi_stakeholder' | 'platform' | 'housing' | 'credit_union' | 'passenger' | 'hybrid';
  discount_percentage: number;
  base_price: number;
  currency: string;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  is_active: boolean;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  features?: TenantFeatures;
  theme?: TenantTheme;
  created_at: string;
  updated_at: string;
}

export interface TenantFeatures {
  customer_portal?: boolean;
  route_optimization?: boolean;
  billing_integration?: boolean;
  advanced_reporting?: boolean;
  api_access?: boolean;
}

export interface TenantTheme {
  primary_color?: string;
  logo_url?: string;
  company_name_display?: string;
}

export interface CreateTenantDto {
  company_name: string;
  subdomain: string;
  domain?: string;
  subscription_tier?: 'free' | 'basic' | 'professional' | 'enterprise';
  organization_type?: 'charity' | 'cic' | 'third_sector' | 'cooperative' | 'cooperative_commonwealth';
  cooperative_model?: 'worker' | 'consumer' | 'producer' | 'multi_stakeholder' | 'platform' | 'housing' | 'credit_union' | 'passenger' | 'hybrid';
  base_price?: number;
  currency?: string;
  billing_cycle?: 'monthly' | 'quarterly' | 'annual';
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  max_users?: number;
  max_customers?: number;
  features?: TenantFeatures;
  theme?: TenantTheme;
  admin_username: string;
  admin_email: string;
  admin_password: string;
}

export interface UpdateTenantDto extends Partial<Omit<CreateTenantDto, 'admin_username' | 'admin_email' | 'admin_password'>> {
  is_active?: boolean;
}

export interface TenantListQuery {
  page?: number;
  limit?: number;
  search?: string;
  organization_type?: string;
  is_active?: boolean;
  sortBy?: 'company_name' | 'created_at' | 'subdomain' | 'organization_type';
  sortOrder?: 'asc' | 'desc';
}

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlatformAdmin {
  id: number;
  username: string;
  email: string;
  role: 'super_admin' | 'admin';
}

export interface PlatformAdminLoginDto {
  username: string;
  password: string;
}

export interface PlatformAdminLoginResponse {
  token: string;
  admin: PlatformAdmin;
}

export interface PlatformStats {
  total: number;
  active: number;
  inactive: number;
  byOrgType: Record<string, {
    count: number;
    revenue: number;
    avgDiscount: number;
  }>;
  totalRevenue: number;
}

// Re-export driver types
export * from './driver.types';

// Re-export trip types
export * from './trip.types';

// Re-export vehicle types
export * from './vehicle.types';

// Re-export social outings types
export * from './socialOutings';

// Re-export provider types
export * from './provider.types';

// Re-export permit types (excluding ComplianceStatus which conflicts with training.types)
export type {
  PermitType,
  OrganizationalPermitType,
  PermitSizeType,
  PassengerClass,
  IssuingBodyType,
  EUExemptionType,
  OperatingStructure,
  TrafficCommissionerArea,
  DriverPermit,
  DriverPermits,
  DriverRole,
  OrganizationalPermit,
  PermitsOverview,
  PermitsStats,
  DriverPermitsData,
  OrganizationalPermitsData,
  CreateOrganizationalPermitDto,
  UpdateOrganizationalPermitDto,
  PermitStatus,
  ComplianceStatus as PermitComplianceStatus,
  EUExemption,
  DriverLicensingCompliance,
  VehiclePermitCompliance,
  LocalBusServiceRegistration,
  FinancialSurplus,
  PassengerClassDefinition,
  ComplianceAlert,
  CreateServiceRegistrationDto,
  CreateFinancialSurplusDto,
  CreatePassengerClassDto
} from './permit.types';

// Re-export training types
export * from './training.types';

// Re-export safeguarding types
export * from './safeguarding.types';

// Re-export payroll types
export * from './payroll.types';

// Re-export fare types
export * from './fare.types';
