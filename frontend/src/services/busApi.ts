import apiClient from './api';

// ==================================================================================
// TYPE DEFINITIONS
// ==================================================================================

export interface BusRoute {
  route_id: number;
  tenant_id: number;
  route_number: string;
  route_name: string;
  description?: string;
  registration_number?: string;
  origin_point: string;
  destination_point: string;
  total_distance_miles?: number;
  estimated_duration_minutes?: number;
  service_pattern: 'daily' | 'weekdays' | 'weekends' | 'custom';
  operates_monday: boolean;
  operates_tuesday: boolean;
  operates_wednesday: boolean;
  operates_thursday: boolean;
  operates_friday: boolean;
  operates_saturday: boolean;
  operates_sunday: boolean;
  status: 'planning' | 'registered' | 'active' | 'suspended' | 'cancelled';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  stop_count?: number;
  timetable_count?: number;
}

export interface RouteStop {
  stop_id: number;
  route_id: number;
  tenant_id: number;
  stop_sequence: number;
  stop_name: string;
  stop_address?: string;
  latitude?: number;
  longitude?: number;
  arrival_offset_minutes?: number;
  departure_offset_minutes?: number;
  dwell_time_minutes: number;
  is_timing_point: boolean;
  is_pickup_point: boolean;
  is_setdown_point: boolean;
  accessibility_features?: string;
  created_at: string;
}

export interface BusTimetable {
  timetable_id: number;
  tenant_id: number;
  route_id: number;
  service_name: string;
  departure_time: string;
  direction: 'outbound' | 'inbound' | 'circular';
  vehicle_id?: number;
  driver_id?: number;
  total_seats: number;
  wheelchair_spaces: number;
  valid_from: string;
  valid_until?: string;
  recurrence_pattern?: any;
  status: 'scheduled' | 'active' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  route_number?: string;
  route_name?: string;
  vehicle_registration?: string;
  driver_name?: string;
}

export interface BusBooking {
  booking_id: number;
  tenant_id: number;
  timetable_id: number;
  customer_id?: number;
  passenger_name: string;
  passenger_phone?: string;
  passenger_email?: string;
  boarding_stop_id: number;
  alighting_stop_id: number;
  service_date: string;
  seat_number?: string;
  requires_wheelchair_space: boolean;
  booking_reference: string;
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
  fare_amount?: number;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  payment_method?: string;
  special_requirements?: string;
  created_at: string;
  updated_at: string;
}

export interface SeatAvailability {
  availability_id: number;
  timetable_id: number;
  service_date: string;
  total_seats: number;
  booked_seats: number;
  available_seats: number;
  wheelchair_spaces: number;
  booked_wheelchair_spaces: number;
  available_wheelchair_spaces: number;
  last_updated: string;
}

// ==================================================================================
// BUS ROUTES API
// ==================================================================================

export const busRoutesApi = {
  /**
   * Get all routes for a tenant
   */
  getRoutes: async (
    tenantId: number,
    params?: { status?: string; service_pattern?: string }
  ): Promise<BusRoute[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/bus/routes`, { params });
    return response.data;
  },

  /**
   * Get route details with stops
   */
  getRoute: async (tenantId: number, routeId: number): Promise<BusRoute & { stops: RouteStop[] }> => {
    const response = await apiClient.get(`/tenants/${tenantId}/bus/routes/${routeId}`);
    return response.data;
  },

  /**
   * Create a new route
   */
  createRoute: async (tenantId: number, data: Partial<BusRoute>): Promise<BusRoute> => {
    const response = await apiClient.post(`/tenants/${tenantId}/bus/routes`, data);
    return response.data;
  },

  /**
   * Update a route
   */
  updateRoute: async (
    tenantId: number,
    routeId: number,
    data: Partial<BusRoute>
  ): Promise<BusRoute> => {
    const response = await apiClient.put(`/tenants/${tenantId}/bus/routes/${routeId}`, data);
    return response.data;
  },

  /**
   * Delete a route
   */
  deleteRoute: async (tenantId: number, routeId: number): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/bus/routes/${routeId}`);
  },

  /**
   * Add a stop to a route
   */
  addStop: async (tenantId: number, routeId: number, data: Partial<RouteStop>): Promise<RouteStop> => {
    const response = await apiClient.post(`/tenants/${tenantId}/bus/routes/${routeId}/stops`, data);
    return response.data;
  },

  /**
   * Update a stop
   */
  updateStop: async (
    tenantId: number,
    routeId: number,
    stopId: number,
    data: Partial<RouteStop>
  ): Promise<RouteStop> => {
    const response = await apiClient.put(
      `/tenants/${tenantId}/bus/routes/${routeId}/stops/${stopId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a stop
   */
  deleteStop: async (tenantId: number, routeId: number, stopId: number): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/bus/routes/${routeId}/stops/${stopId}`);
  }
};

// ==================================================================================
// BUS TIMETABLES API
// ==================================================================================

