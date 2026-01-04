import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useServiceContext } from '../../contexts/ServiceContext';
import { tripApi, driverApi } from '../../services/api';
import { busTimetablesApi, busRosterApi } from '../../services/busApi';
import { CalendarIcon, UserIcon, ClockIcon, BusIcon, ArrowLeftIcon, ArrowRightIcon } from '../icons/BusIcons';
import './UnifiedRosterPage.css';

interface Driver {
  driver_id: number;
  name: string;
  phone?: string;
  is_active: boolean;
}

interface RosterEntry {
  id: string;
  driver_id: number;
  driver_name: string;
  date: string;
  start_time: string;
  end_time?: string;
  service_type: 'transport' | 'bus';
  title: string;
  subtitle?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  details?: {
    customer_name?: string;
    route_number?: string;
    vehicle?: string;
    pickup?: string;
    dropoff?: string;
    passenger_count?: number;
  };
}

export default function UnifiedRosterPage() {
  const { tenant } = useTenant();
  const { transportEnabled, busEnabled } = useServiceContext();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View controls
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Determine if we need to show service type badges (only when both are active)
  const showServiceType = transportEnabled && busEnabled;

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadRosterData();
    }
  }, [tenant?.tenant_id, selectedDate, viewMode]);

  const getWeekDates = (dateStr: string): string[] => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(date.setDate(diff));

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const loadRosterData = async () => {
    if (!tenant?.tenant_id) return;
    setLoading(true);
    setError(null);

    try {
      const allEntries: RosterEntry[] = [];

      // Determine date range based on view mode
      const dates = viewMode === 'week' ? getWeekDates(selectedDate) : [selectedDate];
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      // Load drivers first
      const driversData = await driverApi.getDrivers(tenant.tenant_id);
      setDrivers(driversData.drivers || driversData || []);

      // Load Travel Support trips if enabled
      if (transportEnabled) {
        try {
          const tripsData = await tripApi.getTrips(tenant.tenant_id, {
            start_date: startDate,
            end_date: endDate
          });

          const trips = tripsData.trips || tripsData || [];
          trips.forEach((trip: any) => {
            if (trip.driver_id) {
              allEntries.push({
                id: `ts-${trip.trip_id || trip.id}`,
                driver_id: trip.driver_id,
                driver_name: trip.driver_name || 'Unknown Driver',
                date: trip.trip_date || trip.date,
                start_time: trip.pickup_time || trip.start_time || '00:00',
                end_time: trip.dropoff_time || trip.end_time,
                service_type: 'transport',
                title: trip.customer_name || 'Customer Trip',
                subtitle: trip.purpose || trip.trip_type,
                status: trip.status || 'scheduled',
                details: {
                  customer_name: trip.customer_name,
                  vehicle: trip.vehicle_registration,
                  pickup: trip.pickup_address || trip.pickup_location,
                  dropoff: trip.dropoff_address || trip.dropoff_location
                }
              });
            }
          });
        } catch {
          // Error handled silently
        }
      }

      // Load Bus service assignments if enabled
      if (busEnabled) {
        try {
          // Get roster entries for the date range
          const rosterData = await busRosterApi.getRoster(tenant.tenant_id, {
            start_date: startDate,
            end_date: endDate
          });

          const rosterEntries = rosterData || [];
          rosterEntries.forEach((entry: any) => {
            allEntries.push({
              id: `bus-${entry.roster_id || entry.timetable_id}-${entry.roster_date}`,
              driver_id: entry.driver_id,
              driver_name: entry.driver_first_name
                ? `${entry.driver_first_name} ${entry.driver_last_name}`
                : entry.driver_name || 'Unknown Driver',
              date: entry.roster_date || entry.date,
              start_time: entry.departure_time || entry.start_time,
              end_time: entry.arrival_time || entry.end_time,
              service_type: 'bus',
              title: `Route ${entry.route_number || 'N/A'}`,
              subtitle: entry.service_name,
              status: entry.status || 'scheduled',
              details: {
                route_number: entry.route_number,
                vehicle: entry.vehicle_registration,
                passenger_count: entry.passenger_count
              }
            });
          });
        } catch {
          // Error handled silently
        }
      }

      // Sort by date and time
      allEntries.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });

      setEntries(allEntries);
    } catch (err: any) {
      setError(err.message || 'Failed to load roster data');
    } finally {
      setLoading(false);
    }
  };

  // Filter entries based on search and selected driver
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (selectedDriver && entry.driver_id !== selectedDriver) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          entry.driver_name.toLowerCase().includes(search) ||
          entry.title.toLowerCase().includes(search) ||
          entry.subtitle?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [entries, selectedDriver, searchTerm]);

  // Group entries by driver for the roster view
  const entriesByDriver = useMemo(() => {
    const grouped: Record<number, RosterEntry[]> = {};
    filteredEntries.forEach(entry => {
      if (!grouped[entry.driver_id]) {
        grouped[entry.driver_id] = [];
      }
      grouped[entry.driver_id].push(entry);
    });
    return grouped;
  }, [filteredEntries]);

  // Navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    const days = viewMode === 'week' ? 7 : 1;
    current.setDate(current.getDate() + (direction === 'next' ? days : -days));
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getDateRangeDisplay = () => {
    if (viewMode === 'day') {
      return new Date(selectedDate).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    const dates = getWeekDates(selectedDate);
    const start = new Date(dates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const end = new Date(dates[6]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  };

  // Service type label (only show if both services active)
  const getServiceLabel = () => {
    if (transportEnabled && busEnabled) return 'All Services';
    if (transportEnabled) return 'Travel Support';
    if (busEnabled) return 'Bus Services';
    return 'No Services Active';
  };

  if (loading) {
    return (
      <div className="unified-roster-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading roster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-roster-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Driver Roster</h1>
          <p className="page-subtitle">{getServiceLabel()}</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={viewMode === 'day' ? 'active' : ''}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button
              className={viewMode === 'week' ? 'active' : ''}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={loadRosterData}>Retry</button>
        </div>
      )}

      {/* Navigation Bar */}
      <div className="roster-nav">
        <div className="date-nav">
          <button className="nav-btn" onClick={() => navigateDate('prev')}>
            <ArrowLeftIcon size={18} />
          </button>
          <button className="today-btn" onClick={goToToday}>Today</button>
          <button className="nav-btn" onClick={() => navigateDate('next')}>
            <ArrowRightIcon size={18} />
          </button>
          <span className="date-display">{getDateRangeDisplay()}</span>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="date-picker"
          />
        </div>

        <div className="roster-filters">
          <input
            type="text"
            placeholder="Search drivers or assignments..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedDriver || ''}
            onChange={e => setSelectedDriver(e.target.value ? parseInt(e.target.value) : null)}
            className="driver-filter"
          >
            <option value="">All Drivers</option>
            {drivers.map(d => (
              <option key={d.driver_id} value={d.driver_id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="roster-summary">
        <div className="stat">
          <UserIcon size={16} />
          <span>{Object.keys(entriesByDriver).length} drivers assigned</span>
        </div>
        <div className="stat">
          <CalendarIcon size={16} />
          <span>{filteredEntries.length} total assignments</span>
        </div>
        {showServiceType && (
          <>
            <div className="stat transport">
              <span className="service-dot"></span>
              <span>{filteredEntries.filter(e => e.service_type === 'transport').length} Travel Support</span>
            </div>
            <div className="stat bus">
              <span className="service-dot"></span>
              <span>{filteredEntries.filter(e => e.service_type === 'bus').length} Bus Services</span>
            </div>
          </>
        )}
      </div>

      {/* Roster Content */}
      {Object.keys(entriesByDriver).length === 0 ? (
        <div className="empty-state">
          <CalendarIcon size={48} color="#9ca3af" />
          <h2>No Assignments</h2>
          <p>No driver assignments found for this {viewMode === 'week' ? 'week' : 'date'}.</p>
        </div>
      ) : (
        <div className="roster-grid">
          {Object.entries(entriesByDriver).map(([driverId, driverEntries]) => {
            const driver = drivers.find(d => d.driver_id === parseInt(driverId));
            const driverName = driverEntries[0]?.driver_name || driver?.name || 'Unknown Driver';

            return (
              <div key={driverId} className="driver-row">
                <div className="driver-info">
                  <div className="driver-avatar">
                    <UserIcon size={20} color="#6b7280" />
                  </div>
                  <div className="driver-details">
                    <div className="driver-name">{driverName}</div>
                    <div className="driver-meta">
                      {driverEntries.length} assignment{driverEntries.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="driver-assignments">
                  {driverEntries.map(entry => (
                    <div
                      key={entry.id}
                      className={`assignment-card ${entry.service_type} ${entry.status}`}
                    >
                      {showServiceType && (
                        <div className={`service-badge ${entry.service_type}`}>
                          {entry.service_type === 'bus' ? (
                            <><BusIcon size={12} /> Bus</>
                          ) : (
                            <><UserIcon size={12} /> TS</>
                          )}
                        </div>
                      )}

                      <div className="assignment-time">
                        <ClockIcon size={14} />
                        <span>{formatTime(entry.start_time)}</span>
                        {entry.end_time && <span className="time-separator">-</span>}
                        {entry.end_time && <span>{formatTime(entry.end_time)}</span>}
                      </div>

                      {viewMode === 'week' && (
                        <div className="assignment-date">{formatDate(entry.date)}</div>
                      )}

                      <div className="assignment-title">{entry.title}</div>
                      {entry.subtitle && (
                        <div className="assignment-subtitle">{entry.subtitle}</div>
                      )}

                      {entry.details?.vehicle && (
                        <div className="assignment-vehicle">{entry.details.vehicle}</div>
                      )}

                      {entry.details?.pickup && (
                        <div className="assignment-route">
                          <span className="from">{entry.details.pickup}</span>
                          {entry.details?.dropoff && (
                            <>
                              <span className="arrow">→</span>
                              <span className="to">{entry.details.dropoff}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned Drivers Section */}
      {drivers.filter(d => d.is_active && !entriesByDriver[d.driver_id]).length > 0 && (
        <div className="unassigned-section">
          <h3>Available Drivers</h3>
          <div className="unassigned-drivers">
            {drivers
              .filter(d => d.is_active && !entriesByDriver[d.driver_id])
              .map(driver => (
                <div key={driver.driver_id} className="unassigned-driver">
                  <UserIcon size={16} />
                  <span>{driver.name}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
