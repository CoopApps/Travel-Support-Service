import apiClient from './api';

// Driver Profitability
export interface DriverProfitabilityRow {
  driver_id: number;
  driver_name: string;
  total_trips: number;
  total_revenue: number;
  total_costs: number;
  profit: number;
  profit_margin_percent: number;
  avg_profit_per_trip: number;
}

export const getDriverProfitability = async (
  tenantId: number,
  options?: {
    start_date?: string;
    end_date?: string;
  }
): Promise<DriverProfitabilityRow[]> => {
  const params = new URLSearchParams();
  if (options?.start_date) params.append('start_date', options.start_date);
  if (options?.end_date) params.append('end_date', options.end_date);

  const url = `/tenants/${tenantId}/admin/analytics/driver-profitability${
    params.toString() ? `?${params.toString()}` : ''
  }`;

  const response = await apiClient.get(url);
  return response.data;
};

// Trip Profitability
export interface TripProfitabilityRow {
  schedule_id: number;
  trip_date: string;
  customer_name: string;
  driver_name: string;
  vehicle_registration: string;
  revenue: number;
  costs: number;
  profit: number;
  profit_margin_percent: number;
}

export const getTripProfitability = async (
  tenantId: number,
  options?: {
    start_date?: string;
    end_date?: string;
    driver_id?: number;
    customer_id?: number;
  }
): Promise<TripProfitabilityRow[]> => {
  const params = new URLSearchParams();
  if (options?.start_date) params.append('start_date', options.start_date);
  if (options?.end_date) params.append('end_date', options.end_date);
  if (options?.driver_id) params.append('driver_id', options.driver_id.toString());
  if (options?.customer_id) params.append('customer_id', options.customer_id.toString());

  const url = `/tenants/${tenantId}/admin/analytics/trip-profitability${
    params.toString() ? `?${params.toString()}` : ''
  }`;

  const response = await apiClient.get(url);
  return response.data;
};

// Overall Profitability Dashboard
export interface ProfitabilityDashboard {
  period_summary: {
    total_revenue: number;
    total_costs: number;
    net_profit: number;
    profit_margin_percent: number;
  };
  cost_breakdown: {
    fuel_costs: number;
    driver_costs: number;
    vehicle_costs: number;
    other_costs: number;
  };
  trends: Array<{
    month: string;
    revenue: number;
    costs: number;
    profit: number;
  }>;
  recommendations: string[];
}

export const getProfitabilityDashboard = async (
  tenantId: number,
  options?: {
    months?: number;
  }
): Promise<ProfitabilityDashboard> => {
  const params = new URLSearchParams();
  if (options?.months) params.append('months', options.months.toString());

  const url = `/tenants/${tenantId}/admin/analytics/profitability-dashboard${
    params.toString() ? `?${params.toString()}` : ''
  }`;

  const response = await apiClient.get(url);
  return response.data;
};
