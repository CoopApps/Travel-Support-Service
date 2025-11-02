import { useState, FormEvent } from 'react';

interface FuelCostsSubmissionModalProps {
  driverId: number;
  onSubmit: (data: {
    date: string;
    station: string;
    litres: number;
    cost: number;
    mileage?: number;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
}

/**
 * Fuel Costs Submission Modal (Freelance Drivers Only)
 *
 * Allows freelance drivers to submit fuel costs for reimbursement
 */
function FuelCostsSubmissionModal({
  driverId,
  onSubmit,
  onClose
}: FuelCostsSubmissionModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [station, setStation] = useState('');
  const [litres, setLitres] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [mileage, setMileage] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pricePerLitre = litres > 0 ? cost / litres : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Please select a date');
      return;
    }

    if (!station.trim()) {
      setError('Please enter the station name');
      return;
    }

    if (litres <= 0 || litres > 100) {
      setError('Litres must be between 0 and 100');
      return;
    }

    if (cost <= 0 || cost > 200) {
      setError('Cost must be between £0 and £200');
      return;
    }

    if (new Date(date) > new Date()) {
      setError('Date cannot be in the future');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        date,
        station: station.trim(),
        litres,
        cost,
        mileage,
        notes
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit fuel costs');
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
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            ⛽ Submit Fuel Costs
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', opacity: 0.9 }}>
            Submit fuel receipts for reimbursement
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

          {/* Date & Station */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="form-control"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
                Mileage (Optional)
              </label>
              <input
                type="number"
                value={mileage || ''}
                onChange={(e) => setMileage(e.target.value ? Number(e.target.value) : undefined)}
                min="0"
                step="1"
                placeholder="Current miles"
                className="form-control"
              />
            </div>
          </div>

          {/* Station Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
              Station Name *
            </label>
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              required
              placeholder="e.g., Shell, BP, Tesco"
              className="form-control"
            />
          </div>

          {/* Litres */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
              Litres *
            </label>
            <input
              type="number"
              value={litres}
              onChange={(e) => setLitres(Number(e.target.value))}
              min="0"
              max="100"
              step="0.01"
              required
              className="form-control"
              placeholder="0.00"
            />
            <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
              Maximum 100 litres per transaction
            </div>
          </div>

          {/* Cost */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
              Total Cost *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontWeight: 600,
                color: 'var(--gray-600)'
              }}>
                £
              </span>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                min="0"
                max="200"
                step="0.01"
                required
                className="form-control"
                style={{ paddingLeft: '28px' }}
                placeholder="0.00"
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
              Maximum £200 per transaction
            </div>
          </div>

          {/* Price Summary */}
          {pricePerLitre > 0 && (
            <div style={{
              padding: '1rem',
              background: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#92400e' }}>Price per Litre:</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>
                  £{pricePerLitre.toFixed(3)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px' }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              className="form-control"
              rows={2}
            />
          </div>

          {/* Receipt Upload Placeholder */}
          <div style={{
            padding: '1rem',
            background: 'var(--gray-50)',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            border: '2px dashed var(--gray-300)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>📄</div>
            <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
              Receipt Upload (Coming Soon)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
              Please keep your physical receipt until this feature is available
            </div>
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
              disabled={submitting || litres === 0 || cost === 0}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              }}
            >
              {submitting ? (
                <>
                  <span className="spinner-small"></span>
                  Submitting...
                </>
              ) : (
                'Submit Fuel Costs'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FuelCostsSubmissionModal;
