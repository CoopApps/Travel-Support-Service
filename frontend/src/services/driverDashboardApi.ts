import apiClient from './api';

/**
 * Driver Dashboard API Service
 *
 * API calls for driver-facing dashboard functionality
 */

export const driverDashboardApi = {
  /**
   * Get driver dashboard overview
   */
  getOverview: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/driver-dashboard/${driverId}/overview`
    );
    return response.data;
  },

  /**
   * Get driver schedule
   */
  getSchedule: async (
    tenantId: number,
    driverId: number,
    startDate?: string,
    endDate?: string
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(
      `/tenants/${tenantId}/driver-dashboard/${driverId}/schedule?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get driver holidays
   */
  getHolidays: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/driver-dashboard/${driverId}/holidays`
    );
    return response.data;
  },

  /**
   * Get driver performance metrics
   */
  getPerformance: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/driver-dashboard/${driverId}/performance`
    );
    return response.data;
  },

  /**
   * Get driver alerts
   */
  getAlerts: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/driver-dashboard/${driverId}/alerts`
    );
    return response.data;
  },

  /**
   * Submit holiday request
   */
  submitHolidayRequest: async (
    tenantId: number,
    driverId: number,
    data: {
      startDate: string;
      endDate: string;
      type: string;
      notes?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/holiday-requests`,
      {
        driver_id: driverId,
        start_date: data.startDate,
        end_date: data.endDate,
        type: data.type,
        notes: data.notes,
      }
    );
    return response.data;
  },

  /**
   * Submit safeguarding report
   */
  submitSafeguardingReport: async (
    tenantId: number,
    driverId: number,
    data: {
      incidentType: string;
      severity: string;
      customerId?: number;
      location: string;
      incidentDate: string;
      description: string;
      actionTaken: string;
      confidential: boolean;
    }
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/safeguarding-reports`,
      {
        driver_id: driverId,
        incident_type: data.incidentType,
        severity: data.severity,
        customer_id: data.customerId,
        location: data.location,
        incident_date: data.incidentDate,
        description: data.description,
        action_taken: data.actionTaken,
        confidential: data.confidential,
      }
    );
    return response.data;
  },

  /**
   * Submit weekly hours (freelance drivers)
   */
  submitHours: async (
    tenantId: number,
    driverId: number,
    data: {
      weekEnding: string;
      regularHours: number;
      overtimeHours: number;
      notes?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/driver-hours`,
      {
        driver_id: driverId,
        week_ending: data.weekEnding,
        regular_hours: data.regularHours,
        overtime_hours: data.overtimeHours,
        notes: data.notes,
      }
    );
    return response.data;
  },

  /**
   * Submit fuel costs (freelance drivers)
   */
  submitFuelCosts: async (
    tenantId: number,
    driverId: number,
    data: {
      date: string;
      station: string;
      litres: number;
      cost: number;
      mileage?: number;
      notes?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/driver-fuel`,
      {
        driver_id: driverId,
        date: data.date,
        station: data.station,
        litres: data.litres,
        cost: data.cost,
        mileage: data.mileage,
        notes: data.notes,
      }
    );
    return response.data;
  },

  /**
   * Get driver messages
   */
  getMessages: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/drivers/${driverId}/messages`
    );
    return response.data;
  },

  /**
   * Mark message as read
   */
  markMessageAsRead: async (
    tenantId: number,
    driverId: number,
    messageId: number
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/drivers/${driverId}/messages/${messageId}/read`
    );
    return response.data;
  },

  /**
   * Get unread message count
   */
  getUnreadMessageCount: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/drivers/${driverId}/messages/unread-count`
    );
    return response.data;
  },

  /**
   * Send message to office
   */
  sendMessageToOffice: async (
    tenantId: number,
    driverId: number,
    data: {
      subject: string;
      message: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tenants/${tenantId}/drivers/${driverId}/messages-to-office`,
      data
    );
    return response.data;
  },

  /**
   * Get driver's messages sent to office
   */
  getMessagesToOffice: async (tenantId: number, driverId: number): Promise<any> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/drivers/${driverId}/messages-to-office`
    );
    return response.data;
  },
};
