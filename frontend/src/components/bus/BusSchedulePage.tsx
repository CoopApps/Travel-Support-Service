import { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { busApi, RegularPassenger, BusTimetable } from '../../services/busApi';

/**
 * Bus Schedule Page - Weekly View of Regular Passengers
 *
 * Shows which customers are scheduled on which services for each day of the week.
 * This is different from Travel Support schedules - it shows recurring passenger assignments.
 */

interface ScheduleDay {
  day: string;
  dayKey: keyof Pick<RegularPassenger, 'travels_monday' | 'travels_tuesday' | 'travels_wednesday' | 'travels_thursday' | 'travels_friday' | 'travels_saturday' | 'travels_sunday'>;
  passengers: Array<RegularPassenger & { timetable?: BusTimetable }>;
}

function BusSchedulePage() {
  const { tenantId } = useTenant();
  const toast = useToast();

  const [regularPassengers, setRegularPassengers] = useState<RegularPassenger[]>([]);
  const [timetables, setTimetables] = useState<BusTimetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');

  const days: ScheduleDay[] = [
    { day: 'Monday', dayKey: 'travels_monday', passengers: [] },
    { day: 'Tuesday', dayKey: 'travels_tuesday', passengers: [] },
    { day: 'Wednesday', dayKey: 'travels_wednesday', passengers: [] },
    { day: 'Thursday', dayKey: 'travels_thursday', passengers: [] },
    { day: 'Friday', dayKey: 'travels_friday', passengers: [] },
    { day: 'Saturday', dayKey: 'travels_saturday', passengers: [] },
    { day: 'Sunday', dayKey: 'travels_sunday', passengers: [] },
  ];

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [passengersData, timetablesData] = await Promise.all([
        busApi.getRegularPassengers(tenantId, { status: 'active' }),
        busApi.getTimetables(tenantId, {}),
      ]);
      setRegularPassengers(passengersData);
      setTimetables(timetablesData);
    } catch (err: any) {
      toast.error('Failed to load schedule data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Group passengers by day of week
  const getPassengersForDay = (dayKey: string): Array<RegularPassenger & { timetable?: BusTimetable }> => {
    const filtered = regularPassengers
      .filter(p => p[dayKey as keyof RegularPassenger] === true)
      .filter(p => {
        if (selectedRoute !== 'all' && p.route_number !== selectedRoute) return false;
        if (selectedService !== 'all' && p.timetable_id !== parseInt(selectedService)) return false;
        return true;
      })
      .map(p => ({
        ...p,
        timetable: timetables.find(t => t.timetable_id === p.timetable_id)
      }));

    // Sort by departure time, then route number
    return filtered.sort((a, b) => {
      const timeA = a.departure_time || '';
      const timeB = b.departure_time || '';
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return (a.route_number || '').localeCompare(b.route_number || '');
    });
  };

  // Get unique routes for filter
  const uniqueRoutes = Array.from(new Set(regularPassengers.map(p => p.route_number).filter(Boolean)));

  // Get unique services for filter
  const uniqueServices = timetables.filter(t =>
    selectedRoute === 'all' || t.route_number === selectedRoute
  );

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading schedule...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Filters */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Weekly Passenger Schedule</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            Recurring passenger assignments by day of week
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Route Filter */}
          <select
            value={selectedRoute}
            onChange={(e) => {
              setSelectedRoute(e.target.value);
              setSelectedService('all');
            }}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px',
              minWidth: '150px'
            }}
          >
            <option value="all">All Routes</option>
            {uniqueRoutes.map(route => (
              <option key={route} value={route}>Route {route}</option>
            ))}
          </select>

          {/* Service Filter */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px',
              minWidth: '200px'
            }}
          >
            <option value="all">All Services</option>
            {uniqueServices.map(service => (
              <option key={service.timetable_id} value={service.timetable_id}>
                {service.route_number} - {service.service_name} ({service.departure_time})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '12px',
        marginBottom: '2rem'
      }}>
        {days.map(({ day, dayKey }) => {
          const dayPassengers = getPassengersForDay(dayKey);

          return (
            <div key={day} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
              background: 'white'
            }}>
              {/* Day Header */}
              <div style={{
                padding: '10px 12px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: 600,
                fontSize: '14px',
                color: '#111827'
              }}>
                {day}
                <span style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#6b7280',
                  fontWeight: 400
                }}>
                  ({dayPassengers.length})
                </span>
              </div>

              {/* Passengers List */}
              <div style={{
                padding: '8px',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                {dayPassengers.length === 0 ? (
                  <p style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '12px',
                    margin: 0
                  }}>
                    No passengers
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dayPassengers.map(passenger => (
                      <div
                        key={passenger.regular_id}
                        style={{
                          padding: '8px 10px',
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                          {passenger.first_name} {passenger.last_name}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '11px' }}>
                          Route {passenger.route_number} - {passenger.departure_time}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '11px' }}>
                          Seat: {passenger.seat_number}
                        </div>
                        {passenger.boarding_stop_name && (
                          <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                            {passenger.boarding_stop_name} → {passenger.alighting_stop_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginTop: '2rem'
      }}>
        <div style={{
          padding: '16px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {regularPassengers.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Total Regular Passengers
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {timetables.filter(t => t.status === 'active').length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Active Services
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {uniqueRoutes.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Active Routes
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {regularPassengers.filter(p => p.requires_wheelchair_space).length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Wheelchair Users
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusSchedulePage;
