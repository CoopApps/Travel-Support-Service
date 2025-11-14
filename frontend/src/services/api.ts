import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import type {
  LoginCredentials,
  LoginResponse,
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerListQuery,
  CustomerListResponse
} from '../types';

/**
 * API Service Layer - Stage 3
 *
 * Centralized API client with:
 * - Automatic authentication header injection
 * - Error handling
 * - Type safety
 * - Request/response interceptors
 */

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    console.log('🔑 Request interceptor:', {
      url: config.url,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'NO TOKEN',
      headers: config.headers
    });
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header added');
    } else {
      console.warn('⚠️ No token available or no headers object');
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth state and redirect to login
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication API
 */
export const authApi = {
  login: async (tenantId: number, credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      `/tenants/${tenantId}/login`,
      credentials
    );
    return response.data;
  },

  logout: async (tenantId: number): Promise<void> => {
    await apiClient.post(`/tenants/${tenantId}/logout`);
  },

  verifyToken: async (tenantId: number): Promise<boolean> => {
    try {
      await apiClient.get(`/tenants/${tenantId}/verify`);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Customer API - Stage 4
 */
export const customerApi = {
  /**
   * Get customer statistics
   */
  getStats: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/customers/stats`);
    return response.data;
  },

  /**
   * Get all customers with pagination, search, and filtering
   */
  getCustomers: async (tenantId: number, query?: CustomerListQuery): Promise<CustomerListResponse> => {
    const response = await apiClient.get<CustomerListResponse>(
      `/tenants/${tenantId}/customers`,
      { params: query }
    );
    return response.data;
  },

  /**
   * Get a single customer by ID
   */
  getCustomer: async (tenantId: number, customerId: number): Promise<Customer> => {
    const response = await apiClient.get<Customer>(
      `/tenants/${tenantId}/customers/${customerId}`
    );
    return response.data;
  },

  /**
   * Create a new customer
   */
  createCustomer: async (tenantId: number, data: CreateCustomerDto): Promise<{ id: number; name: string; created_at: string }> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/customers`,
      data
    );
    return response.data;
  },

  /**
   * Update an existing customer
   */
  updateCustomer: async (tenantId: number, customerId: number, data: UpdateCustomerDto): Promise<{ id: number; name: string; updated_at: string }> => {
    const response = await apiClient.put(
      `/tenants/${tenantId}/customers/${customerId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a customer (soft delete)
   */
  deleteCustomer: async (tenantId: number, customerId: number): Promise<{ message: string; customerId: number; customerName: string }> => {
    const response = await apiClient.delete(
      `/tenants/${tenantId}/customers/${customerId}`
    );
    return response.data;
  },

  /**
   * Enable customer login
   */
  enableLogin: async (tenantId: number, customerId: number, data: { username: string; password: string }): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/customers/${customerId}/enable-login`,
      data
    );
    return response.data;
  },

  /**
   * Disable customer login
   */
  disableLogin: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/customers/${customerId}/disable-login`
    );
    return response.data;
  },

  /**
   * Reset customer password
   */
  resetPassword: async (tenantId: number, customerId: number, data: { newPassword: string }): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/customers/${customerId}/reset-password`,
      data
    );
    return response.data;
  },

  /**
   * Get customer login details
   */
  getLoginDetails: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/customers/${customerId}/login-details`
    );
    return response.data;
  },

  /**
   * Update customer username
   */
  updateUsername: async (tenantId: number, customerId: number, data: { username: string }): Promise<any> => {
    const response = await apiClient.put(
      `/tenants/${tenantId}/customers/${customerId}/update-username`,
      data
    );
    return response.data;
  },

  /**
   * Get customer login history
   */
  getLoginHistory: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/customers/${customerId}/login-history`
    );
    return response.data;
  },

  /**
   * Update customer schedule
   */
  updateSchedule: async (tenantId: number, customerId: number, schedule: any): Promise<any> => {
    const response = await apiClient.put(
      `/tenants/${tenantId}/customers/${customerId}/schedule`,
      { schedule }
    );
    return response.data;
  },

  /**
   * Update customer times
   */
  updateTimes: async (tenantId: number, customerId: number, schedule: any): Promise<any> => {
    const response = await apiClient.put(
      `/tenants/${tenantId}/customers/${customerId}/times`,
      { schedule }
    );
    return response.data;
  },

  /**
   * Get customer assessment
   */
  getAssessment: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/customers/${customerId}/assessment`
    );
    return response.data;
  },

  /**
   * Update customer assessment
   */
  updateAssessment: async (tenantId: number, customerId: number, assessment: any): Promise<any> => {
    const response = await apiClient.put(
      `/tenants/${tenantId}/customers/${customerId}/assessment`,
      { assessment }
    );
    return response.data;
  },
};

/**
 * Driver API
 */
export const driverApi = {
  /**
   * Get driver statistics
   */
  getStats: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/drivers/stats`);
    return response.data;
  },

  /**
   * Get enhanced driver statistics with financial breakdown
   */
  getEnhancedStats: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/drivers/enhanced-stats`);
    return response.data;
  },

  /**
   * Get all drivers with pagination, search, and filtering
   */
  getDrivers: async (tenantId: number, query?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/drivers`, { params: query });
    return response.data;
  },

  /**
   * Get a single driver by ID
   */
  getDriver: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/drivers/${driverId}`);
    return response.data;
  },

  /**
   * Create a new driver
   */
  createDriver: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/drivers`, data);
    return response.data;
  },

  /**
   * Update an existing driver
   */
  updateDriver: async (tenantId: number, driverId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/drivers/${driverId}`, data);
    return response.data;
  },

  /**
   * Delete a driver (soft delete)
   */
  deleteDriver: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/drivers/${driverId}`);
    return response.data;
  },

  /**
   * Get driver login details
   */
  getLoginDetails: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/drivers/${driverId}/login-status`);
    return response.data.loginStatus;
  },

  /**
   * Enable login for driver
   */
  enableLogin: async (tenantId: number, driverId: number, data: { username: string; password: string }): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/drivers/${driverId}/enable-login`, {
      username: data.username,
      temporaryPassword: data.password
    });
    return response.data;
  },

  /**
   * Disable login for driver
   */
  disableLogin: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/drivers/${driverId}/disable-login`);
    return response.data;
  },

  /**
   * Reset driver password
   */
  resetPassword: async (tenantId: number, driverId: number, data: { newPassword: string }): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/drivers/${driverId}/reset-password`, data);
    return response.data;
  },

  /**
   * Update driver username
   */
  updateUsername: async (tenantId: number, driverId: number, data: { username: string }): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/drivers/${driverId}/username`, { newUsername: data.username });
    return response.data;
  },

  /**
   * Get customer assignments for a driver
   */
  getCustomerAssignments: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/drivers/${driverId}/customer-assignments`);
    return response.data;
  },

  /**
   * Get login history for a driver
   */
  getLoginHistory: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/drivers/${driverId}/login-history`);
    return response.data;
  },

  /**
   * Export drivers to CSV
   */
  exportDrivers: async (tenantId: number, query?: any): Promise<string> => {
    const response = await apiClient.get(`/tenants/${tenantId}/drivers/export`, {
      params: query,
      responseType: 'text',
    });
    return response.data;
  },
};

/**
 * Trip/Schedule API
 */
export const tripApi = {
  /**
   * Get all trips with filters
   */
  getTrips: async (tenantId: number, filters?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/trips`, { params: filters });
    return response.data;
  },

  /**
   * Get trips for today
   */
  getTodayTrips: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/trips/today`);
    return response.data;
  },

  /**
   * Get driver trips for a specific week
   */
  getDriverWeekTrips: async (tenantId: number, driverId: number, weekStart: string): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/trips/driver/${driverId}/week`, {
      params: { weekStart }
    });
    return response.data;
  },

  /**
   * Create a new trip
   */
  createTrip: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/trips`, data);
    return response.data;
  },

  /**
   * Create multiple trips in a transaction (for carpooling)
   */
  bulkCreateTrips: async (tenantId: number, trips: any[]): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/trips/bulk`, { trips });
    return response.data;
  },

  /**
   * Update a trip
   */
  updateTrip: async (tenantId: number, tripId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/trips/${tripId}`, data);
    return response.data;
  },

  /**
   * Delete a trip
   */
  deleteTrip: async (tenantId: number, tripId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/trips/${tripId}`);
    return response.data;
  },

  /**
   * Get server time
   */
  getServerTime: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/trips/server-time`);
    return response.data;
  },

  /**
   * Auto-assign customers to their regular drivers
   */
  autoAssign: async (tenantId: number, startDate: string, endDate: string): Promise<{
    successful: number;
    failed: Array<{
      customerId: number;
      customerName: string;
      day: string;
      reason: string;
    }>;
  }> => {
    const response = await apiClient.post(`/tenants/${tenantId}/trips/auto-assign`, {
      startDate,
      endDate
    });
    return response.data;
  },

  /**
   * Get passenger recommendations for carpooling
   */
  getPassengerRecommendations: async (
    tenantId: number,
    params: {
      driverId?: number;
      driverLocation?: { address: string; postcode?: string };
      destination: string;
      pickupTime: string;
      tripDate: string;
      includeGoogleMaps?: boolean;
    }
  ): Promise<{
    recommendations: Array<{
      customerId: number;
      customerName: string;
      phone: string;
      address: string;
      postcode: string;
      destination: string;
      pickupTime: string;
      score: number;
      reasoning: string[];
      sharedDestination: boolean;
      detourMinutes?: number;
      requiresWheelchair: boolean;
      requiresEscort: boolean;
      isRegularDriver: boolean;
    }>;
    totalCandidates: number;
    metadata: any;
  }> => {
    const response = await apiClient.post(`/tenants/${tenantId}/trips/recommend-passengers`, params);
    return response.data;
  },

  /**
   * Get smart driver suggestions for a trip
   */
  suggestDriver: async (
    tenantId: number,
    params: {
      customerId: number;
      tripDate: string;
      pickupTime: string;
      requiresWheelchair?: boolean;
      passengersCount?: number;
    }
  ): Promise<{
    success: boolean;
    recommendations: Array<{
      driverId: number;
      driverName: string;
      phone: string;
      vehicle: {
        id: number;
        registration: string;
        make: string;
        model: string;
        seats: number;
        wheelchairAccessible: boolean;
      } | null;
      score: number;
      reasons: string[];
      recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended' | 'unavailable';
      isRegularDriver: boolean;
      dailyWorkload: number;
      completionRate: number;
    }>;
    totalDriversAnalyzed: number;
    availableDrivers: number;
  }> => {
    const response = await apiClient.post(`/tenants/${tenantId}/suggest-driver`, params);
    return response.data;
  },

  /**
   * Get efficiency report for schedule optimization
   */
  getEfficiencyReport: async (
    tenantId: number,
    params: {
      startDate: string;
      endDate: string;
    }
  ): Promise<{
    success: boolean;
    dateRange: { startDate: string; endDate: string };
    summary: {
      totalTrips: number;
      operatingDays: number;
      activeDrivers: number;
      activeVehicles: number;
      customersServed: number;
      totalRevenue: number;
      avgRevenuePerTrip: number;
      completionRate: number;
      noShowRate: number;
      avgVehicleUtilization: number;
      totalEmptySeats: number;
      totalMissedRevenue: number;
    };
    vehicleUtilization: Array<{
      vehicleId: number;
      registration: string;
      make: string;
      model: string;
      capacity: number;
      totalTrips: number;
      daysUsed: number;
      avgPassengers: number;
      utilizationPercentage: number;
      totalRevenue: number;
    }>;
    driverProductivity: Array<{
      driverId: number;
      driverName: string;
      totalTrips: number;
      daysWorked: number;
      avgTripsPerDay: number;
      totalRevenue: number;
      revenuePerTrip: number;
      completedTrips: number;
      noShowTrips: number;
      cancelledTrips: number;
      completionRate: number;
    }>;
    emptySeatAnalysis: Array<{
      date: string;
      uniqueTrips: number;
      totalEmptySeats: number;
      avgTripPrice: number;
      missedRevenue: number;
    }>;
    routeEfficiency: Array<{
      destination: string;
      tripCount: number;
      driversUsed: number;
      vehiclesUsed: number;
      avgPassengersPerTrip: number;
      totalRevenue: number;
      revenuePerTrip: number;
    }>;
    timeAnalysis: Array<{
      hour: number;
      tripCount: number;
      activeDrivers: number;
      activeVehicles: number;
      totalRevenue: number;
      avgPrice: number;
    }>;
  }> => {
    const response = await apiClient.get(`/tenants/${tenantId}/efficiency-report`, { params });
    return response.data;
  },

  /**
   * Get capacity alerts for underutilized vehicles
   */
  getCapacityAlerts: async (
    tenantId: number,
    params: {
      date: string;
      driverId?: number;
    }
  ): Promise<{
    success: boolean;
    date: string;
    summary: {
      total_alerts: number;
      total_empty_seats: number;
      total_potential_revenue: number;
      average_utilization: number;
    };
    alerts: Array<{
      trip_group_key: string;
      driver_id: number;
      driver_name: string;
      vehicle: {
        id: number;
        registration: string;
        make: string;
        model: string;
        capacity: number;
        wheelchair_accessible: boolean;
      };
      trip_details: {
        pickup_time: string;
        destination: string;
        destination_address: string;
        trip_ids: number[];
      };
      capacity: {
        total_seats: number;
        occupied_seats: number;
        empty_seats: number;
        utilization_percentage: number;
      };
      revenue: {
        average_trip_price: number;
        potential_additional_revenue: number;
      };
      current_passengers: Array<{
        customer_id: number;
        customer_name: string;
        price: number;
      }>;
      recommended_passengers: Array<{
        customer_id: number;
        customer_name: string;
        address: string;
        postcode: string;
        phone: string;
        destination: string;
        pickup_time: string;
        time_diff_minutes: number;
        mobility_requirements: string;
      }>;
      severity: 'high' | 'medium' | 'low';
    }>;
  }> => {
    const response = await apiClient.get(`/tenants/${tenantId}/capacity-alerts`, { params });
    return response.data;
  },

  /**
   * Check for conflicts before creating/updating a trip
   */
  checkConflicts: async (
    tenantId: number,
    params: {
      driverId?: number;
      vehicleId?: number;
      customerId: number;
      tripDate: string;
      pickupTime: string;
      returnTime?: string;
      requiresWheelchair?: boolean;
    }
  ): Promise<{
    success: boolean;
    hasConflicts: boolean;
    hasCriticalConflicts: boolean;
    canProceed: boolean;
    message: string;
    criticalConflicts: Array<{
      type: 'critical';
      category: 'vehicle' | 'driver' | 'customer' | 'scheduling';
      message: string;
      details?: any;
    }>;
    warnings: Array<{
      type: 'warning';
      category: 'vehicle' | 'driver' | 'customer' | 'scheduling';
      message: string;
      details?: any;
    }>;
  }> => {
    const response = await apiClient.post(`/tenants/${tenantId}/check-conflicts`, params);
    return response.data;
  },
};

/**
 * Vehicle API
 */
export const vehicleApi = {
  /**
   * Get all vehicles for tenant
   */
  getVehicles: async (tenantId: number, query?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles`, {
      params: query
    });
    return response.data;
  },

  /**
   * Get specific vehicle
   */
  getVehicle: async (tenantId: number, vehicleId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/${vehicleId}`);
    return response.data;
  },

  /**
   * Create new vehicle
   */
  createVehicle: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/vehicles`, data);
    return response.data;
  },

  /**
   * Update vehicle
   */
  updateVehicle: async (tenantId: number, vehicleId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/vehicles/${vehicleId}`, data);
    return response.data;
  },

  /**
   * Delete vehicle
   */
  deleteVehicle: async (tenantId: number, vehicleId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/vehicles/${vehicleId}`);
    return response.data;
  },

  /**
   * Assign driver to vehicle
   */
  assignDriver: async (tenantId: number, vehicleId: number, data: { driver_id: number | null }): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/vehicles/${vehicleId}/assign`, data);
    return response.data;
  },

  /**
   * Sync vehicles with drivers
   */
  syncDrivers: async (tenantId: number): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/vehicles/sync-drivers`);
    return response.data;
  },

  /**
   * Get maintenance alerts
   */
  getMaintenanceAlerts: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/maintenance-alerts`);
    return response.data;
  },

  /**
   * Get all incidents for tenant
   */
  getIncidents: async (tenantId: number, params?: { vehicle_id?: number; status?: string; incident_type?: string; severity?: string; page?: number; limit?: number; }): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/incidents`, { params });
    return response.data;
  },

  /**
   * Get incidents for specific vehicle
   */
  getVehicleIncidents: async (tenantId: number, vehicleId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/${vehicleId}/incidents`);
    return response.data;
  },

  /**
   * Get specific incident
   */
  getIncident: async (tenantId: number, incidentId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/incidents/${incidentId}`);
    return response.data;
  },

  /**
   * Create new incident
   */
  createIncident: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/vehicles/incidents`, data);
    return response.data;
  },

  /**
   * Update incident
   */
  updateIncident: async (tenantId: number, incidentId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/vehicles/incidents/${incidentId}`, data);
    return response.data;
  },

  /**
   * Delete incident
   */
  deleteIncident: async (tenantId: number, incidentId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/vehicles/incidents/${incidentId}`);
    return response.data;
  },

  /**
   * Get incident statistics
   */
  getIncidentStats: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/incidents/stats`);
    return response.data;
  },

  /**
   * Get enhanced fleet statistics
   */
  getEnhancedStats: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/enhanced-stats`);
    return response.data;
  },

  /**
   * Get vehicle utilization metrics
   */
  getVehicleUtilization: async (tenantId: number, vehicleId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/${vehicleId}/utilization`);
    return response.data;
  },

  /**
   * Get fleet-wide utilization report
   */
  getFleetUtilization: async (tenantId: number, query?: { sortBy?: string; sortOrder?: string; minTrips?: number }): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/fleet-utilization`, {
      params: query
    });
    return response.data;
  },

  /**
   * Get vehicle trip history
   */
  getVehicleTripHistory: async (tenantId: number, vehicleId: number, query?: { limit?: number; status?: string; startDate?: string; endDate?: string }): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/${vehicleId}/trip-history`, {
      params: query
    });
    return response.data;
  },

  /**
   * Get vehicle financial summary
   */
  getVehicleFinancialSummary: async (tenantId: number, vehicleId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/${vehicleId}/financial-summary`);
    return response.data;
  },

  /**
   * Get idle vehicles report
   */
  getIdleReport: async (tenantId: number, days?: number): Promise<any> => {
    const params = days ? { days } : {};
    const response = await apiClient.get(`/tenants/${tenantId}/vehicles/idle-report`, { params });
    return response.data;
  },

  /**
   * Archive vehicle
   */
  archiveVehicle: async (tenantId: number, vehicleId: number, reason?: string): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/vehicles/${vehicleId}/archive`, { reason });
    return response.data;
  },

  /**
   * Unarchive vehicle
   */
  unarchiveVehicle: async (tenantId: number, vehicleId: number): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/vehicles/${vehicleId}/unarchive`);
    return response.data;
  },
};

/**
 * Maintenance API
 */
export const maintenanceApi = {
  /**
   * Get maintenance overview
   */
  getOverview: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/maintenance/overview`);
    return response.data;
  },

  /**
   * Get maintenance alerts
   */
  getAlerts: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/maintenance/alerts`);
    return response.data;
  },

  /**
   * Get maintenance history
   */
  getHistory: async (tenantId: number, query?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/maintenance/history`, {
      params: query
    });
    return response.data;
  },

  /**
   * Get maintenance for specific vehicle
   */
  getVehicleMaintenance: async (tenantId: number, vehicleId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/maintenance/vehicle/${vehicleId}`);
    return response.data;
  },

  /**
   * Create maintenance record
   */
  createRecord: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/maintenance/record`, data);
    return response.data;
  },

  /**
   * Update maintenance record
   */
  updateRecord: async (tenantId: number, maintenanceId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/maintenance/record/${maintenanceId}`, data);
    return response.data;
  },

  /**
   * Delete maintenance record
   */
  deleteRecord: async (tenantId: number, maintenanceId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/maintenance/record/${maintenanceId}`);
    return response.data;
  },

  /**
   * Get cost analysis
   */
  getCosts: async (tenantId: number, query?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/maintenance/costs`, {
      params: query
    });
    return response.data;
  },

  /**
   * Get service providers
   */
  getProviders: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/maintenance/providers`);
    return response.data;
  },
};

