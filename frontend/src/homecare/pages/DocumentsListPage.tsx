import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { documentApi, Document } from '../services/homecareApi';

function DocumentsListPage() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [tenantId, typeFilter, statusFilter]);

  const loadDocuments = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await documentApi.list(tenantId, params);
      setDocuments(response.data.documents);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load documents');
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenantId) return;

    const title = prompt('Enter document title:', file.name);
    if (!title) return;

    const type = prompt('Enter document type (policy, procedure, care_plan, risk_assessment, training, compliance, client_record, other):', 'other');
    if (!type) return;

    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('document_type', type);

      await documentApi.upload(tenantId, formData);
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload document');
      console.error('Failed to upload document:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (documentId: number) => {
    if (!tenantId) return;

    try {
      setError(null);
      await documentApi.approve(tenantId, documentId);
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve document');
      console.error('Failed to approve document:', err);
    }
  };

  const handleReject = async (documentId: number) => {
    if (!tenantId) return;

    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      setError(null);
      await documentApi.reject(tenantId, documentId, { reason });
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject document');
      console.error('Failed to reject document:', err);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!tenantId || !window.confirm('Are you sure you want to delete this document?')) return;

    try {
      setError(null);
      await documentApi.delete(tenantId, documentId);
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete document');
      console.error('Failed to delete document:', err);
    }
  };

  const getStatusBadge = (doc: Document) => {
    if (!doc.requires_approval) {
      return { background: '#f3f4f6', color: '#374151', label: 'No approval needed' };
    }

    const styles = {
      pending: { background: '#fef3c7', color: '#92400e', label: 'Pending' },
      approved: { background: '#d1fae5', color: '#065f46', label: 'Approved' },
      rejected: { background: '#fee2e2', color: '#991b1b', label: 'Rejected' },
    };
    return styles[doc.approval_status as keyof typeof styles] || styles.pending;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
          Documents
        </h1>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading...' : '+ Upload Document'}
          <input
            type="file"
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Type Filter */}
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Document Type
            </label>
            <select
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="policy">Policy</option>
              <option value="procedure">Procedure</option>
              <option value="care_plan">Care Plan</option>
              <option value="risk_assessment">Risk Assessment</option>
              <option value="training">Training</option>
              <option value="compliance">Compliance</option>
              <option value="client_record">Client Record</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Approval Status
            </label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>No documents found.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Title
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Type
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    File
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Expiry
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => {
                  const statusBadge = getStatusBadge(doc);
                  return (
                    <tr
                      key={doc.document_id}
                      style={{
                        borderBottom: index < documents.length - 1 ? '1px solid var(--gray-200)' : 'none',
                        background: isExpired(doc.expiry_date) ? '#fef2f2' : isExpiringSoon(doc.expiry_date) ? '#fffbeb' : 'white',
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{doc.title}</div>
                        {doc.description && (
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                            {doc.description.substring(0, 60)}{doc.description.length > 60 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '13px' }}>
                        <span style={{ textTransform: 'capitalize' }}>
                          {doc.document_type.replace('_', ' ')}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                          v{doc.version}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '13px', color: 'var(--gray-600)' }}>
                        <div>{doc.file_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                          {formatFileSize(doc.file_size)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '13px' }}>
                        {doc.expiry_date ? (
                          <div>
                            <div style={{ color: isExpired(doc.expiry_date) ? '#dc2626' : isExpiringSoon(doc.expiry_date) ? '#f59e0b' : 'var(--gray-900)' }}>
                              {new Date(doc.expiry_date).toLocaleDateString()}
                            </div>
                            {isExpired(doc.expiry_date) && (
                              <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>Expired</div>
                            )}
                            {isExpiringSoon(doc.expiry_date) && !isExpired(doc.expiry_date) && (
                              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 500 }}>Expiring Soon</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--gray-400)' }}>No expiry</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            ...statusBadge,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {doc.requires_approval && doc.approval_status === 'pending' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleApprove(doc.document_id)}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleReject(doc.document_id)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(doc.document_id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div style={{ marginTop: '1rem', fontSize: '13px', color: 'var(--gray-600)', textAlign: 'center' }}>
          Showing {documents.length} documents
        </div>
      )}
    </div>
  );
}

export default DocumentsListPage;
