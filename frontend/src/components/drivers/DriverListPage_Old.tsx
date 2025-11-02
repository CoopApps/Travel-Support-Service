import { useState, useEffect } from 'react';
import { driverApi } from '../../services/api';
import { Driver } from '../../types';
import { useTenant } from '../../context/TenantContext';
import DriverFormModal from './DriverFormModal';

/**
 * Driver List Page
 *
 * Complete driver management with:
 * - Pagination
 * - Search
 * - Filtering by employment type
 * - Create/Edit/Delete operations
 */

function DriverListPage() {
  const { tenantId, tenant } = useTenant();

  // Safety check
  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  // State for driver data
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    contracted: 0,
    freelance: 0,
    employed: 0,
    loginEnabled: 0,
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter/search state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  /**
   * Fetch drivers from API
   */
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError('');

      const query = {
        page,
        limit,
        search,
        employmentType: employmentTypeFilter,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const response = await driverApi.getDrivers(tenantId, query);

      setDrivers(response.drivers);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Error fetching drivers:', err);
      setError(err.response?.data?.error?.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch driver stats
   */
  const fetchStats = async () => {
    try {
      const response = await driverApi.getStats(tenantId);
      setStats(response);
    } catch (err) {
      console.error('Error fetching driver stats:', err);
    }
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchDrivers();
  }, [tenantId, page, search, employmentTypeFilter]);

  useEffect(() => {
    fetchStats();
  }, [tenantId]);

  /**
   * Handle search
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page
  };

  /**
   * Handle add driver
   */
  const handleAddDriver = () => {
    setEditingDriver(null);
    setShowModal(true);
  };

  /**
   * Handle edit driver
   */
  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setShowModal(true);
  };

  /**
   * Handle delete driver
   */
  const handleDeleteDriver = async (driver: Driver) => {
    if (!confirm(`Are you sure you want to delete ${driver.name}?`)) {
      return;
    }

    try {
      await driverApi.deleteDriver(tenantId, driver.driver_id);
      fetchDrivers();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete driver');
    }
  };

  /**
   * Handle modal close
   */
  const handleModalClose = (refresh?: boolean) => {
    setShowModal(false);
    setEditingDriver(null);
    if (refresh) {
      fetchDrivers();
      fetchStats();
    }
  };

  /**
   * Get employment type badge color
   */
  const getEmploymentTypeBadge = (type: string | null) => {
    if (!type) return { color: 'var(--gray-500)', label: 'Unknown' };

    const badges: Record<string, { color: string; label: string }> = {
      contracted: { color: 'var(--primary)', label: 'Contracted' },
      freelance: { color: 'var(--warning)', label: 'Freelance' },
      employed: { color: 'var(--success)', label: 'Employed' },
    };

    return badges[type] || { color: 'var(--gray-500)', label: type };
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 700 }}>
            Driver Management
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--gray-600)' }}>
            {tenant?.company_name}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleAddDriver}>
          + Add Driver
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            Total Drivers
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)' }}>
            {stats.total}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            Contracted
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
            {stats.contracted}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            Freelance
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>
            {stats.freelance}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            Employed
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
            {stats.employed}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            Login Enabled
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)' }}>
            {stats.loginEnabled}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ flex: '0 1 200px' }}>
            <select
              value={employmentTypeFilter}
              onChange={(e) => {
                setEmploymentTypeFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%' }}
            >
              <option value="">All Types</option>
              <option value="contracted">Contracted</option>
              <option value="freelance">Freelance</option>
              <option value="employed">Employed</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            Search
          </button>

          {(search || employmentTypeFilter) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setEmploymentTypeFilter('');
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          )}
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Drivers Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: '3rem', height: '3rem', margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading drivers...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.125rem', color: 'var(--gray-600)' }}>
              No drivers found
            </p>
            <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>
              {search || employmentTypeFilter
                ? 'Try adjusting your search filters'
                : 'Get started by adding your first driver'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Employment Type</th>
                    <th>License</th>
                    <th>Weekly Wage</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver) => {
                    const badge = getEmploymentTypeBadge(driver.employment_type);
                    return (
                      <tr key={driver.driver_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{driver.name}</div>
                          {driver.is_login_enabled && driver.username && (
                            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                              @{driver.username}
                            </div>
                          )}
                        </td>
                        <td>
                          <div>{driver.phone || '-'}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                            {driver.email || '-'}
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{ backgroundColor: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td>
                          <div>{driver.license_number || '-'}</div>
                          {driver.license_expiry && (
                            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                              Exp: {new Date(driver.license_expiry).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td>£{parseFloat(driver.weekly_wage?.toString() || '0').toFixed(2)}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: driver.is_active ? 'var(--success)' : 'var(--gray-500)' }}>
                            {driver.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEditDriver(driver)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteDriver(driver)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} drivers
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0.5rem 1rem', color: 'var(--gray-700)' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Driver Form Modal */}
      {showModal && (
        <DriverFormModal
          driver={editingDriver}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export default DriverListPage;