// ============================================================================
// INVOICE API
// ============================================================================

export const invoiceApi = {
  /**
   * Get invoice statistics
   */
  getStats: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/invoices/stats`);
    return response.data;
  },

  /**
   * Get all invoices with optional filters
   */
  getInvoices: async (tenantId: number, filters?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/invoices`, {
      params: filters
    });
    return response.data;
  },

  /**
   * Get specific invoice details
   */
  getInvoice: async (tenantId: number, invoiceId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/invoices/${invoiceId}`);
    return response.data;
  },

  /**
   * Update invoice status
   */
  updateStatus: async (tenantId: number, invoiceId: number, status: string): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/invoices/${invoiceId}/status`, { status });
    return response.data;
  },

  /**
   * Record a payment for an invoice
   */
  recordPayment: async (tenantId: number, invoiceId: number, paymentData: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/payment`, paymentData);
    return response.data;
  },

  /**
   * Delete an invoice (draft only)
   */
  deleteInvoice: async (tenantId: number, invoiceId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/invoices/${invoiceId}`);
    return response.data;
  },

  /**
   * Archive an invoice
   */
  archiveInvoice: async (tenantId: number, invoiceId: number): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/invoices/${invoiceId}/archive`);
    return response.data;
  },

  /**
   * Unarchive an invoice
   */
  unarchiveInvoice: async (tenantId: number, invoiceId: number): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/invoices/${invoiceId}/unarchive`);
    return response.data;
  },

  /**
   * Get payment providers
   */
  getPaymentProviders: async (tenantId: number): Promise<string[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/invoices/payment-providers`);
    return response.data;
  },

  // ============================================================================
  // SPLIT PAYMENT API METHODS
  // ============================================================================

  /**
   * Get all split payments for an invoice
   */
  getSplitPayments: async (tenantId: number, invoiceId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/invoices/${invoiceId}/split-payments`);
    return response.data;
  },

  /**
   * Get split payment summary for an invoice
   */
  getSplitPaymentSummary: async (tenantId: number, invoiceId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/invoices/${invoiceId}/split-payments/summary`);
    return response.data;
  },

  /**
   * Create a single split payment
   */
  createSplitPayment: async (tenantId: number, invoiceId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/split-payments`, data);
    return response.data;
  },

  /**
   * Create bulk split payments
   */
  createBulkSplitPayments: async (tenantId: number, invoiceId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/split-payments/bulk`, data);
    return response.data;
  },

  /**
   * Update a split payment
   */
  updateSplitPayment: async (tenantId: number, invoiceId: number, splitPaymentId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/invoices/${invoiceId}/split-payments/${splitPaymentId}`, data);
    return response.data;
  },

  /**
   * Delete a split payment
   */
  deleteSplitPayment: async (tenantId: number, invoiceId: number, splitPaymentId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/invoices/${invoiceId}/split-payments/${splitPaymentId}`);
    return response.data;
  },

  /**
   * Record a payment against a split
   */
  recordSplitPayment: async (tenantId: number, invoiceId: number, splitPaymentId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/split-payments/${splitPaymentId}/payments`, data);
    return response.data;
  },

  /**
   * Validate split payments
   */
  validateSplitPayments: async (tenantId: number, invoiceId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/split-payments/validate`, data);
    return response.data;
  },

  // ============================================================================
  // BULK INVOICE GENERATION
  // ============================================================================

  /**
   * Preview bulk invoice generation
   */
  bulkPreview: async (tenantId: number, data: {
    start_date: string;
    end_date: string;
    default_rate?: number;
  }): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/invoices/bulk-preview`, data);
    return response.data;
  },

  /**
   * Generate invoices in bulk
   */
  bulkGenerate: async (tenantId: number, data: {
    start_date: string;
    end_date: string;
    default_rate?: number;
    due_days?: number;
    description?: string;
  }): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/invoices/bulk-generate`, data);
    return response.data;
  },

  /**
   * Download invoice PDF
   */
  downloadPDF: async (tenantId: number, invoiceId: number): Promise<Blob> => {
    const response = await apiClient.get(`/tenants/${tenantId}/invoices/${invoiceId}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Send invoice via email
   */
  sendInvoice: async (tenantId: number, invoiceId: number, data: {
    to_email: string;
    cc_email?: string;
  }): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/send`, data);
    return response.data;
  },

  /**
   * Update invoice details
   */
  updateInvoice: async (tenantId: number, invoiceId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/invoices/${invoiceId}`, data);
    return response.data;
  },

  /**
   * Add line item to invoice
   */
  addLineItem: async (tenantId: number, invoiceId: number, data: {
    description: string;
    quantity: number;
    unit_price: number;
    metadata?: any;
  }): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/line-items`, data);
    return response.data;
  },

  /**
   * Update line item
   */
  updateLineItem: async (tenantId: number, invoiceId: number, lineItemId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/invoices/${invoiceId}/line-items/${lineItemId}`, data);
    return response.data;
  },

  /**
   * Delete line item
   */
  deleteLineItem: async (tenantId: number, invoiceId: number, lineItemId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/invoices/${invoiceId}/line-items/${lineItemId}`);
    return response.data;
  },
};

/**
 * Permits API
 */
export const permitsApi = {
  /**
   * Get permits overview
   */
  getOverview: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/permits`);
    return response.data;
  },

  /**
   * Get driver permits and roles
   */
  getDriverPermits: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/permits/drivers`);
    return response.data;
  },

  /**
   * Update driver permits
   */
  updateDriverPermits: async (tenantId: number, driverId: number, permits: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/permits/drivers/${driverId}`, permits);
    return response.data;
  },

  /**
   * Update driver roles
   */
  updateDriverRoles: async (tenantId: number, driverId: number, roles: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/permits/drivers/${driverId}/roles`, { roles });
    return response.data;
  },

  /**
   * Get organizational permits
   */
  getOrganizationalPermits: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/permits/organizational`);
    return response.data;
  },

  /**
   * Create organizational permit
   */
  createOrganizationalPermit: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/permits/organizational`, data);
    return response.data;
  },

  /**
   * Update organizational permit
   */
  updateOrganizationalPermit: async (tenantId: number, permitId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/permits/organizational/${permitId}`, data);
    return response.data;
  },

  /**
   * Delete organizational permit
   */
  deleteOrganizationalPermit: async (tenantId: number, permitId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/permits/organizational/${permitId}`);
    return response.data;
  },

  /**
   * Get permits statistics
   */
  getStats: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/permits/stats`);
    return response.data;
  },

  /**
   * Clean up permits for deleted driver
   */
  cleanupDriverPermits: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/permits/drivers/${driverId}/cleanup`);
    return response.data;
  },
};

// ============================================================================
// TRAINING API
// ============================================================================

export const trainingApi = {
  /**
   * Get training overview with stats
   */
  getOverview: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/training`);
    return response.data;
  },

  /**
   * Get all training types
   */
  getTrainingTypes: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/training-types`);
    return response.data;
  },

  /**
   * Create training type
   */
  createTrainingType: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/training-types`, data);
    return response.data;
  },

  /**
   * Update training type
   */
  updateTrainingType: async (tenantId: number, typeId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/training-types/${typeId}`, data);
    return response.data;
  },

  /**
   * Delete training type
   */
  deleteTrainingType: async (tenantId: number, typeId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/training-types/${typeId}`);
    return response.data;
  },

  /**
   * Get all training records with optional filters
   */
  getTrainingRecords: async (tenantId: number, filters?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/training-records`, {
      params: filters
    });
    return response.data;
  },

  /**
   * Get training records for specific driver
   */
  getDriverTrainingRecords: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/drivers/${driverId}/training-records`);
    return response.data;
  },

  /**
   * Create training record
   */
  createTrainingRecord: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/training-records`, data);
    return response.data;
  },

  /**
   * Update training record
   */
  updateTrainingRecord: async (tenantId: number, recordId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/training-records/${recordId}`, data);
    return response.data;
  },

  /**
   * Delete training record
   */
  deleteTrainingRecord: async (tenantId: number, recordId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/training-records/${recordId}`);
    return response.data;
  },

  /**
   * Get driver compliance data
   */
  getCompliance: async (tenantId: number, filters?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/training-compliance`, {
      params: filters
    });
    return response.data;
  },

  /**
   * Get training alerts (expiring/expired)
   */
  getAlerts: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/training-alerts`);
    return response.data;
  },

  /**
   * Get training report
   */
  getReport: async (tenantId: number, filters?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/training-report`, {
      params: filters
    });
    return response.data;
  },
};

