import apiClient from './api';

/**
 * Customer Dashboard API Service
 *
 * API calls for customer-facing dashboard functionality
 */

export const customerDashboardApi = {
  /**
   * Get customer dashboard overview
   */
  getOverview: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/overview`
    );
    return response.data;
  },

  /**
   * Get customer bookings (upcoming journeys)
   */
  getBookings: async (
    tenantId: number,
    customerId: number,
    days?: number
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (days) params.append('days', days.toString());

    const response = await apiClient.get(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/bookings?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get customer journey history
   */
  getJourneyHistory: async (
    tenantId: number,
    customerId: number,
    days?: number
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (days) params.append('days', days.toString());

    const response = await apiClient.get(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/journey-history?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get customer profile
   */
  getProfile: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/profile`
    );
    return response.data;
  },

  /**
   * Update customer profile
   */
  updateProfile: async (
    tenantId: number,
    customerId: number,
    data: {
      phone?: string;
      email?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.put(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/profile`,
      data
    );
    return response.data;
  },

  /**
   * Submit journey request (ad-hoc journey)
   */
  submitJourneyRequest: async (
    tenantId: number,
    customerId: number,
    data: {
      destination: string;
      date: string;
      time: string;
      type?: string;
      notes?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/journey-requests`,
      data
    );
    return response.data;
  },

  /**
   * Get customer alerts
   */
  getAlerts: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/alerts`
    );
    return response.data;
  },

  /**
   * Get messages from office
   */
  getMessages: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/messages`
    );
    return response.data;
  },

  /**
   * Get messages sent to office
   */
  getMessagesToOffice: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/messages-to-office`
    );
    return response.data;
  },

  /**
   * Send message to office
   */
  sendMessageToOffice: async (
    tenantId: number,
    customerId: number,
    data: {
      subject: string;
      message: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/messages-to-office`,
      data
    );
    return response.data;
  },

  /**
   * Mark message as read
   */
  markMessageAsRead: async (
    tenantId: number,
    customerId: number,
    messageId: number
  ): Promise<any> => {
    const response = await apiClient.put(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/messages/${messageId}/read`
    );
    return response.data;
  },

  /**
   * Get upcoming social outings
   */
  getSocialOutings: async (tenantId: number, customerId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/social-outings`
    );
    return response.data;
  },

  /**
   * Book onto a social outing
   */
  bookSocialOuting: async (
    tenantId: number,
    customerId: number,
    outingId: number,
    data: {
      special_requirements?: string;
      dietary_requirements?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/social-outings/${outingId}/book`,
      data
    );
    return response.data;
  },

  /**
   * Cancel social outing booking
   */
  cancelSocialOuting: async (
    tenantId: number,
    customerId: number,
    outingId: number
  ): Promise<any> => {
    const response = await apiClient.delete(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/social-outings/${outingId}/cancel`
    );
    return response.data;
  },

  /**
   * Suggest a new social outing
   */
  suggestSocialOuting: async (
    tenantId: number,
    customerId: number,
    data: {
      name: string;
      description: string;
      suggested_date?: string;
      suggested_location?: string;
      notes?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/customer-dashboard/${customerId}/social-outings/suggest`,
      data
    );
    return response.data;
  },
};
