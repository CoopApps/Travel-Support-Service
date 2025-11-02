/**
 * Trip/Schedule Management Types
 */

export interface Trip {
  trip_id: number;
  tenant_id: number;
  customer_id: number;
  driver_id: number | null;
  vehicle_id: number | null;
  trip_date: string;
  day_of_week: string;
  pickup_time: string;
  pickup_location: string | null;
  pickup_address: string | null;
  destination: string;
  destination_address: string | null;
  trip_type: 'regular' | 'adhoc';
  trip_source: 'manual' | 'schedule' | 'import';
  is_recurring: boolean;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  urgent: boolean;
  price: number | null;
  notes: string | null;
  requires_wheelchair: boolean;
  requires_escort: boolean;
  passenger_count: number;
  special_requirements: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
  // Joined fields
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_registration?: string;
  vehicle_make?: string;
  vehicle_model?: string;
}

export interface CreateTripDto {
  customer_id: number;
  driver_id?: number | null;
  vehicle_id?: number | null;
  trip_date: string;
  pickup_time: string;
  pickup_location?: string;
  pickup_address?: string;
  destination: string;
  destination_address?: string;
  trip_type?: 'regular' | 'adhoc';
  trip_source?: 'manual' | 'schedule' | 'import';
  is_recurring?: boolean;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  urgent?: boolean;
  price?: number;
  notes?: string;
  requires_wheelchair?: boolean;
  requires_escort?: boolean;
  passenger_count?: number;
  special_requirements?: string;
}

export interface UpdateTripDto {
  driver_id?: number | null;
  vehicle_id?: number | null;
  pickup_time?: string;
  pickup_location?: string;
  pickup_address?: string;
  destination?: string;
  destination_address?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  urgent?: boolean;
  price?: number;
  notes?: string;
  requires_wheelchair?: boolean;
  requires_escort?: boolean;
  passenger_count?: number;
  special_requirements?: string;
}

export interface TripFilters {
  driverId?: number;
  customerId?: number;
  vehicleId?: number;
  startDate?: string;
  endDate?: string;
  tripType?: 'regular' | 'adhoc';
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ServerTime {
  server_datetime: string;
  server_date: string;
  server_time: string;
  formatted_date: string;
  formatted_time: string;
  day_name: string;
  day_of_week: number;
  timezone: string;
}

export interface ScheduleStats {
  totalTrips: number;
  scheduledTrips: number;
  adHocTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  todayTrips: number;
}