// ============================================================================
// SAFEGUARDING API
// ============================================================================

export const safeguardingApi = {
  /**
   * Submit safeguarding report (admin or driver)
   */
  submitReport: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/safeguarding-reports`, data);
    return response.data;
  },

  /**
   * Get all safeguarding reports (admin only)
   */
  getReports: async (tenantId: number, query?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/safeguarding-reports`, {
      params: query
    });
    return response.data;
  },

  /**
   * Get specific safeguarding report
   */
  getReport: async (tenantId: number, reportId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/safeguarding-reports/${reportId}`);
    return response.data;
  },

  /**
   * Update safeguarding report status/notes (admin only)
   */
  updateReport: async (tenantId: number, reportId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/safeguarding-reports/${reportId}`, data);
    return response.data;
  },
};

// ============================================================================
// PAYROLL API
// ============================================================================

export const payrollApi = {
  // Payroll Periods
  getPeriods: async (tenantId: number, params?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/payroll/periods`, { params });
    return response.data;
  },

  createPeriod: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/payroll/periods`, data);
    return response.data;
  },

  getPeriod: async (tenantId: number, periodId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/payroll/periods/${periodId}`);
    return response.data;
  },

  updatePeriod: async (tenantId: number, periodId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/payroll/periods/${periodId}`, data);
    return response.data;
  },

  deletePeriod: async (tenantId: number, periodId: number): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/payroll/periods/${periodId}`);
  },

  // Payroll Records
  getRecords: async (tenantId: number, periodId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/payroll/periods/${periodId}/records`);
    return response.data;
  },

  createRecord: async (tenantId: number, periodId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/payroll/periods/${periodId}/records`, data);
    return response.data;
  },

  updateRecord: async (tenantId: number, recordId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/payroll/records/${recordId}`, data);
    return response.data;
  },

  deleteRecord: async (tenantId: number, recordId: number): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/payroll/records/${recordId}`);
  },

  // Freelance Submissions
  getFreelanceSubmissions: async (tenantId: number, periodId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/payroll/periods/${periodId}/freelance`);
    return response.data;
  },

  createFreelanceSubmission: async (tenantId: number, periodId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/payroll/periods/${periodId}/freelance`, data);
    return response.data;
  },

  updateFreelanceSubmission: async (tenantId: number, submissionId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/payroll/freelance/${submissionId}`, data);
    return response.data;
  },

  deleteFreelanceSubmission: async (tenantId: number, submissionId: number): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/payroll/freelance/${submissionId}`);
  },

  // Summary & Stats
  getPeriodSummary: async (tenantId: number, periodId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/payroll/periods/${periodId}/summary`);
    return response.data;
  },

  getStats: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/payroll/stats`);
    return response.data;
  },

  // Auto-generation
  generateRecords: async (tenantId: number, periodId: number): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/payroll/periods/${periodId}/generate`);
    return response.data;
  },
};

