import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import {
  MailIcon,
  CheckMarkIcon,
  AlarmClockIcon,
  MemoIcon,
  XMarkIcon,
  TicketIcon,
  BanIcon,
  TimerIcon,
  WarningIcon,
  MegaphoneIcon,
} from '../icons/BusIcons';

/**
 * Bus Communications & Notifications Management
 *
 * Interface for sending communications to bus passengers:
 * - Booking confirmations
 * - Service alerts and disruptions
 * - Delay notifications
 * - Cancellation notifications
 * - Service announcements
 * - Broadcast messages
 */

interface Communication {
  message_id: number;
  message_type: string;
  delivery_method: string;
  recipient_type: string;
  subject: string;
  message_body: string;
  status: string;
  sent_at?: string;
  created_at: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
}

interface CommunicationStats {
  total_sent: number;
  scheduled: number;
  drafts: number;
  failed: number;
  confirmations: number;
  alerts: number;
  this_week: number;
  this_month: number;
}

export default function BusCommunicationsPage() {
  const { tenant } = useTenant();
  const toast = useToast();

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    message_type: 'announcement',
    delivery_method: 'email',
    recipient_type: 'all_passengers',
    recipient_id: '',
    subject: '',
    message_body: '',
  });

  useEffect(() => {
    if (tenant?.tenant_id) {
      fetchCommunications();
      fetchStats();
    }
  }, [tenant?.tenant_id, selectedFilter]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (selectedFilter !== 'all') {
        params.append('status', selectedFilter);
      }

      const response = await fetch(
        `/api/tenants/${tenant!.tenant_id}/bus-communications?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to load communications');

      const data = await response.json();
      setCommunications(data.communications);
    } catch (err: any) {
      console.error('Error loading communications:', err);
      toast.error('Failed to load communications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/tenants/${tenant!.tenant_id}/bus-communications/stats`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      setStats(data.messages);
    } catch (err: any) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSendCommunication = async () => {
    try {
      if (!formData.subject || !formData.message_body) {
        toast.error('Please fill in subject and message');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/tenants/${tenant!.tenant_id}/bus-communications`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error('Failed to send communication');

      const data = await response.json();
      toast.success(`Message sent to ${data.communication.recipients_count} recipients`);

      setShowCreateModal(false);
      setFormData({
        message_type: 'announcement',
        delivery_method: 'email',
        recipient_type: 'all_passengers',
        recipient_id: '',
        subject: '',
        message_body: '',
      });

      fetchCommunications();
      fetchStats();
    } catch (err: any) {
      console.error('Error sending communication:', err);
      toast.error('Failed to send communication');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; color: string; label: string; icon: React.FC<any> }> = {
      sent: { bg: '#d1fae5', color: '#065f46', label: 'Sent', icon: CheckMarkIcon },
      scheduled: { bg: '#dbeafe', color: '#1e40af', label: 'Scheduled', icon: AlarmClockIcon },
      draft: { bg: '#f3f4f6', color: '#374151', label: 'Draft', icon: MemoIcon },
      failed: { bg: '#fee2e2', color: '#991b1b', label: 'Failed', icon: XMarkIcon },
    };

    const badge = badges[status] || badges.draft;
    const IconComponent = badge.icon;

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        background: badge.bg,
        color: badge.color,
        fontSize: '0.75rem',
        fontWeight: 600
      }}>
        <IconComponent size={12} />
        {badge.label}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; icon: React.FC<any> }> = {
      booking_confirmation: { label: 'Booking Confirmation', icon: TicketIcon },
      cancellation: { label: 'Cancellation', icon: BanIcon },
      delay: { label: 'Delay Alert', icon: TimerIcon },
      service_alert: { label: 'Service Alert', icon: WarningIcon },
      announcement: { label: 'Announcement', icon: MegaphoneIcon },
    };

    const typeInfo = labels[type];
    if (!typeInfo) return type;

    const IconComponent = typeInfo.icon;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
        <IconComponent size={16} />
        {typeInfo.label}
      </span>
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MailIcon size={32} color="#3b82f6" />
            Communications & Notifications
          </h1>
          <p style={{ color: '#6b7280' }}>
            Send messages to bus passengers via email and SMS
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>+</span>
          New Message
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Sent</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.total_sent}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>This Week</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{stats.this_week}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Confirmations</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{stats.confirmations}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Alerts</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{stats.alerts}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
        {['all', 'sent', 'scheduled', 'draft'].map(filter => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            style={{
              padding: '0.5rem 1rem',
              background: selectedFilter === filter ? '#dbeafe' : '#fff',
              border: selectedFilter === filter ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {filter === 'all' ? 'All Messages' : filter}
          </button>
        ))}
      </div>

      {/* Communications List */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Loading communications...</p>
          </div>
        ) : communications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No messages yet
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Send your first communication to passengers
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '0.625rem 1.25rem',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Create Message
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>TYPE</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>SUBJECT</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>RECIPIENTS</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>DELIVERY</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>STATUS</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>SENT</th>
              </tr>
            </thead>
            <tbody>
              {communications.map((comm) => (
                <tr key={comm.message_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {getTypeLabel(comm.message_type)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      {comm.subject}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {comm.message_body.substring(0, 60)}...
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 600 }}>{comm.recipients_count} total</div>
                    {comm.sent_count > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                        ✓ {comm.sent_count} delivered
                      </div>
                    )}
                    {comm.failed_count > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                        ✗ {comm.failed_count} failed
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase' }}>
                    {comm.delivery_method === 'both' ? '📧 📱 Email+SMS' :
                     comm.delivery_method === 'email' ? '📧 Email' : '📱 SMS'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {getStatusBadge(comm.status)}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    {comm.sent_at ? new Date(comm.sent_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Message Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            background: '#fff',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>📨 New Message</h2>
              <button onClick={() => setShowCreateModal(false)} style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280'
              }}>×</button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {/* Message Type */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Message Type
                  </label>
                  <select
                    value={formData.message_type}
                    onChange={(e) => setFormData({ ...formData, message_type: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="announcement">Announcement</option>
                    <option value="service_alert">Service Alert</option>
                    <option value="delay">Delay Notification</option>
                    <option value="booking_confirmation">Booking Confirmation</option>
                    <option value="cancellation">Cancellation</option>
                  </select>
                </div>

                {/* Delivery Method */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Delivery Method
                  </label>
                  <select
                    value={formData.delivery_method}
                    onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="email">📧 Email Only</option>
                    <option value="sms">📱 SMS Only</option>
                    <option value="both">📧 📱 Email + SMS</option>
                  </select>
                </div>

                {/* Recipients */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Recipients
                  </label>
                  <select
                    value={formData.recipient_type}
                    onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="all_passengers">👥 All Passengers (Broadcast)</option>
                    <option value="route">🚌 Specific Route</option>
                    <option value="service">📅 Specific Service/Timetable</option>
                    <option value="individual">👤 Individual Booking</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Service Update: Route 42 Sheffield City Centre"
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Message *
                  </label>
                  <textarea
                    value={formData.message_body}
                    onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
                    placeholder="Enter your message here..."
                    rows={8}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    {formData.message_body.length} characters
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '0.625rem 1.25rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendCommunication}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
