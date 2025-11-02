// ============================================
// Office Staff Types
// ============================================

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary';

export interface OfficeStaff {
  id: number;
  tenant_id: number;

  // Personal Information
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;

  // Employment Details
  employee_number?: string;
  job_title: string;
  department?: string;
  employment_type: EmploymentType;
  start_date: string; // ISO date
  end_date?: string; // ISO date

  // Compensation
  salary_annual?: number;
  hourly_rate?: number;

  // Manager & Reporting
  manager_id?: number;

  // Status
  is_active: boolean;

  // Audit
  created_at: string;
  updated_at: string;
}

export interface CreateOfficeStaffDto {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employee_number?: string;
  job_title: string;
  department?: string;
  employment_type: EmploymentType;
  start_date: string; // ISO date
  end_date?: string; // ISO date
  salary_annual?: number;
  hourly_rate?: number;
  manager_id?: number;
  is_active?: boolean;
}

export interface UpdateOfficeStaffDto {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  employee_number?: string;
  job_title?: string;
  department?: string;
  employment_type?: EmploymentType;
  start_date?: string; // ISO date
  end_date?: string; // ISO date
  salary_annual?: number;
  hourly_rate?: number;
  manager_id?: number;
  is_active?: boolean;
}

export interface OfficeStaffWithManager extends OfficeStaff {
  manager_name?: string;
}

export interface OfficeStaffSummary {
  total_staff: number;
  active_staff: number;
  by_department: Array<{
    department: string;
    count: number;
  }>;
  by_employment_type: Array<{
    employment_type: EmploymentType;
    count: number;
  }>;
}
