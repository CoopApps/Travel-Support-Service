import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { vehicleApi, driverApi } from '../../services/api';
import { Vehicle, Driver, VehicleStats as VehicleStatsType } from '../../types';
import VehicleStats from './VehicleStats';
import VehicleCard from './VehicleCard';
import VehicleFormModal from './VehicleFormModal';
import AssignDriverModal from './AssignDriverModal';
import LogServiceModal from './LogServiceModal';
import MaintenanceOverview from './MaintenanceOverview';
import IncidentsTab from './IncidentsTab';
import IncidentFormModal from './IncidentFormModal';

/**
 * Vehicle List Page
 *
 * Main page for fleet management with Overview and Maintenance tabs
 */
function VehicleListPage() {
  const { tenantId, tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'incidents'>('overview');

  // Filter state
  const [showOwned, setShowOwned] = useState(true);
  const [showLeased, setShowLeased] = useState(true);
  const [showPersonal, setShowPersonal] = useState(true);

  // Modal state
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null);
  const [showLogService, setShowLogService] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [vehiclesData, driversData] = await Promise.all([
        vehicleApi.getVehicles(tenantId),
        driverApi.getDrivers(tenantId, { limit: 1000 })
      ]);

      setVehicles(vehiclesData);
      setDrivers(driversData.drivers || driversData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats: VehicleStatsType = {
    total: vehicles.length,
    owned: vehicles.filter(v => v.ownership === 'owned').length,
    leased: vehicles.filter(v => v.ownership === 'leased').length,
    personal: vehicles.filter(v => v.ownership === 'personal').length,
    wheelchair_accessible: vehicles.filter(v => v.wheelchair_accessible).length,
    needs_details: vehicles.filter(v => v.is_basic_record).length,
    total_monthly_costs: vehicles.reduce((sum, v) => {
      return sum + (v.lease_monthly_cost || 0) + (v.insurance_monthly_cost || 0);
    }, 0)
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    if (!showOwned && v.ownership === 'owned') return false;
    if (!showLeased && v.ownership === 'leased') return false;
    if (!showPersonal && v.ownership === 'personal') return false;
    return true;
  });

  // Handlers
  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setShowVehicleForm(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowVehicleForm(true);
  };

  const handleAssignDriver = (vehicle: Vehicle) => {
    setAssigningVehicle(vehicle);
    setShowAssignDriver(true);
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!tenantId) return;

    const confirmed = confirm(
      `Delete ${vehicle.make} ${vehicle.model} (${vehicle.registration})?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await vehicleApi.deleteVehicle(tenantId, vehicle.vehicle_id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete vehicle');
    }
  };

  const handleModalClose = (shouldRefresh: boolean) => {
    setShowVehicleForm(false);
    setShowAssignDriver(false);
    setShowLogService(false);
    setShowIncidentForm(false);
    setEditingVehicle(null);
    setAssigningVehicle(null);

    if (shouldRefresh) {
      fetchData();
    }
  };

  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Fleet Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={handleAddVehicle}>
          + Add Vehicle
        </button>
      </div>

      {/* Statistics Cards */}
      <VehicleStats stats={stats} loading={loading} />

      {/* Tab Navigation */}
      <div style={{
        borderBottom: '2px solid var(--gray-200)',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '2rem'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.75rem 0',
            border: 'none',
            background: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            color: activeTab === 'overview' ? 'var(--primary)' : 'var(--gray-600)',
            borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          style={{
            padding: '0.75rem 0',
            border: 'none',
            background: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            color: activeTab === 'maintenance' ? 'var(--primary)' : 'var(--gray-600)',
            borderBottom: activeTab === 'maintenance' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Maintenance
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          style={{
            padding: '0.75rem 0',
            border: 'none',
            background: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            color: activeTab === 'incidents' ? 'var(--primary)' : 'var(--gray-600)',
            borderBottom: activeTab === 'incidents' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Incidents
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>

          {/* Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Filter Toggles */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                Show:
              </span>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}>
                <input
                  type="checkbox"
                  checked={showOwned}
                  onChange={(e) => setShowOwned(e.target.checked)}
                />
                <span style={{ color: '#166534', fontWeight: 500 }}>Owned ({stats.owned})</span>
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}>
                <input
                  type="checkbox"
                  checked={showLeased}
                  onChange={(e) => setShowLeased(e.target.checked)}
                />
                <span style={{ color: '#92400e', fontWeight: 500 }}>Leased ({stats.leased})</span>
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}>
                <input
                  type="checkbox"
                  checked={showPersonal}
                  onChange={(e) => setShowPersonal(e.target.checked)}
                />
                <span style={{ color: '#831843', fontWeight: 500 }}>Personal ({stats.personal})</span>
              </label>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => fetchData()}
              className="btn btn-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
          </div>

          {/* Vehicle Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
              <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading vehicles...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="empty-state">
              <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
              </div>
              <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
                {vehicles.length === 0
                  ? 'No vehicles yet.'
                  : 'No vehicles match the current filters.'
                }
              </p>
              {vehicles.length === 0 && (
                <button onClick={handleAddVehicle} className="btn btn-primary">
                  Add Your First Vehicle
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.25rem'
            }}>
              {filteredVehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.vehicle_id}
                  vehicle={vehicle}
                  onEdit={handleEditVehicle}
                  onAssignDriver={handleAssignDriver}
                  onDelete={handleDeleteVehicle}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <MaintenanceOverview
          onLogService={() => setShowLogService(true)}
        />
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <IncidentsTab
          onReportIncident={() => setShowIncidentForm(true)}
        />
      )}

      {/* Modals */}
      {showVehicleForm && (
        <VehicleFormModal
          vehicle={editingVehicle}
          drivers={drivers}
          onClose={handleModalClose}
        />
      )}

      {showAssignDriver && assigningVehicle && (
        <AssignDriverModal
          vehicle={assigningVehicle}
          drivers={drivers}
          onClose={handleModalClose}
        />
      )}

      {showLogService && (
        <LogServiceModal
          vehicles={vehicles}
          onClose={handleModalClose}
        />
      )}

      {showIncidentForm && (
        <IncidentFormModal
          vehicles={vehicles}
          drivers={drivers}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export default VehicleListPage;
