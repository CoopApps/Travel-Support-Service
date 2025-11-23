import { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { busTimetablesApi } from '../../services/busApi';
import { driverApi } from '../../services/api';
import { BusIcon, ArrowLeftIcon, ArrowRightIcon, RefreshIcon } from '../icons/BusIcons';

interface DriverAssignment {
  driver_id: number;
  driver_name: string;
  timetable_id: number;
  departure_time: string;
  route_number: string;
  origin: string;
  destination: string;
  registration_number: string;
  total_seats: number;
  status: string;
  valid_from: string;
  valid_until: string | null;
  days_of_week: string[];
}

interface Driver {
  driver_id: number;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: string;
}

/**
 * Bus Driver Roster Page
 *
 * Shows which drivers are assigned to which bus routes/timetables
 * Provides daily/weekly roster view for dispatch and planning
 */
export default function BusDriverRosterPage() {
  const { tenantId } = useTenant();
  const toast = useToast();

  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadRosterData();
    }
  }, [tenantId, selectedDate]);

  const loadRosterData = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const [driversData, timetablesData] = await Promise.all([
        driverApi.getDrivers(tenantId),
        busTimetablesApi.getTimetables(tenantId, {
          startDate: selectedDate,
          endDate: selectedDate,
          includeRoutes: true,
          includeVehicles: true
        })
      ]);

      setDrivers(driversData.drivers || []);

      // Transform timetables into driver assignments
      const timetables = (timetablesData as any).timetables || timetablesData || [];
      const assignmentsData: DriverAssignment[] = timetables
        .filter(t => t.driver_id)
        .map(t => ({
          driver_id: t.driver_id,
          driver_name: t.driver_name || 'Unassigned',
          timetable_id: t.timetable_id,
          departure_time: t.departure_time,
          route_number: t.route_number || t.route_id?.toString() || 'N/A',
          origin: t.origin || '',
          destination: t.destination || '',
          registration_number: t.registration_number || 'No Vehicle',
          total_seats: t.total_seats || 0,
          status: t.status || 'active',
          valid_from: t.valid_from,
          valid_until: t.valid_until,
          days_of_week: t.days_of_week || []
        }));

      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error loading roster:', error);
      toast.error('Failed to load driver roster');
    } finally {
      setLoading(false);
    }
  };

  // Group assignments by driver
  const driverRoster = useMemo(() => {
    const roster = new Map<number, { driver: Driver; assignments: DriverAssignment[] }>();

    // Initialize with all drivers (even those without assignments)
    drivers.forEach(driver => {
      roster.set(driver.driver_id, {
        driver,
        assignments: []
      });
    });

    // Add assignments to each driver
    assignments.forEach(assignment => {
      const existing = roster.get(assignment.driver_id);
      if (existing) {
        existing.assignments.push(assignment);
      }
    });

    // Convert to array and sort by driver name
    return Array.from(roster.values()).sort((a, b) =>
      a.driver.name.localeCompare(b.driver.name)
    );
  }, [drivers, assignments]);

  // Filter roster based on search and selected driver
  const filteredRoster = useMemo(() => {
    let filtered = driverRoster;

    if (searchTerm) {
      filtered = filtered.filter(({ driver, assignments }) =>
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignments.some(a =>
          a.route_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.destination.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (selectedDriver) {
      filtered = filtered.filter(({ driver }) => driver.driver_id === selectedDriver);
    }

    return filtered;
  }, [driverRoster, searchTerm, selectedDriver]);

  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const totalAssignments = assignments.length;
  const driversWithAssignments = driverRoster.filter(({ assignments }) => assignments.length > 0).length;
  const driversAvailable = drivers.length - driversWithAssignments;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BusIcon size={28} />
          Bus Driver Roster
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280' }}>
          View and manage driver assignments for bus routes and timetables
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0.5rem' }}>Total Drivers</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937' }}>{drivers.length}</div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0.5rem' }}>Assigned</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#10b981' }}>{driversWithAssignments}</div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0.5rem' }}>Available</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>{driversAvailable}</div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0.5rem' }}>Total Services</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#3b82f6' }}>{totalAssignments}</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Date Navigation */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <button
            onClick={handlePreviousDay}
            style={{
              padding: '0.5rem 1rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeftIcon size={16} />
              Previous
            </span>
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              flex: 1,
              maxWidth: '200px'
            }}
          />

          <button
            onClick={handleToday}
            style={{
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Today
          </button>

          <button
            onClick={handleNextDay}
            style={{
              padding: '0.5rem 1rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Next
              <ArrowRightIcon size={16} />
            </span>
          </button>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search drivers, routes, locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              flex: 1
            }}
          />

          <select
            value={selectedDriver || ''}
            onChange={(e) => setSelectedDriver(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          >
            <option value="">All Drivers</option>
            {drivers.map(driver => (
              <option key={driver.driver_id} value={driver.driver_id}>
                {driver.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadRosterData}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? (
              'Refreshing...'
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshIcon size={16} />
                Refresh
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                  Driver
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                  Contact
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                  Assignments
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                  Routes
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                  Times
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                  Vehicles
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                    Loading roster...
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                    No drivers found for selected date
                  </td>
                </tr>
              ) : (
                filteredRoster.map(({ driver, assignments }) => (
                  <tr key={driver.driver_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>{driver.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.25rem' }}>
                        {driver.license_number || 'No license'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px', color: '#6b7280' }}>
                      <div>{driver.phone || 'No phone'}</div>
                      <div style={{ fontSize: '12px', marginTop: '0.25rem' }}>{driver.email || 'No email'}</div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {assignments.length === 0 ? (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          Available
                        </span>
                      ) : (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: '#d1fae5',
                          color: '#065f46',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          {assignments.length} service{assignments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {assignments.length === 0 ? (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {assignments.map(a => (
                            <div key={a.timetable_id}>
                              <span style={{ fontWeight: 600, color: '#1f2937' }}>Route {a.route_number}</span>
                              <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                {a.origin}
                                <ArrowRightIcon size={12} color="#6b7280" />
                                {a.destination}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {assignments.length === 0 ? (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {assignments.map(a => (
                            <div key={a.timetable_id} style={{ color: '#6b7280' }}>
                              {a.departure_time}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {assignments.length === 0 ? (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {assignments.map(a => (
                            <div key={a.timetable_id}>
                              <span style={{ fontWeight: 500, color: '#1f2937' }}>{a.registration_number}</span>
                              <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '0.5rem' }}>
                                ({a.total_seats} seats)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        Showing {filteredRoster.length} driver{filteredRoster.length !== 1 ? 's' : ''} with {totalAssignments} total service assignment{totalAssignments !== 1 ? 's' : ''} for {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}
