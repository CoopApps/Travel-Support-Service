import React from 'react';

interface Document {
  document_id: number;
  original_filename: string;
  file_size: number;
  mime_type: string;
  document_category: string;
  title: string;
  description?: string;
  issue_date?: string;
  expiry_date?: string;
  uploaded_at: string;
  uploaded_by_name?: string;
  expiry_status?: 'no_expiry' | 'valid' | 'warning' | 'critical' | 'expired';
  days_until_expiry?: number;
  module?: string;
  entity_type?: string;
  entity_id?: number;
}

interface DocumentsListProps {
  documents: Document[];
  groupBy?: 'category' | 'date' | 'none';
  showExpiry?: boolean;
  onDownload?: (documentId: number) => void;
  onDelete?: (documentId: number) => void;
  onUpdate?: (documentId: number) => void;
  onToggleSelect?: (documentId: number) => void;
  selectedDocuments?: Set<number>;
  onPreview?: (documentId: number) => void;
  onShowDetails?: (documentId: number) => void;
  emptyMessage?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getExpiryStatusColor(status?: string): string {
  switch (status) {
    case 'expired':
      return '#dc2626';
    case 'critical':
      return '#ea580c';
    case 'warning':
      return '#eab308';
    case 'valid':
      return '#16a34a';
    default:
      return '#6b7280';
  }
}

function getExpiryStatusText(status?: string, daysUntilExpiry?: number): string {
  switch (status) {
    case 'expired':
      return 'Expired';
    case 'critical':
      return `Expires in ${daysUntilExpiry} days`;
    case 'warning':
      return `Expires in ${daysUntilExpiry} days`;
    case 'valid':
      return 'Valid';
    case 'no_expiry':
      return 'No expiry';
    default:
      return 'N/A';
  }
}

function getFileTypeIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('image')) return 'IMG';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLS';
  if (mimeType.includes('text')) return 'TXT';
  return 'FILE';
}

function getModuleLabel(module?: string): string {
  const labels: Record<string, string> = {
    drivers: 'Drivers',
    customers: 'Customers',
    vehicles: 'Vehicles',
    training: 'Training',
    safeguarding: 'Safeguarding',
    permits: 'Permits',
    schedules: 'Schedules',
    maintenance: 'Maintenance',
    billing: 'Billing',
    providers: 'Providers'
  };
  return labels[module?.toLowerCase() || ''] || (module || 'Unknown');
}

function getModuleColor(module?: string): string {
  const colors: Record<string, string> = {
    drivers: '#3b82f6',
    customers: '#8b5cf6',
    vehicles: '#ec4899',
    training: '#f59e0b',
    safeguarding: '#ef4444',
    permits: '#10b981',
    schedules: '#06b6d4',
    maintenance: '#6366f1',
    billing: '#14b8a6',
    providers: '#84cc16'
  };
  return colors[module?.toLowerCase() || ''] || '#6b7280';
}

function getEntityTypeLabel(entityType?: string): string {
  const labels: Record<string, string> = {
    driver: 'Driver',
    customer: 'Customer',
    vehicle: 'Vehicle',
    provider: 'Provider',
    staff: 'Staff',
    organization: 'Organization'
  };
  return labels[entityType?.toLowerCase() || ''] || (entityType || 'Entity');
}

