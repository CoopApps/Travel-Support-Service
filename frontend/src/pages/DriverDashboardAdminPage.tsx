import { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import './AdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface DriverStats {
  total: number;
  loginEnabled: number;
  loginDisabled: number;
  neverLoggedIn: number;
  loggedInLast7Days: number;
  loggedInLast30Days: number;
  byEmploymentType: {
    contracted: number;
    freelance: number;
    employed: number;
  };
}

interface Driver {
  driver_id: number;
  name: string;
  email: string;
  phone: string;
  employment_type: string;
  is_login_enabled: boolean;
  username: string;
  last_login: string | null;
  user_created: string | null;
  driver_created: string;
  activity_status: string;
  activity_class: string;
}

interface DashboardData {
  stats: DriverStats;
  drivers: Driver[];
}

function DriverDashboardAdminPage() {
  const { tenant } = useTenant();
  const token = useAuthStore(state => state.token);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivity, setFilterActivity] = useState<string>('all');
  const [filterLoginEnabled, setFilterLoginEnabled] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [tenant]);

  const loadData = async () => {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<DashboardData>(
        `${API_BASE}/tenants/${tenant.tenant_id}/admin/driver-dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setData(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load driver dashboard data';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getActivityBadgeClass = (activityClass: string) => {
    switch (activityClass) {
      case 'active':
        return 'badge-success';
      case 'moderate':
        return 'badge-warning';
      case 'inactive':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  };

  const filteredDrivers = data?.drivers.filter(driver => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      driver.name.toLowerCase().includes(searchLower) ||
      driver.email?.toLowerCase().includes(searchLower) ||
      driver.phone?.toLowerCase().includes(searchLower) ||
      driver.username?.toLowerCase().includes(searchLower);

    // Activity filter
    const matchesActivity = filterActivity === 'all' || driver.activity_class === filterActivity;

    // Login enabled filter
    const matchesLoginEnabled =
      filterLoginEnabled === 'all' ||
      (filterLoginEnabled === 'enabled' && driver.is_login_enabled) ||
      (filterLoginEnabled === 'disabled' && !driver.is_login_enabled);

    return matchesSearch && matchesActivity && matchesLoginEnabled;
  }) || [];

  if (loading) {
    return (
      <div className="page-container">
        <div className="spinner-container">
          <div className="spinner"></div>
          <p>Loading driver dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/>
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2"/>
          </svg>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={loadData} className="btn-primary" style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Driver Dashboard Admin</h1>
          <p className="text-secondary">Monitor driver login activity and engagement</p>
        </div>
        <button onClick={loadData} className="btn-secondary">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none">
            <polyline points="23 4 23 10 17 10" strokeWidth="2"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeWidth="2"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="admin-stats-grid">
        <div className="stat-card stat-card-blue">
          <h4 className="stat-value">{data.stats.total}</h4>
          <small className="stat-label">Total Drivers</small>
        </div>

        <div className="stat-card stat-card-green">
          <h4 className="stat-value">{data.stats.loginEnabled}</h4>
          <small className="stat-label">Login Enabled</small>
        </div>

        <div className="stat-card stat-card-orange">
          <h4 className="stat-value">{data.stats.neverLoggedIn}</h4>
          <small className="stat-label">Never Logged In</small>
        </div>

        <div className="stat-card stat-card-teal">
          <h4 className="stat-value">{data.stats.loggedInLast7Days}</h4>
          <small className="stat-label">Active (7 Days)</small>
        </div>

        <div className="stat-card stat-card-indigo">
          <h4 className="stat-value">{data.stats.loggedInLast30Days}</h4>
          <small className="stat-label">Active (30 Days)</small>
        </div>

        <div className="stat-card stat-card-purple">
          <h4 className="stat-value">{data.stats.byEmploymentType.contracted}</h4>
          <small className="stat-label">Contracted</small>
        </div>

        <div className="stat-card stat-card-blue">
          <h4 className="stat-value">{data.stats.byEmploymentType.freelance}</h4>
          <small className="stat-label">Freelance</small>
        </div>

        <div className="stat-card stat-card-green">
          <h4 className="stat-value">{data.stats.byEmploymentType.employed}</h4>
          <small className="stat-label">Employed</small>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, email, phone, username..."
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
              Activity Status
            </label>
            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              className="input-field"
            >
              <option value="all">All Activity Levels</option>
              <option value="active">Active (Last 7 Days)</option>
              <option value="moderate">Active (Last 30 Days)</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
              Login Status
            </label>
            <select
              value={filterLoginEnabled}
              onChange={(e) => setFilterLoginEnabled(e.target.value)}
              className="input-field"
            >
              <option value="all">All Login Status</option>
              <option value="enabled">Login Enabled</option>
              <option value="disabled">Login Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Driver List Table */}
      <div className="card">
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-200)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            Drivers ({filteredDrivers.length})
          </h2>
        </div>

        {filteredDrivers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" style={{ margin: '0 auto 1rem' }}>
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2"/>
            </svg>
            <p>No drivers found matching your filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Employment Type</th>
                  <th>Username</th>
                  <th>Login Enabled</th>
                  <th>Last Login</th>
                  <th>Activity Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map(driver => (
                  <tr key={driver.driver_id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{driver.name}</div>
                    </td>
                    <td>{driver.email || '-'}</td>
                    <td>{driver.phone || '-'}</td>
                    <td>
                      <span style={{
                        textTransform: 'capitalize',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        backgroundColor: 'var(--gray-100)',
                        color: 'var(--gray-700)'
                      }}>
                        {driver.employment_type || 'N/A'}
                      </span>
                    </td>
                    <td>{driver.username || '-'}</td>
                    <td>
                      <span className={driver.is_login_enabled ? 'badge-success' : 'badge-secondary'}>
                        {driver.is_login_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        {formatDate(driver.last_login)}
                      </div>
                    </td>
                    <td>
                      <span className={getActivityBadgeClass(driver.activity_class)}>
                        {driver.activity_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DriverDashboardAdminPage;
