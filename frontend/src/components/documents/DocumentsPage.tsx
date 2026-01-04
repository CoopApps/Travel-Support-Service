import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { documentApi, DocumentsResponse, DocumentStats } from '../../services/documentApi';
import { DocumentsList } from './DocumentsList';

export function DocumentsPage() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentsResponse | null>(null);
  const [stats, setStats] = useState<DocumentStats | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [expiryStatus, setExpiryStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'uploaded_at' | 'original_filename' | 'file_size' | 'expiry_date'>('uploaded_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const fetchStats = async () => {
    if (!tenantId) return;

    try {
      const statsData = await documentApi.getDocumentStats(tenantId);
      setStats(statsData);
    } catch {
      // Error handled silently
    }
  };

  const fetchDocuments = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: 20,
        sortBy,
        sortOrder
      };

      if (searchQuery) params.search = searchQuery;
      if (selectedModule) params.module = selectedModule;
      if (selectedCategory) params.category = selectedCategory;
      if (expiryStatus) params.expiryStatus = expiryStatus;

      const data = await documentApi.getAllDocuments(tenantId, params);
      setDocuments(data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchStats();
      fetchDocuments();
    }
  }, [tenantId, currentPage, sortBy, sortOrder, selectedModule, selectedCategory, expiryStatus]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDocuments();
  };

  const handleDownload = async (documentId: number) => {
    if (!tenantId) return;

    try {
      const blob = await documentApi.downloadDocument(tenantId, documentId);
      const doc = documents?.documents.find(d => d.document_id === documentId);
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
      fetchStats();
      alert('Document archived successfully');
    } catch (error) {
      alert('Failed to archive document');
    }
  };

  if (!tenantId) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
          Documents
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Manage all documents across your organization
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Total Documents
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
              {stats.overall.total_documents}
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Expiring Soon
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#eab308' }}>
              {stats.overall.expiring_soon_count}
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Expired
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#dc2626' }}>
              {stats.overall.expired_count}
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Total Storage
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
              {stats.overall.total_storage}
            </div>
          </div>
        </div>
      )}

      {/* Module Quick Access Buttons */}
      {stats && stats.byModule.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '12px'
          }}>
            Quick Access by Module
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <button
              onClick={() => {
                setSelectedModule('');
                setCurrentPage(1);
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: selectedModule === '' ? '#3b82f6' : '#ffffff',
                color: selectedModule === '' ? '#ffffff' : '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              All Modules
            </button>
            {stats.byModule.map((mod) => (
              <button
                key={mod.module}
                onClick={() => {
                  setSelectedModule(mod.module);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: selectedModule === mod.module ? '#3b82f6' : '#ffffff',
                  color: selectedModule === mod.module ? '#ffffff' : '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  textTransform: 'capitalize'
                }}
              >
                {mod.module} ({mod.document_count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* Search */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '6px'
            }}>
              Search
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="Search documents..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Search
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '6px'
            }}>
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">All Categories</option>
              <option value="license">License</option>
              <option value="dbs">DBS</option>
              <option value="insurance">Insurance</option>
              <option value="mot">MOT</option>
              <option value="training">Training</option>
              <option value="medical">Medical</option>
              <option value="permit">Permit</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Expiry Status */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '6px'
            }}>
              Expiry Status
            </label>
            <select
              value={expiryStatus}
              onChange={(e) => {
                setExpiryStatus(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">All Documents</option>
              <option value="expired">Expired</option>
              <option value="expiring">Expiring Soon</option>
              <option value="valid">Valid</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '6px'
            }}>
              Sort By
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="uploaded_at">Upload Date</option>
                <option value="original_filename">Name</option>
                <option value="file_size">Size</option>
                <option value="expiry_date">Expiry</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                title={sortOrder === 'ASC' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'ASC' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '18px' }}>Loading documents...</div>
        </div>
      ) : documents && documents.documents.length > 0 ? (
        <>
          <DocumentsList
            documents={documents.documents}
            showExpiry={true}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />

          {/* Pagination */}
          {documents.totalPages && documents.totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '30px'
            }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
                  color: currentPage === 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                ← Previous
              </button>

              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Page {currentPage} of {documents.totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === documents.totalPages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === documents.totalPages ? '#f3f4f6' : '#3b82f6',
                  color: currentPage === documents.totalPages ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage === documents.totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
          <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            No documents found
          </div>
          <div style={{ fontSize: '16px' }}>
            Try adjusting your filters or upload some documents to get started
          </div>
        </div>
      )}
    </div>
  );
}