export const busTimetablesApi = {
  /**
   * Get all timetables
   */
  getTimetables: async (
    tenantId: number,
    params?: { route_id?: number; status?: string; date?: string }
  ): Promise<BusTimetable[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/bus/timetables`, { params });
    return response.data;
  },

  /**
   * Get today's services
   */
  getTodaysServices: async (tenantId: number): Promise<BusTimetable[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/bus/timetables/today`);
    return response.data;
  },

  /**
   * Get timetable details
   */
  getTimetable: async (
    tenantId: number,
    timetableId: number,
    params?: { date?: string }
  ): Promise<BusTimetable> => {
    const response = await apiClient.get(`/tenants/${tenantId}/bus/timetables/${timetableId}`, {
      params
    });
    return response.data;
  },

  /**
   * Create a new timetable
   */
  createTimetable: async (tenantId: number, data: Partial<BusTimetable>): Promise<BusTimetable> => {
    const response = await apiClient.post(`/tenants/${tenantId}/bus/timetables`, data);
    return response.data;
  },

  /**
   * Update a timetable
   */
  updateTimetable: async (
    tenantId: number,
    timetableId: number,
    data: Partial<BusTimetable>
  ): Promise<BusTimetable> => {
    const response = await apiClient.put(
      `/tenants/${tenantId}/bus/timetables/${timetableId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a timetable
   */
  deleteTimetable: async (tenantId: number, timetableId: number): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/bus/timetables/${timetableId}`);
  },

  /**
   * Get availability for a date range
   */
  getAvailability: async (
    tenantId: number,
    timetableId: number,
    startDate: string,
    endDate: string
  ): Promise<SeatAvailability[]> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/bus/timetables/${timetableId}/availability`,
      {
        params: { start_date: startDate, end_date: endDate }
      }
    );
    return response.data;
  },

  /**
   * Assign vehicle to timetable
   */
  assignVehicle: async (
    tenantId: number,
    timetableId: number,
    vehicleId: number
  ): Promise<BusTimetable> => {
    const response = await apiClient.patch(
      `/tenants/${tenantId}/bus/timetables/${timetableId}/assign-vehicle`,
      { vehicle_id: vehicleId }
    );
    return response.data;
  },

  /**
   * Assign driver to timetable
   */
  assignDriver: async (
    tenantId: number,
    timetableId: number,
    driverId: number,
    options?: { date?: string; force?: boolean }
  ): Promise<BusTimetable> => {
    const response = await apiClient.patch(
      `/tenants/${tenantId}/bus/timetables/${timetableId}/assign-driver`,
      { driver_id: driverId, ...options }
    );
    return response.data;
  },

  /**
   * Get available drivers for a specific date/time slot
   */
  getAvailableDrivers: async (
    tenantId: number,
    date: string,
    time: string,
    duration?: number
  ): Promise<{
    date: string;
    time: string;
    duration_minutes: number;
    drivers: Array<{
      driver_id: number;
      name: string;
      phone: string;
      employment_status: string;
      vehicle_id?: number;
      vehicle_registration?: string;
      available: boolean;
      conflicts: Array<{
        conflict_type: string;
        details: string;
        severity: 'critical' | 'warning' | 'info';
      }>;
      has_critical_conflicts: boolean;
      has_warnings: boolean;
    }>;
  }> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/bus/timetables/available-drivers`,
      { params: { date, time, duration } }
    );
    return response.data;
  }
};

// ==================================================================================
// BUS BOOKINGS API
// ==================================================================================

export const busBookingsApi = {
  /**
   * Get bookings
   */
  getBookings: async (
    tenantId: number,
    params?: {
      timetable_id?: number;
      service_date?: string;
      booking_status?: string;
      customer_id?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<BusBooking[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/bus/bookings`, { params });
    return response.data;
  },

  /**
   * Get booking details
   */
  getBooking: async (tenantId: number, bookingId: number): Promise<BusBooking> => {
    const response = await apiClient.get(`/tenants/${tenantId}/bus/bookings/${bookingId}`);
    return response.data;
  },

  /**
   * Create a booking
   */
  createBooking: async (tenantId: number, data: Partial<BusBooking>): Promise<BusBooking> => {
    const response = await apiClient.post(`/tenants/${tenantId}/bus/bookings`, data);
    return response.data;
  },

  /**
   * Cancel a booking
   */
  cancelBooking: async (
    tenantId: number,
    bookingId: number,
    reason?: string
  ): Promise<BusBooking> => {
    const response = await apiClient.patch(
      `/tenants/${tenantId}/bus/bookings/${bookingId}/cancel`,
      { reason }
    );
    return response.data;
  },

  /**
   * Update payment status
   */
  updatePayment: async (
    tenantId: number,
    bookingId: number,
    paymentStatus: string,
    paymentMethod?: string
  ): Promise<BusBooking> => {
    const response = await apiClient.patch(
      `/tenants/${tenantId}/bus/bookings/${bookingId}/payment`,
      { payment_status: paymentStatus, payment_method: paymentMethod }
    );
    return response.data;
  },

  /**
   * Get passenger manifest
   */
  getManifest: async (tenantId: number, timetableId: number, serviceDate: string): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/bus/bookings/manifest/${timetableId}`,
      {
        params: { service_date: serviceDate }
      }
    );
    return response.data;
  },

  /**
   * Get seat map
   */
  getSeatMap: async (tenantId: number, timetableId: number, serviceDate: string): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/bus/bookings/seat-map/${timetableId}`,
      {
        params: { service_date: serviceDate }
      }
    );
    return response.data;
  },

  /**
   * Get today's bookings
   */
  getTodaysBookings: async (tenantId: number): Promise<BusBooking[]> => {
    const today = new Date().toISOString().split('T')[0];
    return busBookingsApi.getBookings(tenantId, { service_date: today });
  }
};
