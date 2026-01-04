import { useState, useEffect, FormEvent } from 'react';
import { Driver } from '../../types';
import { driverApi } from '../../services/api';

interface DriverLoginManagementModalProps {
  driver: Driver;
  tenantId: number;
  onClose: (shouldRefresh: boolean) => void;
}

interface LoginDetails {
  isLoginEnabled: boolean;
  username: string | null;
  accountCreated: string | null;
  lastLogin: string | null;
}

/**
 * Driver Login Management Modal - Matching Customer Module Design
 *
 * Full-featured login management with username editing, password reset
 */
function DriverLoginManagementModal({ driver, tenantId, onClose }: DriverLoginManagementModalProps) {
  const [username, setUsername] = useState(driver.username || `driver.${driver.name.toLowerCase().replace(/\s+/g, '')}`);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login details from backend
  const [loginDetails, setLoginDetails] = useState<LoginDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Edit username state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  /**
   * Load login details from backend
   */
  useEffect(() => {
    const loadDetails = async () => {
      if (driver.is_login_enabled) {
        try {
          const details = await driverApi.getLoginDetails(tenantId, driver.driver_id);
          setLoginDetails({
            isLoginEnabled: details.is_login_enabled || false,
            username: details.username || null,
            accountCreated: details.user_created || null,
            lastLogin: details.last_login || null,
          });
          setNewUsername(details.username || '');
        } catch {
          // Error handled silently
        } finally {
          setLoadingDetails(false);
        }
      } else {
        setLoadingDetails(false);
      }
    };
    loadDetails();
  }, [tenantId, driver.driver_id, driver.is_login_enabled]);

  /**
   * Handle enable login
   */
  const handleEnableLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await driverApi.enableLogin(tenantId, driver.driver_id, { username, password });
      setSuccess('Login enabled successfully!');
      setTimeout(() => onClose(true), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to enable login');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle disable login
   */
  const handleDisableLogin = async () => {
    if (!confirm(`Are you sure you want to disable login for ${driver.name}?`)) {
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await driverApi.disableLogin(tenantId, driver.driver_id);
      setSuccess('Login disabled successfully!');
      setTimeout(() => onClose(true), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to disable login');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle reset password
   */
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await driverApi.resetPassword(tenantId, driver.driver_id, { newPassword });
      setSuccess('Password reset successfully!');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle update username
   */
  const handleUpdateUsername = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await driverApi.updateUsername(tenantId, driver.driver_id, { username: newUsername });
      setSuccess('Username updated successfully!');
      setIsEditingUsername(false);
      // Reload details
      const details = await driverApi.getLoginDetails(tenantId, driver.driver_id);
      setLoginDetails({
        isLoginEnabled: details.is_login_enabled || false,
        username: details.username || null,
        accountCreated: details.user_created || null,
        lastLogin: details.last_login || null,
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
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
        onClick={() => onClose(false)}
      >
        {/* Modal Content */}
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '600px',
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
              Login Management - {driver.name}
            </h2>
            <button
              onClick={() => onClose(false)}
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
            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                {success}
              </div>
            )}

            {/* Content based on login status */}
            {!driver.is_login_enabled ? (
              /* Enable Login Form */
              <form onSubmit={handleEnableLogin}>
                <div style={{
                  background: '#e8f5e9',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  borderLeft: '4px solid #28a745',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {driver.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                    Dashboard access is currently disabled for this driver
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="username">Username *</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="driver.johnsmith"
                  />
                  <small style={{ color: 'var(--gray-600)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    Driver will use this username to login to their dashboard
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Enter initial password"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onClose(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ background: '#28a745' }}
                  >
                    {loading ? 'Enabling...' : 'Enable Login'}
                  </button>
                </div>
              </form>
            ) : (
              /* Manage Login Section */
              <div>
                {loadingDetails ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading details...</p>
                  </div>
                ) : (
                  <>
                    {/* Account Status */}
                    <div style={{
                      background: '#f8fff8',
                      padding: '14px',
                      borderRadius: '8px',
                      marginBottom: '1.5rem',
                      borderLeft: '4px solid #28a745',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#28a745' }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#28a745' }}>
                          Dashboard Access Enabled
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                        <div>
                          <div style={{ color: 'var(--gray-600)', fontSize: '11px', marginBottom: '2px' }}>Username:</div>
                          <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{loginDetails?.username || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--gray-600)', fontSize: '11px', marginBottom: '2px' }}>Last Login:</div>
                          <div style={{ fontWeight: 500 }}>{formatDate(loginDetails?.lastLogin || null)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--gray-600)', fontSize: '11px', marginBottom: '2px' }}>Account Created:</div>
                          <div style={{ fontWeight: 500 }}>{formatDate(loginDetails?.accountCreated || null)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Edit Username Section */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
                          Edit Username
                        </h4>
                        {!isEditingUsername && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setIsEditingUsername(true)}
                            disabled={loading}
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {isEditingUsername ? (
                        <form onSubmit={handleUpdateUsername}>
                          <div className="form-group" style={{ marginBottom: '10px' }}>
                            <input
                              type="text"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              required
                              disabled={loading}
                              placeholder="Enter new username"
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="submit"
                              className="btn btn-sm"
                              disabled={loading}
                              style={{ background: '#17a2b8', color: 'white' }}
                            >
                              {loading ? 'Saving...' : 'Save Username'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setIsEditingUsername(false);
                                setNewUsername(loginDetails?.username || '');
                              }}
                              disabled={loading}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: 0 }}>
                          Current username: <strong style={{ fontFamily: 'monospace' }}>{loginDetails?.username}</strong>
                        </p>
                      )}
                    </div>

                    {/* Reset Password Section */}
                    <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>
                        Reset Password
                      </h4>
                      <form onSubmit={handleResetPassword}>
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                          <label htmlFor="newPassword">New Password *</label>
                          <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="Enter new password"
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-sm"
                          disabled={loading || !newPassword}
                          style={{ background: '#17a2b8', color: 'white' }}
                        >
                          {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                      </form>
                    </div>

                    {/* Disable Login Section */}
                    <div style={{
                      borderTop: '1px solid var(--gray-200)',
                      paddingTop: '1rem',
                    }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--danger)' }}>
                        Disable Dashboard Access
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '12px' }}>
                        This will deactivate the driver's dashboard account. They will no longer be able to log in.
                      </p>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={handleDisableLogin}
                        disabled={loading}
                      >
                        Disable Login
                      </button>
                    </div>

                    {/* Close Button */}
                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onClose(false)}
                        disabled={loading}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default DriverLoginManagementModal;