// ============================================================================
// OFFICE STAFF API
// ============================================================================

export const officeStaffApi = {
  /**
   * Get all office staff
   */
  getStaff: async (tenantId: number, params?: any): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/office-staff`, { params });
    return response.data;
  },

  /**
   * Get office staff summary
   */
  getSummary: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/office-staff/summary`);
    return response.data;
  },

  /**
   * Get specific office staff member
   */
  getStaffMember: async (tenantId: number, staffId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/office-staff/${staffId}`);
    return response.data;
  },

  /**
   * Create office staff member
   */
  createStaff: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/office-staff`, data);
    return response.data;
  },

  /**
   * Update office staff member
   */
  updateStaff: async (tenantId: number, staffId: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/office-staff/${staffId}`, data);
    return response.data;
  },

  /**
   * Delete office staff member
   */
  deleteStaff: async (tenantId: number, staffId: number): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/office-staff/${staffId}`);
  },
};

// ============================================================================
// COST CENTER API
// ============================================================================

export const costCenterApi = {
  /**
   * Get cost center utilization
   */
  getUtilization: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/cost-centers/utilization`);
    return response.data;
  },

  /**
   * Get cost center summary
   */
  getSummary: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/cost-centers/summary`);
    return response.data;
  },

  /**
   * Create a new cost center
   */
  create: async (tenantId: number, data: any): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/cost-centers`, data);
    return response.data;
  },
};

// ============================================================================
// TIMESHEET API
// ============================================================================

export const timesheetApi = {
  /**
   * Get pending timesheets
   */
  getPending: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/timesheets/pending`);
    return response.data;
  },

  /**
   * Get timesheet summary
   */
  getSummary: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/timesheets/summary`);
    return response.data;
  },

  /**
   * Approve timesheet
   */
  approve: async (tenantId: number, timesheetId: number, data: { approved_by: number; notes?: string }): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/timesheets/${timesheetId}/approve`, data);
    return response.data;
  },

  /**
   * Reject timesheet
   */
  reject: async (tenantId: number, timesheetId: number, data: { rejected_by: number; rejection_reason: string }): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/timesheets/${timesheetId}/reject`, data);
    return response.data;
  },
};

// ============================================================================
// TENANT SETTINGS API
// ============================================================================

export const tenantSettingsApi = {
  /**
   * Get all tenant settings
   */
  getSettings: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/settings`);
    return response.data;
  },

  /**
   * Get route optimization settings
   */
  getRouteOptimizationSettings: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/settings/route-optimization`);
    return response.data;
  },

  /**
   * Update route optimization settings
   */
  updateRouteOptimizationSettings: async (tenantId: number, settings: {
    enabled?: boolean;
    useGoogleMaps?: boolean;
    maxDetourMinutes?: number;
    maxDetourMiles?: number;
  }): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/settings/route-optimization`, settings);
    return response.data;
  },

  /**
   * Partially update route optimization settings
   */
  patchRouteOptimizationSettings: async (tenantId: number, settings: Partial<{
    enabled: boolean;
    useGoogleMaps: boolean;
    maxDetourMinutes: number;
    maxDetourMiles: number;
  }>): Promise<any> => {
    const response = await apiClient.patch(`/tenants/${tenantId}/settings/route-optimization`, settings);
    return response.data;
  },
};

