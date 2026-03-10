import React from 'react';
import { TenantMessage, CustomerMessage, Customer, ViewMode } from '../../types/messages.types';
import {
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
  getStatusLabel,
  getDeliveryStatusColor,
  getDeliveryStatusLabel,
  getDeliveryMethodLabel,
  formatDate,
} from '../../utils/messageHelpers';

interface MessageThreadProps {
  selectedCustomer: Customer | null;
  viewMode: ViewMode;
  sentMessages: TenantMessage[];
  inboxMessages: CustomerMessage[];
  loadingMessages: boolean;
  onMarkAsRead: (messageId: number) => void;
  onReply: (message: CustomerMessage) => void;
  onDelete: (messageId: number) => void;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  selectedCustomer,
  viewMode,
  sentMessages,
  inboxMessages,
  loadingMessages,
  onMarkAsRead,
  onReply,
  onDelete,
}) => {
  // If no customer selected, show empty state
  if (!selectedCustomer) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: 'var(--gray-500)'
      }}>
        <svg viewBox="0 0 24 24" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', stroke: 'var(--gray-400)', fill: 'none', strokeWidth: 1.5 }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p style={{ fontSize: '16px', fontWeight: 500 }}>Select a customer to view messages</p>
        <p style={{ fontSize: '14px', marginTop: '0.5rem' }}>Or click "New Message" to compose a message to multiple/all customers</p>
      </div>
    );
  }

  // Loading state
  if (loadingMessages) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading messages...</p>
        </div>
      </div>
    );
  }

  // Render inbox messages
  if (viewMode === 'inbox') {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        {inboxMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
            <svg viewBox="0 0 24 24" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', stroke: 'var(--gray-400)', fill: 'none', strokeWidth: 1.5 }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <path d="M22 6l-10 7L2 6" />
            </svg>
            <p style={{ fontSize: '16px', marginBottom: '0.5rem' }}>No messages from this customer</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {inboxMessages.map((msg) => (
              <div
                key={msg.message_id}
                style={{
                  background: msg.status === 'unread' ? '#fff3cd' : 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  position: 'relative'
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  padding: '4px 10px',
                  background: `${getStatusColor(msg.status)}20`,
                  color: getStatusColor(msg.status),
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '0.75rem'
                }}>
                  {getStatusLabel(msg.status)}
                </div>

                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                  {msg.subject}
                </h4>

                <p style={{ margin: '0 0 1rem 0', fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {msg.message}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                    Received {formatDate(msg.created_at)}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {msg.status === 'unread' && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onMarkAsRead(msg.message_id)}
                        style={{ padding: '4px 12px', fontSize: '13px' }}
                      >
                        Mark Read
                      </button>
                    )}
                    {msg.status !== 'replied' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => onReply(msg)}
                        style={{ padding: '4px 12px', fontSize: '13px' }}
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>

                {msg.status === 'replied' && msg.reply_title && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#d1e7dd', borderRadius: '4px', fontSize: '13px', color: '#0f5132' }}>
                    Replied with: {msg.reply_title}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render sent messages
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
      {sentMessages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
          <svg viewBox="0 0 24 24" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', stroke: 'var(--gray-400)', fill: 'none', strokeWidth: 1.5 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <path d="M22 6l-10 7L2 6" />
          </svg>
          <p style={{ fontSize: '16px', marginBottom: '0.5rem' }}>No messages sent</p>
          <p style={{ fontSize: '14px' }}>Send your first message to {selectedCustomer.name}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sentMessages.map((msg) => (
            <div
              key={msg.message_id}
              style={{
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: '8px',
                padding: '1.25rem',
                position: 'relative'
              }}
            >
              {/* Status Badges Row */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '4px 10px',
                  background: `${getPriorityColor(msg.priority)}20`,
                  color: getPriorityColor(msg.priority),
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {getPriorityLabel(msg.priority)}
                </div>

                {/* Delivery Status Badge */}
                <div style={{
                  display: 'inline-flex',
                  padding: '4px 10px',
                  background: `${getDeliveryStatusColor(msg.status)}20`,
                  color: getDeliveryStatusColor(msg.status),
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {getDeliveryStatusLabel(msg.status)}
                </div>

                {/* Delivery Method Badge */}
                <div style={{
                  display: 'inline-flex',
                  padding: '4px 10px',
                  background: '#e3f2fd',
                  color: '#0d6efd',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {getDeliveryMethodLabel(msg.delivery_method)}
                </div>
              </div>

              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                {msg.title}
              </h4>

              {/* Email Subject (if applicable) */}
              {msg.email_subject && (
                <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                  Email: {msg.email_subject}
                </div>
              )}

              <p style={{ margin: '0 0 1rem 0', fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {msg.message}
              </p>

              {/* SMS Body (if different from main message) */}
              {msg.sms_body && msg.sms_body !== msg.message && (
                <div style={{ padding: '0.75rem', background: '#fff3cd', borderRadius: '4px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#856404', marginBottom: '4px' }}>SMS Version:</div>
                  <div style={{ fontSize: '13px', color: '#856404' }}>{msg.sms_body}</div>
                </div>
              )}

              {/* Scheduled Time */}
              {msg.scheduled_at && (
                <div style={{ fontSize: '13px', color: '#0dcaf0', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Scheduled for: {formatDate(msg.scheduled_at)}
                </div>
              )}

              {/* Failed Reason */}
              {msg.failed_reason && (
                <div style={{ padding: '0.75rem', background: '#f8d7da', borderRadius: '4px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#842029', marginBottom: '4px' }}>Delivery Failed:</div>
                  <div style={{ fontSize: '13px', color: '#842029' }}>{msg.failed_reason}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                  {msg.is_draft ? 'Draft saved' : msg.sent_at ? `Sent ${formatDate(msg.sent_at)}` : `Created ${formatDate(msg.created_at)}`}
                  {!msg.is_draft && ` • ${msg.read_count || 0} read`}
                  {msg.delivered_at && ` • Delivered ${formatDate(msg.delivered_at)}`}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {msg.is_draft && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        // TODO: Load draft into form for editing
                        alert('Edit draft functionality will be implemented');
                      }}
                      style={{ padding: '4px 12px', fontSize: '13px' }}
                    >
                      Edit Draft
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => onDelete(msg.message_id)}
                    style={{ padding: '4px 12px', fontSize: '13px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {msg.expires_at && new Date(msg.expires_at) < new Date() && (
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  padding: '4px 8px',
                  background: '#fd7e14',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  Expired
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageThread;
