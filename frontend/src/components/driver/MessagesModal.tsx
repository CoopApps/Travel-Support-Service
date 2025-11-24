import { useState, useEffect } from 'react';
import { driverDashboardApi } from '../../services/driverDashboardApi';

interface MessagesModalProps {
  tenantId: number;
  driverId: number;
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
 * Messages/Announcements Modal
 *
 * Communication from office to drivers
 * Important notices and updates
 */
function MessagesModal({ tenantId, driverId, onClose }: MessagesModalProps) {
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
  }, [tenantId, driverId, activeTab]);

  const loadMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await driverDashboardApi.getMessages(tenantId, driverId);
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Error loading messages:', err);
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load messages'));
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesToOffice = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await driverDashboardApi.getMessagesToOffice(tenantId, driverId);
      setMessagesToOffice(data.messages || []);
    } catch (err: any) {
      console.error('Error loading sent messages:', err);
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load sent messages'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      await driverDashboardApi.sendMessageToOffice(tenantId, driverId, {
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
      console.error('Error sending message:', err);
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  const handleMessageClick = async (message: Message) => {
    // Mark as read if not already read
    if (!message.read) {
      try {
        await driverDashboardApi.markMessageAsRead(tenantId, driverId, message.message_id);
        // Update local state
        setMessages(messages.map(m =>
          m.message_id === message.message_id ? { ...m, read: true } : m
        ));
      } catch (err) {
        console.error('Error marking message as read:', err);
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
      case 'high': return '#dc3545';
      case 'medium': return '#fd7e14';
      case 'low': return '#6c757d';
      default: return '#6c757d';
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
      case 'pending': return '#fd7e14';
      case 'read': return '#2196f3';
      case 'resolved': return '#10b981';
      default: return '#6c757d';
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
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 1.5rem 0',
          background: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Messages
            </h2>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-200)' }}>
            <button
              onClick={() => setActiveTab('inbox')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: 600,
                color: activeTab === 'inbox' ? 'var(--primary)' : 'var(--gray-600)',
                borderBottom: activeTab === 'inbox' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              From Office
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: '#dc3545',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  minWidth: '18px',
                  display: 'inline-block',
                  textAlign: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: 600,
                color: activeTab === 'sent' ? 'var(--primary)' : 'var(--gray-600)',
                borderBottom: activeTab === 'sent' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Sent to Office
              {pendingCount > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: '#fd7e14',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  minWidth: '18px',
                  display: 'inline-block',
                  textAlign: 'center'
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem 1.5rem'
        }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {activeTab === 'inbox' ? (
            // Inbox - Messages from office
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                  <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
                  No messages at this time
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {messages.map((msg) => (
                <div
                  key={msg.message_id}
                  onClick={() => handleMessageClick(msg)}
                  style={{
                    background: msg.read ? 'white' : '#f0f9ff',
                    border: msg.read ? '1px solid var(--gray-200)' : '2px solid #3b82f6',
                    borderRadius: '8px',
                    padding: '1rem',
                    position: 'relative',
                    cursor: msg.read ? 'default' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!msg.read) {
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {!msg.read && (
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#3b82f6'
                    }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{
                      display: 'inline-flex',
                      padding: '2px 8px',
                      background: `${getPriorityColor(msg.priority)}20`,
                      color: getPriorityColor(msg.priority),
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {getPriorityLabel(msg.priority)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                      {formatDate(msg.created_at)}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--gray-900)',
                    marginBottom: '0.5rem'
                  }}>
                    {msg.title}
                  </div>

                  <div style={{
                    fontSize: '14px',
                    color: 'var(--gray-700)',
                    lineHeight: '1.5'
                  }}>
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
                  className="btn btn-primary"
                  onClick={() => setShowSendForm(true)}
                  style={{ marginBottom: '1rem' }}
                >
                  + New Message to Office
                </button>
              )}

              {/* Send Message Form */}
              {showSendForm && (
                <div style={{
                  background: 'var(--gray-50)',
                  border: '2px solid var(--primary)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  marginBottom: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '15px', fontWeight: 600 }}>Send Message to Office</h4>
                  <form onSubmit={handleSendMessage}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="subject" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                        Subject <span style={{ color: '#dc3545' }}>*</span>
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

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="messageContent" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                        Message <span style={{ color: '#dc3545' }}>*</span>
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

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                  <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading sent messages...</p>
                </div>
              ) : messagesToOffice.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
                  No messages sent yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {messagesToOffice.map((msg) => (
                    <div
                      key={msg.message_id}
                      style={{
                        background: 'white',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            display: 'inline-flex',
                            padding: '3px 10px',
                            background: `${getStatusColor(msg.status)}20`,
                            color: getStatusColor(msg.status),
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            {getStatusLabel(msg.status)}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            {formatDate(msg.created_at)}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: 'var(--gray-900)',
                        marginBottom: '0.5rem'
                      }}>
                        {msg.subject}
                      </div>

                      <div style={{
                        fontSize: '14px',
                        color: 'var(--gray-700)',
                        lineHeight: '1.5',
                        marginBottom: '0.75rem',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.message}
                      </div>

                      {msg.admin_response && (
                        <div style={{
                          background: '#e3f2fd',
                          border: '1px solid #2196f3',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginTop: '0.75rem'
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#2196f3', marginBottom: '4px' }}>
                            Office Response:
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--gray-800)', whiteSpace: 'pre-wrap' }}>
                            {msg.admin_response}
                          </div>
                        </div>
                      )}

                      {msg.read_at && (
                        <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
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
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--gray-200)',
          background: 'var(--gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
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

export default MessagesModal;
