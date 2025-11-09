# Document Management System - Design Document

**Date**: 2025-11-09
**Purpose**: Comprehensive design for multi-tenant document upload, storage, and retrieval

---

## Overview

A centralized document management system that allows uploading, viewing, and managing files across multiple modules while maintaining tenant isolation and security.

---

## Modules Requiring Document Upload

### 🔴 **Critical Priority** (Must-Have for Production)

#### 1. **Drivers Module**
**Document Types**:
- 📄 Driving License (front & back)
- 🛡️ DBS Certificate
- 📋 Insurance Documents
- 🎓 Training Certificates (from Training module)
- 📝 Employment Contract
- 🏥 Medical Fitness Certificate
- 📑 Right to Work Documents

**Access Pattern**: Driver profile page with "Documents" tab

#### 2. **Customers Module**
**Document Types**:
- 🏥 Medical Certificates
- 📋 Care Plans
- 📝 Risk Assessments
- 🔍 Needs Assessment Documents
- 💊 Medication Lists
- 📞 Emergency Contact Forms

**Access Pattern**: Customer profile with "Documents" section

#### 3. **Vehicles Module**
**Document Types**:
- 🚗 MOT Certificate
- 🛡️ Insurance Certificate
- 📋 V5C Logbook (copy)
- 🔧 Service Records
- 📄 Lease Agreement
- 🔍 Safety Inspection Reports

**Access Pattern**: Vehicle details page with "Documents" tab

#### 4. **Training Module**
**Document Types**:
- 🎓 Training Certificates
- 📜 Course Completion Documents
- 📋 Attendance Records
- 📝 Assessment Results

**Access Pattern**: Training records with document attachment

### 🟡 **High Priority** (Important for Compliance)

#### 5. **Permits Module**
**Document Types**:
- 📜 Section 19/22 Permit Copies
- 📋 Application Documents
- ✅ Approval Letters
- 📝 Renewal Documents

**Access Pattern**: Permit details with document viewer

#### 6. **Safeguarding Module**
**Document Types**:
- 📸 Incident Photos
- 📋 Supporting Documentation
- 📝 Witness Statements
- 📄 Investigation Reports

**Access Pattern**: Safeguarding report with attachments

#### 7. **Invoices Module**
**Document Types**:
- 🧾 Supporting Receipts
- 📄 Payment Proof
- 📋 Credit Notes
- 📝 Customer Correspondence

**Access Pattern**: Invoice detail with attachments

### 🟢 **Medium Priority** (Nice to Have)

#### 8. **Providers Module**
**Document Types**:
- 📝 Service Contracts
- 🛡️ Insurance Documents
- 📋 Rate Schedules
- ✅ Compliance Certificates

#### 9. **Maintenance Module**
**Document Types**:
- 🧾 Service Receipts
- 📋 Warranty Documents
- 📸 Before/After Photos
- 📝 Mechanic Reports

#### 10. **Payroll Module**
**Document Types**:
- 📄 Payslips (auto-generated PDFs)
- 📋 Tax Documents
- 📝 Deduction Authorizations

---

## Database Schema

### Main Documents Table

```sql
CREATE TABLE tenant_documents (
    document_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),

    -- Document metadata
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE, -- UUID-based
    file_path TEXT NOT NULL, -- Full storage path
    file_size INTEGER NOT NULL, -- bytes
    mime_type VARCHAR(100) NOT NULL, -- e.g., 'application/pdf', 'image/jpeg'
    file_extension VARCHAR(10) NOT NULL, -- e.g., 'pdf', 'jpg'

    -- Classification
    module VARCHAR(50) NOT NULL, -- 'drivers', 'customers', 'vehicles', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'driver', 'customer', 'vehicle', etc.
    entity_id INTEGER NOT NULL, -- Foreign key to the entity
    document_category VARCHAR(100) NOT NULL, -- 'license', 'insurance', 'certificate', etc.
    document_type VARCHAR(100), -- More specific: 'dbs_certificate', 'mot_certificate'

    -- Optional metadata
    title VARCHAR(255), -- User-friendly title
    description TEXT,
    tags TEXT[], -- Array of tags for searching

    -- Dates
    document_date DATE, -- Date the document is effective from
    expiry_date DATE, -- For documents with expiry (insurance, licenses, etc.)

    -- Upload tracking
    uploaded_by INTEGER NOT NULL, -- User ID who uploaded
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Soft delete
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP,
    deleted_by INTEGER,

    -- Audit trail
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    CONSTRAINT fk_uploader FOREIGN KEY (uploaded_by) REFERENCES tenant_users(user_id)
);

-- Indexes for performance
CREATE INDEX idx_documents_tenant ON tenant_documents(tenant_id);
CREATE INDEX idx_documents_entity ON tenant_documents(tenant_id, module, entity_type, entity_id);
CREATE INDEX idx_documents_category ON tenant_documents(tenant_id, document_category);
CREATE INDEX idx_documents_expiry ON tenant_documents(tenant_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_documents_active ON tenant_documents(tenant_id, is_active);
```

