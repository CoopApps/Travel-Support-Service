/**
 * Vehicle Type Definitions
 */

// Core Vehicle Type
export interface Vehicle {
  id: number;
  vehicle_id: number;
  tenant_id: number;
  registration: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
  type: string;
  seats: number;
  fuel_type: string;
  fuelType: string;
  mileage: number;
  ownership: 'owned' | 'leased' | 'personal';
  driver_id?: number;
  driverId?: number;
  assigned_driver_name?: string;
  assignedDriverName?: string;
  driver_phone?: string;
  mot_date?: string;
  motDate?: string;
  insurance_expiry?: string;
  insuranceExpiry?: string;
  last_service_date?: string;
  lastService?: string;
  service_interval_months?: number;
  serviceInterval?: number;
  lease_monthly_cost?: number;
  leaseMonthly?: number;
  insurance_monthly_cost?: number;
  insuranceMonthly?: number;
  wheelchair_accessible: boolean;
  wheelchairAccessible: boolean;
  is_basic_record: boolean;
  isBasicRecord: boolean;
  is_active: boolean;
  isActive: boolean;
  created_at: string;
  createdAt: string;
  updated_at: string;
  updatedAt: string;
}

// Create Vehicle DTO
export interface CreateVehicleDto {
  registration: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
  seats: number;
  fuel_type: string;
  mileage: number;
  ownership: 'owned' | 'leased' | 'personal';
  driver_id?: number;
  mot_date?: string;
  insurance_expiry?: string;
  last_service_date?: string;
  service_interval_months?: number;
  lease_monthly_cost?: number;
  insurance_monthly_cost?: number;
  wheelchair_accessible: boolean;
  is_basic_record?: boolean;
}

// Update Vehicle DTO
export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {}

// Vehicle List Query
export interface VehicleListQuery {
  driver_id?: number;
  ownership?: 'owned' | 'leased' | 'personal';
  wheelchair_accessible?: boolean;
  page?: number;
  limit?: number;
}

// Maintenance Record Type
export interface MaintenanceRecord {
  maintenance_id: number;
  vehicle_id: number;
  tenant_id: number;
  service_date: string;
  service_type: string;
  description?: string;
  mileage_at_service: number;
  cost: number;
  provider?: string;
  next_service_due?: string;
  notes?: string;
  parts_replaced?: string[];
  is_warranty_work: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  vehicle_registration?: string;
  vehicle_make?: string;
  vehicle_model?: string;
}

// Create Maintenance Record DTO
export interface CreateMaintenanceDto {
  vehicle_id: number;
  service_date: string;
  service_type: string;
  description?: string;
  mileage_at_service: number;
  cost: number;
  provider?: string;
  next_service_due?: string;
  notes?: string;
  parts_replaced?: string[];
  is_warranty_work?: boolean;
}

// Update Maintenance Record DTO
export interface UpdateMaintenanceDto extends Partial<CreateMaintenanceDto> {}

// Maintenance Alert Type
export interface MaintenanceAlert {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  alert_type: 'mot' | 'insurance' | 'service';
  alert_level: 'overdue' | 'due_soon' | 'due_this_month' | 'upcoming';
  due_date: string;
  days_until_due: number;
  current_mileage?: number;
  service_interval?: number;
  message: string;
}

// Maintenance Overview Type
export interface MaintenanceOverview {
  overdue_count: number;
  due_soon_count: number; // <= 7 days
  due_this_month_count: number; // <= 30 days
  up_to_date_count: number;
  total_vehicles: number;
  upcoming_services: MaintenanceUpcoming[];
  recent_costs: MaintenanceCosts;
}

export interface MaintenanceUpcoming {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  service_type: string;
  due_date: string;
  days_until_due: number;
  estimated_cost?: number;
}

export interface MaintenanceCosts {
  this_month: number;
  last_3_months: number;
  year_to_date: number;
  avg_per_vehicle: number;
  breakdown?: {
    service: number;
    mot: number;
    insurance: number;
    repairs: number;
    other: number;
  };
}

// Maintenance History Query
export interface MaintenanceHistoryQuery {
  vehicle_id?: number;
  service_type?: string;
  start_date?: string;
  end_date?: string;
  min_cost?: number;
  max_cost?: number;
  provider?: string;
  limit?: number;
  offset?: number;
}

// Vehicle Statistics
export interface VehicleStats {
  total: number;
  owned: number;
  leased: number;
  personal: number;
  wheelchair_accessible: number;
  needs_details: number;
  total_monthly_costs: number;
}

// Driver Assignment DTO
export interface AssignDriverDto {
  driver_id: number | null;
}

// Sync Drivers Response
export interface SyncDriversResponse {
  synced: number;
  created: number;
  updated: number;
  deleted: number;
  vehicles: Vehicle[];
}
