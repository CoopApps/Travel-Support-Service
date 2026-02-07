/**
 * Client (Care Recipient) Types for Home Care Co-operative System
 *
 * Represents people receiving care services.
 */

/**
 * Client entity - a person receiving home care
 */
export interface Client {
  id: number;
  tenantId: number;

  // Personal details
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  // Contact details
  phone?: string;
  email?: string;
  address: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;

  // Medical information
  nhsNumber?: string;
  gpName?: string;
  gpSurgery?: string;
  gpPhone?: string;
  medicalConditions?: string[];
  allergies?: string[];
  medications?: Medication[];

  // Care requirements
  mobilityLevel: 'fully_mobile' | 'limited_mobility' | 'wheelchair' | 'bedbound';
  careLevel: 'low' | 'medium' | 'high' | 'complex';
  mentalCapacity?: 'full' | 'partial' | 'lacking';
  communicationNeeds?: string;
  dietaryRequirements?: string[];

  // Emergency contacts
  emergencyContacts: EmergencyContact[];

  // Care preferences
  preferredCarers?: number[];  // Carer IDs
  avoidCarers?: number[];      // Carer IDs to avoid
  keyholderDetails?: string;
  accessNotes?: string;

  // Status
  isActive: boolean;
  status: 'active' | 'on_hold' | 'hospital' | 'deceased' | 'transferred';
  startDate: Date;
  endDate?: Date;

  // Funding
  fundingSource: 'self_funded' | 'local_authority' | 'nhs_chc' | 'mixed';
  localAuthorityRef?: string;
  socialWorkerName?: string;
  socialWorkerPhone?: string;

  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  updatedBy?: number;
}

/**
 * Medication record
 */
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  route: 'oral' | 'topical' | 'injection' | 'inhaled' | 'other';
  prescribedBy?: string;
  startDate?: Date;
  endDate?: Date;
  administeredBy: 'self' | 'carer' | 'family' | 'nurse';
  notes?: string;
}

/**
 * Emergency contact
 */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  isPrimaryContact: boolean;
  hasKeyAccess: boolean;
  canMakeDecisions: boolean;  // Power of Attorney
}

/**
 * Create client DTO
 */
export interface CreateClientDto {
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  phone?: string;
  email?: string;
  address: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;

  nhsNumber?: string;
  gpName?: string;
  gpSurgery?: string;
  gpPhone?: string;
  medicalConditions?: string[];
  allergies?: string[];

  mobilityLevel: 'fully_mobile' | 'limited_mobility' | 'wheelchair' | 'bedbound';
  careLevel: 'low' | 'medium' | 'high' | 'complex';
  mentalCapacity?: 'full' | 'partial' | 'lacking';
  communicationNeeds?: string;
  dietaryRequirements?: string[];

  emergencyContacts: EmergencyContact[];

  fundingSource: 'self_funded' | 'local_authority' | 'nhs_chc' | 'mixed';
  localAuthorityRef?: string;
  socialWorkerName?: string;
  socialWorkerPhone?: string;
}

/**
 * Update client DTO
 */
export interface UpdateClientDto extends Partial<CreateClientDto> {}

/**
 * Client list query parameters
 */
export interface ClientListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  careLevel?: string;
  fundingSource?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Client list response
 */
export interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