### Document Tags Table (Optional - for advanced search)

```sql
CREATE TABLE tenant_document_tags (
    tag_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    tag_name VARCHAR(50) NOT NULL,
    color VARCHAR(7), -- Hex color for UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, tag_name)
);

CREATE TABLE tenant_document_tag_links (
    document_id INTEGER NOT NULL REFERENCES tenant_documents(document_id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tenant_document_tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);
```

---

## File Storage Architecture

### Storage Strategy Options

#### **Option A: Local File System** (Recommended for Railway)
```
📁 /storage/
  📁 tenants/
    📁 [tenant_id]/
      📁 drivers/
        📁 [driver_id]/
          📄 [uuid]_license_front.pdf
          📄 [uuid]_dbs_certificate.pdf
      📁 customers/
        📁 [customer_id]/
          📄 [uuid]_medical_cert.pdf
      📁 vehicles/
        📁 [vehicle_id]/
          📄 [uuid]_mot_certificate.pdf
      📁 training/
        📁 [training_record_id]/
          📄 [uuid]_certificate.pdf
```

**Pros**:
- Simple implementation
- No external dependencies
- Lower cost
- Fast for Railway deployment

**Cons**:
- Need to handle backups
- Limited scalability
- Railway volume management needed

#### **Option B: Cloud Storage** (AWS S3 / Azure Blob)
```
Bucket: travel-support-documents
Prefix: tenants/[tenant_id]/[module]/[entity_id]/[uuid]_[filename]
```

**Pros**:
- Highly scalable
- Built-in redundancy
- CDN integration possible
- Professional backup

**Cons**:
- Additional cost
- External dependency
- More complex setup

#### **Option C: Database Storage** (PostgreSQL bytea)
Store files directly in database as bytea

**Pros**:
- Simple deployment
- Transactional integrity
- No file system concerns

**Cons**:
- Database bloat
- Poor performance for large files
- Expensive backups

### **Recommended: Option A + Future Migration Path to Option B**

Start with local filesystem (Option A) for initial deployment, design API to abstract storage so we can migrate to S3 later without frontend changes.

---

## API Endpoints Design

### Document Management Routes

```typescript
// Upload document
POST /api/tenants/:tenantId/:module/:entityId/documents
Content-Type: multipart/form-data
Body: {
  file: File,
  category: string,
  documentType?: string,
  title?: string,
  description?: string,
  documentDate?: string,
  expiryDate?: string,
  tags?: string[]
}
Response: { document: Document }

// List documents for entity
GET /api/tenants/:tenantId/:module/:entityId/documents
Query: ?category=license&includeExpired=false
Response: { documents: Document[], total: number }

// Get single document metadata
GET /api/tenants/:tenantId/documents/:documentId
Response: { document: Document }

// Download document file
GET /api/tenants/:tenantId/documents/:documentId/download
Response: File stream with proper Content-Type and Content-Disposition

// View document (inline)
GET /api/tenants/:tenantId/documents/:documentId/view
Response: File stream with inline disposition

// Update document metadata
PATCH /api/tenants/:tenantId/documents/:documentId
Body: { title?, description?, tags?, expiryDate?, ... }
Response: { document: Document }

// Delete document (soft delete)
DELETE /api/tenants/:tenantId/documents/:documentId
Response: { success: true }

// Get expiring documents across all modules
GET /api/tenants/:tenantId/documents/expiring
Query: ?days=30
Response: { documents: Document[], count: number }

// Search documents
GET /api/tenants/:tenantId/documents/search
Query: ?q=insurance&module=vehicles&category=insurance
Response: { documents: Document[], total: number }
```

### Security Middleware

```typescript
// Verify user has access to document
// - Must be same tenant
// - Must have permission to view the module
// - Respect confidential flags (e.g., safeguarding reports)

const verifyDocumentAccess = async (req, res, next) => {
  const { documentId, tenantId } = req.params;
  const userId = req.user.id;

  // Get document
  const document = await getDocument(documentId);

  // Check tenant match
  if (document.tenant_id !== parseInt(tenantId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check module permissions
  if (!hasModuleAccess(userId, document.module)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  // Check confidential documents (safeguarding)
  if (document.module === 'safeguarding' && document.is_confidential) {
    if (!hasRole(userId, ['admin', 'safeguarding_lead'])) {
      return res.status(403).json({ error: 'Confidential document' });
    }
  }

  next();
};
```

