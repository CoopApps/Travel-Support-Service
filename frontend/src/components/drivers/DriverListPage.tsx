import { useState, useEffect } from 'react';
import { driverApi } from '../../services/api';
import { Driver, DriverListQuery } from '../../types';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import DriverFormModal from './DriverFormModal';
import DriverLoginManagementModal from './DriverLoginManagementModal';
import VehicleAssignmentModal from './VehicleAssignmentModal';
import DriverStats from './DriverStats';
import FleetOperationsOverview from './FleetOperationsOverview';
import DashboardAccessDisplay from './DashboardAccessDisplay';
import VehicleAssignmentDisplay from './VehicleAssignmentDisplay';
import PermitStatusDisplay from './PermitStatusDisplay';
import CustomerAssignmentDisplay from './CustomerAssignmentDisplay';
import LoginHistoryModal from './LoginHistoryModal';
import { DriverDocumentsModal } from './DriverDocumentsModal';

/**
 * Driver List Page
 *
 * Complete driver management matching customer module design
 */

function DriverListPage() {
  const { tenantId, tenant } = useTenant();
  const toast = useToast();

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

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Enhanced stats (loaded by DriverStats component)
  const [enhancedStats, setEnhancedStats] = useState<any>(null);

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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginDriver, setLoginDriver] = useState<Driver | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleDriver, setVehicleDriver] = useState<Driver | null>(null);
  const [showLoginHistoryModal, setShowLoginHistoryModal] = useState(false);
  const [loginHistoryDriver, setLoginHistoryDriver] = useState<Driver | null>(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [documentsDriver, setDocumentsDriver] = useState<Driver | null>(null);

  /**
   * Fetch drivers from API
   */
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError('');

      const query: DriverListQuery = {
        page,
        limit,
        search,
        employmentType: employmentTypeFilter,
        archived: activeTab === 'archive', // Backend filtering
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const response = await driverApi.getDrivers(tenantId, query);

      setDrivers(response.drivers || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err: any) {
      console.error('Error fetching drivers:', err);
      setError(err.response?.data?.error?.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load drivers on mount and when filters change
   */
  useEffect(() => {
    fetchDrivers();
  }, [page, search, employmentTypeFilter, activeTab]);

  /**
   * Handle search
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  /**
   * Handle delete driver
   */
  const handleDelete = async (driver: Driver) => {
    if (!window.confirm(`Are you sure you want to delete ${driver.name}?`)) {
      return;
    }

    try {
      await driverApi.deleteDriver(tenantId, driver.driver_id);
      toast.success(`${driver.name} deleted successfully`);
      fetchDrivers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete driver');
    }
  };

  /**
   * Handle archive driver
   */
  const handleArchive = async (driver: Driver) => {
    const confirmed = window.confirm(
      `Archive driver "${driver.name}"?\n\n` +
      `This will mark the driver as inactive and move them to the archive.\n\n` +
      `You can still view and reactivate them from the Archive tab.`
    );

    if (!confirmed) return;

    try {
      await driverApi.updateDriver(tenantId, driver.driver_id, { archived: true } as any);
      toast.success(`${driver.name} archived successfully`);
      fetchDrivers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to archive driver');
    }
  };

  /**
   * Handle reactivate driver
   */
  const handleReactivate = async (driver: Driver) => {
    const confirmed = window.confirm(
      `Reactivate driver "${driver.name}"?\n\n` +
      `This will restore the driver to active status.`
    );

    if (!confirmed) return;

    try {
      await driverApi.updateDriver(tenantId, driver.driver_id, { archived: false } as any);
      toast.success(`${driver.name} reactivated successfully`);
      fetchDrivers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to reactivate driver');
    }
  };

  /**
   * Handle edit driver
   */
  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setShowModal(true);
  };

  /**
   * Handle create new driver
   */
  const handleCreate = () => {
    setEditingDriver(null);
    setShowModal(true);
  };

  /**
   * Handle export drivers to CSV
   */
  const handleExportCSV = async () => {
    try {
      const response = await driverApi.exportDrivers(tenantId, {
        search,
        employmentType: employmentTypeFilter,
        archived: activeTab === 'archive',
      });

      // Create blob and download
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `drivers-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Driver data exported successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to export drivers');
    }
  };

  /**
   * Handle modal close and refresh
   */
  const handleModalClose = (shouldRefresh: boolean) => {
    setShowModal(false);
    setEditingDriver(null);
    if (shouldRefresh) {
      fetchDrivers();
      // DriverStats component will re-fetch its own data
    }
  };

  /**
   * Handle login management
   */
  const handleLogin = (driver: Driver) => {
    setLoginDriver(driver);
    setShowLoginModal(true);
  };

  /**
   * Handle vehicle assignment
   */
  const handleVehicle = (driver: Driver) => {
    setVehicleDriver(driver);
    setShowVehicleModal(true);
  };

  /**
   * Handle login history
   */
  const handleLoginHistory = (driver: Driver) => {
    setLoginHistoryDriver(driver);
    setShowLoginHistoryModal(true);
  };

  /**
   * Handle documents
   */
  const handleDocuments = (driver: Driver) => {
    setDocumentsDriver(driver);
    setShowDocumentsModal(true);
  };

  /**
   * Format currency
   */
  const formatCurrency = (value: number): string => {
    return `£${value.toFixed(2)}`;
  };

  /**
   * Get employment badge
   */
  const getEmploymentBadge = (type: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      contracted: { label: 'Contracted', color: 'var(--primary)' },
      freelance: { label: 'Freelance', color: 'var(--warning)' },
      employed: { label: 'Employed', color: 'var(--success)' }
    };
    return badges[type] || { label: type, color: 'var(--gray-500)' };
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Driver Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
            </svg>
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={fetchDrivers}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={handleCreate} style={{ background: '#28a745' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Driver
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--gray-200)',
        marginBottom: '1.5rem',
        gap: '0.5rem'
      }}>
        <button
          onClick={() => {
            setActiveTab('active');
            setPage(1);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'active' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'active' ? '2px solid #28a745' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'active' ? '#28a745' : 'var(--gray-600)',
            fontWeight: activeTab === 'active' ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Active Drivers
        </button>
        <button
          onClick={() => {
            setActiveTab('archive');
            setPage(1);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'archive' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'archive' ? '2px solid #28a745' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'archive' ? '#28a745' : 'var(--gray-600)',
            fontWeight: activeTab === 'archive' ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Archive
        </button>
      </div>

      {/* Statistics Cards */}
      <DriverStats tenantId={tenantId} onStatsLoaded={setEnhancedStats} />

      {/* Fleet Operations Overview */}
      {enhancedStats && (
        <FleetOperationsOverview stats={enhancedStats.fleet} />
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* Search Form */}
        <form onSubmit={handleSearch} style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search drivers..."
              style={{ flex: '1' }}
            />
            <select
              value={employmentTypeFilter}
              onChange={(e) => {
                setEmploymentTypeFilter(e.target.value);
                setPage(1);
              }}
              style={{ minWidth: '150px' }}
            >
              <option value="">All Types</option>
              <option value="contracted">Contracted</option>
              <option value="freelance">Freelance</option>
              <option value="employed">Employed</option>
            </select>
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            {(search || employmentTypeFilter) && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setEmploymentTypeFilter('');
                  setPage(1);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading drivers...</p>
        </div>
      ) : drivers.length === 0 ? (
        /* Empty State */
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            {search || employmentTypeFilter ? 'No drivers found matching your search.' : 'No drivers yet.'}
          </p>
          {!search && !employmentTypeFilter && (
            <button className="btn btn-primary" onClick={handleCreate}>
              Add Your First Driver
            </button>
          )}
        </div>
      ) : (
        /* Driver Table */
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Driver Details</th>
                  <th>License & Contact</th>
                  <th>Vehicle Assignment</th>
                  <th>Employment & Fuel</th>
                  <th>Dashboard Access</th>
                  <th>Customer Assignments</th>
                  <th>Permit Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => {
                  const badge = getEmploymentBadge(driver.employment_type || '');

                  return (
                    <tr key={driver.driver_id}>
                      {/* Driver Details */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                            {driver.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                            Driver ID: {driver.driver_id}
                          </div>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            backgroundColor: badge.color + '20',
                            color: badge.color,
                            width: 'fit-content'
                          }}>
                            {badge.label}
                          </span>
                        </div>
                      </td>

                      {/* License & Contact */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {driver.license_number ? (
                            <>
                              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)' }}>
                                {driver.license_number}
                              </div>
                              {driver.license_expiry && (
                                <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                                  Exp: {new Date(driver.license_expiry).toLocaleDateString('en-GB')}
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                              No license on file
                            </div>
                          )}
                          {driver.phone && (
                            <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                              Phone: {driver.phone}
                            </div>
                          )}
                          {driver.email && (
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                              Email: {driver.email}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Vehicle Assignment */}
                      <td>
                        <VehicleAssignmentDisplay
                          driver={driver}
                          onAssignVehicle={() => handleVehicle(driver)}
                          onAddPersonalVehicle={() => handleVehicle(driver)}
                        />
                      </td>

                      {/* Employment & Fuel */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)' }}>
                            {badge.label} Employee
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                            {driver.employment_type === 'contracted' ? 'Fixed salary with benefits' :
                             driver.employment_type === 'freelance' ? 'Hourly rate' : 'Full-time employed'}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--gray-700)' }}>
                            Weekly: {formatCurrency(parseFloat(driver.weekly_wage?.toString() || '0'))}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                            Fuel: {formatCurrency(parseFloat(driver.weekly_lease?.toString() || '0'))}/week
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--gray-500)' }}>
                            {parseFloat(driver.weekly_lease?.toString() || '0') > 0 ? 'Weekly fuel allowance' : 'No fuel allowance'}
                          </div>
                        </div>
                      </td>

                      {/* Dashboard Access */}
                      <td>
                        <DashboardAccessDisplay
                          driver={driver}
                          onEnableLogin={() => handleLogin(driver)}
                          onDisableLogin={() => handleLogin(driver)}
                          onEditUsername={() => handleLogin(driver)}
                          onResetPassword={() => handleLogin(driver)}
                          onLoginHistory={() => handleLoginHistory(driver)}
                        />
                      </td>

                      {/* Customer Assignments */}
                      <td>
                        <CustomerAssignmentDisplay
                          driver={driver}
                          tenantId={tenantId}
                        />
                      </td>

                      {/* Permit Status */}
                      <td>
                        <PermitStatusDisplay driver={driver} />
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleEdit(driver)}
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            Edit Driver
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            title="View full driver details"
                          >
                            Full Details
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleDocuments(driver)}
                            style={{ fontSize: '11px', padding: '4px 8px', background: '#6366f1', borderColor: '#6366f1', color: 'white' }}
                            title="View and manage driver documents"
                          >
                            📄 Documents
                          </button>
                          {activeTab === 'active' ? (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleArchive(driver)}
                              style={{ fontSize: '11px', padding: '4px 8px', background: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleReactivate(driver)}
                              style={{ fontSize: '11px', padding: '4px 8px', background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                            >
                              Reactivate
                            </button>
                          )}
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem'
            }}>
              <div style={{ color: 'var(--gray-600)' }}>
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} drivers
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        className="btn"
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: page === pageNum ? 'var(--primary)' : 'var(--gray-100)',
                          color: page === pageNum ? 'white' : 'var(--gray-700)',
                        }}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <DriverFormModal
          driver={editingDriver}
          onClose={handleModalClose}
          tenantId={tenantId}
        />
      )}

      {/* Login Management Modal */}
      {showLoginModal && loginDriver && (
        <DriverLoginManagementModal
          driver={loginDriver}
          tenantId={tenantId}
          onClose={(shouldRefresh) => {
            setShowLoginModal(false);
            setLoginDriver(null);
            if (shouldRefresh) {
              fetchDrivers();
            }
          }}
        />
      )}

      {/* Vehicle Assignment Modal */}
      {showVehicleModal && vehicleDriver && (
        <VehicleAssignmentModal
          driver={vehicleDriver}
          tenantId={tenantId}
          onClose={(shouldRefresh) => {
            setShowVehicleModal(false);
            setVehicleDriver(null);
            if (shouldRefresh) {
              fetchDrivers();
            }
          }}
        />
      )}

      {/* Login History Modal */}
      {showLoginHistoryModal && loginHistoryDriver && (
        <LoginHistoryModal
          driver={loginHistoryDriver}
          tenantId={tenantId}
          onClose={() => {
            setShowLoginHistoryModal(false);
            setLoginHistoryDriver(null);
          }}
        />
      )}

      {/* Documents Modal */}
      {showDocumentsModal && documentsDriver && (
        <DriverDocumentsModal
          driverId={documentsDriver.driver_id}
          driverName={`${documentsDriver.first_name} ${documentsDriver.last_name}`}
          onClose={() => {
            setShowDocumentsModal(false);
            setDocumentsDriver(null);
          }}
        />
      )}
    </div>
  );
}

export default DriverListPage;
