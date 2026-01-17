import { useState, useEffect } from 'react';
import { driverApi } from '../../services/api';
import { Driver, DriverListQuery } from '../../types';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { useServiceContext } from '../../contexts/ServiceContext';
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
 * Service-Aware Driver List Page
 *
 * Features:
 * - License compliance filtering for bus service (Section 22)
 * - Shows PCV license status for bus drivers
 * - Filters drivers by qualification when bus service is active
 * - Highlights drivers eligible for Section 22 operations
 */

function DriverListPage() {
  const { tenantId, tenant } = useTenant();
  const toast = useToast();
  const { activeService } = useServiceContext();

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
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'section22_qualified' | 'pcv_only' | 'car_only'>('all');

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

  // Bulk selection state
  const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());

  /**
   * Check if driver is qualified for Section 22 bus operations
   */
  const isSection22Qualified = (driver: Driver): boolean => {
    // Must be 21 or older
    if (!driver.age_verified || driver.date_of_birth) {
      const age = driver.date_of_birth ?
        Math.floor((new Date().getTime() - new Date(driver.date_of_birth).getTime()) / 3.15576e+10) : 0;
      if (age < 21) return false;
    }

    // Must have PCV license (D1, D1+E, D, or D+E) OR pre-1997 car license with D1 entitlement
    const hasPCVLicense = driver.pcv_license_number && driver.pcv_license_expiry_date &&
      new Date(driver.pcv_license_expiry_date) > new Date();

    const hasD1Entitlement = driver.license_pre_1997 && driver.d1_entitlement_granted;

    if (!hasPCVLicense && !hasD1Entitlement) return false;

    // Driver CPC: Must either have valid CPC or be exempt
    if (driver.driver_cpc_required && !driver.driver_cpc_exempt) {
      if (!driver.driver_cpc_card_number || !driver.driver_cpc_expiry_date ||
          new Date(driver.driver_cpc_expiry_date) <= new Date()) {
        return false;
      }
    }

    // DBS check should be valid
    if (driver.dbs_check_required && (!driver.dbs_check_date ||
        new Date(driver.dbs_check_date) < new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000))) {
      return false;
    }

    return true;
  };

  /**
   * Filter drivers based on license requirements
   */
  const getFilteredDrivers = () => {
    let filtered = drivers;

    if (activeService === 'bus' && licenseFilter === 'section22_qualified') {
      filtered = filtered.filter(isSection22Qualified);
    } else if (licenseFilter === 'pcv_only') {
      filtered = filtered.filter(d => d.pcv_license_number &&
        new Date(d.pcv_license_expiry_date || '') > new Date());
    } else if (licenseFilter === 'car_only') {
      filtered = filtered.filter(d => !d.pcv_license_number);
    }

    return filtered;
  };

  /**
   * Fetch drivers from API
   */
  /**
   * Toggle selection of a driver
   */
  const toggleDriverSelection = (driverId: number) => {
    setSelectedDrivers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(driverId)) {
        newSet.delete(driverId);
      } else {
        newSet.add(driverId);
      }
      return newSet;
    });
  };

  /**
   * Toggle all drivers on current page
   */
  const toggleAllDrivers = () => {
    const currentDrivers = drivers.filter(d => activeTab === 'active' ? d.employment_status === 'active' : d.employment_status === 'archived');
    if (selectedDrivers.size === currentDrivers.length) {
      setSelectedDrivers(new Set());
    } else {
      setSelectedDrivers(new Set(currentDrivers.map(d => d.driver_id)));
    }
  };

  /**
   * Bulk archive selected drivers
   */
  const handleBulkArchive = async () => {
    if (selectedDrivers.size === 0) return;
    if (!confirm(`Archive ${selectedDrivers.size} driver${selectedDrivers.size !== 1 ? 's' : ''}?`)) return;

    try {
      await Promise.all(
        Array.from(selectedDrivers).map(id =>
          driverApi.updateDriver(tenantId, id, { employment_status: 'archived' })
        )
      );
      toast.success(`Archived ${selectedDrivers.size} driver${selectedDrivers.size !== 1 ? 's' : ''}`);
      setSelectedDrivers(new Set());
      fetchDrivers();
    } catch (err: any) {
      toast.error(`Failed to archive drivers: ${err.message}`);
    }
  };

  /**
   * Bulk unarchive selected drivers
   */
  const handleBulkUnarchive = async () => {
    if (selectedDrivers.size === 0) return;
    if (!confirm(`Unarchive ${selectedDrivers.size} driver${selectedDrivers.size !== 1 ? 's' : ''}?`)) return;

    try {
      await Promise.all(
        Array.from(selectedDrivers).map(id =>
          driverApi.updateDriver(tenantId, id, { employment_status: 'active' })
        )
      );
      toast.success(`Unarchived ${selectedDrivers.size} driver${selectedDrivers.size !== 1 ? 's' : ''}`);
      setSelectedDrivers(new Set());
      fetchDrivers();
    } catch (err: any) {
      toast.error(`Failed to unarchive drivers: ${err.message}`);
    }
  };

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
      {/* Action Buttons and Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        {/* Tabs - Compact */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px' }}>
          <button
            onClick={() => { setActiveTab('active'); setPage(1); }}
            style={{
              padding: '5px 12px',
              background: activeTab === 'active' ? 'white' : 'transparent',
              color: activeTab === 'active' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'active' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Active
          </button>
          <button
            onClick={() => { setActiveTab('archive'); setPage(1); }}
            style={{
              padding: '5px 12px',
              background: activeTab === 'archive' ? 'white' : 'transparent',
              color: activeTab === 'archive' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'archive' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Archived
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '6px 10px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#374151'
            }}
            title="Export to CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <button
            onClick={handleCreate}
            style={{
              padding: '6px 12px',
              background: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Driver
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <DriverStats tenantId={tenantId} onStatsLoaded={setEnhancedStats} />

      {/* Fleet Operations Overview */}
      {enhancedStats && (
        <FleetOperationsOverview stats={enhancedStats.fleet} />
      )}

      {/* Toolbar - Compact */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px' }}>
          <div style={{ position: 'relative' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              style={{
                width: '160px',
                padding: '6px 8px 6px 28px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>
        </form>

        {/* Filters */}
        <select
          value={employmentTypeFilter}
          onChange={(e) => { setEmploymentTypeFilter(e.target.value); setPage(1); }}
          style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', minWidth: '100px' }}
        >
          <option value="">All Types</option>
          <option value="contracted">Contracted</option>
          <option value="freelance">Freelance</option>
          <option value="employed">Employed</option>
        </select>
        <select
          value={licenseFilter}
          onChange={(e) => { setLicenseFilter(e.target.value as any); setPage(1); }}
          style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', minWidth: '120px' }}
          title="Filter by license"
        >
          <option value="all">All Licenses</option>
          {activeService === 'bus' && (
            <option value="section22_qualified">S22 Qualified</option>
          )}
          <option value="pcv_only">PCV Only</option>
          <option value="car_only">Car Only</option>
        </select>
        {(search || employmentTypeFilter || licenseFilter !== 'all') && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setSearch(''); setEmploymentTypeFilter(''); setLicenseFilter('all'); setPage(1); }}
            style={{
              padding: '6px 10px',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            Clear
          </button>
        )}
        </div>

        {/* Bulk Actions */}
        {selectedDrivers.size > 0 && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '4px 8px', background: '#f0f9ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
            <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 500 }}>
              {selectedDrivers.size} selected
            </span>
            {activeTab === 'active' ? (
              <button
                onClick={handleBulkArchive}
                style={{ padding: '4px 8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
              >
                Archive
              </button>
            ) : (
              <button
                onClick={handleBulkUnarchive}
                style={{ padding: '4px 8px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
              >
                Unarchive
              </button>
            )}
            <button
              onClick={() => setSelectedDrivers(new Set())}
              style={{ padding: '4px 8px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '3px', fontSize: '11px', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
        )}
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
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedDrivers.size === drivers.filter(d => activeTab === 'active' ? d.employment_status === 'active' : d.employment_status === 'archived').length && drivers.length > 0}
                      onChange={toggleAllDrivers}
                      style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                    />
                  </th>
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
                {getFilteredDrivers().map((driver) => {
                  const badge = getEmploymentBadge(driver.employment_type || '');
                  const section22Qualified = isSection22Qualified(driver);

                  return (
                    <tr key={driver.driver_id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedDrivers.has(driver.driver_id)}
                          onChange={() => toggleDriverSelection(driver.driver_id)}
                          style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                      </td>
                      {/* Driver Details */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                            {driver.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                            Driver ID: {driver.driver_id}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                            {activeService === 'bus' && section22Qualified && (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '4px',
                                backgroundColor: '#10b98120',
                                color: '#10b981',
                                width: 'fit-content'
                              }} title="Qualified for Section 22 bus operations">
                                ✓ S22 Qualified
                              </span>
                            )}
                            {driver.pcv_license_number && (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '4px',
                                backgroundColor: '#3b82f620',
                                color: '#3b82f6',
                                width: 'fit-content'
                              }} title="PCV License Holder">
                                PCV
                              </span>
                            )}
                          </div>
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
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleEdit(driver)}
                            title="Edit"
                            style={{ padding: '4px 6px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDocuments(driver)}
                            title="Documents"
                            style={{ padding: '4px 6px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleVehicle(driver)}
                            title="Vehicle"
                            style={{ padding: '4px 6px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.6-1.2-.7-2-.7H5c-.8 0-1.5.4-2 1L1 12v4c0 .6.4 1 1 1h2"/>
                              <circle cx="7" cy="17" r="2"/>
                              <circle cx="17" cy="17" r="2"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleLogin(driver)}
                            title={driver.dashboard_access ? 'Manage Login' : 'Enable Portal'}
                            style={{
                              padding: '4px 6px',
                              background: driver.dashboard_access ? '#d1fae5' : '#f3f4f6',
                              border: driver.dashboard_access ? '1px solid #6ee7b7' : '1px solid #e5e7eb',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={driver.dashboard_access ? '#059669' : '#6b7280'} strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          </button>
                          {activeTab === 'active' ? (
                            <button
                              onClick={() => handleArchive(driver)}
                              title="Archive"
                              style={{ padding: '4px 6px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                                <polyline points="21 8 21 21 3 21 3 8"/>
                                <rect x="1" y="3" width="22" height="5"/>
                                <line x1="10" y1="12" x2="14" y2="12"/>
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(driver)}
                              title="Reactivate"
                              style={{ padding: '4px 6px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10"/>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                              </svg>
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
