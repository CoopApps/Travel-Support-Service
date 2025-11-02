import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';
import { timesheetApi } from '../../services/api';

interface TimesheetWithDriver {
  id: number;
  driver_id: number;
  driver_name: string;
  employment_type: string;
  hourly_rate?: number;
  week_starting: string;
  week_ending: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  total_pay?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submitted_at?: string;
  driver_notes?: string;
  notes?: string;
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  saturday_hours: number;
  sunday_hours: number;
}

interface TimesheetSummary {
  total_timesheets: number;
  pending_approval: number;
  approved_this_week: number;
  total_hours_this_week: number;
  total_pay_pending: number;
}

function TimesheetApprovalPage() {
  const { tenant } = useTenant();
  const user = useAuthStore((state) => state.user);
  const [timesheets, setTimesheets] = useState<TimesheetWithDriver[]>([]);
  const [summary, setSummary] = useState<TimesheetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithDriver | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'approval' | 'archive'>('approval');

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.tenant_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pendingData, summaryData] = await Promise.all([
        timesheetApi.getPending(tenant!.tenant_id),
        timesheetApi.getSummary(tenant!.tenant_id)
      ]);

      setTimesheets(pendingData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Error loading timesheets:', err);
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const handleApprove = async () => {
    if (!selectedTimesheet || !user) return;

    try {
      setProcessing(true);

      await timesheetApi.approve(tenant!.tenant_id, selectedTimesheet.id, {
        approved_by: user.id,
        notes: approvalNotes || undefined
      });

      setSelectedTimesheet(null);
      setActionType(null);
      setApprovalNotes('');
      await loadData();
    } catch (err: any) {
      console.error('Error approving timesheet:', err);
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to approve timesheet');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTimesheet || !user || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);

      await timesheetApi.reject(tenant!.tenant_id, selectedTimesheet.id, {
        rejected_by: user.id,
        rejection_reason: rejectionReason
      });

      setSelectedTimesheet(null);
      setActionType(null);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
      console.error('Error rejecting timesheet:', err);
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to reject timesheet');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading timesheets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={loadData} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="timesheet-approval-page">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Timesheet Approval</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <span className="badge badge-warning" style={{ padding: '8px 16px', fontSize: '14px' }}>
          {timesheets.length} awaiting review
        </span>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          background: '#fff3e0',
          color: '#f57c00'
        }}>
          <h4 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 5px 0' }}>
            {summary?.pending_approval || 0}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            Pending Approval
          </small>
        </div>
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          background: '#e8f5e9',
          color: '#388e3c'
        }}>
          <h4 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 5px 0' }}>
            {summary?.approved_this_week || 0}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            Approved This Week
          </small>
        </div>
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          background: '#e3f2fd',
          color: '#1976d2'
        }}>
          <h4 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 5px 0' }}>
            {summary?.total_hours_this_week?.toFixed(1) || '0.0'}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            Total Hours (Week)
          </small>
        </div>
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          background: '#f3e5f5',
          color: '#7b1fa2'
        }}>
          <h4 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 5px 0' }}>
            {formatCurrency(summary?.total_pay_pending)}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            Pending Payment
          </small>
        </div>
      </div>

      {/* View Toggle Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '1.5rem',
        borderBottom: '2px solid var(--gray-200)',
        paddingBottom: '0'
      }}>
        <button
          style={{
            padding: '12px 24px',
            border: 'none',
            background: viewMode === 'approval' ? 'white' : 'transparent',
            borderBottom: viewMode === 'approval' ? '3px solid var(--primary)' : '3px solid transparent',
            color: viewMode === 'approval' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: viewMode === 'approval' ? 600 : 400,
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
          onClick={() => setViewMode('approval')}
        >
          Pending Approval
        </button>
        <button
          style={{
            padding: '12px 24px',
            border: 'none',
            background: viewMode === 'archive' ? 'white' : 'transparent',
            borderBottom: viewMode === 'archive' ? '3px solid var(--primary)' : '3px solid transparent',
            color: viewMode === 'archive' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: viewMode === 'archive' ? 600 : 400,
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
          onClick={() => setViewMode('archive')}
        >
          Archive
        </button>
      </div>

      {viewMode === 'archive' ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--gray-50)',
          borderRadius: '8px',
          border: '1px dashed var(--gray-300)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--gray-700)' }}>Timesheet Archive</h3>
          <p style={{ color: 'var(--gray-500)', margin: 0 }}>
            Archived timesheets will be displayed here. Feature coming soon...
          </p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Week</th>
                <th>Total Hours</th>
                <th>Regular</th>
                <th>Overtime</th>
                <th>Estimated Pay</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--gray-500)', margin: 0 }}>
                      No timesheets pending approval
                    </p>
                  </td>
                </tr>
              ) : (
                timesheets.map((timesheet) => (
                  <tr key={timesheet.id}>
                    <td>
                      <strong>{timesheet.driver_name}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                        {timesheet.employment_type}
                      </div>
                    </td>
                    <td>
                      {formatDate(timesheet.week_starting)} - {formatDate(timesheet.week_ending)}
                    </td>
                    <td><strong>{timesheet.total_hours.toFixed(1)}h</strong></td>
                    <td>{timesheet.regular_hours.toFixed(1)}h</td>
                    <td>{timesheet.overtime_hours.toFixed(1)}h</td>
                    <td>{formatCurrency(timesheet.total_pay)}</td>
                    <td>
                      {timesheet.submitted_at ? formatDate(timesheet.submitted_at) : '-'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon btn-success"
                          onClick={() => {
                            setSelectedTimesheet(timesheet);
                            setActionType('approve');
                          }}
                          title="Approve"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => {
                            setSelectedTimesheet(timesheet);
                            setActionType('reject');
                          }}
                          title="Reject"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setSelectedTimesheet(timesheet);
                            setActionType(null);
                          }}
                          title="View Details"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
        </div>
      )}

      {/* Timesheet Details/Action Modal */}
      {selectedTimesheet && (
        <div className="modal-overlay" onClick={() => !processing && setSelectedTimesheet(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Timesheet - {selectedTimesheet.driver_name}</h2>
            <p style={{ color: 'var(--gray-600)', margin: '0 0 24px 0' }}>
              Week: {formatDate(selectedTimesheet.week_starting)} - {formatDate(selectedTimesheet.week_ending)}
            </p>

            {/* Daily Hours Breakdown */}
            <div className="hours-grid">
              <div className="hours-item">
                <label>Monday</label>
                <span>{selectedTimesheet.monday_hours.toFixed(1)}h</span>
              </div>
              <div className="hours-item">
                <label>Tuesday</label>
                <span>{selectedTimesheet.tuesday_hours.toFixed(1)}h</span>
              </div>
              <div className="hours-item">
                <label>Wednesday</label>
                <span>{selectedTimesheet.wednesday_hours.toFixed(1)}h</span>
              </div>
              <div className="hours-item">
                <label>Thursday</label>
                <span>{selectedTimesheet.thursday_hours.toFixed(1)}h</span>
              </div>
              <div className="hours-item">
                <label>Friday</label>
                <span>{selectedTimesheet.friday_hours.toFixed(1)}h</span>
              </div>
              <div className="hours-item">
                <label>Saturday</label>
                <span>{selectedTimesheet.saturday_hours.toFixed(1)}h</span>
              </div>
              <div className="hours-item">
                <label>Sunday</label>
                <span>{selectedTimesheet.sunday_hours.toFixed(1)}h</span>
              </div>
            </div>

            {/* Summary */}
            <div className="detail-grid" style={{ marginTop: '24px' }}>
              <div className="detail-item">
                <label>Total Hours:</label>
                <span><strong>{selectedTimesheet.total_hours.toFixed(1)}h</strong></span>
              </div>
              <div className="detail-item">
                <label>Regular Hours:</label>
                <span>{selectedTimesheet.regular_hours.toFixed(1)}h</span>
              </div>
              <div className="detail-item">
                <label>Overtime Hours:</label>
                <span>{selectedTimesheet.overtime_hours.toFixed(1)}h</span>
              </div>
              <div className="detail-item">
                <label>Estimated Pay:</label>
                <span><strong>{formatCurrency(selectedTimesheet.total_pay)}</strong></span>
              </div>
            </div>

            {/* Driver Notes */}
            {selectedTimesheet.driver_notes && (
              <div style={{ marginTop: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Driver Notes:
                </label>
                <div style={{ padding: '12px', background: 'var(--gray-50)', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                  {selectedTimesheet.driver_notes}
                </div>
              </div>
            )}

            {/* Action Forms */}
            {actionType === 'approve' && (
              <div style={{ marginTop: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Approval Notes (optional):
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--gray-300)' }}
                />
              </div>
            )}

            {actionType === 'reject' && (
              <div style={{ marginTop: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--danger-600)' }}>
                  Rejection Reason (required):
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this timesheet is being rejected..."
                  rows={3}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--danger-300)' }}
                  required
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              {actionType === 'approve' && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={handleApprove}
                    disabled={processing}
                  >
                    {processing ? 'Approving...' : 'Confirm Approval'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setActionType(null)}
                    disabled={processing}
                  >
                    Cancel
                  </button>
                </>
              )}
              {actionType === 'reject' && (
                <>
                  <button
                    className="btn btn-danger"
                    onClick={handleReject}
                    disabled={processing || !rejectionReason.trim()}
                  >
                    {processing ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setActionType(null);
                      setRejectionReason('');
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </button>
                </>
              )}
              {!actionType && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => setActionType('approve')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setActionType('reject')}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedTimesheet(null)}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimesheetApprovalPage;
