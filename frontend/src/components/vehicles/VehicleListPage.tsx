import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useServiceContext } from '../../contexts/ServiceContext';
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
import FleetAnalyticsDashboard from './FleetAnalyticsDashboard';
import IdleVehiclesReport from './IdleVehiclesReport';

/**
 * Service-Aware Vehicle List Page
 *
 * Features:
 * - Filters vehicles by type based on active service
 * - Bus mode: Shows only buses/minibuses (9+ seats)
 * - Transport mode: Shows all vehicles
 * - Section 22 compliance indicators
 */
function VehicleListPage() {
  const { tenantId, tenant } = useTenant();
  const { activeService } = useServiceContext();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'incidents' | 'analytics'>('overview');

  // Filter state
  const [showOwned, setShowOwned] = useState(true);
  const [showLeased, setShowLeased] = useState(true);
  const [showPersonal, setShowPersonal] = useState(true);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'all' | 'bus' | 'minibus' | 'car'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get vehicle type based on seating capacity
   */
  const getVehicleType = (vehicle: Vehicle): 'bus' | 'minibus' | 'car' => {
    const capacity = vehicle.seating_capacity || 0;
    if (capacity >= 17) return 'bus';
    if (capacity >= 9) return 'minibus';
    return 'car';
  };

  /**
   * Check if vehicle is suitable for Section 22 bus operations
   */
  const isSection22Suitable = (vehicle: Vehicle): boolean => {
    const capacity = vehicle.seating_capacity || 0;
    // Section 22 typically requires 9+ seats (minibus or bus)
    return capacity >= 9;
  };

  // Filter vehicles based on service and type
  const getFilteredVehicles = () => {
    let filtered = vehicles;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.registration?.toLowerCase().includes(term) ||
        v.make?.toLowerCase().includes(term) ||
        v.model?.toLowerCase().includes(term)
      );
    }

    // When bus service is active, only show buses/minibuses (9+ seats)
    if (activeService === 'bus') {
      filtered = filtered.filter(v => isSection22Suitable(v));
    }

    // Apply vehicle type filter
    if (vehicleTypeFilter !== 'all') {
      filtered = filtered.filter(v => getVehicleType(v) === vehicleTypeFilter);
    }

    // Apply ownership filters
    if (!showOwned) filtered = filtered.filter(v => v.ownership !== 'owned');
    if (!showLeased) filtered = filtered.filter(v => v.ownership !== 'leased');
    if (!showPersonal) filtered = filtered.filter(v => v.ownership !== 'personal');

    return filtered;
  };

  const filteredVehicles = getFilteredVehicles();

  // Calculate stats (from ALL vehicles, then from filtered for comparison)
  const allVehicles = vehicles;
  const busVehicles = vehicles.filter(v => isSection22Suitable(v));

  const stats: VehicleStatsType = {
    total: activeService === 'bus' ? busVehicles.length : allVehicles.length,
    owned: filteredVehicles.filter(v => v.ownership === 'owned').length,
    leased: filteredVehicles.filter(v => v.ownership === 'leased').length,
    personal: filteredVehicles.filter(v => v.ownership === 'personal').length,
    wheelchair_accessible: filteredVehicles.filter(v => v.wheelchair_accessible).length,
    needs_details: filteredVehicles.filter(v => v.is_basic_record).length,
    total_monthly_costs: filteredVehicles.reduce((sum, v) => {
      return sum + (v.lease_monthly_cost || 0) + (v.insurance_monthly_cost || 0);
    }, 0)
  };

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
      {/* Page Header - Compact */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '20px' }}>Vehicles</h2>
        <button
          onClick={handleAddVehicle}
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
          Add Vehicle
        </button>
      </div>

      {/* Statistics Cards */}
      <VehicleStats stats={stats} loading={loading} />

      {/* Tab Navigation - Compact */}
      <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px', width: 'fit-content', marginBottom: '1rem' }}>
        {(['overview', 'maintenance', 'incidents', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '5px 12px',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>

          {/* Toolbar - Compact */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search registration, make, model..."
                  style={{ paddingLeft: '28px', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', minWidth: '220px' }}
                />
              </div>

              {/* Filter Toggles */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
                  <input type="checkbox" checked={showOwned} onChange={(e) => setShowOwned(e.target.checked)} style={{ width: '12px', height: '12px' }} />
                  <span style={{ color: '#166534', fontWeight: 500 }}>Owned</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
                  <input type="checkbox" checked={showLeased} onChange={(e) => setShowLeased(e.target.checked)} style={{ width: '12px', height: '12px' }} />
                  <span style={{ color: '#92400e', fontWeight: 500 }}>Leased</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
                  <input type="checkbox" checked={showPersonal} onChange={(e) => setShowPersonal(e.target.checked)} style={{ width: '12px', height: '12px' }} />
                  <span style={{ color: '#831843', fontWeight: 500 }}>Personal</span>
                </label>
              </div>

              {/* Vehicle Type Filter */}
              <select
                value={vehicleTypeFilter}
                onChange={(e) => setVehicleTypeFilter(e.target.value as any)}
                style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', minWidth: '130px' }}
              >
                <option value="all">All Types</option>
                <option value="bus">Bus (17+)</option>
                <option value="minibus">Minibus (9-16)</option>
                <option value="car">Car (1-8)</option>
              </select>

              {activeService === 'bus' && (
                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 500, backgroundColor: '#d1fae5', padding: '3px 6px', borderRadius: '3px' }}>
                  S22 Mode: 9+ seats
                </span>
              )}
            </div>
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
              {filteredVehicles.map(vehicle => {
                const vehicleType = getVehicleType(vehicle);
                const section22Suitable = isSection22Suitable(vehicle);

                return (
                  <VehicleCard
                    key={vehicle.vehicle_id}
                    vehicle={vehicle}
                    onEdit={handleEditVehicle}
                    onAssignDriver={handleAssignDriver}
                    onDelete={handleDeleteVehicle}
                    vehicleType={vehicleType}
                    section22Suitable={section22Suitable}
                    showBusInfo={activeService === 'bus'}
                  />
                );
              })}
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

      {/* Analytics Tab */}
      {activeTab === 'analytics' && tenantId && (
        <div>
          {/* Analytics Sub-tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--gray-200)',
            paddingBottom: '0.5rem'
          }}>
            <button
              onClick={() => {
                const dashboardSection = document.getElementById('fleet-dashboard');
                dashboardSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              Fleet Dashboard
            </button>
            <button
              onClick={() => {
                const idleSection = document.getElementById('idle-vehicles');
                idleSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--gray-100)',
                color: 'var(--gray-700)',
                border: '1px solid var(--gray-300)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              Idle Vehicles
            </button>
          </div>

          {/* Fleet Dashboard Section */}
          <div id="fleet-dashboard" style={{ marginBottom: '2rem' }}>
            <FleetAnalyticsDashboard tenantId={tenantId} />
          </div>

          {/* Idle Vehicles Section */}
          <div id="idle-vehicles">
            <IdleVehiclesReport tenantId={tenantId} />
          </div>
        </div>
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
