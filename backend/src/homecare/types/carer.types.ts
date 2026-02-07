/**
 * Carer (Care Worker) Types for Home Care Co-operative System
 *
 * Represents care workers who are members of the co-operative.
 */

/**
 * Carer entity - a care worker
 */
export interface Carer {
  id: number;
  tenantId: number;
  userId?: number;        // Link to user account
  memberId?: number;      // Link to co-op membership

  // Personal details
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  // Contact details
  phone: string;
  email: string;
  address: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;

  // Employment details
  employeeId?: string;
  contractType: 'full_time' | 'part_time' | 'zero_hours' | 'bank' | 'self_employed';
  weeklyHours?: number;
  startDate: Date;
  endDate?: Date;
  probationEndDate?: Date;

  // Qualifications and training
  qualifications: Qualification[];
  dbsCheckDate?: Date;
  dbsCheckNumber?: string;
  dbsCheckStatus: 'valid' | 'pending' | 'expired' | 'not_required';
  rightToWorkVerified: boolean;
  rightToWorkExpiry?: Date;

  // Skills and capabilities
  skills: string[];
  languages: string[];
  canDrive: boolean;
  hasOwnVehicle: boolean;
  vehicleRegistration?: string;
  maxTravelDistance?: number;  // in miles

  // Availability
  availability: WeeklyAvailability;
  preferredAreas?: string[];   // Postcodes or areas
  maxClientsPerDay?: number;

  // Emergency contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;

  // Status
  isActive: boolean;
  status: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'training';

  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  updatedBy?: number;
}

/**
 * Qualification record
 */
export interface Qualification {
  name: string;
  level?: string;
  awardingBody?: string;
  dateAchieved?: Date;
  expiryDate?: Date;
  certificateNumber?: string;
  isRequired: boolean;
  status: 'valid' | 'expired' | 'pending' | 'not_started';
}

/**
 * Weekly availability pattern
 */
export interface WeeklyAvailability {
  monday?: DayAvailability;
  tuesday?: DayAvailability;
  wednesday?: DayAvailability;
  thursday?: DayAvailability;
  friday?: DayAvailability;
  saturday?: DayAvailability;
  sunday?: DayAvailability;
}

/**
 * Single day availability
 */
export interface DayAvailability {
  available: boolean;
  slots?: TimeSlot[];
}

/**
 * Time slot
 */
export interface TimeSlot {
  start: string;  // HH:mm
  end: string;    // HH:mm
}

/**
 * Create carer DTO
 */
export interface CreateCarerDto {
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  phone: string;
  email: string;
  address: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;

  contractType: 'full_time' | 'part_time' | 'zero_hours' | 'bank' | 'self_employed';
  weeklyHours?: number;
  startDate: string;

  canDrive?: boolean;
  hasOwnVehicle?: boolean;
  vehicleRegistration?: string;
  maxTravelDistance?: number;

  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;

  skills?: string[];
  languages?: string[];
}

/**
 * Update carer DTO
 */
export interface UpdateCarerDto extends Partial<CreateCarerDto> {}

/**
 * Carer list query parameters
 */
export interface CarerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  contractType?: string;
  hasSkill?: string;
  canDrive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Carer list response
 */
export interface CarerListResponse {
  carers: Carer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Training record
 */
export interface TrainingRecord {
  id: number;
  carerId: number;
  courseName: string;
  provider?: string;
  completedDate?: Date;
  expiryDate?: Date;
  certificateUrl?: string;
  status: 'completed' | 'in_progress' | 'booked' | 'expired' | 'required';
  isManadatory: boolean;
}

/**
 * DBS Check record
 */
export interface DBSCheck {
  id: number;
  carerId: number;
  checkType: 'basic' | 'standard' | 'enhanced' | 'enhanced_barred';
  certificateNumber: string;
  issueDate: Date;
  updateServiceRegistered: boolean;
  updateServiceExpiry?: Date;
  status: 'valid' | 'expired' | 'pending' | 'rejected';
  verifiedBy?: number;
  verifiedDate?: Date;
}
