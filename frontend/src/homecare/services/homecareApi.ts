import axios, { AxiosInstance } from 'axios';

/**
 * Homecare API Service
 *
 * Provides API methods for homecare management including clients, carers, visits, etc.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance for homecare API calls
const homecareApiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/homecare`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
homecareApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors
homecareApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface Client {
  client_id: number;
  tenant_id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  nhs_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  postcode?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_conditions?: string;
  allergies?: string;
  mobility_needs?: string;
  communication_needs?: string;
  dietary_requirements?: string;
  status: 'active' | 'archived';
  travel_customer_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Carer {
  carer_id: number;
  tenant_id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone?: string;
  email: string;
  address?: string;
  postcode?: string;
  dbs_check_date?: string;
  dbs_expiry_date?: string;
  dbs_certificate_number?: string;
  qualifications?: string;
  care_certificate: boolean;
  employment_type: 'full_time' | 'part_time' | 'agency' | 'volunteer';
  hourly_rate?: number;
  contracted_hours?: number;
  max_daily_hours?: number;
  status: 'active' | 'inactive';
  total_visits_completed?: number;
  on_time_percentage?: number;
  travel_customer_id?: number;
  travel_driver_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  visit_id: number;
  tenant_id: number;
  client_id: number;
  carer_id?: number;
  care_plan_id?: number;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  visit_type: string;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  check_in_lat?: number;
  check_in_lng?: number;
  check_out_lat?: number;
  check_out_lng?: number;
  client?: Partial<Client>;
  carer?: Partial<Carer>;
  created_at: string;
  updated_at: string;
}

export interface CarePlan {
  care_plan_id: number;
  tenant_id: number;
  client_id: number;
  plan_name: string;
  care_needs: string;
  visit_frequency: string;
  visit_duration_minutes: number;
  special_instructions?: string;
  risk_assessment?: string;
  status: 'active' | 'archived';
  start_date: string;
  end_date?: string;
  client?: Partial<Client>;
  created_at: string;
  updated_at: string;
}

export interface Document {
  document_id: number;
  tenant_id: number;
  document_type: 'policy' | 'procedure' | 'care_plan' | 'risk_assessment' | 'training' | 'compliance' | 'client_record' | 'other';
  title: string;
  description?: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  version: number;
  client_id?: number;
  carer_id?: number;
  access_level: 'public' | 'staff' | 'management' | 'admin' | 'confidential';
  requires_approval: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  expiry_date?: string;
  uploaded_by: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Invoice {
  invoice_id: number;
  tenant_id: number;
  client_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  payment_terms?: string;
  client?: Partial<Client>;
  invoice_items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  item_id: number;
  invoice_id: number;
  visit_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface DashboardStats {
  overview: {
    active_clients: number;
    active_carers: number;
    total_visits: number;
    revenue_this_month: number;
    revenue_last_month: number;
    revenue_growth_percentage: number;
  };
  visits: {
    today: number;
    this_week: number;
    completed_this_month: number;
    cancelled_this_month: number;
    completion_rate: number;
  };
  alerts: {
    expiring_dbs_checks: number;
    expiring_documents: number;
    overdue_invoices: number;
    unassigned_visits: number;
  };
}

export interface TenantSettings {
  tenant_id: number;
  business_hours_start?: string;
  business_hours_end?: string;
  standard_visit_duration?: number;
  weekend_rate_multiplier?: number;
  evening_rate_multiplier?: number;
  default_payment_terms?: string;
  travel_integration_enabled: boolean;
  travel_partnership_type?: string;
  carer_travel_discount?: number;
  client_travel_enabled: boolean;
  auto_sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Client API
export const clientApi = {
  list: (tenantId: number, params?: { status?: string; search?: string }) =>
    homecareApiClient.get<Client[]>(`/tenants/${tenantId}/clients`, { params }),

  getById: (tenantId: number, clientId: number) =>
    homecareApiClient.get<Client>(`/tenants/${tenantId}/clients/${clientId}`),

  create: (tenantId: number, data: Partial<Client>) =>
    homecareApiClient.post<Client>(`/tenants/${tenantId}/clients`, data),

  update: (tenantId: number, clientId: number, data: Partial<Client>) =>
    homecareApiClient.put<Client>(`/tenants/${tenantId}/clients/${clientId}`, data),

  delete: (tenantId: number, clientId: number) =>
    homecareApiClient.delete(`/tenants/${tenantId}/clients/${clientId}`),

  syncToTravel: (tenantId: number, clientId: number) =>
    homecareApiClient.post(`/tenants/${tenantId}/clients/${clientId}/sync-to-travel`),

  unsyncFromTravel: (tenantId: number, clientId: number) =>
    homecareApiClient.delete(`/tenants/${tenantId}/clients/${clientId}/unsync-from-travel`),
};

// Carer API
export const carerApi = {
  list: (tenantId: number, params?: { status?: string; search?: string }) =>
    homecareApiClient.get<Carer[]>(`/tenants/${tenantId}/carers`, { params }),

  getById: (tenantId: number, carerId: number) =>
    homecareApiClient.get<Carer>(`/tenants/${tenantId}/carers/${carerId}`),

  create: (tenantId: number, data: Partial<Carer>) =>
    homecareApiClient.post<Carer>(`/tenants/${tenantId}/carers`, data),

  update: (tenantId: number, carerId: number, data: Partial<Carer>) =>
    homecareApiClient.put<Carer>(`/tenants/${tenantId}/carers/${carerId}`, data),

  delete: (tenantId: number, carerId: number) =>
    homecareApiClient.delete(`/tenants/${tenantId}/carers/${carerId}`),

  getSchedule: (tenantId: number, carerId: number, params?: { start_date?: string; end_date?: string }) =>
    homecareApiClient.get(`/tenants/${tenantId}/carers/${carerId}/schedule`, { params }),

  syncToTravel: (tenantId: number, carerId: number, data: { sync_as?: 'customer' | 'driver' }) =>
    homecareApiClient.post(`/tenants/${tenantId}/carers/${carerId}/sync-to-travel`, data),

  unsyncFromTravel: (tenantId: number, carerId: number) =>
    homecareApiClient.delete(`/tenants/${tenantId}/carers/${carerId}/unsync-from-travel`),
};

// Visit API
export const visitApi = {
  list: (tenantId: number, params?: { client_id?: number; carer_id?: number; status?: string; start_date?: string; end_date?: string }) =>
    homecareApiClient.get<Visit[]>(`/tenants/${tenantId}/visits`, { params }),

  getById: (tenantId: number, visitId: number) =>
    homecareApiClient.get<Visit>(`/tenants/${tenantId}/visits/${visitId}`),

  create: (tenantId: number, data: Partial<Visit>) =>
    homecareApiClient.post<Visit>(`/tenants/${tenantId}/visits`, data),

  update: (tenantId: number, visitId: number, data: Partial<Visit>) =>
    homecareApiClient.put<Visit>(`/tenants/${tenantId}/visits/${visitId}`, data),

  delete: (tenantId: number, visitId: number) =>
    homecareApiClient.delete(`/tenants/${tenantId}/visits/${visitId}`),

  checkIn: (tenantId: number, visitId: number, data: { lat?: number; lng?: number }) =>
    homecareApiClient.post(`/tenants/${tenantId}/visits/${visitId}/check-in`, data),

  checkOut: (tenantId: number, visitId: number, data: { lat?: number; lng?: number; notes?: string }) =>
    homecareApiClient.post(`/tenants/${tenantId}/visits/${visitId}/check-out`, data),

  assignCarer: (tenantId: number, visitId: number, data: { carer_id: number }) =>
    homecareApiClient.post(`/tenants/${tenantId}/visits/${visitId}/assign`, data),
};

// Care Plan API
export const carePlanApi = {
  list: (tenantId: number, params?: { client_id?: number; status?: string }) =>
    homecareApiClient.get<CarePlan[]>(`/tenants/${tenantId}/care-plans`, { params }),

  getById: (tenantId: number, carePlanId: number) =>
    homecareApiClient.get<CarePlan>(`/tenants/${tenantId}/care-plans/${carePlanId}`),

  create: (tenantId: number, data: Partial<CarePlan>) =>
    homecareApiClient.post<CarePlan>(`/tenants/${tenantId}/care-plans`, data),

  update: (tenantId: number, carePlanId: number, data: Partial<CarePlan>) =>
    homecareApiClient.put<CarePlan>(`/tenants/${tenantId}/care-plans/${carePlanId}`, data),

  delete: (tenantId: number, carePlanId: number) =>
    homecareApiClient.delete(`/tenants/${tenantId}/care-plans/${carePlanId}`),
};

// Document API
export const documentApi = {
  list: (tenantId: number, params?: { type?: string; client_id?: number; carer_id?: number; status?: string; page?: number; limit?: number }) =>
    homecareApiClient.get<{ documents: Document[]; pagination: any }>(`/tenants/${tenantId}/documents`, { params }),

  getById: (tenantId: number, documentId: number) =>
    homecareApiClient.get<Document>(`/tenants/${tenantId}/documents/${documentId}`),

  upload: (tenantId: number, formData: FormData) =>
    homecareApiClient.post<Document>(`/tenants/${tenantId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (tenantId: number, documentId: number, data: Partial<Document>) =>
    homecareApiClient.put<Document>(`/tenants/${tenantId}/documents/${documentId}`, data),

  delete: (tenantId: number, documentId: number) =>
    homecareApiClient.delete(`/tenants/${tenantId}/documents/${documentId}`),

  approve: (tenantId: number, documentId: number) =>
    homecareApiClient.post(`/tenants/${tenantId}/documents/${documentId}/approve`),

  reject: (tenantId: number, documentId: number, data: { reason: string }) =>
    homecareApiClient.post(`/tenants/${tenantId}/documents/${documentId}/reject`, data),

  getStats: (tenantId: number) =>
    homecareApiClient.get(`/tenants/${tenantId}/documents/stats`),

  getExpiring: (tenantId: number, params?: { days?: number }) =>
    homecareApiClient.get(`/tenants/${tenantId}/documents/expiring`, { params }),
};

// Invoice API
export const invoiceApi = {
  list: (tenantId: number, params?: { client_id?: number; status?: string; start_date?: string; end_date?: string }) =>
    homecareApiClient.get<Invoice[]>(`/tenants/${tenantId}/invoices`, { params }),

  getById: (tenantId: number, invoiceId: number) =>
    homecareApiClient.get<Invoice>(`/tenants/${tenantId}/invoices/${invoiceId}`),

  create: (tenantId: number, data: Partial<Invoice> & { generate_from_visits?: boolean; period_start?: string; period_end?: string }) =>
    homecareApiClient.post<Invoice>(`/tenants/${tenantId}/invoices`, data),

  addItem: (tenantId: number, invoiceId: number, data: Partial<InvoiceItem>) =>
    homecareApiClient.post<InvoiceItem>(`/tenants/${tenantId}/invoices/${invoiceId}/items`, data),

  send: (tenantId: number, invoiceId: number) =>
    homecareApiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/send`),

  recordPayment: (tenantId: number, invoiceId: number, data: { amount: number; payment_date: string; payment_method: string; notes?: string }) =>
    homecareApiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/payments`, data),

  cancel: (tenantId: number, invoiceId: number) =>
    homecareApiClient.post(`/tenants/${tenantId}/invoices/${invoiceId}/cancel`),

  getSummary: (tenantId: number, params?: { start_date?: string; end_date?: string }) =>
    homecareApiClient.get(`/tenants/${tenantId}/invoices/summary`, { params }),
};

// Dashboard API
export const homecareDashboardApi = {
  getStats: (tenantId: number) =>
    homecareApiClient.get<DashboardStats>(`/tenants/${tenantId}/dashboard`),
};

// Settings API
export const settingsApi = {
  get: (tenantId: number) =>
    homecareApiClient.get<TenantSettings>(`/tenants/${tenantId}/settings`),

  update: (tenantId: number, data: Partial<TenantSettings>) =>
    homecareApiClient.put<TenantSettings>(`/tenants/${tenantId}/settings`, data),

  getIntegrationStatus: (tenantId: number) =>
    homecareApiClient.get(`/tenants/${tenantId}/integration/status`),

  enableIntegration: (tenantId: number) =>
    homecareApiClient.post(`/tenants/${tenantId}/integration/enable`),

  disableIntegration: (tenantId: number) =>
    homecareApiClient.post(`/tenants/${tenantId}/integration/disable`),

  exportClients: (tenantId: number) =>
    homecareApiClient.get(`/tenants/${tenantId}/export/clients`, { responseType: 'blob' }),

  exportCarers: (tenantId: number) =>
    homecareApiClient.get(`/tenants/${tenantId}/export/carers`, { responseType: 'blob' }),

  exportVisits: (tenantId: number, params: { start_date: string; end_date: string }) =>
    homecareApiClient.get(`/tenants/${tenantId}/export/visits`, { params, responseType: 'blob' }),
};
