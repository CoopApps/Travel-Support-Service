import { useState, FormEvent } from 'react';

interface HoursSubmissionModalProps {
  driverId: number;
  hourlyRate: number;
  overtimeRate: number;
  onSubmit: (data: {
    weekEnding: string;
    regularHours: number;
    overtimeHours: number;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
}

/**
 * Hours Submission Modal (Freelance Drivers Only)
 *
 * Allows freelance drivers to submit weekly hours worked
 */
function HoursSubmissionModal({
  driverId,
  hourlyRate,
  overtimeRate,
  onSubmit,
  onClose
}: HoursSubmissionModalProps) {
  const [weekEnding, setWeekEnding] = useState('');
  const [regularHours, setRegularHours] = useState<number>(0);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalHours = regularHours + overtimeHours;
  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * overtimeRate;
  const totalPay = regularPay + overtimePay;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!weekEnding) {
      setError('Please select week ending date');
      return;
    }

    if (regularHours < 0 || regularHours > 80) {
      setError('Regular hours must be between 0 and 80');
      return;
    }

    if (overtimeHours < 0 || overtimeHours > 40) {
      setError('Overtime hours must be between 0 and 40');
      return;
    }

    if (totalHours === 0) {
      setError('Total hours must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        weekEnding,
        regularHours,
        overtimeHours,
        notes
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit hours');
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
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            ⏱️ Submit Weekly Hours
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', opacity: 0.9 }}>
            Record your hours worked for payment processing
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              padding: '0.875rem',
              marginBottom: '1rem',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Week Ending */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
              Week Ending (Sunday) *
            </label>
            <input
              type="date"
              value={weekEnding}
              onChange={(e) => setWeekEnding(e.target.value)}
              required
              className="form-control"
              max={new Date().toISOString().split('T')[0]}
            />
            <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
              Select the Sunday at the end of the work week
            </div>
          </div>

          {/* Hours */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
              Regular Hours *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                value={regularHours}
                onChange={(e) => setRegularHours(Number(e.target.value))}
                min="0"
                max="80"
                step="0.5"
                required
                className="form-control"
                style={{ flex: 1 }}
              />
              <div style={{ fontSize: '14px', color: 'var(--gray-600)', minWidth: '120px', textAlign: 'right' }}>
                @ £{hourlyRate.toFixed(2)}/hr = £{regularPay.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
              Maximum 80 hours per week
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
              Overtime Hours
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(Number(e.target.value))}
                min="0"
                max="40"
                step="0.5"
                className="form-control"
                style={{ flex: 1 }}
              />
              <div style={{ fontSize: '14px', color: 'var(--gray-600)', minWidth: '120px', textAlign: 'right' }}>
                @ £{overtimeRate.toFixed(2)}/hr = £{overtimePay.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
              Maximum 40 overtime hours per week
            </div>
          </div>

          {/* Total Summary */}
          <div style={{
            padding: '1rem',
            background: 'var(--gray-50)',
            borderRadius: '8px',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>Total Hours:</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                {totalHours.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--gray-200)' }}>
              <span style={{ fontWeight: 600 }}>Total Payment:</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                £{totalPay.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your hours this week..."
              className="form-control"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
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
              disabled={submitting || totalHours === 0}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              }}
            >
              {submitting ? (
                <>
                  <span className="spinner-small"></span>
                  Submitting...
                </>
              ) : (
                'Submit Hours'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HoursSubmissionModal;