// ============================================================================
// CUSTOMER FEEDBACK API
// ============================================================================

export const feedbackApi = {
  /**
   * Get all feedback with filtering and pagination
   */
  getFeedback: async (tenantId: number, params?: {
    page?: number;
    limit?: number;
    status?: string;
    feedbackType?: string;
    severity?: string;
    customerId?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/feedback`, { params });
    return response.data;
  },

  /**
   * Get feedback statistics
   */
  getStats: async (tenantId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/feedback/stats`);
    return response.data;
  },

  /**
   * Get single feedback record
   */
  getFeedbackById: async (tenantId: number, feedbackId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/feedback/${feedbackId}`);
    return response.data;
  },

  /**
   * Create new feedback
   */
  createFeedback: async (tenantId: number, data: {
    customerId: number;
    feedbackType: string;
    category?: string;
    subject: string;
    description: string;
    severity?: string;
    relatedDriverId?: number;
    relatedVehicleId?: number;
    relatedTripId?: number;
    incidentDate?: string;
  }): Promise<any> => {
    const response = await apiClient.post(`/tenants/${tenantId}/feedback`, data);
    return response.data;
  },

  /**
   * Acknowledge feedback
   */
  acknowledgeFeedback: async (tenantId: number, feedbackId: number): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/feedback/${feedbackId}/acknowledge`);
    return response.data;
  },

  /**
   * Assign feedback to a user
   */
  assignFeedback: async (tenantId: number, feedbackId: number, assignedTo: number): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/feedback/${feedbackId}/assign`, { assignedTo });
    return response.data;
  },

  /**
   * Resolve feedback
   */
  resolveFeedback: async (tenantId: number, feedbackId: number, data: {
    resolutionNotes: string;
    resolutionAction?: string;
  }): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/feedback/${feedbackId}/resolve`, data);
    return response.data;
  },

  /**
   * Update feedback status
   */
  updateStatus: async (tenantId: number, feedbackId: number, status: string): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/feedback/${feedbackId}/status`, { status });
    return response.data;
  },

  /**
   * Update feedback details
   */
  updateFeedback: async (tenantId: number, feedbackId: number, data: {
    category?: string;
    severity?: string;
    priority?: string;
    followUpRequired?: boolean;
    followUpDate?: string;
    followUpNotes?: string;
  }): Promise<any> => {
    const response = await apiClient.put(`/tenants/${tenantId}/feedback/${feedbackId}`, data);
    return response.data;
  },

  /**
   * Delete (close) feedback
   */
  deleteFeedback: async (tenantId: number, feedbackId: number): Promise<any> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/feedback/${feedbackId}`);
    return response.data;
  },

  /**
   * Get feedback for a specific customer
   */
  getCustomerFeedback: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(`/tenants/${tenantId}/feedback/customer/${customerId}`);
    return response.data;
  },
};

export default apiClient;
