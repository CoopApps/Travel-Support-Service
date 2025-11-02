import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { feedbackApi } from '../../services/api';
import FeedbackStats from './FeedbackStats';

interface Feedback {
  feedback_id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  feedback_type: 'feedback' | 'complaint' | 'compliment' | 'suggestion';
  category?: string;
  subject: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  driver_name?: string;
  vehicle_registration?: string;
  incident_date?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  satisfaction_rating?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Feedback Management Page
 *
 * Complete feedback and complaints management with:
 * - Customer feedback submissions
 * - Status tracking (pending -> investigating -> resolved)
 * - Filtering by type, status, and severity
 * - Resolution tracking
 */
function FeedbackPage() {
  const { tenantId, tenant } = useTenant();

  // Safety check
  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  // State for feedback data
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  /**
   * Fetch feedback from API
   */
  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError('');

      const params: any = {
        page,
        limit,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };

      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.feedbackType = typeFilter;
      if (severityFilter) params.severity = severityFilter;

      const response = await feedbackApi.getFeedback(tenantId, params);

      setFeedbackList(response.feedback || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error loading feedback:', err);
      const errorMessage = err.response?.data?.error?.message
        || err.response?.data?.message
        || err.response?.data?.error
        || err.message
        || 'Failed to load feedback';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchFeedback();
    }
  }, [tenantId, page, statusFilter, typeFilter, severityFilter]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, React.CSSProperties> = {
      pending: { background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
      acknowledged: { background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
      investigating: { background: '#e9d5ff', color: '#6b21a8', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
      resolved: { background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
      closed: { background: '#f3f4f6', color: '#374151', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }
    };
    return <span style={styles[status] || styles.pending}>{status.replace('_', ' ')}</span>;
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, React.CSSProperties> = {
      complaint: { background: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
      feedback: { background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
      compliment: { background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 },
      suggestion: { background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }
    };
    return <span style={styles[type] || styles.feedback}>{type}</span>;
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return <span style={{ color: 'var(--gray-400)' }}>-</span>;
    const styles: Record<string, React.CSSProperties> = {
      low: { background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 },
      medium: { background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 },
      high: { background: '#fed7aa', color: '#9a3412', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 },
      critical: { background: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }
    };
    return <span style={styles[severity] || styles.medium}>{severity}</span>;
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Feedback & Support</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <FeedbackStats />

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ minWidth: '150px' }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            style={{ minWidth: '150px' }}
          >
            <option value="">All Types</option>
            <option value="complaint">Complaint</option>
            <option value="feedback">Feedback</option>
            <option value="compliment">Compliment</option>
            <option value="suggestion">Suggestion</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            style={{ minWidth: '150px' }}
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {(statusFilter || typeFilter || severityFilter) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
                setSeverityFilter('');
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading feedback...</p>
        </div>
      ) : feedbackList.length === 0 ? (
        /* Empty State */
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            {statusFilter || typeFilter || severityFilter
              ? 'No feedback matches the current filters.'
              : 'No feedback submitted yet.'}
          </p>
        </div>
      ) : (
        /* Feedback Table */
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.map((feedback) => (
                  <tr key={feedback.feedback_id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                          {feedback.customer_name || 'Unknown'}
                        </div>
                        {feedback.customer_email && (
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            {feedback.customer_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{getTypeBadge(feedback.feedback_type)}</td>
                    <td>
                      <div style={{ maxWidth: '300px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--gray-900)', marginBottom: '2px' }}>
                          {feedback.subject}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
                          {feedback.description.length > 100
                            ? `${feedback.description.substring(0, 100)}...`
                            : feedback.description}
                        </div>
                      </div>
                    </td>
                    <td>{getSeverityBadge(feedback.severity)}</td>
                    <td>{getStatusBadge(feedback.status)}</td>
                    <td style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                      {formatDate(feedback.created_at)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => alert(`View feedback #${feedback.feedback_id} - Full details modal coming soon`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem',
              padding: '1rem',
              borderTop: '1px solid var(--gray-200)'
            }}>
              <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
                Page {page} of {totalPages}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  style={{ opacity: page === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  style={{ opacity: page === totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FeedbackPage;
