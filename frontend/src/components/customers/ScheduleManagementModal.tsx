import { useState, useEffect, FormEvent } from 'react';
import { Customer, WeeklySchedule, DaySchedule, Driver } from '../../types';
import { customerApi, driverApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface ScheduleManagementModalProps {
  customer: Customer;
  tenantId: number;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Schedule Management Modal - Matching Legacy Design
 *
 * Configure outbound (morning) and return (afternoon) journeys for each day
 */
function ScheduleManagementModal({ customer, tenantId, onClose }: ScheduleManagementModalProps) {
  const toast = useToast();
  const initialSchedule: WeeklySchedule = (customer.schedule as WeeklySchedule) || {
    monday: { enabled: false, returnDestination: 'Home' },
    tuesday: { enabled: false, returnDestination: 'Home' },
    wednesday: { enabled: false, returnDestination: 'Home' },
    thursday: { enabled: false, returnDestination: 'Home' },
    friday: { enabled: false, returnDestination: 'Home' },
    saturday: { enabled: false, returnDestination: 'Home' },
    sunday: { enabled: false, returnDestination: 'Home' },
  };

  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule);
  const [expandedDay, setExpandedDay] = useState<keyof WeeklySchedule | null>('monday');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Fetch drivers on mount
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await driverApi.getDrivers(tenantId, { limit: 100 });
        setDrivers(response.drivers || []);
      } catch {
        // Error handled silently
      }
    };
    fetchDrivers();
  }, [tenantId]);

  const dayNames: (keyof WeeklySchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  /**
   * Toggle day enabled
   */
  const toggleDay = (day: keyof WeeklySchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day]?.enabled,
        returnDestination: prev[day]?.returnDestination || 'Home',
      }
    }));
  };

  /**
   * Update day field
   */
  const updateDayField = (day: keyof WeeklySchedule, field: keyof DaySchedule, value: any) => {
    setSchedule(prev => {
      const dayData = prev[day] || { enabled: false };
      const updated = {
        ...prev,
        [day]: {
          ...dayData,
          [field]: value,
        }
      };

      // Calculate daily cost if morning or afternoon cost changed
      if (field === 'morningCost' || field === 'afternoonCost') {
        const morning = field === 'morningCost' ? value : (dayData.morningCost || 0);
        const afternoon = field === 'afternoonCost' ? value : (dayData.afternoonCost || 0);
        if (updated[day]) {
          updated[day]!.dailyCost = morning + afternoon;
        }
      }

      return updated;
    });
  };

  /**
   * Calculate daily total for a day
   */
  const getDailyTotal = (day: keyof WeeklySchedule): number => {
    const dayData = schedule[day];
    if (!dayData?.enabled) return 0;
    const morning = dayData.morningCost || 0;
    const afternoon = dayData.afternoonCost || 0;
    return morning + afternoon;
  };

  /**
   * Apply settings to all weekdays (Mon-Fri)
   */
  const applyToWeekdays = () => {
    if (!expandedDay || !schedule[expandedDay]?.enabled) {
      toast.warning('Please select and configure a day first');
      return;
    }

    const template = schedule[expandedDay];
    const weekdays: (keyof WeeklySchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    setSchedule(prev => {
      const updated = { ...prev };
      weekdays.forEach(day => {
        updated[day] = {
          enabled: true,
          destination: template.destination,
          pickupTime: template.pickupTime,
          returnDestination: template.returnDestination || 'Home',
          returnTime: template.returnTime,
          morningCost: template.morningCost,
          afternoonCost: template.afternoonCost,
          dailyCost: (template.morningCost || 0) + (template.afternoonCost || 0),
        };
      });
      return updated;
    });
  };

  /**
   * Apply settings to all days
   */
  const applyToAllDays = () => {
    if (!expandedDay || !schedule[expandedDay]?.enabled) {
      toast.warning('Please select and configure a day first');
      return;
    }

    const template = schedule[expandedDay];

    setSchedule(prev => {
      const updated = { ...prev };
      dayNames.forEach(day => {
        updated[day] = {
          enabled: true,
          destination: template.destination,
          pickupTime: template.pickupTime,
          returnDestination: template.returnDestination || 'Home',
          returnTime: template.returnTime,
          morningCost: template.morningCost,
          afternoonCost: template.afternoonCost,
          dailyCost: (template.morningCost || 0) + (template.afternoonCost || 0),
        };
      });
      return updated;
    });
  };

  /**
   * Clear all schedule data
   */
  const clearAll = () => {
    if (!window.confirm('Are you sure you want to clear all schedule data?')) {
      return;
    }

    setSchedule({
      monday: { enabled: false, returnDestination: 'Home' },
      tuesday: { enabled: false, returnDestination: 'Home' },
      wednesday: { enabled: false, returnDestination: 'Home' },
      thursday: { enabled: false, returnDestination: 'Home' },
      friday: { enabled: false, returnDestination: 'Home' },
      saturday: { enabled: false, returnDestination: 'Home' },
      sunday: { enabled: false, returnDestination: 'Home' },
    });
    toast.success('Schedule cleared');
  };

  /**
   * Handle save schedule
   */
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await customerApi.updateSchedule(tenantId, customer.id, schedule);
      setSuccess('Schedule saved successfully!');
      setTimeout(() => onClose(true), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save schedule');
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
            maxWidth: '1000px',
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
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', marginBottom: '4px' }}>
                Manage Weekly Schedule - {customer.name}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                Configure outbound (morning) and return (afternoon) journeys for each day
              </p>
            </div>
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

            {/* Schedule Form */}
            <form onSubmit={handleSave}>
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={applyToWeekdays}
                  disabled={loading}
                >
                  Apply to All Weekdays
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={applyToAllDays}
                  disabled={loading}
                >
                  Apply to All Days
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={clearAll}
                  disabled={loading}
                  style={{ marginLeft: 'auto' }}
                >
                  Clear All
                </button>
              </div>

              {/* Days List */}
              {dayNames.map((day, index) => {
                const dayData = schedule[day] || { enabled: false, returnDestination: 'Home' };
                const isEnabled = dayData.enabled;
                const isExpanded = expandedDay === day;
                const dailyTotal = getDailyTotal(day);

                return (
                  <div
                    key={day}
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      background: isEnabled ? '#f8fff8' : 'var(--gray-50)',
                    }}
                  >
                    {/* Day Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid var(--gray-200)' : 'none',
                      }}
                      onClick={() => setExpandedDay(isExpanded ? null : day)}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleDay(day);
                        }}
                        disabled={loading}
                        style={{ width: 'auto', marginRight: '10px' }}
                      />
                      <label style={{ fontWeight: 600, fontSize: '14px', marginBottom: 0, cursor: 'pointer', flex: 1 }}>
                        {dayLabels[index]}
                      </label>
                      {isEnabled && (
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)', marginRight: '12px' }}>
                          Daily Total: £{dailyTotal.toFixed(2)}
                        </span>
                      )}
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>

                    {/* Day Details (expanded) */}
                    {isExpanded && isEnabled && (
                      <div style={{ padding: '14px' }}>
                        {/* Morning Outbound Journey */}
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--gray-700)' }}>
                            Morning Outbound Journey
                          </h4>
                          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '2fr 1fr 1fr' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor={`${day}-destination`} style={{ fontSize: '12px' }}>
                                From Home To <span style={{ color: 'var(--danger)' }}>*</span>
                              </label>
                              <input
                                id={`${day}-destination`}
                                type="text"
                                value={dayData.destination || ''}
                                onChange={(e) => updateDayField(day, 'destination', e.target.value)}
                                disabled={loading}
                                placeholder="e.g., Day Centre, Hospital, Therapy..."
                                style={{ fontSize: '13px', padding: '8px 12px' }}
                              />
                            </div>
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
                              <label htmlFor={`${day}-morning-cost`} style={{ fontSize: '12px' }}>Morning Cost (£)</label>
                              <input
                                id={`${day}-morning-cost`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={dayData.morningCost || ''}
                                onChange={(e) => updateDayField(day, 'morningCost', parseFloat(e.target.value) || 0)}
                                disabled={loading}
                                placeholder="0.00"
                                style={{ fontSize: '13px', padding: '8px 12px' }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr', marginTop: '8px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor={`${day}-morning-driver`} style={{ fontSize: '12px' }}>
                                Regular Morning Driver
                              </label>
                              <select
                                id={`${day}-morning-driver`}
                                value={dayData.morningDriverId || ''}
                                onChange={(e) => {
                                  const driverId = parseInt(e.target.value);
                                  const driver = drivers.find(d => d.driver_id === driverId);
                                  updateDayField(day, 'morningDriverId', driverId || undefined);
                                  updateDayField(day, 'morningDriverName', driver?.name || undefined);
                                }}
                                disabled={loading}
                                style={{ fontSize: '13px', padding: '8px 12px' }}
                              >
                                <option value="">No regular driver</option>
                                {drivers.map(driver => (
                                  <option key={driver.driver_id} value={driver.driver_id}>
                                    {driver.name}
                                  </option>
                                ))}
                              </select>
                              {dayData.morningDriverName && (
                                <small style={{ fontSize: '11px', color: 'var(--gray-600)', marginTop: '4px', display: 'block' }}>
                                  Current: {dayData.morningDriverName}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Afternoon Return Journey */}
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--gray-700)' }}>
                            Afternoon Return Journey
                          </h4>
                          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '2fr 1fr 1fr' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor={`${day}-return-dest`} style={{ fontSize: '12px' }}>Return Destination</label>
                              <input
                                id={`${day}-return-dest`}
                                type="text"
                                value={dayData.returnDestination || 'Home'}
                                onChange={(e) => updateDayField(day, 'returnDestination', e.target.value)}
                                disabled={loading}
                                placeholder="Home"
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
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor={`${day}-afternoon-cost`} style={{ fontSize: '12px' }}>Afternoon Cost (£)</label>
                              <input
                                id={`${day}-afternoon-cost`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={dayData.afternoonCost || ''}
                                onChange={(e) => updateDayField(day, 'afternoonCost', parseFloat(e.target.value) || 0)}
                                disabled={loading}
                                placeholder="0.00"
                                style={{ fontSize: '13px', padding: '8px 12px' }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr', marginTop: '8px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label htmlFor={`${day}-afternoon-driver`} style={{ fontSize: '12px' }}>
                                Regular Afternoon Driver
                              </label>
                              <select
                                id={`${day}-afternoon-driver`}
                                value={dayData.afternoonDriverId || ''}
                                onChange={(e) => {
                                  const driverId = parseInt(e.target.value);
                                  const driver = drivers.find(d => d.driver_id === driverId);
                                  updateDayField(day, 'afternoonDriverId', driverId || undefined);
                                  updateDayField(day, 'afternoonDriverName', driver?.name || undefined);
                                }}
                                disabled={loading}
                                style={{ fontSize: '13px', padding: '8px 12px' }}
                              >
                                <option value="">No regular driver</option>
                                {drivers.map(driver => (
                                  <option key={driver.driver_id} value={driver.driver_id}>
                                    {driver.name}
                                  </option>
                                ))}
                              </select>
                              {dayData.afternoonDriverName && (
                                <small style={{ fontSize: '11px', color: 'var(--gray-600)', marginTop: '4px', display: 'block' }}>
                                  Current: {dayData.afternoonDriverName}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                  className="btn btn-action btn-schedule"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default ScheduleManagementModal;
