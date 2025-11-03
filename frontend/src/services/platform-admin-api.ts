import axios, { AxiosInstance } from 'axios';
import type {
  PlatformAdminLoginDto,
  PlatformAdminLoginResponse,
  CreateTenantDto,
  UpdateTenantDto,
  TenantListQuery,
  TenantListResponse,
  PlatformStats
} from '../types';

/**
 * Platform Admin API Service
 *
 * Handles all API calls for platform administration
 */

// Create axios instance for platform admin
const platformAdminClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add platform admin token
platformAdminClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('platformAdminToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
platformAdminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth state and redirect to login
      localStorage.removeItem('platformAdminToken');
      localStorage.removeItem('platformAdmin');
      window.location.href = '/platform-admin/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Platform Admin Authentication API
 */
export const platformAuthApi = {
  login: async (credentials: PlatformAdminLoginDto): Promise<PlatformAdminLoginResponse> => {
    const response = await platformAdminClient.post<PlatformAdminLoginResponse>(
      '/platform-admin/login',
      credentials
    );
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('platformAdminToken');
    localStorage.removeItem('platformAdmin');
  },
};

/**
 * Tenant Management API
 */
export const tenantApi = {
  /**
   * Get all tenants with pagination and filtering
   */
  getTenants: async (query?: TenantListQuery): Promise<TenantListResponse> => {
    const response = await platformAdminClient.get<TenantListResponse>(
      '/platform-admin/tenants',
      { params: query }
    );
    return response.data;
  },

  /**
   * Get platform statistics
   */
  getStats: async (): Promise<PlatformStats> => {
    const response = await platformAdminClient.get<PlatformStats>(
      '/platform-admin/stats'
    );
    return response.data;
  },

  /**
   * Create a new tenant
   */
  createTenant: async (data: CreateTenantDto): Promise<{ tenant_id: number; company_name: string; subdomain: string; message: string }> => {
    const response = await platformAdminClient.post(
      '/platform-admin/tenants',
      data
    );
    return response.data;
  },

  /**
   * Update an existing tenant
   */
  updateTenant: async (tenantId: number, data: UpdateTenantDto): Promise<{ message: string }> => {
    const response = await platformAdminClient.put(
      `/platform-admin/tenants/${tenantId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a tenant (soft delete)
   */
  deleteTenant: async (tenantId: number): Promise<{ message: string; tenantId: number; companyName: string }> => {
    const response = await platformAdminClient.delete(
      `/platform-admin/tenants/${tenantId}`
    );
    return response.data;
  },

  /**
   * Get users for a tenant
   */
  getTenantUsers: async (tenantId: number): Promise<any[]> => {
    const response = await platformAdminClient.get(
      `/platform-admin/tenants/${tenantId}/users`
    );
    return response.data;
  },

  /**
   * Reset user password
   */
  resetUserPassword: async (tenantId: number, userId: number): Promise<{ username: string; temporaryPassword: string; emailSent: boolean }> => {
    const response = await platformAdminClient.post(
      `/platform-admin/tenants/${tenantId}/users/${userId}/reset-password`
    );
    return response.data;
  },
};

export default platformAdminClient;
