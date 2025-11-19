import React, { useState, useEffect } from 'react';
import { busRoutesApi, BusRoute, RouteStop } from '../../services/busApi';
import { useTenant } from '../../context/TenantContext';
import './RouteFormModal.css';

interface RouteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  route?: BusRoute | null; // If provided, we're editing
}

interface FormData {
  route_number: string;
  route_name: string;
  description: string;
  registration_number: string;
  origin_point: string;
  destination_point: string;
  total_distance_miles: string;
  estimated_duration_minutes: string;
  service_pattern: 'daily' | 'weekdays' | 'weekends' | 'custom';
  operates_monday: boolean;
  operates_tuesday: boolean;
  operates_wednesday: boolean;
  operates_thursday: boolean;
  operates_friday: boolean;
  operates_saturday: boolean;
  operates_sunday: boolean;
  status: 'planning' | 'registered' | 'active' | 'suspended' | 'cancelled';
  start_date: string;
  end_date: string;
}

interface StopFormData {
  stop_sequence: number;
  stop_name: string;
  stop_address: string;
  arrival_offset_minutes: string;
  departure_offset_minutes: string;
  dwell_time_minutes: string;
  is_timing_point: boolean;
  is_pickup_point: boolean;
  is_setdown_point: boolean;
}

const initialFormData: FormData = {
  route_number: '',
  route_name: '',
  description: '',
  registration_number: '',
  origin_point: '',
  destination_point: '',
  total_distance_miles: '',
  estimated_duration_minutes: '',
  service_pattern: 'daily',
  operates_monday: true,
  operates_tuesday: true,
  operates_wednesday: true,
  operates_thursday: true,
  operates_friday: true,
  operates_saturday: true,
  operates_sunday: true,
  status: 'planning',
  start_date: '',
  end_date: ''
};

