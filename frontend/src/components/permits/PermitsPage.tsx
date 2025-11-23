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
  const [activeTab, setActiveTab] = useState<TabId>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverPermits, setDriverPermits] = useState<Record<number, DriverPermits>>({});
  const [driverRoles, setDriverRoles] = useState<Record<number, DriverRole>>({});
  const [stats, setStats] = useState<PermitsStats | null>(null);
  const [orgPermits, setOrgPermits] = useState<{ section19: OrganizationalPermit[]; section22: OrganizationalPermit[] }>({
    section19: [],
    section22: []
  });

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
      const [driversData, permitsData, statsData, orgPermitsData] = await Promise.all([
        driverApi.getDrivers(tenantId),
        permitsApi.getDriverPermits(tenantId),
        permitsApi.getStats(tenantId),
        permitsApi.getOrganizationalPermits(tenantId)
      ]);

      setDrivers(driversData.drivers || driversData || []);
      setDriverPermits(permitsData.driverPermits || {});
      setDriverRoles(permitsData.driverRoles || {});
      setStats(statsData);
      setOrgPermits(orgPermitsData);
    } catch (error) {
      console.error('Error fetching permits data:', error);
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading permits data...</p>
      </div>
    );
  }

  return (
    <div className="permits-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Permits & Compliance</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-info" onClick={() => setShowGuideModal(true)}>
            Permit Guide
          </button>
          <button className="btn btn-secondary" onClick={fetchData}>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        borderBottom: '2px solid var(--gray-200)',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={() => setActiveTab('drivers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'drivers' ? '2px solid #28a745' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'drivers' ? '#28a745' : 'var(--gray-600)',
            fontWeight: activeTab === 'drivers' ? 600 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'organizational' ? '2px solid #28a745' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'organizational' ? '#28a745' : 'var(--gray-600)',
            fontWeight: activeTab === 'organizational' ? 600 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Organizational Permits
        </button>
        {busEnabled && (
          <button
            onClick={() => setActiveTab('section22')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'section22' ? '2px solid #10b981' : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === 'section22' ? '#10b981' : 'var(--gray-600)',
              fontWeight: activeTab === 'section22' ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            Section 22 Compliance
          </button>
        )}
      </div>

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
              <DriverComplianceTable
                drivers={drivers}
                driverPermits={driverPermits}
                driverRoles={driverRoles}
                onUpdatePermits={handleUpdatePermits}
                onEditRoles={handleEditRoles}
              />
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
