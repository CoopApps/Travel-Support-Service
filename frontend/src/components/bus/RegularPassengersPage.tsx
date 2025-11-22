import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import {
  busTimetablesApi,
  busRoutesApi,
  regularPassengersApi,
  BusTimetable,
  BusRoute,
  RegularPassenger,
  RouteStop
} from '../../services/busApi';
import { customerApi } from '../../services/api';
import { WheelchairIcon, UserIcon, CalendarIcon, SeatIcon } from '../icons/BusIcons';
import './RegularPassengersPage.css';

interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  phone?: string;
  requires_wheelchair?: boolean;
}

export default function RegularPassengersPage() {
  const { tenant } = useTenant();
  const [timetables, setTimetables] = useState<BusTimetable[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [regularPassengers, setRegularPassengers] = useState<RegularPassenger[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedTimetable, setSelectedTimetable] = useState<string>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<RegularPassenger | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    timetable_id: '',
    seat_number: '',
    travels_monday: false,
    travels_tuesday: false,
    travels_wednesday: false,
    travels_thursday: false,
    travels_friday: false,
    travels_saturday: false,
    travels_sunday: false,
    boarding_stop_id: '',
    alighting_stop_id: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    special_requirements: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadData();
    }
  }, [tenant?.tenant_id]);

  const loadData = async () => {
    if (!tenant?.tenant_id) return;
    setLoading(true);
    try {
      const [routesData, timetablesData, passengersData, customersData] = await Promise.all([
        busRoutesApi.getRoutes(tenant.tenant_id, {}),
        busTimetablesApi.getTimetables(tenant.tenant_id, {}),
        regularPassengersApi.getRegularPassengers(tenant.tenant_id, {}),
        customerApi.getCustomers(tenant.tenant_id, { limit: 1000 })
      ]);
      setRoutes(routesData);
      setTimetables(timetablesData);
      setRegularPassengers(passengersData);
      setCustomers(customersData.customers || customersData || []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadRouteStops = async (routeId: number) => {
    if (!tenant?.tenant_id) return;
    try {
      const routeData = await busRoutesApi.getRoute(tenant.tenant_id, routeId);
      setRouteStops(routeData.stops || []);
    } catch (err) {
      console.error('Failed to load route stops:', err);
      setRouteStops([]);
    }
  };

  const handleTimetableChange = (timetableId: string) => {
    setFormData(prev => ({ ...prev, timetable_id: timetableId }));
    const timetable = timetables.find(t => t.timetable_id === parseInt(timetableId));
    if (timetable) {
      loadRouteStops(timetable.route_id);
    }
  };

  const handleOpenModal = (passenger?: RegularPassenger) => {
    if (passenger) {
      setEditingPassenger(passenger);
      setFormData({
        customer_id: passenger.customer_id.toString(),
        timetable_id: passenger.timetable_id.toString(),
        seat_number: passenger.seat_number,
        travels_monday: passenger.travels_monday,
        travels_tuesday: passenger.travels_tuesday,
        travels_wednesday: passenger.travels_wednesday,
        travels_thursday: passenger.travels_thursday,
        travels_friday: passenger.travels_friday,
        travels_saturday: passenger.travels_saturday,
        travels_sunday: passenger.travels_sunday,
        boarding_stop_id: passenger.boarding_stop_id?.toString() || '',
        alighting_stop_id: passenger.alighting_stop_id?.toString() || '',
        valid_from: passenger.valid_from.split('T')[0],
        valid_until: passenger.valid_until?.split('T')[0] || '',
        special_requirements: passenger.special_requirements || '',
        notes: passenger.notes || ''
      });
      const timetable = timetables.find(t => t.timetable_id === passenger.timetable_id);
      if (timetable) {
        loadRouteStops(timetable.route_id);
      }
    } else {
      setEditingPassenger(null);
      setFormData({
        customer_id: '',
        timetable_id: '',
        seat_number: '',
        travels_monday: false,
        travels_tuesday: false,
        travels_wednesday: false,
        travels_thursday: false,
        travels_friday: false,
        travels_saturday: false,
        travels_sunday: false,
        boarding_stop_id: '',
        alighting_stop_id: '',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        special_requirements: '',
        notes: ''
      });
      setRouteStops([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPassenger(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.tenant_id) return;

    // Validate at least one day selected
    const hasDay = formData.travels_monday || formData.travels_tuesday ||
      formData.travels_wednesday || formData.travels_thursday ||
      formData.travels_friday || formData.travels_saturday || formData.travels_sunday;

    if (!hasDay) {
      alert('Please select at least one travel day');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_id: parseInt(formData.customer_id),
        timetable_id: parseInt(formData.timetable_id),
        seat_number: formData.seat_number,
        travels_monday: formData.travels_monday,
        travels_tuesday: formData.travels_tuesday,
        travels_wednesday: formData.travels_wednesday,
        travels_thursday: formData.travels_thursday,
        travels_friday: formData.travels_friday,
        travels_saturday: formData.travels_saturday,
        travels_sunday: formData.travels_sunday,
        boarding_stop_id: formData.boarding_stop_id ? parseInt(formData.boarding_stop_id) : undefined,
        alighting_stop_id: formData.alighting_stop_id ? parseInt(formData.alighting_stop_id) : undefined,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || undefined,
        special_requirements: formData.special_requirements || undefined,
        notes: formData.notes || undefined
      };

      if (editingPassenger) {
        await regularPassengersApi.updateRegularPassenger(
          tenant.tenant_id,
          editingPassenger.regular_id,
          payload
        );
      } else {
        await regularPassengersApi.createRegularPassenger(tenant.tenant_id, payload);
      }

      handleCloseModal();
      loadData();
    } catch (err: any) {
      console.error('Failed to save:', err);
      alert(err.response?.data?.error || 'Failed to save regular passenger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (passenger: RegularPassenger) => {
    if (!tenant?.tenant_id) return;
    if (!confirm(`Remove ${passenger.first_name} ${passenger.last_name} as a regular passenger?`)) return;

    try {
      await regularPassengersApi.deleteRegularPassenger(tenant.tenant_id, passenger.regular_id);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete:', err);
      alert(err.response?.data?.error || 'Failed to remove regular passenger');
    }
  };

  const handleSuspend = async (passenger: RegularPassenger) => {
    if (!tenant?.tenant_id) return;
    const newStatus = passenger.status === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'suspend' : 'reactivate';

    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${passenger.first_name} ${passenger.last_name}?`)) return;

    try {
      await regularPassengersApi.updateRegularPassenger(tenant.tenant_id, passenger.regular_id, {
        status: newStatus
      });
      loadData();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.error || `Failed to ${action}`);
    }
  };

  const formatDays = (p: RegularPassenger) => {
    const days = [];
    if (p.travels_monday) days.push('Mon');
    if (p.travels_tuesday) days.push('Tue');
    if (p.travels_wednesday) days.push('Wed');
    if (p.travels_thursday) days.push('Thu');
    if (p.travels_friday) days.push('Fri');
    if (p.travels_saturday) days.push('Sat');
    if (p.travels_sunday) days.push('Sun');
    return days.join(', ');
  };

  // Filter passengers
  const filteredPassengers = regularPassengers.filter(p => {
    if (selectedRoute !== 'all') {
      const timetable = timetables.find(t => t.timetable_id === p.timetable_id);
      if (!timetable || timetable.route_id !== parseInt(selectedRoute)) return false;
    }
    if (selectedTimetable !== 'all' && p.timetable_id !== parseInt(selectedTimetable)) return false;
    return true;
  });

  // Group by timetable for display
  const groupedByTimetable = filteredPassengers.reduce((acc, p) => {
    const key = p.timetable_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<number, RegularPassenger[]>);

  if (loading) {
    return (
      <div className="regular-passengers-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading regular passengers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="regular-passengers-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Regular Passengers</h1>
          <p className="page-subtitle">Manage recurring seat assignments for bus services</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <span>+</span> Add Regular Passenger
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Route</label>
          <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}>
            <option value="all">All Routes</option>
            {routes.map(r => (
              <option key={r.route_id} value={r.route_id}>
                {r.route_number} - {r.route_name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Service</label>
          <select value={selectedTimetable} onChange={e => setSelectedTimetable(e.target.value)}>
            <option value="all">All Services</option>
            {timetables
              .filter(t => selectedRoute === 'all' || t.route_id === parseInt(selectedRoute))
              .map(t => (
                <option key={t.timetable_id} value={t.timetable_id}>
                  {t.route_number} {t.departure_time} - {t.service_name}
                </option>
              ))}
          </select>
        </div>
        <div className="filter-stats">
          <span className="stat">{filteredPassengers.length} regular passengers</span>
          <span className="stat">{filteredPassengers.filter(p => p.status === 'active').length} active</span>
        </div>
      </div>

      {/* Passengers List */}
      {Object.keys(groupedByTimetable).length === 0 ? (
        <div className="empty-state">
          <CalendarIcon size={48} color="#9ca3af" />
          <h2>No Regular Passengers</h2>
          <p>Add regular passengers to assign recurring seats on bus services.</p>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            Add First Regular Passenger
          </button>
        </div>
      ) : (
        <div className="passengers-list">
          {Object.entries(groupedByTimetable).map(([timetableId, passengers]) => {
            const timetable = timetables.find(t => t.timetable_id === parseInt(timetableId));
            if (!timetable) return null;

            return (
              <div key={timetableId} className="service-group">
                <div className="service-header">
                  <div className="service-info">
                    <span className="route-badge">{timetable.route_number}</span>
                    <span className="service-name">{timetable.service_name}</span>
                    <span className="service-time">{timetable.departure_time}</span>
                  </div>
                  <span className="passenger-count">{passengers.length} passengers</span>
                </div>

                <div className="passengers-grid">
                  {passengers.sort((a, b) => a.seat_number.localeCompare(b.seat_number)).map(p => (
                    <div key={p.regular_id} className={`passenger-card ${p.status}`}>
                      <div className="passenger-header">
                        <div className="passenger-avatar">
                          {p.requires_wheelchair_space ? (
                            <WheelchairIcon size={20} color="#3b82f6" />
                          ) : (
                            <UserIcon size={20} color="#6b7280" />
                          )}
                        </div>
                        <div className="passenger-info">
                          <div className="passenger-name">{p.first_name} {p.last_name}</div>
                          <div className="passenger-phone">{p.phone || 'No phone'}</div>
                        </div>
                        <div className="seat-badge">
                          <SeatIcon size={14} />
                          {p.seat_number}
                        </div>
                      </div>

                      <div className="passenger-details">
                        <div className="detail-row">
                          <span className="label">Days:</span>
                          <span className="value">{formatDays(p)}</span>
                        </div>
                        {p.boarding_stop_name && (
                          <div className="detail-row">
                            <span className="label">Boards at:</span>
                            <span className="value">{p.boarding_stop_name}</span>
                          </div>
                        )}
                        {p.status !== 'active' && (
                          <div className="status-badge suspended">Suspended</div>
                        )}
                      </div>

                      <div className="passenger-actions">
                        <button className="btn-sm" onClick={() => handleOpenModal(p)}>Edit</button>
                        <button
                          className={`btn-sm ${p.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => handleSuspend(p)}
                        >
                          {p.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button className="btn-sm btn-danger" onClick={() => handleDelete(p)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content regular-passenger-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPassenger ? 'Edit Regular Passenger' : 'Add Regular Passenger'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer *</label>
                    <select
                      value={formData.customer_id}
                      onChange={e => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                      required
                      disabled={!!editingPassenger}
                    >
                      <option value="">Select customer...</option>
                      {customers.map(c => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.first_name} {c.last_name} {c.requires_wheelchair ? '(Wheelchair)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Service *</label>
                    <select
                      value={formData.timetable_id}
                      onChange={e => handleTimetableChange(e.target.value)}
                      required
                      disabled={!!editingPassenger}
                    >
                      <option value="">Select service...</option>
                      {timetables.map(t => (
                        <option key={t.timetable_id} value={t.timetable_id}>
                          {t.route_number} {t.departure_time} - {t.service_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Seat Number *</label>
                    <input
                      type="text"
                      value={formData.seat_number}
                      onChange={e => setFormData(prev => ({ ...prev, seat_number: e.target.value }))}
                      placeholder="e.g., 1, 2, W1"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Travel Days *</label>
                  <div className="days-grid">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <label key={day} className="day-checkbox">
                        <input
                          type="checkbox"
                          checked={formData[`travels_${day}` as keyof typeof formData] as boolean}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            [`travels_${day}`]: e.target.checked
                          }))}
                        />
                        <span>{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {routeStops.length > 0 && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Boarding Stop</label>
                      <select
                        value={formData.boarding_stop_id}
                        onChange={e => setFormData(prev => ({ ...prev, boarding_stop_id: e.target.value }))}
                      >
                        <option value="">First stop</option>
                        {routeStops.sort((a, b) => a.stop_sequence - b.stop_sequence).map(s => (
                          <option key={s.stop_id} value={s.stop_id}>{s.stop_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Alighting Stop</label>
                      <select
                        value={formData.alighting_stop_id}
                        onChange={e => setFormData(prev => ({ ...prev, alighting_stop_id: e.target.value }))}
                      >
                        <option value="">Last stop</option>
                        {routeStops.sort((a, b) => a.stop_sequence - b.stop_sequence).map(s => (
                          <option key={s.stop_id} value={s.stop_id}>{s.stop_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Valid From *</label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={e => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Valid Until (optional)</label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={e => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Special Requirements</label>
                  <textarea
                    value={formData.special_requirements}
                    onChange={e => setFormData(prev => ({ ...prev, special_requirements: e.target.value }))}
                    rows={2}
                    placeholder="Any accessibility or special needs..."
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    placeholder="Internal notes..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingPassenger ? 'Update' : 'Add Passenger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
