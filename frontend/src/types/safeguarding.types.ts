/**
 * Safeguarding Types
 *
 * Critical safety feature for reporting and managing safeguarding concerns
 */

export type IncidentType =
  | 'child_safety'
  | 'vulnerable_adult'
  | 'abuse'
  | 'neglect'
  | 'harassment'
  | 'unsafe_environment'
  | 'medical_concern'
  | 'other';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus = 'submitted' | 'under_review' | 'investigating' | 'resolved' | 'closed';

export interface SafeguardingReport {
  report_id: number;
  tenant_id: number;
  driver_id: number;
  customer_id?: number | null;
  incident_type: IncidentType;
  severity: SeverityLevel;
  incident_date: string;
  location: string;
  description: string;
  action_taken: string;
  confidential: boolean;
  status: ReportStatus;
  assigned_to?: number | null;
  investigation_notes?: string | null;
  resolution?: string | null;
  resolved_date?: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined data
  driver_name?: string;
  driver_phone?: string;
  customer_name?: string;
  customer_address?: string;
  assigned_to_name?: string;
}

export interface CreateSafeguardingReportDto {
  driver_id: number;
  incident_type: IncidentType;
  severity: SeverityLevel;
  customer_id?: number;
  location: string;
  incident_date: string;
  description: string;
  action_taken?: string;
  confidential?: boolean;
}

export interface UpdateSafeguardingReportDto {
  status?: ReportStatus;
  assigned_to?: number | null;
  investigation_notes?: string;
  resolution?: string;
}

export interface SafeguardingReportsQuery {
  status?: ReportStatus;
  severity?: SeverityLevel;
  driver_id?: number;
  from_date?: string;
  to_date?: string;
}

export interface SafeguardingReportsResponse {
  reports: SafeguardingReport[];
  total: number;
}

export interface SafeguardingStats {
  total: number;
  by_status: {
    submitted: number;
    under_review: number;
    investigating: number;
    resolved: number;
    closed: number;
  };
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  recent_reports: number; // last 30 days
  critical_reports: number; // unresolved critical/high
}
