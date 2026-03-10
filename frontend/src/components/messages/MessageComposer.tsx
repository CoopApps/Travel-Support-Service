import React from 'react';
import { Customer, RecipientType, DeliveryMethod, Priority } from '../../types/messages.types';

interface MessageComposerProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  selectedCustomerIds: number[];
  recipientType: RecipientType;
  title: string;
  messageContent: string;
  priority: Priority;
  expiresAt: string;
  deliveryMethod: DeliveryMethod;
  emailSubject: string;
  smsBody: string;
  scheduledAt: string;
  sending: boolean;
  onRecipientTypeChange: (type: RecipientType) => void;
  onTitleChange: (title: string) => void;
  onMessageChange: (message: string) => void;
  onPriorityChange: (priority: Priority) => void;
  onExpiresAtChange: (expiresAt: string) => void;
  onDeliveryMethodChange: (method: DeliveryMethod) => void;
  onEmailSubjectChange: (subject: string) => void;
  onSmsBodyChange: (body: string) => void;
  onScheduledAtChange: (scheduledAt: string) => void;
  onSend: (e: React.FormEvent, saveAsDraft?: boolean) => void;
  onCancel: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  customers,
  selectedCustomer,
  selectedCustomerIds,
  recipientType,
  title,
  messageContent,
  priority,
  expiresAt,
  deliveryMethod,
  emailSubject,
  smsBody,
  scheduledAt,
  sending,
  onRecipientTypeChange,
  onTitleChange,
  onMessageChange,
  onPriorityChange,
  onExpiresAtChange,
  onDeliveryMethodChange,
  onEmailSubjectChange,
  onSmsBodyChange,
  onScheduledAtChange,
  onSend,
  onCancel,
}) => {
  return (
    <div style={{ padding: '1.5rem', borderBottom: '2px solid var(--gray-200)', background: 'var(--gray-50)' }}>
      <form onSubmit={onSend}>
        {/* Recipient Selector */}
        <div className="form-group" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>
            Recipients <span style={{ color: '#dc3545' }}>*</span>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', background: recipientType === 'single' ? '#e3f2fd' : 'transparent' }}>
              <input
                type="radio"
                name="recipientType"
                value="single"
                checked={recipientType === 'single'}
                onChange={() => onRecipientTypeChange('single')}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: recipientType === 'single' ? 600 : 400 }}>
                Single Customer
                {recipientType === 'single' && selectedCustomer && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--gray-600)', fontWeight: 400 }}>
                    ({selectedCustomer.name})
                  </span>
                )}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', background: recipientType === 'multiple' ? '#e3f2fd' : 'transparent' }}>
              <input
                type="radio"
                name="recipientType"
                value="multiple"
                checked={recipientType === 'multiple'}
                onChange={() => onRecipientTypeChange('multiple')}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: recipientType === 'multiple' ? 600 : 400 }}>
                Multiple Customers
                {recipientType === 'multiple' && selectedCustomerIds.length > 0 && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--gray-600)', fontWeight: 400 }}>
                    ({selectedCustomerIds.length} selected)
                  </span>
                )}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', background: recipientType === 'all' ? '#e3f2fd' : 'transparent' }}>
              <input
                type="radio"
                name="recipientType"
                value="all"
                checked={recipientType === 'all'}
                onChange={() => onRecipientTypeChange('all')}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: recipientType === 'all' ? 600 : 400 }}>
                All Customers
                {recipientType === 'all' && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--gray-600)', fontWeight: 400 }}>
                    (Broadcast to all {customers.length} customers)
                  </span>
                )}
              </span>
            </label>
          </div>

          {recipientType === 'multiple' && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '4px', fontSize: '13px', color: '#856404' }}>
              Tip: Use the checkboxes in the customer list to select multiple recipients
            </div>
          )}
        </div>

        {/* Title */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="title" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
            Title <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <input
            id="title"
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Message subject"
            required
            disabled={sending}
          />
        </div>

        {/* Message */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="message" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
            Message <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <textarea
            id="message"
            className="form-control"
            value={messageContent}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Write your message..."
            rows={4}
            required
            disabled={sending}
          />
        </div>

        {/* Delivery Method Selection */}
        <div className="form-group" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>
            Delivery Method <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {(['in-app', 'email', 'sms', 'both'] as DeliveryMethod[]).map((method) => (
              <label
                key={method}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: deliveryMethod === method ? '2px solid var(--primary)' : '1px solid var(--gray-300)',
                  background: deliveryMethod === method ? '#e3f2fd' : 'white'
                }}
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  value={method}
                  checked={deliveryMethod === method}
                  onChange={() => onDeliveryMethodChange(method)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  disabled={sending}
                />
                <span style={{ fontSize: '14px', fontWeight: deliveryMethod === method ? 600 : 400 }}>
                  {method === 'in-app' ? 'In-App Only' : method === 'email' ? 'Email' : method === 'sms' ? 'SMS' : 'Email + SMS'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Email Subject (conditional) */}
        {(deliveryMethod === 'email' || deliveryMethod === 'both') && (
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="emailSubject" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              Email Subject <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              id="emailSubject"
              type="text"
              className="form-control"
              value={emailSubject}
              onChange={(e) => onEmailSubjectChange(e.target.value)}
              placeholder="Enter email subject"
              required
              disabled={sending}
            />
          </div>
        )}

        {/* SMS Body (conditional) */}
        {(deliveryMethod === 'sms' || deliveryMethod === 'both') && (
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="smsBody" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              SMS Message <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <textarea
              id="smsBody"
              className="form-control"
              value={smsBody}
              onChange={(e) => onSmsBodyChange(e.target.value)}
              placeholder="Enter SMS message (max 160 characters)"
              rows={3}
              maxLength={160}
              required
              disabled={sending}
            />
            <div style={{ fontSize: '12px', color: smsBody.length > 140 ? '#dc3545' : 'var(--gray-600)', textAlign: 'right', marginTop: '4px' }}>
              {smsBody.length}/160 characters
            </div>
          </div>
        )}

        {/* Priority and Expiry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label htmlFor="priority" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              Priority
            </label>
            <select
              id="priority"
              className="form-control"
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value as Priority)}
              disabled={sending}
            >
              <option value="normal">Info</option>
              <option value="high">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="expires" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              Expiry (Optional)
            </label>
            <input
              id="expires"
              type="datetime-local"
              className="form-control"
              value={expiresAt}
              onChange={(e) => onExpiresAtChange(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              disabled={sending}
            />
          </div>
        </div>

        {/* Scheduled Send */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="scheduledAt" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Schedule for Later (Optional)
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--gray-600)' }}>Leave empty to send immediately</span>
          </label>
          <input
            id="scheduledAt"
            type="datetime-local"
            className="form-control"
            value={scheduledAt}
            onChange={(e) => onScheduledAtChange(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            disabled={sending}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={sending}
          >
            {sending ? 'Sending...' : scheduledAt ? 'Schedule Message' : 'Send Message'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={(e) => onSend(e as any, true)}
            disabled={sending}
          >
            {sending ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={sending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageComposer;
