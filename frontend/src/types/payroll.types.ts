/**
 * Payroll System Types - Frontend
 *
 * Handles employee wages, HMRC submissions, and payroll periods
 */

export type EmploymentType = 'contracted_monthly' | 'contracted_weekly' | 'contracted_hourly' | 'freelance';
export type PayrollPeriodStatus = 'draft' | 'processing' | 'submitted' | 'completed';
export type PayrollPeriodType = 'weekly' | 'monthly';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type MovementType = 'joiner' | 'leaver';

// ============================================================================
// Payroll Period
// ============================================================================

export interface PayrollPeriod {
  period_id: number;
  tenant_id: number;
  period_start: string;
  period_end: string;
  period_type: PayrollPeriodType;
  status: PayrollPeriodStatus;
  total_gross: number;
  total_tax: number;
  total_ni: number;
  total_pension: number;
  total_deductions: number;
  total_net: number;
  hmrc_payment_due: number;
  submitted_date?: string;
  submitted_by?: number;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Joined data
  submitted_by_name?: string;
  record_count?: number;
  freelance_count?: number;
  joiner_count?: number;
  leaver_count?: number;
}

export interface CreatePayrollPeriodDto {
  period_start: string;
  period_end: string;
  period_type: PayrollPeriodType;
  notes?: string;
}

export interface UpdatePayrollPeriodDto {
  status?: PayrollPeriodStatus;
  notes?: string;
}

// ============================================================================
// Payroll Record (Individual Driver)
// ============================================================================

export interface PayrollRecord {
  record_id: number;
  tenant_id: number;
  period_id: number;
  driver_id: number;
  employment_type: EmploymentType;

  // Pay calculation
  hours_worked?: number;
  hourly_rate?: number;
  weekly_wage?: number;
  monthly_salary?: number;
  gross_pay: number;

  // Deductions
  tax_deducted: number;
  ni_deducted: number;
  pension_deducted: number;
  other_deductions: number;
  deduction_notes?: string;

  // Net pay
  net_pay: number;

  // Status
  is_new_joiner: boolean;
  is_leaver: boolean;
  leaving_date?: string;

  // Payment
  payment_status: PaymentStatus;
  payment_date?: string;
  payment_reference?: string;

  notes?: string;
  created_at: string;
  updated_at: string;

  // Joined data
  driver_name?: string;
  driver_phone?: string;
  driver_email?: string;
  tax_code?: string;
  ni_number?: string;
  bank_account_name?: string;
  bank_sort_code?: string;
  bank_account_number?: string;
}

export interface CreatePayrollRecordDto {
  driver_id: number;
  employment_type: EmploymentType;
  hours_worked?: number;
  hourly_rate?: number;
  weekly_wage?: number;
  monthly_salary?: number;
  gross_pay: number;
  tax_deducted?: number;
  ni_deducted?: number;
  pension_deducted?: number;
  other_deductions?: number;
  deduction_notes?: string;
  net_pay: number;
  is_new_joiner?: boolean;
  is_leaver?: boolean;
  leaving_date?: string;
  notes?: string;
}

export interface UpdatePayrollRecordDto {
  hours_worked?: number;
  gross_pay?: number;
  tax_deducted?: number;
  ni_deducted?: number;
  pension_deducted?: number;
  other_deductions?: number;
  deduction_notes?: string;
  net_pay?: number;
  payment_status?: PaymentStatus;
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
}

// ============================================================================
// Freelance Submission
// ============================================================================

export interface FreelanceSubmission {
  submission_id: number;
  tenant_id: number;
  period_id: number;
  driver_id: number;
  invoice_number?: string;
  invoice_date: string;
  invoice_amount: number;
  tax_paid: number;
  ni_paid: number;
  payment_status: PaymentStatus;
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Joined data
  driver_name?: string;
  driver_phone?: string;
  driver_email?: string;
}

export interface CreateFreelanceSubmissionDto {
  driver_id: number;
  invoice_number?: string;
  invoice_date: string;
  invoice_amount: number;
  tax_paid?: number;
  ni_paid?: number;
  notes?: string;
}

export interface UpdateFreelanceSubmissionDto {
  invoice_number?: string;
  invoice_date?: string;
  invoice_amount?: number;
  tax_paid?: number;
  ni_paid?: number;
  payment_status?: PaymentStatus;
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
}

// ============================================================================
// Payroll Movement (Joiners/Leavers)
// ============================================================================

export interface PayrollMovement {
  movement_id: number;
  tenant_id: number;
  period_id: number;
  driver_id: number;
  movement_type: MovementType;
  movement_date: string;
  reason?: string;
  created_at: string;

  // Joined data
  driver_name?: string;
  driver_phone?: string;
  employment_type?: EmploymentType;
}

// ============================================================================
// Payroll Summary/Stats
// ============================================================================

export interface PayrollSummary {
  period: PayrollPeriod;
  contracted_count: number;
  freelance_count: number;
  total_employees: number;
  joiners: PayrollMovement[];
  leavers: PayrollMovement[];
  total_gross: number;
  total_net: number;
  total_tax: number;
  total_ni: number;
  total_pension: number;
  hmrc_payment_due: number;
}

export interface PayrollStats {
  total_periods: number;
  active_employees: number;
  freelance_count: number;
  this_month_gross: number;
  this_month_net: number;
  this_month_hmrc: number;
  ytd_gross: number;
  ytd_net: number;
  ytd_hmrc: number;
}

export interface PayrollPeriodsResponse {
  periods: PayrollPeriod[];
  total: number;
  page: number;
  limit: number;
}

export interface PayrollRecordsResponse {
  records: PayrollRecord[];
}

export interface FreelanceSubmissionsResponse {
  submissions: FreelanceSubmission[];
}
