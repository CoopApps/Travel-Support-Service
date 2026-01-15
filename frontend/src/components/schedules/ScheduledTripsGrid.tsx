import { useState, useEffect, useMemo, useCallback } from 'react';
import { Trip, Driver } from '../../types';
import TripContextMenu from './TripContextMenu';
import { tripApi } from '../../services/api';

interface ScheduledTripsGridProps {
  drivers: Driver[];
  trips: Trip[];
  weekDays: string[];
  serverTime: { formatted_date: string; day_of_week: number } | null;
  tenantId: number;
  onEditTrip?: (trip: Trip) => void;
  onCreateTrip?: (driverId: number, dayIndex: number, period: 'morning' | 'afternoon') => void;
  onRefresh?: () => void; // Callback to refresh data after updates
  viewType?: 'regular' | 'adhoc'; // To apply different colors based on view
  optimizationScores?: any[]; // Optimization scores for each driver-date combination
  onOptimizeDriver?: (driverId: number, date: string) => void; // Callback to open optimization panel
}

/**
 * Scheduled Trips Grid
 *
 * Weekly schedule grid showing drivers and their trips
 * Structure: Driver column + 7 day columns with morning/afternoon slots
 */
function ScheduledTripsGrid({
  drivers,
  trips,
  weekDays,
  serverTime,
  tenantId,
  onEditTrip,
  onCreateTrip,
  onRefresh,
  viewType = 'regular',
  optimizationScores,
  onOptimizeDriver
}: ScheduledTripsGridProps) {

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    trip: Trip | null;
    position: { x: number; y: number };
  } | null>(null);

  // Drag and drop state
  const [draggedTrip, setDraggedTrip] = useState<Trip | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{
    driverId: number;
    dayIndex: number;
    period: 'morning' | 'afternoon';
  } | null>(null);

  // Bulk selection state
  const [selectedTripIds, setSelectedTripIds] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Keyboard shortcuts help state
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  /**
   * Debounce search query (300ms delay)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Handle window resize for responsive layout
   */
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Handle trip status change (memoized)
   */
  const handleStatusChange = useCallback(async (trip: Trip, newStatus: string) => {
    try {
      await tripApi.updateTrip(tenantId, trip.trip_id, { status: newStatus });
      // Trigger parent refresh via callback
      onRefresh?.();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update trip status');
    }
  }, [tenantId, onRefresh]);

  /**
   * Handle trip deletion (memoized)
   */
  const handleDelete = useCallback(async (trip: Trip) => {
    if (!confirm(`Delete trip for ${trip.customer_name}?`)) {
      return;
    }
    try {
      await tripApi.deleteTrip(tenantId, trip.trip_id);
      // Trigger parent refresh via callback
      onRefresh?.();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete trip');
    }
  }, [tenantId, onRefresh]);

  /**
   * Handle drag start (memoized)
   */
  const handleDragStart = useCallback((e: React.DragEvent, trip: Trip) => {
    setDraggedTrip(trip);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', trip.trip_id.toString());
  }, []);

  /**
   * Handle drag over (allow drop) - memoized
   */
  const handleDragOver = useCallback((e: React.DragEvent, driverId: number, dayIndex: number, period: 'morning' | 'afternoon') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ driverId, dayIndex, period });
  }, []);

  /**
   * Handle drag leave - memoized
   */
  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null);
  }, []);

  /**
   * Handle drop - memoized
   */
  const handleDrop = useCallback(async (e: React.DragEvent, driverId: number, dayIndex: number, period: 'morning' | 'afternoon') => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!draggedTrip) return;

    const targetDate = weekDays[dayIndex];
    const targetTime = period === 'morning' ? '09:00' : '14:00'; // Default times

    // Check if anything actually changed
    const sameDriver = draggedTrip.driver_id === driverId;
    const sameDate = draggedTrip.trip_date.split('T')[0] === targetDate;
    const currentHour = parseInt(draggedTrip.pickup_time?.split(':')[0] || '9');
    const samePeriod = (currentHour < 12 && period === 'morning') || (currentHour >= 12 && period === 'afternoon');

    if (sameDriver && sameDate && samePeriod) {
      setDraggedTrip(null);
      return; // No change needed
    }

    try {
      // Update trip with new driver, date, and time
      await tripApi.updateTrip(tenantId, draggedTrip.trip_id, {
        driver_id: driverId,
        trip_date: targetDate,
        pickup_time: targetTime,
      });

      // Refresh grid
      onRefresh?.();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reassign trip');
    } finally {
      setDraggedTrip(null);
    }
  }, [draggedTrip, weekDays, tenantId, onRefresh]);

  /**
   * Handle drag end - memoized
   */
  const handleDragEnd = useCallback(() => {
    setDraggedTrip(null);
    setDragOverSlot(null);
  }, []);

  /**
   * Handle trip selection toggle - memoized
   */
  const handleTripSelect = useCallback((tripId: number, isCtrlKey: boolean) => {
    const newSelected = new Set(selectedTripIds);
    if (newSelected.has(tripId)) {
      newSelected.delete(tripId);
    } else {
      if (!isCtrlKey) {
        newSelected.clear(); // Single select if not holding Ctrl
      }
      newSelected.add(tripId);
    }
    setSelectedTripIds(newSelected);
    setShowBulkActions(newSelected.size > 0);
  }, [selectedTripIds]);

  /**
   * Filter trips based on search query (memoized for performance)
   */
  const filteredTrips = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return trips;
    }

    const query = debouncedSearchQuery.toLowerCase().trim();

    return trips.filter(trip => {
      // Get driver name for this trip
      const driver = drivers.find(d => d.driver_id === trip.driver_id);
      const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';

      // Search in multiple fields
      const matchesCustomer = trip.customer_name?.toLowerCase().includes(query);
      const matchesPickupLocation = trip.pickup_location?.toLowerCase().includes(query);
      const matchesPickupAddress = trip.pickup_address?.toLowerCase().includes(query);
      const matchesDestination = trip.destination?.toLowerCase().includes(query);
      const matchesDestinationAddress = trip.destination_address?.toLowerCase().includes(query);
      const matchesDriver = driverName.includes(query);
      const matchesStatus = trip.status?.toLowerCase().includes(query);

      return matchesCustomer || matchesPickupLocation || matchesPickupAddress ||
             matchesDestination || matchesDestinationAddress || matchesDriver || matchesStatus;
    });
  }, [trips, drivers, debouncedSearchQuery]);

  /**
   * Clear selection - memoized
   */
  const handleClearSelection = useCallback(() => {
    setSelectedTripIds(new Set());
    setShowBulkActions(false);
  }, []);

  /**
   * Select all trips (filtered results) - memoized
   */
  const handleSelectAll = useCallback(() => {
    const allTripIds = new Set(filteredTrips.map(t => t.trip_id));
    setSelectedTripIds(allTripIds);
    setShowBulkActions(true);
  }, [filteredTrips]);

  /**
   * Bulk delete trips - memoized
   */
  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedTripIds.size} selected trip(s)?`)) {
      return;
    }
    try {
      const deletePromises = Array.from(selectedTripIds).map(tripId =>
        tripApi.deleteTrip(tenantId, tripId)
      );
      await Promise.all(deletePromises);
      handleClearSelection();
      onRefresh?.();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete trips');
    }
  }, [selectedTripIds, tenantId, onRefresh, handleClearSelection]);

  /**
   * Bulk status change - memoized
   */
  const handleBulkStatusChange = useCallback(async (newStatus: string) => {
    try {
      const updatePromises = Array.from(selectedTripIds).map(tripId =>
        tripApi.updateTrip(tenantId, tripId, { status: newStatus })
      );
      await Promise.all(updatePromises);
      handleClearSelection();
      onRefresh?.();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update trip status');
    }
  }, [selectedTripIds, tenantId, onRefresh, handleClearSelection]);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // N - New trip (open create dialog for first driver)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (drivers.length > 0 && onCreateTrip) {
          // Create a trip for the first driver on the current day
          const today = serverTime?.day_of_week || 0;
          onCreateTrip(drivers[0].driver_id, today, 'morning');
        }
      }

      // E - Edit selected trip
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (selectedTripIds.size === 1) {
          const selectedId = Array.from(selectedTripIds)[0];
          const trip = trips.find(t => t.trip_id === selectedId);
          if (trip && onEditTrip) {
            onEditTrip(trip);
          }
        } else if (selectedTripIds.size > 1) {
          alert('Please select only one trip to edit');
        } else {
          alert('Please select a trip to edit (click checkbox)');
        }
      }

      // Delete - Quick delete selected trips
      if (e.key === 'Delete' && selectedTripIds.size > 0) {
        e.preventDefault();
        handleBulkDelete();
      }

      // ESC - Clear selection
      if (e.key === 'Escape') {
        if (selectedTripIds.size > 0) {
          e.preventDefault();
          handleClearSelection();
        }
      }

      // Ctrl+A - Select all trips
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      }

      // ? - Toggle keyboard shortcuts help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drivers, trips, selectedTripIds, onCreateTrip, onEditTrip, serverTime]);

  // Color schemes based on view type (matching legacy)
  const colorScheme = viewType === 'adhoc' ? {
    morning: {
      background: '#e3f2fd',      // Light blue background
      headerBg: '#90caf9',        // Lighter blue for header
      headerColor: '#1976d2',     // Dark blue text
      border: '#64b5f6',
      hoverBorder: '#007bff'
    },
    afternoon: {
      background: '#f3e5f5',      // Light purple background
      headerBg: '#ce93d8',        // Lighter purple for header
      headerColor: '#7b1fa2',     // Dark purple text
      border: '#ba68c8',
      hoverBorder: '#7b1fa2'
    }
  } : {
    morning: {
      background: '#e8f5e9',      // Light green background
      headerBg: '#a5d6a7',        // Lighter green for header
      headerColor: '#2e7d32',     // Dark green text
      border: '#81c784',
      hoverBorder: '#4caf50'
    },
    afternoon: {
      background: '#fff3e0',      // Light orange background
      headerBg: '#ffcc80',        // Lighter orange for header
      headerColor: '#f57c00',     // Dark orange text
      border: '#ffb74d',
      hoverBorder: '#ff9800'
    }
  };

  /**
   * Get optimization score for a driver on a specific date
   */
  const getOptimizationScore = useCallback((driverId: number, date: string) => {
    if (!optimizationScores) return null;
    return optimizationScores.find(
      s => s.driverId === driverId && s.date === date
    );
  }, [optimizationScores]);

  /**
   * Get color for optimization score
   */
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  /**
   * Get trips for a specific driver, day, and period (uses filtered trips) - memoized
   */
  const getTripsForSlot = useCallback((driverId: number, date: string, period: 'morning' | 'afternoon'): Trip[] => {
    return filteredTrips.filter(trip => {
      // Normalize trip_date to YYYY-MM-DD format for comparison
      const tripDate = trip.trip_date.split('T')[0];
      if (trip.driver_id !== driverId || tripDate !== date) return false;

      // Determine period based on pickup time
      const hour = parseInt(trip.pickup_time?.split(':')[0] || '0');
      if (period === 'morning') {
        return hour < 14;
      } else {
        return hour >= 14;
      }
    });
  }, [filteredTrips]);

  /**
   * Get current day index - memoized
   */
  const currentDayIndex = useMemo(() => {
    if (!serverTime) return -1;
    const today = serverTime.formatted_date;
    return weekDays.findIndex(day => day === today);
  }, [serverTime, weekDays]);

  /**
   * Format day header
   */
  const formatDayHeader = (dateStr: string): string => {
    // Parse date components to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    const dayNum = date.getDate();
    const monthName = date.toLocaleDateString('en-GB', { month: 'short' });
    return `${dayName} ${dayNum} ${monthName}`;
  };

  // Use dummy driver data when no drivers exist
  const displayDrivers = drivers.length === 0 ? [{
    driver_id: -1,
    name: 'No Drivers Available',
    phone: 'Add drivers to start scheduling',
    email: '',
    employment_type: 'full_time' as const,
    tenant_id: tenantId,
    is_active: false
  }] : drivers;

  const isDummyMode = drivers.length === 0;

  return (
    <>
      {/* Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
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
              padding: '6px 10px 6px 32px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '13px',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
          />
        </div>
        {searchQuery && (
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {filteredTrips.length}/{trips.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowKeyboardHelp(prev => !prev)}
          style={{
            padding: '4px 8px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            color: '#9ca3af'
          }}
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>
      </div>

      {/* Bulk Actions Toolbar */}
      {showBulkActions && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #3b82f6',
          borderRadius: '6px',
          padding: isMobile ? '12px' : '12px 16px',
          marginBottom: '12px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '12px' }}>
            <span style={{ fontWeight: 600, color: '#1e40af', fontSize: isMobile ? '15px' : '14px' }}>
              {selectedTripIds.size} trip{selectedTripIds.size !== 1 ? 's' : ''} selected
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleClearSelection}
                style={{
                  flex: isMobile ? 1 : 'none',
                  padding: isMobile ? '8px 12px' : '6px 12px',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: isMobile ? '14px' : '13px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
              <button
                onClick={handleSelectAll}
                style={{
                  flex: isMobile ? 1 : 'none',
                  padding: isMobile ? '8px 12px' : '6px 12px',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: isMobile ? '14px' : '13px',
                  cursor: 'pointer'
                }}
              >
                Select All ({filteredTrips.length})
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusChange(e.target.value);
                  e.target.value = '';
                }
              }}
              style={{
                padding: isMobile ? '8px 12px' : '6px 12px',
                background: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: isMobile ? '14px' : '13px',
                cursor: 'pointer'
              }}
              defaultValue=""
            >
              <option value="" disabled>Change Status...</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
            <button
              onClick={handleBulkDelete}
              style={{
                padding: isMobile ? '8px 12px' : '6px 12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: isMobile ? '14px' : '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Mobile Instructions */}
      {isMobile && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          padding: '10px 12px',
          marginBottom: '12px',
          fontSize: '13px',
          color: '#92400e'
        }}>
          <strong>Tip:</strong> Swipe horizontally to view all days. Tap and hold trips for actions.
        </div>
      )}

    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '11px',
        opacity: isDummyMode ? 0.5 : 1,
        pointerEvents: isDummyMode ? 'none' : 'auto'
      }}>
        <thead>
          <tr>
            <th style={{
              position: 'sticky',
              left: 0,
              background: 'var(--gray-100)',
              padding: '12px',
              textAlign: 'left',
              borderBottom: '2px solid var(--gray-300)',
              zIndex: 10,
              minWidth: '180px'
            }}>
              Driver
            </th>
            {weekDays.map((date, index) => {
              const isToday = index === currentDayIndex;
              return (
                <th key={date} style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  borderBottom: '2px solid var(--gray-300)',
                  borderLeft: isToday ? '3px solid #2196f3' : undefined,
                  borderRight: isToday ? '3px solid #2196f3' : undefined,
                  borderTop: isToday ? '3px solid #2196f3' : undefined,
                  background: isToday ? '#e3f2fd' : 'var(--gray-50)',
                  fontWeight: 600,
                  fontSize: '12px',
                  minWidth: '160px'
                }}>
                  {formatDayHeader(date)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayDrivers.map(driver => {
            // Count trips for this driver
            const driverTrips = trips.filter(t => t.driver_id === driver.driver_id);
            const hasTrips = driverTrips.length > 0;

            return (
              <tr key={driver.driver_id}>
                {/* Driver Column */}
                <td style={{
                  position: 'sticky',
                  left: 0,
                  background: 'white',
                  padding: '12px',
                  borderBottom: '1px solid var(--gray-200)',
                  zIndex: 9,
                  verticalAlign: 'top'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {driver.name}
                    {/* Show aggregate score for driver across week */}
                    {optimizationScores && (() => {
                      const driverScores = weekDays
                        .map(date => getOptimizationScore(driver.driver_id, date))
                        .filter(s => s !== null);
                      if (driverScores.length > 0) {
                        const avgScore = driverScores.reduce((sum, s) => sum + (s?.score || 0), 0) / driverScores.length;
                        return (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getScoreColor(avgScore),
                            display: 'inline-block'
                          }} title={`Avg optimization: ${avgScore.toFixed(0)}%`} />
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                    {driver.phone || 'No phone'}
                  </div>
                  {!isDummyMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button
                        className="btn btn-sm"
                        style={{
                          fontSize: '10px',
                          padding: '4px 8px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none'
                        }}
                        title="Generate PDF schedule"
                      >
                        PDF Schedule
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{
                          fontSize: '10px',
                          padding: '4px 8px',
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none'
                        }}
                        title="Email schedule"
                      >
                        Email Schedule
                      </button>
                      {onOptimizeDriver && (
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            // Find first date with trips for this driver
                            const driverTripsDate = trips.find(t => t.driver_id === driver.driver_id)?.trip_date.split('T')[0];
                            if (driverTripsDate) {
                              onOptimizeDriver(driver.driver_id, driverTripsDate);
                            } else {
                              // Default to first day of week
                              onOptimizeDriver(driver.driver_id, weekDays[0]);
                            }
                          }}
                          style={{
                            fontSize: '10px',
                            padding: '4px 8px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            justifyContent: 'center'
                          }}
                          title="Optimize routes"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                            <line x1="8" y1="2" x2="8" y2="18"/>
                            <line x1="16" y1="6" x2="16" y2="22"/>
                          </svg>
                          Optimize
                        </button>
                      )}
                      <small style={{
                        fontSize: '10px',
                        color: hasTrips ? '#28a745' : '#6c757d',
                        marginTop: '4px'
                      }}>
                        {hasTrips ? 'Has assignments' : 'No assignments'}
                      </small>
                    </div>
                  )}
                </td>

                {/* Day Columns */}
                {weekDays.map((date, dayIndex) => {
                  const isToday = dayIndex === currentDayIndex;
                  const morningTrips = getTripsForSlot(driver.driver_id, date, 'morning');
                  const afternoonTrips = getTripsForSlot(driver.driver_id, date, 'afternoon');

                  return (
                    <td key={date} style={{
                      padding: '4px',
                      borderBottom: isToday ? '3px solid #2196f3' : '1px solid var(--gray-200)',
                      borderLeft: isToday ? '3px solid #2196f3' : '1px solid var(--gray-200)',
                      borderRight: isToday ? '3px solid #2196f3' : undefined,
                      background: isToday ? '#f0f9ff' : 'white',
                      verticalAlign: 'top',
                      position: 'relative'
                    }}>
                      {/* Optimization Score Indicator */}
                      {optimizationScores && (() => {
                        const score = getOptimizationScore(driver.driver_id, date);
                        if (score && score.tripCount >= 2) {
                          return (
                            <div style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: getScoreColor(score.score),
                              cursor: 'help',
                              zIndex: 5
                            }} title={`Optimization: ${score.score}% (${score.savingsPotential.toFixed(1)} mi savings)`} />
                          );
                        }
                        return null;
                      })()}
                      {/* Morning Period */}
                      <div
                        onClick={() => {
                          if (morningTrips.length === 0) {
                            onCreateTrip?.(driver.driver_id, dayIndex, 'morning');
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Show context menu even on empty periods
                          setContextMenu({
                            trip: null,
                            position: { x: e.clientX, y: e.clientY }
                          });
                        }}
                        style={{
                          background: colorScheme.morning.background,
                          border: `1px solid ${colorScheme.morning.border}`,
                          borderRadius: '4px',
                          marginBottom: '4px',
                          minHeight: '60px',
                          cursor: morningTrips.length === 0 ? 'pointer' : 'default'
                        }}>
                        <div style={{
                          background: colorScheme.morning.headerBg,
                          color: colorScheme.morning.headerColor,
                          padding: '4px 8px',
                          fontSize: '10px',
                          fontWeight: 700,
                          borderTopLeftRadius: '3px',
                          borderTopRightRadius: '3px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>MORNING</span>
                          <span>({morningTrips.length})</span>
                        </div>
                        <div
                          onDragOver={(e) => handleDragOver(e, driver.driver_id, dayIndex, 'morning')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, driver.driver_id, dayIndex, 'morning')}
                          style={{
                            padding: '6px',
                            minHeight: '60px',
                            background: dragOverSlot?.driverId === driver.driver_id &&
                                       dragOverSlot?.dayIndex === dayIndex &&
                                       dragOverSlot?.period === 'morning'
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'transparent',
                            border: dragOverSlot?.driverId === driver.driver_id &&
                                   dragOverSlot?.dayIndex === dayIndex &&
                                   dragOverSlot?.period === 'morning'
                              ? '2px dashed #3b82f6'
                              : '2px dashed transparent',
                            transition: 'all 0.2s'
                          }}
                        >
                          {morningTrips.length === 0 ? (
                            <div style={{
                              fontSize: '10px',
                              color: 'var(--gray-500)',
                              textAlign: 'center',
                              padding: '8px 4px'
                            }}>
                              Click to assign
                            </div>
                          ) : (
                            <>
                              {morningTrips.map(trip => (
                                <div
                                  key={trip.trip_id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, trip)}
                                  onDragEnd={handleDragEnd}
                                  onClick={(e) => {
                                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                      e.stopPropagation();
                                      handleTripSelect(trip.trip_id, true);
                                    } else {
                                      e.stopPropagation();
                                      onEditTrip?.(trip);
                                    }
                                  }}
                                  onContextMenu={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setContextMenu({
                                      trip,
                                      position: { x: e.clientX, y: e.clientY }
                                    });
                                  }}
                                  style={{
                                    fontSize: '10px',
                                    padding: '4px',
                                    marginBottom: '2px',
                                    background: selectedTripIds.has(trip.trip_id)
                                      ? '#dbeafe'
                                      : trip.urgent ? '#fef9c3' : '#f8f9fa',
                                    border: selectedTripIds.has(trip.trip_id)
                                      ? '2px solid #3b82f6'
                                      : '1px solid #dee2e6',
                                    borderRadius: '3px',
                                    cursor: draggedTrip?.trip_id === trip.trip_id ? 'grabbing' : 'grab',
                                    userSelect: 'none',
                                    opacity: draggedTrip?.trip_id === trip.trip_id ? 0.5 : 1,
                                    position: 'relative'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTripIds.has(trip.trip_id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const nativeEvent = e.nativeEvent as MouseEvent;
                                      handleTripSelect(trip.trip_id, nativeEvent.shiftKey || nativeEvent.ctrlKey || nativeEvent.metaKey);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      cursor: 'pointer',
                                      width: '14px',
                                      height: '14px'
                                    }}
                                  />
                                  <div style={{ fontWeight: 600, paddingRight: '20px' }}>{trip.customer_name}</div>
                                  <div style={{ color: 'var(--gray-600)' }}>
                                    {trip.pickup_time} → {trip.destination}
                                  </div>
                                </div>
                              ))}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreateTrip?.(driver.driver_id, dayIndex, 'morning');
                                }}
                                style={{
                                  fontSize: '10px',
                                  padding: '6px 8px',
                                  marginTop: '4px',
                                  background: 'rgba(0, 123, 255, 0.1)',
                                  border: '1px dashed rgba(0, 123, 255, 0.3)',
                                  borderRadius: '3px',
                                  color: '#007bff',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(0, 123, 255, 0.2)';
                                  e.currentTarget.style.borderColor = '#0056b3';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(0, 123, 255, 0.1)';
                                  e.currentTarget.style.borderColor = 'rgba(0, 123, 255, 0.3)';
                                }}
                              >
                                + Add Another
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Afternoon Period */}
                      <div
                        onClick={() => {
                          if (afternoonTrips.length === 0) {
                            onCreateTrip?.(driver.driver_id, dayIndex, 'afternoon');
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Show context menu even on empty periods
                          setContextMenu({
                            trip: null,
                            position: { x: e.clientX, y: e.clientY }
                          });
                        }}
                        style={{
                          background: colorScheme.afternoon.background,
                          border: `1px solid ${colorScheme.afternoon.border}`,
                          borderRadius: '4px',
                          minHeight: '60px',
                          cursor: afternoonTrips.length === 0 ? 'pointer' : 'default'
                        }}>
                        <div style={{
                          background: colorScheme.afternoon.headerBg,
                          color: colorScheme.afternoon.headerColor,
                          padding: '4px 8px',
                          fontSize: '10px',
                          fontWeight: 700,
                          borderTopLeftRadius: '3px',
                          borderTopRightRadius: '3px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>AFTERNOON</span>
                          <span>({afternoonTrips.length})</span>
                        </div>
                        <div
                          onDragOver={(e) => handleDragOver(e, driver.driver_id, dayIndex, 'afternoon')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, driver.driver_id, dayIndex, 'afternoon')}
                          style={{
                            padding: '6px',
                            minHeight: '60px',
                            background: dragOverSlot?.driverId === driver.driver_id &&
                                       dragOverSlot?.dayIndex === dayIndex &&
                                       dragOverSlot?.period === 'afternoon'
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'transparent',
                            border: dragOverSlot?.driverId === driver.driver_id &&
                                   dragOverSlot?.dayIndex === dayIndex &&
                                   dragOverSlot?.period === 'afternoon'
                              ? '2px dashed #3b82f6'
                              : '2px dashed transparent',
                            transition: 'all 0.2s'
                          }}
                        >
                          {afternoonTrips.length === 0 ? (
                            <div style={{
                              fontSize: '10px',
                              color: 'var(--gray-500)',
                              textAlign: 'center',
                              padding: '8px 4px'
                            }}>
                              Click to assign
                            </div>
                          ) : (
                            <>
                              {afternoonTrips.map(trip => (
                                <div
                                  key={trip.trip_id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, trip)}
                                  onDragEnd={handleDragEnd}
                                  onClick={(e) => {
                                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                      e.stopPropagation();
                                      handleTripSelect(trip.trip_id, true);
                                    } else {
                                      e.stopPropagation();
                                      onEditTrip?.(trip);
                                    }
                                  }}
                                  onContextMenu={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setContextMenu({
                                      trip,
                                      position: { x: e.clientX, y: e.clientY }
                                    });
                                  }}
                                  style={{
                                    fontSize: '10px',
                                    padding: '4px',
                                    marginBottom: '2px',
                                    background: selectedTripIds.has(trip.trip_id)
                                      ? '#dbeafe'
                                      : trip.urgent ? '#fef9c3' : '#f8f9fa',
                                    border: selectedTripIds.has(trip.trip_id)
                                      ? '2px solid #3b82f6'
                                      : '1px solid #dee2e6',
                                    borderRadius: '3px',
                                    cursor: draggedTrip?.trip_id === trip.trip_id ? 'grabbing' : 'grab',
                                    userSelect: 'none',
                                    opacity: draggedTrip?.trip_id === trip.trip_id ? 0.5 : 1,
                                    position: 'relative'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTripIds.has(trip.trip_id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const nativeEvent = e.nativeEvent as MouseEvent;
                                      handleTripSelect(trip.trip_id, nativeEvent.shiftKey || nativeEvent.ctrlKey || nativeEvent.metaKey);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      cursor: 'pointer',
                                      width: '14px',
                                      height: '14px'
                                    }}
                                  />
                                  <div style={{ fontWeight: 600, paddingRight: '20px' }}>{trip.customer_name}</div>
                                  <div style={{ color: 'var(--gray-600)' }}>
                                    {trip.pickup_time} → {trip.destination}
                                  </div>
                                </div>
                              ))}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreateTrip?.(driver.driver_id, dayIndex, 'afternoon');
                                }}
                                style={{
                                  fontSize: '10px',
                                  padding: '6px 8px',
                                  marginTop: '4px',
                                  background: 'rgba(0, 123, 255, 0.1)',
                                  border: '1px dashed rgba(0, 123, 255, 0.3)',
                                  borderRadius: '3px',
                                  color: '#007bff',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(0, 123, 255, 0.2)';
                                  e.currentTarget.style.borderColor = '#0056b3';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(0, 123, 255, 0.1)';
                                  e.currentTarget.style.borderColor = 'rgba(0, 123, 255, 0.3)';
                                }}
                              >
                                + Add Another
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Context Menu */}
      {contextMenu && (
        <TripContextMenu
          trip={contextMenu.trip}
          position={contextMenu.position}
          onStatusChange={(status) => {
            if (contextMenu.trip) {
              handleStatusChange(contextMenu.trip, status);
            }
          }}
          onEdit={() => {
            if (contextMenu.trip) {
              onEditTrip?.(contextMenu.trip);
            }
          }}
          onDelete={() => {
            if (contextMenu.trip) {
              handleDelete(contextMenu.trip);
            }
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardHelp && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'white',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxWidth: '400px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Keyboard Shortcuts</h3>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px',
                color: '#64748b'
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>N</span>
              <span style={{ color: '#64748b' }}>New trip</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>E</span>
              <span style={{ color: '#64748b' }}>Edit selected trip</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Delete</span>
              <span style={{ color: '#64748b' }}>Delete selected trips</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Ctrl+A</span>
              <span style={{ color: '#64748b' }}>Select all trips</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Ctrl+Click</span>
              <span style={{ color: '#64748b' }}>Multi-select trips</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Esc</span>
              <span style={{ color: '#64748b' }}>Clear selection</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>?</span>
              <span style={{ color: '#64748b' }}>Toggle this help</span>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default ScheduledTripsGrid;
