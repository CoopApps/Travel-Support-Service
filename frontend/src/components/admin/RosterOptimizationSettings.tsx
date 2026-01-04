/**
 * Roster Optimization Settings Page
 *
 * Admin interface for configuring driver assignment optimization settings
 */

import { useState, useEffect } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { tenantSettingsApi } from '../../services/api';

interface RosterOptimizationSettingsData {
  enabled: boolean;
  maxTimeWindowMinutes: number;
  maxDistanceRadius: number;
  considerDriverHome: boolean;
  prioritizeRegularDrivers: boolean;
  minimizeDeadMiles: boolean;
}

function RosterOptimizationSettings() {
  const { tenant } = useTenant();
  const [settings, setSettings] = useState<RosterOptimizationSettingsData>({
    enabled: true,
    maxTimeWindowMinutes: 30,
    maxDistanceRadius: 10,
    considerDriverHome: true,
    prioritizeRegularDrivers: true,
    minimizeDeadMiles: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadSettings();
    }
  }, [tenant?.tenant_id]);

  const loadSettings = async () => {
    if (!tenant?.tenant_id) return;

    setLoading(true);
    setError('');

    try {
      const data = await tenantSettingsApi.getRosterOptimizationSettings(tenant.tenant_id);
      if (data) {
        setSettings(data);
      }
    } catch (err: any) {
      // Use defaults if no settings exist yet
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.tenant_id) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await tenantSettingsApi.updateRosterOptimizationSettings(tenant.tenant_id, settings);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <div style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Alerts */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem', background: '#d1fae5', color: '#065f46' }}>
          {success}
        </div>
      )}

      {/* Settings Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        {/* Enable/Disable Roster Optimization */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--gray-200)' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--gray-900)' }}>
                Enable Driver Assignment Suggestions
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '4px' }}>
                Automatically suggest optimal drivers when scheduling trips
              </div>
            </div>
          </label>
        </div>

        {/* Optimization Options */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            Optimization Criteria
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Prioritize Regular Drivers */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '12px',
              background: settings.prioritizeRegularDrivers ? '#f0fdf4' : '#f9fafb',
              borderRadius: '8px',
              border: settings.prioritizeRegularDrivers ? '1px solid #86efac' : '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={settings.prioritizeRegularDrivers}
                onChange={(e) => setSettings({ ...settings, prioritizeRegularDrivers: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--gray-900)' }}>
                  Prioritize Regular Drivers
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                  When a customer has an assigned regular driver, prioritize them first
                </div>
              </div>
            </label>

            {/* Consider Driver Home Location */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '12px',
              background: settings.considerDriverHome ? '#f0fdf4' : '#f9fafb',
              borderRadius: '8px',
              border: settings.considerDriverHome ? '1px solid #86efac' : '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={settings.considerDriverHome}
                onChange={(e) => setSettings({ ...settings, considerDriverHome: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--gray-900)' }}>
                  Consider Driver Home Location
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                  For end-of-day trips, suggest drivers whose home is near the destination
                </div>
              </div>
            </label>

            {/* Minimize Dead Miles */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '12px',
              background: settings.minimizeDeadMiles ? '#f0fdf4' : '#f9fafb',
              borderRadius: '8px',
              border: settings.minimizeDeadMiles ? '1px solid #86efac' : '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={settings.minimizeDeadMiles}
                onChange={(e) => setSettings({ ...settings, minimizeDeadMiles: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--gray-900)' }}>
                  Minimize Dead Miles
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                  Prefer drivers who are already in the area or whose route passes by the pickup
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Advanced Settings */}
        <div style={{ marginBottom: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            Matching Parameters
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Max Time Window */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '14px' }}>
                Time Window (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.maxTimeWindowMinutes}
                onChange={(e) => setSettings({ ...settings, maxTimeWindowMinutes: parseInt(e.target.value) || 30 })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-300)' }}
              />
              <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
                Driver must be available within this window
              </div>
            </div>

            {/* Max Distance Radius */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '14px' }}>
                Distance Radius (miles)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.maxDistanceRadius}
                onChange={(e) => setSettings({ ...settings, maxDistanceRadius: parseInt(e.target.value) || 10 })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-300)' }}
              />
              <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
                Consider drivers within this radius of pickup
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 2rem',
              fontSize: '15px',
              fontWeight: 600,
              opacity: saving ? 0.5 : 1
            }}
          >
            {saving ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                Saving...
              </div>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: '#eff6ff',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#1e40af'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lightbulb size={16} />
          How It Works:
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>When scheduling a trip, the system analyzes driver locations and schedules</li>
          <li>Suggests drivers who are nearby or whose route passes the pickup location</li>
          <li>For end-of-day trips, considers drivers heading home in that direction</li>
          <li>Reduces empty miles and improves driver efficiency</li>
        </ul>
      </div>
    </div>
  );
}

export default RosterOptimizationSettings;
