/**
 * Permit Type Definitions
 * Handles driver permits, roles, and organizational permits
 */

export type PermitType = 'dbs' | 'section19' | 'section22' | 'mot';
export type OrganizationalPermitType = 'section19' | 'section22';

export interface DriverPermit {
  hasPermit: boolean;
  expiryDate?: string;
  issueDate?: string;
  notes?: string;
}

export interface DriverPermits {
  dbs: DriverPermit;
  section19: DriverPermit;
  section22: DriverPermit;
  mot: DriverPermit;
}

export interface DriverRole {
  vulnerablePassengers: boolean;
  section19Driver: boolean;
  section22Driver: boolean;
  vehicleOwner: boolean;
}

export interface OrganizationalPermit {
  id?: number;
  permit_id?: number;
  permit_type: OrganizationalPermitType;
  organisation_name: string;
  permit_number: string;
  issue_date?: string;
  expiry_date: string;
  notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PermitsOverview {
  organizational: {
    totalPermits: number;
    section19Count: number;
    section22Count: number;
    expiredCount: number;
    expiringCount: number;
  };
  drivers: {
    totalDrivers: number;
    driversWithPermits: number;
    totalDriverPermits: number;
    expiredDriverPermits: number;
    expiringDriverPermits: number;
  };
  summary: {
    totalPermits: number;
    alertsCount: number;
  };
}

export interface PermitsStats {
  drivers: {
    total: number;
    compliant: number;
    expiring: number;
    expired: number;
    missing: number;
  };
  organizational: {
    section19: {
      total: number;
      expiring: number;
      expired: number;
    };
    section22: {
      total: number;
      expiring: number;
      expired: number;
    };
  };
}

export interface DriverPermitsData {
  driverPermits: Record<number, DriverPermits>;
  driverRoles: Record<number, DriverRole>;
}

export interface OrganizationalPermitsData {
  section19: OrganizationalPermit[];
  section22: OrganizationalPermit[];
}

export interface CreateOrganizationalPermitDto {
  permit_type: OrganizationalPermitType;
  organisation_name: string;
  permit_number: string;
  issue_date?: string;
  expiry_date: string;
  notes?: string;
}

export interface UpdateOrganizationalPermitDto extends Partial<CreateOrganizationalPermitDto> {}

export interface PermitStatus {
  text: string;
  color: string;
  level: 'ok' | 'warning' | 'expired' | 'missing';
}

export interface ComplianceStatus {
  text: string;
  color: string;
}
