/**
 * Providers API Service
 */

import apiClient from './api';
import type {
  ProvidersStatsResponse,
  Provider,
  CreateProviderDto,
  UpdateProviderDto,
  ProviderDetailsResponse,
  ProviderInvoiceData
} from '../types';

/**
 * Get provider statistics and customer groupings
 */
export const getProviderStats = async (tenantId: number): Promise<ProvidersStatsResponse> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/providers/stats`
  );
  return response.data;
};

/**
 * Get provider directory (all providers)
 */
export const getProviderDirectory = async (tenantId: number): Promise<Provider[]> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/providers/directory`
  );
  return response.data;
};

/**
 * Create new provider
 */
export const createProvider = async (tenantId: number, data: CreateProviderDto): Promise<Provider> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/providers/directory`,
    data
  );
  return response.data;
};

/**
 * Update provider
 */
export const updateProvider = async (
  tenantId: number,
  providerId: number,
  data: UpdateProviderDto
): Promise<Provider> => {
  const response = await apiClient.put(
    `/tenants/${tenantId}/providers/directory/${providerId}`,
    data
  );
  return response.data;
};

/**
 * Delete provider (soft delete)
 */
export const deleteProvider = async (tenantId: number, providerId: number): Promise<void> => {
  await apiClient.delete(
    `/tenants/${tenantId}/providers/directory/${providerId}`
  );
};

/**
 * Get detailed provider information
 */
export const getProviderDetails = async (
  tenantId: number,
  providerName: string
): Promise<ProviderDetailsResponse> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/providers/${encodeURIComponent(providerName)}/details`
  );
  return response.data;
};

/**
 * Generate provider invoice data
 */
export const getProviderInvoice = async (
  tenantId: number,
  providerName: string,
  weekStart?: string
): Promise<ProviderInvoiceData> => {
  const params = weekStart ? `?weekStart=${weekStart}` : '';
  const response = await apiClient.get(
    `/tenants/${tenantId}/providers/${encodeURIComponent(providerName)}/invoice${params}`
  );
  return response.data;
};

const providersApi = {
  getProviderStats,
  getProviderDirectory,
  createProvider,
  updateProvider,
  deleteProvider,
  getProviderDetails,
  getProviderInvoice
};

export default providersApi;
