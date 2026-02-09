import homecareApi from './homecareApiClient';

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
    homecareApi.get<Client[]>(`/tenants/${tenantId}/clients`, { params }),

  getById: (tenantId: number, clientId: number) =>
    homecareApi.get<Client>(`/tenants/${tenantId}/clients/${clientId}`),

  create: (tenantId: number, data: Partial<Client>) =>
    homecareApi.post<Client>(`/tenants/${tenantId}/clients`, data),

  update: (tenantId: number, clientId: number, data: Partial<Client>) =>
    homecareApi.put<Client>(`/tenants/${tenantId}/clients/${clientId}`, data),

  delete: (tenantId: number, clientId: number) =>
    homecareApi.delete(`/tenants/${tenantId}/clients/${clientId}`),

  syncToTravel: (tenantId: number, clientId: number) =>
    homecareApi.post(`/tenants/${tenantId}/clients/${clientId}/sync-to-travel`),

  unsyncFromTravel: (tenantId: number, clientId: number) =>
    homecareApi.delete(`/tenants/${tenantId}/clients/${clientId}/unsync-from-travel`),
};

// Carer API
export const carerApi = {
  list: (tenantId: number, params?: { status?: string; search?: string }) =>
    homecareApi.get<Carer[]>(`/tenants/${tenantId}/carers`, { params }),

  getById: (tenantId: number, carerId: number) =>
    homecareApi.get<Carer>(`/tenants/${tenantId}/carers/${carerId}`),

  create: (tenantId: number, data: Partial<Carer>) =>
    homecareApi.post<Carer>(`/tenants/${tenantId}/carers`, data),

  update: (tenantId: number, carerId: number, data: Partial<Carer>) =>
    homecareApi.put<Carer>(`/tenants/${tenantId}/carers/${carerId}`, data),

  delete: (tenantId: number, carerId: number) =>
    homecareApi.delete(`/tenants/${tenantId}/carers/${carerId}`),

  getSchedule: (tenantId: number, carerId: number, params?: { start_date?: string; end_date?: string }) =>
    homecareApi.get(`/tenants/${tenantId}/carers/${carerId}/schedule`, { params }),

  syncToTravel: (tenantId: number, carerId: number, data: { sync_as?: 'customer' | 'driver' }) =>
    homecareApi.post(`/tenants/${tenantId}/carers/${carerId}/sync-to-travel`, data),

  unsyncFromTravel: (tenantId: number, carerId: number) =>
    homecareApi.delete(`/tenants/${tenantId}/carers/${carerId}/unsync-from-travel`),
};

// Visit API
export const visitApi = {
  list: (tenantId: number, params?: { client_id?: number; carer_id?: number; status?: string; start_date?: string; end_date?: string }) =>
    homecareApi.get<Visit[]>(`/tenants/${tenantId}/visits`, { params }),

  getById: (tenantId: number, visitId: number) =>
    homecareApi.get<Visit>(`/tenants/${tenantId}/visits/${visitId}`),

  create: (tenantId: number, data: Partial<Visit>) =>
    homecareApi.post<Visit>(`/tenants/${tenantId}/visits`, data),

  update: (tenantId: number, visitId: number, data: Partial<Visit>) =>
    homecareApi.put<Visit>(`/tenants/${tenantId}/visits/${visitId}`, data),

  delete: (tenantId: number, visitId: number) =>
    homecareApi.delete(`/tenants/${tenantId}/visits/${visitId}`),

  checkIn: (tenantId: number, visitId: number, data: { lat?: number; lng?: number }) =>
    homecareApi.post(`/tenants/${tenantId}/visits/${visitId}/check-in`, data),

  checkOut: (tenantId: number, visitId: number, data: { lat?: number; lng?: number; notes?: string }) =>
    homecareApi.post(`/tenants/${tenantId}/visits/${visitId}/check-out`, data),

  assignCarer: (tenantId: number, visitId: number, data: { carer_id: number }) =>
    homecareApi.post(`/tenants/${tenantId}/visits/${visitId}/assign`, data),
};

// Care Plan API
export const carePlanApi = {
  list: (tenantId: number, params?: { client_id?: number; status?: string }) =>
    homecareApi.get<CarePlan[]>(`/tenants/${tenantId}/care-plans`, { params }),

  getById: (tenantId: number, carePlanId: number) =>
    homecareApi.get<CarePlan>(`/tenants/${tenantId}/care-plans/${carePlanId}`),

  create: (tenantId: number, data: Partial<CarePlan>) =>
    homecareApi.post<CarePlan>(`/tenants/${tenantId}/care-plans`, data),

  update: (tenantId: number, carePlanId: number, data: Partial<CarePlan>) =>
    homecareApi.put<CarePlan>(`/tenants/${tenantId}/care-plans/${carePlanId}`, data),

  delete: (tenantId: number, carePlanId: number) =>
    homecareApi.delete(`/tenants/${tenantId}/care-plans/${carePlanId}`),
};

