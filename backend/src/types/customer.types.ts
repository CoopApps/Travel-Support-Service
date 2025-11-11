/**
 * Customer Types
 *
 * TypeScript interfaces for customer management
 */

export interface Customer {
  id: number;
  tenant_id: number;
  name: string;
  address?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  paying_org?: string;
  has_split_payment?: boolean;
  provider_split?: ProviderSplit;
  payment_split?: PaymentSplit;
  schedule?: CustomerSchedule;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  medication_notes?: string;
  driver_notes?: string;
  mobility_requirements?: string;
  is_active: boolean;
  is_login_enabled?: boolean;
  user_id?: number;
  username?: string;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;

  // No-show tracking fields
  no_show_count?: number;
  total_completed_trips?: number;
  total_trips_attempted?: number;
  reliability_percentage?: number;
  last_no_show_date?: Date;
  last_completed_trip_date?: Date;
}

export interface ProviderSplit {
  [providerName: string]: number;
}

export interface PaymentSplit {
  [providerName: string]: {
    percentage: number;
    amount: number;
  };
}

export interface CustomerSchedule {
  mon?: DaySchedule;
  tue?: DaySchedule;
  wed?: DaySchedule;
  thu?: DaySchedule;
  fri?: DaySchedule;
  sat?: DaySchedule;
  sun?: DaySchedule;
}

export interface DaySchedule {
  destination?: string;
  pickup_time?: string;
  drop_off_time?: string;
  daily_price?: number;
  dailyPrice?: number;
  price?: number;

  // Enhanced schedule fields
  is_enhanced_schedule?: boolean;
  outbound_destination?: string;
  return_destination?: string;
  outbound_time?: string;
  return_time?: string;
  morning_price?: number;
  afternoon_price?: number;
}

export interface CreateCustomerDto {
  name: string;
  address?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  paying_org?: string;
  has_split_payment?: boolean;
  provider_split?: ProviderSplit;
  payment_split?: PaymentSplit;
  schedule?: CustomerSchedule;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  medication_notes?: string;
  driver_notes?: string;
  mobility_requirements?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  // All fields from CreateCustomerDto are optional for updates
}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  paying_org?: string;
  is_login_enabled?: boolean;
  sortBy?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