export default function RouteFormModal({ isOpen, onClose, onSuccess, route }: RouteFormModalProps) {
  const { tenant } = useTenant();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [showStopForm, setShowStopForm] = useState(false);
  const [editingStop, setEditingStop] = useState<RouteStop | null>(null);
  const [stopFormData, setStopFormData] = useState<StopFormData>({
    stop_sequence: 1,
    stop_name: '',
    stop_address: '',
    arrival_offset_minutes: '0',
    departure_offset_minutes: '0',
    dwell_time_minutes: '2',
    is_timing_point: false,
    is_pickup_point: true,
    is_setdown_point: true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'stops'>('details');

  const isEditing = !!route;

  useEffect(() => {
    if (route) {
      setFormData({
        route_number: route.route_number || '',
        route_name: route.route_name || '',
        description: route.description || '',
        registration_number: route.registration_number || '',
        origin_point: route.origin_point || '',
        destination_point: route.destination_point || '',
        total_distance_miles: route.total_distance_miles?.toString() || '',
        estimated_duration_minutes: route.estimated_duration_minutes?.toString() || '',
        service_pattern: route.service_pattern || 'daily',
        operates_monday: route.operates_monday ?? true,
        operates_tuesday: route.operates_tuesday ?? true,
        operates_wednesday: route.operates_wednesday ?? true,
        operates_thursday: route.operates_thursday ?? true,
        operates_friday: route.operates_friday ?? true,
        operates_saturday: route.operates_saturday ?? true,
        operates_sunday: route.operates_sunday ?? true,
        status: route.status || 'planning',
        start_date: route.start_date?.split('T')[0] || '',
        end_date: route.end_date?.split('T')[0] || ''
      });
      // Load stops for existing route
      loadStops(route.route_id);
    } else {
      setFormData(initialFormData);
      setStops([]);
    }
  }, [route]);

  const loadStops = async (routeId: number) => {
    if (!tenant?.tenant_id) return;
    try {
      const routeData = await busRoutesApi.getRoute(tenant.tenant_id, routeId);
      if (routeData.stops) {
        setStops(routeData.stops);
      }
    } catch (err) {
      console.error('Failed to load stops:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleServicePatternChange = (pattern: 'daily' | 'weekdays' | 'weekends' | 'custom') => {
    let days = {
      operates_monday: true,
      operates_tuesday: true,
      operates_wednesday: true,
      operates_thursday: true,
      operates_friday: true,
      operates_saturday: true,
      operates_sunday: true
    };

    if (pattern === 'weekdays') {
      days.operates_saturday = false;
      days.operates_sunday = false;
    } else if (pattern === 'weekends') {
      days = {
        operates_monday: false,
        operates_tuesday: false,
        operates_wednesday: false,
        operates_thursday: false,
        operates_friday: false,
        operates_saturday: true,
        operates_sunday: true
      };
    }

    setFormData(prev => ({
      ...prev,
      service_pattern: pattern,
      ...days
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.tenant_id) return;

    // Validate required fields
    if (!formData.route_number.trim()) {
      setError('Route number is required');
      return;
    }
    if (!formData.route_name.trim()) {
      setError('Route name is required');
      return;
    }
    if (!formData.origin_point.trim()) {
      setError('Origin point is required');
      return;
    }
    if (!formData.destination_point.trim()) {
      setError('Destination point is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: any = {
        route_number: formData.route_number.trim(),
        route_name: formData.route_name.trim(),
        description: formData.description.trim() || undefined,
        registration_number: formData.registration_number.trim() || undefined,
        origin_point: formData.origin_point.trim(),
        destination_point: formData.destination_point.trim(),
        total_distance_miles: formData.total_distance_miles ? parseFloat(formData.total_distance_miles) : undefined,
        estimated_duration_minutes: formData.estimated_duration_minutes ? parseInt(formData.estimated_duration_minutes) : undefined,
        service_pattern: formData.service_pattern,
        operating_days: {
          monday: formData.operates_monday,
          tuesday: formData.operates_tuesday,
          wednesday: formData.operates_wednesday,
          thursday: formData.operates_thursday,
          friday: formData.operates_friday,
          saturday: formData.operates_saturday,
          sunday: formData.operates_sunday
        },
        status: formData.status,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined
      };

      if (isEditing && route) {
        await busRoutesApi.updateRoute(tenant.tenant_id, route.route_id, payload);
      } else {
        await busRoutesApi.createRoute(tenant.tenant_id, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save route:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStop = async () => {
    if (!tenant?.tenant_id || !route?.route_id) return;
    if (!stopFormData.stop_name.trim()) {
      setError('Stop name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: Partial<RouteStop> = {
        stop_sequence: stopFormData.stop_sequence,
        stop_name: stopFormData.stop_name.trim(),
        stop_address: stopFormData.stop_address.trim() || undefined,
        arrival_offset_minutes: parseInt(stopFormData.arrival_offset_minutes) || 0,
        departure_offset_minutes: parseInt(stopFormData.departure_offset_minutes) || 0,
        dwell_time_minutes: parseInt(stopFormData.dwell_time_minutes) || 2,
        is_timing_point: stopFormData.is_timing_point,
        is_pickup_point: stopFormData.is_pickup_point,
        is_setdown_point: stopFormData.is_setdown_point
      };

      if (editingStop) {
        await busRoutesApi.updateStop(tenant.tenant_id, route.route_id, editingStop.stop_id, payload);
      } else {
        await busRoutesApi.addStop(tenant.tenant_id, route.route_id, payload);
      }

      // Reload stops
      await loadStops(route.route_id);

      // Reset form
      setShowStopForm(false);
      setEditingStop(null);
      setStopFormData({
        stop_sequence: stops.length + 2,
        stop_name: '',
        stop_address: '',
        arrival_offset_minutes: '0',
        departure_offset_minutes: '0',
        dwell_time_minutes: '2',
        is_timing_point: false,
        is_pickup_point: true,
        is_setdown_point: true
      });
    } catch (err: any) {
      console.error('Failed to save stop:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save stop');
    } finally {
      setSaving(false);
    }
  };

  const handleEditStop = (stop: RouteStop) => {
    setEditingStop(stop);
    setStopFormData({
      stop_sequence: stop.stop_sequence,
      stop_name: stop.stop_name,
      stop_address: stop.stop_address || '',
      arrival_offset_minutes: stop.arrival_offset_minutes?.toString() || '0',
      departure_offset_minutes: stop.departure_offset_minutes?.toString() || '0',
      dwell_time_minutes: stop.dwell_time_minutes?.toString() || '2',
      is_timing_point: stop.is_timing_point,
      is_pickup_point: stop.is_pickup_point,
      is_setdown_point: stop.is_setdown_point
    });
    setShowStopForm(true);
  };

  const handleDeleteStop = async (stopId: number) => {
    if (!tenant?.tenant_id || !route?.route_id) return;
    if (!confirm('Are you sure you want to delete this stop?')) return;

    try {
      setSaving(true);
      await busRoutesApi.deleteStop(tenant.tenant_id, route.route_id, stopId);
      await loadStops(route.route_id);
    } catch (err: any) {
      console.error('Failed to delete stop:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete stop');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="route-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Route' : 'Create New Route'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {isEditing && (
          <div className="modal-tabs">
            <button
              className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Route Details
            </button>
            <button
              className={`tab-btn ${activeTab === 'stops' ? 'active' : ''}`}
              onClick={() => setActiveTab('stops')}
            >
              Stops ({stops.length})
            </button>
          </div>
        )}

        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} className="route-form">
            <div className="form-section">
              <h3>Basic Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="route_number">Route Number *</label>
                  <input
                    type="text"
                    id="route_number"
                    name="route_number"
                    value={formData.route_number}
                    onChange={handleChange}
                    placeholder="e.g., 101"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="route_name">Route Name *</label>
                  <input
                    type="text"
                    id="route_name"
                    name="route_name"
                    value={formData.route_name}
                    onChange={handleChange}
                    placeholder="e.g., Town Centre Shuttle"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional description of the route"
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label htmlFor="registration_number">Registration Number</label>
                <input
                  type="text"
                  id="registration_number"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={handleChange}
                  placeholder="Section 22 registration reference"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Journey Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="origin_point">Origin *</label>
                  <input
                    type="text"
                    id="origin_point"
                    name="origin_point"
                    value={formData.origin_point}
                    onChange={handleChange}
                    placeholder="e.g., Bus Station"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="destination_point">Destination *</label>
                  <input
                    type="text"
                    id="destination_point"
                    name="destination_point"
                    value={formData.destination_point}
                    onChange={handleChange}
                    placeholder="e.g., Hospital"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Operating Schedule</h3>
              <div className="form-group">
                <label>Service Pattern</label>
                <div className="pattern-buttons">
                  <button
                    type="button"
                    className={`pattern-btn ${formData.service_pattern === 'daily' ? 'active' : ''}`}
                    onClick={() => handleServicePatternChange('daily')}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    className={`pattern-btn ${formData.service_pattern === 'weekdays' ? 'active' : ''}`}
                    onClick={() => handleServicePatternChange('weekdays')}
                  >
                    Weekdays
                  </button>
                  <button
                    type="button"
                    className={`pattern-btn ${formData.service_pattern === 'weekends' ? 'active' : ''}`}
                    onClick={() => handleServicePatternChange('weekends')}
                  >
                    Weekends
                  </button>
                  <button
                    type="button"
                    className={`pattern-btn ${formData.service_pattern === 'custom' ? 'active' : ''}`}
                    onClick={() => handleServicePatternChange('custom')}
                  >
                    Custom
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Operating Days</label>
                <div className="days-checkboxes">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                    <label key={day} className="day-checkbox">
                      <input
                        type="checkbox"
                        name={`operates_${day}`}
                        checked={formData[`operates_${day}` as keyof FormData] as boolean}
                        onChange={handleChange}
                      />
                      <span>{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_date">Start Date</label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="end_date">End Date</label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Status</h3>
              <div className="form-group">
                <label htmlFor="status">Route Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="planning">Planning</option>
                  <option value="registered">Registered</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Route'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'stops' && isEditing && (
          <div className="stops-section">
            <div className="stops-header">
              <h3>Route Stops</h3>
              <button
                className="btn-primary btn-sm"
                onClick={() => {
                  setEditingStop(null);
                  setStopFormData({
                    stop_sequence: stops.length + 1,
                    stop_name: '',
                    stop_address: '',
                    arrival_offset_minutes: '0',
                    departure_offset_minutes: '0',
                    dwell_time_minutes: '2',
                    is_timing_point: false,
                    is_pickup_point: true,
                    is_setdown_point: true
                  });
                  setShowStopForm(true);
                }}
              >
                + Add Stop
              </button>
            </div>

            {showStopForm && (
              <div className="stop-form">
                <h4>{editingStop ? 'Edit Stop' : 'Add New Stop'}</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Sequence #</label>
                    <input
                      type="number"
                      value={stopFormData.stop_sequence}
                      onChange={e => setStopFormData(prev => ({ ...prev, stop_sequence: parseInt(e.target.value) || 1 }))}
                      min="1"
                    />
                  </div>
                  <div className="form-group flex-2">
                    <label>Stop Name *</label>
                    <input
                      type="text"
                      value={stopFormData.stop_name}
                      onChange={e => setStopFormData(prev => ({ ...prev, stop_name: e.target.value }))}
                      placeholder="e.g., High Street"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={stopFormData.stop_address}
                    onChange={e => setStopFormData(prev => ({ ...prev, stop_address: e.target.value }))}
                    placeholder="Full address (optional)"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Arrival Offset (mins)</label>
                    <input
                      type="number"
                      value={stopFormData.arrival_offset_minutes}
                      onChange={e => setStopFormData(prev => ({ ...prev, arrival_offset_minutes: e.target.value }))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Departure Offset (mins)</label>
                    <input
                      type="number"
                      value={stopFormData.departure_offset_minutes}
                      onChange={e => setStopFormData(prev => ({ ...prev, departure_offset_minutes: e.target.value }))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Dwell Time (mins)</label>
                    <input
                      type="number"
                      value={stopFormData.dwell_time_minutes}
                      onChange={e => setStopFormData(prev => ({ ...prev, dwell_time_minutes: e.target.value }))}
                      min="0"
                    />
                  </div>
                </div>
                <div className="stop-checkboxes">
                  <label>
                    <input
                      type="checkbox"
                      checked={stopFormData.is_timing_point}
                      onChange={e => setStopFormData(prev => ({ ...prev, is_timing_point: e.target.checked }))}
                    />
                    Timing Point
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={stopFormData.is_pickup_point}
                      onChange={e => setStopFormData(prev => ({ ...prev, is_pickup_point: e.target.checked }))}
                    />
                    Pickup Point
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={stopFormData.is_setdown_point}
                      onChange={e => setStopFormData(prev => ({ ...prev, is_setdown_point: e.target.checked }))}
                    />
                    Set-down Point
                  </label>
                </div>
                <div className="stop-form-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setShowStopForm(false);
                      setEditingStop(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={handleAddStop}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : editingStop ? 'Update Stop' : 'Add Stop'}
                  </button>
                </div>
              </div>
            )}

            {stops.length === 0 ? (
              <div className="empty-stops">
                <p>No stops defined for this route yet.</p>
                <p className="hint">Add stops to define the journey sequence.</p>
              </div>
            ) : (
              <div className="stops-list">
                {stops.sort((a, b) => a.stop_sequence - b.stop_sequence).map(stop => (
                  <div key={stop.stop_id} className="stop-item">
                    <div className="stop-sequence">{stop.stop_sequence}</div>
                    <div className="stop-details">
                      <div className="stop-name">{stop.stop_name}</div>
                      {stop.stop_address && <div className="stop-address">{stop.stop_address}</div>}
                      <div className="stop-meta">
                        {stop.arrival_offset_minutes !== undefined && (
                          <span>+{stop.arrival_offset_minutes}min</span>
                        )}
                        {stop.is_timing_point && <span className="badge">Timing</span>}
                        {stop.is_pickup_point && <span className="badge">Pickup</span>}
                        {stop.is_setdown_point && <span className="badge">Set-down</span>}
                      </div>
                    </div>
                    <div className="stop-actions">
                      <button
                        className="btn-text"
                        onClick={() => handleEditStop(stop)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-text btn-danger"
                        onClick={() => handleDeleteStop(stop.stop_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
