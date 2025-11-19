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
  const [todaysServices, setTodaysServices] = useState<BusTimetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'active'>('today');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<BusTimetable | null>(null);

  const fetchData = async () => {
    if (!tenant?.tenant_id) return;
    try {
      setLoading(true);
      setError(null);
      const [routesData, todaysData, allData] = await Promise.all([
        busRoutesApi.getRoutes(tenant.tenant_id, {}),
        busTimetablesApi.getTodaysServices(tenant.tenant_id),
        busTimetablesApi.getTimetables(tenant.tenant_id, {})
      ]);
      setRoutes(routesData);
      setTodaysServices(todaysData);
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

  const getFilteredTimetables = () => {
    let filtered = filter === 'today' ? todaysServices : timetables;
    if (filter === 'active') filtered = timetables.filter(t => t.status === 'active');
    if (selectedRoute !== 'all') filtered = filtered.filter(t => t.route_id === parseInt(selectedRoute));
    return filtered;
  };

  const formatTime = (time: string) => new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'scheduled': return 'status-scheduled';
      case 'cancelled': return 'status-cancelled';
      case 'completed': return 'status-completed';
      default: return '';
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'outbound': return <ArrowRightIcon size={20} />;
      case 'inbound': return <ArrowLeftIcon size={20} />;
      case 'circular': return <RefreshIcon size={20} />;
      default: return <ArrowRightIcon size={20} />;
    }
  };

  const filteredTimetables = getFilteredTimetables();

  if (loading) return (<div className="bus-timetables-page"><div className="loading-state"><div className="spinner"></div><p>Loading timetables...</p></div></div>);
  if (error) return (<div className="bus-timetables-page"><div className="error-state"><h2>Error Loading Timetables</h2><p>{error}</p><button className="btn-primary" onClick={fetchData}>Retry</button></div></div>);

  return (
    <div className="bus-timetables-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Service Timetables</h1>
          <p className="page-subtitle">Manage scheduled bus services</p>
        </div>
        <button className="btn-primary" onClick={handleCreateTimetable} disabled={routes.length === 0}>
          <span>+</span> Create New Timetable
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
          <div className="page-filters">
            <div className="filter-group">
              <button className={`filter-btn ${filter === 'today' ? 'active' : ''}`} onClick={() => setFilter('today')}>Today's Services ({todaysServices.length})</button>
              <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
              <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Timetables</button>
            </div>
            <div className="filter-group">
              <select className="route-filter" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
                <option value="all">All Routes</option>
                {routes.map(route => (<option key={route.route_id} value={route.route_id}>Route {route.route_number} - {route.route_name}</option>))}
              </select>
            </div>
          </div>

          {filteredTimetables.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><AlarmClockIcon size={48} color="#9ca3af" /></div>
              <h2>No Timetables Found</h2>
              <p>{filter === 'today' ? 'No services scheduled for today.' : 'Create your first timetable to schedule bus services.'}</p>
              {filter === 'today' ? (<button className="btn-secondary" onClick={() => setFilter('all')}>View All Timetables</button>) : (<button className="btn-primary" onClick={handleCreateTimetable}>Create First Timetable</button>)}
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
                    <span className={`status-badge ${getStatusBadgeClass(timetable.status)}`}>{timetable.status}</span>
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
                      <span className="detail-text">Valid from {formatDate(timetable.valid_from)}{timetable.valid_until && ` to ${formatDate(timetable.valid_until)}`}</span>
                    </div>
                    {timetable.vehicle_registration && (<div className="detail-row"><span className="detail-icon"><BusIcon size={16} /></span><span className="detail-text">{timetable.vehicle_registration}</span></div>)}
                    {timetable.driver_name && (<div className="detail-row"><span className="detail-icon"><UserIcon size={16} /></span><span className="detail-text">{timetable.driver_name}</span></div>)}
                  </div>
                  <div className="capacity-info">
                    <div className="capacity-item">
                      <div className="capacity-icon"><SeatIcon size={24} color="#6b7280" /></div>
                      <div className="capacity-details"><div className="capacity-value">{timetable.total_seats}</div><div className="capacity-label">Total Seats</div></div>
                    </div>
                    {timetable.wheelchair_spaces > 0 && (<div className="capacity-item"><div className="capacity-icon"><WheelchairIcon size={24} color="#6b7280" /></div><div className="capacity-details"><div className="capacity-value">{timetable.wheelchair_spaces}</div><div className="capacity-label">Wheelchair</div></div></div>)}
                  </div>
                  <div className="timetable-actions">
                    <button className="btn-secondary" onClick={() => handleEditTimetable(timetable)}>Edit</button>
                    <button className="btn-text btn-danger" onClick={() => handleDeleteTimetable(timetable)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <TimetableFormModal isOpen={showModal} onClose={handleCloseModal} onSuccess={handleModalSuccess} timetable={editingTimetable} routes={routes} />
    </div>
  );
}
