/**
 * Social Outings API Service
 *
 * Handles all API calls for social outings, bookings, and rotas
 */

import api from './api';
import {
  SocialOuting,
  OutingBooking,
  OutingRota,
  OutingStats,
  OutingFormData,
  BookingFormData,
  RotaFormData,
  PassengerAssignmentData,
  AvailabilityCheck
} from '../types';

const BASE_PATH = '/tenants';

/**
 * Social Outings API
 */
export const socialOutingsApi = {
  // ========================================
  // Outings Management
  // ========================================

  /**
   * Get all outings for a tenant
   */
  getOutings: async (tenantId: number): Promise<SocialOuting[]> => {
    const response = await api.get(`${BASE_PATH}/${tenantId}/outings`);
    return response.data;
  },

  /**
   * Get a single outing by ID
   */
  getOuting: async (tenantId: number, outingId: number): Promise<SocialOuting> => {
    const response = await api.get(`${BASE_PATH}/${tenantId}/outings/${outingId}`);
    return response.data;
  },

  /**
   * Create a new outing
   */
  createOuting: async (tenantId: number, data: OutingFormData): Promise<SocialOuting> => {
    const response = await api.post(`${BASE_PATH}/${tenantId}/outings`, data);
    return response.data;
  },

  /**
   * Update an existing outing
   */
  updateOuting: async (tenantId: number, outingId: number, data: Partial<OutingFormData>): Promise<SocialOuting> => {
    const response = await api.put(`${BASE_PATH}/${tenantId}/outings/${outingId}`, data);
    return response.data;
  },

  /**
   * Delete an outing (cascades to bookings and rotas)
   */
  deleteOuting: async (tenantId: number, outingId: number): Promise<void> => {
    await api.delete(`${BASE_PATH}/${tenantId}/outings/${outingId}`);
  },

  /**
   * Get outing statistics
   */
  getOutingStats: async (tenantId: number): Promise<OutingStats> => {
    const response = await api.get(`${BASE_PATH}/${tenantId}/outings/stats`);
    return response.data;
  },

  // ========================================
  // Bookings Management
  // ========================================

  /**
   * Get all bookings for an outing
   */
  getBookings: async (tenantId: number, outingId: number): Promise<OutingBooking[]> => {
    const response = await api.get(`${BASE_PATH}/${tenantId}/outings/${outingId}/bookings`);
    return response.data;
  },

  /**
   * Create a new booking
   */
  createBooking: async (
    tenantId: number,
    outingId: number,
    data: BookingFormData
  ): Promise<OutingBooking> => {
    const response = await api.post(`${BASE_PATH}/${tenantId}/outings/${outingId}/bookings`, data);
    return response.data;
  },

  /**
   * Cancel a booking
   */
  cancelBooking: async (
    tenantId: number,
    outingId: number,
    bookingId: number,
    cancellation_reason?: string
  ): Promise<OutingBooking> => {
    const response = await api.put(
      `${BASE_PATH}/${tenantId}/outings/${outingId}/bookings/${bookingId}/cancel`,
      { cancellation_reason }
    );
    return response.data;
  },

  /**
   * Get bookings for a specific customer
   */
  getCustomerBookings: async (tenantId: number, customerId: number): Promise<OutingBooking[]> => {
    const response = await api.get(`${BASE_PATH}/${tenantId}/social-outings/bookings`, {
      params: { customerId }
    });
    return response.data;
  },

  // ========================================
  // Rotas Management
  // ========================================

  /**
   * Get all rotas (driver assignments) for an outing
   */
  getRotas: async (tenantId: number, outingId: number): Promise<OutingRota[]> => {
    const response = await api.get(`${BASE_PATH}/${tenantId}/outings/${outingId}/rotas`);
    return response.data;
  },

  /**
   * Assign a driver to an outing
   */
  createRota: async (
    tenantId: number,
    outingId: number,
    data: RotaFormData
  ): Promise<OutingRota> => {
    const response = await api.post(`${BASE_PATH}/${tenantId}/outings/${outingId}/rotas`, data);
    return response.data;
  },

  /**
   * Update passenger assignments for a driver
   */
  updateRotaPassengers: async (
    tenantId: number,
    outingId: number,
    rotaId: number,
    data: PassengerAssignmentData
  ): Promise<OutingRota> => {
    const response = await api.put(
      `${BASE_PATH}/${tenantId}/outings/${outingId}/rotas/${rotaId}/passengers`,
      data
    );
    return response.data;
  },

  /**
   * Remove a driver from an outing
   */
  deleteRota: async (tenantId: number, outingId: number, rotaId: number): Promise<void> => {
    await api.delete(`${BASE_PATH}/${tenantId}/outings/${outingId}/rotas/${rotaId}`);
  },

  // ========================================
  // Availability Checking
  // ========================================

  /**
   * Check if a customer is available on a specific date
   */
  checkCustomerAvailability: async (
    tenantId: number,
    customerId: number,
    date: string
  ): Promise<AvailabilityCheck> => {
    const response = await api.get(
      `${BASE_PATH}/${tenantId}/customers/${customerId}/availability/${date}`
    );
    return response.data;
  },

  /**
   * Check if a driver is available on a specific date/time
   */
  checkDriverAvailability: async (
    tenantId: number,
    driverId: number,
    date: string,
    time?: string
  ): Promise<AvailabilityCheck> => {
    const response = await api.get(
      `${BASE_PATH}/${tenantId}/drivers/${driverId}/availability/${date}`,
      { params: time ? { time } : undefined }
    );
    return response.data;
  },
};

export default socialOutingsApi;
