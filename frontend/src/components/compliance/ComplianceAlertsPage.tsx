import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { complianceAlertsApi } from '../../services/api';
import { ComplianceAlert } from '../../types/permit.types';
import './Compliance.css';

/**
 * Compliance Alerts Page
 *
 * Displays and manages automated compliance alerts:
 * - Expiring permits
 * - Driver license issues
 * - COIF/MiDAS expiry
 * - Service registration requirements
 * - Financial surplus reviews
 */
function ComplianceAlertsPage() {
  const { tenant, tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState({
    status: 'active',
    severity: '',
    alertType: '',
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId, filter]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [alertsData, summaryData] = await Promise.all([
        complianceAlertsApi.getAlerts(tenantId, filter),
        complianceAlertsApi.getSummary(tenantId),
      ]);

      setAlerts(alertsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching compliance alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAlerts = async () => {
    if (!tenantId) return;

    try {
      setGenerating(true);
      await complianceAlertsApi.generateAlerts(tenantId);
      await fetchData();
    } catch (error) {
      console.error('Error generating alerts:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAcknowledge = async (alertId: number) => {
    if (!tenantId) return;

    try {
      await complianceAlertsApi.acknowledgeAlert(tenantId, alertId, {});
      await fetchData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleResolve = async (alertId: number, notes: string) => {
    if (!tenantId) return;

    try {
      await complianceAlertsApi.resolveAlert(tenantId, alertId, { resolution_notes: notes });
      await fetchData();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const handleDismiss = async (alertId: number) => {
    if (!tenantId) return;

    if (!confirm('Are you sure you want to dismiss this alert?')) return;

    try {
      await complianceAlertsApi.dismissAlert(tenantId, alertId, {});
      await fetchData();
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#2563eb';
      case 'info': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />;
      case 'high':
        return <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />;
      case 'medium':
        return <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
      default:
        return <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading compliance alerts...</p>
      </div>
    );
  }

  return (
    <div className="compliance-alerts-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Compliance Alerts</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={handleGenerateAlerts}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Generate Alerts'}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--red-500)' }}>
            <div className="stat-value">{summary.overall.critical_alerts || 0}</div>
            <div className="stat-label">Critical Alerts</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--orange-500)' }}>
            <div className="stat-value">{summary.overall.high_alerts || 0}</div>
            <div className="stat-label">High Priority</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--yellow-500)' }}>
            <div className="stat-value">{summary.overall.medium_alerts || 0}</div>
            <div className="stat-label">Medium Priority</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--blue-500)' }}>
            <div className="stat-value">{summary.overall.active_alerts || 0}</div>
            <div className="stat-label">Active Alerts</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="status-filter" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px', fontWeight: 500 }}>Status</label>
          <select
            id="status-filter"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="form-select"
            style={{ width: '180px' }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        <div>
          <label htmlFor="severity-filter" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px', fontWeight: 500 }}>Severity</label>
          <select
            id="severity-filter"
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            className="form-select"
            style={{ width: '180px' }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div>
          <label htmlFor="type-filter" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px', fontWeight: 500 }}>Alert Type</label>
          <select
            id="type-filter"
            value={filter.alertType}
            onChange={(e) => setFilter({ ...filter, alertType: e.target.value })}
            className="form-select"
            style={{ width: '220px' }}
          >
            <option value="">All Types</option>
            <option value="permit_expiring">Permit Expiring</option>
            <option value="permit_expired">Permit Expired</option>
            <option value="driver_license_expiring">License Expiring</option>
            <option value="coif_expired">COIF Expired</option>
            <option value="midas_expiring">MiDAS Expiring</option>
            <option value="dbs_expiring">DBS Expiring</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 style={{ color: 'var(--gray-700)', marginBottom: '0.5rem' }}>No Alerts Found</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            {filter.status || filter.severity || filter.alertType
              ? 'No alerts match your current filters.'
              : 'All compliance checks are up to date.'}
          </p>
        </div>
      ) : (
        <div className="alerts-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.map((alert) => (
            <div
              key={alert.alert_id}
              className="alert-card"
              style={{
                border: '1px solid var(--gray-200)',
                borderRadius: '8px',
                padding: '1.5rem',
                backgroundColor: 'white',
                borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start', flex: 1 }}>
                  <div style={{ color: getSeverityColor(alert.severity), marginTop: '2px' }}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {getSeverityIcon(alert.severity)}
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                        {alert.alert_title}
                      </h3>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: getSeverityColor(alert.severity),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {alert.severity}
                      </span>
                      {alert.acknowledged && (
                        <span className="badge" style={{ backgroundColor: 'var(--blue-100)', color: 'var(--blue-700)' }}>
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--gray-700)' }}>{alert.alert_message}</p>
                    {alert.action_required && (
                      <p style={{ margin: '0.5rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                        <strong>Action Required:</strong> {alert.action_required}
                      </p>
                    )}
                    {alert.action_deadline && (
                      <p style={{ margin: '0.5rem 0', fontSize: '14px', color: 'var(--red-600)' }}>
                        <strong>Deadline:</strong> {new Date(alert.action_deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!alert.acknowledged && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleAcknowledge(alert.alert_id!)}
                    >
                      Acknowledge
                    </button>
                  )}
                  {!alert.resolved && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => {
                        const notes = prompt('Resolution notes (optional):');
                        if (notes !== null) {
                          handleResolve(alert.alert_id!, notes);
                        }
                      }}
                    >
                      Resolve
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDismiss(alert.alert_id!)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {/* Alert Metadata */}
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px', color: 'var(--gray-500)', paddingTop: '1rem', borderTop: '1px solid var(--gray-100)' }}>
                <div>
                  <strong>Created:</strong> {new Date(alert.created_at!).toLocaleDateString()}
                </div>
                {alert.entity_type && (
                  <div>
                    <strong>Entity:</strong> {alert.entity_type}
                  </div>
                )}
                <div>
                  <strong>Status:</strong> {alert.status}
                </div>
              </div>

              {alert.resolution_notes && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--gray-50)', borderRadius: '4px', fontSize: '14px' }}>
                  <strong>Resolution Notes:</strong> {alert.resolution_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ComplianceAlertsPage;
