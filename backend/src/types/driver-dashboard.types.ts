/**
 * Driver Dashboard Types
 *
 * TypeScript interfaces for driver dashboard data structures
 */

export interface Alert {
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  daysRemaining?: number;
  actionRequired: boolean;
  category?: string;
  items?: AlertItem[];
}

export interface AlertItem {
  type: string;
  description: string;
  due_date?: string;
  severity?: string;
}

export interface HolidayAlert {
  request_id: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: string;
  requested_at: string;
}

export interface PermitInfo {
  permit_type: string;
  expiry_date: string;
  [key: string]: unknown;
}

export interface MaintenanceRecord {
  maintenance_id: number;
  maintenance_type: string;
  description: string;
  due_date: string;
  completed: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  [key: string]: unknown;
}

export interface FuelSubmission {
  fuel_id: number;
  date: string;
  litres: string | number;
  cost: string | number;
  odometer_reading: number;
  status: 'pending' | 'approved' | 'rejected';
  location?: string;
  [key: string]: unknown;
}

export interface TripRecord {
  trip_id: number;
  trip_date: string;
  pickup_time: string;
  customer_name: string;
  pickup_location: string;
  destination: string;
  status: string;
  passengers?: number;
  [key: string]: unknown;
}

export interface FuelUsageRecord {
  fuel_id: number;
  date: string;
  litres: string | number;
  cost: string | number;
  price_per_litre: number;
  location?: string;
  [key: string]: unknown;
}

export interface MonthlyFuelUsage {
  month: string;
  totalLitres: number;
  totalCost: number;
  averagePrice: number;
  count: number;
}

export interface VehicleAssignment {
  vehicle_id: number;
  registration_number: string;
  make: string;
  model: string;
  assigned_from: string;
  assigned_until?: string;
  [key: string]: unknown;
}

export interface TrainingType {
  training_type_id: number;
  type_name: string;
  description?: string;
  is_mandatory: boolean;
  validity_period_months?: number;
  [key: string]: unknown;
}

export interface TrainingRecord {
  training_record_id: number;
  training_type_id: number;
  completion_date: string;
  expiry_date?: string;
  certificate_number?: string;
  provider?: string;
  [key: string]: unknown;
}

export interface TrainingStatus {
  trainingType: string;
  status: 'valid' | 'expiring_soon' | 'expired' | 'not_completed';
  completionDate?: string;
  expiryDate?: string;
  daysRemaining?: number;
  isMandatory: boolean;
}

export interface PriorityOrder {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface DashboardOverview {
  driver: Record<string, unknown>;
  upcomingTrips: number;
  completedThisWeek: number;
  pendingHoursApproval: boolean;
  activeHolidays: number;
  recentAlerts: HolidayAlert[];
}

export interface MaintenanceSummary {
  vehicleInfo: Record<string, unknown> | null;
  upcomingMaintenance: MaintenanceRecord[];
  alerts: Alert[];
  summary: {
    criticalAlerts: number;
    completedLastSixMonths: number;
    upcomingCount: number;
  };
}

export interface FuelSummary {
  summary: {
    totalSubmissions: number;
    totalCost: string;
    totalLitres: string;
    averageCostPerLitre: string;
    pendingReimbursement: string;
    pendingCount: number;
    approvedCount: number;
  };
  fuelSubmissions: FuelSubmission[];
  recentTrips: TripRecord[];
}

export interface FuelUsageSummary {
  statistics: {
    totalLitres: number;
    totalCost: number;
    averagePricePerLitre: number;
    monthlyAverage: number;
  };
  monthlyBreakdown: MonthlyFuelUsage[];
  recentUsage: FuelUsageRecord[];
}

export interface VehicleSummary {
  currentVehicle: Record<string, unknown> | null;
  assignmentHistory: VehicleAssignment[];
}

export interface TrainingSummary {
  summary: {
    totalTrainingTypes: number;
    mandatoryCount: number;
    completedCount: number;
    expiringCount: number;
  };
  trainingStatus: TrainingStatus[];
  alerts: Alert[];
  recentTraining: TrainingRecord[];
}
