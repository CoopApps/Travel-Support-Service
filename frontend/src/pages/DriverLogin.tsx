import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';

/**
 * Driver Login Page
 *
 * Separate login interface for drivers to access their dashboard
 * Uses same authentication system but routes to driver-specific dashboard
 */
function DriverLogin() {
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

      // Verify user is a driver
      if (response.user.role !== 'driver') {
        setError('Invalid credentials. This login is for drivers only.');
        setLoading(false);
        return;
      }

      // Store auth data using authStore
      login(response.user, response.token);

      // Navigate to driver dashboard
      navigate('/driver/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Invalid username or password');
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
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          padding: '2rem 2rem 1rem',
          borderBottom: '1px solid var(--gray-200)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', margin: '0 0 0.5rem', fontWeight: 600 }}>
            Driver Portal
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: '14px', margin: 0 }}>
            Sign in to access your dashboard
          </p>
        </div>

        {/* Form */}
        <div className="card-body" style={{ padding: '2rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
                autoFocus
                style={{ fontSize: '15px' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                style={{ fontSize: '15px' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '16px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                marginTop: '1rem'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
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
          padding: '1rem 2rem',
          borderTop: '1px solid var(--gray-200)',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--gray-600)'
        }}>
          <p style={{ margin: 0 }}>
            Need help? Contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}

export default DriverLogin;
