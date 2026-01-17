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
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 1rem' }}></div>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Loading roster...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header - Compact */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '12px' }}>
        {/* View Toggle - Pill Style */}
        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '3px', borderRadius: '6px' }}>
          <button
            onClick={() => setViewMode('day')}
            style={{
              padding: '5px 12px',
              background: viewMode === 'day' ? 'white' : 'transparent',
              color: viewMode === 'day' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: viewMode === 'day' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '5px 12px',
              background: viewMode === 'week' ? 'white' : 'transparent',
              color: viewMode === 'week' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: viewMode === 'week' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Week
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
          <button onClick={loadRosterData} style={{ padding: '4px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* Navigation & Filters - Compact */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Date Navigation */}
          <button onClick={() => navigateDate('prev')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>
            <ArrowLeftIcon size={16} />
          </button>
          <button onClick={goToToday} style={{ padding: '5px 10px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
            Today
          </button>
          <button onClick={() => navigateDate('next')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>
            <ArrowRightIcon size={16} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', padding: '0 8px', minWidth: '180px' }}>{getDateRangeDisplay()}</span>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', background: 'white', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '28px', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', minWidth: '160px' }}
            />
          </div>
          <select
            value={selectedDriver || ''}
            onChange={e => setSelectedDriver(e.target.value ? parseInt(e.target.value) : null)}
            style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', background: 'white', minWidth: '120px', cursor: 'pointer' }}
          >
            <option value="">All Drivers</option>
            {drivers.map(d => (
              <option key={d.driver_id} value={d.driver_id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats - Compact */}
      <div style={{ display: 'grid', gridTemplateColumns: showServiceType ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>{Object.keys(entriesByDriver).length}</div>
          <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 500, textTransform: 'uppercase' }}>Drivers</div>
        </div>
        <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>{filteredEntries.length}</div>
          <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 500, textTransform: 'uppercase' }}>Assignments</div>
        </div>
        {showServiceType && (
          <>
            <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#9333ea' }}>{filteredEntries.filter(e => e.service_type === 'transport').length}</div>
              <div style={{ fontSize: '10px', color: '#9333ea', fontWeight: 500, textTransform: 'uppercase' }}>Transport</div>
            </div>
            <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#ea580c' }}>{filteredEntries.filter(e => e.service_type === 'bus').length}</div>
              <div style={{ fontSize: '10px', color: '#ea580c', fontWeight: 500, textTransform: 'uppercase' }}>Bus</div>
            </div>
          </>
        )}
      </div>

      {/* Roster Content */}
      {Object.keys(entriesByDriver).length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280' }}>
          <CalendarIcon size={48} color="#9ca3af" />
          <h2 style={{ margin: '1rem 0 0.5rem', fontSize: '18px', color: '#111827' }}>No Assignments</h2>
          <p style={{ margin: 0, fontSize: '13px' }}>No driver assignments found for this {viewMode === 'week' ? 'week' : 'date'}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(entriesByDriver).map(([driverId, driverEntries]) => {
            const driver = drivers.find(d => d.driver_id === parseInt(driverId));
            const driverName = driverEntries[0]?.driver_name || driver?.name || 'Unknown Driver';

            return (
              <div key={driverId} style={{ display: 'flex', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '8px' }}>
                {/* Driver Info - Compact */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f9fafb', borderRight: '1px solid #e5e7eb', minWidth: '220px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserIcon size={18} color="#6b7280" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{driverName}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      {driverEntries.length} assignment{driverEntries.length !== 1 ? 's' : ''}
                    </div>
                    {driver?.phone && (
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{driver.phone}</div>
                    )}
                  </div>
                </div>

                {/* Assignments - Compact Cards */}
                <div style={{ flex: 1, display: 'flex', gap: '10px', padding: '12px', overflowX: 'auto', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {driverEntries.map(entry => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '10px',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderLeft: `3px solid ${entry.service_type === 'bus' ? '#ea580c' : '#9333ea'}`,
                        borderRadius: '4px',
                        minWidth: '180px',
                        maxWidth: '240px',
                        opacity: entry.status === 'completed' || entry.status === 'cancelled' ? 0.6 : 1
                      }}
                    >
                      {/* Service Badge */}
                      {showServiceType && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '2px 6px', borderRadius: '3px', width: 'fit-content', background: entry.service_type === 'bus' ? '#ffedd5' : '#f3e8ff', color: entry.service_type === 'bus' ? '#ea580c' : '#9333ea' }}>
                          {entry.service_type === 'bus' ? (
                            <><BusIcon size={10} /> Bus</>
                          ) : (
                            <><UserIcon size={10} /> TS</>
                          )}
                        </div>
                      )}

                      {/* Time */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                        <ClockIcon size={12} color="#6b7280" />
                        <span>{formatTime(entry.start_time)}</span>
                        {entry.end_time && <span style={{ color: '#9ca3af' }}>-</span>}
                        {entry.end_time && <span>{formatTime(entry.end_time)}</span>}
                      </div>

                      {/* Date (week view) */}
                      {viewMode === 'week' && (
                        <div style={{ fontSize: '10px', fontWeight: 500, color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: '3px', width: 'fit-content' }}>
                          {formatDate(entry.date)}
                        </div>
                      )}

                      {/* Title & Subtitle */}
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{entry.title}</div>
                      {entry.subtitle && (
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{entry.subtitle}</div>
                      )}

                      {/* Vehicle */}
                      {entry.details?.vehicle && (
                        <div style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                          </svg>
                          {entry.details.vehicle}
                        </div>
                      )}

                      {/* Route */}
                      {entry.details?.pickup && (
                        <div style={{ fontSize: '10px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ maxWidth: '110px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.details.pickup}</span>
                          {entry.details?.dropoff && (
                            <>
                              <span style={{ color: '#9ca3af' }}>→</span>
                              <span style={{ maxWidth: '110px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.details.dropoff}</span>
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
