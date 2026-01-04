import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import {
  busTimetablesApi,
  busRoutesApi,
  busBookingsApi,
  busRosterApi,
  regularPassengersApi,
  BusTimetable,
  BusRoute,
  EffectivePassenger
} from '../../services/busApi';
import { WheelchairIcon, UserIcon, ClockIcon, AlertTriangleIcon } from '../icons/BusIcons';
import SeatAssignmentModal from './SeatAssignmentModal';
import PrintableManifest from './PrintableManifest';
import ServiceCancellationModal from './ServiceCancellationModal';
import './TodaysOperationsPage.css';

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

export default function TodaysOperationsPage() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<TodayService[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

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
    if (tenant?.tenant_id) {
      loadTodaysOperations();
    }
  }, [tenant?.tenant_id, selectedDate]);

  const loadTodaysOperations = async () => {
    if (!tenant?.tenant_id) return;
    setLoading(true);
    setError(null);

    try {
      const dayOfWeek = getDayOfWeek(selectedDate);

      // Fetch all required data in parallel
      const [routesData, timetablesData, rosterData] = await Promise.all([
        busRoutesApi.getRoutes(tenant.tenant_id, { status: 'active' }),
        busTimetablesApi.getTimetables(tenant.tenant_id, { status: 'active' }),
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
        } catch {
          // Error handled silently
        }

        // Find roster entry for this service
        const rosterEntry = rosterData.find((r: any) =>
          r.timetable_id === timetable.timetable_id &&
          r.roster_date === selectedDate
        );

        // Determine service status based on time
        const now = new Date();
        const serviceTime = new Date(`${selectedDate}T${timetable.departure_time}`);
        const endTime = new Date(serviceTime.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hour service

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
        // No driver assigned
        if (!service.rosterEntry && service.status !== 'completed') {
          newAlerts.push({
            type: 'error',
            message: `No driver assigned for ${service.timetable.route_number} ${service.timetable.departure_time}`,
            serviceId: service.timetable.timetable_id
          });
        }

        // Low passenger count
        if (service.passengers.length < 3 && service.status !== 'completed') {
          newAlerts.push({
            type: 'warning',
            message: `Low bookings (${service.passengers.length}) for ${service.timetable.route_number} ${service.timetable.departure_time}`,
            serviceId: service.timetable.timetable_id
          });
        }

        // Wheelchair spaces check
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
    } catch (err: any) {
      setError(err.message || 'Failed to load today\'s operations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSeatAssignment = (service: TodayService) => {
    setSeatAssignmentService({
      timetable: service.timetable,
      serviceDate: selectedDate
    });
  };

  const handleCloseSeatAssignment = () => {
    setSeatAssignmentService(null);
    loadTodaysOperations(); // Refresh after changes
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

  const handleServiceCancelled = () => {
    setCancellationService(null);
    loadTodaysOperations(); // Refresh the list
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Summary stats
  const totalServices = services.length;
  const totalPassengers = services.reduce((sum, s) => sum + s.passengers.length, 0);
  const servicesWithDrivers = services.filter(s => s.rosterEntry).length;
  const wheelchairPassengers = services.reduce(
    (sum, s) => sum + s.passengers.filter(p => p.requires_wheelchair_space).length,
    0
  );

  if (loading) {
    return (
      <div className="todays-operations-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="todays-operations-page">
      <div className="page-header">
        <div className="header-content">
          <h1>{isToday ? "Today's Operations" : 'Operations Overview'}</h1>
          <p className="page-subtitle">
            {new Date(selectedDate).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
        <div className="header-actions">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="date-picker"
          />
          <button className="btn-secondary" onClick={loadTodaysOperations}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={loadTodaysOperations}>Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon services">
            <ClockIcon size={24} />
          </div>
          <div className="card-content">
            <div className="card-value">{totalServices}</div>
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
            <div className="card-value">{servicesWithDrivers}/{totalServices}</div>
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
        <div className="empty-state">
          <ClockIcon size={48} color="#9ca3af" />
          <h2>No Services Scheduled</h2>
          <p>There are no bus services scheduled for this date.</p>
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
                      {service.route.origin_stop} → {service.route.destination_stop}
                    </span>
                  )}
                </div>

                <div className="service-details">
                  <div className="detail-group">
                    <div className="detail-label">Driver</div>
                    <div className={`detail-value ${!service.rosterEntry ? 'unassigned' : ''}`}>
                      {service.rosterEntry
                        ? `${service.rosterEntry.driver_first_name} ${service.rosterEntry.driver_last_name}`
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
                      {service.passengers.slice(0, 5).map((p, idx) => (
                        <div
                          key={p.customer_id}
                          className={`preview-avatar ${p.requires_wheelchair_space ? 'wheelchair' : ''} ${p.is_regular ? 'regular' : ''}`}
                          title={`${p.first_name} ${p.last_name}`}
                          style={{ zIndex: 5 - idx }}
                        >
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                      ))}
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
          onCancelled={handleServiceCancelled}
        />
      )}
    </div>
  );
}
