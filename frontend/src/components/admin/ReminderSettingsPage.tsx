import React, { useState, useEffect } from 'react';
import { CheckCircle, Smartphone } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface ReminderSettings {
  reminder_enabled?: boolean;
  reminder_type?: 'sms' | 'email' | 'both';
  reminder_timing?: number;
  reminder_template_sms?: string;
  reminder_template_email_subject?: string;
  reminder_template_email_body?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  sendgrid_api_key?: string;
  sendgrid_from_email?: string;
  sendgrid_from_name?: string;
}

const ReminderSettingsPage: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const tenantId = user?.tenantId;

  const [settings, setSettings] = useState<ReminderSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [testingSendGrid, setTestingSendGrid] = useState(false);
  const [activeTab, setActiveTab] = useState<'sms' | 'email'>('sms');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [tenantId]);

  const loadSettings = async () => {
    if (!tenantId || !token) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/tenants/${tenantId}/reminder-settings`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSettings(response.data.settings || {});
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!tenantId || !token) return;

    // Validate
    if (settings.reminder_enabled) {
      const type = settings.reminder_type || 'sms';

      if (type === 'sms' || type === 'both') {
        if (!settings.twilio_account_sid || !settings.twilio_auth_token || !settings.twilio_phone_number) {
          if (settings.twilio_account_sid !== '***configured***') {
            setMessage({ type: 'error', text: 'Twilio credentials required for SMS' });
            return;
          }
        }
      }

      if (type === 'email' || type === 'both') {
        if (!settings.sendgrid_api_key || !settings.sendgrid_from_email) {
          if (settings.sendgrid_api_key !== '***configured***') {
            setMessage({ type: 'error', text: 'SendGrid credentials required for Email' });
            return;
          }
        }
      }
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/tenants/${tenantId}/reminder-settings`,
        settings,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        // Reload to get masked credentials
        await loadSettings();
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (type: 'twilio' | 'sendgrid') => {
    if (!tenantId || !token) return;

    if (type === 'twilio') {
      setTestingTwilio(true);
    } else {
      setTestingSendGrid(true);
    }

    setMessage(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/tenants/${tenantId}/reminder-settings/test-connection`,
        { type },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `${type === 'twilio' ? 'Twilio' : 'SendGrid'} connection successful!`
        });
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || `${type === 'twilio' ? 'Twilio' : 'SendGrid'} connection failed`
      });
    } finally {
      if (type === 'twilio') {
        setTestingTwilio(false);
      } else {
        setTestingSendGrid(false);
      }
    }
  };

  const updateSetting = (key: keyof ReminderSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p>Loading reminder settings...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Status Message */}
      {message && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '6px',
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#065f46' : '#991b1b'
          }}
        >
          {message.text}
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem', fontSize: '16px', fontWeight: 600 }}>
              Enable Reminders
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Turn reminders on or off for all customers
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.reminder_enabled || false}
              onChange={(e) => updateSetting('reminder_enabled', e.target.checked)}
              style={{ marginRight: '0.5rem', width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              {settings.reminder_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        {settings.reminder_enabled && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  Reminder Type
                </label>
                <select
                  value={settings.reminder_type || 'sms'}
                  onChange={(e) => updateSetting('reminder_type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="sms">SMS Only</option>
                  <option value="email">Email Only</option>
                  <option value="both">Both SMS & Email</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  Send Reminder (minutes before pickup)
                </label>
                <input
                  type="number"
                  value={settings.reminder_timing || 60}
                  onChange={(e) => updateSetting('reminder_timing', parseInt(e.target.value))}
                  min="5"
                  max="1440"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Tabs */}
      {settings.reminder_enabled && (
        <>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setActiveTab('sms')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === 'sms' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeTab === 'sms' ? '#3b82f6' : '#6b7280',
                  fontWeight: activeTab === 'sms' ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Smartphone size={16} />
                SMS Configuration
              </button>
              <button
                onClick={() => setActiveTab('email')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === 'email' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeTab === 'email' ? '#3b82f6' : '#6b7280',
                  fontWeight: activeTab === 'email' ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✉️ Email Configuration
              </button>
            </div>
          </div>

          {/* SMS Tab */}
          {activeTab === 'sms' && (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <h3 style={{ marginBottom: '1rem', fontSize: '16px', fontWeight: 600 }}>
                Twilio Configuration
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  Account SID
                </label>
                <input
                  type="text"
                  value={settings.twilio_account_sid || ''}
                  onChange={(e) => updateSetting('twilio_account_sid', e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  Auth Token
                </label>
                <input
                  type="password"
                  value={settings.twilio_auth_token || ''}
                  onChange={(e) => updateSetting('twilio_auth_token', e.target.value)}
                  placeholder="Enter Twilio Auth Token"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={settings.twilio_phone_number || ''}
                  onChange={(e) => updateSetting('twilio_phone_number', e.target.value)}
                  placeholder="+1234567890"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <button
                onClick={() => testConnection('twilio')}
                disabled={testingTwilio}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: testingTwilio ? 'not-allowed' : 'pointer',
                  opacity: testingTwilio ? 0.6 : 1,
                  marginBottom: '1.5rem'
                }}
              >
                {testingTwilio ? 'Testing...' : 'Test Connection'}
              </button>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  SMS Template
                </label>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Available variables: {'{'}{'{'} customer_name {'}'}{'}'},  {'{'}{'{'} pickup_time {'}'}{'}'},  {'{'}{'{'} pickup_location {'}'}{'}'},  {'{'}{'{'} destination {'}'}{'}'},  {'{'}{'{'} driver_name {'}'}{'}'},  {'{'}{'{'} driver_phone {'}'}{'}'}
                </p>
                <textarea
                  value={settings.reminder_template_sms || ''}
                  onChange={(e) => updateSetting('reminder_template_sms', e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.25rem' }}>
                  Character count: {(settings.reminder_template_sms || '').length} / 160 (SMS limit)
                </p>
              </div>
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <h3 style={{ marginBottom: '1rem', fontSize: '16px', fontWeight: 600 }}>
                SendGrid Configuration
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.sendgrid_api_key || ''}
                  onChange={(e) => updateSetting('sendgrid_api_key', e.target.value)}
                  placeholder="SG.xxxxxxxxxxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  From Email
                </label>
                <input
                  type="email"
                  value={settings.sendgrid_from_email || ''}
                  onChange={(e) => updateSetting('sendgrid_from_email', e.target.value)}
                  placeholder="noreply@yourdomain.com"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  From Name
                </label>
                <input
                  type="text"
                  value={settings.sendgrid_from_name || ''}
                  onChange={(e) => updateSetting('sendgrid_from_name', e.target.value)}
                  placeholder="Transport Team"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <button
                onClick={() => testConnection('sendgrid')}
                disabled={testingSendGrid}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: testingSendGrid ? 'not-allowed' : 'pointer',
                  opacity: testingSendGrid ? 0.6 : 1,
                  marginBottom: '1.5rem'
                }}
              >
                {testingSendGrid ? 'Testing...' : 'Test Connection'}
              </button>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  Email Subject
                </label>
                <input
                  type="text"
                  value={settings.reminder_template_email_subject || ''}
                  onChange={(e) => updateSetting('reminder_template_email_subject', e.target.value)}
                  placeholder="Trip Reminder: {{'{'}}{{pickup_time}}{{'}'}}}"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '1rem'
                  }}
                />

                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                  Email Body (HTML)
                </label>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Available variables: {'{'}{'{'} customer_name {'}'}{'}'},  {'{'}{'{'} pickup_time {'}'}{'}'},  {'{'}{'{'} pickup_location {'}'}{'}'},  {'{'}{'{'} destination {'}'}{'}'},  {'{'}{'{'} trip_date {'}'}{'}'},  {'{'}{'{'} driver_name {'}'}{'}'},  {'{'}{'{'} driver_phone {'}'}{'}'}
                </p>
                <textarea
                  value={settings.reminder_template_email_body || ''}
                  onChange={(e) => updateSetting('reminder_template_email_body', e.target.value)}
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Save Button */}
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button
          onClick={loadSettings}
          disabled={loading || saving}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loading || saving ? 'not-allowed' : 'pointer',
            opacity: loading || saving ? 0.6 : 1
          }}
        >
          Cancel
        </button>
        <button
          onClick={saveSettings}
          disabled={loading || saving}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loading || saving ? 'not-allowed' : 'pointer',
            opacity: loading || saving ? 0.6 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default ReminderSettingsPage;
