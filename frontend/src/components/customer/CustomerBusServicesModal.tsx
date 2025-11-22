import React, { useState, useEffect } from 'react';
import { passengerAbsencesApi, RegularPassenger, PassengerAbsence } from '../../services/busApi';

interface CustomerBusServicesModalProps {
  tenantId: number;
  customerId: number;
  onClose: () => void;
}

/**
 * Customer Bus Services Modal
 *
 * Shows customer's regular bus service registrations and allows them to:
 * - View their regular bus services
 * - Report absences (sick days, holidays) without needing approval
 */
export default function CustomerBusServicesModal({
  tenantId,
  customerId,
  onClose
}: CustomerBusServicesModalProps) {
  const [services, setServices] = useState<RegularPassenger[]>([]);
  const [absences, setAbsences] = useState<PassengerAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Absence form state
  const [absenceDate, setAbsenceDate] = useState('');
  const [absenceReason, setAbsenceReason] = useState<'sick' | 'holiday' | 'appointment' | 'other'>('sick');
  const [absenceNotes, setAbsenceNotes] = useState('');
  const [absenceServiceId, setAbsenceServiceId] = useState<number | ''>('');

  useEffect(() => {
    loadData();
  }, [tenantId, customerId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [servicesData, absencesData] = await Promise.all([
        passengerAbsencesApi.getCustomerBusServices(tenantId, customerId),
        passengerAbsencesApi.getCustomerAbsences(tenantId, customerId, true)
      ]);
      setServices(servicesData || []);
      setAbsences(absencesData || []);
    } catch (err: any) {
      console.error('Failed to load bus services:', err);
      setError('Failed to load your bus services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceDate || !absenceReason) {
      setError('Please select a date and reason');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await passengerAbsencesApi.customerReportAbsence(tenantId, customerId, {
        absence_date: absenceDate,
        absence_reason: absenceReason,
        reason_notes: absenceNotes || undefined,
        timetable_id: absenceServiceId || undefined
      });

      setSuccess('Absence reported successfully. The office has been notified.');
      setShowAbsenceForm(false);
      setAbsenceDate('');
      setAbsenceReason('sick');
      setAbsenceNotes('');
      setAbsenceServiceId('');
      loadData();
    } catch (err: any) {
      console.error('Failed to report absence:', err);
      setError(err.response?.data?.error || 'Failed to report absence. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAbsence = async (absenceId: number) => {
    if (!window.confirm('Are you sure you want to cancel this absence? You will be expected on the bus.')) {
      return;
    }

    try {
      await passengerAbsencesApi.updateAbsence(tenantId, absenceId, { status: 'cancelled' });
      setSuccess('Absence cancelled. You are now expected on the bus.');
      loadData();
    } catch (err: any) {
      console.error('Failed to cancel absence:', err);
      setError('Failed to cancel absence. Please try again.');
    }
  };

  const formatDays = (service: RegularPassenger) => {
    const days = [];
    if (service.travels_monday) days.push('Mon');
    if (service.travels_tuesday) days.push('Tue');
    if (service.travels_wednesday) days.push('Wed');
    if (service.travels_thursday) days.push('Thu');
    if (service.travels_friday) days.push('Fri');
    if (service.travels_saturday) days.push('Sat');
    if (service.travels_sunday) days.push('Sun');
    return days.join(', ');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'sick': return 'Sick';
      case 'holiday': return 'Holiday';
      case 'appointment': return 'Appointment';
      default: return 'Other';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'sick':
        return (
          <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: '#dc2626', fill: 'none', strokeWidth: 2 }}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        );
      case 'holiday':
        return (
          <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: '#2563eb', fill: 'none', strokeWidth: 2 }}>
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
          </svg>
        );
      case 'appointment':
        return (
          <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: '#7c3aed', fill: 'none', strokeWidth: 2 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: '#6b7280', fill: 'none', strokeWidth: 2 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M8 6v12l6-6-6-6z" />
              <rect x="2" y="4" width="20" height="16" rx="2" />
            </svg>
            My Bus Services
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#16a34a', marginBottom: '1rem' }}>
              {success}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
              <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading your bus services...</p>
            </div>
          ) : services.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px', stroke: '#9ca3af', fill: 'none', strokeWidth: 1.5, margin: '0 auto 1rem' }}>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M8 10h8M8 14h4" />
              </svg>
              <p>You are not registered as a regular passenger on any bus services.</p>
              <p style={{ fontSize: '14px', marginTop: '0.5rem' }}>Contact the office to register for a regular service.</p>
            </div>
          ) : (
            <>
              {/* Regular Services */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
                  Your Regular Services
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {services.map(service => (
                    <div
                      key={service.regular_id}
                      style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ background: '#3b82f6', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>
                              {service.route_number}
                            </span>
                            <span style={{ fontWeight: 600, color: '#111827' }}>{service.service_name}</span>
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {service.route_name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{service.departure_time}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>Seat {service.seat_number}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '0.75rem', fontSize: '13px', color: '#6b7280', display: 'flex', gap: '1rem' }}>
                        <span>
                          <strong>Days:</strong> {formatDays(service)}
                        </span>
                        {service.boarding_stop_name && (
                          <span>
                            <strong>From:</strong> {service.boarding_stop_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report Absence Button */}
              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setShowAbsenceForm(!showAbsenceForm)}
                  style={{
                    background: showAbsenceForm ? '#e5e7eb' : '#3b82f6',
                    color: showAbsenceForm ? '#374151' : 'white',
                    border: 'none',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                    {showAbsenceForm ? (
                      <path d="M18 6L6 18M6 6l12 12" />
                    ) : (
                      <>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                      </>
                    )}
                  </svg>
                  {showAbsenceForm ? 'Cancel' : "I Won't Be Travelling"}
                </button>
              </div>

              {/* Absence Form */}
              {showAbsenceForm && (
                <form onSubmit={handleSubmitAbsence} style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '15px', fontWeight: 600, color: '#374151' }}>
                    Report an Absence
                  </h4>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '1rem' }}>
                    Let us know if you won't be travelling. No approval needed - just let us know so we can update the passenger list.
                  </p>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '0.25rem' }}>
                        Date *
                      </label>
                      <input
                        type="date"
                        value={absenceDate}
                        onChange={(e) => setAbsenceDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        disabled={submitting}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '0.25rem' }}>
                        Reason *
                      </label>
                      <select
                        value={absenceReason}
                        onChange={(e) => setAbsenceReason(e.target.value as any)}
                        required
                        disabled={submitting}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="sick">Sick / Unwell</option>
                        <option value="holiday">Holiday</option>
                        <option value="appointment">Appointment</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {services.length > 1 && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '0.25rem' }}>
                          Which service? (leave blank for all)
                        </label>
                        <select
                          value={absenceServiceId}
                          onChange={(e) => setAbsenceServiceId(e.target.value ? parseInt(e.target.value) : '')}
                          disabled={submitting}
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">All services on this day</option>
                          {services.map(s => (
                            <option key={s.timetable_id} value={s.timetable_id}>
                              {s.route_number} - {s.service_name} ({s.departure_time})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '0.25rem' }}>
                        Notes (optional)
                      </label>
                      <textarea
                        value={absenceNotes}
                        onChange={(e) => setAbsenceNotes(e.target.value)}
                        placeholder="Any additional information..."
                        disabled={submitting}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '0.625rem 1.25rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.7 : 1
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Report Absence'}
                    </button>
                  </div>
                </form>
              )}

              {/* Upcoming Absences */}
              {absences.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
                    Your Upcoming Absences
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {absences.map(absence => (
                      <div
                        key={absence.absence_id}
                        style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {getReasonIcon(absence.absence_reason)}
                          <div>
                            <div style={{ fontWeight: 500, color: '#111827' }}>
                              {formatDate(absence.absence_date)}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              {getReasonLabel(absence.absence_reason)}
                              {absence.service_name && ` - ${absence.service_name}`}
                              {!absence.timetable_id && ' (all services)'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelAbsence(absence.absence_id)}
                          style={{
                            background: 'none',
                            border: '1px solid #d1d5db',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '13px',
                            color: '#6b7280',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '1rem 1.5rem' }}>
          <button
            onClick={onClose}
            style={{
              background: '#e5e7eb',
              color: '#374151',
              border: 'none',
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