---

## Frontend Components

### Reusable Components

#### 1. **DocumentUploadZone**
```tsx
<DocumentUploadZone
  tenantId={tenantId}
  module="drivers"
  entityId={driverId}
  category="license"
  documentType="driving_license"
  accept=".pdf,.jpg,.jpeg,.png"
  maxSize={10 * 1024 * 1024} // 10MB
  onUploadComplete={(document) => {
    console.log('Uploaded:', document);
    refreshDocuments();
  }}
  onError={(error) => {
    alert(error.message);
  }}
/>
```

Features:
- Drag & drop
- Click to select
- Progress bar
- File type validation
- Size validation
- Preview for images

#### 2. **DocumentsList**
```tsx
<DocumentsList
  tenantId={tenantId}
  module="drivers"
  entityId={driverId}
  category="all" // or specific category
  showExpiry={true}
  allowDelete={true}
  allowDownload={true}
  groupBy="category"
  sortBy="uploadDate"
/>
```

Features:
- List view with icons
- Grid view (for images)
- Filter by category/type
- Sort options
- Expiry badges
- Action buttons (view, download, delete)

#### 3. **DocumentViewer**
```tsx
<DocumentViewer
  documentId={documentId}
  tenantId={tenantId}
  onClose={() => setShowViewer(false)}
/>
```

Features:
- PDF viewer (using pdf.js or iframe)
- Image viewer with zoom
- Document metadata display
- Download button
- Delete button (with confirmation)

#### 4. **DocumentExpiryAlert**
```tsx
<DocumentExpiryAlert
  tenantId={tenantId}
  module="drivers"
  entityId={driverId}
  daysThreshold={30}
  onViewDocument={(doc) => openViewer(doc)}
/>
```

Features:
- Shows expiring documents
- Color-coded urgency
- Click to view document
- Dismiss button

---

## Module Integration Patterns

### Example: Drivers Module

#### **Driver Detail Page Structure**
```tsx
function DriverDetailPage({ driverId }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div>
      <Tabs>
        <Tab name="overview">Overview</Tab>
        <Tab name="documents">Documents</Tab> {/* NEW */}
        <Tab name="training">Training</Tab>
        <Tab name="schedules">Schedules</Tab>
      </Tabs>

      {activeTab === 'documents' && (
        <DriverDocumentsTab driverId={driverId} />
      )}
    </div>
  );
}

function DriverDocumentsTab({ driverId }) {
  return (
    <div>
      {/* Expiry Alerts */}
      <DocumentExpiryAlert
        module="drivers"
        entityId={driverId}
        daysThreshold={30}
      />

      {/* Upload Zones by Category */}
      <div className="document-sections">
        <DocumentSection
          title="Driving License"
          category="license"
          documentType="driving_license"
          required={true}
          expiryTracked={true}
        >
          <DocumentUploadZone ... />
          <DocumentsList ... />
        </DocumentSection>

        <DocumentSection
          title="DBS Certificate"
          category="dbs"
          documentType="dbs_certificate"
          required={true}
          expiryTracked={true}
        />

        <DocumentSection
          title="Insurance"
          category="insurance"
          required={false}
        />

        <DocumentSection
          title="Training Certificates"
          category="training"
          required={false}
          readOnly={true} // Managed from Training module
        />

        <DocumentSection
          title="Other Documents"
          category="other"
          required={false}
        />
      </div>
    </div>
  );
}
```

### Example: Training Module Integration

```tsx
function AddTrainingRecordModal({ ... }) {
  const [certificateFile, setCertificateFile] = useState(null);

  const handleSubmit = async () => {
    // 1. Create training record
    const record = await trainingApi.createRecord(data);

    // 2. Upload certificate (if provided)
    if (certificateFile) {
      await documentsApi.upload(
        tenantId,
        'training',
        record.id,
        certificateFile,
        { category: 'certificate', documentType: 'training_certificate' }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... other fields ... */}

      <div className="form-group">
        <label>Upload Certificate (Optional)</label>
        <DocumentUploadZone
          inline={true}
          onFileSelect={(file) => setCertificateFile(file)}
        />
      </div>
    </form>
  );
}
```

---

## File Type Support

### Supported MIME Types

