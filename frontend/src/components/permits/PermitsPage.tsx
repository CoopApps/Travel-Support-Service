import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useServiceContext } from '../../contexts/ServiceContext';
import { permitsApi, driverApi } from '../../services/api';
import { Driver, DriverPermits, DriverRole, OrganizationalPermit, PermitsStats } from '../../types';
import PermitsStatsCards from './PermitsStatsCards';
import DriverComplianceTable from './DriverComplianceTable';
import OrganizationalPermitsSection from './OrganizationalPermitsSection';
import UpdatePermitsModal from './UpdatePermitsModal';
import DriverRolesModal from './DriverRolesModal';
import PermitGuideModal from './PermitGuideModal';
import Section22CompliancePage from '../bus/Section22CompliancePage';
import './Permits.css';

/**
 * Permits Page - Driver compliance and organizational permits management
 *
 * Manages:
 * - Driver permits (DBS, Section 19, Section 22, MOT)
 * - Driver roles (Vulnerable Passengers, Section 19/22 Driver, Vehicle Owner)
 * - Organizational permits (Section 19 and Section 22 organizational-level)
 * - Section 22 Compliance Dashboard (when bus service enabled)
 */

type TabId = 'drivers' | 'organizational' | 'section22';

function PermitsPage() {
  const { tenant, tenantId } = useTenant();
  const { busEnabled } = useServiceContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverPermits, setDriverPermits] = useState<Record<number, DriverPermits>>({});
  const [driverRoles, setDriverRoles] = useState<Record<number, DriverRole>>({});
  const [stats, setStats] = useState<PermitsStats | null>(null);
  const [orgPermits, setOrgPermits] = useState<{ section19: OrganizationalPermit[]; section22: OrganizationalPermit[] }>({
    section19: [],
    section22: []
  });

  // Filter/search state
  const [driverTab, setDriverTab] = useState<'active' | 'archive'>('active');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Modal states
  const [showUpdatePermitsModal, setShowUpdatePermitsModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError('');
      const [driversData, permitsData, statsData, orgPermitsData] = await Promise.all([
        driverApi.getDrivers(tenantId),
        permitsApi.getDriverPermits(tenantId),
        permitsApi.getStats(tenantId),
        permitsApi.getOrganizationalPermits(tenantId)
      ]);

      setDrivers(driversData?.drivers || []);
      setDriverPermits(permitsData.driverPermits || {});
      setDriverRoles(permitsData.driverRoles || {});
      setStats(statsData);
      setOrgPermits(orgPermitsData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to load permits data';
      setError(errorMessage);
      console.error('Failed to load permits data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermits = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowUpdatePermitsModal(true);
  };

  const handleEditRoles = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowRolesModal(true);
  };

  const handlePermitsUpdated = () => {
    setShowUpdatePermitsModal(false);
    setSelectedDriver(null);
    fetchData();
  };

  const handleRolesUpdated = () => {
    setShowRolesModal(false);
    setSelectedDriver(null);
    fetchData();
  };

  /**
   * Filter drivers based on search and active/archive tab
   */
  const getFilteredDrivers = () => {
    let filtered = drivers;

    // Filter by active/archive status
    if (driverTab === 'active') {
      filtered = filtered.filter(d => d.employment_status === 'active');
    } else {
      filtered = filtered.filter(d => d.employment_status === 'archived');
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.phone?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  };

  /**
   * Handle search
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  /**
   * Handle export to CSV
   */
  const handleExportCSV = () => {
    const filteredDrivers = getFilteredDrivers();
    if (filteredDrivers.length === 0) {
      alert('No drivers to export');
      return;
    }

    // Prepare CSV data
    const headers = ['Driver Name', 'Phone', 'Roles', 'DBS', 'Section 19', 'Section 22', 'MOT', 'Overall Status'];
    const rows = filteredDrivers.map(driver => {
      const role = driverRoles[driver.driver_id];
      const permits = driverPermits[driver.driver_id];
      const roles = [
        role?.vulnerablePassengers ? 'Vulnerable' : '',
        role?.section19Driver ? 'S19' : '',
        role?.section22Driver ? 'S22' : '',
        role?.vehicleOwner ? 'Owner' : ''
      ].filter(Boolean).join(', ');

      // Helper to get permit status text
      const getPermitStatusText = (permit: any) => {
        if (!permit || !permit.hasPermit) return 'Not Provided';
        const expiryDate = new Date(permit.expiryDate);
        const today = new Date();
        const daysUntil = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) return 'Expired';
        if (daysUntil <= 30) return 'Expiring';
        return 'Valid';
      };

      return [
        driver.name,
        driver.phone || '',
        roles,
        getPermitStatusText(permits?.dbs),
        getPermitStatusText(permits?.section19),
        getPermitStatusText(permits?.section22),
        getPermitStatusText(permits?.mot),
        getPermitStatusText(permits?.dbs) // Overall status based on DBS for simplicity
      ];
    });

    // Convert to CSV format
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `permits-compliance-${driverTab}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading permits data...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Error Message */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem', gap: '8px' }}>
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
          onClick={() => setShowGuideModal(true)}
          style={{
            padding: '6px 12px',
            background: '#3b82f6',
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
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm0-10h2v8h-2z"/>
          </svg>
          Permit Guide
        </button>
        <button
          onClick={fetchData}
          style={{
            padding: '6px 12px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: '#374151',
            fontWeight: 500
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Tab Navigation - Compact Pill Style */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        {/* Main Tabs */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px' }}>
          <button
            onClick={() => setActiveTab('drivers')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: activeTab === 'drivers' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '3px',
              color: activeTab === 'drivers' ? '#111827' : '#6b7280',
              fontWeight: activeTab === 'drivers' ? 600 : 500,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: activeTab === 'drivers' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Driver Permits
        </button>
        <button
          onClick={() => setActiveTab('organizational')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: activeTab === 'organizational' ? 'white' : 'transparent',
            border: 'none',
            borderRadius: '3px',
            color: activeTab === 'organizational' ? '#111827' : '#6b7280',
            fontWeight: activeTab === 'organizational' ? 600 : 500,
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: activeTab === 'organizational' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Org Permits
        </button>
        {busEnabled && (
          <button
            onClick={() => setActiveTab('section22')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: activeTab === 'section22' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '3px',
              color: activeTab === 'section22' ? '#111827' : '#6b7280',
              fontWeight: activeTab === 'section22' ? 600 : 500,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: activeTab === 'section22' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            S22 Compliance
          </button>
        )}
        </div>

        {/* Driver Status Tabs (only show when on drivers tab) */}
        {activeTab === 'drivers' && (
          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px' }}>
            <button
              onClick={() => { setDriverTab('active'); setPage(1); }}
              style={{
                padding: '5px 12px',
                background: driverTab === 'active' ? 'white' : 'transparent',
                color: driverTab === 'active' ? '#111827' : '#6b7280',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '12px',
                boxShadow: driverTab === 'active' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Active
            </button>
            <button
              onClick={() => { setDriverTab('archive'); setPage(1); }}
              style={{
                padding: '5px 12px',
                background: driverTab === 'archive' ? 'white' : 'transparent',
                color: driverTab === 'archive' ? '#111827' : '#6b7280',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '12px',
                boxShadow: driverTab === 'archive' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Archived
            </button>
          </div>
        )}
      </div>

      {/* Search & Filters - Only show on drivers tab */}
      {activeTab === 'drivers' && (
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', maxWidth: '320px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
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
                placeholder="Search drivers..."
                style={{
                  width: '100%',
                  padding: '6px 8px 6px 28px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>
            {search && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
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
          </form>

          {/* Results count */}
          <div style={{ color: 'var(--gray-600)', fontSize: '12px', whiteSpace: 'nowrap' }}>
            Showing {getFilteredDrivers().length} of {drivers.length}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'drivers' && (
        <>
          {drivers.length === 0 ? (
            <div className="empty-state">
              <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <path d="M20 8v6M23 11h-6"></path>
                </svg>
              </div>
              <h3 style={{ color: 'var(--gray-700)', marginBottom: '0.5rem' }}>No Drivers Found</h3>
              <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
                Add drivers first to manage their permits and compliance status.<br />
                Permits include DBS checks, Section 19/22 authorizations, and MOT certificates.
              </p>
              <button className="btn btn-primary" onClick={() => window.location.href = '/drivers'}>
                Manage Drivers First
              </button>
            </div>
          ) : (
            <>
              {/* Statistics Cards */}
              {stats && <PermitsStatsCards stats={stats} />}

              {/* Driver Compliance Table */}
              {getFilteredDrivers().length === 0 ? (
                <div className="empty-state">
                  <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm0-10h2v8h-2z"/>
                    </svg>
                  </div>
                  <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
                    {search ? 'No drivers found matching your search.' : `No ${driverTab} drivers found.`}
                  </p>
                </div>
              ) : (
                <DriverComplianceTable
                  drivers={getFilteredDrivers()}
                  driverPermits={driverPermits}
                  driverRoles={driverRoles}
                  onUpdatePermits={handleUpdatePermits}
                  onEditRoles={handleEditRoles}
                />
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'organizational' && (
        <OrganizationalPermitsSection
          permits={orgPermits}
          onRefresh={fetchData}
        />
      )}

      {activeTab === 'section22' && busEnabled && (
        <Section22CompliancePage />
      )}

      {/* Modals */}
      {showUpdatePermitsModal && selectedDriver && (
        <UpdatePermitsModal
          driver={selectedDriver}
          currentPermits={driverPermits[selectedDriver.driver_id]}
          onClose={() => {
            setShowUpdatePermitsModal(false);
            setSelectedDriver(null);
          }}
          onSuccess={handlePermitsUpdated}
        />
      )}

      {showRolesModal && selectedDriver && (
        <DriverRolesModal
          driver={selectedDriver}
          currentRoles={driverRoles[selectedDriver.driver_id]}
          onClose={() => {
            setShowRolesModal(false);
            setSelectedDriver(null);
          }}
          onSuccess={handleRolesUpdated}
        />
      )}

      {showGuideModal && (
        <PermitGuideModal onClose={() => setShowGuideModal(false)} />
      )}
    </div>
  );
}

export default PermitsPage;
