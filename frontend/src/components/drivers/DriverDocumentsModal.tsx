import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { documentApi, Document } from '../../services/documentApi';
import { DocumentUploadZone } from '../documents/DocumentUploadZone';
import { DocumentsList } from '../documents/DocumentsList';

interface DriverDocumentsModalProps {
  driverId: number;
  driverName: string;
  onClose: () => void;
}

export function DriverDocumentsModal({ driverId, driverName, onClose }: DriverDocumentsModalProps) {
  const { tenantId } = useTenant();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'view' | 'all'>('view');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<string>('license');
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');

  const documentCategories = [
    { value: 'license', label: "Driver's License", description: "Driving license (Class B/D)" },
    { value: 'dbs', label: 'DBS Certificate', description: 'DBS/background check certificate' },
    { value: 'training', label: 'Training Certificate', description: 'Training course completion certificates' },
    { value: 'insurance', label: 'Insurance', description: 'Driver insurance documents' },
    { value: 'medical', label: 'Medical Certificate', description: 'Medical fitness certificates' },
    { value: 'permit', label: 'Permit', description: 'Special permits (wheelchair, etc.)' },
    { value: 'other', label: 'Other', description: 'Other driver-related documents' }
  ];

  const fetchDocuments = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const response = await documentApi.getEntityDocuments(tenantId, 'drivers', driverId, {
        category: selectedCategory || undefined,
        active: true
      });
      setDocuments(response.documents);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDocuments = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const response = await documentApi.getEntityAllDocuments(tenantId, 'drivers', driverId);

      // Flatten all documents from all modules
      const allDocs: Document[] = [];
      Object.values(response.documentsByModule).forEach((docs: any) => {
        allDocs.push(...docs);
      });

      setDocuments(allDocs);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllDocuments();
    } else {
      fetchDocuments();
    }
  }, [tenantId, driverId, selectedCategory, activeTab]);

  const handleUploadComplete = () => {
    setUploadSuccess('Document uploaded successfully!');
    setUploadError('');
    setTimeout(() => setUploadSuccess(''), 3000);
    fetchDocuments();
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadSuccess('');
  };

  const handleDownload = async (documentId: number) => {
    if (!tenantId) return;

    try {
      const blob = await documentApi.downloadDocument(tenantId, documentId);
      const doc = documents.find(d => d.document_id === documentId);
      if (doc) {
        documentApi.triggerDownload(blob, doc.original_filename);
      }
    } catch (error) {
      alert('Failed to download document');
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!tenantId) return;

    try {
      await documentApi.deleteDocument(tenantId, documentId, false);
      fetchDocuments();
      alert('Document archived successfully');
    } catch (error) {
      alert('Failed to archive document');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '1000px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
              📄 Documents - {driverName}
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0 0' }}>
              Manage driver licenses, certificates, and documents
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '20px',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('view')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'view' ? '#3b82f6' : 'transparent',
              color: activeTab === 'view' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            📁 Driver Documents
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'upload' ? '#3b82f6' : 'transparent',
              color: activeTab === 'upload' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            ⬆️ Upload New
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'all' ? '#3b82f6' : 'transparent',
              color: activeTab === 'all' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            🔍 All Documents (Cross-Module)
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Document Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  {documentCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label} - {cat.description}
                    </option>
                  ))}
                </select>
              </div>

              {uploadError && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  color: '#dc2626',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  ❌ {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#d1fae5',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  color: '#059669',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  ✅ {uploadSuccess}
                </div>
              )}

              {tenantId && (
                <DocumentUploadZone
                  tenantId={tenantId}
                  module="drivers"
                  entityId={driverId}
                  category={uploadCategory}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                />
              )}
            </div>
          )}

          {/* View Tab */}
          {activeTab === 'view' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">All Categories</option>
                  {documentCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
                  Loading documents...
                </div>
              ) : (
                <DocumentsList
                  documents={documents}
                  groupBy="category"
                  showExpiry={true}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  emptyMessage={`No documents found for this driver${selectedCategory ? ' in this category' : ''}`}
                />
              )}
            </div>
          )}

          {/* All Documents Tab (Cross-Module) */}
          {activeTab === 'all' && (
            <div>
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#1e40af',
                  fontWeight: 500,
                  marginBottom: '4px'
                }}>
                  🔍 Cross-Module View
                </div>
                <div style={{ fontSize: '13px', color: '#3b82f6' }}>
                  Showing all documents for {driverName} from all modules (Drivers, Training, Safeguarding, etc.)
                </div>
              </div>

              {loading ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
                  Loading all documents...
                </div>
              ) : (
                <DocumentsList
                  documents={documents}
                  groupBy="category"
                  showExpiry={true}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  emptyMessage={`No documents found for ${driverName} across all modules`}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
