/**
 * Driver Management Types - Frontend
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

export interface Driver {
  driver_id: number;
  id?: number; // Alias for driver_id
  tenant_id: number;
  name: string;
  first_name?: string; // Some queries return first/last name separately
  last_name?: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  license_class: string | null;
  vehicle_type: string | null;
  weekly_wage: number | null;
  weekly_lease: number | null; // Fuel allowance
  vehicle_id: string | null; // Vehicle assignment ID
  current_vehicle_id?: number | null; // Currently assigned vehicle
  assigned_vehicle: string | null; // Personal vehicle details
  vehicle_assignment: any | null; // Vehicle assignment JSON
  vehicle_registration?: string | null; // Registration of assigned vehicle
  employment_type: 'contracted' | 'freelance' | 'employed' | null;
  employment_status: 'active' | 'on_leave' | 'terminated' | null;
  salary_structure: SalaryStructure | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  preferred_hours: string | null;
  notes: string | null;
  // Age/DOB verification
  date_of_birth?: string | null;
  age_verified?: boolean;
  // PCV License fields (for bus/minibus driving)
  pcv_license_number?: string | null;
  pcv_license_expiry_date?: string | null;
  license_pre_1997?: boolean;
  d1_entitlement_granted?: string | null;
  // Driver CPC fields
  driver_cpc_required?: boolean;
  driver_cpc_exempt?: boolean;
  driver_cpc_card_number?: string | null;
  driver_cpc_expiry_date?: string | null;
  // DBS fields
  dbs_check_required?: boolean;
  dbs_check_date: string | null;
  dbs_expiry_date: string | null;
  // Section 19/22 permit fields
  section19_permit: boolean | null;
  section19_expiry: string | null;
  section19_driver_auth: boolean | null;
  section19_driver_expiry: string | null;
  section22_driver_auth: boolean | null;
  section22_driver_expiry: string | null;
  mot_date: string | null;
  mot_expiry_date: string | null;
  // Login/user fields
  user_id: number | null;
  is_login_enabled: boolean;
  is_active: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
  username?: string;
  last_login?: string;
  user_created?: string; // Account creation timestamp
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
  vehicleId?: string | null;
  assignedVehicle?: string | null;
  employmentType?: 'contracted' | 'freelance' | 'employed';
  salaryStructure?: SalaryStructure;
  emergencyContact?: string;
  emergencyPhone?: string;
  preferredHours?: string;
  notes?: string;
  // Permit fields
  dbsCheckDate?: string | null;
  dbsExpiryDate?: string | null;
  section19Permit?: boolean;
  section19Expiry?: string | null;
  section19DriverAuth?: boolean;
  section19DriverExpiry?: string | null;
  section22DriverAuth?: boolean;
  section22DriverExpiry?: string | null;
  motDate?: string | null;
  motExpiryDate?: string | null;
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
  vehicleId?: string | null;
  assignedVehicle?: string | null;
  employmentType?: 'contracted' | 'freelance' | 'employed';
  salaryStructure?: SalaryStructure;
  emergencyContact?: string;
  emergencyPhone?: string;
  preferredHours?: string;
  notes?: string;
  // Permit fields
  dbsCheckDate?: string | null;
  dbsExpiryDate?: string | null;
  section19Permit?: boolean;
  section19Expiry?: string | null;
  section19DriverAuth?: boolean;
  section19DriverExpiry?: string | null;
  section22DriverAuth?: boolean;
  section22DriverExpiry?: string | null;
  motDate?: string | null;
  motExpiryDate?: string | null;
}

export interface DriverListQuery {
  page?: number;
  limit?: number;
  search?: string;
  employmentType?: string;
  archived?: boolean;
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
