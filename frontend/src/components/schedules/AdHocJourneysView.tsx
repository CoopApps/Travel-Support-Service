import { useState, useEffect } from 'react';
import { tripApi, customerApi, driverApi } from '../../services/api';
import { Trip, ServerTime, Customer, Driver } from '../../types';
import { useAuthStore } from '../../store/authStore';
import ScheduledTripsGrid from './ScheduledTripsGrid';
import TripFormModal from './TripFormModal';
import RouteOptimizationPanel from './RouteOptimizationPanel';

interface AdHocJourneysViewProps {
  tenantId: number;
  serverTime: ServerTime | null;
  customStartDate?: string;
  customEndDate?: string;
}

/**
 * Ad-hoc Journeys View
 *
 * Shows one-time/ad-hoc trips with filtering
 * Same grid layout as scheduled view with driver column
 */
function AdHocJourneysView({ tenantId, serverTime, customStartDate, customEndDate }: AdHocJourneysViewProps) {
  const token = useAuthStore(state => state.token);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Filters
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Route optimization state
  const [optimizationPanelOpen, setOptimizationPanelOpen] = useState(false);
  const [selectedDriverForOptimization, setSelectedDriverForOptimization] = useState<{
    driverId: number;
    driverName: string;
    date: string;
  } | null>(null);
  const [optimizationScores, setOptimizationScores] = useState<any[]>([]);

  /**
   * Fetch trips and reference data
   */
  const fetchData = async () => {
    try {
      setLoading(true);

      // Get current week's date range (or use custom dates if set)
      const weekStart = customStartDate || getWeekStart(serverTime?.formatted_date || new Date().toISOString().split('T')[0]);
      const weekEnd = customEndDate || getWeekEnd(weekStart);

      const filters: any = {
        tripType: 'adhoc',
        startDate: weekStart,
        endDate: weekEnd,
        limit: 500
      };

      if (selectedDriver) filters.driverId = selectedDriver;
      if (selectedCustomer) filters.customerId = selectedCustomer;
      if (selectedStatus) filters.status = selectedStatus;

      const [tripsData, customersData, driversData] = await Promise.all([
        tripApi.getTrips(tenantId, filters),
        customerApi.getCustomers(tenantId, { limit: 100 }),
        driverApi.getDrivers(tenantId, { limit: 100 })
      ]);

      setTrips(tripsData.trips || []);
      setCustomers(customersData.customers || []);
      setDrivers(driversData.drivers || []);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (serverTime) {
      fetchData();
    }
  }, [tenantId, serverTime, selectedDriver, selectedCustomer, selectedStatus, customStartDate, customEndDate]);

  /**
   * Fetch optimization scores for all drivers in date range
   */
  const fetchOptimizationScores = async () => {
    try {
      const today = serverTime?.formatted_date || new Date().toISOString().split('T')[0];
      const weekStart = customStartDate || getWeekStart(today);
      const weekEnd = customEndDate || getWeekEnd(weekStart);

      const response = await fetch(
        `/api/tenants/${tenantId}/routes/optimization-scores?startDate=${weekStart}&endDate=${weekEnd}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setOptimizationScores(data.scores || []);
      }
    } catch {
      // Error handled silently
    }
  };

  /**
   * Fetch scores when date range or trips change
   */
  useEffect(() => {
    if (serverTime && trips.length > 0) {
      fetchOptimizationScores();
    }
  }, [customStartDate, customEndDate, trips.length]);

  /**
   * Handle optimize driver - opens optimization panel
   */
  const handleOptimizeDriver = (driverId: number, date: string) => {
    const driver = drivers.find(d => d.driver_id === driverId);
    if (driver) {
      setSelectedDriverForOptimization({
        driverId,
        driverName: driver.name || `${driver.first_name} ${driver.last_name}`,
        date
      });
      setOptimizationPanelOpen(true);
    }
  };

  /**
   * Get week start (Monday) - avoiding timezone issues
   */
  const getWeekStart = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday is 1, Sunday is 0
    const monday = new Date(year, month - 1, day + diff);
    // Format manually to avoid timezone conversion
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  /**
   * Get week end (Sunday)
   */
  const getWeekEnd = (weekStart: string): string => {
    const [year, month, day] = weekStart.split('-').map(Number);
    const sunday = new Date(year, month - 1, day + 6);
    // Format manually to avoid timezone conversion
    const y = sunday.getFullYear();
    const m = String(sunday.getMonth() + 1).padStart(2, '0');
    const d = String(sunday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  /**
   * Get week days array (Monday to Sunday)
   */
  const getWeekDays = (): string[] => {
    if (!serverTime) return [];
    const weekStart = customStartDate || getWeekStart(serverTime.formatted_date);
    const [year, month, day] = weekStart.split('-').map(Number);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(year, month - 1, day + i);
      const yearStr = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      days.push(`${yearStr}-${monthStr}-${dayStr}`);
    }
    return days;
  };

  /**
   * Handle trip deletion
   */
  const handleDelete = async (trip: Trip) => {
    if (!confirm(`Delete trip for ${trip.customer_name} on ${trip.trip_date}?`)) {
      return;
    }

    try {
      await tripApi.deleteTrip(tenantId, trip.trip_id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete trip');
    }
  };

  /**
   * Handle edit trip
   */
  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setShowFormModal(true);
  };

  /**
   * Handle create new trip
   */
  const handleCreate = () => {
    setEditingTrip(null);
    setShowFormModal(true);
  };

  /**
   * Handle modal close
   */
  const handleModalClose = (shouldRefresh: boolean) => {
    setShowFormModal(false);
    setEditingTrip(null);
    if (shouldRefresh) {
      fetchData();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading ad-hoc journeys...</p>
      </div>
    );
  }

  const weekDays = getWeekDays();

  // Filter drivers if selected
  const filteredDrivers = selectedDriver
    ? drivers.filter(d => d.driver_id.toString() === selectedDriver)
    : drivers;

  const urgentCount = trips.filter(t => t.urgent).length;
  const hasActiveFilters = selectedDriver || selectedCustomer || selectedStatus;

  return (
    <div>
      {/* Compact Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '200px' }}>
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
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 8px 5px 28px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '13px',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
          />
        </div>

        {/* Urgent badge - only if > 0 */}
        {urgentCount > 0 && (
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            background: '#fef3c7',
            color: '#b45309',
            borderRadius: '10px',
            fontWeight: 500
          }}>
            {urgentCount} urgent
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Filter button with popover */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              const el = document.getElementById('adhoc-filter-popover');
              if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
            }}
            style={{
              padding: '6px 10px',
              fontSize: '13px',
              background: hasActiveFilters ? '#eff6ff' : 'white',
              border: hasActiveFilters ? '1px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: hasActiveFilters ? '#1d4ed8' : '#374151'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filter
            {hasActiveFilters && (
              <span style={{
                background: '#3b82f6',
                color: 'white',
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '8px',
                marginLeft: '2px'
              }}>
                {[selectedDriver, selectedCustomer, selectedStatus].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Filter Popover */}
          <div
            id="adhoc-filter-popover"
            style={{
              display: 'none',
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '12px',
              zIndex: 100,
              minWidth: '200px'
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px', color: '#6b7280' }}>Driver</label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
              >
                <option value="">All</option>
                {drivers.map(driver => (
                  <option key={driver.driver_id} value={driver.driver_id}>{driver.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px', color: '#6b7280' }}>Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
              >
                <option value="">All</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px', color: '#6b7280' }}>Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
              >
                <option value="">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSelectedDriver('');
                  setSelectedCustomer('');
                  setSelectedStatus('');
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: '12px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#374151'
                }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Refresh - icon only */}
        <button
          onClick={fetchData}
          style={{
            padding: '6px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      {/* Weekly Schedule Grid - Same as Scheduled Appointments */}
      <ScheduledTripsGrid
        drivers={filteredDrivers}
        trips={trips}
        weekDays={weekDays}
        serverTime={serverTime}
        tenantId={tenantId}
        searchQuery={searchQuery}
        onEditTrip={handleEdit}
        onCreateTrip={(driverId, dayIndex) => {
          // Convert day index to date
          const tripDate = weekDays[dayIndex];
          setEditingTrip({
            driver_id: driverId,
            trip_date: tripDate,
            trip_type: 'adhoc'
          } as any);
          setShowFormModal(true);
        }}
        onRefresh={fetchData}
        viewType="adhoc"
        optimizationScores={optimizationScores}
        onOptimizeDriver={handleOptimizeDriver}
      />

      {/* Trip Form Modal */}
      {showFormModal && (
        <TripFormModal
          trip={editingTrip}
          tenantId={tenantId}
          customers={customers}
          drivers={drivers}
          serverTime={serverTime}
          onClose={handleModalClose}
        />
      )}

      {/* Route Optimization Panel */}
      {optimizationPanelOpen && selectedDriverForOptimization && (
        <RouteOptimizationPanel
          tenantId={tenantId}
          driverId={selectedDriverForOptimization.driverId}
          driverName={selectedDriverForOptimization.driverName}
          date={selectedDriverForOptimization.date}
          onClose={() => {
            setOptimizationPanelOpen(false);
            setSelectedDriverForOptimization(null);
          }}
          onOptimized={() => {
            fetchData();
            fetchOptimizationScores();
          }}
        />
      )}
    </div>
  );
}

export default AdHocJourneysView;
