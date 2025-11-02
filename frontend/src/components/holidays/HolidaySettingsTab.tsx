import React, { useState } from 'react';
import { HolidaySettings } from '../../types/holiday.types';

interface HolidaySettingsTabProps {
  settings: HolidaySettings;
  onSave: (settings: Partial<HolidaySettings>) => Promise<void>;
}

const HolidaySettingsTab: React.FC<HolidaySettingsTabProps> = ({
  settings,
  onSave
}) => {
  const [formData, setFormData] = useState({
    annual_allowance: settings.annual_allowance,
    carry_over_enabled: settings.carry_over_enabled,
    carry_over_limit: settings.carry_over_limit,
    require_approval_for_customers: !settings.auto_approve_customer_requests // Reversed logic
  });
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSavedMessage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Convert back to backend format (reversed logic)
      await onSave({
        annual_allowance: formData.annual_allowance,
        carry_over_enabled: formData.carry_over_enabled,
        carry_over_limit: formData.carry_over_limit,
        auto_approve_customer_requests: !formData.require_approval_for_customers
      });

      setHasChanges(false);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      annual_allowance: settings.annual_allowance,
      carry_over_enabled: settings.carry_over_enabled,
      carry_over_limit: settings.carry_over_limit,
      require_approval_for_customers: !settings.auto_approve_customer_requests
    });
    setHasChanges(false);
    setSavedMessage(false);
  };

  return (
    <div className="settings-tab">
      <div className="settings-header">
        <div>
          <h2>Holiday Management Settings</h2>
          <p className="settings-description">
            Configure how holidays are managed for your organization
          </p>
        </div>
        {savedMessage && (
          <div className="save-success-message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Settings saved successfully
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="settings-form-modern">
        <div className="settings-grid">
          {/* Annual Allowance Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon section-icon-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <h3>Annual Holiday Allowance</h3>
                <p>Standard entitlement for all drivers</p>
              </div>
            </div>

            <div className="setting-card">
              <div className="setting-content">
                <div className="setting-info">
                  <label htmlFor="annual_allowance" className="setting-label">
                    Days per year
                  </label>
                  <p className="setting-hint">
                    Default paid holiday days per driver annually
                  </p>
                </div>
                <div className="setting-control">
                  <div className="number-input-group">
                    <input
                      id="annual_allowance"
                      type="number"
                      min="0"
                      max="50"
                      value={formData.annual_allowance}
                      onChange={(e) => handleChange('annual_allowance', parseInt(e.target.value))}
                      className="form-control form-control-large"
                    />
                    <span className="input-suffix">days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carry Over Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon section-icon-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </div>
              <div>
                <h3>Carry Over Policy</h3>
                <p>Roll over unused holidays to next year</p>
              </div>
            </div>

            <div className="setting-card">
              <div className="setting-content">
                <div className="setting-info">
                  <label className="setting-label">
                    Enable carry over
                  </label>
                  <p className="setting-hint">
                    Allow drivers to carry unused days to next year
                  </p>
                </div>
                <div className="setting-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.carry_over_enabled}
                      onChange={(e) => handleChange('carry_over_enabled', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {formData.carry_over_enabled && (
                <div className="setting-content setting-content-nested">
                  <div className="setting-info">
                    <label htmlFor="carry_over_limit" className="setting-label">
                      Maximum carry over
                    </label>
                    <p className="setting-hint">
                      Days that can be carried forward
                    </p>
                  </div>
                  <div className="setting-control">
                    <div className="number-input-group">
                      <input
                        id="carry_over_limit"
                        type="number"
                        min="0"
                        max="20"
                        value={formData.carry_over_limit}
                        onChange={(e) => handleChange('carry_over_limit', parseInt(e.target.value))}
                        className="form-control form-control-large"
                      />
                      <span className="input-suffix">days</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Requests Section - Spans both columns */}
          <div className="settings-section settings-section-full">
            <div className="section-header">
              <div className="section-icon section-icon-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <polyline points="17 11 19 13 23 9"></polyline>
                </svg>
              </div>
              <div>
                <h3>Customer Absence Approval</h3>
                <p>Control how customer absence requests are handled</p>
              </div>
            </div>

            <div className="setting-card">
              <div className="setting-content">
                <div className="setting-info">
                  <label className="setting-label">
                    Require admin approval
                  </label>
                  <p className="setting-hint">
                    When enabled, customer absences need manual approval. When disabled, they are auto-approved (informational only).
                  </p>
                </div>
                <div className="setting-control">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.require_approval_for_customers}
                      onChange={(e) => handleChange('require_approval_for_customers', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-info-banner">
                {formData.require_approval_for_customers ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>
                      <strong>Approval Required:</strong> Admin must manually approve all customer absence requests
                    </span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>
                      <strong>Auto-Approved:</strong> Customer absences are automatically approved (informational only)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary"
            disabled={!hasChanges || saving}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Reset Changes
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <span className="spinner-small"></span>
                Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Information Panel */}
      <div className="settings-info-panel">
        <div className="info-panel-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <h4>About Holiday Settings</h4>
        </div>
        <ul className="info-list">
          <li>
            <strong>Annual Allowance:</strong> UK law requires a minimum of 28 days (including bank holidays)
          </li>
          <li>
            <strong>Carry Over:</strong> Consider your company policy when enabling carry over
          </li>
          <li>
            <strong>Customer Requests:</strong> Driver requests always require approval, only customer absence tracking is configurable
          </li>
          <li>
            <strong>Changes Apply:</strong> Settings take effect immediately for all new requests
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HolidaySettingsTab;
