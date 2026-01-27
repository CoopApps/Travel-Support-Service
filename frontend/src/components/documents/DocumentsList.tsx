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
      return '🔴 Expired';
    case 'critical':
      return `🟠 Expires in ${daysUntilExpiry} days`;
    case 'warning':
      return `🟡 Expires in ${daysUntilExpiry} days`;
    case 'valid':
      return '🟢 Valid';
    case 'no_expiry':
      return 'No expiry';
    default:
      return 'N/A';
  }
}

function getFileTypeIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('text')) return '📃';
  return '📎';
}

function DocumentCard({ doc, showExpiry, onDownload, onDelete, onUpdate, onToggleSelect, isSelected }: {
  doc: Document;
  showExpiry?: boolean;
  onDownload?: (id: number) => void;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number) => void;
  onToggleSelect?: (id: number) => void;
  isSelected?: boolean;
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
        {/* File icon */}
        <div style={{ fontSize: '40px', flexShrink: 0 }}>
          {getFileTypeIcon(doc.mime_type)}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: '16px',
            color: '#111827',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {doc.title || doc.original_filename}
          </div>

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
            <span>📦 {formatFileSize(doc.file_size)}</span>
            <span>📅 {formatDate(doc.uploaded_at)}</span>
            {doc.uploaded_by_name && <span>👤 {doc.uploaded_by_name}</span>}
            {showExpiry && doc.expiry_date && (
              <span style={{ color: getExpiryStatusColor(doc.expiry_status) }}>
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
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
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
              ⬇️ Download
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
              ✏️ Edit
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
              🗑️ Delete
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
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
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
        />
      ))}
    </div>
  );
}