```typescript
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': { ext: 'pdf', icon: 'file-pdf', maxSize: 10 * 1024 * 1024 },
  'application/msword': { ext: 'doc', icon: 'file-word', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: 'docx', icon: 'file-word', maxSize: 10 * 1024 * 1024
  },

  // Images
  'image/jpeg': { ext: 'jpg', icon: 'file-image', maxSize: 5 * 1024 * 1024 },
  'image/png': { ext: 'png', icon: 'file-image', maxSize: 5 * 1024 * 1024 },
  'image/gif': { ext: 'gif', icon: 'file-image', maxSize: 5 * 1024 * 1024 },

  // Spreadsheets
  'application/vnd.ms-excel': { ext: 'xls', icon: 'file-excel', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    ext: 'xlsx', icon: 'file-excel', maxSize: 10 * 1024 * 1024
  },
};
```

### File Naming Convention

```
[UUID]_[sanitized_original_name].[ext]
Example: a1b2c3d4-e5f6-7890-abcd-ef1234567890_driving_license.pdf
```

---

## Security Considerations

### Upload Security

1. **File Type Validation**
   - Validate MIME type on backend (don't trust frontend)
   - Check file extension matches MIME type
   - Use magic number detection for images

2. **Size Limits**
   - Per-file limits (10MB for docs, 5MB for images)
   - Per-tenant storage quota
   - Rate limiting on uploads

3. **File Scanning**
   - Antivirus scanning for uploaded files
   - Reject executable files
   - Sanitize filenames

4. **Access Control**
   - Tenant isolation (critical)
   - Module-level permissions
   - Confidential document flags

### Download Security

1. **Signed URLs** (for cloud storage)
   - Time-limited access tokens
   - IP-based restrictions (optional)

2. **Stream Through Backend** (for local storage)
   - Never expose file paths to frontend
   - Validate access on every download
   - Log all downloads for audit

3. **Content-Disposition**
   ```typescript
   res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
   res.setHeader('Content-Type', document.mime_type);
   res.setHeader('X-Content-Type-Options', 'nosniff');
   ```

---

## Implementation Plan

### Phase 1: Core Infrastructure (2-3 days)

**Tasks**:
1. Create database schema
2. Set up file storage directory structure
3. Build backend document routes
4. Create reusable frontend components
5. Add file upload middleware (multer)

**Deliverables**:
- ✅ Database tables created
- ✅ Document API endpoints working
- ✅ Upload/download/delete functionality
- ✅ Basic frontend components

### Phase 2: Module Integration - Priority 1 (2 days)

**Modules**: Drivers, Customers, Vehicles

**Tasks**:
1. Add "Documents" tab to each module
2. Define document categories per module
3. Implement upload zones
4. Add expiry tracking for licenses/certificates
5. Dashboard alerts for expiring documents

### Phase 3: Module Integration - Priority 2 (1-2 days)

**Modules**: Training, Permits, Safeguarding

**Tasks**:
1. Integrate document attachments
2. Add inline upload to forms
3. Link documents to records

### Phase 4: Enhancement (1-2 days)

**Tasks**:
1. Document search functionality
2. Bulk download
3. Document templates
4. Advanced filtering
5. Audit logging

---

## Centralized Documents Module

### Overview

A dedicated **Documents** module accessible from the main navigation that provides a centralized view of ALL documents across the entire system. This allows administrators to:
- View all documents in one place
- Search across all modules
- Filter by entity, category, date, expiry
- Drill down to specific drivers, customers, vehicles, etc.
- Perform bulk operations
- Generate reports

### Navigation Structure

```
Main Menu:
├─ Dashboard
├─ Customers
├─ Drivers
├─ Schedules
├─ Vehicles
├─ 📁 Documents ← NEW MODULE
├─ Training
├─ Safeguarding
└─ ...
```

---

### Documents Module UI Layout

#### **Main Documents Page**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ 📁 Document Management                                      [+ Upload Document] ║
║ Travel Support System - All Documents                                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║ ┌─ Statistics Cards ─────────────────────────────────────────────────────────┐ ║
║ │ 📄 Total Documents    ⚠️ Expiring Soon    🔴 Expired    📦 Storage Used   │ ║
║ │      1,247                  23               8            2.8 GB / 10 GB  │ ║
║ └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║ ┌─ Quick Filters ────────────────────────────────────────────────────────────┐ ║
║ │ [🔍 Search...]                                          [Advanced Filters] │ ║
║ │                                                                            │ ║
║ │ Module:        [All Modules ▼]                                            │ ║
║ │ Category:      [All Categories ▼]                                         │ ║
║ │ Expiry Status: [All ▼] [Show Expired] [Show Expiring (30 days)]          │ ║
║ │ Date Range:    [Last 30 Days ▼]  From: [____] To: [____]                 │ ║
║ │ Uploaded By:   [All Users ▼]                                              │ ║
║ │                                                                            │ ║
║ │ [Apply Filters] [Clear]                                   [Export to CSV] │ ║
║ └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║ ┌─ Module Quick Access ──────────────────────────────────────────────────────┐ ║
║ │ [👥 Drivers (432)]  [👤 Customers (315)]  [🚗 Vehicles (168)]            │ ║
║ │ [🎓 Training (287)]  [🛡️ Safeguarding (45)]  [📋 Permits (89)]           │ ║
║ │ [🧾 Invoices (52)]   [📁 Other (59)]                                      │ ║
║ └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║ ┌─ Documents Table ──────────────────────────────────────────────────────────┐ ║
║ │ [☐] Select All  |  Bulk: [Archive] [Download] [Delete]          Page 1/42 │ ║
║ ├────────────────────────────────────────────────────────────────────────────┤ ║
║ │ ☐ 📄 | Document Name           | Entity          | Category    | Expiry   │ ║
║ ├────────────────────────────────────────────────────────────────────────────┤ ║
║ │ ☐ 📄 | driving_license.pdf     | John Smith      | License     | 🟡 15d   │ ║
║ │       2.3 MB • Drivers • Uploaded by Admin • 2025-10-15                    │ ║
║ │       [View] [Download] [Edit Info] [Delete]                               │ ║
║ ├────────────────────────────────────────────────────────────────────────────┤ ║
║ │ ☐ 📄 | mot_certificate.pdf     | AB12 CDE        | MOT         | 🟡 7d    │ ║
║ │       1.8 MB • Vehicles • Uploaded by Sarah • 2025-11-01                   │ ║
║ │       [View] [Download] [Edit Info] [Delete]                               │ ║
║ ├────────────────────────────────────────────────────────────────────────────┤ ║
║ │ ☐ 🖼️ | medical_cert.jpg        | Mary Johnson    | Medical     | 🟢 120d  │ ║
║ │       3.1 MB • Customers • Uploaded by Admin • 2025-11-05                  │ ║
║ │       [View] [Download] [Edit Info] [Delete]                               │ ║
║ ├────────────────────────────────────────────────────────────────────────────┤ ║
║ │ ☐ 📄 | first_aid_cert.pdf      | John Smith      | Certificate | 🟢 245d  │ ║
║ │       1.2 MB • Training • Uploaded by Admin • 2025-09-20                   │ ║
║ │       [View] [Download] [Edit Info] [Delete]                               │ ║
║ └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║ [← Previous] [1] [2] [3] ... [42] [Next →]                  Showing 1-30/1247 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### Entity Drill-Down View

When clicking on an entity (e.g., "John Smith"), show all documents for that person across ALL modules:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ 📁 Documents for: John Smith (Driver)                         [← Back to All] ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║ ┌─ Entity Information ───────────────────────────────────────────────────────┐ ║
║ │ Name: John Smith                                                           │ ║
║ │ Type: Driver                                                               │ ║
║ │ Phone: 07700 900123                                                        │ ║
║ │ Email: john.smith@example.com                                              │ ║
║ │                                                                            │ ║
║ │ Total Documents: 12    |    Expiring Soon: 2    |    Expired: 0           │ ║
║ └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║ ┌─ Documents by Module ──────────────────────────────────────────────────────┐ ║
║ │                                                                            │ ║
║ │ 👤 DRIVER DOCUMENTS (5)                                                    │ ║
║ │ ├─ 📄 driving_license_front.pdf        License      🟡 Expires in 15 days │ ║
║ │ │   [View] [Download] [Delete]                                            │ ║
║ │ ├─ 📄 driving_license_back.pdf         License      🟡 Expires in 15 days │ ║
║ │ ├─ 🛡️ dbs_certificate.pdf              DBS         🟡 Expires in 20 days │ ║
║ │ ├─ 📋 insurance_document.pdf           Insurance   🟢 Valid              │ ║
║ │ └─ 📝 employment_contract.pdf          Contract    🟢 No Expiry          │ ║
║ │                                                                            │ ║
║ │ 🎓 TRAINING DOCUMENTS (7)                                                  │ ║
║ │ ├─ 📜 first_aid_certificate.pdf        Certificate 🟢 Expires in 245 days│ ║
║ │ ├─ 📜 safeguarding_training.pdf        Certificate 🟢 Expires in 380 days│ ║
║ │ ├─ 📜 manual_handling_cert.pdf         Certificate 🟢 Expires in 190 days│ ║
║ │ ├─ 📜 defensive_driving.pdf            Certificate 🟢 Expires in 320 days│ ║
║ │ ├─ 📜 customer_service.pdf             Certificate 🟢 Expires in 150 days│ ║
║ │ ├─ 📜 health_safety.pdf                Certificate 🟢 Expires in 280 days│ ║
║ │ └─ 📜 midas_training.pdf               Certificate 🟢 Expires in 410 days│ ║
║ │                                                                            │ ║
║ │ 🛡️ SAFEGUARDING DOCUMENTS (0)                                             │ ║
║ │ └─ No documents                                                            │ ║
║ │                                                                            │ ║
║ └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║ [+ Upload New Document for John Smith]                                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### Advanced Search Features

#### **Search Bar Capabilities**

```typescript
// Search examples:
"John Smith"           → Find all docs for person named John Smith
"license"              → Find all license documents
"expiring:30"          → Find docs expiring in next 30 days
"module:drivers"       → Filter to drivers module only
"category:dbs"         → Find all DBS certificates
"uploaded:2025-11"     → Documents uploaded in November 2025
"size:>5MB"            → Large documents
"type:pdf"             → All PDFs
```

#### **Advanced Filter Panel**

```
╔════════════════════════════════════════════════════════════════════╗
║ Advanced Filters                                      [Close] [×]  ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║ Module & Entity:                                                   ║
║ ☐ Drivers          ☐ Customers       ☐ Vehicles                  ║
║ ☐ Training         ☐ Safeguarding    ☐ Permits                   ║
║ ☐ Invoices         ☐ Providers       ☐ Maintenance               ║
║                                                                    ║
║ Document Category:                                                 ║
║ ☐ Licenses         ☐ Certificates    ☐ Insurance                 ║
║ ☐ Medical          ☐ DBS             ☐ Contracts                 ║
║ ☐ MOT              ☐ Assessments     ☐ Other                     ║
║                                                                    ║
║ Expiry Status:                                                     ║
║ ☐ Valid (30+ days)                                                ║
║ ☐ Expiring Soon (0-30 days)                                      ║
║ ☐ Expired                                                         ║
║ ☐ No Expiry Date                                                  ║
║                                                                    ║
║ Upload Date Range:                                                 ║
║ From: [2025-01-01]  To: [2025-12-31]                             ║
║                                                                    ║
║ File Properties:                                                   ║
║ Type: ☐ PDF  ☐ Image  ☐ Word  ☐ Excel                           ║
║ Size: Min [____] MB  Max [____] MB                                ║
║                                                                    ║
║ Uploaded By:                                                       ║
║ [Select User ▼]                                                   ║
║                                                                    ║
║ Tags:                                                              ║
║ [Select Tags ▼]                                                   ║
║                                                                    ║
║ [Apply Filters]  [Clear All]                                      ║
╚════════════════════════════════════════════════════════════════════╝
```

---

### API Endpoints for Documents Module

```typescript
// Get all documents with filters and pagination
GET /api/tenants/:tenantId/documents
Query Parameters:
  - page: number
  - limit: number
  - module: string (drivers, customers, vehicles, etc.)
  - entityId: number (drill down to specific entity)
  - category: string (license, certificate, etc.)
  - search: string (full-text search)
  - expiryStatus: 'valid' | 'expiring' | 'expired' | 'none'
  - expiryDays: number (expiring within X days)
  - uploadedBy: number (user_id)
  - fromDate: string (upload date range)
  - toDate: string
  - fileType: string (pdf, jpg, etc.)
  - minSize: number (bytes)
  - maxSize: number (bytes)
  - sortBy: 'uploadDate' | 'expiryDate' | 'filename' | 'size'
  - sortOrder: 'asc' | 'desc'

Response: {
  documents: Document[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    pages: number
  },
  stats: {
    totalDocuments: number,
    expiringCount: number,
    expiredCount: number,
    totalSize: number
  }
}

// Get document statistics by module
GET /api/tenants/:tenantId/documents/stats
Response: {
  byModule: {
    drivers: { count: 432, size: 856MB },
    customers: { count: 315, size: 620MB },
    vehicles: { count: 168, size: 340MB },
    training: { count: 287, size: 580MB },
    ...
  },
  byCategory: {
    license: { count: 125, expiringCount: 8 },
    certificate: { count: 287, expiringCount: 15 },
    ...
  },
  expiryBreakdown: {
    valid: 1180,
    expiringSoon: 23,
    expired: 8,
    noExpiry: 36
  }
}

// Get all documents for a specific entity across all modules
GET /api/tenants/:tenantId/documents/entity/:module/:entityId
Example: GET /api/tenants/2/documents/entity/drivers/15
Response: {
  entity: {
    id: 15,
    type: 'driver',
    name: 'John Smith',
    email: 'john@example.com',
    ...
  },
  documentsByModule: {
    drivers: Document[],
    training: Document[],
    safeguarding: Document[],
    ...
  },
  stats: {
    total: 12,
    expiring: 2,
    expired: 0
  }
}

// Bulk operations
POST /api/tenants/:tenantId/documents/bulk/download
Body: { documentIds: number[] }
Response: ZIP file download

POST /api/tenants/:tenantId/documents/bulk/delete
Body: { documentIds: number[] }
Response: { deleted: number, failed: number }

DELETE /api/tenants/:tenantId/documents/bulk/archive
Body: { documentIds: number[] }
Response: { archived: number }
```

---

### React Components for Documents Module

#### **DocumentsPage.tsx** (Main Module)

```tsx
function DocumentsPage() {
  const { tenantId } = useTenant();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);

  return (
    <div className="documents-page">
      {/* Header */}
      <PageHeader
        title="Document Management"
        subtitle="All documents across all modules"
        actions={
          <button className="btn btn-primary" onClick={handleUpload}>
            + Upload Document
          </button>
        }
      />

      {/* Statistics Cards */}
      <DocumentStatistics stats={stats} />

      {/* Quick Filters & Search */}
      <DocumentFilters
        filters={filters}
        onFilterChange={setFilters}
        onClear={clearFilters}
      />

      {/* Module Quick Access */}
      <ModuleQuickAccess stats={stats?.byModule} />

      {/* Documents Table */}
      <DocumentsTable
        documents={documents}
        loading={loading}
        selectedDocs={selectedDocs}
        onSelectionChange={setSelectedDocs}
        onView={handleViewDocument}
        onDownload={handleDownloadDocument}
        onDelete={handleDeleteDocument}
        onEntityClick={handleEntityClick}
      />

      {/* Bulk Actions Bar */}
      {selectedDocs.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedDocs.length}
          onBulkDownload={handleBulkDownload}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
        />
      )}

      {/* Pagination */}
      <Pagination ... />
    </div>
  );
}
```

#### **EntityDocumentsView.tsx** (Drill-Down)

```tsx
function EntityDocumentsView({ module, entityId }) {
  const { tenantId } = useTenant();
  const [entity, setEntity] = useState<any>(null);
  const [documentsByModule, setDocumentsByModule] = useState<Record<string, Document[]>>({});

  useEffect(() => {
    // Fetch entity info and all its documents
    documentsApi.getEntityDocuments(tenantId, module, entityId)
      .then(data => {
        setEntity(data.entity);
        setDocumentsByModule(data.documentsByModule);
      });
  }, [tenantId, module, entityId]);

  return (
    <div className="entity-documents-view">
      {/* Entity Info Card */}
      <EntityInfoCard entity={entity} module={module} />

      {/* Documents Grouped by Module */}
      {Object.entries(documentsByModule).map(([mod, docs]) => (
        <DocumentModuleSection
          key={mod}
          module={mod}
          documents={docs}
          entity={entity}
        />
      ))}

      {/* Upload Button */}
      <button onClick={() => handleUploadForEntity(entity)}>
        + Upload New Document for {entity.name}
      </button>
    </div>
  );
}
```

---

### Statistics Dashboard in Documents Module

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ 📊 Document Analytics                                                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║ Documents by Module:                                                           ║
║ ████████████████████████ Drivers (432) - 35%                                 ║
║ ███████████████████ Customers (315) - 25%                                    ║
║ ███████████████ Training (287) - 23%                                         ║
║ ██████████ Vehicles (168) - 13%                                              ║
║ ████ Others (45) - 4%                                                         ║
║                                                                                ║
║ Documents by Category:                                                         ║
║ • Certificates: 287 docs (🟡 15 expiring soon)                               ║
║ • Licenses: 125 docs (🟡 8 expiring soon)                                    ║
║ • Insurance: 93 docs (🟢 All valid)                                          ║
║ • Medical: 78 docs (🔴 2 expired)                                            ║
║ • Contracts: 45 docs                                                          ║
║                                                                                ║
║ Storage Usage:                                                                 ║
║ ██████████████░░░░░░░░░░  2.8 GB / 10 GB (28% used)                          ║
║                                                                                ║
║ Recent Activity:                                                               ║
║ • 15 documents uploaded today                                                 ║
║ • 23 documents expiring in next 30 days                                       ║
║ • 8 documents expired                                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### Integration with Existing Modules

#### **From Driver Profile → View All Documents**

```tsx
// In DriverDetailPage.tsx
<button onClick={() => navigate(`/documents/entity/drivers/${driverId}`)}>
  View All Documents (12)
</button>
```

#### **From Documents Module → View Driver Profile**

```tsx
// In EntityDocumentsView
<button onClick={() => navigate(`/drivers/${entity.id}`)}>
  ← Back to Driver Profile
</button>
```

---

### Export Functionality

#### **Export Options**

```
Export Documents Report:
☐ Document List (CSV)
  Columns: Filename, Entity, Module, Category, Upload Date, Expiry, Size

☐ Expiry Report (CSV)
  Documents expiring in next [30] days

☐ Audit Log (CSV)
  All uploads/downloads/deletes with timestamps

☐ Storage Report (PDF)
  Usage by module, category breakdown, trends

[Generate Report]
```

---

## Dashboard Integration

**Add to Main Dashboard:**

```tsx
<DocumentsWidget tenantId={tenantId}>
  ⚠️ Document Alerts (31)
  ├─ 23 expiring in next 30 days
  ├─ 8 expired documents
  └─ [View All Documents →]
</DocumentsWidget>
```

---

This centralized Documents module provides:
✅ **Complete visibility** - All documents in one place
✅ **Entity drill-down** - See all docs for specific driver/customer
✅ **Cross-module search** - Find documents anywhere
✅ **Bulk operations** - Efficient document management
✅ **Analytics** - Usage and expiry insights
✅ **Export reports** - Compliance documentation

---

## Dashboard Integration

### Expiring Documents Widget

```tsx
function ExpiringDocumentsWidget({ tenantId }) {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    documentsApi.getExpiring(tenantId, 30).then(setDocs);
  }, []);

  return (
    <div className="alert-card">
      <h3>⚠️ Expiring Documents</h3>
      <ul>
        {docs.map(doc => (
          <li key={doc.id}>
            <strong>{doc.entity_name}</strong> - {doc.document_category}
            <span className={getExpiryClass(doc.expiry_date)}>
              Expires: {formatDate(doc.expiry_date)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Cost & Storage Estimates

### Local Filesystem (Railway)

**Assumptions**:
- 50 drivers × 5 documents × 2MB avg = 500MB
- 100 customers × 3 documents × 2MB avg = 600MB
- 20 vehicles × 4 documents × 2MB avg = 160MB
- **Total: ~1.3GB**

**Railway Persistent Volume**:
- 1GB: $0.25/GB/month = $0.25
- 5GB: $0.25/GB/month = $1.25/month
- **Recommended: 10GB volume = $2.50/month**

### AWS S3 (Future)

**Assumptions**:
- Storage: 10GB × $0.023/GB = $0.23/month
- Requests: 10,000 GET × $0.0004/1000 = $0.004
- Transfer: 5GB × $0.09/GB = $0.45
- **Total: ~$0.70/month per tenant**

---

## Backup Strategy

### Local Filesystem Backup

```bash
# Daily backup script
tar -czf backup_$(date +%Y%m%d).tar.gz /storage/tenants
# Upload to S3 or external backup service
aws s3 cp backup_$(date +%Y%m%d).tar.gz s3://backup-bucket/
```

### Database Backup

Regular PostgreSQL backups include document metadata, so restoring is:
1. Restore database
2. Restore files from backup
3. Verify document integrity

---

## Testing Checklist

### Unit Tests
- [ ] File upload validation
- [ ] MIME type checking
- [ ] File size limits
- [ ] Filename sanitization
- [ ] Access control logic

### Integration Tests
- [ ] Upload → Store → Download cycle
- [ ] Tenant isolation
- [ ] Expiry date tracking
- [ ] Search functionality

### Security Tests
- [ ] Cross-tenant access attempts
- [ ] Malicious file uploads
- [ ] Path traversal attempts
- [ ] Unauthorized downloads

---

## Conclusion

This document management system provides:

✅ **Centralized** - One system for all modules
✅ **Secure** - Tenant-isolated, access-controlled
✅ **Scalable** - Can migrate to cloud storage
✅ **User-Friendly** - Drag & drop, preview, organized
✅ **Compliance-Ready** - Expiry tracking, audit logs
✅ **Maintainable** - Reusable components, clear API

**Estimated Total Effort**: 8-10 days for complete implementation across all priority modules.

**Start with**: Drivers module (highest need) → Customers → Vehicles → Training
