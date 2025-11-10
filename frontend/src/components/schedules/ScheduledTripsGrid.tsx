import { useState } from 'react';
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
  viewType = 'regular'
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

  /**
   * Handle trip status change
   */
  const handleStatusChange = async (trip: Trip, newStatus: string) => {
    try {
      await tripApi.updateTrip(tenantId, trip.trip_id, { status: newStatus });
      // Trigger parent refresh via callback
      onRefresh?.();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update trip status');
    }
  };

  /**
   * Handle trip deletion
   */
  const handleDelete = async (trip: Trip) => {
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
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (e: React.DragEvent, trip: Trip) => {
    setDraggedTrip(trip);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', trip.trip_id.toString());
  };

  /**
   * Handle drag over (allow drop)
   */
  const handleDragOver = (e: React.DragEvent, driverId: number, dayIndex: number, period: 'morning' | 'afternoon') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ driverId, dayIndex, period });
  };

  /**
   * Handle drag leave
   */
  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  /**
   * Handle drop
   */
  const handleDrop = async (e: React.DragEvent, driverId: number, dayIndex: number, period: 'morning' | 'afternoon') => {
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
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = () => {
    setDraggedTrip(null);
    setDragOverSlot(null);
  };

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
   * Get trips for a specific driver, day, and period
   */
  const getTripsForSlot = (driverId: number, date: string, period: 'morning' | 'afternoon'): Trip[] => {
    return trips.filter(trip => {
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
  };

  /**
   * Get current day index
   */
  const getCurrentDayIndex = (): number => {
    if (!serverTime) return -1;
    const today = serverTime.formatted_date;
    return weekDays.findIndex(day => day === today);
  };

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

  const currentDayIndex = getCurrentDayIndex();

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
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                    {driver.name}
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
                      verticalAlign: 'top'
                    }}>
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
                                    e.stopPropagation();
                                    onEditTrip?.(trip);
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
                                    background: trip.urgent ? '#fef9c3' : '#f8f9fa',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '3px',
                                    cursor: draggedTrip?.trip_id === trip.trip_id ? 'grabbing' : 'grab',
                                    userSelect: 'none',
                                    opacity: draggedTrip?.trip_id === trip.trip_id ? 0.5 : 1
                                  }}
                                >
                                  <div style={{ fontWeight: 600 }}>{trip.customer_name}</div>
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
                                    e.stopPropagation();
                                    onEditTrip?.(trip);
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
                                    background: trip.urgent ? '#fef9c3' : '#f8f9fa',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '3px',
                                    cursor: draggedTrip?.trip_id === trip.trip_id ? 'grabbing' : 'grab',
                                    userSelect: 'none',
                                    opacity: draggedTrip?.trip_id === trip.trip_id ? 0.5 : 1
                                  }}
                                >
                                  <div style={{ fontWeight: 600 }}>{trip.customer_name}</div>
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
    </div>
  );
}

export default ScheduledTripsGrid;
