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
