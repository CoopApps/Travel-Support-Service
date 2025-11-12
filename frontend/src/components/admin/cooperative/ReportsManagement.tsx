import React, { useState, useEffect } from 'react';
import * as cooperativeApi from '../../../services/cooperativeApi';

interface ReportsManagementProps {
  tenantId: number;
}

const ReportsManagement: React.FC<ReportsManagementProps> = ({ tenantId }) => {
  const [reports, setReports] = useState<cooperativeApi.CooperativeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [viewingReport, setViewingReport] = useState<cooperativeApi.CooperativeReport | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    report_type: 'annual' as 'annual' | 'financial' | 'membership' | 'compliance',
    period_start: '',
    period_end: '',
    notes: '',
  });

  useEffect(() => {
    loadReports();
  }, [tenantId, filterStatus, filterType, filterYear]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { reports: data } = await cooperativeApi.getReports(tenantId, {
        status: filterStatus || undefined,
        report_type: filterType || undefined,
        year: filterYear,
      });
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (report?: cooperativeApi.CooperativeReport) => {
    if (report) {
      setViewingReport(report);
    } else {
      setViewingReport(null);
      setFormData({
        report_type: 'annual',
        period_start: '',
        period_end: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setViewingReport(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await cooperativeApi.createReport(tenantId, {
        report_type: formData.report_type,
        period_start: formData.period_start,
        period_end: formData.period_end,
        notes: formData.notes || undefined,
      });

      handleCloseModal();
      loadReports();
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Failed to create report');
    }
  };

  const handleStatusUpdate = async (reportId: number, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this report as ${newStatus}?`)) return;

    try {
      await cooperativeApi.updateReport(tenantId, reportId, {
        status: newStatus,
      });
      loadReports();
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('Failed to update report status');
    }
  };

  const reportTypeLabels: Record<string, string> = {
    annual: 'Annual Report',
    financial: 'Financial Report',
    membership: 'Membership Report',
    compliance: 'Compliance Report',
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: '#6b7280', text: '#fff' },
    submitted: { bg: '#f59e0b', text: '#fff' },
    approved: { bg: '#10b981', text: '#fff' },
    rejected: { bg: '#ef4444', text: '#fff' },
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>
            Reports Management
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)' }}>
            Submit and track governance and compliance reports
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            padding: '0.625rem 1.25rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Submit Report
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Year
          </label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Report Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">All Types</option>
            <option value="annual">Annual</option>
            <option value="financial">Financial</option>
            <option value="membership">Membership</option>
            <option value="compliance">Compliance</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-600)' }}>
          No reports found. Submit your first report to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reports.map((report) => (
            <div key={report.report_id} className="card">
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                        {reportTypeLabels[report.report_type]}
                      </h3>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: statusColors[report.status].bg,
                          color: statusColors[report.status].text,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {report.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Period:</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-900)', marginLeft: '0.5rem' }}>
                          {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                        </span>
                      </div>

                      {report.submitted_date && (
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Submitted:</span>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-900)', marginLeft: '0.5rem' }}>
                            {new Date(report.submitted_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {report.notes && (
                      <p style={{ margin: '0.75rem 0 0 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                        {report.notes}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenModal(report)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'var(--gray-100)',
                        color: 'var(--gray-700)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View
                    </button>

                    {report.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(report.report_id, 'approved')}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(report.report_id, 'rejected')}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
              {viewingReport ? 'Report Details' : 'Submit New Report'}
            </h3>

            {viewingReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                    Report Type
                  </label>
                  <div style={{ fontSize: '16px', color: 'var(--gray-900)' }}>
                    {reportTypeLabels[viewingReport.report_type]}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                    Status
                  </label>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      background: statusColors[viewingReport.status].bg,
                      color: statusColors[viewingReport.status].text,
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {viewingReport.status}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                    Reporting Period
                  </label>
                  <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                    {new Date(viewingReport.period_start).toLocaleDateString()} - {new Date(viewingReport.period_end).toLocaleDateString()}
                  </div>
                </div>

                {viewingReport.submitted_date && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                      Submitted Date
                    </label>
                    <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                      {new Date(viewingReport.submitted_date).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {viewingReport.notes && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                      Notes
                    </label>
                    <div style={{ fontSize: '14px', color: 'var(--gray-700)', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
                      {viewingReport.notes}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCloseModal}
                  style={{
                    marginTop: '1rem',
                    padding: '0.625rem 1.25rem',
                    background: 'var(--gray-100)',
                    color: 'var(--gray-700)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                    Report Type *
                  </label>
                  <select
                    value={formData.report_type}
                    onChange={(e) => setFormData({ ...formData, report_type: e.target.value as any })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="annual">Annual Report</option>
                    <option value="financial">Financial Report</option>
                    <option value="membership">Membership Report</option>
                    <option value="compliance">Compliance Report</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                    Period Start *
                  </label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                    Period End *
                  </label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Add any additional information or context for this report..."
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    style={{
                      padding: '0.625rem 1.25rem',
                      background: 'var(--gray-100)',
                      color: 'var(--gray-700)',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.625rem 1.25rem',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsManagement;
