/**
 * Social Outings Types
 *
 * Types for the social outings/events system including bookings and rotas
 */

export interface SocialOuting {
  id: number;
  tenant_id: number;
  name: string;
  destination: string;
  outing_date: string; // ISO date string
  departure_time: string; // HH:MM format
  return_time: string | null;
  max_passengers: number;
  cost_per_person: number;
  wheelchair_accessible: boolean;
  description: string | null;
  meeting_point: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  weather_dependent: boolean;
  minimum_passengers: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Aggregated fields from JOIN queries
  booking_count?: number;
  driver_count?: number;
  wheelchair_bookings?: number;
}

export interface OutingBooking {
  id: number;
  tenant_id: number;
  outing_id: number;
  customer_id: number;
  customer_data: CustomerSnapshot; // JSONB snapshot
  special_requirements: string | null;
  dietary_requirements: string | null;
  booking_status: 'confirmed' | 'cancelled';
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  booked_by: string;
  created_at: string;
  // Joined customer fields
  customer_name?: string;
  customer_phone?: string;
  accessibility_needs?: any;
  medical_info?: string;
}

export interface CustomerSnapshot {
  customer_id: number;
  name: string;
  phone: string;
  accessibility_needs: {
    wheelchairUser?: boolean;
    mobilityAids?: string[];
    assistance_required?: string;
  };
  medical_info?: string;
}

export interface OutingRota {
  id: number;
  tenant_id: number;
  outing_id: number;
  driver_id: number;
  vehicle_data: VehicleSnapshot; // JSONB snapshot
  role: string;
  assigned_passengers: number[]; // Array of booking IDs
  assigned_by: string;
  created_at: string;
  updated_at: string;
  // Joined driver fields
  driver_name?: string;
  driver_phone?: string;
}

export interface VehicleSnapshot {
  make: string | null;
  model: string | null;
  registration: string | null;
  wheelchair_accessible: boolean;
}

export interface AvailabilityCheck {
  available: boolean;
  reason: string;
  conflictType?: 'regular_service' | 'holiday' | 'existing_outing';
}

export interface OutingStats {
  total: number;
  upcoming: number;
  past: number;
  total_bookings: number;
  wheelchair_users: number;
}

export interface OutingFormData {
  name: string;
  destination: string;
  outing_date: string;
  departure_time: string;
  return_time?: string;
  max_passengers: number;
  cost_per_person?: number;
  wheelchair_accessible?: boolean;
  description?: string;
  meeting_point?: string;
  contact_person?: string;
  contact_phone?: string;
  weather_dependent?: boolean;
  minimum_passengers?: number;
}

export interface BookingFormData {
  customer_id: number;
  special_requirements?: string;
  dietary_requirements?: string;
}

export interface RotaFormData {
  driver_id: number;
  role?: string;
}

export interface PassengerAssignmentData {
  assigned_passengers: number[];
}
