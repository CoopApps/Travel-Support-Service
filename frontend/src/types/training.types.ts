/**
 * Training Module Type Definitions
 *
 * Manages driver training, certifications, compliance tracking
 */

// Training Type (Course/Certification)
export interface TrainingType {
  id: number;
  name: string;
  description: string;
  category: TrainingCategory;
  validityPeriod: number; // months
  mandatory: boolean;
  created_at?: string;
  updated_at?: string;
}

// Training Categories (must match database constraint)
export type TrainingCategory =
  | 'Health & Safety'
  | 'Accessibility'
  | 'Safeguarding'
  | 'Professional Development'
  | 'Specialist Care'
  | 'Vehicle Safety'
  | 'Compliance'
  | 'Other';

// Training Record (Completion record for a driver)
export interface TrainingRecord {
  id: number;
  driverId: number;
  driverName: string;
  trainingTypeId: number;
  trainingTypeName: string;
  category: TrainingCategory;
  completedDate: string;
  expiryDate: string;
  instructor?: string;
  location?: string;
  certificateNumber?: string;
  notes?: string;
  provider?: string;
  status: TrainingStatus;
  daysUntilExpiry?: number;
  created_at?: string;
  updated_at?: string;
}

// Training Status
export type TrainingStatus = 'valid' | 'expiring' | 'expired';

// Driver Training Compliance
export interface DriverCompliance {
  driverId: number;
  driverName: string;
  requiredTraining: number;
  completedTraining: number;
  validTraining: number;
  expiredTraining: number;
  expiringTrainingCount: number;
  compliancePercentage: number;
  complianceStatus: ComplianceStatus;
  missingTraining: string[];
  expiringTraining: TrainingRecord[];
}

// Compliance Status
export type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant' | 'no-requirements';

// Training Overview Stats
export interface TrainingOverview {
  trainingTypes: {
    total: number;
    mandatory: number;
    optional: number;
  };
  trainingRecords: {
    total: number;
    valid: number;
    expired: number;
    expiring: number;
    urgentExpiring: number;
  };
  driverCompliance: {
    totalDrivers: number;
    fullyCompliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
    complianceRate: number;
  };
  alerts: {
    expired: number;
    expiringSoon: number;
    total: number;
  };
  activity: {
    recentCompletions: number;
  };
  summary: {
    totalRecords: number;
    alertsCount: number;
    compliancePercentage: number;
  };
}

// Training Alert
export interface TrainingAlert {
  id: number;
  driverId: number;
  driverName: string;
  trainingTypeId: number;
  trainingTypeName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  priority: 'urgent' | 'warning' | 'expired';
  category: TrainingCategory;
}

// Training Report Entry
export interface TrainingReportEntry {
  driverId: number;
  driverName: string;
  trainingTypeName: string;
  category: TrainingCategory;
  completedDate: string;
  expiryDate: string;
  status: TrainingStatus;
  daysUntilExpiry: number;
}

// DTOs for API requests

export interface CreateTrainingTypeDTO {
  name: string;
  description: string;
  category: TrainingCategory;
  validityPeriod: number;
  mandatory: boolean;
}

export interface UpdateTrainingTypeDTO {
  name?: string;
  description?: string;
  category?: TrainingCategory;
  validityPeriod?: number;
  mandatory?: boolean;
}

export interface CreateTrainingRecordDTO {
  driverId: number;
  trainingTypeId: number;
  completedDate: string;
  expiryDate?: string; // If not provided, calculated from validityPeriod
  instructor?: string;
  location?: string;
  certificateNumber?: string;
  notes?: string;
  provider?: string;
}

export interface UpdateTrainingRecordDTO {
  completedDate?: string;
  expiryDate?: string;
  instructor?: string;
  location?: string;
  certificateNumber?: string;
  notes?: string;
}

// Filters
export interface TrainingRecordsFilters {
  driverId?: number;
  trainingTypeId?: number;
  category?: TrainingCategory;
  status?: TrainingStatus;
  mandatory?: boolean;
  search?: string;
}

export interface TrainingComplianceFilters {
  complianceStatus?: ComplianceStatus;
  search?: string;
}