// Document API
export const documentApi = {
  list: (tenantId: number, params?: { type?: string; client_id?: number; carer_id?: number; status?: string; page?: number; limit?: number }) =>
    homecareApi.get<{ documents: Document[]; pagination: any }>(`/tenants/${tenantId}/documents`, { params }),

  getById: (tenantId: number, documentId: number) =>
    homecareApi.get<Document>(`/tenants/${tenantId}/documents/${documentId}`),

  upload: (tenantId: number, formData: FormData) =>
    homecareApi.post<Document>(`/tenants/${tenantId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (tenantId: number, documentId: number, data: Partial<Document>) =>
    homecareApi.put<Document>(`/tenants/${tenantId}/documents/${documentId}`, data),

  delete: (tenantId: number, documentId: number) =>
    homecareApi.delete(`/tenants/${tenantId}/documents/${documentId}`),

  approve: (tenantId: number, documentId: number) =>
    homecareApi.post(`/tenants/${tenantId}/documents/${documentId}/approve`),

  reject: (tenantId: number, documentId: number, data: { reason: string }) =>
    homecareApi.post(`/tenants/${tenantId}/documents/${documentId}/reject`, data),

  getStats: (tenantId: number) =>
    homecareApi.get(`/tenants/${tenantId}/documents/stats`),

  getExpiring: (tenantId: number, params?: { days?: number }) =>
    homecareApi.get(`/tenants/${tenantId}/documents/expiring`, { params }),
};

// Invoice API
export const invoiceApi = {
  list: (tenantId: number, params?: { client_id?: number; status?: string; start_date?: string; end_date?: string }) =>
    homecareApi.get<Invoice[]>(`/tenants/${tenantId}/invoices`, { params }),

  getById: (tenantId: number, invoiceId: number) =>
    homecareApi.get<Invoice>(`/tenants/${tenantId}/invoices/${invoiceId}`),

  create: (tenantId: number, data: Partial<Invoice> & { generate_from_visits?: boolean; period_start?: string; period_end?: string }) =>
    homecareApi.post<Invoice>(`/tenants/${tenantId}/invoices`, data),

  addItem: (tenantId: number, invoiceId: number, data: Partial<InvoiceItem>) =>
    homecareApi.post<InvoiceItem>(`/tenants/${tenantId}/invoices/${invoiceId}/items`, data),

  send: (tenantId: number, invoiceId: number) =>
    homecareApi.post(`/tenants/${tenantId}/invoices/${invoiceId}/send`),

  recordPayment: (tenantId: number, invoiceId: number, data: { amount: number; payment_date: string; payment_method: string; notes?: string }) =>
    homecareApi.post(`/tenants/${tenantId}/invoices/${invoiceId}/payments`, data),

  cancel: (tenantId: number, invoiceId: number) =>
    homecareApi.post(`/tenants/${tenantId}/invoices/${invoiceId}/cancel`),

  getSummary: (tenantId: number, params?: { start_date?: string; end_date?: string }) =>
    homecareApi.get(`/tenants/${tenantId}/invoices/summary`, { params }),
};

// Dashboard API
export const homecareDashboardApi = {
  getStats: (tenantId: number) =>
    homecareApi.get<DashboardStats>(`/tenants/${tenantId}/dashboard`),
};

// Settings API
export const settingsApi = {
  get: (tenantId: number) =>
    homecareApi.get<TenantSettings>(`/tenants/${tenantId}/settings`),

  update: (tenantId: number, data: Partial<TenantSettings>) =>
    homecareApi.put<TenantSettings>(`/tenants/${tenantId}/settings`, data),

  getIntegrationStatus: (tenantId: number) =>
    homecareApi.get(`/tenants/${tenantId}/integration/status`),

  enableIntegration: (tenantId: number) =>
    homecareApi.post(`/tenants/${tenantId}/integration/enable`),

  disableIntegration: (tenantId: number) =>
    homecareApi.post(`/tenants/${tenantId}/integration/disable`),

  exportClients: (tenantId: number) =>
    homecareApi.get(`/tenants/${tenantId}/export/clients`, { responseType: 'blob' }),

  exportCarers: (tenantId: number) =>
    homecareApi.get(`/tenants/${tenantId}/export/carers`, { responseType: 'blob' }),

  exportVisits: (tenantId: number, params: { start_date: string; end_date: string }) =>
    homecareApi.get(`/tenants/${tenantId}/export/visits`, { params, responseType: 'blob' }),
};

export default homecareApi;
