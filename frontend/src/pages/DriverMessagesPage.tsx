import { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';
import apiClient from '../services/api';

interface Message {
  message_id: number;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  created_by: number;
  target_driver_id: number | null;
  target_driver_name: string | null;
  expires_at: string | null;
  is_active: boolean;
  read_count: number;
  status?: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed';
  is_draft?: boolean;
  scheduled_at?: string;
  sent_at?: string;
  delivery_method?: string;
}

interface Driver {
  driver_id: number;
  name: string;
  employment_type?: string;
}

/**
 * Driver Messages Admin Page - Conversation Style
 *
 * Left: Driver list
 * Right: Message thread for selected driver
 */
function DriverMessagesPage() {
  const { tenantId } = useTenant();
  const { user } = useAuthStore();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');

  // View mode: all, inbox, drafts, scheduled, sent
  const [viewMode, setViewMode] = useState<'all' | 'inbox' | 'drafts' | 'scheduled' | 'sent'>('all');

  // New message form
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [recipientType, setRecipientType] = useState<'single' | 'multiple' | 'all'>('single');
  const [selectedDriverIds, setSelectedDriverIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [expiresAt, setExpiresAt] = useState('');
  const [sending, setSending] = useState(false);

  // SMS/Email delivery options
  const [deliveryMethod, setDeliveryMethod] = useState<'in-app' | 'sms' | 'email' | 'both'>('in-app');
  const [emailSubject, setEmailSubject] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    if (tenantId) {
      loadDrivers();
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      loadAllMessagesGlobal();
    }
  }, [tenantId, viewMode]);

  useEffect(() => {
    if (selectedDriver && tenantId) {
      loadMessagesForDriver(selectedDriver.driver_id);
    }
  }, [selectedDriver, tenantId]);

  const loadDrivers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/tenants/${tenantId}/drivers`);
      setDrivers(response.data.drivers || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load drivers';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesForDriver = async (driverId: number) => {
    setLoadingMessages(true);
    try {
      const response = await apiClient.get(`/tenants/${tenantId}/messages`);
      const allMessages = response.data.messages || [];

      // Filter messages for this specific driver
      const driverMessages = allMessages.filter((msg: Message) =>
        msg.target_driver_id === driverId
      );

      setMessages(driverMessages);
    } catch {
      // Error handled silently
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadAllMessagesGlobal = async () => {
    setLoadingMessages(true);
    setError('');
    try {
      if (viewMode === 'inbox') {
        // Load messages FROM drivers TO office (admin view)
        const response = await apiClient.get(`/tenants/${tenantId}/messages-from-drivers`);
        setInboxMessages(response.data.messages || []);
      } else {
        // Load messages FROM office TO drivers
        const response = await apiClient.get(`/tenants/${tenantId}/messages`);
        let messages = response.data.messages || [];

        // Filter based on view mode
        if (viewMode === 'drafts') {
          messages = messages.filter((msg: Message) => msg.is_draft);
        } else if (viewMode === 'scheduled') {
          messages = messages.filter((msg: Message) => msg.status === 'scheduled');
        } else if (viewMode === 'sent') {
          messages = messages.filter((msg: Message) => !msg.is_draft && msg.status !== 'scheduled');
        }

        setAllMessages(messages);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load messages';
      setError(errorMessage);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate recipients based on type
    if (recipientType === 'single' && !selectedDriver) {
      setError('Please select a driver');
      return;
    }
    if (recipientType === 'multiple' && selectedDriverIds.length === 0) {
      setError('Please select at least one driver');
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
        emailSubject: (deliveryMethod === 'email' || deliveryMethod === 'both') ? emailSubject : null,
        smsBody: (deliveryMethod === 'sms' || deliveryMethod === 'both') ? smsBody : null,
        isDraft,
        scheduledAt: scheduledAt || null,
      };

      if (recipientType === 'all') {
        // Send to all drivers (targetDriverId = null broadcasts to all)
        await apiClient.post(`/tenants/${tenantId}/messages`, {
          ...messageData,
          targetDriverId: null,
        });
      } else if (recipientType === 'multiple') {
        // Send to each selected driver
        for (const driverId of selectedDriverIds) {
          await apiClient.post(`/tenants/${tenantId}/messages`, {
            ...messageData,
            targetDriverId: driverId,
          });
        }
      } else {
        // Send to single selected driver
        await apiClient.post(`/tenants/${tenantId}/messages`, {
          ...messageData,
          targetDriverId: selectedDriver!.driver_id,
        });
      }

      // Reset form
      setTitle('');
      setMessageContent('');
      setPriority('medium');
      setExpiresAt('');
      setDeliveryMethod('in-app');
      setEmailSubject('');
      setSmsBody('');
      setIsDraft(false);
      setScheduledAt('');
      setShowMessageForm(false);
      setRecipientType('single');
      setSelectedDriverIds([]);

      // Reload messages for current driver if viewing one
      if (selectedDriver) {
        loadMessagesForDriver(selectedDriver.driver_id);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to send message';
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await apiClient.delete(`/tenants/${tenantId}/messages/${messageId}`);
      if (selectedDriver) {
        loadMessagesForDriver(selectedDriver.driver_id);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete message';
      alert(errorMessage);
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

  const handleToggleDriverSelection = (driverId: number) => {
    setSelectedDriverIds(prev =>
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const getRecipientCount = () => {
    if (recipientType === 'all') return drivers.length;
    if (recipientType === 'multiple') return selectedDriverIds.length;
    return 1;
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      {/* Left Sidebar - Driver List */}
      <div style={{
        width: '320px',
        borderRight: '1px solid var(--gray-200)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--gray-50)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)', background: 'white' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: 600 }}>Driver Messages</h2>
          <input
            type="text"
            className="form-control"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '14px' }}
          />
        </div>

        {/* Driver List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto' }}></div>
              <p style={{ marginTop: '0.5rem', fontSize: '13px', color: 'var(--gray-600)' }}>Loading...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)', fontSize: '14px' }}>
              No drivers found
            </div>
          ) : (
            filteredDrivers.map((driver) => {
              const isSelected = recipientType === 'single'
                ? selectedDriver?.driver_id === driver.driver_id
                : selectedDriverIds.includes(driver.driver_id);

              return (
                <div
                  key={driver.driver_id}
                  onClick={() => {
                    if (recipientType === 'multiple') {
                      handleToggleDriverSelection(driver.driver_id);
                    } else {
                      setSelectedDriver(driver);
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
                  {/* Checkbox for multiple selection mode */}
                  {recipientType === 'multiple' && (
                    <input
                      type="checkbox"
                      checked={selectedDriverIds.includes(driver.driver_id)}
                      onChange={() => handleToggleDriverSelection(driver.driver_id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--gray-900)', marginBottom: '4px' }}>
                      {driver.name}
                    </div>
                    {driver.employment_type && (
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                        {driver.employment_type === 'contracted' ? 'Contracted' : 'Freelance'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side - Message Thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        {/* Thread Header - Always visible */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Messages</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--gray-600)' }}>
              Universal messaging system - In-App, Email & SMS
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowMessageForm(!showMessageForm)}
          >
            {showMessageForm ? 'Cancel' : 'New Message'}
          </button>
        </div>

        {/* Global Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem 0', overflowX: 'auto', borderBottom: '1px solid var(--gray-200)' }}>
          <button
            onClick={() => { setViewMode('all'); setSelectedDriver(null); }}
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
            onClick={() => { setViewMode('inbox'); setSelectedDriver(null); }}
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
            Inbox ({inboxMessages.length})
          </button>
          <button
            onClick={() => { setViewMode('drafts'); setSelectedDriver(null); }}
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
            onClick={() => { setViewMode('scheduled'); setSelectedDriver(null); }}
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
          <button
            onClick={() => { setViewMode('sent'); setSelectedDriver(null); }}
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
                      {/* Single Driver Option */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', background: recipientType === 'single' ? '#e3f2fd' : 'transparent' }}>
                        <input
                          type="radio"
                          name="recipientType"
                          value="single"
                          checked={recipientType === 'single'}
                          onChange={(e) => {
                            setRecipientType('single');
                            setSelectedDriverIds([]);
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: recipientType === 'single' ? 600 : 400 }}>
                          Single Driver
                          {recipientType === 'single' && selectedDriver && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--gray-600)', fontWeight: 400 }}>
                              ({selectedDriver.name})
                            </span>
                          )}
                        </span>
                      </label>

                      {/* Multiple Drivers Option */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', background: recipientType === 'multiple' ? '#e3f2fd' : 'transparent' }}>
                        <input
                          type="radio"
                          name="recipientType"
                          value="multiple"
                          checked={recipientType === 'multiple'}
                          onChange={(e) => {
                            setRecipientType('multiple');
                            setSelectedDriverIds([]);
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: recipientType === 'multiple' ? 600 : 400 }}>
                          Multiple Drivers
                          {recipientType === 'multiple' && selectedDriverIds.length > 0 && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--gray-600)', fontWeight: 400 }}>
                              ({selectedDriverIds.length} selected)
                            </span>
                          )}
                        </span>
                      </label>

                      {/* All Drivers Option */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', background: recipientType === 'all' ? '#e3f2fd' : 'transparent' }}>
                        <input
                          type="radio"
                          name="recipientType"
                          value="all"
                          checked={recipientType === 'all'}
                          onChange={(e) => {
                            setRecipientType('all');
                            setSelectedDriverIds([]);
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: recipientType === 'all' ? 600 : 400 }}>
                          All Drivers
                          {recipientType === 'all' && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--gray-600)', fontWeight: 400 }}>
                              (Broadcast to all {drivers.length} drivers)
                            </span>
                          )}
                        </span>
                      </label>
                    </div>

                    {/* Helper Text */}
                    {recipientType === 'multiple' && (
                      <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '4px', fontSize: '13px', color: '#856404' }}>
                        💡 Tip: Use the checkboxes in the driver list to select multiple recipients
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

                  {/* Delivery Method */}
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                      Delivery Method <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={deliveryMethod}
                      onChange={(e) => setDeliveryMethod(e.target.value as any)}
                      disabled={sending}
                    >
                      <option value="in-app">In-App Only (Driver Dashboard)</option>
                      <option value="sms">SMS Only</option>
                      <option value="both">In-App + SMS</option>
                    </select>
                    <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                      {deliveryMethod === 'in-app' && '📱 Message will appear in driver dashboard'}
                      {deliveryMethod === 'sms' && '💬 SMS will be sent to driver phone number'}
                      {deliveryMethod === 'both' && '📱💬 Message in dashboard + SMS to phone'}
                    </div>
                  </div>

                  {/* SMS Body - Only show if SMS selected */}
                  {(deliveryMethod === 'sms' || deliveryMethod === 'both') && (
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="smsBody" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                        SMS Message <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <textarea
                        id="smsBody"
                        className="form-control"
                        value={smsBody}
                        onChange={(e) => setSmsBody(e.target.value.substring(0, 160))}
                        placeholder="Short SMS version (max 160 characters)..."
                        rows={3}
                        maxLength={160}
                        required
                        disabled={sending}
                      />
                      <div style={{ fontSize: '12px', color: smsBody.length > 140 ? '#dc3545' : 'var(--gray-600)', marginTop: '0.25rem', textAlign: 'right' }}>
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
                        <option value="low">Info</option>
                        <option value="medium">Notice</option>
                        <option value="high">Important</option>
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

                  {/* Schedule Message */}
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="scheduledAt" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                      Schedule for Later (Optional)
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
                    {scheduledAt && (
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                        ⏰ Message will be sent at {new Date(scheduledAt).toLocaleString('en-GB')}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={sending}
                      onClick={() => setIsDraft(false)}
                    >
                      {sending ? 'Sending...' : scheduledAt ? 'Schedule Message' : 'Send Now'}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      disabled={sending}
                      onClick={() => setIsDraft(true)}
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowMessageForm(false);
                        setTitle('');
                        setMessageContent('');
                        setPriority('medium');
                        setExpiresAt('');
                        setDeliveryMethod('in-app');
                        setEmailSubject('');
                        setSmsBody('');
                        setIsDraft(false);
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

        {/* Message List - Only show when a driver is selected */}
        {selectedDriver ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
            {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                  <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', stroke: 'var(--gray-400)', fill: 'none', strokeWidth: 1.5 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                  <p style={{ fontSize: '16px', marginBottom: '0.5rem' }}>No messages yet</p>
                  <p style={{ fontSize: '14px' }}>Send your first message to {selectedDriver.name}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {messages.map((msg) => (
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
                      {/* Priority Badge */}
                      <div style={{
                        display: 'inline-flex',
                        padding: '4px 10px',
                        background: `${getPriorityColor(msg.priority)}20`,
                        color: getPriorityColor(msg.priority),
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginBottom: '0.75rem'
                      }}>
                        {getPriorityLabel(msg.priority)}
                      </div>

                      {/* Title */}
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                        {msg.title}
                      </h4>

                      {/* Message */}
                      <p style={{ margin: '0 0 1rem 0', fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {msg.message}
                      </p>

                      {/* Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-200)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                          Sent {formatDate(msg.created_at)} • {msg.read_count || 0} read{msg.read_count !== 1 ? 's' : ''}
                        </div>
                        {msg.is_active && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteMessage(msg.message_id)}
                            style={{ padding: '4px 12px', fontSize: '13px' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>

                      {/* Expired/Deleted Status */}
                      {!msg.is_active && (
                        <div style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          padding: '4px 8px',
                          background: '#dc3545',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          Deleted
                        </div>
                      )}
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
        ) : !showMessageForm ? (
          // Placeholder when no driver selected and no form showing
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
            <p style={{ fontSize: '16px', fontWeight: 500 }}>Select a driver to view messages</p>
            <p style={{ fontSize: '14px', marginTop: '0.5rem' }}>Or click "New Message" to compose a message to multiple/all drivers</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DriverMessagesPage;
