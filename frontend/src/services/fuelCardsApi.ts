/**
 * Fuel Cards API Service
 * Handles all API calls related to fuel cards and transactions
 */

import apiClient from './api';
import {
  FuelCard,
  CreateFuelCardDto,
  UpdateFuelCardDto,
  FuelTransaction,
  CreateFuelTransactionDto,
  FuelCardStatsResponse,
  FuelTransactionsResponse
} from '../types/fuelCard.types';

// Get all fuel cards for the tenant
export const getFuelCards = async (tenantId: number): Promise<FuelCard[]> => {
  const response = await apiClient.get(`/tenants/${tenantId}/fuelcards`);
  return response.data;
};

// Create a new fuel card
export const createFuelCard = async (
  tenantId: number,
  cardData: CreateFuelCardDto
): Promise<FuelCard> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/fuelcards`,
    cardData
  );
  return response.data.fuelCard || response.data;
};

// Update an existing fuel card
export const updateFuelCard = async (
  tenantId: number,
  cardId: number,
  cardData: UpdateFuelCardDto
): Promise<FuelCard> => {
  const response = await apiClient.put(
    `/tenants/${tenantId}/fuelcards/${cardId}`,
    cardData
  );
  return response.data.fuelCard || response.data;
};

// Delete a fuel card
export const deleteFuelCard = async (
  tenantId: number,
  cardId: number
): Promise<void> => {
  await apiClient.delete(`/tenants/${tenantId}/fuelcards/${cardId}`);
};

// Get transactions for a specific fuel card
export const getFuelCardTransactions = async (
  tenantId: number,
  cardId: number,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<FuelTransactionsResponse> => {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);

  const response = await apiClient.get(
    `/tenants/${tenantId}/fuelcards/${cardId}/transactions?${params.toString()}`
  );
  return response.data;
};

// Create a new fuel transaction
export const createFuelTransaction = async (
  tenantId: number,
  transactionData: CreateFuelTransactionDto
): Promise<FuelTransaction> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/fuel-transactions`,
    transactionData
  );
  return response.data.transaction || response.data;
};

// Get fuel statistics
export const getFuelStatistics = async (
  tenantId: number,
  period: string = 'current_month'
): Promise<FuelCardStatsResponse> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/fuel-statistics?period=${period}`
  );
  return response.data;
};

// Get available drivers for fuel card assignment
export const getAvailableDrivers = async (
  tenantId: number,
  includeAssigned: boolean = true
): Promise<any[]> => {
  const params = includeAssigned ? '' : '?include_assigned=false';
  const response = await apiClient.get(
    `/tenants/${tenantId}/fuelcards/available-drivers${params}`
  );
  return response.data;
};

// Get available vehicles for fuel card assignment
export const getAvailableVehicles = async (
  tenantId: number,
  includeAssigned: boolean = true
): Promise<any[]> => {
  const params = includeAssigned ? '' : '?include_assigned=false';
  const response = await apiClient.get(
    `/tenants/${tenantId}/fuelcards/available-vehicles${params}`
  );
  return response.data;
};

// Export fuel data
export const exportFuelData = async (
  tenantId: number,
  options?: {
    format?: 'csv' | 'json';
    startDate?: string;
    endDate?: string;
  }
): Promise<string | any> => {
  const params = new URLSearchParams();
  if (options?.format) params.append('format', options.format);
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);

  const response = await apiClient.get(
    `/tenants/${tenantId}/fuelcards/export?${params.toString()}`
  );

  return options?.format === 'csv' ? response.data : response.data;
};

// ============================================================================
// ENHANCED FEATURES - November 2025
// ============================================================================

/**
 * Archive a fuel card
 */
export const archiveFuelCard = async (
  tenantId: number,
  cardId: number,
  reason: string
): Promise<{ message: string; fuelCard: FuelCard }> => {
  const response = await apiClient.put(
    `/tenants/${tenantId}/fuelcards/${cardId}/archive`,
    { reason }
  );
  return response.data;
};

/**
 * Unarchive a fuel card
 */
export const unarchiveFuelCard = async (
  tenantId: number,
  cardId: number
): Promise<{ message: string; fuelCard: FuelCard }> => {
  const response = await apiClient.put(
    `/tenants/${tenantId}/fuelcards/${cardId}/unarchive`
  );
  return response.data;
};

/**
 * Get fuel cards with archive filter
 */
export const getFuelCardsWithFilter = async (
  tenantId: number,
  archived?: boolean
): Promise<FuelCard[]> => {
  let url = `/tenants/${tenantId}/fuelcards`;
  if (archived !== undefined) {
    url += `?archived=${archived}`;
  }
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * Enhanced bulk import with validation
 */
export const enhancedBulkImport = async (
  tenantId: number,
  importData: {
    provider_name?: string;
    validate_only: boolean;
    transactions: any[];
  }
): Promise<any> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/fuel-transactions/enhanced-import`,
    importData
  );
  return response.data;
};

/**
 * Get fuel reconciliation data
 */
export const getFuelReconciliation = async (
  tenantId: number,
  options?: {
    start_date?: string;
    end_date?: string;
  }
): Promise<any> => {
  const params = new URLSearchParams();
  if (options?.start_date) params.append('start_date', options.start_date);
  if (options?.end_date) params.append('end_date', options.end_date);

  const url = `/tenants/${tenantId}/fuel-reconciliation${
    params.toString() ? `?${params.toString()}` : ''
  }`;
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * Get advanced fuel analytics
 */
export const getFuelAnalytics = async (
  tenantId: number,
  period: string = '6'
): Promise<any> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/fuel-analytics?period=${period}`
  );
  return response.data;
};

/**
 * Get fuel spending analysis
 */
export const getFuelSpendingAnalysis = async (
  tenantId: number
): Promise<any> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/fuel-spending-analysis`
  );
  return response.data;
};