function DocumentCard({ doc, showExpiry, onDownload, onDelete, onUpdate, onToggleSelect, isSelected, onPreview, onShowDetails }: {
  doc: Document;
  showExpiry?: boolean;
  onDownload?: (id: number) => void;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number) => void;
  onToggleSelect?: (id: number) => void;
  isSelected?: boolean;
  onPreview?: (id: number) => void;
  onShowDetails?: (id: number) => void;
}) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      padding: '12px',
      backgroundColor: isSelected ? '#dbeafe' : '#ffffff',
      marginBottom: '8px',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Checkbox */}
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={() => onToggleSelect(doc.document_id)}
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: '4px', cursor: 'pointer' }}
          />
        )}
        {/* File type badge */}
        <div style={{
          backgroundColor: '#f3f4f6',
          color: '#374151',
          padding: '8px 12px',
          borderRadius: '6px',
          flexShrink: 0,
          fontWeight: 600,
          fontSize: '11px',
          minWidth: '50px',
          textAlign: 'center',
          border: '1px solid #e5e7eb'
        }}>
          {getFileTypeIcon(doc.mime_type)}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: '16px',
            color: '#111827',
            marginBottom: '6px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {doc.title || doc.original_filename}
          </div>

          {/* Entity Information Badges */}
          {(doc.module || doc.entity_type) && (
            <div style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '8px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {doc.module && (
                <span style={{
                  backgroundColor: getModuleColor(doc.module),
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}>
                  {getModuleLabel(doc.module)}
                </span>
              )}
              {doc.entity_type && (
                <span style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 500
                }}>
                  {getEntityTypeLabel(doc.entity_type)}
                </span>
              )}
            </div>
          )}

          {doc.description && (
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '8px'
            }}>
              {doc.description}
            </div>
          )}

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '13px',
            color: '#6b7280'
          }}>
            <span>{formatFileSize(doc.file_size)}</span>
            <span>{formatDate(doc.uploaded_at)}</span>
            {doc.uploaded_by_name && <span>{doc.uploaded_by_name}</span>}
            {showExpiry && doc.expiry_date && (
              <span style={{
                backgroundColor: getExpiryStatusColor(doc.expiry_status),
                color: 'white',
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 500
              }}>
                {getExpiryStatusText(doc.expiry_status, doc.days_until_expiry)}
              </span>
            )}
          </div>

          {showExpiry && (doc.issue_date || doc.expiry_date) && (
            <div style={{
              display: 'flex',
              gap: '16px',
              marginTop: '8px',
              fontSize: '13px'
            }}>
              {doc.issue_date && (
                <span style={{ color: '#6b7280' }}>
                  Issue: {formatDate(doc.issue_date)}
                </span>
              )}
              {doc.expiry_date && (
                <span style={{ color: getExpiryStatusColor(doc.expiry_status) }}>
                  Expiry: {formatDate(doc.expiry_date)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {onShowDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails(doc.document_id);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4f46e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6366f1';
              }}
              title="View full details"
            >
              Details
            </button>
          )}

          {onPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(doc.document_id);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7c3aed';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#8b5cf6';
              }}
              title="Preview document"
            >
              Preview
            </button>
          )}

          {onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(doc.document_id);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              Download
            </button>
          )}

          {onUpdate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(doc.document_id);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6b7280';
              }}
            >
              Edit
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this document?')) {
                  onDelete(doc.document_id);
                }
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentsList({
  documents,
  groupBy = 'none',
  showExpiry = true,
  onDownload,
  onDelete,
  onUpdate,
  onToggleSelect,
  selectedDocuments,
  onPreview,
  onShowDetails,
  emptyMessage = 'No documents found'
}: DocumentsListProps) {

  if (documents.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#6b7280',
        fontSize: '16px'
      }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            marginBottom: '12px',
            color: '#d1d5db',
            margin: '0 auto 12px'
          }}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        {emptyMessage}
      </div>
    );
  }

  if (groupBy === 'category') {
    const groupedDocs = documents.reduce((acc, doc) => {
      const category = doc.document_category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);

    return (
      <div>
        {Object.entries(groupedDocs).map(([category, docs]) => (
          <div key={category} style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '12px',
              textTransform: 'capitalize'
            }}>
              {category} ({docs.length})
            </h3>
            {docs.map(doc => (
              <DocumentCard
                key={doc.document_id}
                doc={doc}
                showExpiry={showExpiry}
                onDownload={onDownload}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onToggleSelect={onToggleSelect}
                isSelected={selectedDocuments?.has(doc.document_id) || false}
                onPreview={onPreview}
                onShowDetails={onShowDetails}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (groupBy === 'date') {
    const groupedDocs = documents.reduce((acc, doc) => {
      const date = formatDate(doc.uploaded_at);
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);

    return (
      <div>
        {Object.entries(groupedDocs).map(([date, docs]) => (
          <div key={date} style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '12px'
            }}>
              {date} ({docs.length})
            </h3>
            {docs.map(doc => (
              <DocumentCard
                key={doc.document_id}
                doc={doc}
                showExpiry={showExpiry}
                onDownload={onDownload}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onToggleSelect={onToggleSelect}
                isSelected={selectedDocuments?.has(doc.document_id) || false}
                onPreview={onPreview}
                onShowDetails={onShowDetails}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // No grouping
  return (
    <div>
      {documents.map(doc => (
        <DocumentCard
          key={doc.document_id}
          doc={doc}
          showExpiry={showExpiry}
          onDownload={onDownload}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onToggleSelect={onToggleSelect}
          isSelected={selectedDocuments?.has(doc.document_id) || false}
          onPreview={onPreview}
          onShowDetails={onShowDetails}
        />
      ))}
    </div>
  );
}
