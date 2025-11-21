import React, { useEffect, useState } from 'react';
import { busTimetablesApi, busRoutesApi, BusTimetable, BusRoute } from '../../services/busApi';
import { useTenant } from '../../context/TenantContext';
import { AlarmClockIcon, ArrowRightIcon, ArrowLeftIcon, RefreshIcon, WheelchairIcon, SeatIcon, UserIcon, BusIcon, CalendarIcon } from '../icons/BusIcons';
import TimetableFormModal from './TimetableFormModal';
import './BusTimetablesPage.css';

export default function BusTimetablesPage() {
  const { tenant } = useTenant();
  const [timetables, setTimetables] = useState<BusTimetable[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<BusTimetable | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  const fetchData = async () => {
    if (!tenant?.tenant_id) return;
    try {
      setLoading(true);
      setError(null);
      const [routesData, allData] = await Promise.all([
        busRoutesApi.getRoutes(tenant.tenant_id, {}),
        busTimetablesApi.getTimetables(tenant.tenant_id, {})
      ]);
      setRoutes(routesData);
      setTimetables(allData);
    } catch (err: any) {
      console.error('Failed to load timetables:', err);
      setError(err.message || 'Failed to load timetables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenant?.tenant_id]);

  const handleCreateTimetable = () => {
    setEditingTimetable(null);
    setShowModal(true);
  };

  const handleEditTimetable = (timetable: BusTimetable) => {
    setEditingTimetable(timetable);
    setShowModal(true);
  };

  const handleDeleteTimetable = async (timetable: BusTimetable) => {
    if (!tenant?.tenant_id) return;
    if (!confirm(`Are you sure you want to delete "${timetable.service_name}"?`)) return;
    try {
      await busTimetablesApi.deleteTimetable(tenant.tenant_id, timetable.timetable_id);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete timetable:', err);
      alert(err.response?.data?.error || 'Failed to delete timetable');
    }
  };

  const handleModalSuccess = () => { fetchData(); };
  const handleCloseModal = () => { setShowModal(false); setEditingTimetable(null); };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatWeekRange = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${currentWeekStart.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getServicesForDay = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    return timetables.filter(t => {
      // Filter by route if selected
      if (selectedRoute !== 'all' && t.route_id !== parseInt(selectedRoute)) return false;

      // Check if service is valid on this date
      const validFrom = new Date(t.valid_from);
      const validUntil = t.valid_until ? new Date(t.valid_until) : null;

      if (date < validFrom) return false;
      if (validUntil && date > validUntil) return false;

      // Check operating days (from route data)
      // For now, show all valid services - operating days would come from route
      return t.status === 'active' || t.status === 'scheduled';
    }).sort((a, b) => {
      // Sort by departure time
      return a.departure_time.localeCompare(b.departure_time);
    });
  };

  const getTimeSlots = () => {
    // Generate time slots from 5 AM to 11 PM
    const slots = [];
    for (let hour = 5; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const getServicesInTimeSlot = (date: Date, timeSlot: string) => {
    const services = getServicesForDay(date);
    const slotHour = parseInt(timeSlot.split(':')[0]);

    return services.filter(s => {
      const serviceHour = parseInt(s.departure_time.split(':')[0]);
      return serviceHour === slotHour;
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'outbound': return <ArrowRightIcon size={14} />;
      case 'inbound': return <ArrowLeftIcon size={14} />;
      case 'circular': return <RefreshIcon size={14} />;
      default: return <ArrowRightIcon size={14} />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'scheduled': return 'status-scheduled';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const filteredTimetables = selectedRoute === 'all'
    ? timetables
    : timetables.filter(t => t.route_id === parseInt(selectedRoute));

  if (loading) return (
    <div className="bus-timetables-page">
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading timetables...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="bus-timetables-page">
      <div className="error-state">
        <h2>Error Loading Timetables</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={fetchData}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="bus-timetables-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Service Timetables</h1>
          <p className="page-subtitle">Manage scheduled bus services</p>
        </div>
        <button className="btn-primary" onClick={handleCreateTimetable} disabled={routes.length === 0}>
          <span>+</span> Create New Service
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><CalendarIcon size={48} color="#9ca3af" /></div>
          <h2>No Routes Available</h2>
          <p>You need to create at least one route before you can create timetables.</p>
          <a href="/bus/routes" className="btn-primary">Go to Routes</a>
        </div>
      ) : (
        <>
          <div className="page-controls">
            <div className="view-toggle">
              <button
                className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
              >
                <CalendarIcon size={16} /> Calendar
              </button>
              <button
                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <AlarmClockIcon size={16} /> List
              </button>
            </div>

            <div className="filter-group">
              <select
                className="route-filter"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
              >
                <option value="all">All Routes</option>
                {routes.map(route => (
                  <option key={route.route_id} value={route.route_id}>
                    Route {route.route_number} - {route.route_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {viewMode === 'calendar' && (
            <div className="calendar-view">
              <div className="calendar-navigation">
                <button className="nav-btn" onClick={() => navigateWeek('prev')}>
                  <ArrowLeftIcon size={20} /> Previous
                </button>
                <div className="week-display">
                  <h2>{formatWeekRange()}</h2>
                  <button className="today-btn" onClick={goToToday}>Today</button>
                </div>
                <button className="nav-btn" onClick={() => navigateWeek('next')}>
                  Next <ArrowRightIcon size={20} />
                </button>
              </div>

              <div className="calendar-grid">
                <div className="calendar-header">
                  <div className="time-column-header">Time</div>
                  {getWeekDays().map((date, index) => (
                    <div
                      key={index}
                      className={`day-header ${isToday(date) ? 'today' : ''}`}
                    >
                      <span className="day-name">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="day-date">
                        {date.toLocaleDateString('en-US', { day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="calendar-body">
                  {getTimeSlots().map(timeSlot => (
                    <div key={timeSlot} className="time-row">
                      <div className="time-label">{formatTime(timeSlot + ':00')}</div>
                      {getWeekDays().map((date, dayIndex) => {
                        const services = getServicesInTimeSlot(date, timeSlot);
                        return (
                          <div
                            key={dayIndex}
                            className={`day-cell ${isToday(date) ? 'today' : ''}`}
                          >
                            {services.map(service => (
                              <div
                                key={service.timetable_id}
                                className={`service-chip ${getStatusClass(service.status)}`}
                                onClick={() => handleEditTimetable(service)}
                                title={`${service.service_name} - ${formatTime(service.departure_time)}`}
                              >
                                <div className="chip-route">{service.route_number}</div>
                                <div className="chip-time">{formatTime(service.departure_time)}</div>
                                <div className="chip-direction">{getDirectionIcon(service.direction)}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'list' && (
            <>
              {filteredTimetables.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><AlarmClockIcon size={48} color="#9ca3af" /></div>
                  <h2>No Timetables Found</h2>
                  <p>Create your first timetable to schedule bus services.</p>
                  <button className="btn-primary" onClick={handleCreateTimetable}>
                    Create First Timetable
                  </button>
                </div>
              ) : (
                <div className="timetables-grid">
                  {filteredTimetables.map((timetable) => (
                    <div key={timetable.timetable_id} className="timetable-card">
                      <div className="timetable-header">
                        <div className="route-info">
                          <div className="route-badge">{timetable.route_number}</div>
                          <div className="route-details">
                            <div className="route-name">{timetable.route_name}</div>
                            <div className="service-name">{timetable.service_name}</div>
                          </div>
                        </div>
                        <span className={`status-badge ${getStatusClass(timetable.status)}`}>
                          {timetable.status}
                        </span>
                      </div>
                      <div className="timetable-time">
                        <div className="time-display">
                          <span className="time-value">{formatTime(timetable.departure_time)}</span>
                          <span className="direction-indicator">{getDirectionIcon(timetable.direction)}</span>
                        </div>
                        <div className="direction-label">{timetable.direction}</div>
                      </div>
                      <div className="timetable-details">
                        <div className="detail-row">
                          <span className="detail-icon"><CalendarIcon size={16} /></span>
                          <span className="detail-text">
                            Valid from {new Date(timetable.valid_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {timetable.valid_until && ` to ${new Date(timetable.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                          </span>
                        </div>
                        {timetable.vehicle_registration && (
                          <div className="detail-row">
                            <span className="detail-icon"><BusIcon size={16} /></span>
                            <span className="detail-text">{timetable.vehicle_registration}</span>
                          </div>
                        )}
                      </div>
                      <div className="capacity-info">
                        <div className="capacity-item">
                          <div className="capacity-icon"><SeatIcon size={24} color="#6b7280" /></div>
                          <div className="capacity-details">
                            <div className="capacity-value">{timetable.total_seats}</div>
                            <div className="capacity-label">Seats</div>
                          </div>
                        </div>
                        {timetable.wheelchair_spaces > 0 && (
                          <div className="capacity-item">
                            <div className="capacity-icon"><WheelchairIcon size={24} color="#6b7280" /></div>
                            <div className="capacity-details">
                              <div className="capacity-value">{timetable.wheelchair_spaces}</div>
                              <div className="capacity-label">Wheelchair</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="timetable-actions">
                        <button className="btn-secondary" onClick={() => handleEditTimetable(timetable)}>
                          Edit
                        </button>
                        <button className="btn-text btn-danger" onClick={() => handleDeleteTimetable(timetable)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <TimetableFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        timetable={editingTimetable}
        routes={routes}
      />
    </div>
  );
}
