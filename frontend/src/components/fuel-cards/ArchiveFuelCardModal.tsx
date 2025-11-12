import React, { useState } from 'react';
import Modal from '../common/Modal';

interface ArchiveFuelCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  cardNumber: string;
}

const ArchiveFuelCardModal: React.FC<ArchiveFuelCardModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cardNumber,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for archiving this fuel card');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm(reason);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to archive fuel card');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Archive Fuel Card">
      <div style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
            You are about to archive fuel card ending in <strong>••••{cardNumber}</strong>.
          </p>
          <p style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
            Archived cards will no longer appear in the active list but can be restored later if needed.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="archive-reason" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Reason for archiving <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Card expired, Driver left company, etc."
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
            disabled={loading}
          />
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            background: 'var(--danger-50)',
            border: '1px solid var(--danger-200)',
            borderRadius: '6px',
            color: 'var(--danger-700)',
            marginBottom: '1rem',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '0.625rem 1.25rem',
              border: '1px solid var(--gray-300)',
              background: 'white',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '0.625rem 1.25rem',
              border: 'none',
              background: 'var(--warning)',
              color: 'white',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Archiving...' : 'Archive Card'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ArchiveFuelCardModal;
