// Holiday Management Types

export interface HolidayRequest {
  request_id: number;
  tenant_id: number;
  driver_id?: number;
  customer_id?: number;
  start_date: string;
  end_date: string;
  days: number;
  type: 'annual' | 'sick' | 'unpaid' | 'other';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_date: string;
  requested_by?: number;
  approved_date?: string;
  approved_by?: number;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  driver_name?: string;
  customer_name?: string;
}

export interface HolidayBalance {
  driver_id: number;
  name: string;
  allowance: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  carried_over: number;
  last_updated: string;
  manual_adjustment?: number;
}

export interface HolidaySettings {
  annual_allowance: number;
  carry_over_enabled: boolean;
  carry_over_limit: number;
  auto_approve_customer_requests: boolean;
}

// Updated to match the new nested backend structure
export interface HolidayOverview {
  requests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    currentHolidays: number;
    upcomingHolidays: number;
    recentRequests: number;
  };
  drivers: {
    totalDrivers: number;
    driversWithRequests: number;
    driversWithApprovedHolidays: number;
    participationRate: number;
  };
  customers: {
    customersAffected: number;
    currentAffectedCustomers: number;
  };
  balances: {
    totalAnnualDaysUsed: number;
    driversUsingAnnualLeave: number;
    averageDaysUsedPerDriver: number;
  };
  alerts: {
    pendingApprovals: number;
    upcomingDecisionsNeeded: number;
    currentHolidays: number;
    total: number;
  };
  settings: any;
  summary: {
    totalRequests: number;
    alertsCount: number;
    approvalRate: number;
  };
}

export interface HolidayCalendarDay {
  date: string;
  requests: HolidayRequest[];
  drivers_off: number;
  customers_off: number;
}

export interface DriverAvailability {
  driver_id: number;
  name: string;
  available: boolean;
  on_holiday?: HolidayRequest;
}

export interface HolidayAlert {
  request_id: number;
  start_date: string;
  end_date: string;
  status: 'approved' | 'rejected';
  message: string;
  type: 'success' | 'warning';
  rejection_reason?: string;
}

export interface CreateHolidayRequestDto {
  driver_id?: number;
  customer_id?: number;
  start_date: string;
  end_date: string;
  type?: 'annual' | 'sick' | 'unpaid' | 'other';
  notes?: string;
  auto_approve?: boolean;
}

export interface UpdateHolidayRequestDto {
  status?: 'approved' | 'rejected' | 'cancelled';
  rejection_reason?: string;
}

export interface UpdateHolidaySettingsDto {
  annual_allowance?: number;
  carry_over_enabled?: boolean;
  carry_over_limit?: number;
  auto_approve_customer_requests?: boolean;
}

export interface HolidayAvailabilityCheck {
  available: boolean;
  conflicts: HolidayRequest[];
}
