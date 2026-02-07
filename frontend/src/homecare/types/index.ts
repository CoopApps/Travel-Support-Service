/**
 * Home Care Co-operative Type Definitions
 */

// ============================================
// Platform Admin Types
// ============================================

export interface PlatformAdmin {
  admin_id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface PlatformAdminLoginDto {
  username: string;
  password: string;
}

export interface PlatformAdminLoginResponse {
  admin: PlatformAdmin;
  token: string;
}

// ============================================
// Tenant Types
// ============================================

export interface Tenant {
  tenant_id: number;
  company_name: string;
  subdomain: string;
  domain?: string;
  organization_type: OrganizationType;
  cooperative_model?: CooperativeModel;
  discount_percentage: number;
  base_price: number;
  currency: string;
  billing_cycle: BillingCycle;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  cqc_provider_id?: string;
  features?: Record<string, any>;
  theme?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export type OrganizationType =
  | 'charity'
  | 'cic'
  | 'third_sector'
  | 'cooperative'
  | 'cooperative_commonwealth';

export type CooperativeModel =
  | 'worker_coop'
  | 'consumer_coop'
  | 'multi_stakeholder'
  | 'platform_coop';

export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export interface CreateTenantDto {
  company_name: string;
  subdomain: string;
  domain?: string;
  organization_type: OrganizationType;
  cooperative_model?: CooperativeModel;
  base_price?: number;
  currency?: string;
  billing_cycle?: BillingCycle;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  cqc_provider_id?: string;
  admin_username: string;
  admin_email: string;
  admin_password: string;
}

export interface UpdateTenantDto {
  company_name?: string;
  domain?: string;
  organization_type?: OrganizationType;
  cooperative_model?: CooperativeModel;
  base_price?: number;
  currency?: string;
  billing_cycle?: BillingCycle;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  cqc_provider_id?: string;
  features?: Record<string, any>;
  theme?: Record<string, any>;
  is_active?: boolean;
}

export interface TenantListQuery {
  page?: number;
  limit?: number;
  search?: string;
  organization_type?: string;
  is_active?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  byOrganizationType: Record<string, number>;
  totalRevenue: number;
  averageDiscount: number;
}

// ============================================
// Tenant User Types
// ============================================

export interface TenantUser {
  user_id: number;
  tenant_id: number;
  username: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  phone?: string;
  created_at: string;
  last_login?: string;
}

export type UserRole = 'admin' | 'manager' | 'coordinator' | 'carer' | 'client';

// ============================================
// Client (Care Recipient) Types
// ============================================

export interface Client {
  client_id: number;
  tenant_id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  nhs_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  gp_name?: string;
  gp_surgery?: string;
  gp_phone?: string;
  medical_conditions?: string;
  allergies?: string;
  medications?: string;
  mobility_level?: MobilityLevel;
  communication_needs?: string;
  dietary_requirements?: string;
  key_safe_code?: string;
  access_notes?: string;
  preferred_carers?: number[];
  status: ClientStatus;
  created_at: string;
  updated_at?: string;
}

export type ClientStatus = 'active' | 'inactive' | 'hospital' | 'deceased';
export type MobilityLevel = 'independent' | 'assisted' | 'wheelchair' | 'bedbound';

// ============================================
// Carer Types
// ============================================

export interface Carer {
  carer_id: number;
  tenant_id: number;
  user_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postcode?: string;
  date_of_birth?: string;
  ni_number?: string;
  dbs_certificate_number?: string;
  dbs_issue_date?: string;
  dbs_update_service: boolean;
  employment_type: EmploymentType;
  contracted_hours?: number;
  hourly_rate?: number;
  travel_rate_per_mile?: number;
  car_registration?: string;
  qualifications?: string[];
  training_completed?: TrainingRecord[];
  languages?: string[];
  specialisms?: string[];
  availability?: WeeklyAvailability;
  max_travel_distance?: number;
  status: CarerStatus;
  is_member: boolean;
  member_since?: string;
  created_at: string;
  updated_at?: string;
}

export type EmploymentType = 'employee' | 'self_employed' | 'agency';
export type CarerStatus = 'active' | 'inactive' | 'on_leave' | 'suspended';

export interface TrainingRecord {
  name: string;
  completed_date: string;
  expiry_date?: string;
  certificate_url?: string;
}

export interface WeeklyAvailability {
  monday?: DayAvailability;
  tuesday?: DayAvailability;
  wednesday?: DayAvailability;
  thursday?: DayAvailability;
  friday?: DayAvailability;
  saturday?: DayAvailability;
  sunday?: DayAvailability;
}

export interface DayAvailability {
  available: boolean;
  start_time?: string;
  end_time?: string;
}

// ============================================
// Visit Types
// ============================================

export interface Visit {
  visit_id: number;
  tenant_id: number;
  client_id: number;
  carer_id?: number;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  check_in_location?: { lat: number; lng: number };
  check_out_location?: { lat: number; lng: number };
  tasks?: VisitTask[];
  notes?: string;
  carer_notes?: string;
  medication_given?: MedicationRecord[];
  concerns_raised?: string;
  status: VisitStatus;
  cancellation_reason?: string;
  mileage?: number;
  created_at: string;
  updated_at?: string;
  // Joined fields
  client?: Client;
  carer?: Carer;
}

export type VisitStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'cancelled';

export interface VisitTask {
  task_id: string;
  description: string;
  completed: boolean;
  completed_at?: string;
  notes?: string;
}

export interface MedicationRecord {
  medication_name: string;
  dosage: string;
  given_at: string;
  given_by: number;
  refused?: boolean;
  notes?: string;
}

// ============================================
// Care Plan Types
// ============================================

export interface CarePlan {
  care_plan_id: number;
  tenant_id: number;
  client_id: number;
  category: CarePlanCategory;
  title: string;
  description: string;
  tasks: CarePlanTask[];
  review_date?: string;
  created_by: number;
  approved_by?: number;
  status: CarePlanStatus;
  created_at: string;
  updated_at?: string;
}

export type CarePlanCategory =
  | 'personal_care'
  | 'medication'
  | 'mobility'
  | 'nutrition'
  | 'social'
  | 'domestic';

export type CarePlanStatus = 'draft' | 'active' | 'under_review' | 'archived';

export interface CarePlanTask {
  task_id: string;
  description: string;
  frequency: string;
  instructions?: string;
  requires_two_carers?: boolean;
}

// ============================================
// Co-operative Membership Types
// ============================================

export interface Member {
  member_id: number;
  tenant_id: number;
  user_id: number;
  carer_id?: number;
  member_number: string;
  join_date: string;
  share_capital: number;
  status: MemberStatus;
  voting_rights: boolean;
  board_member: boolean;
  board_role?: string;
  created_at: string;
  updated_at?: string;
  // Joined fields
  user?: TenantUser;
  carer?: Carer;
}

export type MemberStatus = 'pending' | 'active' | 'suspended' | 'withdrawn';

export interface Vote {
  vote_id: number;
  tenant_id: number;
  title: string;
  description: string;
  vote_type: VoteType;
  options?: string[];
  quorum_required: number;
  majority_required: number;
  voting_start: string;
  voting_end: string;
  status: VoteStatus;
  results?: VoteResults;
  created_by: number;
  created_at: string;
}

export type VoteType = 'yes_no' | 'multiple_choice' | 'board_election';
export type VoteStatus = 'draft' | 'open' | 'closed' | 'cancelled';

export interface VoteResults {
  total_eligible: number;
  total_votes: number;
  turnout_percentage: number;
  votes_by_option: Record<string, number>;
  passed: boolean;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardOverview {
  clients: {
    total: number;
    active: number;
    new_this_month: number;
  };
  carers: {
    total: number;
    active: number;
    on_duty_today: number;
  };
  visits: {
    today: number;
    completed_today: number;
    missed_today: number;
    upcoming_week: number;
  };
  members: {
    total: number;
    active: number;
    pending: number;
  };
  compliance: {
    dbs_expiring_soon: number;
    training_due: number;
    care_plans_due_review: number;
  };
}
