import { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { settingsApi, TenantSettings } from '../services/homecareApi';

type TabType = 'general' | 'travel' | 'users' | 'exports';

function SettingsPage() {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TenantSettings>>({});

  useEffect(() => {
    loadSettings();
  }, [tenantId]);

  const loadSettings = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await settingsApi.get(tenantId);
      setSettings(response.data);
      setFormData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings');
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const response = await settingsApi.update(tenantId, formData);
      setSettings(response.data);
      setFormData(response.data);
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings');
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableIntegration = async () => {
    if (!tenantId || !window.confirm('Enable travel integration? This will allow syncing clients and carers to the travel system.')) return;

    try {
      setError(null);
      setSuccess(null);
      await settingsApi.enableIntegration(tenantId);
      await loadSettings();
      setSuccess('Travel integration enabled');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to enable integration');
      console.error('Failed to enable integration:', err);
    }
  };

  const handleDisableIntegration = async () => {
    if (!tenantId || !window.confirm('Disable travel integration? Existing synced data will not be affected.')) return;

    try {
      setError(null);
      setSuccess(null);
      await settingsApi.disableIntegration(tenantId);
      await loadSettings();
      setSuccess('Travel integration disabled');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disable integration');
      console.error('Failed to disable integration:', err);
    }
  };

  const handleExport = async (type: 'clients' | 'carers' | 'visits') => {
    if (!tenantId) return;

    try {
      setError(null);
      let response;
      if (type === 'clients') {
        response = await settingsApi.exportClients(tenantId);
      } else if (type === 'carers') {
        response = await settingsApi.exportCarers(tenantId);
      } else {
        const startDate = prompt('Enter start date (YYYY-MM-DD):');
        const endDate = prompt('Enter end date (YYYY-MM-DD):');
        if (!startDate || !endDate) return;
        response = await settingsApi.exportVisits(tenantId, { start_date: startDate, end_date: endDate });
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to export ${type}`);
      console.error(`Failed to export ${type}:`, err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <h1 style={{ margin: '0 0 1.5rem 0', color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
        Settings
      </h1>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--gray-200)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              padding: '0.75rem 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'general' ? '2px solid #0891b2' : '2px solid transparent',
              color: activeTab === 'general' ? '#0891b2' : 'var(--gray-600)',
              fontWeight: activeTab === 'general' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('travel')}
            style={{
              padding: '0.75rem 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'travel' ? '2px solid #0891b2' : '2px solid transparent',
              color: activeTab === 'travel' ? '#0891b2' : 'var(--gray-600)',
              fontWeight: activeTab === 'travel' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Travel Integration
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '0.75rem 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid #0891b2' : '2px solid transparent',
              color: activeTab === 'users' ? '#0891b2' : 'var(--gray-600)',
              fontWeight: activeTab === 'users' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('exports')}
            style={{
              padding: '0.75rem 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'exports' ? '2px solid #0891b2' : '2px solid transparent',
              color: activeTab === 'exports' ? '#0891b2' : 'var(--gray-600)',
              fontWeight: activeTab === 'exports' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Exports
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
        </div>
      )}

      {success && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#d1fae5', border: '1px solid #6ee7b7' }}>
          <p style={{ color: '#065f46', margin: 0 }}>{success}</p>
        </div>
      )}

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            General Settings
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Business Hours Start */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Business Hours Start
              </label>
              <input
                type="time"
                className="form-control"
                value={formData.business_hours_start || ''}
                onChange={(e) => setFormData({ ...formData, business_hours_start: e.target.value })}
              />
            </div>

            {/* Business Hours End */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Business Hours End
              </label>
              <input
                type="time"
                className="form-control"
                value={formData.business_hours_end || ''}
                onChange={(e) => setFormData({ ...formData, business_hours_end: e.target.value })}
              />
            </div>

            {/* Standard Visit Duration */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Standard Visit Duration (minutes)
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.standard_visit_duration || ''}
                onChange={(e) => setFormData({ ...formData, standard_visit_duration: parseInt(e.target.value) })}
                min="15"
                step="15"
              />
            </div>

            {/* Weekend Rate Multiplier */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Weekend Rate Multiplier
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.weekend_rate_multiplier || ''}
                onChange={(e) => setFormData({ ...formData, weekend_rate_multiplier: parseFloat(e.target.value) })}
                min="1"
                step="0.1"
                placeholder="e.g., 1.5"
              />
            </div>

            {/* Evening Rate Multiplier */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Evening Rate Multiplier
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.evening_rate_multiplier || ''}
                onChange={(e) => setFormData({ ...formData, evening_rate_multiplier: parseFloat(e.target.value) })}
                min="1"
                step="0.1"
                placeholder="e.g., 1.25"
              />
            </div>

            {/* Default Payment Terms */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Default Payment Terms
              </label>
              <input
                type="text"
                className="form-control"
                value={formData.default_payment_terms || ''}
                onChange={(e) => setFormData({ ...formData, default_payment_terms: e.target.value })}
                placeholder="e.g., Net 30"
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Travel Integration Tab */}
      {activeTab === 'travel' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Travel Integration Settings
          </h2>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: settings?.travel_integration_enabled ? '#d1fae5' : '#fef3c7', borderRadius: '6px' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: settings?.travel_integration_enabled ? '#065f46' : '#92400e' }}>
              Status: {settings?.travel_integration_enabled ? 'Enabled' : 'Disabled'}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: settings?.travel_integration_enabled ? '#047857' : '#78350f' }}>
              {settings?.travel_integration_enabled
                ? 'Clients and carers can be synced to the travel system.'
                : 'Enable integration to sync data with the travel system.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Partnership Type */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Partnership Type
              </label>
              <select
                className="form-control"
                value={formData.travel_partnership_type || ''}
                onChange={(e) => setFormData({ ...formData, travel_partnership_type: e.target.value })}
              >
                <option value="">Select Type</option>
                <option value="preferred">Preferred Partner</option>
                <option value="standard">Standard Partner</option>
                <option value="pilot">Pilot Program</option>
              </select>
            </div>

            {/* Carer Travel Discount */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Carer Travel Discount (%)
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.carer_travel_discount || ''}
                onChange={(e) => setFormData({ ...formData, carer_travel_discount: parseFloat(e.target.value) })}
                min="0"
                max="100"
                step="5"
              />
            </div>

            {/* Client Travel Enabled */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.client_travel_enabled || false}
                  onChange={(e) => setFormData({ ...formData, client_travel_enabled: e.target.checked })}
                />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--gray-700)' }}>
                  Enable Travel for Clients
                </span>
              </label>
              <p style={{ margin: '0.25rem 0 0 1.75rem', fontSize: '12px', color: 'var(--gray-500)' }}>
                Allow clients to book accessible transport
              </p>
            </div>

            {/* Auto Sync */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.auto_sync_enabled || false}
                  onChange={(e) => setFormData({ ...formData, auto_sync_enabled: e.target.checked })}
                />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--gray-700)' }}>
                  Enable Auto-Sync
                </span>
              </label>
              <p style={{ margin: '0.25rem 0 0 1.75rem', fontSize: '12px', color: 'var(--gray-500)' }}>
                Automatically sync changes to travel system
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {settings?.travel_integration_enabled ? (
              <button className="btn btn-danger" onClick={handleDisableIntegration}>
                Disable Integration
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleEnableIntegration}>
                Enable Integration
              </button>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            User Management
          </h2>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>
            User management features coming soon. Contact your administrator to add or manage users.
          </p>
        </div>
      )}

      {/* Exports Tab */}
      {activeTab === 'exports' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Data Exports
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {/* Export Clients */}
            <div className="card" style={{ padding: '1.25rem', background: 'var(--gray-50)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: 600 }}>Export Clients</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '13px', color: 'var(--gray-600)' }}>
                Download all client records as CSV
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => handleExport('clients')}>
                Export Clients
              </button>
            </div>

            {/* Export Carers */}
            <div className="card" style={{ padding: '1.25rem', background: 'var(--gray-50)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: 600 }}>Export Carers</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '13px', color: 'var(--gray-600)' }}>
                Download all carer records as CSV
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => handleExport('carers')}>
                Export Carers
              </button>
            </div>

            {/* Export Visits */}
            <div className="card" style={{ padding: '1.25rem', background: 'var(--gray-50)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: 600 }}>Export Visits</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '13px', color: 'var(--gray-600)' }}>
                Download visit records for a date range
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => handleExport('visits')}>
                Export Visits
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: '6px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
              <strong>Note:</strong> Exported data includes all records based on your selected filters.
              Files are generated in CSV format for easy import into spreadsheet applications.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
