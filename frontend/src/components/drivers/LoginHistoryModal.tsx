import { useState, useEffect } from 'react';
import { Driver } from '../../types';
import { driverApi } from '../../services/api';

interface LoginHistoryModalProps {
  driver: Driver;
  tenantId: number;
  onClose: () => void;
}

/**
 * Login History Modal
 *
 * Displays login history and account activity for a driver
 */
function LoginHistoryModal({ driver, tenantId, onClose }: LoginHistoryModalProps) {
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Load login history
   */
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await driverApi.getLoginHistory(tenantId, driver.driver_id);
        setHistory(data);
      } catch (err: any) {
        setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load login history'));
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [tenantId, driver.driver_id]);

  /**
   * Format date/time
   */
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Get action label
   */
  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      account_created: 'Account Created',
      password_reset: 'Password Reset',
      username_changed: 'Username Changed'
    };
    return labels[action] || action;
  };

  /**
   * Get action color
   */
  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      login: 'var(--success)',
      logout: 'var(--gray-600)',
      account_created: 'var(--primary)',
      password_reset: 'var(--warning)',
      username_changed: 'var(--info)'
    };
    return colors[action] || 'var(--gray-600)';
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="card-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              Login History - {driver.name}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--gray-500)',
                padding: '0.25rem',
              }}
            >
              ×
            </button>
          </div>

          <div className="card-body">
            {/* Error Message */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading history...</p>
              </div>
            ) : history ? (
              <>
                {/* Summary Card */}
                <div style={{
                  background: '#f0f9ff',
                  padding: '14px',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  borderLeft: '4px solid #0ea5e9',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <div style={{ color: 'var(--gray-600)', fontSize: '11px', marginBottom: '2px' }}>Username:</div>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{history.username || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--gray-600)', fontSize: '11px', marginBottom: '2px' }}>Last Login:</div>
                      <div style={{ fontWeight: 500 }}>
                        {history.lastLogin ? formatDateTime(history.lastLogin) : 'Never'}
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ color: 'var(--gray-600)', fontSize: '11px', marginBottom: '2px' }}>Account Created:</div>
                      <div style={{ fontWeight: 500 }}>
                        {history.accountCreated ? formatDateTime(history.accountCreated) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* History Timeline */}
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-700)' }}>
                  Activity History
                </h3>

                {history.history && history.history.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {history.history.map((entry: any, index: number) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          background: 'var(--gray-50)',
                          borderRadius: '6px',
                          borderLeft: `3px solid ${getActionColor(entry.action)}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: getActionColor(entry.action),
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {getActionLabel(entry.action)}
                            </span>
                            {entry.success && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: 'var(--success)',
                                color: 'white',
                                borderRadius: '3px',
                                fontWeight: 600
                              }}>
                                Success
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                            {formatDateTime(entry.timestamp)}
                          </div>
                          {(entry.ipAddress && entry.ipAddress !== 'N/A') && (
                            <div style={{ fontSize: '10px', color: 'var(--gray-500)', marginTop: '2px' }}>
                              IP: {entry.ipAddress}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'var(--gray-500)',
                    fontStyle: 'italic'
                  }}>
                    <p>No activity recorded yet</p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      Login history will appear here as the driver uses their dashboard account.
                    </p>
                  </div>
                )}

                {/* Info Note */}
                <div style={{
                  background: '#fef9c3',
                  padding: '10px',
                  borderRadius: '4px',
                  marginTop: '1.5rem',
                  borderLeft: '3px solid #eab308',
                  fontSize: '12px',
                  color: '#713f12',
                }}>
                  <strong>Note:</strong> Currently showing basic login activity. Full audit logging with IP addresses and user agents will be available in a future update.
                </div>
              </>
            ) : null}

            {/* Close Button */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)', textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginHistoryModal;
