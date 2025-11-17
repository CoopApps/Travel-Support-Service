/**
 * Dividend Management Page
 *
 * Calculate and distribute dividends to cooperative members based on patronage.
 * Features:
 * - Calculate dividends for a period with configurable allocations
 * - Preview calculations before saving
 * - View distribution history
 * - Mark distributions as paid
 * - Individual member breakdowns
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { SettingsIcon } from '../icons/BusIcons';

// ============================================================================
// INTERFACES
// ============================================================================

interface Distribution {
  distribution_id: number;
  tenant_id: number;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_costs: number;
  gross_surplus: number;
  reserves_amount: number;
  business_costs_amount: number;
  dividend_pool: number;
  eligible_members: number;
  total_member_trips: number;
  status: 'pending' | 'calculated' | 'distributed' | 'cancelled';
  calculated_at?: string;
  distributed_at?: string;
}

interface MemberDividend {
  member_id: number;
  member_name: string;
  membership_number: string;
  trips_count: number;
  trip_percentage: number;
  dividend_amount: number;
}

interface DividendCalculation {
  distribution: Distribution;
  member_dividends: MemberDividend[];
  summary: {
    total_eligible_members: number;
    total_trips: number;
    total_dividend_pool: number;
    average_dividend_per_member: number;
    average_dividend_per_trip: number;
  };
}

interface SchedulerSettings {
  tenant_id: number;
  enabled: boolean;
  frequency: 'monthly' | 'quarterly';
  reserves_percent: number;
  business_percent: number;
  dividend_percent: number;
  auto_distribute: boolean;
  notification_email: string | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DividendManagementPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const token = useAuthStore((state) => state.token);

  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewCalculation, setPreviewCalculation] = useState<DividendCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Scheduler settings
  const [schedulerSettings, setSchedulerSettings] = useState<SchedulerSettings | null>(null);
  const [showSchedulerSettings, setShowSchedulerSettings] = useState(false);
  const [savingSchedulerSettings, setSavingSchedulerSettings] = useState(false);

  // Period selection
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Allocation percentages (must total 100%)
  const [reservesPercent, setReservesPercent] = useState(20);
  const [businessPercent, setBusinessPercent] = useState(30);
  const [dividendPercent, setDividendPercent] = useState(50);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    fetchDistributions();
    fetchSchedulerSettings();
  }, [tenantId]);

  const fetchDistributions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/dividends/distributions?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch distributions');

      const data = await response.json();
      setDistributions(data);
    } catch (error) {
      console.error('Error fetching distributions:', error);
      alert('Failed to load distribution history');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulerSettings = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/dividends/scheduler/settings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch scheduler settings');

      const data = await response.json();
      setSchedulerSettings(data);
    } catch (error) {
      console.error('Error fetching scheduler settings:', error);
    }
  };

  const updateSchedulerSettings = async (updates: Partial<SchedulerSettings>) => {
    try {
      setSavingSchedulerSettings(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/dividends/scheduler/settings`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      const data = await response.json();
      setSchedulerSettings(data.settings);
      alert('Automation settings updated successfully!');
      setShowSchedulerSettings(false);
    } catch (error: any) {
      console.error('Error updating scheduler settings:', error);
      alert(error.message || 'Failed to update settings');
    } finally {
      setSavingSchedulerSettings(false);
    }
  };

  // ============================================================================
  // DIVIDEND CALCULATION
  // ============================================================================

  const handleCalculate = async (saveImmediately: boolean = false) => {
    // Validation
    if (!periodStart || !periodEnd) {
      alert('Please select both start and end dates');
      return;
    }

    const total = reservesPercent + businessPercent + dividendPercent;
    if (Math.abs(total - 100) > 0.01) {
      alert(`Allocation percentages must total 100% (current: ${total}%)`);
      return;
    }

    try {
      setCalculating(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/dividends/calculate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            period_start: periodStart,
            period_end: periodEnd,
            reserves_percent: reservesPercent,
            business_percent: businessPercent,
            dividend_percent: dividendPercent,
            save: saveImmediately,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate dividends');
      }

      const calculation = await response.json();

      if (saveImmediately) {
        // Saved to database
        alert('Dividend distribution calculated and saved!');
        setShowCalculateDialog(false);
        fetchDistributions();
      } else {
        // Show preview
        setPreviewCalculation(calculation);
        setShowCalculateDialog(false);
        setShowPreviewDialog(true);
      }
    } catch (error: any) {
      console.error('Error calculating dividends:', error);
      alert(error.message || 'Failed to calculate dividends');
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveFromPreview = async () => {
    if (!previewCalculation) return;

    try {
      setSaving(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/dividends/calculate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            period_start: previewCalculation.distribution.period_start,
            period_end: previewCalculation.distribution.period_end,
            reserves_percent: reservesPercent,
            business_percent: businessPercent,
            dividend_percent: dividendPercent,
            save: true,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to save distribution');

      alert('Dividend distribution saved!');
      setShowPreviewDialog(false);
      setPreviewCalculation(null);
      fetchDistributions();
    } catch (error) {
      console.error('Error saving distribution:', error);
      alert('Failed to save distribution');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (distributionId: number) => {
    if (!confirm('Mark this distribution as paid? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/dividends/${distributionId}/pay`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            payment_method: 'account_credit',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to mark distribution as paid');

      alert('Distribution marked as paid!');
      fetchDistributions();
    } catch (error) {
      console.error('Error marking distribution paid:', error);
      alert('Failed to mark as paid');
    }
  };

  // ============================================================================
  // RENDER: CALCULATE DIALOG
  // ============================================================================

  const renderCalculateDialog = () => {
    if (!showCalculateDialog) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowCalculateDialog(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <h2>Calculate Dividends</h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Period Start
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', fontSize: '14px' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Period End
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', fontSize: '14px' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Surplus Allocation</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px' }}>
                Reserves: {reservesPercent}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={reservesPercent}
                onChange={(e) => setReservesPercent(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px' }}>
                Business Costs: {businessPercent}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={businessPercent}
                onChange={(e) => setBusinessPercent(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px' }}>
                Dividend Pool: {dividendPercent}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={dividendPercent}
                onChange={(e) => setDividendPercent(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div
              style={{
                padding: '0.5rem',
                background: reservesPercent + businessPercent + dividendPercent === 100 ? '#d4edda' : '#f8d7da',
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Total: {reservesPercent + businessPercent + dividendPercent}%
              {reservesPercent + businessPercent + dividendPercent !== 100 && ' (must equal 100%)'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCalculateDialog(false)}
              disabled={calculating}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#e9ecef',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleCalculate(false)}
              disabled={calculating}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {calculating ? 'Calculating...' : 'Preview Calculation'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: PREVIEW DIALOG
  // ============================================================================

  const renderPreviewDialog = () => {
    if (!showPreviewDialog || !previewCalculation) return null;

    const { distribution, member_dividends, summary } = previewCalculation;

    return (
      <div className="modal-overlay" onClick={() => setShowPreviewDialog(false)}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}
        >
          <h2>Dividend Calculation Preview</h2>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Period Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Period</div>
                <div style={{ fontWeight: 500 }}>
                  {new Date(distribution.period_start).toLocaleDateString()} -{' '}
                  {new Date(distribution.period_end).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Gross Surplus</div>
                <div style={{ fontWeight: 500, color: '#28a745' }}>
                  £{distribution.gross_surplus.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Eligible Members</div>
                <div style={{ fontWeight: 500 }}>{distribution.eligible_members}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Total Trips</div>
                <div style={{ fontWeight: 500 }}>{distribution.total_member_trips}</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e7f3ff', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Allocation Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Reserves ({reservesPercent}%)</div>
                <div style={{ fontWeight: 500 }}>£{distribution.reserves_amount.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Business ({businessPercent}%)</div>
                <div style={{ fontWeight: 500 }}>£{distribution.business_costs_amount.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Dividends ({dividendPercent}%)</div>
                <div style={{ fontWeight: 500, color: '#007bff', fontSize: '18px' }}>
                  £{distribution.dividend_pool.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Member Dividends</h3>
            <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #dee2e6', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', borderBottom: '2px solid #dee2e6' }}>
                      Member
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '12px', borderBottom: '2px solid #dee2e6' }}>
                      Type
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', borderBottom: '2px solid #dee2e6' }}>
                      Patronage
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', borderBottom: '2px solid #dee2e6' }}>
                      % of Total
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', borderBottom: '2px solid #dee2e6' }}>
                      Dividend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {member_dividends.map((dividend, idx) => (
                    <tr key={`${dividend.member_id}-${dividend.member_type || 'customer'}-${idx}`} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 500 }}>{dividend.member_name}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>{dividend.membership_number}</div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 500,
                            background: dividend.member_type === 'driver' ? '#e7f3ff' : '#f0fdf4',
                            color: dividend.member_type === 'driver' ? '#0066cc' : '#16a34a',
                          }}
                        >
                          {dividend.member_type === 'driver' ? '👥 Driver' : '🚗 Customer'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {dividend.patronage_value || dividend.trips_count}
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          {dividend.member_type === 'driver' ? 'trips driven' : 'trips taken'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {(dividend.patronage_percentage || dividend.trip_percentage).toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 500, color: '#28a745' }}>
                        £{dividend.dividend_amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowPreviewDialog(false)}
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#e9ecef',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveFromPreview}
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Distribution'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: SCHEDULER SETTINGS DIALOG
  // ============================================================================

  const renderSchedulerSettingsDialog = () => {
    if (!showSchedulerSettings || !schedulerSettings) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowSchedulerSettings(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <h2>Automation Settings</h2>
          <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
            Configure automated dividend calculation and distribution
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={schedulerSettings.enabled}
                onChange={(e) =>
                  setSchedulerSettings({ ...schedulerSettings, enabled: e.target.checked })
                }
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{ fontWeight: 500 }}>Enable Automated Dividend Calculation</span>
            </label>
          </div>

          {schedulerSettings.enabled && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Frequency
                </label>
                <select
                  value={schedulerSettings.frequency}
                  onChange={(e) =>
                    setSchedulerSettings({
                      ...schedulerSettings,
                      frequency: e.target.value as 'monthly' | 'quarterly',
                    })
                  }
                  style={{ width: '100%', padding: '0.5rem', fontSize: '14px' }}
                >
                  <option value="monthly">Monthly (1st of each month)</option>
                  <option value="quarterly">Quarterly (1st of Jan, Apr, Jul, Oct)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Allocation Percentages</h3>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px' }}>
                    Reserves: {schedulerSettings.reserves_percent}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={schedulerSettings.reserves_percent}
                    onChange={(e) =>
                      setSchedulerSettings({
                        ...schedulerSettings,
                        reserves_percent: parseInt(e.target.value),
                      })
                    }
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px' }}>
                    Business Costs: {schedulerSettings.business_percent}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={schedulerSettings.business_percent}
                    onChange={(e) =>
                      setSchedulerSettings({
                        ...schedulerSettings,
                        business_percent: parseInt(e.target.value),
                      })
                    }
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px' }}>
                    Dividend Pool: {schedulerSettings.dividend_percent}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={schedulerSettings.dividend_percent}
                    onChange={(e) =>
                      setSchedulerSettings({
                        ...schedulerSettings,
                        dividend_percent: parseInt(e.target.value),
                      })
                    }
                    style={{ width: '100%' }}
                  />
                </div>

                <div
                  style={{
                    padding: '0.5rem',
                    background:
                      schedulerSettings.reserves_percent +
                        schedulerSettings.business_percent +
                        schedulerSettings.dividend_percent ===
                      100
                        ? '#d4edda'
                        : '#f8d7da',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Total:{' '}
                  {schedulerSettings.reserves_percent +
                    schedulerSettings.business_percent +
                    schedulerSettings.dividend_percent}
                  %
                  {schedulerSettings.reserves_percent +
                    schedulerSettings.business_percent +
                    schedulerSettings.dividend_percent !==
                    100 && ' (must equal 100%)'}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={schedulerSettings.auto_distribute}
                    onChange={(e) =>
                      setSchedulerSettings({
                        ...schedulerSettings,
                        auto_distribute: e.target.checked,
                      })
                    }
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span style={{ fontWeight: 500 }}>
                    Auto-distribute (automatically mark as paid)
                  </span>
                </label>
                <p style={{ fontSize: '12px', color: '#6c757d', marginLeft: '28px', marginTop: '0.25rem' }}>
                  If disabled, dividends will be calculated but require manual approval
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Notification Email (optional)
                </label>
                <input
                  type="email"
                  value={schedulerSettings.notification_email || ''}
                  onChange={(e) =>
                    setSchedulerSettings({
                      ...schedulerSettings,
                      notification_email: e.target.value || null,
                    })
                  }
                  placeholder="admin@example.com"
                  style={{ width: '100%', padding: '0.5rem', fontSize: '14px' }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowSchedulerSettings(false)}
              disabled={savingSchedulerSettings}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#e9ecef',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => updateSchedulerSettings(schedulerSettings)}
              disabled={savingSchedulerSettings}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {savingSchedulerSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: MAIN PAGE
  // ============================================================================

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Dividend Management</h1>
          <p style={{ color: '#6c757d' }}>Calculate and distribute dividends to cooperative members</p>
        </div>
        <button
          onClick={() => setShowCalculateDialog(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 500,
          }}
        >
          Calculate Dividends
        </button>
      </div>

      {/* Automation Settings Banner */}
      {schedulerSettings && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.5rem',
            background: schedulerSettings.enabled ? '#d4edda' : '#f8f9fa',
            border: `1px solid ${schedulerSettings.enabled ? '#c3e6cb' : '#dee2e6'}`,
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '20px' }}>{schedulerSettings.enabled ? '🤖' : '⏸️'}</span>
              <h3 style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>
                Automated Dividend Calculation{' '}
                <span
                  style={{
                    fontSize: '12px',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    background: schedulerSettings.enabled ? '#28a745' : '#6c757d',
                    color: 'white',
                    marginLeft: '0.5rem',
                  }}
                >
                  {schedulerSettings.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </h3>
            </div>
            {schedulerSettings.enabled && (
              <p style={{ fontSize: '14px', color: '#6c757d', margin: 0 }}>
                Runs {schedulerSettings.frequency} on the 1st at 1:00 AM •
                Allocations: {schedulerSettings.reserves_percent}% reserves, {schedulerSettings.business_percent}% business, {schedulerSettings.dividend_percent}% dividends
                {schedulerSettings.auto_distribute && ' • Auto-distribute enabled'}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowSchedulerSettings(true)}
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <SettingsIcon size={16} />
              Configure
            </span>
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: '#6c757d' }}>Loading distributions...</p>
        </div>
      ) : distributions.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#f8f9fa',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>💰</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No Distributions Yet</h3>
          <p style={{ color: '#6c757d' }}>Click "Calculate Dividends" to create your first distribution</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #dee2e6', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Period</th>
                <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Surplus</th>
                <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>
                  Dividend Pool
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Members</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Trips</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((dist) => (
                <tr key={dist.distribution_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500 }}>
                      {new Date(dist.period_start).toLocaleDateString()} -{' '}
                      {new Date(dist.period_end).toLocaleDateString()}
                    </div>
                    {dist.calculated_at && (
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        Calculated: {new Date(dist.calculated_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500 }}>
                    £{dist.gross_surplus.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: '#007bff' }}>
                    £{dist.dividend_pool.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{dist.eligible_members}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{dist.total_member_trips}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background:
                          dist.status === 'distributed'
                            ? '#d4edda'
                            : dist.status === 'calculated'
                            ? '#fff3cd'
                            : '#f8d7da',
                        color:
                          dist.status === 'distributed'
                            ? '#155724'
                            : dist.status === 'calculated'
                            ? '#856404'
                            : '#721c24',
                      }}
                    >
                      {dist.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {dist.status === 'calculated' && (
                      <button
                        onClick={() => handleMarkPaid(dist.distribution_id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        Mark as Paid
                      </button>
                    )}
                    {dist.status === 'distributed' && dist.distributed_at && (
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        Paid: {new Date(dist.distributed_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {renderCalculateDialog()}
      {renderPreviewDialog()}
      {renderSchedulerSettingsDialog()}
    </div>
  );
};

export default DividendManagementPage;
