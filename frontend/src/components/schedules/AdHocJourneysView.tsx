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
  searchQuery?: string;
  selectedDriver?: string;
  selectedCustomer?: string;
  selectedStatus?: string;
}

/**
 * Ad-hoc Journeys View
 *
 * Shows one-time/ad-hoc trips with filtering
 * Same grid layout as scheduled view with driver column
 */
function AdHocJourneysView({
  tenantId,
  serverTime,
  customStartDate,
  customEndDate,
  searchQuery = '',
  selectedDriver = '',
  selectedCustomer = '',
  selectedStatus = ''
}: AdHocJourneysViewProps) {
  const token = useAuthStore(state => state.token);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

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

  return (
    <div>
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
