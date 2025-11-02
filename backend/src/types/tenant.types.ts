/**
 * Tenant Types - Co-operative Commonwealth Edition
 *
 * TypeScript interfaces for Co-operative Commonwealth tenant management
 */

export type OrganizationType = 'charity' | 'cic' | 'third_sector' | 'cooperative' | 'cooperative_commonwealth';
export type CooperativeModel = 'worker' | 'passenger' | 'hybrid';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

/**
 * Commonwealth App - Platform hosts multiple apps
 */
export interface CommonwealthApp {
  app_id: number;
  app_name: string;
  app_code: string;
  description?: string;
  app_url?: string;
  is_active: boolean;
  config?: any;
  logo_url?: string;
  primary_color?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Tenant - Organization subscribed to a Commonwealth app
 */
export interface Tenant {
  tenant_id: number;
  company_name: string;
  subdomain: string;
  domain?: string;
  is_active: boolean;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  features?: TenantFeatures;
  theme?: TenantTheme;

  // App association
  app_id: number;

  // Organization type and pricing (replaces subscription_tier)
  organization_type: OrganizationType;
  cooperative_model?: CooperativeModel;
  discount_percentage: number; // Calculated automatically based on org type
  base_price: number; // Base monthly price before discount
  currency: string; // ISO 4217 currency code
  billing_cycle: BillingCycle;

  // Governance and features
  governance_requirements?: GovernanceRequirements;
  enabled_modules?: EnabledModules;

  created_at: Date;
  updated_at: Date;
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

export interface GovernanceRequirements {
  meetings_required?: boolean;
  reporting_required?: boolean;
  annual_report_deadline?: string;
  commonwealth_sharing?: boolean;
}

export interface EnabledModules {
  admin?: {
    governance?: boolean;
    membership?: boolean;
    voting?: boolean;
    worker_management?: boolean;
    customer_management?: boolean;
    hybrid_management?: boolean;
    commonwealth_network?: boolean;
  };
  driver?: {
    ownership_dashboard?: boolean;
    profit_sharing?: boolean;
    voting?: boolean;
  };
  customer?: {
    membership_portal?: boolean;
    voting?: boolean;
    employment_decisions?: boolean;
  };
}

export interface CreateTenantDto {
  company_name: string;
  subdomain: string;
  domain?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  features?: TenantFeatures;
  theme?: TenantTheme;

  // App association
  app_id?: number; // Defaults to travel_support if not specified

  // Organization type and pricing (required)
  organization_type: OrganizationType;
  cooperative_model?: CooperativeModel; // Required if organization_type is cooperative*
  base_price?: number; // Defaults to 100.00
  currency?: string; // Defaults to 'GBP'
  billing_cycle?: BillingCycle; // Defaults to 'monthly'

  // Admin user for tenant
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
  app_id?: number;
  is_active?: boolean;
  sortBy?: 'company_name' | 'created_at' | 'subdomain';
  sortOrder?: 'asc' | 'desc';
}

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Co-operative Commonwealth Admin User Types
 */
export type CommonwealthAdminRole = 'super_admin' | 'app_admin' | 'support_admin' | 'financial_admin';

export interface CommonwealthAdmin {
  commonwealth_admin_id: number;
  username: string;
  email: string;
  role: 'super_admin' | 'admin'; // Legacy field
  commonwealth_role: CommonwealthAdminRole;
  app_permissions: {
    all_apps?: boolean;
    apps?: string[];
  };
  is_active: boolean;
  created_at: Date;
  last_login?: Date;
}

export interface CommonwealthAdminLoginDto {
  username: string;
  password: string;
}

export interface CommonwealthAdminTokenPayload {
  adminId: number;
  username: string;
  email: string;
  role: 'super_admin' | 'admin';
  commonwealthRole: CommonwealthAdminRole;
  appPermissions: {
    all_apps?: boolean;
    apps?: string[];
  };
}

// Legacy aliases for backwards compatibility
export type PlatformAdmin = CommonwealthAdmin;
export type PlatformAdminLoginDto = CommonwealthAdminLoginDto;
export type PlatformAdminTokenPayload = CommonwealthAdminTokenPayload;

/**
 * Co-operative Governance Types
 */
export interface CooperativeMeeting {
  meeting_id: number;
  tenant_id: number;
  meeting_type: 'general_assembly' | 'board_meeting' | 'worker_meeting' | 'member_meeting';
  scheduled_date: Date;
  held_date?: Date;
  attendees_count?: number;
  quorum_met?: boolean;
  minutes_url?: string;
  notes?: string;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CooperativeReport {
  report_id: number;
  tenant_id: number;
  report_type: 'annual' | 'quarterly' | 'structure' | 'membership';
  period_start: Date;
  period_end: Date;
  submitted_date?: Date;
  report_data?: any;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CooperativeMembership {
  membership_id: number;
  tenant_id: number;
  member_type: 'driver' | 'customer' | 'worker' | 'other';
  member_reference_id?: number;
  ownership_shares: number;
  voting_rights: boolean;
  joined_date: Date;
  left_date?: Date;
  is_active: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCooperativeMeetingDto {
  meeting_type: 'general_assembly' | 'board_meeting' | 'worker_meeting' | 'member_meeting';
  scheduled_date: string;
  notes?: string;
}

export interface UpdateCooperativeMeetingDto {
  held_date?: string;
  attendees_count?: number;
  quorum_met?: boolean;
  minutes_url?: string;
  notes?: string;
}

export interface CreateCooperativeReportDto {
  report_type: 'annual' | 'quarterly' | 'structure' | 'membership';
  period_start: string;
  period_end: string;
  report_data?: any;
  notes?: string;
}

export interface CreateCooperativeMembershipDto {
  member_type: 'driver' | 'customer' | 'worker' | 'other';
  member_reference_id?: number;
  ownership_shares?: number;
  voting_rights?: boolean;
  joined_date: string;
  notes?: string;
}

/**
 * Commonwealth Service Sharing Types
 */
export interface CommonwealthServiceSharing {
  sharing_id: number;
  provider_tenant_id: number;
  recipient_tenant_id: number;
  service_type: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  is_active: boolean;
  estimated_value?: number;
  actual_value?: number;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateServiceSharingDto {
  recipient_tenant_id: number;
  service_type: string;
  description?: string;
  start_date: string;
  end_date?: string;
  estimated_value?: number;
}

/**
 * Tenant Billing Types
 */
export interface TenantBillingHistory {
  billing_id: number;
  tenant_id: number;
  billing_period_start: Date;
  billing_period_end: Date;
  base_price: number;
  discount_percentage: number;
  discount_amount: number;
  final_price: number;
  currency: string;
  organization_type: OrganizationType;
  cooperative_model?: CooperativeModel;
  invoice_number?: string;
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Commonwealth App Management Types
 */
export interface CreateAppDto {
  app_name: string;
  app_code: string;
  description?: string;
  app_url?: string;
  config?: any;
  logo_url?: string;
  primary_color?: string;
}

export interface UpdateAppDto extends Partial<CreateAppDto> {
  is_active?: boolean;
}
