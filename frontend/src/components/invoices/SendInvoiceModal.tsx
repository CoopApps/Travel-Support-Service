import React, { useState } from 'react';
import { invoiceApi } from '../../services/api';
import { XIcon, SendIcon } from './InvoiceIcons';
import './SendInvoiceModal.css';

interface Props {
  invoiceId: number;
  tenantId: number;
  currentEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const SendInvoiceModal: React.FC<Props> = ({
  invoiceId,
  tenantId,
  currentEmail,
  onClose,
  onSuccess
}) => {
  const [toEmail, setToEmail] = useState(currentEmail || '');
  const [ccEmail, setCcEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!toEmail.trim()) {
      setError('Recipient email is required');
      return;
    }

    setSending(true);
    try {
      await invoiceApi.sendInvoice(tenantId, invoiceId, {
        to_email: toEmail,
        cc_email: ccEmail || undefined
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content send-invoice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <SendIcon size={24} />
            Send Invoice
          </h3>
          <button className="modal-close" onClick={onClose}>
            <XIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="to-email">Recipient Email *</label>
              <input
                id="to-email"
                type="email"
                className="form-control"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="customer@example.com"
                required
              />
              <small className="form-text">Invoice will be sent to this email address</small>
            </div>

            <div className="form-group">
              <label htmlFor="cc-email">CC Email (Optional)</label>
              <input
                id="cc-email"
                type="email"
                className="form-control"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="accounting@example.com"
              />
              <small className="form-text">Carbon copy recipient</small>
            </div>

            <div className="info-box">
              <p>
                <strong>What happens next:</strong>
              </p>
              <ul>
                <li>Invoice PDF will be generated</li>
                <li>Email will be sent with PDF attachment</li>
                <li>Invoice status will be updated to "sent"</li>
              </ul>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !toEmail.trim()}
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <SendIcon size={16} />
                  Send Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
