/**
 * Driver Management Types
 *
 * TypeScript interfaces for driver-related data structures
 * Based on tenant_drivers table (42 columns)
 */

export interface SalaryStructure {
  type: 'hourly_rate' | 'fixed_weekly' | 'fixed_monthly';
  hourlyRate?: number;
  overtimeMultiplier?: number;
  weeklyWage?: number;
  monthlyWage?: number;
  fuelAllowance?: number;
  fuelReimbursement?: boolean;
  hasFuelCard?: boolean;
  fuelCardId?: number | null;
  holidayPay?: boolean;
  sickPay?: boolean;
}

export interface DriverRole {
  role: string;
  certificationDate?: string;
  expiryDate?: string;
}

export interface Holiday {
  year: number;
  annual: number;
  used: number;
  remaining: number;
  carriedOver?: number;
}

export interface AvailabilityRestriction {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface Qualification {
  name: string;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  authority?: string;
}

export interface Driver {
  driver_id: number;
  tenant_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  license_class: string | null;
  vehicle_type: string | null;
  weekly_wage: number | null;
  weekly_lease: number | null;
  vehicle_id: number | null;
  assigned_vehicle: string | null;
  dbs_check_date: string | null;
  dbs_expiry_date: string | null;
  section19_permit: boolean | null;
  section19_expiry: string | null;
  section19_driver_auth: boolean | null;
  section19_driver_expiry: string | null;
  section22_driver_auth: boolean | null;
  section22_driver_expiry: string | null;
  mot_date: string | null;
  mot_expiry_date: string | null;
  employment_type: 'contracted' | 'freelance' | 'employed' | null;
  employment_status: 'active' | 'on_leave' | 'terminated' | null;
  salary_structure: SalaryStructure | null;
  vehicle_assignment: number | null;
  start_date: string | null;
  contract_end_date: string | null;
  driver_roles: DriverRole[] | null;
  holidays: Holiday[] | null;
  availability_restrictions: AvailabilityRestriction[] | null;
  qualifications: Qualification[] | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  preferred_hours: string | null;
  notes: string | null;
  user_id: number | null;
  is_login_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields from tenant_users
  username?: string;
  user_email?: string;
  last_login?: string;
  user_active?: boolean;
}

export interface CreateDriverDto {
  name: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseClass?: string;
  vehicleType?: string;
  weeklyWage?: number;
  weeklyLease?: number;
  vehicleId?: number;
  assignedVehicle?: string;
  dbsCheckDate?: string;
  dbsExpiryDate?: string;
  section19Permit?: boolean;
  section19Expiry?: string;
  section19DriverAuth?: boolean;
  section19DriverExpiry?: string;
  section22DriverAuth?: boolean;
  section22DriverExpiry?: string;
  motDate?: string;
  motExpiryDate?: string;
  employmentType?: 'contracted' | 'freelance' | 'employed';
  employmentStatus?: 'active' | 'on_leave' | 'terminated';
  salaryStructure?: SalaryStructure;
  startDate?: string;
  contractEndDate?: string;
  driverRoles?: DriverRole[];
  holidays?: Holiday[];
  availabilityRestrictions?: AvailabilityRestriction[];
  qualifications?: Qualification[];
  emergencyContact?: string;
  emergencyPhone?: string;
  preferredHours?: string;
  notes?: string;
}

export interface UpdateDriverDto {
  name?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseClass?: string;
  vehicleType?: string;
  weeklyWage?: number;
  weeklyLease?: number;
  vehicleId?: number;
  assignedVehicle?: string;
  employmentType?: 'contracted' | 'freelance' | 'employed';
  employmentStatus?: 'active' | 'on_leave' | 'terminated';
  salaryStructure?: SalaryStructure;
  emergencyContact?: string;
  emergencyPhone?: string;
  preferredHours?: string;
  notes?: string;
}

export interface DriverListQuery {
  page?: number;
  limit?: number;
  search?: string;
  employmentType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DriverListResponse {
  drivers: Driver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DriverStats {
  total: number;
  contracted: number;
  freelance: number;
  employed: number;
  loginEnabled: number;
}
