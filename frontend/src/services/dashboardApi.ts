import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * Dashboard API Service
 *
 * Provides methods for fetching comprehensive dashboard data including:
 * - Actionable tasks and alerts
 * - Business statistics and metrics
 * - Summary counts
 */

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000, // 30 seconds for comprehensive dashboard query
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TaskItem {
  count: number;
  items: any[];
}

export interface DashboardTasks {
  unassignedJourneys: TaskItem;
  expiringMots: TaskItem;
  expiredMots: TaskItem;
  pendingTimesheets: TaskItem;
  pendingLeaveRequests: TaskItem;
  customerHolidays: TaskItem;
  expiringTraining: TaskItem;
  expiringPermits: TaskItem;
  safeguardingReports: TaskItem;
  overdueInvoices: TaskItem;
  outingSuggestions: TaskItem;
  driverMessages: TaskItem;
  customerMessages: TaskItem;
  expiringDocuments: TaskItem;
}

export interface DashboardStats {
  journeysThisWeek: number;
  revenueThisWeek: number;
  activeDrivers: number;
  activeCustomers: number;
  journeysToday: number;
  pendingApprovals: number;
  pendingPayments: number;
  weekStart: string;
  weekEnd: string;
  // Financial Summary
  outstandingInvoicesCount: number;
  outstandingInvoicesTotal: number;
  revenueMTD: number;
  payrollCosts: number;
  monthStart: string;
  monthEnd: string;
  // Driver Compliance
  totalDrivers: number;
  compliantDrivers: number;
  nonCompliantDrivers: number;
  compliancePercentage: number;
  // Fleet Utilization
  totalVehicles: number;
  assignedVehicles: number;
  availableVehicles: number;
  maintenanceVehicles: number;
  utilizationPercentage: number;
  maintenanceOverdue: number;
  maintenanceDueThisWeek: number;
  motExpiringSoon: number;
}

export interface DashboardSummary {
  totalTasks: number;
  criticalTasks: number;
  timestamp: string;
  totalAlerts?: number;
  invoiceAlerts?: number;
  driverAlerts?: number;
  messageReadNotifications?: number;
  criticalAlerts?: number;
  pendingPayments?: number;
}

export interface TodayJourney {
  customer_id: number;
  customer_name: string;
  phone: string;
  today_schedule: any;
  mobility_requirements?: string;
  special_requirements?: string;
}

export interface TodayDriver {
  driver_id: number;
  name: string;
  phone: string;
  vehicle_id?: number;
  registration?: string;
  make?: string;
  model?: string;
  assigned_journeys: number;
  on_leave?: string;
}

export interface CustomerAlert {
  alert_type: 'holiday' | 'special_requirement';
  customer_id: number;
  name: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface VehicleStatus {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  mot_date?: string;
  driver_id?: number;
  driver_name?: string;
  status: 'active' | 'expired_mot' | 'mot_expiring_soon' | 'unassigned';
}

export interface TodayData {
  journeys: {
    count: number;
    items: TodayJourney[];
  };
  drivers: {
    count: number;
    onLeave: number;
    items: TodayDriver[];
  };
  customerAlerts: {
    count: number;
    items: CustomerAlert[];
  };
  vehicles: {
    active: number;
    issues: number;
    items: VehicleStatus[];
  };
}

export interface FleetMaintenance {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  last_service_date?: string;
  next_service_date?: string;
  mot_expiry?: string;
  service_status: 'overdue' | 'due_this_week' | 'due_this_month' | 'scheduled';
  days_overdue?: number;
}

export interface FleetMOT {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  mot_expiry: string;
  days_until_expiry: number;
  mot_status: 'expired' | 'critical' | 'warning' | 'valid';
}

export interface RecentMaintenance {
  maintenance_id: number;
  vehicle_id: number;
  maintenance_type: string;
  maintenance_date: string;
  description?: string;
  cost?: number;
  completed: boolean;
  registration: string;
  make: string;
  model: string;
}

export interface FleetData {
  maintenanceDue: {
    count: number;
    items: FleetMaintenance[];
  };
  motExpiring: {
    count: number;
    items: FleetMOT[];
  };
  recentMaintenance: {
    count: number;
    items: RecentMaintenance[];
  };
}

export interface DashboardOverview {
  tasks: DashboardTasks;
  stats: DashboardStats;
  summary: DashboardSummary;
  today: TodayData;
  fleet: FleetData;
}

// ============================================================================
// API METHODS
// ============================================================================

export const dashboardApi = {
  /**
   * Get comprehensive dashboard overview
   * Includes all tasks, stats, and summary counts
   */
  getOverview: async (tenantId: number): Promise<DashboardOverview> => {
    const response = await apiClient.get<DashboardOverview>(
      `/tenants/${tenantId}/dashboard/overview`
    );
    return response.data;
  },

  /**
   * Get all notifications (existing endpoint for notification bell)
   */
  getAllNotifications: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/dashboard/all-notifications`
    );
    return response.data;
  },
};

export default dashboardApi;
