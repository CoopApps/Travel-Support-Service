import React, { useEffect, useState, useRef } from 'react';
import { busTimetablesApi, busRoutesApi, BusTimetable, BusRoute } from '../../services/busApi';
import { api } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { AlarmClockIcon, ArrowRightIcon, ArrowLeftIcon, RefreshIcon, WheelchairIcon, SeatIcon, UserIcon, BusIcon, CalendarIcon } from '../icons/BusIcons';
import TimetableFormModal from './TimetableFormModal';
import './BusTimetablesPage.css';

interface Vehicle {
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  seats: number;
  wheelchair_accessible: boolean;
  is_active: boolean;
}

interface Driver {
  driver_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  timetable: BusTimetable | null;
  showVehicleSubmenu: boolean;
  showDriverSubmenu: boolean;
}

interface DragState {
  isDragging: boolean;
  route: BusRoute | null;
}

export default function BusTimetablesPage() {
  const { tenant } = useTenant();
  const [timetables, setTimetables] = useState<BusTimetable[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<BusTimetable | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'vehicle'>('calendar');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    timetable: null,
    showVehicleSubmenu: false,
    showDriverSubmenu: false
  });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    route: null
  });
  const [prefilledData, setPrefilledData] = useState<any>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    if (!tenant?.tenant_id) return;
    try {
      setLoading(true);
      setError(null);
      const [routesData, allData, vehiclesData, driversData] = await Promise.all([
        busRoutesApi.getRoutes(tenant.tenant_id, {}),
        busTimetablesApi.getTimetables(tenant.tenant_id, {}),
        api.vehicles.getVehicles(tenant.tenant_id, { is_active: true }),
        api.drivers.getDrivers(tenant.tenant_id, { status: 'active' })
      ]);
      setRoutes(routesData);
      setTimetables(allData);
      setVehicles(vehiclesData || []);
      setDrivers(driversData?.drivers || driversData || []);
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

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false, showVehicleSubmenu: false, showDriverSubmenu: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAssignVehicle = async (timetable: BusTimetable, vehicleId: number | null) => {
    if (!tenant?.tenant_id) return;
    try {
      const vehicle = vehicleId ? vehicles.find(v => v.vehicle_id === vehicleId) : null;
      await busTimetablesApi.updateTimetable(tenant.tenant_id, timetable.timetable_id, {
        vehicle_id: vehicleId,
        vehicle_registration: vehicle?.registration || null
      });
      fetchData();
      setContextMenu(prev => ({ ...prev, visible: false, showVehicleSubmenu: false, showDriverSubmenu: false }));
    } catch (err: any) {
      console.error('Failed to assign vehicle:', err);
      alert(err.response?.data?.error || 'Failed to assign vehicle');
    }
  };

  const handleAssignDriver = async (timetable: BusTimetable, driverId: number | null) => {
    if (!tenant?.tenant_id) return;
    try {
      const driver = driverId ? drivers.find(d => d.driver_id === driverId) : null;
      await busTimetablesApi.updateTimetable(tenant.tenant_id, timetable.timetable_id, {
        driver_id: driverId,
        driver_name: driver ? `${driver.first_name} ${driver.last_name}` : null
      });
      fetchData();
      setContextMenu(prev => ({ ...prev, visible: false, showVehicleSubmenu: false, showDriverSubmenu: false }));
    } catch (err: any) {
      console.error('Failed to assign driver:', err);
      alert(err.response?.data?.error || 'Failed to assign driver');
    }
  };

  const handleCreateTimetable = () => {
    setEditingTimetable(null);
    setPrefilledData(null);
    setShowModal(true);
  };

  const handleEditTimetable = (timetable: BusTimetable) => {
    setEditingTimetable(timetable);
    setPrefilledData(null);
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
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTimetable(null);
    setPrefilledData(null);
  };

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
    return timetables.filter(t => {
      if (selectedRoute !== 'all' && t.route_id !== parseInt(selectedRoute)) return false;
      const validFrom = new Date(t.valid_from);
      const validUntil = t.valid_until ? new Date(t.valid_until) : null;
      if (date < validFrom) return false;
      if (validUntil && date > validUntil) return false;
      return t.status === 'active' || t.status === 'scheduled';
    }).sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  };

  const getTimeSlots = () => {
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

  const getDirectionIcon = (direction: string, size: number = 14) => {
    switch (direction) {
      case 'outbound': return <ArrowRightIcon size={size} />;
      case 'inbound': return <ArrowLeftIcon size={size} />;
      case 'circular': return <RefreshIcon size={size} />;
      default: return <ArrowRightIcon size={size} />;
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

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, route: BusRoute) => {
    e.dataTransfer.setData('routeId', route.route_id.toString());
    e.dataTransfer.effectAllowed = 'copy';
    setDragState({ isDragging: true, route });
  };

  const handleDragEnd = () => {
    setDragState({ isDragging: false, route: null });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, date: Date, timeSlot: string) => {
    e.preventDefault();
    const routeId = e.dataTransfer.getData('routeId');
    const route = routes.find(r => r.route_id === parseInt(routeId));

    if (route) {
      const dateStr = date.toISOString().split('T')[0];
      setPrefilledData({
        route_id: route.route_id.toString(),
        departure_time: timeSlot,
        valid_from: dateStr,
        direction: 'outbound',
        service_name: `${route.route_number} Outbound ${timeSlot}`
      });
      setEditingTimetable(null);
      setShowModal(true);
    }

    setDragState({ isDragging: false, route: null });
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, timetable: BusTimetable) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      timetable
    });
  };

  const handleCreateReturn = async () => {
    if (!contextMenu.timetable || !tenant?.tenant_id) return;

    const original = contextMenu.timetable;
    const route = routes.find(r => r.route_id === original.route_id);

    // Parse original time and add 30 minutes for return
    const [hours, minutes] = original.departure_time.split(':').map(Number);
    const returnDate = new Date(2000, 0, 1, hours, minutes + 30);
    const returnTime = `${returnDate.getHours().toString().padStart(2, '0')}:${returnDate.getMinutes().toString().padStart(2, '0')}`;

    const newDirection = original.direction === 'outbound' ? 'inbound' : 'outbound';

    setPrefilledData({
      route_id: original.route_id.toString(),
      departure_time: returnTime,
      valid_from: original.valid_from.split('T')[0],
      valid_until: original.valid_until?.split('T')[0] || '',
      direction: newDirection,
      service_name: `${route?.route_number || ''} ${newDirection.charAt(0).toUpperCase() + newDirection.slice(1)} ${returnTime}`,
      total_seats: original.total_seats?.toString() || '16',
      wheelchair_spaces: original.wheelchair_spaces?.toString() || '2',
      status: original.status,
      vehicle_id: original.vehicle_id?.toString() || '',
      vehicle_registration: original.vehicle_registration || '',
      driver_id: original.driver_id?.toString() || '',
      driver_name: original.driver_name || ''
    });

    setEditingTimetable(null);
    setShowModal(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleDuplicateService = () => {
    if (!contextMenu.timetable) return;

    const original = contextMenu.timetable;
    const route = routes.find(r => r.route_id === original.route_id);

    // Add 1 hour for next service
    const [hours, minutes] = original.departure_time.split(':').map(Number);
    const nextDate = new Date(2000, 0, 1, hours + 1, minutes);
    const nextTime = `${nextDate.getHours().toString().padStart(2, '0')}:${nextDate.getMinutes().toString().padStart(2, '0')}`;

    setPrefilledData({
      route_id: original.route_id.toString(),
      departure_time: nextTime,
      valid_from: original.valid_from.split('T')[0],
      valid_until: original.valid_until?.split('T')[0] || '',
      direction: original.direction,
      service_name: `${route?.route_number || ''} ${original.direction.charAt(0).toUpperCase() + original.direction.slice(1)} ${nextTime}`,
      total_seats: original.total_seats?.toString() || '16',
      wheelchair_spaces: original.wheelchair_spaces?.toString() || '2',
      status: original.status,
      vehicle_id: original.vehicle_id?.toString() || '',
      vehicle_registration: original.vehicle_registration || '',
      driver_id: original.driver_id?.toString() || '',
      driver_name: original.driver_name || ''
    });

    setEditingTimetable(null);
    setShowModal(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
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
          <p className="page-subtitle">Drag routes onto the calendar to schedule services</p>
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
          {/* Route Palette */}
          <div className="route-palette">
            <div className="palette-header">
              <span className="palette-title">Routes</span>
              <span className="palette-hint">Drag onto calendar</span>
            </div>
            <div className="palette-routes">
              {routes.filter(r => r.status === 'active' || r.status === 'planning').map(route => (
                <div
                  key={route.route_id}
                  className="palette-route"
                  draggable
                  onDragStart={(e) => handleDragStart(e, route)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="palette-route-number">{route.route_number}</div>
                  <div className="palette-route-info">
                    <div className="palette-route-name">{route.route_name}</div>
                    <div className="palette-route-journey">{route.origin_point} → {route.destination_point}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
            <div className={`calendar-view ${dragState.isDragging ? 'dragging' : ''}`}>
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
                            className={`day-cell ${isToday(date) ? 'today' : ''} ${dragState.isDragging ? 'drop-target' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, date, timeSlot)}
                          >
                            {services.map(service => (
                              <div
                                key={service.timetable_id}
                                className={`service-chip ${getStatusClass(service.status)}`}
                                onClick={() => handleEditTimetable(service)}
                                onContextMenu={(e) => handleContextMenu(e, service)}
                                title={`${service.service_name}\nRight-click for options`}
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
                    <div
                      key={timetable.timetable_id}
                      className="timetable-card"
                      onContextMenu={(e) => handleContextMenu(e, timetable)}
                    >
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
                          <span className="direction-indicator">{getDirectionIcon(timetable.direction, 28)}</span>
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

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            className="context-menu-item has-submenu"
            onMouseEnter={() => setContextMenu(prev => ({ ...prev, showVehicleSubmenu: true }))}
            onMouseLeave={() => setContextMenu(prev => ({ ...prev, showVehicleSubmenu: false }))}
          >
            <BusIcon size={16} /> Assign Vehicle
            <span className="submenu-arrow">▶</span>
            {contextMenu.showVehicleSubmenu && (
              <div className="context-submenu">
                <button
                  className={`context-menu-item ${!contextMenu.timetable?.vehicle_id ? 'active' : ''}`}
                  onClick={() => contextMenu.timetable && handleAssignVehicle(contextMenu.timetable, null)}
                >
                  No Vehicle
                </button>
                {vehicles.filter(v => v.is_active).map(vehicle => (
                  <button
                    key={vehicle.vehicle_id}
                    className={`context-menu-item ${contextMenu.timetable?.vehicle_id === vehicle.vehicle_id ? 'active' : ''}`}
                    onClick={() => contextMenu.timetable && handleAssignVehicle(contextMenu.timetable, vehicle.vehicle_id)}
                  >
                    {vehicle.registration} - {vehicle.make} {vehicle.model}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div
            className="context-menu-item has-submenu"
            onMouseEnter={() => setContextMenu(prev => ({ ...prev, showDriverSubmenu: true }))}
            onMouseLeave={() => setContextMenu(prev => ({ ...prev, showDriverSubmenu: false }))}
          >
            <UserIcon size={16} /> Assign Driver
            <span className="submenu-arrow">▶</span>
            {contextMenu.showDriverSubmenu && (
              <div className="context-submenu">
                <button
                  className={`context-menu-item ${!contextMenu.timetable?.driver_id ? 'active' : ''}`}
                  onClick={() => contextMenu.timetable && handleAssignDriver(contextMenu.timetable, null)}
                >
                  No Driver
                </button>
                {drivers.filter(d => d.status === 'active').map(driver => (
                  <button
                    key={driver.driver_id}
                    className={`context-menu-item ${contextMenu.timetable?.driver_id === driver.driver_id ? 'active' : ''}`}
                    onClick={() => contextMenu.timetable && handleAssignDriver(contextMenu.timetable, driver.driver_id)}
                  >
                    {driver.first_name} {driver.last_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="context-menu-item" onClick={handleCreateReturn}>
            <ArrowLeftIcon size={16} /> Create Return Journey
          </button>
          <button className="context-menu-item" onClick={handleDuplicateService}>
            <CalendarIcon size={16} /> Duplicate (+1 hour)
          </button>
          <div className="context-menu-divider"></div>
          <button className="context-menu-item" onClick={() => {
            if (contextMenu.timetable) handleEditTimetable(contextMenu.timetable);
            setContextMenu(prev => ({ ...prev, visible: false }));
          }}>
            Edit Service
          </button>
          <button className="context-menu-item danger" onClick={() => {
            if (contextMenu.timetable) handleDeleteTimetable(contextMenu.timetable);
            setContextMenu(prev => ({ ...prev, visible: false }));
          }}>
            Delete Service
          </button>
        </div>
      )}

      <TimetableFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        timetable={editingTimetable}
        routes={routes}
        vehicles={vehicles}
        drivers={drivers}
        prefilled={prefilledData}
      />
    </div>
  );
}
