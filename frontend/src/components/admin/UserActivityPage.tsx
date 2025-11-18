import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Driver types
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

interface DriverDashboardData {
  stats: DriverStats;
  drivers: Driver[];
}

// Customer types
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

interface CustomerDashboardData {
  stats: CustomerStats;
  customers: Customer[];
}

type ActivityTab = 'drivers' | 'customers';

function UserActivityPage() {
  const { tenant } = useTenant();
  const token = useAuthStore(state => state.token);
  const [activeTab, setActiveTab] = useState<ActivityTab>('drivers');

  // Driver state
  const [driverData, setDriverData] = useState<DriverDashboardData | null>(null);
  const [driverLoading, setDriverLoading] = useState(true);
  const [driverError, setDriverError] = useState<string | null>(null);
  const [driverSearchTerm, setDriverSearchTerm] = useState('');
  const [driverFilterActivity, setDriverFilterActivity] = useState<string>('all');
  const [driverFilterLoginEnabled, setDriverFilterLoginEnabled] = useState<string>('all');

  // Customer state
  const [customerData, setCustomerData] = useState<CustomerDashboardData | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerFilterActivity, setCustomerFilterActivity] = useState<string>('all');
  const [customerFilterLoginEnabled, setCustomerFilterLoginEnabled] = useState<string>('all');

  useEffect(() => {
    loadDriverData();
    loadCustomerData();
  }, [tenant]);

  const loadDriverData = async () => {
    if (!tenant) return;
    setDriverLoading(true);
    setDriverError(null);
    try {
      const response = await axios.get<DriverDashboardData>(
        `${API_BASE}/tenants/${tenant.tenant_id}/admin/driver-dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDriverData(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load driver data';
      setDriverError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setDriverLoading(false);
    }
  };

  const loadCustomerData = async () => {
    if (!tenant) return;
    setCustomerLoading(true);
    setCustomerError(null);
    try {
      const response = await axios.get<CustomerDashboardData>(
        `${API_BASE}/tenants/${tenant.tenant_id}/admin/customer-dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCustomerData(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load customer data';
      setCustomerError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setCustomerLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getActivityBadgeClass = (activityClass: string) => {
    switch (activityClass) {
      case 'active': return 'badge-success';
      case 'moderate': return 'badge-warning';
      case 'inactive': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  const filteredDrivers = driverData?.drivers.filter(driver => {
    const searchLower = driverSearchTerm.toLowerCase();
    const matchesSearch = !driverSearchTerm ||
      driver.name.toLowerCase().includes(searchLower) ||
      driver.email?.toLowerCase().includes(searchLower) ||
      driver.phone?.toLowerCase().includes(searchLower) ||
      driver.username?.toLowerCase().includes(searchLower);
    const matchesActivity = driverFilterActivity === 'all' || driver.activity_class === driverFilterActivity;
    const matchesLoginEnabled =
      driverFilterLoginEnabled === 'all' ||
      (driverFilterLoginEnabled === 'enabled' && driver.is_login_enabled) ||
      (driverFilterLoginEnabled === 'disabled' && !driver.is_login_enabled);
    return matchesSearch && matchesActivity && matchesLoginEnabled;
  }) || [];

  const filteredCustomers = customerData?.customers.filter(customer => {
    const searchLower = customerSearchTerm.toLowerCase();
    const matchesSearch = !customerSearchTerm ||
      customer.name.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.address?.toLowerCase().includes(searchLower) ||
      customer.username?.toLowerCase().includes(searchLower);
    const matchesActivity = customerFilterActivity === 'all' || customer.activity_class === customerFilterActivity;
    const matchesLoginEnabled =
      customerFilterLoginEnabled === 'all' ||
      (customerFilterLoginEnabled === 'enabled' && customer.is_login_enabled) ||
      (customerFilterLoginEnabled === 'disabled' && !customer.is_login_enabled);
    return matchesSearch && matchesActivity && matchesLoginEnabled;
  }) || [];

  return (
    <div>
      {/* Sub-tabs for Driver/Customer */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('drivers')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            backgroundColor: activeTab === 'drivers' ? 'var(--primary-color)' : 'var(--gray-100)',
            color: activeTab === 'drivers' ? 'white' : 'var(--gray-700)',
          }}
        >
          Driver Activity
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            backgroundColor: activeTab === 'customers' ? 'var(--primary-color)' : 'var(--gray-100)',
            color: activeTab === 'customers' ? 'white' : 'var(--gray-700)',
          }}
        >
          Customer Activity
        </button>
      </div>

      {/* Driver Activity Tab */}
      {activeTab === 'drivers' && (
        <>
          {driverLoading ? (
            <div className="spinner-container">
              <div className="spinner"></div>
              <p>Loading driver activity...</p>
            </div>
          ) : driverError ? (
            <div className="error-message">
              <h3>Error Loading Data</h3>
              <p>{driverError}</p>
              <button onClick={loadDriverData} className="btn-primary" style={{ marginTop: '1rem' }}>Retry</button>
            </div>
          ) : driverData && (
            <>
              {/* Statistics */}
              <div className="admin-stats-grid">
                <div className="stat-card stat-card-blue">
                  <h4 className="stat-value">{driverData.stats.total}</h4>
                  <small className="stat-label">Total Drivers</small>
                </div>
                <div className="stat-card stat-card-green">
                  <h4 className="stat-value">{driverData.stats.loginEnabled}</h4>
                  <small className="stat-label">Login Enabled</small>
                </div>
                <div className="stat-card stat-card-orange">
                  <h4 className="stat-value">{driverData.stats.neverLoggedIn}</h4>
                  <small className="stat-label">Never Logged In</small>
                </div>
                <div className="stat-card stat-card-teal">
                  <h4 className="stat-value">{driverData.stats.loggedInLast7Days}</h4>
                  <small className="stat-label">Active (7 Days)</small>
                </div>
              </div>

              {/* Filters */}
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Search</label>
                    <input
                      type="text"
                      value={driverSearchTerm}
                      onChange={(e) => setDriverSearchTerm(e.target.value)}
                      placeholder="Name, email, phone..."
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Activity Status</label>
                    <select value={driverFilterActivity} onChange={(e) => setDriverFilterActivity(e.target.value)} className="input-field">
                      <option value="all">All</option>
                      <option value="active">Active (7 Days)</option>
                      <option value="moderate">Moderate (30 Days)</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Login Status</label>
                    <select value={driverFilterLoginEnabled} onChange={(e) => setDriverFilterLoginEnabled(e.target.value)} className="input-field">
                      <option value="all">All</option>
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Driver Table */}
              <div className="card">
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-200)' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Drivers ({filteredDrivers.length})</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Username</th>
                        <th>Login</th>
                        <th>Last Login</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrivers.map(driver => (
                        <tr key={driver.driver_id}>
                          <td><div style={{ fontWeight: 500 }}>{driver.name}</div></td>
                          <td>{driver.email || '-'}</td>
                          <td>{driver.phone || '-'}</td>
                          <td>{driver.username || '-'}</td>
                          <td><span className={driver.is_login_enabled ? 'badge-success' : 'badge-secondary'}>{driver.is_login_enabled ? 'Enabled' : 'Disabled'}</span></td>
                          <td style={{ fontSize: '0.875rem' }}>{formatDate(driver.last_login)}</td>
                          <td><span className={getActivityBadgeClass(driver.activity_class)}>{driver.activity_status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Customer Activity Tab */}
      {activeTab === 'customers' && (
        <>
          {customerLoading ? (
            <div className="spinner-container">
              <div className="spinner"></div>
              <p>Loading customer activity...</p>
            </div>
          ) : customerError ? (
            <div className="error-message">
              <h3>Error Loading Data</h3>
              <p>{customerError}</p>
              <button onClick={loadCustomerData} className="btn-primary" style={{ marginTop: '1rem' }}>Retry</button>
            </div>
          ) : customerData && (
            <>
              {/* Statistics */}
              <div className="admin-stats-grid">
                <div className="stat-card stat-card-blue">
                  <h4 className="stat-value">{customerData.stats.total}</h4>
                  <small className="stat-label">Total Customers</small>
                </div>
                <div className="stat-card stat-card-green">
                  <h4 className="stat-value">{customerData.stats.loginEnabled}</h4>
                  <small className="stat-label">Login Enabled</small>
                </div>
                <div className="stat-card stat-card-orange">
                  <h4 className="stat-value">{customerData.stats.neverLoggedIn}</h4>
                  <small className="stat-label">Never Logged In</small>
                </div>
                <div className="stat-card stat-card-teal">
                  <h4 className="stat-value">{customerData.stats.loggedInLast7Days}</h4>
                  <small className="stat-label">Active (7 Days)</small>
                </div>
              </div>

              {/* Filters */}
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Search</label>
                    <input
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      placeholder="Name, email, phone..."
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Activity Status</label>
                    <select value={customerFilterActivity} onChange={(e) => setCustomerFilterActivity(e.target.value)} className="input-field">
                      <option value="all">All</option>
                      <option value="active">Active (7 Days)</option>
                      <option value="moderate">Moderate (30 Days)</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>Login Status</label>
                    <select value={customerFilterLoginEnabled} onChange={(e) => setCustomerFilterLoginEnabled(e.target.value)} className="input-field">
                      <option value="all">All</option>
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer Table */}
              <div className="card">
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-200)' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Customers ({filteredCustomers.length})</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Username</th>
                        <th>Login</th>
                        <th>Last Login</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map(customer => (
                        <tr key={customer.customer_id}>
                          <td><div style={{ fontWeight: 500 }}>{customer.name}</div></td>
                          <td>{customer.email || '-'}</td>
                          <td>{customer.phone || '-'}</td>
                          <td>{customer.username || '-'}</td>
                          <td><span className={customer.is_login_enabled ? 'badge-success' : 'badge-secondary'}>{customer.is_login_enabled ? 'Enabled' : 'Disabled'}</span></td>
                          <td style={{ fontSize: '0.875rem' }}>{formatDate(customer.last_login)}</td>
                          <td><span className={getActivityBadgeClass(customer.activity_class)}>{customer.activity_status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default UserActivityPage;
