import { useState } from 'react';
import { safeguardingApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { SafeguardingReport, ReportStatus } from '../../types';

interface ReportDetailModalProps {
  report: SafeguardingReport;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Safeguarding Report Detail Modal
 *
 * View full report details and update status/notes
 */
function ReportDetailModal({ report, onClose }: ReportDetailModalProps) {
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [investigationNotes, setInvestigationNotes] = useState(report.investigation_notes || '');
  const [resolution, setResolution] = useState(report.resolution || '');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUpdate = async () => {
    if (!tenantId) return;

    // Validation
    if (status === 'resolved' && !resolution.trim()) {
      setError('Resolution notes are required when marking as resolved');
      return;
    }

    setError('');
    setUpdating(true);

    try {
      await safeguardingApi.updateReport(tenantId, report.report_id, {
        status,
        investigation_notes: investigationNotes.trim() || undefined,
        resolution: resolution.trim() || undefined
      });
      onClose(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update report');
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#f59e0b',
      low: '#3b82f6'
    };
    return colors[severity] || '#6b7280';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: 'var(--shadow-xl)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid var(--gray-200)',
          background: report.severity === 'critical' ? '#fee2e2' : 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--gray-900)' }}>
                Safeguarding Report #{report.report_id}
              </h2>
              <div style={{ marginTop: '8px', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  background: getSeverityColor(report.severity),
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.5px'
                }}>
                  {report.severity.toUpperCase()} PRIORITY
                </span>
                {report.confidential && (
                  <span style={{
                    background: '#fbbf24',
                    color: '#78350f',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    🔒 CONFIDENTIAL
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onClose(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '28px',
                color: 'var(--gray-400)',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          {/* Incident Details */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
              Incident Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>
                  Incident Type
                </label>
                <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                  {report.incident_type.replace('_', ' ')}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>
                  Incident Date/Time
                </label>
                <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                  {formatDate(report.incident_date)}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>
                  Location
                </label>
                <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                  {report.location}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>
                  Reported On
                </label>
                <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                  {formatDate(report.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* People Involved */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
              People Involved
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>
                  Reporting Driver
                </label>
                <div style={{ fontSize: '14px', color: 'var(--gray-900)', fontWeight: 600 }}>
                  {report.driver_name || 'Unknown'}
                </div>
                {report.driver_phone && (
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '2px' }}>
                    {report.driver_phone}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>
                  Customer (if applicable)
                </label>
                <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                  {report.customer_name || 'N/A'}
                </div>
                {report.customer_address && (
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '2px' }}>
                    {report.customer_address}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '0.75rem' }}>
              Description of Incident
            </h3>
            <div style={{
              background: 'var(--gray-50)',
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid var(--gray-200)',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--gray-800)',
              whiteSpace: 'pre-wrap'
            }}>
              {report.description}
            </div>
          </div>

          {/* Action Taken */}
          {report.action_taken && report.action_taken !== 'None' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '0.75rem' }}>
                Immediate Action Taken
              </h3>
              <div style={{
                background: '#dbeafe',
                padding: '1rem',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#1e40af'
              }}>
                {report.action_taken}
              </div>
            </div>
          )}

          {/* Management Actions - Editable */}
          <div style={{
            borderTop: '2px solid var(--gray-200)',
            paddingTop: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
              Management Actions
            </h3>

            {/* Status */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus)}
                className="form-control"
              >
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Investigation Notes */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
                Investigation Notes
              </label>
              <textarea
                value={investigationNotes}
                onChange={(e) => setInvestigationNotes(e.target.value)}
                className="form-control"
                rows={4}
                placeholder="Document investigation steps, findings, and actions taken..."
              />
            </div>

            {/* Resolution */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
                Resolution {status === 'resolved' && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="form-control"
                rows={3}
                placeholder="Final outcome and resolution of the concern..."
              />
            </div>

            {report.resolved_date && (
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                Resolved on: {formatDate(report.resolved_date)}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '2px solid var(--gray-200)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background: 'var(--gray-50)'
        }}>
          <button
            onClick={() => onClose(false)}
            className="btn btn-secondary"
            disabled={updating}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            className="btn btn-primary"
            disabled={updating}
          >
            {updating ? 'Updating...' : 'Update Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportDetailModal;
