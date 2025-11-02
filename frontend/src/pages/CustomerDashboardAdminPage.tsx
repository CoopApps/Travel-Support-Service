import { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import './AdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface CustomerStats {
  total: number;
  loginEnabled: number;
  loginDisabled: number;
  neverLoggedIn: number;
  loggedInLast7Days: number;
  loggedInLast30Days: number;
  splitPayment: number;
}

interface Customer {
  customer_id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  is_login_enabled: boolean;
  has_split_payment: boolean;
  username: string;
  last_login: string | null;
  user_created: string | null;
  customer_created: string;
  activity_status: string;
  activity_class: string;
}

interface DashboardData {
  stats: CustomerStats;
  customers: Customer[];
}

function CustomerDashboardAdminPage() {
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
        `${API_BASE}/tenants/${tenant.tenant_id}/admin/customer-dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setData(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load customer dashboard data';
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

  const filteredCustomers = data?.customers.filter(customer => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      customer.name.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.address?.toLowerCase().includes(searchLower) ||
      customer.username?.toLowerCase().includes(searchLower);

    // Activity filter
    const matchesActivity = filterActivity === 'all' || customer.activity_class === filterActivity;

    // Login enabled filter
    const matchesLoginEnabled =
      filterLoginEnabled === 'all' ||
      (filterLoginEnabled === 'enabled' && customer.is_login_enabled) ||
      (filterLoginEnabled === 'disabled' && !customer.is_login_enabled);

    return matchesSearch && matchesActivity && matchesLoginEnabled;
  }) || [];

  if (loading) {
    return (
      <div className="page-container">
        <div className="spinner-container">
          <div className="spinner"></div>
          <p>Loading customer dashboard...</p>
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
          <h1>Customer Dashboard Admin</h1>
          <p className="text-secondary">Monitor customer login activity and engagement</p>
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
          <small className="stat-label">Total Customers</small>
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
          <h4 className="stat-value">{data.stats.splitPayment}</h4>
          <small className="stat-label">Split Payment</small>
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
              placeholder="Name, email, phone, address, username..."
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

      {/* Customer List Table */}
      <div className="card">
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-200)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            Customers ({filteredCustomers.length})
          </h2>
        </div>

        {filteredCustomers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" style={{ margin: '0 auto 1rem' }}>
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2"/>
            </svg>
            <p>No customers found matching your filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Username</th>
                  <th>Login Enabled</th>
                  <th>Split Payment</th>
                  <th>Last Login</th>
                  <th>Activity Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr key={customer.customer_id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{customer.name}</div>
                    </td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.phone || '-'}</td>
                    <td>
                      <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {customer.address || '-'}
                      </div>
                    </td>
                    <td>{customer.username || '-'}</td>
                    <td>
                      <span className={customer.is_login_enabled ? 'badge-success' : 'badge-secondary'}>
                        {customer.is_login_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <span className={customer.has_split_payment ? 'badge-info' : 'badge-secondary'}>
                        {customer.has_split_payment ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        {formatDate(customer.last_login)}
                      </div>
                    </td>
                    <td>
                      <span className={getActivityBadgeClass(customer.activity_class)}>
                        {customer.activity_status}
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

export default CustomerDashboardAdminPage;
