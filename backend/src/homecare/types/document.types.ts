/**
 * Document Types for Home Care Co-operative System
 *
 * Handles care documentation, policies, client records, and compliance documents.
 */

/**
 * Document categories for home care
 */
export type DocumentCategory =
  | 'policy'           // Company policies
  | 'procedure'        // Care procedures
  | 'care_plan'        // Care plan documents
  | 'assessment'       // Client assessments
  | 'risk_assessment'  // Risk assessments
  | 'medication'       // MAR sheets, medication records
  | 'incident'         // Incident reports
  | 'safeguarding'     // Safeguarding concerns
  | 'training'         // Training certificates
  | 'compliance'       // CQC compliance docs
  | 'contract'         // Client contracts
  | 'consent'          // Consent forms
  | 'identity'         // ID documents
  | 'dbs'              // DBS certificates
  | 'insurance'        // Insurance documents
  | 'other';

/**
 * Document access levels
 */
export type DocumentAccessLevel =
  | 'public'           // All staff can view
  | 'staff'            // All care staff
  | 'management'       // Managers only
  | 'admin'            // Admins only
  | 'confidential'     // Named individuals only
  | 'client_specific'; // Only staff assigned to that client

/**
 * Document status
 */
export type DocumentStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'archived'
  | 'expired';

/**
 * Document entity
 */
export interface Document {
  id: number;
  tenantId: number;

  // Basic info
  title: string;
  description?: string;
  category: DocumentCategory;

  // File info
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  checksum?: string;

  // Associations
  clientId?: number;
  carerId?: number;
  visitId?: number;
  carePlanId?: number;

  // Access control
  accessLevel: DocumentAccessLevel;
  accessUserIds?: number[];

  // Versioning
  version: number;
  previousVersionId?: number;

  // Review/approval
  status: DocumentStatus;
  reviewedBy?: number;
  reviewedAt?: Date;
  approvedBy?: number;
  approvedAt?: Date;

  // Expiry
  expiryDate?: Date;
  reminderDate?: Date;
  reminderSent?: boolean;

  // Metadata
  tags?: string[];
  metadata?: Record<string, any>;

  // Audit
  uploadedBy: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Document audit log entry
 */
export interface DocumentAuditEntry {
  id: number;
  documentId: number;
  tenantId: number;
  userId: number;
  action: 'created' | 'viewed' | 'downloaded' | 'updated' | 'deleted' | 'shared' | 'approved' | 'rejected';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Document share record
 */
export interface DocumentShare {
  id: number;
  documentId: number;
  tenantId: number;
  sharedBy: number;
  sharedWith: number;
  accessType: 'view' | 'download' | 'edit';
  expiresAt?: Date;
  accessedAt?: Date;
  createdAt: Date;
}

/**
 * Document template for generating documents
 */
export interface DocumentTemplate {
  id: number;
  tenantId: number;
  name: string;
  description?: string;
  category: DocumentCategory;
  templateContent: string;
  variables: string[];
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create document request
 */
export interface CreateDocumentRequest {
  title: string;
  description?: string;
  category: DocumentCategory;
  clientId?: number;
  carerId?: number;
  visitId?: number;
  carePlanId?: number;
  accessLevel?: DocumentAccessLevel;
  accessUserIds?: number[];
  expiryDate?: string;
  reminderDate?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Update document request
 */
export interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  category?: DocumentCategory;
  accessLevel?: DocumentAccessLevel;
  accessUserIds?: number[];
  expiryDate?: string;
  reminderDate?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  status?: DocumentStatus;
}

/**
 * Document list query parameters
 */
export interface DocumentListParams {
  page?: number;
  limit?: number;
  category?: DocumentCategory;
  status?: DocumentStatus;
  clientId?: number;
  carerId?: number;
  search?: string;
  expiringSoon?: boolean;
  sortBy?: 'title' | 'created_at' | 'expiry_date' | 'category';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Document statistics
 */
export interface DocumentStats {
  totalDocuments: number;
  byCategory: Record<DocumentCategory, number>;
  byStatus: Record<DocumentStatus, number>;
  expiringSoon: number;
  expired: number;
  pendingReview: number;
  storageUsed: number;
}
