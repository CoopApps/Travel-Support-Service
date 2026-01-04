import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { busTimetablesApi, BusTimetable } from '../../services/busApi';
import { AlertTriangleIcon } from '../icons/BusIcons';
import './ServiceCancellationModal.css';

interface ServiceCancellationModalProps {
  timetable: BusTimetable;
  serviceDate: string;
  passengerCount: number;
  onClose: () => void;
  onCancelled: () => void;
}

const CANCELLATION_REASONS = [
  { value: 'driver_unavailable', label: 'Driver unavailable' },
  { value: 'vehicle_breakdown', label: 'Vehicle breakdown' },
  { value: 'weather', label: 'Severe weather' },
  { value: 'low_demand', label: 'Low passenger demand' },
  { value: 'road_closure', label: 'Road closure / Obstruction' },
  { value: 'mechanical_issue', label: 'Vehicle mechanical issue' },
  { value: 'staff_shortage', label: 'Staff shortage' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other reason' }
];

export default function ServiceCancellationModal({
  timetable,
  serviceDate,
  passengerCount,
  onClose,
  onCancelled
}: ServiceCancellationModalProps) {
  const { tenant } = useTenant();
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notifyPassengers, setNotifyPassengers] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.tenant_id) return;

    if (!reason) {
      setError('Please select a cancellation reason');
      return;
    }

    const finalReason = reason === 'other' && customReason
      ? customReason
      : CANCELLATION_REASONS.find(r => r.value === reason)?.label || reason;

    setCancelling(true);
    setError(null);

    try {
      await busTimetablesApi.cancelService(tenant.tenant_id, timetable.timetable_id, {
        service_date: serviceDate,
        reason: finalReason,
        notify_passengers: notifyPassengers
      });

      onCancelled();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to cancel service'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="cancellation-modal-overlay" onClick={onClose}>
      <div className="cancellation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header warning">
          <div className="header-icon">
            <AlertTriangleIcon size={24} />
          </div>
          <div className="header-content">
            <h2>Cancel Service</h2>
            <p>This action will cancel the service for the selected date</p>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Service Info */}
            <div className="service-info-card">
              <div className="info-row">
                <span className="info-label">Service</span>
                <span className="info-value">
                  <span className="route-badge">{timetable.route_number}</span>
                  {timetable.service_name}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Departure</span>
                <span className="info-value">{formatTime(timetable.departure_time)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Date</span>
                <span className="info-value">{formatDate(serviceDate)}</span>
              </div>
              {passengerCount > 0 && (
                <div className="info-row warning">
                  <span className="info-label">Affected Passengers</span>
                  <span className="info-value passenger-warning">
                    <AlertTriangleIcon size={16} />
                    {passengerCount} passengers booked
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Reason Selection */}
            <div className="form-group">
              <label>Cancellation Reason *</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              >
                <option value="">Select a reason...</option>
                {CANCELLATION_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {reason === 'other' && (
              <div className="form-group">
                <label>Specify Reason *</label>
                <textarea
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Enter the reason for cancellation..."
                  rows={2}
                  required
                />
              </div>
            )}

            {/* Notification Toggle */}
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifyPassengers}
                  onChange={e => setNotifyPassengers(e.target.checked)}
                />
                <span className="checkbox-text">
                  Notify affected passengers
                  <span className="checkbox-hint">
                    {passengerCount > 0
                      ? `Send notification to ${passengerCount} passenger${passengerCount !== 1 ? 's' : ''}`
                      : 'No passengers currently booked'}
                  </span>
                </span>
              </label>
            </div>

            {/* Warning */}
            <div className="warning-box">
              <AlertTriangleIcon size={20} />
              <div>
                <strong>Warning:</strong> Cancelling this service will:
                <ul>
                  <li>Mark the service as cancelled for {formatDate(serviceDate)}</li>
                  <li>Prevent new bookings for this date</li>
                  {notifyPassengers && passengerCount > 0 && (
                    <li>Send notifications to {passengerCount} booked passengers</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Keep Service
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={cancelling || !reason}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
