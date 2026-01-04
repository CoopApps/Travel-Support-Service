/**
 * Create Route Proposal Modal Component
 *
 * Allows customers to propose new bus routes with:
 * - Origin postcode areas (multi-select)
 * - Destination
 * - Operating schedule
 * - Target capacity
 * - Privacy consent (required on first proposal)
 */

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';

interface CreateProposalModalProps {
  onClose: () => void;
  onCreated: () => void;
}

interface PrivacySettings {
  privacy_consent_given: boolean;
  share_travel_patterns: boolean;
  privacy_level: 'private' | 'area_only' | 'full_sharing';
}

const CreateProposalModal: React.FC<CreateProposalModalProps> = ({ onClose, onCreated }) => {
  const { tenant } = useTenant();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  // Form state
  const [routeName, setRouteName] = useState('');
  const [originPostcodes, setOriginPostcodes] = useState<string[]>([]);
  const [originInput, setOriginInput] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [destinationPostcode, setDestinationPostcode] = useState('');
  const [proposedFrequency, setProposedFrequency] = useState('weekdays');
  const [departureTimeStart, setDepartureTimeStart] = useState('07:00');
  const [departureTimeEnd, setDepartureTimeEnd] = useState('09:00');
  const [targetPassengers, setTargetPassengers] = useState(16);
  const [minimumPassengers, setMinimumPassengers] = useState(8);
  const [description, setDescription] = useState('');
  const [submitAsAnonymous, setSubmitAsAnonymous] = useState(false);

  // Operating days
  const [operatesMonday, setOperatesMonday] = useState(true);
  const [operatesTuesday, setOperatesTuesday] = useState(true);
  const [operatesWednesday, setOperatesWednesday] = useState(true);
  const [operatesThursday, setOperatesThursday] = useState(true);
  const [operatesFriday, setOperatesFriday] = useState(true);
  const [operatesSaturday, setOperatesSaturday] = useState(false);
  const [operatesSunday, setOperatesSunday] = useState(false);

  // Privacy state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [needsPrivacyConsent, setNeedsPrivacyConsent] = useState(false);
  const [shareTravelPatterns, setShareTravelPatterns] = useState(true);
  const [privacyLevel, setPrivacyLevel] = useState<'private' | 'area_only' | 'full_sharing'>('area_only');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'privacy' | 'proposal'>('proposal');

  useEffect(() => {
    checkPrivacySettings();
  }, []);

  const checkPrivacySettings = async () => {
    if (!tenant?.tenant_id || !token) return;

    try {
      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/customer-route-proposals/my-privacy`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPrivacySettings(data);

        if (!data.privacy_consent_given) {
          setNeedsPrivacyConsent(true);
          setStep('privacy');
        }
      }
    } catch {
      // Error handled silently
    }
  };

  const handlePrivacyConsent = async () => {
    if (!tenant?.tenant_id || !token) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/customer-route-proposals/privacy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            privacy_consent_given: true,
            share_travel_patterns: shareTravelPatterns,
            privacy_level: privacyLevel
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save privacy settings');
      }

      setNeedsPrivacyConsent(false);
      setStep('proposal');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPostcode = () => {
    const trimmed = originInput.trim().toUpperCase();
    if (trimmed && !originPostcodes.includes(trimmed)) {
      setOriginPostcodes([...originPostcodes, trimmed]);
      setOriginInput('');
    }
  };

  const handleRemovePostcode = (postcode: string) => {
    setOriginPostcodes(originPostcodes.filter(p => p !== postcode));
  };

  const handleFrequencyChange = (freq: string) => {
    setProposedFrequency(freq);

    // Auto-set days based on frequency
    if (freq === 'daily') {
      setOperatesMonday(true);
      setOperatesTuesday(true);
      setOperatesWednesday(true);
      setOperatesThursday(true);
      setOperatesFriday(true);
      setOperatesSaturday(true);
      setOperatesSunday(true);
    } else if (freq === 'weekdays') {
      setOperatesMonday(true);
      setOperatesTuesday(true);
      setOperatesWednesday(true);
      setOperatesThursday(true);
      setOperatesFriday(true);
      setOperatesSaturday(false);
      setOperatesSunday(false);
    } else if (freq === 'weekends') {
      setOperatesMonday(false);
      setOperatesTuesday(false);
      setOperatesWednesday(false);
      setOperatesThursday(false);
      setOperatesFriday(false);
      setOperatesSaturday(true);
      setOperatesSunday(true);
    }
  };

  const handleSubmit = async () => {
    if (!tenant?.tenant_id || !token) return;

    // Validation
    if (!routeName.trim()) {
      setError('Please enter a route name');
      return;
    }
    if (originPostcodes.length === 0) {
      setError('Please add at least one origin postcode area');
      return;
    }
    if (!destinationName.trim()) {
      setError('Please enter a destination name');
      return;
    }
    if (!operatesMonday && !operatesTuesday && !operatesWednesday &&
        !operatesThursday && !operatesFriday && !operatesSaturday && !operatesSunday) {
      setError('Please select at least one operating day');
      return;
    }
    if (targetPassengers < minimumPassengers) {
      setError('Target passengers must be greater than or equal to minimum passengers');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/customer-route-proposals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            route_name: routeName,
            origin_postcodes: originPostcodes,
            destination_name: destinationName,
            destination_postcode: destinationPostcode || null,
            proposed_frequency: proposedFrequency,
            departure_time_window_start: departureTimeStart,
            departure_time_window_end: departureTimeEnd,
            operates_monday: operatesMonday,
            operates_tuesday: operatesTuesday,
            operates_wednesday: operatesWednesday,
            operates_thursday: operatesThursday,
            operates_friday: operatesFriday,
            operates_saturday: operatesSaturday,
            operates_sunday: operatesSunday,
            target_passengers: targetPassengers,
            minimum_passengers_required: minimumPassengers,
            proposal_description: description || null,
            submit_as_anonymous: submitAsAnonymous
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create proposal');
      }

      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: step === 'privacy' ? '600px' : '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Privacy Consent Step */}
        {step === 'privacy' && (
          <div style={{ padding: '2rem' }}>
            <h2 style={{ margin: '0 0 1rem 0' }}>🔒 Privacy Settings</h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: '2rem' }}>
              Before creating a route proposal, please review your privacy preferences.
              This helps us find other customers with similar travel patterns.
            </p>

            {/* Privacy Level */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Privacy Level
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: privacyLevel === 'area_only' ? '3px solid var(--primary-color)' : '2px solid var(--gray-300)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: privacyLevel === 'area_only' ? 'rgba(102, 126, 234, 0.05)' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    value="area_only"
                    checked={privacyLevel === 'area_only'}
                    onChange={(e) => setPrivacyLevel(e.target.value as any)}
                    style={{ marginTop: '0.25rem' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      📍 Share Postcode Area Only (Recommended)
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      We'll share your postcode area (e.g., "S10") but not your full address
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: privacyLevel === 'full_sharing' ? '3px solid var(--primary-color)' : '2px solid var(--gray-300)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: privacyLevel === 'full_sharing' ? 'rgba(102, 126, 234, 0.05)' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    value="full_sharing"
                    checked={privacyLevel === 'full_sharing'}
                    onChange={(e) => setPrivacyLevel(e.target.value as any)}
                    style={{ marginTop: '0.25rem' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      🌍 Share Full Travel Patterns
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      Better matching with other customers (postcode, destination, schedule)
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: privacyLevel === 'private' ? '3px solid var(--primary-color)' : '2px solid var(--gray-300)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: privacyLevel === 'private' ? 'rgba(102, 126, 234, 0.05)' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    value="private"
                    checked={privacyLevel === 'private'}
                    onChange={(e) => setPrivacyLevel(e.target.value as any)}
                    style={{ marginTop: '0.25rem' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      🔒 Private
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      Don't share my travel patterns with anyone
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Share Travel Patterns */}
            <div style={{ marginBottom: '2rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={shareTravelPatterns}
                  onChange={(e) => setShareTravelPatterns(e.target.checked)}
                />
                <span>
                  I want to receive invitations for routes that match my travel patterns
                </span>
              </label>
            </div>

            {/* Privacy Notice */}
            <div
              style={{
                background: 'var(--gray-50)',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: 'var(--gray-600)',
                marginBottom: '2rem'
              }}
            >
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--gray-900)' }}>
                How We Use Your Data
              </strong>
              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                <li>We use your travel patterns to suggest relevant route proposals</li>
                <li>You can change these settings anytime</li>
                <li>We never share your data with third parties</li>
                <li>You can delete your data at any time</li>
              </ul>
            </div>

            {error && (
              <div
                style={{
                  background: '#fee',
                  color: '#c33',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: 'white',
                  color: 'var(--gray-700)',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePrivacyConsent}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Saving...' : 'Continue to Proposal'}
              </button>
            </div>
          </div>
        )}

        {/* Create Proposal Step */}
        {step === 'proposal' && (
          <div style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 0.5rem 0' }}>🚌 Propose a New Route</h2>
              <p style={{ margin: 0, color: 'var(--gray-600)' }}>
                Help build the service you need by proposing routes that work for you
              </p>
            </div>

            {/* Route Name */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Route Name *
              </label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="e.g., South Sheffield to Northern General Hospital"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            {/* Origin Postcode Areas */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Origin Postcode Areas * (e.g., S10, S11, S17)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPostcode();
                    }
                  }}
                  placeholder="Enter postcode area (e.g., S10)"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '2px solid var(--gray-300)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
                <button
                  onClick={handleAddPostcode}
                  type="button"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Add
                </button>
              </div>
              {originPostcodes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {originPostcodes.map((postcode) => (
                    <span
                      key={postcode}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--primary-color)',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                    >
                      📍 {postcode}
                      <button
                        onClick={() => handleRemovePostcode(postcode)}
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0',
                          fontSize: '1.2rem',
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Destination */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Destination *
              </label>
              <input
                type="text"
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                placeholder="e.g., Northern General Hospital"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  marginBottom: '0.5rem'
                }}
              />
              <input
                type="text"
                value={destinationPostcode}
                onChange={(e) => setDestinationPostcode(e.target.value)}
                placeholder="Destination postcode (optional)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            {/* Frequency */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Frequency
              </label>
              <select
                value={proposedFrequency}
                onChange={(e) => handleFrequencyChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="daily">Daily (every day)</option>
                <option value="weekdays">Weekdays (Mon-Fri)</option>
                <option value="weekends">Weekends (Sat-Sun)</option>
                <option value="custom">Custom schedule</option>
              </select>
            </div>

            {/* Operating Days */}
            {proposedFrequency === 'custom' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Operating Days
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {[
                    { label: 'Mon', state: operatesMonday, setter: setOperatesMonday },
                    { label: 'Tue', state: operatesTuesday, setter: setOperatesTuesday },
                    { label: 'Wed', state: operatesWednesday, setter: setOperatesWednesday },
                    { label: 'Thu', state: operatesThursday, setter: setOperatesThursday },
                    { label: 'Fri', state: operatesFriday, setter: setOperatesFriday },
                    { label: 'Sat', state: operatesSaturday, setter: setOperatesSaturday },
                    { label: 'Sun', state: operatesSunday, setter: setOperatesSunday }
                  ].map(({ label, state, setter }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setter(!state)}
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: state ? 'var(--primary-color)' : 'white',
                        color: state ? 'white' : 'var(--gray-700)',
                        border: state ? 'none' : '2px solid var(--gray-300)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Window */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Departure Time Window
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                    Earliest
                  </label>
                  <input
                    type="time"
                    value={departureTimeStart}
                    onChange={(e) => setDepartureTimeStart(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                    Latest
                  </label>
                  <input
                    type="time"
                    value={departureTimeEnd}
                    onChange={(e) => setDepartureTimeEnd(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Capacity */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Passenger Capacity
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                    Minimum Required (for viability)
                  </label>
                  <input
                    type="number"
                    value={minimumPassengers}
                    onChange={(e) => setMinimumPassengers(parseInt(e.target.value) || 8)}
                    min="4"
                    max="20"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                    Target Passengers
                  </label>
                  <input
                    type="number"
                    value={targetPassengers}
                    onChange={(e) => setTargetPassengers(parseInt(e.target.value) || 16)}
                    min={minimumPassengers}
                    max="20"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us why this route is needed and who would benefit..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Anonymous Option */}
            <div style={{ marginBottom: '2rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={submitAsAnonymous}
                  onChange={(e) => setSubmitAsAnonymous(e.target.checked)}
                />
                <span>Submit this proposal anonymously</span>
              </label>
            </div>

            {/* Cooperative Principle Notice */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--gray-900)' }}>
                💡 Cooperative Pricing
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                The more people who pledge to use this route, the cheaper it gets for everyone!
                At full capacity, fares can be 70% lower than with fewer passengers.
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: '#fee',
                  color: '#c33',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: 'white',
                  color: 'var(--gray-700)',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '0.875rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? '🚌 Creating Proposal...' : '🚌 Create Proposal'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateProposalModal;
