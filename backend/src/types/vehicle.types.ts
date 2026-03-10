/**
 * Vehicle Types - Backend
 *
 * Type definitions for vehicle management system
 */

export interface Vehicle {
  vehicle_id: number;
  tenant_id: number;
  registration: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
  seats: number;
  fuel_type: string;
  mileage: number;
  ownership: 'owned' | 'leased' | 'personal';
  driver_id: number | null;
  mot_date: Date | null;
  insurance_expiry: Date | null;
  last_service_date: Date | null;
  service_interval_months: number;
  lease_monthly_cost: number;
  insurance_monthly_cost: number;
  wheelchair_accessible: boolean;
  is_basic_record: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  assigned_driver_name?: string;
  driver_phone?: string;
}

export interface CreateVehicleDto {
  registration: string;
  make: string;
  model: string;
  year: number;
  vehicle_type?: string;
  seats?: number;
  fuel_type?: string;
  mileage?: number;
  ownership?: 'owned' | 'leased' | 'personal';
  driver_id?: number | null;
  mot_date?: string | null;
  insurance_expiry?: string | null;
  last_service_date?: string | null;
  service_interval_months?: number;
  lease_monthly_cost?: number;
  insurance_monthly_cost?: number;
  wheelchair_accessible?: boolean;
  is_basic_record?: boolean;
}

export interface UpdateVehicleDto {
  registration?: string;
  make?: string;
  model?: string;
  year?: number;
  vehicle_type?: string;
  seats?: number;
  fuel_type?: string;
  mileage?: number;
  ownership?: 'owned' | 'leased' | 'personal';
  driver_id?: number | null;
  mot_date?: string | null;
  insurance_expiry?: string | null;
  last_service_date?: string | null;
  service_interval_months?: number;
  lease_monthly_cost?: number;
  insurance_monthly_cost?: number;
  wheelchair_accessible?: boolean;
}

export interface MaintenanceRecord {
  maintenance_id: number;
  tenant_id: number;
  vehicle_id: number;
  maintenance_date: Date;
  maintenance_type: string;
  description: string | null;
  cost: number;
  mileage_at_service: number | null;
  service_provider: string | null;
  provider_contact: string | null;
  notes: string | null;
  invoice_number: string | null;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
  vehicle_registration?: string;
  vehicle_make?: string;
  vehicle_model?: string;
}

export interface CreateMaintenanceDto {
  vehicle_id: number;
  maintenance_date: string;
  maintenance_type: string;
  description?: string;
  cost?: number;
  mileage_at_service?: number;
  service_provider?: string;
  provider_contact?: string;
  notes?: string;
  invoice_number?: string;
  completed?: boolean;
}

export interface UpdateMaintenanceDto {
  maintenance_date?: string;
  maintenance_type?: string;
  description?: string;
  cost?: number;
  mileage_at_service?: number;
  service_provider?: string;
  provider_contact?: string;
  notes?: string;
  invoice_number?: string;
  completed?: boolean;
}

// Enhanced Stats Types
export interface VehicleStatsRow {
  vehicle_id: number;
  ownership: string;
  year: number;
  wheelchair_accessible: boolean;
  driver_id: number | null;
  mileage: number;
  lease_monthly_cost: number;
  insurance_monthly_cost: number;
  archived: boolean;
}

export interface TripStatsRow {
  vehicle_id: number;
  trip_count: string | number;
  completed_trips: string | number;
  total_revenue: string | number;
}

export interface MaintenanceCostRow {
  vehicle_id: number;
  total_maintenance_cost: string | number;
  maintenance_count: string | number;
}

// Vehicle Utilization Types
export interface VehicleUtilization {
  vehicle_id: number;
  trips: number;
  revenue: number;
  maintenanceCost: number;
}

export interface VehicleWithStats {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  year: number;
  ownership: string;
  driver_id: number | null;
  driver_name: string | null;
  trip_count: string | number;
  completed_trips: string | number;
  revenue: string | number;
  first_trip: string | null;
  last_trip: string | null;
}

export interface UtilizationData {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  year: number;
  ownership: string;
  driver: string | null;
  isAssigned: boolean;
  trips: number;
  completedTrips: number;
  revenue: string;
  daysInService: number;
  daysSinceLastTrip: number | null;
  utilizationRate: string;
  tripsPerDay: string;
  revenuePerTrip: string;
  status: string;
  lastTrip: string | null;
}

// Trip Statistics Types
export interface TripStatistics {
  total_trips: string | number;
  completed_trips: string | number;
  cancelled_trips: string | number;
  total_revenue: string | number;
  average_trip_revenue: string | number;
}

export interface FinancialStatistics {
  total_revenue: string | number;
  total_maintenance_cost: string | number;
  net_profit: string | number;
}

export interface IncidentStatistics {
  total_incidents: string | number;
  unresolved_incidents: string | number;
  total_incident_cost: string | number;
}

// Idle Vehicle Types
export interface VehicleIdleData {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  year: number;
  ownership: string;
  driver_id: number | null;
  driver_name: string | null;
  lease_monthly_cost: number;
  insurance_monthly_cost: number;
  last_trip_date: string | null;
  total_trips: string | number;
}

export interface IdleVehicle {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  year: number;
  ownership: string;
  driver: string | null;
  status: string;
  totalTrips: number;
  lastTripDate?: string;
  daysSinceLastTrip?: number;
  monthlyCost: string;
}

// Archive Types
export interface ArchiveVehicle {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  archived: boolean;
}

export interface ArchiveResult {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
}

// Trip History Type
export interface TripHistoryRow {
  trip_id: number;
  trip_date: string;
  pickup_time: string;
  pickup_location: string;
  destination: string;
  trip_type: string;
  status: string;
  price: number;
  estimated_duration: number | null;
  customer_name: string | null;
  driver_name: string | null;
}
