import React, { useState, useEffect } from 'react';
import { busTimetablesApi, BusTimetable, BusRoute } from '../../services/busApi';
import { useTenant } from '../../context/TenantContext';
import './TimetableFormModal.css';

interface TimetableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  timetable?: BusTimetable | null;
  routes: BusRoute[];
  prefilled?: any;
}

interface FormData {
  route_id: string;
  service_name: string;
  departure_time: string;
  direction: 'outbound' | 'inbound' | 'circular';
  valid_from: string;
  valid_until: string;
  total_seats: string;
  wheelchair_spaces: string;
  status: 'scheduled' | 'active' | 'cancelled' | 'completed';
}

const initialFormData: FormData = {
  route_id: '',
  service_name: '',
  departure_time: '09:00',
  direction: 'outbound',
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
  total_seats: '16',
  wheelchair_spaces: '2',
  status: 'scheduled'
};

export default function TimetableFormModal({
  isOpen,
  onClose,
  onSuccess,
  timetable,
  routes,
  prefilled
}: TimetableFormModalProps) {
  const { tenant } = useTenant();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!timetable;

  useEffect(() => {
    if (timetable) {
      setFormData({
        route_id: timetable.route_id.toString(),
        service_name: timetable.service_name || '',
        departure_time: timetable.departure_time || '09:00',
        direction: timetable.direction || 'outbound',
        valid_from: timetable.valid_from?.split('T')[0] || '',
        valid_until: timetable.valid_until?.split('T')[0] || '',
        total_seats: timetable.total_seats?.toString() || '16',
        wheelchair_spaces: timetable.wheelchair_spaces?.toString() || '2',
        status: timetable.status || 'scheduled'
      });
    } else if (prefilled) {
      setFormData({
        route_id: prefilled.route_id || '',
        service_name: prefilled.service_name || '',
        departure_time: prefilled.departure_time || '09:00',
        direction: prefilled.direction || 'outbound',
        valid_from: prefilled.valid_from || new Date().toISOString().split('T')[0],
        valid_until: prefilled.valid_until || '',
        total_seats: prefilled.total_seats || '16',
        wheelchair_spaces: prefilled.wheelchair_spaces || '2',
        status: prefilled.status || 'scheduled'
      });
    } else {
      setFormData(initialFormData);
    }
  }, [timetable, prefilled]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-generate service name when route changes
    if (name === 'route_id' && value) {
      const selectedRoute = routes.find(r => r.route_id === parseInt(value));
      if (selectedRoute && !formData.service_name) {
        const timeStr = formData.departure_time || '09:00';
        const direction = formData.direction || 'outbound';
        setFormData(prev => ({
          ...prev,
          [name]: value,
          service_name: `${selectedRoute.route_number} ${direction.charAt(0).toUpperCase() + direction.slice(1)} ${timeStr}`
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.tenant_id) return;

    // Validation
    if (!formData.route_id) {
      setError('Please select a route');
      return;
    }
    if (!formData.service_name.trim()) {
      setError('Service name is required');
      return;
    }
    if (!formData.departure_time) {
      setError('Departure time is required');
      return;
    }
    if (!formData.valid_from) {
      setError('Valid from date is required');
      return;
    }
    if (!formData.total_seats || parseInt(formData.total_seats) < 1) {
      setError('Total seats must be at least 1');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: any = {
        route_id: parseInt(formData.route_id),
        service_name: formData.service_name.trim(),
        departure_time: formData.departure_time,
        direction: formData.direction,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || undefined,
        total_seats: parseInt(formData.total_seats),
        wheelchair_spaces: parseInt(formData.wheelchair_spaces) || 0,
        status: formData.status
      };

      if (isEditing && timetable) {
        await busTimetablesApi.updateTimetable(tenant.tenant_id, timetable.timetable_id, payload);
      } else {
        await busTimetablesApi.createTimetable(tenant.tenant_id, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save timetable:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save timetable');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedRoute = () => {
    if (!formData.route_id) return null;
    return routes.find(r => r.route_id === parseInt(formData.route_id));
  };

  if (!isOpen) return null;

  const selectedRoute = getSelectedRoute();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="timetable-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Timetable' : 'Create New Timetable'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="timetable-form">
          <div className="form-section">
            <h3>Route Selection</h3>
            <div className="form-group">
              <label htmlFor="route_id">Select Route *</label>
              <select
                id="route_id"
                name="route_id"
                value={formData.route_id}
                onChange={handleChange}
                required
                className="route-select"
              >
                <option value="">-- Select a Route --</option>
                {routes.map(route => (
                  <option key={route.route_id} value={route.route_id}>
                    {route.route_number} - {route.route_name} ({route.origin_point} → {route.destination_point})
                  </option>
                ))}
              </select>
            </div>

            {selectedRoute && (
              <div className="route-preview">
                <div className="route-preview-header">
                  <span className="route-badge">{selectedRoute.route_number}</span>
                  <span className="route-name">{selectedRoute.route_name}</span>
                </div>
                <div className="route-preview-journey">
                  {selectedRoute.origin_point} → {selectedRoute.destination_point}
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Service Details</h3>
            <div className="form-group">
              <label htmlFor="service_name">Service Name *</label>
              <input
                type="text"
                id="service_name"
                name="service_name"
                value={formData.service_name}
                onChange={handleChange}
                placeholder="e.g., Morning Express"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="departure_time">Departure Time *</label>
                <input
                  type="time"
                  id="departure_time"
                  name="departure_time"
                  value={formData.departure_time}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="direction">Direction *</label>
                <select
                  id="direction"
                  name="direction"
                  value={formData.direction}
                  onChange={handleChange}
                  required
                >
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                  <option value="circular">Circular</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Validity Period</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="valid_from">Valid From *</label>
                <input
                  type="date"
                  id="valid_from"
                  name="valid_from"
                  value={formData.valid_from}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="valid_until">Valid Until</label>
                <input
                  type="date"
                  id="valid_until"
                  name="valid_until"
                  value={formData.valid_until}
                  onChange={handleChange}
                />
                <span className="field-hint">Leave empty for ongoing service</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Capacity</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="total_seats">Total Seats *</label>
                <input
                  type="number"
                  id="total_seats"
                  name="total_seats"
                  value={formData.total_seats}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="wheelchair_spaces">Wheelchair Spaces</label>
                <input
                  type="number"
                  id="wheelchair_spaces"
                  name="wheelchair_spaces"
                  value={formData.wheelchair_spaces}
                  onChange={handleChange}
                  min="0"
                  max="10"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Status</h3>
            <div className="form-group">
              <label htmlFor="status">Timetable Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Timetable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
