import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';

/**
 * Unified Login Page
 *
 * Single login interface for all user types (admin, driver, customer)
 * Automatically routes to the appropriate dashboard based on user role
 */
function UnifiedLogin() {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(tenantId!, { username, password });

      // Store auth data using authStore
      login(response.user, response.token);

      // Route based on user role
      switch (response.user.role) {
        case 'driver':
          navigate('/driver/dashboard');
          break;
        case 'customer':
          navigate('/customer/dashboard');
          break;
        case 'admin':
        case 'super_admin':
        case 'staff':
        default:
          navigate('/dashboard');
          break;
      }
    } catch (err: any) {
      // Handle different error response formats and ensure we always get a string
      let errorMessage = 'Invalid username or password';

      if (err.response?.data) {
        // Check if it's a string
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        }
        // Check for message property
        else if (typeof err.response.data.message === 'string') {
          errorMessage = err.response.data.message;
        }
        // Check for error property
        else if (typeof err.response.data.error === 'string') {
          errorMessage = err.response.data.error;
        }
        // If details is an array, join them
        else if (Array.isArray(err.response.data.details)) {
          errorMessage = err.response.data.details.join(', ');
        }
      }
      // Fallback to err.message if it's a string
      else if (typeof err.message === 'string') {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          padding: '2rem 2rem 1.5rem',
          borderBottom: '1px solid var(--gray-200)'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)'
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '26px', margin: '0 0 0.5rem', fontWeight: 700, color: 'var(--gray-900)' }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: '14px', margin: 0 }}>
            Sign in to access your dashboard
          </p>
        </div>

        {/* Form */}
        <div className="card-body" style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              padding: '0.875rem 1rem',
              marginBottom: '1.5rem',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="username" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--gray-700)'
              }}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
                autoFocus
                autoComplete="username"
                style={{
                  fontSize: '15px',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid var(--gray-300)',
                  width: '100%',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="password" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--gray-700)'
              }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                autoComplete="current-password"
                style={{
                  fontSize: '15px',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid var(--gray-300)',
                  width: '100%',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '16px',
                fontWeight: 600,
                background: loading ? 'var(--gray-400)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <div className="spinner" style={{
                    width: '1.125rem',
                    height: '1.125rem',
                    borderWidth: '2px',
                    borderTopColor: 'white'
                  }}></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.25rem 2rem',
          borderTop: '1px solid var(--gray-200)',
          background: 'var(--gray-50)',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '13px',
            color: 'var(--gray-600)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p style={{ margin: 0 }}>
              Need help? Contact your administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnifiedLogin;
