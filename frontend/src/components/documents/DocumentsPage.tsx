import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { documentApi, DocumentsResponse, DocumentStats } from '../../services/documentApi';
import { DocumentsList } from './DocumentsList';

export function DocumentsPage() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentsResponse | null>(null);
  const [stats, setStats] = useState<DocumentStats | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'uploaded_at' | 'original_filename' | 'file_size' | 'expiry_date'>('uploaded_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'archived' | 'expiring' | 'expired'>('all');

  // Bulk selection
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set());

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
    setError('');
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

      // Tab-based filtering
      if (activeTab === 'expiring') {
        params.expiryStatus = 'expiring';
      } else if (activeTab === 'expired') {
        params.expiryStatus = 'expired';
      } else if (activeTab === 'active') {
        params.expiryStatus = 'valid';
      }

      const data = await documentApi.getAllDocuments(tenantId, params);
      setDocuments(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!documents?.documents) return;

    const formatFileSize = (bytes: number) => {
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    };

    const headers = ['Filename', 'Category', 'Size', 'Expiry Status', 'Upload Date', 'Uploaded By'];
    const rows = documents.documents.map(doc => [
      doc.original_filename,
      doc.document_category || 'Other',
      formatFileSize(doc.file_size),
      doc.expiry_status?.toUpperCase() || 'N/A',
      formatDate(doc.uploaded_at),
      doc.uploaded_by_name || 'System'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `documents-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const toggleDocumentSelection = (docId: number) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!documents?.documents) return;
    if (selectedDocuments.size === documents.documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.documents.map(d => d.document_id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;
    if (!confirm(`Delete ${selectedDocuments.size} document(s)? This action cannot be undone.`)) return;

    if (!tenantId) return;

    try {
      for (const docId of Array.from(selectedDocuments)) {
        await documentApi.deleteDocument(tenantId, docId, false);
      }
      setSelectedDocuments(new Set());
      fetchDocuments();
      fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete documents');
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchStats();
      fetchDocuments();
    }
  }, [tenantId, currentPage, sortBy, sortOrder, selectedModule, selectedCategory, activeTab, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch {
      alert('Failed to download document');
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!tenantId) return;

    try {
      await documentApi.deleteDocument(tenantId, documentId, false);
      fetchDocuments();
      fetchStats();
    } catch {
      alert('Failed to delete document');
    }
  };

  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to load documents.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Header with Tabs and Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', padding: '0 1rem', marginTop: '1rem' }}>
        {/* Tabs - Compact Pill Style */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px' }}>
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            style={{
              padding: '4px 10px',
              background: activeTab === 'all' ? 'white' : 'transparent',
              color: activeTab === 'all' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            All
          </button>
          <button
            onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
            style={{
              padding: '4px 10px',
              background: activeTab === 'active' ? 'white' : 'transparent',
              color: activeTab === 'active' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'active' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Valid
          </button>
          <button
            onClick={() => { setActiveTab('expiring'); setCurrentPage(1); }}
            style={{
              padding: '4px 10px',
              background: activeTab === 'expiring' ? 'white' : 'transparent',
              color: activeTab === 'expiring' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'expiring' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Expiring
          </button>
          <button
            onClick={() => { setActiveTab('expired'); setCurrentPage(1); }}
            style={{
              padding: '4px 10px',
              background: activeTab === 'expired' ? 'white' : 'transparent',
              color: activeTab === 'expired' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'expired' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Expired
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '6px 10px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#374151'
            }}
            title="Export to CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <button
            onClick={fetchDocuments}
            style={{
              padding: '6px 12px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#374151',
              fontWeight: 500
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '12px',
          padding: '0 1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--color-brand-100)',
            color: 'var(--color-brand-700)',
            padding: '12px',
            borderRadius: '6px',
            minHeight: '95px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1.2, color: 'inherit' }}>
              {stats.overall.total_documents}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: '2px', color: 'inherit', opacity: 0.85 }}>
              Total
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-success-100)',
            color: 'var(--color-success-700)',
            padding: '12px',
            borderRadius: '6px',
            minHeight: '95px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1.2, color: 'inherit' }}>
              {stats.overall.total_documents - stats.overall.expiring_soon_count - stats.overall.expired_count}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: '2px', color: 'inherit', opacity: 0.85 }}>
              Valid
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-warning-100)',
            color: 'var(--color-warning-700)',
            padding: '12px',
            borderRadius: '6px',
            minHeight: '95px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1.2, color: 'inherit' }}>
              {stats.overall.expiring_soon_count}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: '2px', color: 'inherit', opacity: 0.85 }}>
              Expiring
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-danger-100)',
            color: 'var(--color-danger-700)',
            padding: '12px',
            borderRadius: '6px',
            minHeight: '95px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1.2, color: 'inherit' }}>
              {stats.overall.expired_count}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: '2px', color: 'inherit', opacity: 0.85 }}>
              Expired
            </div>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', padding: '0 1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '250px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px 6px 28px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                padding: '6px 10px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              Clear
            </button>
          )}
        </form>

        {/* Filters on Right */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '120px'
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

          <select
            value={selectedModule}
            onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '120px'
            }}
          >
            <option value="">All Modules</option>
            {stats?.byModule.map((mod) => (
              <option key={mod.module} value={mod.module}>
                {mod.module} ({mod.document_count})
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '120px'
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
              padding: '6px 10px',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#374151'
            }}
            title={sortOrder === 'ASC' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'ASC' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedDocuments.size > 0 && (
        <div style={{
          background: '#dbeafe',
          border: '1px solid #bfdbfe',
          borderRadius: '4px',
          padding: '12px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '0 1rem 12px 1rem'
        }}>
          <span style={{ color: '#1e40af', fontSize: '12px', fontWeight: 500 }}>
            {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSelectedDocuments(new Set())}
              style={{
                padding: '6px 10px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#374151'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              style={{
                padding: '6px 10px',
                background: '#ef4444',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'white',
                fontWeight: 500
              }}
            >
              Delete All
            </button>
          </div>
        </div>
      )}

      {/* Results Counter */}
      {documents && (
        <div style={{ marginBottom: '12px', color: '#6b7280', fontSize: '12px', padding: '0 1rem' }}>
          Showing {documents.documents.length} of {documents.totalRecords || 0} documents
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem' }}>Loading documents...</p>
        </div>
      ) : documents && documents.documents.length > 0 ? (
        <>
          <div style={{ padding: '0 1rem' }}>
            <DocumentsList
              documents={documents.documents}
              showExpiry={true}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onToggleSelect={toggleDocumentSelection}
              selectedDocuments={selectedDocuments}
            />
          </div>

          {/* Pagination */}
          {documents.totalPages && documents.totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '2rem',
              marginBottom: '1rem'
            }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 10px',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  color: currentPage === 1 ? '#9ca3af' : '#374151'
                }}
              >
                ← Previous
              </button>

              <span style={{ color: '#6b7280', fontSize: '12px' }}>
                Page {currentPage} of {documents.totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === documents.totalPages}
                style={{
                  padding: '6px 10px',
                  background: currentPage === documents.totalPages ? '#f3f4f6' : 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: currentPage === documents.totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  color: currentPage === documents.totalPages ? '#9ca3af' : '#374151'
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</div>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>
            No documents found
          </div>
          <div style={{ fontSize: '14px' }}>
            Try adjusting your filters or upload some documents
          </div>
        </div>
      )}
    </div>
  );
}
