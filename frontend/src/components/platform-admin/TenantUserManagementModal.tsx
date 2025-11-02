import { useState, useEffect } from 'react';
import { tenantApi } from '../../services/platform-admin-api';

interface TenantUser {
  user_id: number;
  tenant_id: number;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface TenantUserManagementModalProps {
  tenantId: number;
  companyName: string;
  onClose: () => void;
}

/**
 * Tenant User Management Modal
 *
 * View and manage users for a specific tenant
 */

function TenantUserManagementModal({ tenantId, companyName, onClose }: TenantUserManagementModalProps) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetPasswordData, setResetPasswordData] = useState<{
    username: string;
    temporaryPassword: string;
    emailSent: boolean;
  } | null>(null);

  useEffect(() => {
    loadUsers();
  }, [tenantId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await tenantApi.getTenantUsers(tenantId);
      setUsers(data);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: TenantUser) => {
    if (!confirm(`Generate a temporary password for user "${user.username}"?\n\nThis will invalidate their current password.`)) {
      return;
    }

    try {
      const result = await tenantApi.resetUserPassword(tenantId, user.user_id);
      setResetPasswordData(result);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to reset password');
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label} copied to clipboard!`);
    });
  };

  // Password Reset View
  if (resetPasswordData) {
    return (
      <>
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
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '600px',
              padding: '0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h2 style={{ margin: 0 }}>Password Reset Complete</h2>
            </div>

            <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔑</div>
              <h3 style={{ marginBottom: '1.5rem', color: '#059669' }}>Password Reset Successful</h3>

              <div style={{
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '1.5rem',
                margin: '1.5rem 0',
              }}>
                <p style={{ marginBottom: '0.75rem', color: '#92400e' }}><strong>Username:</strong></p>
                <code style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  background: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginBottom: '1.5rem',
                }}>
                  {resetPasswordData.username}
                </code>

                <p style={{ marginBottom: '0.75rem', color: '#92400e' }}><strong>Temporary Password:</strong></p>
                <code style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#dc2626',
                  background: 'white',
                  padding: '12px 20px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginBottom: '1rem',
                }}>
                  {resetPasswordData.temporaryPassword}
                </code>

                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => copyToClipboard(resetPasswordData.temporaryPassword, 'Password')}
                    className="btn btn-secondary btn-sm"
                    style={{ marginRight: '0.5rem' }}
                  >
                    📋 Copy Password
                  </button>
                  <button
                    onClick={() => copyToClipboard(
                      `Username: ${resetPasswordData.username}\nTemporary Password: ${resetPasswordData.temporaryPassword}`,
                      'Credentials'
                    )}
                    className="btn btn-secondary btn-sm"
                  >
                    📋 Copy Both
                  </button>
                </div>
              </div>

              {resetPasswordData.emailSent ? (
                <div className="alert alert-success" style={{ textAlign: 'left' }}>
                  <strong>✅ Email Sent</strong><br />
                  The user has been notified via email with their new temporary password.
                </div>
              ) : (
                <div className="alert alert-error" style={{ textAlign: 'left' }}>
                  <strong>⚠️ No Email Address</strong><br />
                  Please share this password with the user manually via phone or secure message.
                </div>
              )}

              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#f3f4f6',
                borderRadius: '6px',
                textAlign: 'left',
              }}>
                <p style={{ color: '#374151', fontSize: '14px', marginBottom: '0.5rem' }}><strong>Important:</strong></p>
                <ul style={{ color: '#6b7280', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                  <li>The user should change this password on first login</li>
                  <li>Keep this password confidential until delivered to the user</li>
                </ul>
              </div>
            </div>

            <div className="card-footer" style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              padding: '1rem',
              borderTop: '1px solid var(--gray-200)',
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setResetPasswordData(null)}
              >
                Back to Users
              </button>
              <button
                className="btn btn-primary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // User List View
  return (
    <>
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
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="card-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h2 style={{ margin: 0 }}>User Management - {companyName}</h2>
              <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: '4px 0 0 0' }}>
                Manage user accounts and reset passwords
              </p>
            </div>
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
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="info" style={{ textAlign: 'center', padding: '2rem' }}>
                <h4>No Users Found</h4>
                <p>No users exist for {companyName} yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Full Name</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.user_id}>
                        <td>
                          <strong style={{ fontFamily: 'monospace' }}>{user.username}</strong>
                        </td>
                        <td>{user.full_name || '-'}</td>
                        <td>
                          <span className={`status-badge status-${user.role}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>{user.email || '-'}</td>
                        <td>
                          {user.is_active ? (
                            <span className="status-badge status-active">Active</span>
                          ) : (
                            <span className="status-badge status-inactive">Inactive</span>
                          )}
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                          {formatDate(user.last_login)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-action btn-edit"
                            onClick={() => handleResetPassword(user)}
                            title="Reset password"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card-footer" style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            padding: '1rem',
            borderTop: '1px solid var(--gray-200)',
          }}>
            <button
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default TenantUserManagementModal;
