import { useState, useEffect, useRef } from 'react';
import { customerDashboardApi } from '../../services/customerDashboardApi';
import './CustomerMessagesModal.css';

interface CustomerMessagesModalProps {
  tenantId: number;
  customerId: number;
  onClose: () => void;
}

interface Message {
  message_id: number;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  read: boolean;
}

interface MessageToOffice {
  message_id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  read_at?: string;
  resolved_at?: string;
  admin_response?: string;
}

/**
 * Customer Messages Modal
 *
 * Communication between customers and office
 */
function CustomerMessagesModal({ tenantId, customerId, onClose }: CustomerMessagesModalProps) {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesToOffice, setMessagesToOffice] = useState<MessageToOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Send message form
  const [showSendForm, setShowSendForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (activeTab === 'inbox') {
      loadMessages();
    } else {
      loadMessagesToOffice();
    }
  }, [tenantId, customerId, activeTab]);

  // Clear messages when switching tabs
  useEffect(() => {
    setMessages([]);
    setMessagesToOffice([]);
    setError('');
  }, [activeTab]);

  // Add keyboard handler for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const loadMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await customerDashboardApi.getMessages(tenantId, customerId);
      setMessages(data.messages || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load messages';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesToOffice = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await customerDashboardApi.getMessagesToOffice(tenantId, customerId);
      setMessagesToOffice(data.messages || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load sent messages';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      await customerDashboardApi.sendMessageToOffice(tenantId, customerId, {
        subject,
        message: messageContent,
      });

      // Reset form
      setSubject('');
      setMessageContent('');
      setShowSendForm(false);

      // Reload messages
      loadMessagesToOffice();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send message';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setSending(false);
    }
  };

  const handleMessageClick = async (message: Message) => {
    // Mark as read if not already read
    if (!message.read) {
      try {
        await customerDashboardApi.markMessageAsRead(tenantId, customerId, message.message_id);
        // Update local state
        setMessages(messages.map(m =>
          m.message_id === message.message_id ? { ...m, read: true } : m
        ));
      } catch {
        // Error handled silently
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diffMs / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'var(--color-danger-500)';
      case 'medium': return 'var(--color-warning-500)';
      case 'low': return 'var(--color-gray-600)';
      default: return 'var(--color-gray-600)';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'message-priority-high';
      case 'medium': return 'message-priority-medium';
      case 'low': return 'message-priority-low';
      default: return 'message-priority-low';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Important';
      case 'medium': return 'Notice';
      case 'low': return 'Info';
      default: return 'Info';
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;
  const pendingCount = messagesToOffice.filter(m => m.status === 'pending').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'var(--color-warning-500)';
      case 'read': return 'var(--color-brand-500)';
      case 'resolved': return 'var(--color-success-500)';
      default: return 'var(--color-gray-600)';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'sent-message-status-pending';
      case 'read': return 'sent-message-status-read';
      case 'resolved': return 'sent-message-status-resolved';
      default: return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'read': return 'Read';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  };

  return (
    <div className="messages-modal-backdrop">
      <div className="messages-modal-content">
        {/* Header */}
        <div className="messages-modal-header">
          <h2 className="messages-modal-title">
            Messages
          </h2>

          {/* Tabs */}
          <div className="messages-modal-tabs">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`messages-modal-tab ${activeTab === 'inbox' ? 'active' : ''}`}
            >
              From Office
              {unreadCount > 0 && (
                <span className="messages-modal-tab-badge">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`messages-modal-tab ${activeTab === 'sent' ? 'active' : ''}`}
            >
              Sent to Office
              {pendingCount > 0 && (
                <span className="messages-modal-tab-badge messages-modal-tab-badge-warning">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="messages-modal-body">
          {error && (
            <div className="messages-alert alert alert-error">
              {error}
            </div>
          )}

          {activeTab === 'inbox' ? (
            // Inbox - Messages from office
            <>
              {loading ? (
                <div className="messages-loading">
                  <div className="spinner messages-loading-spinner"></div>
                  <p className="messages-loading-text">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="messages-empty">
                  No messages at this time
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      onClick={() => handleMessageClick(msg)}
                      className={`message-item ${msg.read ? 'message-item-read' : 'unread'}`}
                    >
                      {!msg.read && (
                        <div className="message-unread-indicator" />
                      )}

                      <div className="message-header">
                        <div className={`message-priority-badge ${getPriorityClass(msg.priority)}`}>
                          {getPriorityLabel(msg.priority)}
                        </div>
                        <div className="message-date">
                          {formatDate(msg.created_at)}
                        </div>
                      </div>

                      <div className="message-title">
                        {msg.title}
                      </div>

                      <div className="message-content">
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Sent - Messages to office
            <>
              {/* Send Message Button */}
              {!showSendForm && (
                <button
                  className="btn btn-primary new-message-button"
                  onClick={() => setShowSendForm(true)}
                >
                  + New Message to Office
                </button>
              )}

              {/* Send Message Form */}
              {showSendForm && (
                <div className="send-message-form-container">
                  <h4 className="send-message-form-title">Send Message to Office</h4>
                  <form onSubmit={handleSendMessage}>
                    <div className="form-group">
                      <label htmlFor="subject">
                        Subject <span className="required">*</span>
                      </label>
                      <input
                        id="subject"
                        type="text"
                        className="form-control"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief subject line"
                        required
                        disabled={sending}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="messageContent">
                        Message <span className="required">*</span>
                      </label>
                      <textarea
                        id="messageContent"
                        className="form-control"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Type your message here..."
                        rows={4}
                        required
                        disabled={sending}
                      />
                    </div>

                    <div className="send-button-group">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={sending}
                      >
                        {sending ? 'Sending...' : 'Send Message'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowSendForm(false);
                          setSubject('');
                          setMessageContent('');
                        }}
                        disabled={sending}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sent Messages List */}
              {loading ? (
                <div className="messages-loading">
                  <div className="spinner messages-loading-spinner"></div>
                  <p className="messages-loading-text">Loading sent messages...</p>
                </div>
              ) : messagesToOffice.length === 0 ? (
                <div className="messages-empty">
                  No messages sent yet
                </div>
              ) : (
                <div className="messages-list">
                  {messagesToOffice.map((msg) => (
                    <div key={msg.message_id} className="sent-message-item">
                      <div className="sent-message-header">
                        <div className="sent-message-meta">
                          <div className={`sent-message-status-badge ${getStatusClass(msg.status)}`}>
                            {getStatusLabel(msg.status)}
                          </div>
                          <div className="message-date">
                            {formatDate(msg.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="sent-message-subject">
                        {msg.subject}
                      </div>

                      <div className="sent-message-content">
                        {msg.message}
                      </div>

                      {msg.admin_response && (
                        <div className="admin-response">
                          <div className="admin-response-label">
                            Office Response:
                          </div>
                          <div className="admin-response-content">
                            {msg.admin_response}
                          </div>
                        </div>
                      )}

                      {msg.read_at && (
                        <div className="message-read-at">
                          Read {formatDate(msg.read_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="messages-modal-footer">
          <div className="messages-modal-footer-info">
            {activeTab === 'inbox' ? (
              <>
                {messages.length} message{messages.length !== 1 ? 's' : ''}
                {unreadCount > 0 && <> • {unreadCount} unread</>}
              </>
            ) : (
              <>
                {messagesToOffice.length} message{messagesToOffice.length !== 1 ? 's' : ''} sent
                {pendingCount > 0 && <> • {pendingCount} pending</>}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerMessagesModal;
