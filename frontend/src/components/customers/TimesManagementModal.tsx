import { useState, FormEvent } from 'react';
import { Customer, WeeklySchedule, DaySchedule } from '../../types';
import { customerApi } from '../../services/api';

interface TimesManagementModalProps {
  customer: Customer;
  tenantId: number;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Times Management Modal
 *
 * Allows setting pickup and return times for each enabled day
 */
function TimesManagementModal({ customer, tenantId, onClose }: TimesManagementModalProps) {
  const initialSchedule: WeeklySchedule = (customer.schedule as WeeklySchedule) || {
    monday: { enabled: false },
    tuesday: { enabled: false },
    wednesday: { enabled: false },
    thursday: { enabled: false },
    friday: { enabled: false },
    saturday: { enabled: false },
    sunday: { enabled: false },
  };

  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const dayNames: (keyof WeeklySchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Get only enabled days
  const enabledDays = dayNames.filter(day => schedule[day]?.enabled);

  /**
   * Update day field
   */
  const updateDayField = (day: keyof WeeklySchedule, field: keyof DaySchedule, value: any) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      }
    }));
  };

  /**
   * Handle save times
   */
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await customerApi.updateTimes(tenantId, customer.id, schedule);
      setSuccess('Times saved successfully!');
      setTimeout(() => onClose(true), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save times');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}
        onClick={() => onClose(false)}
      >
        {/* Modal Content */}
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="card-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              Set Pickup & Return Times - {customer.name}
            </h2>
            <button
              onClick={() => onClose(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--gray-500)',
                padding: '0.25rem',
              }}
            >
              ×
            </button>
          </div>

          <div className="card-body">
            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                {success}
              </div>
            )}

            {enabledDays.length === 0 ? (
              /* No enabled days */
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
                  No days are currently enabled in the schedule.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                  Please configure the weekly schedule first before setting times.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onClose(false)}
                  style={{ marginTop: '1rem' }}
                >
                  Close
                </button>
              </div>
            ) : (
              /* Times Form */
              <form onSubmit={handleSave}>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                    Set pickup and return times for each scheduled day of service.
                  </p>
                </div>

                {/* Days List */}
                {enabledDays.map((day) => {
                  const dayData = schedule[day] as DaySchedule;
                  const dayIndex = dayNames.indexOf(day);

                  return (
                    <div
                      key={day}
                      style={{
                        border: '1px solid var(--gray-200)',
                        borderRadius: '8px',
                        padding: '14px',
                        marginBottom: '12px',
                        background: '#f8fff8',
                      }}
                    >
                      {/* Day Header */}
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: 'var(--gray-900)' }}>
                        {dayLabels[dayIndex]}
                        {dayData.destination && (
                          <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--gray-600)', marginLeft: '8px' }}>
                            → {dayData.destination}
                          </span>
                        )}
                      </div>

                      {/* Time Inputs */}
                      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor={`${day}-pickup`} style={{ fontSize: '12px' }}>Pickup Time</label>
                          <input
                            id={`${day}-pickup`}
                            type="time"
                            value={dayData.pickupTime || ''}
                            onChange={(e) => updateDayField(day, 'pickupTime', e.target.value)}
                            disabled={loading}
                            style={{ fontSize: '13px', padding: '8px 12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor={`${day}-return`} style={{ fontSize: '12px' }}>Return Time</label>
                          <input
                            id={`${day}-return`}
                            type="time"
                            value={dayData.returnTime || ''}
                            onChange={(e) => updateDayField(day, 'returnTime', e.target.value)}
                            disabled={loading}
                            style={{ fontSize: '13px', padding: '8px 12px' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onClose(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-action btn-times"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Times'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default TimesManagementModal;
