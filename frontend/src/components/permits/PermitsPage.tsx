import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { permitsApi, driverApi } from '../../services/api';
import { Driver, DriverPermits, DriverRole, OrganizationalPermit, PermitsStats } from '../../types';
import PermitsStatsCards from './PermitsStatsCards';
import DriverComplianceTable from './DriverComplianceTable';
import OrganizationalPermitsSection from './OrganizationalPermitsSection';
import UpdatePermitsModal from './UpdatePermitsModal';
import DriverRolesModal from './DriverRolesModal';
import PermitGuideModal from './PermitGuideModal';
import './Permits.css';

/**
 * Permits Page - Driver compliance and organizational permits management
 *
 * Manages:
 * - Driver permits (DBS, Section 19, Section 22, MOT)
 * - Driver roles (Vulnerable Passengers, Section 19/22 Driver, Vehicle Owner)
 * - Organizational permits (Section 19 and Section 22 organizational-level)
 */
function PermitsPage() {
  const { tenant, tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
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

  if (drivers.length === 0) {
    return (
      <div className="permits-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Permits & Compliance</h2>
            {tenant && (
              <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
                {tenant.company_name}
              </p>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ color: '#495057', marginBottom: '15px' }}>No Drivers Found</h3>
            <p style={{ color: '#6c757d', marginBottom: '25px', lineHeight: '1.5' }}>
              Add drivers first to manage their permits and compliance status.
              Permits include DBS checks, Section 19/22 authorizations, and MOT certificates.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => window.location.href = '/drivers'}>
              Manage Drivers First
            </button>
          </div>
        </div>
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

      {/* Organizational Permits */}
      <OrganizationalPermitsSection
        permits={orgPermits}
        onRefresh={fetchData}
      />

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
