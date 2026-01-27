import { useState, useEffect } from 'react';
import { safeguardingApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { SafeguardingReport, ReportStatus, SeverityLevel } from '../../types';
import ReportDetailModal from './ReportDetailModal';
import SafeguardingStatsCards from './SafeguardingStatsCards';
import './Safeguarding.css';

/**
 * Safeguarding Reports Management Page
 *
 * Admin interface for viewing and managing safeguarding concerns
 * CRITICAL SAFETY FEATURE
 */
function SafeguardingPage() {
  const { tenantId, tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [reports, setReports] = useState<SafeguardingReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<SafeguardingReport[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

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
  }, [reports, activeTab, statusFilter, severityFilter, searchTerm]);

  const fetchReports = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError('');
      const data = await safeguardingApi.getReports(tenantId);
      setReports(data.reports || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to load safeguarding reports';
      setError(errorMessage);
      console.error('Failed to load safeguarding reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Filter by tab (active vs archive)
    if (activeTab === 'active') {
      filtered = filtered.filter(r =>
        r.status !== 'resolved' && r.status !== 'closed'
      );
    } else {
      filtered = filtered.filter(r =>
        r.status === 'resolved' || r.status === 'closed'
      );
    }

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

  const handleArchiveReport = async (report: SafeguardingReport) => {
    if (!tenantId) return;

    const confirmed = window.confirm(
      `Archive report SG-${report.report_id}?\n\n` +
      `This will mark the report as "closed" and move it to the archive.\n\n` +
      `You can still view and edit it from the Archive tab.`
    );

    if (!confirmed) return;

    try {
      await safeguardingApi.updateReport(tenantId, report.report_id, {
        status: 'closed'
      });
      fetchReports();
    } catch (err) {
      alert('Failed to archive report. Please try again.');
    }
  };

  /**
   * Handle export to CSV
   */
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      alert('No reports to export');
      return;
    }

    // Prepare CSV data
    const headers = ['Ref', 'Date/Time', 'Severity', 'Type', 'Driver', 'Customer', 'Location', 'Status', 'Description'];
    const rows = filteredReports.map(report => [
      `SG-${report.report_id}`,
      formatDate(report.incident_date),
      report.severity.toUpperCase(),
      report.incident_type.replace('_', ' '),
      report.driver_name || '',
      report.customer_name || '',
      report.location || '',
      report.status.replace('_', ' ').toUpperCase(),
      (report.description || '').replace(/"/g, '""') // Escape quotes for CSV
    ]);

    // Convert to CSV format
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `safeguarding-reports-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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

      {/* Error Message */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem', gap: '8px' }}>
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
          onClick={() => window.location.href = '/safeguarding/new'}
          style={{
            padding: '6px 12px',
            background: '#10b981',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 500
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Report
        </button>
        <button
          onClick={fetchReports}
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

      {/* Tabs - Compact Pill Style */}
      <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '5px 12px',
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
          Active
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          style={{
            padding: '5px 12px',
            background: activeTab === 'archive' ? 'white' : 'transparent',
            color: activeTab === 'archive' ? '#111827' : '#6b7280',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '12px',
            boxShadow: activeTab === 'archive' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          Archived
        </button>
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
      <SafeguardingStatsCards stats={stats} />

      {/* Search & Filters */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px', display: 'flex', gap: '6px' }}>
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
              placeholder="Search driver, customer, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px 6px 28px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
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
        </div>

        {/* Filters on Right */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | '')}
            style={{
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '140px'
            }}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel | '')}
            style={{
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '120px'
            }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Results Counter */}
      <div style={{ marginBottom: '12px', color: 'var(--gray-600)', fontSize: '12px' }}>
        Showing {filteredReports.length} of {reports.length} reports
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
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleViewReport(report)}
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: '13px' }}
                      >
                        View Details
                      </button>
                      {activeTab === 'active' && (
                        <button
                          onClick={() => handleArchiveReport(report)}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '13px', background: 'var(--gray-200)', color: 'var(--gray-700)' }}
                          title="Archive this report"
                        >
                          Archive
                        </button>
                      )}
                    </div>
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
