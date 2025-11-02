import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import providersApi from '../../services/providersApi';
import type { Provider } from '../../types';
import Modal from '../common/Modal';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: number;
  directory: Provider[];
  onRefresh: () => void;
}

/**
 * Provider Settings Modal
 * Configure invoice settings for a specific provider
 */
function ProviderSettingsModal({
  isOpen,
  onClose,
  providerId,
  directory,
  onRefresh
}: ProviderSettingsModalProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);

  // Form state for invoice settings
  const [settings, setSettings] = useState({
    name: '',
    type: 'Individual' as 'Individual' | 'Local Authority' | 'Healthcare' | 'Care Organization',
    billing_day: 1,
    billing_frequency: 'monthly' as 'weekly' | 'fortnightly' | 'monthly',
    invoice_email: '',
    cc_email: '',
    auto_send: false,
    payment_terms_days: 30,
    late_payment_fee_percentage: 0,
    send_reminders: true,
    reminder_days_before_due: 7,
    reminder_days_after_due_1st: 3,
    reminder_days_after_due_2nd: 14,
    reminder_days_after_due_3rd: 30,
    contact_name: '',
    contact_phone: '',
    invoice_notes: ''
  });

  useEffect(() => {
    if (isOpen && providerId) {
      const foundProvider = directory.find(p => p.provider_id === providerId);
      if (foundProvider) {
        setProvider(foundProvider);
        setSettings({
          name: foundProvider.name || '',
          type: foundProvider.type || 'Individual',
          billing_day: foundProvider.billing_day || 1,
          billing_frequency: foundProvider.billing_frequency || 'monthly',
          invoice_email: foundProvider.invoice_email || '',
          cc_email: foundProvider.cc_email || '',
          auto_send: foundProvider.auto_send || false,
          payment_terms_days: foundProvider.payment_terms_days || 30,
          late_payment_fee_percentage: foundProvider.late_payment_fee_percentage || 0,
          send_reminders: foundProvider.send_reminders !== false,
          reminder_days_before_due: foundProvider.reminder_days_before_due || 7,
          reminder_days_after_due_1st: foundProvider.reminder_days_after_due_1st || 3,
          reminder_days_after_due_2nd: foundProvider.reminder_days_after_due_2nd || 14,
          reminder_days_after_due_3rd: foundProvider.reminder_days_after_due_3rd || 30,
          contact_name: foundProvider.contact_name || '',
          contact_phone: foundProvider.contact_phone || '',
          invoice_notes: foundProvider.invoice_notes || ''
        });
      }
    }
  }, [isOpen, providerId, directory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !providerId) return;

    try {
      setLoading(true);
      await providersApi.updateProvider(tenantId, providerId, settings);
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error updating provider settings:', error);
      alert('Failed to update provider settings');
    } finally {
      setLoading(false);
    }
  };

  if (!provider) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice Settings - ${provider.name}`}>
      <div style={{ maxWidth: '700px' }}>
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="provider-settings-section" style={{ background: '#e3f2fd' }}>
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
              Basic Information
            </h4>

            <div className="provider-settings-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Provider Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  required
                  disabled={provider?.name === 'Self-Pay'}
                  style={provider?.name === 'Self-Pay' ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>

              <div>
                <label className="form-label">Type *</label>
                <select
                  className="form-control"
                  value={settings.type}
                  onChange={(e) => setSettings({ ...settings, type: e.target.value as any })}
                  required
                >
                  <option value="Individual">Individual</option>
                  <option value="Local Authority">Local Authority</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Care Organization">Care Organization</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoice Generation Settings */}
          <div className="provider-settings-section" style={{ background: '#e8f5e9' }}>
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              Invoice Generation
            </h4>

            <div className="provider-settings-grid">
              <div>
                <label className="form-label">Billing Day (1-31)</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings.billing_day}
                  onChange={(e) => setSettings({ ...settings, billing_day: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="31"
                />
                <small style={{ color: 'var(--gray-600)' }}>
                  Day of month when invoices are automatically generated
                </small>
              </div>

              <div>
                <label className="form-label">Billing Frequency</label>
                <select
                  className="form-control"
                  value={settings.billing_frequency}
                  onChange={(e) => setSettings({ ...settings, billing_frequency: e.target.value as any })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="provider-settings-section" style={{ background: '#fff3e0' }}>
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              Email Settings
            </h4>

            <div className="provider-settings-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Invoice Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  value={settings.invoice_email}
                  onChange={(e) => setSettings({ ...settings, invoice_email: e.target.value })}
                  placeholder="invoices@provider.com"
                />
                <small style={{ color: 'var(--gray-600)' }}>
                  Primary email where invoices will be sent
                </small>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">CC Email (optional)</label>
                <input
                  type="email"
                  className="form-control"
                  value={settings.cc_email}
                  onChange={(e) => setSettings({ ...settings, cc_email: e.target.value })}
                  placeholder="finance@provider.com"
                />
                <small style={{ color: 'var(--gray-600)' }}>
                  Additional recipient to CC on invoices
                </small>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.auto_send}
                    onChange={(e) => setSettings({ ...settings, auto_send: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: 600 }}>Auto-send invoices when generated</span>
                </label>
                <small style={{ color: 'var(--gray-600)', marginLeft: '26px', display: 'block' }}>
                  Automatically email invoices on billing day
                </small>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="provider-settings-section" style={{ background: '#f3e5f5' }}>
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
              Payment Terms
            </h4>

            <div className="provider-settings-grid">
              <div>
                <label className="form-label">Payment Terms (days)</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings.payment_terms_days}
                  onChange={(e) => setSettings({ ...settings, payment_terms_days: parseInt(e.target.value) || 30 })}
                  min="1"
                  max="90"
                />
                <small style={{ color: 'var(--gray-600)' }}>
                  Net payment terms (e.g., Net 30)
                </small>
              </div>

              <div>
                <label className="form-label">Late Payment Fee (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings.late_payment_fee_percentage}
                  onChange={(e) => setSettings({ ...settings, late_payment_fee_percentage: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="10"
                  step="0.1"
                />
                <small style={{ color: 'var(--gray-600)' }}>
                  Monthly percentage charged for overdue invoices
                </small>
              </div>
            </div>
          </div>

          {/* Reminder Settings */}
          <div className="provider-settings-section" style={{ background: '#fce4ec' }}>
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
              </svg>
              Payment Reminders
            </h4>

            <div className="provider-settings-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.send_reminders}
                    onChange={(e) => setSettings({ ...settings, send_reminders: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: 600 }}>Enable automatic payment reminders</span>
                </label>
              </div>

              {settings.send_reminders && (
                <>
                  <div>
                    <label className="form-label">Pre-due reminder (days before)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.reminder_days_before_due}
                      onChange={(e) => setSettings({ ...settings, reminder_days_before_due: parseInt(e.target.value) || 7 })}
                      min="1"
                      max="30"
                    />
                  </div>

                  <div>
                    <label className="form-label">1st overdue reminder (days after due)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.reminder_days_after_due_1st}
                      onChange={(e) => setSettings({ ...settings, reminder_days_after_due_1st: parseInt(e.target.value) || 3 })}
                      min="1"
                      max="30"
                    />
                  </div>

                  <div>
                    <label className="form-label">2nd overdue reminder (days after due)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.reminder_days_after_due_2nd}
                      onChange={(e) => setSettings({ ...settings, reminder_days_after_due_2nd: parseInt(e.target.value) || 14 })}
                      min="1"
                      max="60"
                    />
                  </div>

                  <div>
                    <label className="form-label">Final reminder (days after due)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.reminder_days_after_due_3rd}
                      onChange={(e) => setSettings({ ...settings, reminder_days_after_due_3rd: parseInt(e.target.value) || 30 })}
                      min="1"
                      max="90"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="provider-settings-section" style={{ background: '#e1f5fe' }}>
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              Contact Information
            </h4>

            <div className="provider-settings-grid">
              <div>
                <label className="form-label">Contact Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.contact_name}
                  onChange={(e) => setSettings({ ...settings, contact_name: e.target.value })}
                  placeholder="Finance Manager"
                />
              </div>

              <div>
                <label className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  value={settings.contact_phone}
                  onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                  placeholder="0114 123 4567"
                />
              </div>
            </div>
          </div>

          {/* Invoice Notes */}
          <div className="provider-settings-section" style={{ background: '#f1f8e9' }}>
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              Invoice Notes
            </h4>

            <div className="provider-settings-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Standard Invoice Notes</label>
                <textarea
                  className="form-control"
                  value={settings.invoice_notes}
                  onChange={(e) => setSettings({ ...settings, invoice_notes: e.target.value })}
                  rows={3}
                  placeholder="e.g., Please reference PO number on payment"
                />
                <small style={{ color: 'var(--gray-600)' }}>
                  These notes will be included on all invoices for this provider
                </small>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default ProviderSettingsModal;
