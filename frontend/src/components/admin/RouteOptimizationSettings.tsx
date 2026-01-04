/**
 * Route Optimization Settings Page
 *
 * Admin interface for configuring carpooling and route optimization settings
 */

import { useState, useEffect } from 'react';
import { Check, AlertTriangle, DollarSign, Lightbulb } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { tenantSettingsApi } from '../../services/api';

interface RouteOptimizationSettings {
  enabled: boolean;
  useGoogleMaps: boolean;
  maxDetourMinutes: number;
  maxDetourMiles: number;
}

function RouteOptimizationSettings() {
  const { tenant } = useTenant();
  const [settings, setSettings] = useState<RouteOptimizationSettings>({
    enabled: true,
    useGoogleMaps: false,
    maxDetourMinutes: 15,
    maxDetourMiles: 5
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
      const data = await tenantSettingsApi.getRouteOptimizationSettings(tenant.tenant_id);
      setSettings(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load settings');
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
      await tenantSettingsApi.updateRouteOptimizationSettings(tenant.tenant_id, settings);
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
        {/* Enable/Disable Carpooling */}
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
                Enable Carpooling Recommendations
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '4px' }}>
                Show passenger recommendations when creating trips
              </div>
            </div>
          </label>
        </div>

        {/* Proximity Detection Method */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            Proximity Detection Method
          </h3>

          {/* Basic (FREE) Option */}
          <label style={{
            display: 'block',
            padding: '1rem',
            border: !settings.useGoogleMaps ? '2px solid var(--primary)' : '1px solid var(--gray-300)',
            borderRadius: '8px',
            marginBottom: '1rem',
            cursor: 'pointer',
            background: !settings.useGoogleMaps ? 'var(--primary-light, #eff6ff)' : 'white',
            transition: 'all 0.2s'
          }}>
            <input
              type="radio"
              name="proximityMethod"
              checked={!settings.useGoogleMaps}
              onChange={() => setSettings({ ...settings, useGoogleMaps: false })}
              style={{ marginRight: '12px' }}
            />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>
              Basic (FREE) - Postcode-based Proximity
            </span>

            <div style={{
              marginLeft: '28px',
              marginTop: '8px',
              fontSize: '13px',
              color: 'var(--gray-700)'
            }}>
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={14} color="#16a34a" /> Works offline - no internet required
              </div>
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={14} color="#16a34a" /> No additional costs
              </div>
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={14} color="#16a34a" /> ~70-80% accuracy for UK postcodes
              </div>
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={14} color="#16a34a" /> Detects same street/neighborhood matches
              </div>
              <div style={{ marginTop: '8px', padding: '8px', background: '#f0fdf4', borderRadius: '4px', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={16} /> Recommended for most users
              </div>
            </div>
          </label>

          {/* Enhanced (PAID) Option */}
          <label style={{
            display: 'block',
            padding: '1rem',
            border: settings.useGoogleMaps ? '2px solid var(--primary)' : '1px solid var(--gray-300)',
            borderRadius: '8px',
            cursor: 'pointer',
            background: settings.useGoogleMaps ? 'var(--primary-light, #eff6ff)' : 'white',
            transition: 'all 0.2s'
          }}>
            <input
              type="radio"
              name="proximityMethod"
              checked={settings.useGoogleMaps}
              onChange={() => setSettings({ ...settings, useGoogleMaps: true })}
              style={{ marginRight: '12px' }}
            />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>
              Enhanced (PAID) - Google Maps API
            </span>

            <div style={{
              marginLeft: '28px',
              marginTop: '8px',
              fontSize: '13px',
              color: 'var(--gray-700)'
            }}>
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={14} color="#16a34a" /> Precise route calculations with actual roads
              </div>
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={14} color="#16a34a" /> Exact detour times (e.g., "+3 minutes")
              </div>
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={14} color="#16a34a" /> Traffic-aware routing
              </div>
              <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={14} color="#16a34a" /> ~95% accuracy
              </div>
              <div style={{ marginTop: '8px', padding: '8px', background: '#fff7ed', borderRadius: '4px', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> Cost: ~£0.50-2.00/month (depends on usage)
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--gray-600)', fontStyle: 'italic' }}>
                Google Maps API key must be configured in environment variables
              </div>
            </div>
          </label>
        </div>

        {/* Advanced Settings */}
        {settings.useGoogleMaps && (
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
              Advanced Settings
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Max Detour Minutes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '14px' }}>
                  Max Detour Time (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.maxDetourMinutes}
                  onChange={(e) => setSettings({ ...settings, maxDetourMinutes: parseInt(e.target.value) || 15 })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-300)' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
                  Don't recommend if detour exceeds this
                </div>
              </div>

              {/* Max Detour Miles */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '14px' }}>
                  Max Detour Distance (miles)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxDetourMiles}
                  onChange={(e) => setSettings({ ...settings, maxDetourMiles: parseInt(e.target.value) || 5 })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-300)' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
                  Don't recommend if detour exceeds this
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
          <button
            onClick={handleSave}
            disabled={saving || !settings.enabled}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 2rem',
              fontSize: '15px',
              fontWeight: 600,
              opacity: (!settings.enabled || saving) ? 0.5 : 1
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
          <li>When creating a trip, the system finds compatible passengers going the same way</li>
          <li>Recommendations are ranked by proximity, destination similarity, and time compatibility</li>
          <li>Customers with regular drivers are prioritized for their assigned driver</li>
          <li>You can select multiple passengers and create all trips with one click</li>
        </ul>
      </div>
    </div>
  );
}

export default RouteOptimizationSettings;
