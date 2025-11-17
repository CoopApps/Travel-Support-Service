import { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';
import apiClient from '../services/api';

interface TenantMessage {
  message_id: number;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  created_by: number;
  created_by_name: string;
  target_customer_id: number | null;
  customer_name: string | null;
  expires_at: string | null;
  read_count: number;
  total_recipients: number;
  // New fields for universal messaging
  delivery_method: 'in-app' | 'email' | 'sms' | 'both';
  email_subject?: string;
  sms_body?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'failed';
  is_draft: boolean;
  scheduled_at?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_reason?: string;
}

interface CustomerMessage {
  message_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  created_at: string;
  read_at: string | null;
  read_by: number | null;
  read_by_name: string | null;
  reply_message_id: number | null;
  reply_title: string | null;
}

interface Customer {
  customer_id: number;
  name: string;
  phone?: string;
  email?: string;
}

/**
 * Customer Messages Admin Page - Conversation Style
 *
 * Left: Customer list
 * Right: Message threads for selected customer
 */
function CustomerMessagesPage() {
  const { tenantId } = useTenant();
  const { user } = useAuthStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sentMessages, setSentMessages] = useState<TenantMessage[]>([]);
  const [inboxMessages, setInboxMessages] = useState<CustomerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // View mode: enhanced with drafts, scheduled, and all messages
  const [viewMode, setViewMode] = useState<'all' | 'inbox' | 'sent' | 'drafts' | 'scheduled'>('inbox');

  // New message form
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [recipientType, setRecipientType] = useState<'single' | 'multiple' | 'all'>('single');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [expiresAt, setExpiresAt] = useState('');
  const [sending, setSending] = useState(false);

  // New delivery options for universal messaging
  const [deliveryMethod, setDeliveryMethod] = useState<'in-app' | 'email' | 'sms' | 'both'>('in-app');
  const [emailSubject, setEmailSubject] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  // Reply form
  const [replyingToMessage, setReplyingToMessage] = useState<CustomerMessage | null>(null);
  const [replyTitle, setReplyTitle] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadCustomers();
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedCustomer && tenantId) {
      loadMessagesForCustomer(selectedCustomer.customer_id);
    }
  }, [selectedCustomer, tenantId, viewMode]);

  const loadCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/tenants/${tenantId}/customers`);
      setCustomers(response.data.customers || []);
    } catch (err: any) {
      console.error('Error loading customers:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load customers';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesForCustomer = async (customerId: number) => {
    setLoadingMessages(true);
    try {
      if (viewMode === 'inbox') {
        // Load messages FROM customers (inbox)
        const response = await apiClient.get(`/tenants/${tenantId}/messages/from-customers`);
        const allMessages = response.data.messages || [];
        const customerMessages = allMessages.filter((msg: CustomerMessage) =>
          msg.customer_id === customerId
        );
        setInboxMessages(customerMessages);
      } else if (viewMode === 'sent' || viewMode === 'all' || viewMode === 'drafts' || viewMode === 'scheduled') {
        // Load messages TO customers (sent, drafts, scheduled, or all)
        const response = await apiClient.get(`/tenants/${tenantId}/messages`, {
          params: {
            customerId,
            status: viewMode === 'drafts' ? 'draft' : viewMode === 'scheduled' ? 'scheduled' : undefined
          }
        });
        let messages = response.data.messages || [];

        // Filter based on view mode
        if (viewMode === 'drafts') {
          messages = messages.filter((msg: TenantMessage) => msg.is_draft);
        } else if (viewMode === 'scheduled') {
          messages = messages.filter((msg: TenantMessage) => msg.status === 'scheduled');
        } else if (viewMode === 'sent') {
          messages = messages.filter((msg: TenantMessage) => !msg.is_draft && msg.status !== 'scheduled');
        }
        // 'all' shows everything

        setSentMessages(messages);
      }
    } catch (err: any) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();

    if (recipientType === 'single' && !selectedCustomer) {
      setError('Please select a customer');
      return;
    }
    if (recipientType === 'multiple' && selectedCustomerIds.length === 0) {
      setError('Please select at least one customer');
      return;
    }

    setSending(true);
    setError('');

    try {
      const messageData = {
        title,
        message: messageContent,
        priority,
        expiresAt: expiresAt || null,
        deliveryMethod,
        emailSubject: deliveryMethod === 'email' || deliveryMethod === 'both' ? emailSubject : undefined,
        smsBody: deliveryMethod === 'sms' || deliveryMethod === 'both' ? smsBody : undefined,
        isDraft: saveAsDraft,
        scheduledAt: scheduledAt || null,
      };

      if (recipientType === 'all') {
        await apiClient.post(`/tenants/${tenantId}/messages`, {
          targetCustomerId: null,
          ...messageData,
        });
      } else if (recipientType === 'multiple') {
        for (const customerId of selectedCustomerIds) {
          await apiClient.post(`/tenants/${tenantId}/messages`, {
            targetCustomerId: customerId,
            ...messageData,
          });
        }
      } else {
        await apiClient.post(`/tenants/${tenantId}/messages`, {
          targetCustomerId: selectedCustomer!.customer_id,
          ...messageData,
        });
      }

      // Reset form
      setTitle('');
      setMessageContent('');
      setPriority('normal');
      setExpiresAt('');
      setDeliveryMethod('in-app');
      setEmailSubject('');
      setSmsBody('');
      setScheduledAt('');
      setShowMessageForm(false);
      setRecipientType('single');
      setSelectedCustomerIds([]);

      if (selectedCustomer) {
        loadMessagesForCustomer(selectedCustomer.customer_id);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to send message';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await apiClient.put(`/tenants/${tenantId}/messages/from-customers/${messageId}/mark-read`);
      if (selectedCustomer) {
        loadMessagesForCustomer(selectedCustomer.customer_id);
      }
    } catch (err: any) {
      console.error('Error marking message as read:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to mark as read';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyingToMessage || !replyTitle || !replyContent) {
      setError('Title and message are required');
      return;
    }

    setReplying(true);
    setError('');

    try {
      await apiClient.post(`/tenants/${tenantId}/messages/from-customers/${replyingToMessage.message_id}/reply`, {
        title: replyTitle,
        message: replyContent,
      });

      setReplyingToMessage(null);
      setReplyTitle('');
      setReplyContent('');

      if (selectedCustomer) {
        loadMessagesForCustomer(selectedCustomer.customer_id);
      }
    } catch (err: any) {
      console.error('Error sending reply:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to send reply';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setReplying(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await apiClient.delete(`/tenants/${tenantId}/messages/${messageId}`);
      if (selectedCustomer) {
        loadMessagesForCustomer(selectedCustomer.customer_id);
      }
    } catch (err: any) {
      console.error('Error deleting message:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete message';
      alert(errorMessage);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'Important';
      default: return 'Info';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return '#dc3545';
      case 'read': return '#0d6efd';
      case 'replied': return '#198754';
      default: return '#6c757d';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'unread': return 'Unread';
      case 'read': return 'Read';
      case 'replied': return 'Replied';
      default: return status;
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#6c757d';
      case 'scheduled': return '#0dcaf0';
      case 'sending': return '#ffc107';
      case 'sent': return '#0d6efd';
      case 'delivered': return '#198754';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getDeliveryStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'scheduled': return 'Scheduled';
      case 'sending': return 'Sending';
      case 'sent': return 'Sent';
      case 'delivered': return 'Delivered';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const getDeliveryMethodLabel = (method: string) => {
    switch (method) {
      case 'in-app': return 'In-App';
      case 'email': return 'Email';
      case 'sms': return 'SMS';
      case 'both': return 'Email + SMS';
      default: return method;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleToggleCustomerSelection = (customerId: number) => {
    setSelectedCustomerIds(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      {/* Left Sidebar - Customer List */}
      <div style={{
        width: '320px',
        borderRight: '1px solid var(--gray-200)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--gray-50)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)', background: 'white' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: 600 }}>Customer Messages</h2>
          <input
            type="text"
            className="form-control"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '14px' }}
          />
        </div>

        {/* Customer List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto' }}></div>
              <p style={{ marginTop: '0.5rem', fontSize: '13px', color: 'var(--gray-600)' }}>Loading...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)', fontSize: '14px' }}>
              No customers found
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const isSelected = recipientType === 'single'
                ? selectedCustomer?.customer_id === customer.customer_id
                : selectedCustomerIds.includes(customer.customer_id);

              return (
                <div
                  key={customer.customer_id}
                  onClick={() => {
                    if (recipientType === 'multiple') {
                      handleToggleCustomerSelection(customer.customer_id);
                    } else {
                      setSelectedCustomer(customer);
                    }
                  }}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: isSelected ? '#e3f2fd' : 'white',
                    border: isSelected ? '2px solid #2196f3' : '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--gray-100)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  {recipientType === 'multiple' && (
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.includes(customer.customer_id)}
                      onChange={() => handleToggleCustomerSelection(customer.customer_id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--gray-900)', marginBottom: '4px' }}>
                      {customer.name}
                    </div>
                    {(customer.phone || customer.email) && (
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                        {customer.phone || customer.email}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side - Message Threads */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        {/* Thread Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              {selectedCustomer ? selectedCustomer.name : 'Customer Messages'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--gray-600)' }}>
              {selectedCustomer
                ? 'Message threads'
                : showMessageForm
                  ? `Composing message to ${recipientType === 'all' ? 'all customers' : recipientType === 'multiple' ? 'multiple customers' : 'customer'}`
                  : 'Select a customer or compose a new message'
              }
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowMessageForm(!showMessageForm)}
          >
            {showMessageForm ? 'Cancel' : 'New Message'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error" style={{ margin: '1rem' }}>
            {error}
          </div>
        )}

        {/* New Message Form */}
        {showMessageForm && (
          <div style={{ padding: '1.5rem', borderBottom: '2px solid var(--gray-200)', background: 'var(--gray-50)' }}>
            <form onSubmit={handleSendMessage}>
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
                      onChange={() => {
                        setRecipientType('single');
                        setSelectedCustomerIds([]);
                      }}
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
                      onChange={() => {
                        setRecipientType('multiple');
                        setSelectedCustomerIds([]);
                      }}
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
                      onChange={() => {
                        setRecipientType('all');
                        setSelectedCustomerIds([]);
                      }}
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

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="title" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                  Title <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Message subject"
                  required
                  disabled={sending}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="message" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                  Message <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <textarea
                  id="message"
                  className="form-control"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '6px', border: deliveryMethod === 'in-app' ? '2px solid var(--primary)' : '1px solid var(--gray-300)', background: deliveryMethod === 'in-app' ? '#e3f2fd' : 'white' }}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="in-app"
                      checked={deliveryMethod === 'in-app'}
                      onChange={() => setDeliveryMethod('in-app')}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      disabled={sending}
                    />
                    <span style={{ fontSize: '14px', fontWeight: deliveryMethod === 'in-app' ? 600 : 400 }}>In-App Only</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '6px', border: deliveryMethod === 'email' ? '2px solid var(--primary)' : '1px solid var(--gray-300)', background: deliveryMethod === 'email' ? '#e3f2fd' : 'white' }}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="email"
                      checked={deliveryMethod === 'email'}
                      onChange={() => setDeliveryMethod('email')}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      disabled={sending}
                    />
                    <span style={{ fontSize: '14px', fontWeight: deliveryMethod === 'email' ? 600 : 400 }}>Email</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '6px', border: deliveryMethod === 'sms' ? '2px solid var(--primary)' : '1px solid var(--gray-300)', background: deliveryMethod === 'sms' ? '#e3f2fd' : 'white' }}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="sms"
                      checked={deliveryMethod === 'sms'}
                      onChange={() => setDeliveryMethod('sms')}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      disabled={sending}
                    />
                    <span style={{ fontSize: '14px', fontWeight: deliveryMethod === 'sms' ? 600 : 400 }}>SMS</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '6px', border: deliveryMethod === 'both' ? '2px solid var(--primary)' : '1px solid var(--gray-300)', background: deliveryMethod === 'both' ? '#e3f2fd' : 'white' }}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="both"
                      checked={deliveryMethod === 'both'}
                      onChange={() => setDeliveryMethod('both')}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      disabled={sending}
                    />
                    <span style={{ fontSize: '14px', fontWeight: deliveryMethod === 'both' ? 600 : 400 }}>Email + SMS</span>
                  </label>
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
                    onChange={(e) => setEmailSubject(e.target.value)}
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
                    onChange={(e) => setSmsBody(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="priority" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                    Priority
                  </label>
                  <select
                    id="priority"
                    className="form-control"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
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
                    onChange={(e) => setExpiresAt(e.target.value)}
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
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  disabled={sending}
                />
              </div>

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
                  onClick={(e) => handleSendMessage(e as any, true)}
                  disabled={sending}
                >
                  {sending ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowMessageForm(false);
                    setTitle('');
                    setMessageContent('');
                    setPriority('normal');
                    setExpiresAt('');
                    setDeliveryMethod('in-app');
                    setEmailSubject('');
                    setSmsBody('');
                    setScheduledAt('');
                  }}
                  disabled={sending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Message Status Tabs - Show when customer selected */}
        {selectedCustomer && (
          <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem 0', borderBottom: '1px solid var(--gray-200)', overflowX: 'auto' }}>
            <button
              onClick={() => setViewMode('all')}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: viewMode === 'all' ? '2px solid var(--primary)' : '2px solid transparent',
                color: viewMode === 'all' ? 'var(--primary)' : 'var(--gray-600)',
                fontWeight: viewMode === 'all' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              All Messages
            </button>
            <button
              onClick={() => setViewMode('inbox')}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: viewMode === 'inbox' ? '2px solid var(--primary)' : '2px solid transparent',
                color: viewMode === 'inbox' ? 'var(--primary)' : 'var(--gray-600)',
                fontWeight: viewMode === 'inbox' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              Inbox
            </button>
            <button
              onClick={() => setViewMode('sent')}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: viewMode === 'sent' ? '2px solid var(--primary)' : '2px solid transparent',
                color: viewMode === 'sent' ? 'var(--primary)' : 'var(--gray-600)',
                fontWeight: viewMode === 'sent' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              Sent
            </button>
            <button
              onClick={() => setViewMode('drafts')}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: viewMode === 'drafts' ? '2px solid var(--primary)' : '2px solid transparent',
                color: viewMode === 'drafts' ? 'var(--primary)' : 'var(--gray-600)',
                fontWeight: viewMode === 'drafts' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              Drafts
            </button>
            <button
              onClick={() => setViewMode('scheduled')}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: viewMode === 'scheduled' ? '2px solid var(--primary)' : '2px solid transparent',
                color: viewMode === 'scheduled' ? 'var(--primary)' : 'var(--gray-600)',
                fontWeight: viewMode === 'scheduled' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              Scheduled
            </button>
          </div>
        )}

        {/* Message Display */}
        {selectedCustomer ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
            {loadingMessages ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading messages...</p>
              </div>
            ) : viewMode === 'inbox' ? (
              inboxMessages.length === 0 ? (
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
                              onClick={() => handleMarkAsRead(msg.message_id)}
                              style={{ padding: '4px 12px', fontSize: '13px' }}
                            >
                              Mark Read
                            </button>
                          )}
                          {msg.status !== 'replied' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                setReplyingToMessage(msg);
                                setReplyTitle(`Re: ${msg.subject}`);
                              }}
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
              )
            ) : (
              sentMessages.length === 0 ? (
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
                            onClick={() => handleDeleteMessage(msg.message_id)}
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
              )
            )}
          </div>
        ) : !showMessageForm ? (
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
        ) : null}
      </div>

      {/* Reply Modal */}
      {replyingToMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>Reply to {replyingToMessage.customer_name}</h3>

            <div style={{
              padding: '1rem',
              background: 'var(--gray-50)',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              borderLeft: '4px solid var(--gray-400)',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
                Original Message:
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
                <strong>{replyingToMessage.subject}</strong>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)' }}>
                {replyingToMessage.message}
              </p>
            </div>

            <form onSubmit={handleReply}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Reply Title:
                </label>
                <input
                  type="text"
                  value={replyTitle}
                  onChange={(e) => setReplyTitle(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Your Reply:
                </label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={5}
                  className="form-control"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={replying}
                >
                  {replying ? 'Sending...' : 'Send Reply'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setReplyingToMessage(null);
                    setReplyTitle('');
                    setReplyContent('');
                    setError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerMessagesPage;
