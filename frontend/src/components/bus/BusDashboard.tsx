import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  busRoutesApi,
  busTimetablesApi,
  busBookingsApi,
  busRosterApi,
  regularPassengersApi,
  BusTimetable,
  BusRoute,
  EffectivePassenger
} from '../../services/busApi';
import { useTenant } from '../../context/TenantContext';
import { MapIcon, AlarmClockIcon, MemoIcon, BusIcon, UserIcon, ClipboardIcon, CalendarIcon, TicketIcon, SeatIcon, ArrowRightIcon, WheelchairIcon, ClockIcon, AlertTriangleIcon } from '../icons/BusIcons';
import SeatAssignmentModal from './SeatAssignmentModal';
import PrintableManifest from './PrintableManifest';
import ServiceCancellationModal from './ServiceCancellationModal';
import './BusDashboard.css';
import './TodaysOperationsPage.css';

interface DashboardStats {
  activeRoutes: number;
  todaysServices: number;
  todaysBookings: number;
  availableSeats: number;
  confirmedBookings: number;
  pendingBookings: number;
}

interface TodayService {
  timetable: BusTimetable;
  route: BusRoute | undefined;
  passengers: EffectivePassenger[];
  rosterEntry: any | null;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

interface ServiceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  serviceId?: number;
}

export default function BusDashboard() {
  const { tenant } = useTenant();
  const [stats, setStats] = useState<DashboardStats>({
    activeRoutes: 0,
    todaysServices: 0,
    todaysBookings: 0,
    availableSeats: 0,
    confirmedBookings: 0,
    pendingBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Today's Operations state
  const [services, setServices] = useState<TodayService[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal state
  const [seatAssignmentService, setSeatAssignmentService] = useState<{
    timetable: BusTimetable;
    serviceDate: string;
  } | null>(null);
  const [manifestService, setManifestService] = useState<{
    timetableId: number;
    serviceDate: string;
  } | null>(null);
  const [cancellationService, setCancellationService] = useState<{
    timetable: BusTimetable;
    serviceDate: string;
    passengerCount: number;
  } | null>(null);

  // Get day of week for roster
  const getDayOfWeek = (dateStr: string): string => {
    const date = new Date(dateStr);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  useEffect(() => {
    if (!tenant?.tenant_id) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const dayOfWeek = getDayOfWeek(selectedDate);

        // Fetch data in parallel
        const [routesData, timetablesData, bookings, rosterData] = await Promise.all([
          busRoutesApi.getRoutes(tenant.tenant_id, { status: 'active' }),
          busTimetablesApi.getTimetables(tenant.tenant_id, { status: 'active' }),
          busBookingsApi.getTodaysBookings(tenant.tenant_id),
          busRosterApi.getRoster(tenant.tenant_id, {
            start_date: selectedDate,
            end_date: selectedDate
          })
        ]);

        setRoutes(routesData);

        // Filter timetables that run on the selected day
        const todaysTimetables = timetablesData.filter((t: BusTimetable) => {
          const dayKey = `operates_${dayOfWeek}` as keyof BusTimetable;
          return t[dayKey] === true;
        });

        // Load passengers and build service data for each timetable
        const servicePromises = todaysTimetables.map(async (timetable: BusTimetable) => {
          let passengers: EffectivePassenger[] = [];
          try {
            passengers = await regularPassengersApi.getEffectivePassengers(
              tenant.tenant_id,
              timetable.timetable_id,
              selectedDate
            );
          } catch (err) {
            console.error(`Failed to load passengers for timetable ${timetable.timetable_id}:`, err);
          }

          // Find roster entry for this service
          const rosterEntry = rosterData.find((r: any) =>
            r.timetable_id === timetable.timetable_id &&
            r.roster_date === selectedDate
          );

          // Determine service status based on time
          const now = new Date();
          const serviceTime = new Date(`${selectedDate}T${timetable.departure_time}`);
          const endTime = new Date(serviceTime.getTime() + 2 * 60 * 60 * 1000);

          let status: TodayService['status'] = 'scheduled';
          if (now > endTime) {
            status = 'completed';
          } else if (now >= serviceTime && now <= endTime) {
            status = 'in-progress';
          }

          return {
            timetable,
            route: routesData.find((r: BusRoute) => r.route_id === timetable.route_id),
            passengers,
            rosterEntry,
            status
          };
        });

        const servicesData = await Promise.all(servicePromises);

        // Sort by departure time
        servicesData.sort((a, b) =>
          a.timetable.departure_time.localeCompare(b.timetable.departure_time)
        );

        setServices(servicesData);

        // Generate alerts
        const newAlerts: ServiceAlert[] = [];
        servicesData.forEach((service) => {
          if (!service.rosterEntry && service.status !== 'completed') {
            newAlerts.push({
              type: 'error',
              message: `No driver assigned for ${service.timetable.route_number} ${service.timetable.departure_time}`,
              serviceId: service.timetable.timetable_id
            });
          }
          if (service.passengers.length < 3 && service.status !== 'completed') {
            newAlerts.push({
              type: 'warning',
              message: `Low bookings (${service.passengers.length}) for ${service.timetable.route_number} ${service.timetable.departure_time}`,
              serviceId: service.timetable.timetable_id
            });
          }
          const wheelchairCount = service.passengers.filter(p => p.requires_wheelchair_space).length;
          if (wheelchairCount > 2) {
            newAlerts.push({
              type: 'warning',
              message: `${wheelchairCount} wheelchair passengers on ${service.timetable.route_number} - check vehicle capacity`,
              serviceId: service.timetable.timetable_id
            });
          }
        });
        setAlerts(newAlerts);

        // Calculate stats
        const confirmedBookings = bookings.filter(b => b.booking_status === 'confirmed').length;
        const pendingBookings = bookings.filter(b => b.booking_status === 'pending').length;
        const availableSeats = servicesData.reduce((sum, s: any) => sum + (s.timetable?.capacity || 16), 0) -
          servicesData.reduce((sum, s) => sum + s.passengers.length, 0);

        setStats({
          activeRoutes: routesData.length,
          todaysServices: servicesData.length,
          todaysBookings: bookings.length,
          availableSeats: Math.max(0, availableSeats),
          confirmedBookings,
          pendingBookings
        });
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [tenant?.tenant_id, selectedDate]);

  // Modal handlers
  const handleOpenSeatAssignment = (service: TodayService) => {
    setSeatAssignmentService({
      timetable: service.timetable,
      serviceDate: selectedDate
    });
  };

  const handleCloseSeatAssignment = () => {
    setSeatAssignmentService(null);
  };

  const handleOpenManifest = (service: TodayService) => {
    setManifestService({
      timetableId: service.timetable.timetable_id,
      serviceDate: selectedDate
    });
  };

  const handleCloseManifest = () => {
    setManifestService(null);
  };

  const handleOpenCancellation = (service: TodayService) => {
    setCancellationService({
      timetable: service.timetable,
      serviceDate: selectedDate,
      passengerCount: service.passengers.length
    });
  };

  const handleCloseCancellation = () => {
    setCancellationService(null);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Summary stats for today's operations
  const totalPassengers = services.reduce((sum, s) => sum + s.passengers.length, 0);
  const servicesWithDrivers = services.filter(s => s.rosterEntry).length;
  const wheelchairPassengers = services.reduce(
    (sum, s) => sum + s.passengers.filter(p => p.requires_wheelchair_space).length,
    0
  );

  if (loading) {
    return (
      <div className="bus-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bus-dashboard">
        <div className="error-state">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bus-dashboard">
      <div className="dashboard-header">
        <h1>Community Bus Dashboard</h1>
        <p className="dashboard-subtitle">
          Manage your Section 22 local bus services
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card routes">
          <div className="stat-icon">
            <BusIcon size={32} color="#3b82f6" />
          </div>
          <div className="stat-details">
            <div className="stat-value">{stats.activeRoutes}</div>
            <div className="stat-label">Active Routes</div>
          </div>
          <Link to="/bus/routes" className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            View Routes
            <ArrowRightIcon size={16} />
          </Link>
        </div>

        <div className="stat-card services">
          <div className="stat-icon">
            <CalendarIcon size={32} color="#10b981" />
          </div>
          <div className="stat-details">
            <div className="stat-value">{stats.todaysServices}</div>
            <div className="stat-label">Today's Services</div>
          </div>
          <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            View Schedule
            <ArrowRightIcon size={16} />
          </div>
        </div>

        <div className="stat-card bookings">
          <div className="stat-icon">
            <TicketIcon size={32} color="#f59e0b" />
          </div>
          <div className="stat-details">
            <div className="stat-value">{stats.todaysBookings}</div>
            <div className="stat-label">Today's Bookings</div>
          </div>
          <div className="stat-meta">
            <span className="meta-item confirmed">{stats.confirmedBookings} confirmed</span>
            <span className="meta-item pending">{stats.pendingBookings} pending</span>
          </div>
        </div>

        <div className="stat-card seats">
          <div className="stat-icon">
            <SeatIcon size={32} color="#8b5cf6" />
          </div>
          <div className="stat-details">
            <div className="stat-value">{stats.availableSeats}</div>
            <div className="stat-label">Available Seats</div>
          </div>
          <div className="stat-action" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            View Availability
            <ArrowRightIcon size={16} />
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <Link to="/bus/routes" className="action-button">
            <span className="action-icon"><MapIcon size={24} /></span>
            <span className="action-title">Manage Routes</span>
            <span className="action-description">Create and edit bus routes</span>
          </Link>

          <button className="action-button">
            <span className="action-icon"><AlarmClockIcon size={24} /></span>
            <span className="action-title">Create Timetable</span>
            <span className="action-description">Schedule new services</span>
          </button>

          <button className="action-button">
            <span className="action-icon"><MemoIcon size={24} /></span>
            <span className="action-title">New Booking</span>
            <span className="action-description">Create passenger booking</span>
          </button>

          <Link to="/vehicles" className="action-button">
            <span className="action-icon"><BusIcon size={24} /></span>
            <span className="action-title">Manage Vehicles</span>
            <span className="action-description">View and assign vehicles</span>
          </Link>

          <Link to="/drivers" className="action-button">
            <span className="action-icon"><UserIcon size={24} /></span>
            <span className="action-title">Manage Drivers</span>
            <span className="action-description">View and assign drivers</span>
          </Link>

          <Link to="/compliance/service-registrations" className="action-button">
            <span className="action-icon"><ClipboardIcon size={24} /></span>
            <span className="action-title">Service Registrations</span>
            <span className="action-description">Traffic Commissioner compliance</span>
          </Link>
        </div>
      </div>

      {/* Today's Operations Section */}
      <div className="todays-operations-section" style={{ marginTop: '2rem' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Today's Operations</h2>
          <span className="date-display" style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
            {new Date(selectedDate).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </span>
        </div>

        {/* Operations Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon services">
              <ClockIcon size={24} />
            </div>
            <div className="card-content">
              <div className="card-value">{services.length}</div>
              <div className="card-label">Scheduled Services</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon passengers">
              <UserIcon size={24} />
            </div>
            <div className="card-content">
              <div className="card-value">{totalPassengers}</div>
              <div className="card-label">Total Passengers</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon drivers">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="card-content">
              <div className="card-value">{servicesWithDrivers}/{services.length}</div>
              <div className="card-label">Drivers Assigned</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon wheelchair">
              <WheelchairIcon size={24} />
            </div>
            <div className="card-content">
              <div className="card-value">{wheelchairPassengers}</div>
              <div className="card-label">Wheelchair Passengers</div>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="alerts-section">
            <h3>
              <AlertTriangleIcon size={20} />
              Alerts ({alerts.length})
            </h3>
            <div className="alerts-list">
              {alerts.map((alert, idx) => (
                <div key={idx} className={`alert-item ${alert.type}`}>
                  <span className="alert-icon">
                    {alert.type === 'error' ? '!' : alert.type === 'warning' ? '!' : 'i'}
                  </span>
                  <span className="alert-message">{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services List */}
        {services.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
            <ClockIcon size={48} color="#9ca3af" />
            <h3>No Services Scheduled</h3>
            <p>There are no bus services scheduled for today.</p>
          </div>
        ) : (
          <div className="services-list">
            {services.map((service) => (
              <div
                key={service.timetable.timetable_id}
                className={`service-card ${service.status}`}
              >
                <div className="service-time-badge">
                  <span className="time">{formatTime(service.timetable.departure_time)}</span>
                  <span className={`status-indicator ${service.status}`}>
                    {service.status === 'in-progress' ? 'In Progress' :
                     service.status === 'completed' ? 'Completed' :
                     service.status === 'cancelled' ? 'Cancelled' : 'Scheduled'}
                  </span>
                </div>

                <div className="service-main">
                  <div className="service-header">
                    <span className="route-badge">{service.timetable.route_number}</span>
                    <span className="service-name">{service.timetable.service_name}</span>
                    {service.route && (
                      <span className="route-terminus">
                        {service.route.origin_point} → {service.route.destination_point}
                      </span>
                    )}
                  </div>

                  <div className="service-details">
                    <div className="detail-group">
                      <div className="detail-label">Driver</div>
                      <div className={`detail-value ${!service.rosterEntry ? 'unassigned' : ''}`}>
                        {service.rosterEntry
                          ? `${service.rosterEntry.driver_first_name || ''} ${service.rosterEntry.driver_last_name || service.rosterEntry.driver_name || 'Assigned'}`
                          : 'Not assigned'}
                      </div>
                    </div>

                    <div className="detail-group">
                      <div className="detail-label">Vehicle</div>
                      <div className="detail-value">
                        {service.rosterEntry?.vehicle_registration || 'Not assigned'}
                      </div>
                    </div>

                    <div className="detail-group">
                      <div className="detail-label">Passengers</div>
                      <div className="detail-value passengers">
                        <UserIcon size={14} />
                        <span>{service.passengers.filter(p => !p.requires_wheelchair_space).length}</span>
                        {service.passengers.some(p => p.requires_wheelchair_space) && (
                          <>
                            <WheelchairIcon size={14} />
                            <span>{service.passengers.filter(p => p.requires_wheelchair_space).length}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Passenger Preview */}
                  {service.passengers.length > 0 && (
                    <div className="passenger-preview">
                      <div className="preview-avatars">
                        {service.passengers.slice(0, 5).map((p, idx) => {
                          const nameParts = p.customer_name.split(' ');
                          const initials = nameParts.length > 1
                            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                            : p.customer_name.substring(0, 2);
                          return (
                            <div
                              key={p.customer_id}
                              className={`preview-avatar ${p.requires_wheelchair_space ? 'wheelchair' : ''} ${p.is_regular ? 'regular' : ''}`}
                              title={p.customer_name}
                              style={{ zIndex: 5 - idx }}
                            >
                              {initials.toUpperCase()}
                            </div>
                          );
                        })}
                        {service.passengers.length > 5 && (
                          <div className="preview-avatar more">
                            +{service.passengers.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="service-actions">
                  <button
                    className="btn-action"
                    onClick={() => handleOpenSeatAssignment(service)}
                    title="Manage Seats"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Seats
                  </button>
                  <button
                    className="btn-action"
                    onClick={() => handleOpenManifest(service)}
                    title="Print Manifest"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print
                  </button>
                  {service.status === 'scheduled' && (
                    <button
                      className="btn-action btn-cancel"
                      onClick={() => handleOpenCancellation(service)}
                      title="Cancel Service"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats.activeRoutes === 0 && (
        <div className="welcome-message">
          <h2>Welcome to Community Bus Services!</h2>
          <p>
            Get started by creating your first bus route. Routes define the stops and journey
            pattern for your Section 22 local bus services.
          </p>
          <Link to="/bus/routes" className="btn-primary">
            Create Your First Route
          </Link>
        </div>
      )}

      {/* Seat Assignment Modal */}
      {seatAssignmentService && (
        <SeatAssignmentModal
          isOpen={true}
          timetable={seatAssignmentService.timetable}
          serviceDate={seatAssignmentService.serviceDate}
          onClose={handleCloseSeatAssignment}
        />
      )}

      {/* Printable Manifest */}
      {manifestService && (
        <PrintableManifest
          timetableId={manifestService.timetableId}
          serviceDate={manifestService.serviceDate}
          onClose={handleCloseManifest}
        />
      )}

      {/* Service Cancellation Modal */}
      {cancellationService && (
        <ServiceCancellationModal
          timetable={cancellationService.timetable}
          serviceDate={cancellationService.serviceDate}
          passengerCount={cancellationService.passengerCount}
          onClose={handleCloseCancellation}
          onCancelled={handleCloseCancellation}
        />
      )}
    </div>
  );
}
