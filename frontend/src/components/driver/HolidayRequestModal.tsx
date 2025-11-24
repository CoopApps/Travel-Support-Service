import { useState, FormEvent } from 'react';
import { driverDashboardApi } from '../../services/driverDashboardApi';

interface HolidayRequestModalProps {
  tenantId: number;
  driverId: number;
  balance: {
    allowance: number;
    used_days: number;
    pending_days: number;
    remaining_days: number;
  };
  onClose: () => void;
  onSuccess: () => void;
  isFreelance?: boolean;
}

/**
 * Holiday Request Modal
 *
 * Professional holiday request interface
 * Mobile-friendly design
 */
function HolidayRequestModal({ tenantId, driverId, balance, onClose, onSuccess, isFreelance = false }: HolidayRequestModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('annual');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate working days
  const calculateWorkingDays = (): number => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) return 0;

    let workingDays = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Exclude weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  };

  const workingDays = calculateWorkingDays();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    if (workingDays === 0) {
      setError('Request must include at least one working day');
      return;
    }

    if (type === 'annual' && workingDays > balance.remaining_days) {
      setError(`You only have ${balance.remaining_days} days remaining`);
      return;
    }

    setSubmitting(true);
    try {
      await driverDashboardApi.submitHolidayRequest(tenantId, driverId, {
        startDate,
        endDate,
        type,
        notes
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            {isFreelance ? 'Request Time Off' : 'Request Holiday'}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--gray-600)' }}>
            {isFreelance
              ? 'Submit an unpaid leave request'
              : 'Submit a paid holiday request for approval'
            }
          </p>
        </div>

        {/* Balance Summary */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'var(--gray-50)',
          borderBottom: '1px solid var(--gray-200)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
            gap: '1rem',
            fontSize: '13px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '20px' }}>
                {balance.allowance}
              </div>
              <div style={{ color: 'var(--gray-600)', fontSize: '12px' }}>Total</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '20px' }}>
                {balance.used_days}
              </div>
              <div style={{ color: 'var(--gray-600)', fontSize: '12px' }}>Used</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '20px' }}>
                {balance.pending_days}
              </div>
              <div style={{ color: 'var(--gray-600)', fontSize: '12px' }}>Pending</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#10b981', fontSize: '20px' }}>
                {balance.remaining_days}
              </div>
              <div style={{ color: 'var(--gray-600)', fontSize: '12px' }}>Available</div>
            </div>
          </div>
          {isFreelance && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.5rem',
              background: '#fff3e0',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#e65100',
              textAlign: 'center'
            }}>
              Note: As a freelance driver, time off is unpaid
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {/* Date Range */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
              Date Range <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '12px', color: 'var(--gray-600)' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="form-control"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '12px', color: 'var(--gray-600)' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="form-control"
                  min={startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            {workingDays > 0 && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#1e40af'
              }}>
                <strong>{workingDays}</strong> working day{workingDays !== 1 ? 's' : ''}
                {type === 'annual' && balance.remaining_days >= workingDays && (
                  <span> • {balance.remaining_days - workingDays} days remaining after</span>
                )}
              </div>
            )}
          </div>

          {/* Type */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
              Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              className="form-control"
            >
              <option value="annual">Annual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="unpaid">Unpaid Leave</option>
              <option value="personal">Personal Leave</option>
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information"
              className="form-control"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || workingDays === 0}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HolidayRequestModal;
