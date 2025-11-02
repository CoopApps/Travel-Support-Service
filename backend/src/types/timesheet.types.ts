// ============================================
// Timesheet Types
// ============================================

export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface DriverTimesheet {
  id: number;
  tenant_id: number;
  driver_id: number;

  // Time Period
  week_starting: string; // ISO date
  week_ending: string; // ISO date

  // Hours Breakdown
  regular_hours: number;
  overtime_hours: number;
  total_hours: number;

  // Calculated Pay
  regular_pay?: number;
  overtime_pay?: number;
  total_pay?: number;

  // Daily Hours
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  saturday_hours: number;
  sunday_hours: number;

  // Notes
  notes?: string;
  driver_notes?: string;

  // Workflow Status
  status: TimesheetStatus;

  // Submission & Approval
  submitted_at?: string;
  approved_at?: string;
  approved_by?: number;
  rejected_at?: string;
  rejected_by?: number;
  rejection_reason?: string;

  // Payment Integration
  payroll_period_id?: number;
  paid_at?: string;

  // Audit
  created_at: string;
  updated_at: string;
}

export interface CreateTimesheetDto {
  driver_id: number;
  week_starting: string; // ISO date
  week_ending: string; // ISO date
  monday_hours?: number;
  tuesday_hours?: number;
  wednesday_hours?: number;
  thursday_hours?: number;
  friday_hours?: number;
  saturday_hours?: number;
  sunday_hours?: number;
  notes?: string;
  driver_notes?: string;
  status?: TimesheetStatus;
}

export interface UpdateTimesheetDto {
  week_starting?: string; // ISO date
  week_ending?: string; // ISO date
  monday_hours?: number;
  tuesday_hours?: number;
  wednesday_hours?: number;
  thursday_hours?: number;
  friday_hours?: number;
  saturday_hours?: number;
  sunday_hours?: number;
  notes?: string;
  driver_notes?: string;
  status?: TimesheetStatus;
}

export interface ApproveTimesheetDto {
  approved_by: number;
  notes?: string;
}

export interface RejectTimesheetDto {
  rejected_by: number;
  rejection_reason: string;
}

export interface TimesheetWithDriver extends DriverTimesheet {
  driver_name: string;
  employment_type: string;
  hourly_rate?: number;
}

export interface TimesheetSummary {
  total_timesheets: number;
  pending_approval: number;
  approved_this_week: number;
  total_hours_this_week: number;
  total_pay_pending: number;
  by_status: Array<{
    status: TimesheetStatus;
    count: number;
  }>;
}

export interface WeeklyHours {
  week_starting: string;
  week_ending: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  total: number;
}
