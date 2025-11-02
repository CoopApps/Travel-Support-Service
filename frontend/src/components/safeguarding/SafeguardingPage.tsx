import { useState, useEffect } from 'react';
import { safeguardingApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { SafeguardingReport, ReportStatus, SeverityLevel } from '../../types';
import ReportDetailModal from './ReportDetailModal';

/**
 * Safeguarding Reports Management Page
 *
 * Admin interface for viewing and managing safeguarding concerns
 * CRITICAL SAFETY FEATURE
 */
function SafeguardingPage() {
  const { tenantId, tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<SafeguardingReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<SafeguardingReport[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // View state
  const [selectedReport, setSelectedReport] = useState<SafeguardingReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchReports();
    }
  }, [tenantId]);

  useEffect(() => {
    applyFilters();
  }, [reports, statusFilter, severityFilter, searchTerm]);

  const fetchReports = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const data = await safeguardingApi.getReports(tenantId);
      setReports(data.reports || []);
    } catch (err) {
      console.error('Error fetching safeguarding reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (severityFilter) {
      filtered = filtered.filter(r => r.severity === severityFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.driver_name?.toLowerCase().includes(term) ||
        r.customer_name?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.location?.toLowerCase().includes(term)
      );
    }

    setFilteredReports(filtered);
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    const config = {
      critical: { bg: '#fee2e2', color: '#991b1b', label: 'CRITICAL' },
      high: { bg: '#fed7aa', color: '#9a3412', label: 'HIGH' },
      medium: { bg: '#fef3c7', color: '#92400e', label: 'MEDIUM' },
      low: { bg: '#e0e7ff', color: '#3730a3', label: 'LOW' }
    };
    const style = config[severity];
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.5px'
      }}>
        {style.label}
      </span>
    );
  };

  const getStatusBadge = (status: ReportStatus) => {
    const config: Record<ReportStatus, { bg: string; color: string }> = {
      submitted: { bg: '#dbeafe', color: '#1e40af' },
      under_review: { bg: '#fef3c7', color: '#92400e' },
      investigating: { bg: '#fde68a', color: '#78350f' },
      resolved: { bg: '#d1fae5', color: '#065f46' },
      closed: { bg: '#e5e7eb', color: '#374151' }
    };
    const style = config[status];
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600
      }}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewReport = (report: SafeguardingReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleCloseModal = (shouldRefresh: boolean) => {
    setShowDetailModal(false);
    setSelectedReport(null);
    if (shouldRefresh) {
      fetchReports();
    }
  };

  // Calculate stats
  const stats = {
    total: reports.length,
    critical: reports.filter(r => r.severity === 'critical' && r.status !== 'resolved' && r.status !== 'closed').length,
    high: reports.filter(r => r.severity === 'high' && r.status !== 'resolved' && r.status !== 'closed').length,
    pending: reports.filter(r => r.status === 'submitted' || r.status === 'under_review').length,
    resolved: reports.filter(r => r.status === 'resolved').length
  };

  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to load safeguarding reports.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Safeguarding Reports</h2>
          <button onClick={fetchReports} className="btn btn-secondary" style={{ fontSize: '14px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
        {tenant && (
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px' }}>
            {tenant.company_name} - Critical Safety Reporting System
          </p>
        )}
      </div>

      {/* Critical Alert Banner */}
      {stats.critical > 0 && (
        <div style={{
          background: '#fee2e2',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#991b1b', fontSize: '14px' }}>
              {stats.critical} CRITICAL REPORT{stats.critical > 1 ? 'S' : ''} REQUIRING IMMEDIATE ATTENTION
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#7f1d1d' }}>
              These reports require immediate review and action
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '4px' }}>Total Reports</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)' }}>{stats.total}</div>
        </div>
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '4px' }}>Critical (Open)</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>{stats.critical}</div>
        </div>
        <div style={{ background: '#fed7aa', border: '1px solid #fdba74', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#9a3412', marginBottom: '4px' }}>High Priority (Open)</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ea580c' }}>{stats.high}</div>
        </div>
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '4px' }}>Pending Review</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{stats.pending}</div>
        </div>
        <div style={{ background: '#d1fae5', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '4px' }}>Resolved</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{stats.resolved}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        border: '1px solid var(--gray-200)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search driver, customer, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ fontSize: '14px' }}
          />
        </div>
        <div style={{ minWidth: '150px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | '')}
            className="form-control"
            style={{ fontSize: '14px' }}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div style={{ minWidth: '130px' }}>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel | '')}
            className="form-control"
            style={{ fontSize: '14px' }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="empty-state">
          <p style={{ color: 'var(--gray-600)' }}>
            {reports.length === 0
              ? 'No safeguarding reports have been submitted yet.'
              : 'No reports match the current filters.'
            }
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              <tr>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Ref</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Date/Time</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Severity</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Driver</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Customer</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.report_id}
                  style={{
                    borderBottom: '1px solid var(--gray-100)',
                    background: report.confidential ? '#fef3c7' : 'white'
                  }}
                >
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                    SG-{report.report_id}
                    {report.confidential && (
                      <div style={{ fontSize: '10px', color: '#92400e', marginTop: '2px', fontWeight: 500 }}>
                        🔒 CONFIDENTIAL
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--gray-600)', fontSize: '13px' }}>
                    {formatDate(report.incident_date)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {getSeverityBadge(report.severity)}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--gray-700)' }}>
                    {report.incident_type.replace('_', ' ')}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <strong style={{ color: 'var(--gray-900)', fontSize: '13px' }}>
                      {report.driver_name || 'Unknown'}
                    </strong>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--gray-700)' }}>
                    {report.customer_name || '-'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {getStatusBadge(report.status)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      onClick={() => handleViewReport(report)}
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '13px' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report Detail Modal */}
      {showDetailModal && selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default SafeguardingPage;
