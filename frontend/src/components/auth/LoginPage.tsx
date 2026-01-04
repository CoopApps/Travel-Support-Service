import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

/**
 * Login Page Component - Multi-Tenant
 *
 * Handles user authentication using tenant ID from subdomain detection.
 */

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { tenantId, tenant } = useTenant();

  // Safety check: should never happen if tenant context loaded
  if (!tenantId || !tenant) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(tenantId, { username, password });
      login(response.user, response.token);
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Login failed. Please try again.';
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
      backgroundColor: 'var(--gray-50)',
      padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="text-center mb-3" style={{ color: 'var(--gray-900)' }}>
          {tenant.company_name}
        </h2>
        <p className="text-center mb-4" style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
          Login to your account
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="alert alert-error mb-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                Logging in...
              </div>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--gray-50)',
          borderRadius: 'var(--border-radius)',
          fontSize: '0.875rem',
          color: 'var(--gray-600)'
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Demo Credentials:</p>
          <p><strong>Username:</strong> admin</p>
          <p><strong>Password:</strong> admin123</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--gray-500)' }}>
            Organization: {tenant.company_name} (ID: {tenantId})
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
