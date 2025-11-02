import React, { useState } from 'react';
import Modal from '../common/Modal';
import { HolidayBalance } from '../../types/holiday.types';

interface BalanceAdjustmentModalProps {
  balance: HolidayBalance | null;
  onClose: () => void;
  onSave: (driverId: number, adjustment: number, reason: string) => Promise<void>;
}

const BalanceAdjustmentModal: React.FC<BalanceAdjustmentModalProps> = ({
  balance,
  onClose,
  onSave
}) => {
  const [adjustment, setAdjustment] = useState<string>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!balance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const adjustmentValue = parseFloat(adjustment);

    if (isNaN(adjustmentValue) || adjustmentValue === 0) {
      setError('Please enter a valid non-zero adjustment amount');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    // Validate that adjustment won't make remaining days negative
    const newRemaining = balance.remaining_days + adjustmentValue;
    if (newRemaining < 0) {
      setError(`This adjustment would result in ${newRemaining} remaining days. Cannot go below 0.`);
      return;
    }

    setSaving(true);

    try {
      await onSave(balance.driver_id, adjustmentValue, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust balance');
    } finally {
      setSaving(false);
    }
  };

  const newAllowance = balance.allowance + parseFloat(adjustment || '0');
  const newRemaining = balance.remaining_days + parseFloat(adjustment || '0');

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Adjust Holiday Balance"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="balance-adjustment-form">
        <div className="driver-info-panel">
          <h4>{balance.name}</h4>
          <div className="current-balance-info">
            <div className="balance-row">
              <span className="balance-label">Current Allowance:</span>
              <span className="balance-value">{balance.allowance} days</span>
            </div>
            <div className="balance-row">
              <span className="balance-label">Used:</span>
              <span className="balance-value">{balance.used_days} days</span>
            </div>
            <div className="balance-row">
              <span className="balance-label">Pending:</span>
              <span className="balance-value">{balance.pending_days} days</span>
            </div>
            <div className="balance-row">
              <span className="balance-label">Remaining:</span>
              <span className="balance-value strong">{balance.remaining_days} days</span>
            </div>
            {balance.carried_over > 0 && (
              <div className="balance-row">
                <span className="balance-label">Carried Over:</span>
                <span className="balance-value">{balance.carried_over} days</span>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="adjustment">
            Adjustment Amount (days) <span className="required">*</span>
          </label>
          <input
            id="adjustment"
            type="number"
            step="0.5"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
            className="form-control"
            placeholder="e.g., +5 or -2.5"
            required
            autoFocus
          />
          <small className="form-text">
            Use positive numbers to add days, negative to subtract. Decimals allowed for half days.
          </small>
        </div>

        {adjustment && parseFloat(adjustment) !== 0 && (
          <div className="adjustment-preview">
            <h5>Preview:</h5>
            <div className="preview-grid">
              <div className="preview-item">
                <span className="preview-label">New Allowance:</span>
                <span className={`preview-value ${newAllowance < balance.allowance ? 'text-danger' : 'text-success'}`}>
                  {newAllowance.toFixed(1)} days
                  {newAllowance !== balance.allowance && (
                    <span className="change-indicator">
                      ({parseFloat(adjustment) > 0 ? '+' : ''}{parseFloat(adjustment).toFixed(1)})
                    </span>
                  )}
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-label">New Remaining:</span>
                <span className={`preview-value ${
                  newRemaining < 0 ? 'text-danger' :
                  newRemaining < balance.remaining_days ? 'text-warning' :
                  'text-success'
                }`}>
                  {newRemaining.toFixed(1)} days
                  {newRemaining !== balance.remaining_days && (
                    <span className="change-indicator">
                      ({parseFloat(adjustment) > 0 ? '+' : ''}{parseFloat(adjustment).toFixed(1)})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {newRemaining < 0 && (
              <div className="alert alert-danger">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                This adjustment will result in negative remaining days, which is not allowed.
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="reason">
            Reason for Adjustment <span className="required">*</span>
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="form-control"
            rows={4}
            placeholder="Explain why this adjustment is being made..."
            required
          />
          <small className="form-text">
            This reason will be recorded in the system for audit purposes.
          </small>
        </div>

        {error && (
          <div className="alert alert-danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {error}
          </div>
        )}

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || newRemaining < 0 || !adjustment || parseFloat(adjustment) === 0 || !reason.trim()}
          >
            {saving ? (
              <>
                <span className="spinner-small"></span>
                Saving...
              </>
            ) : (
              'Apply Adjustment'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BalanceAdjustmentModal;
