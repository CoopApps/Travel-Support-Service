/**
 * Care Visit Types for Home Care Co-operative System
 *
 * Represents scheduled and completed care visits.
 */

/**
 * Care Visit entity
 */
export interface CareVisit {
  id: number;
  tenantId: number;

  // Who
  clientId: number;
  carerId?: number;         // Assigned carer
  actualCarerId?: number;   // Who actually attended (if different)

  // When
  scheduledDate: Date;
  scheduledStartTime: string;   // HH:mm
  scheduledEndTime: string;     // HH:mm
  scheduledDuration: number;    // minutes

  actualStartTime?: Date;
  actualEndTime?: Date;
  actualDuration?: number;

  // What
  visitType: 'regular' | 'assessment' | 'review' | 'emergency' | 'respite';
  carePlanId?: number;
  tasks: VisitTask[];

  // Status
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'missed' | 'late';
  cancellationReason?: string;
  cancelledBy?: number;
  cancelledAt?: Date;

  // Notes
  preVisitNotes?: string;
  visitNotes?: string;
  privateNotes?: string;        // Not visible to client/family

  // Alerts and concerns
  alerts?: VisitAlert[];
  safeguardingConcern?: boolean;
  safeguardingNotes?: string;

  // Medications
  medicationsAdministered?: MedicationAdministration[];

  // Check-in/out
  checkInTime?: Date;
  checkInLocation?: GeoLocation;
  checkOutTime?: Date;
  checkOutLocation?: GeoLocation;
  checkInMethod: 'app' | 'nfc' | 'qr' | 'manual' | 'landline';

  // Mileage
  milesClaimed?: number;
  travelTime?: number;          // minutes

  // Signatures
  clientSignature?: string;     // Base64
  carerSignature?: string;

  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  updatedBy?: number;
}

/**
 * Task within a visit
 */
export interface VisitTask {
  id: string;
  name: string;
  category: 'personal_care' | 'medication' | 'nutrition' | 'mobility' | 'domestic' | 'social' | 'health' | 'other';
  description?: string;
  required: boolean;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
  outcome?: 'completed' | 'partial' | 'refused' | 'not_required' | 'unable';
}

/**
 * Alert during a visit
 */
export interface VisitAlert {
  type: 'fall' | 'skin_concern' | 'mood_change' | 'appetite' | 'medication_issue' | 'other';
  severity: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  reportedAt: Date;
  actionTaken?: string;
  escalatedTo?: string;
}

/**
 * Medication administration record
 */
export interface MedicationAdministration {
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  administeredTime?: string;
  administered: boolean;
  outcome: 'given' | 'refused' | 'not_available' | 'already_taken' | 'held' | 'other';
  notes?: string;
  witnessedBy?: string;
}

/**
 * Geographic location
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Create visit DTO
 */
export interface CreateVisitDto {
  clientId: number;
  carerId?: number;

  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;

  visitType: 'regular' | 'assessment' | 'review' | 'emergency' | 'respite';
  carePlanId?: number;
  tasks?: Partial<VisitTask>[];

  preVisitNotes?: string;
}

/**
 * Update visit DTO
 */
export interface UpdateVisitDto extends Partial<CreateVisitDto> {
  status?: string;
  visitNotes?: string;
  privateNotes?: string;
}

/**
 * Complete visit DTO (check-out)
 */
export interface CompleteVisitDto {
  actualEndTime?: string;
  tasks: { id: string; completed: boolean; outcome?: string; notes?: string }[];
  visitNotes?: string;
  privateNotes?: string;
  alerts?: Partial<VisitAlert>[];
  medicationsAdministered?: MedicationAdministration[];
  clientSignature?: string;
  carerSignature?: string;
  milesClaimed?: number;
  checkOutLocation?: GeoLocation;
}

/**
 * Visit list query parameters
 */
export interface VisitListQuery {
  page?: number;
  limit?: number;
  clientId?: number;
  carerId?: number;
  status?: string;
  visitType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Visit list response
 */
export interface VisitListResponse {
  visits: CareVisit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Daily schedule for a carer
 */
export interface DailySchedule {
  date: Date;
  carerId: number;
  carerName: string;
  visits: CareVisit[];
  totalHours: number;
  totalMiles?: number;
  gaps: TimeSlot[];
}

/**
 * Time slot (from carer types)
 */
interface TimeSlot {
  start: string;
  end: string;
}

/**
 * Visit summary statistics
 */
export interface VisitStats {
  totalScheduled: number;
  totalCompleted: number;
  totalCancelled: number;
  totalMissed: number;
  averageDuration: number;
  totalHours: number;
  completionRate: number;
  punctualityRate: number;
}
