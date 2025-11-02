/**
 * Holidays API Service
 * Handles all API calls related to holiday management
 */

import apiClient from './api';
import {
  HolidayRequest,
  HolidayBalance,
  HolidaySettings,
  HolidayOverview,
  HolidayCalendarDay,
  DriverAvailability,
  HolidayAlert,
  CreateHolidayRequestDto,
  UpdateHolidayRequestDto,
  UpdateHolidaySettingsDto,
  HolidayAvailabilityCheck
} from '../types/holiday.types';

// Get holiday overview/statistics
export const getHolidayOverview = async (tenantId: number): Promise<HolidayOverview> => {
  const response = await apiClient.get(`/tenants/${tenantId}/holidays`);
  return response.data;
};

// Get holiday settings
export const getHolidaySettings = async (tenantId: number): Promise<HolidaySettings> => {
  const response = await apiClient.get(`/tenants/${tenantId}/holiday-settings`);
  return response.data.settings || response.data;
};

// Update holiday settings
export const updateHolidaySettings = async (
  tenantId: number,
  settings: UpdateHolidaySettingsDto
): Promise<HolidaySettings> => {
  const response = await apiClient.put(
    `/tenants/${tenantId}/holiday-settings`,
    { settings }
  );
  return response.data.settings || response.data;
};

// Get all driver holiday balances
export const getHolidayBalances = async (tenantId: number): Promise<HolidayBalance[]> => {
  const response = await apiClient.get(`/tenants/${tenantId}/holiday-balances`);
  return response.data.balances || response.data;
};

// Update driver holiday balance (manual adjustment)
export const updateDriverHolidayBalance = async (
  tenantId: number,
  driverId: number,
  adjustment: number,
  reason: string
): Promise<HolidayBalance> => {
  const response = await apiClient.put(
    `/tenants/${tenantId}/drivers/${driverId}/holiday-balance`,
    { adjustment, reason }
  );
  return response.data;
};

// Get all holiday requests with optional filters
export const getHolidayRequests = async (
  tenantId: number,
  filters?: {
    status?: string;
    driver_id?: number;
    customer_id?: number;
    start_date?: string;
    end_date?: string;
  }
): Promise<HolidayRequest[]> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const response = await apiClient.get(
    `/tenants/${tenantId}/holiday-requests${params.toString() ? `?${params}` : ''}`
  );
  return response.data.requests || response.data;
};

// Create new holiday request
export const createHolidayRequest = async (
  tenantId: number,
  requestData: CreateHolidayRequestDto
): Promise<HolidayRequest> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/holiday-requests`,
    requestData
  );
  return response.data.request || response.data;
};

// Update holiday request (approve/reject/cancel)
export const updateHolidayRequest = async (
  tenantId: number,
  requestId: number,
  updateData: UpdateHolidayRequestDto
): Promise<HolidayRequest> => {
  const response = await apiClient.put(
    `/tenants/${tenantId}/holiday-requests/${requestId}`,
    updateData
  );
  return response.data.request || response.data;
};

// Get single holiday request
export const getHolidayRequest = async (
  tenantId: number,
  requestId: number
): Promise<HolidayRequest> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/holiday-requests/${requestId}`
  );
  return response.data;
};

// Get driver alerts (recent approvals/rejections)
export const getDriverAlerts = async (
  tenantId: number,
  driverId: number
): Promise<HolidayAlert[]> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/drivers/${driverId}/alerts`
  );
  return response.data.alerts || response.data;
};

// Get available drivers for a specific date
export const getAvailableDrivers = async (
  tenantId: number,
  date: string
): Promise<DriverAvailability[]> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/drivers/available?date=${date}`
  );
  return response.data.drivers || response.data;
};

// Get holiday calendar for a specific month
export const getHolidayCalendar = async (
  tenantId: number,
  year: number,
  month: number
): Promise<HolidayCalendarDay[]> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/holiday-calendar/${year}/${month}`
  );
  return response.data.calendar || response.data;
};

// Check availability/conflicts for a date range
export const checkHolidayAvailability = async (
  tenantId: number,
  data: {
    start_date: string;
    end_date: string;
    driver_id?: number;
    customer_id?: number;
  }
): Promise<HolidayAvailabilityCheck> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/holiday-availability-check`,
    data
  );
  return response.data;
};
