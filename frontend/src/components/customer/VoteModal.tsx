/**
 * Vote Modal Component
 *
 * Allows customers to vote on route proposals with three levels:
 * - Pledge: "I WILL use this regularly" (binding commitment)
 * - Interested: "I like this idea"
 * - Maybe: "Might use occasionally"
 *
 * Shows cooperative fare transparency and how fare drops as more pledge.
 */

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';

interface RouteProposal {
  proposal_id: number;
  route_name: string;
  origin_area: string;
  destination_name: string;
  total_pledges: number;
  target_passengers: number;
  fare_preview?: {
    current_fare: number;
    fare_at_target: number;
  };
}

interface VoteModalProps {
  proposal: RouteProposal;
  onClose: () => void;
  onVoted: () => void;
}

const VoteModal: React.FC<VoteModalProps> = ({ proposal, onClose, onVoted }) => {
  const { tenant } = useTenant();
  const token = useAuthStore((state) => state.token);

  const [voteType, setVoteType] = useState<'interested' | 'pledge' | 'maybe'>('interested');
  const [expectedFrequency, setExpectedFrequency] = useState<string>('');
  const [willingToPay, setWillingToPay] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation for pledges
    if (voteType === 'pledge') {
      if (!expectedFrequency) {
        setError('Please select how often you would use this service');
        return;
      }
      if (!willingToPay || parseFloat(willingToPay) <= 0) {
        setError('Please enter the maximum fare you are willing to pay');
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/tenants/${tenant!.tenant_id}/customer-route-proposals/${proposal.proposal_id}/vote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            vote_type: voteType,
            expected_frequency: expectedFrequency || null,
            willing_to_pay_amount: willingToPay ? parseFloat(willingToPay) : null,
            is_anonymous: isAnonymous,
            notes: notes || null
          })
        }
      );

      if (response.ok) {
        onVoted();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to record vote');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getVoteTypeIcon = (type: 'interested' | 'pledge' | 'maybe') => {
    switch (type) {
      case 'pledge': return '🤝';
      case 'interested': return '👍';
      case 'maybe': return '🤔';
    }
  };

  const fareAfterAdditionalPledges = (additionalPledges: number) => {
    if (!proposal.fare_preview?.current_fare) return null;

    const currentPassengers = proposal.total_pledges || 1;
    const newPassengers = currentPassengers + additionalPledges;

    // Simplified calculation (actual should come from backend)
    const estimatedCost = 21.48; // Example journey cost
    const newFare = estimatedCost / newPassengers;

    return Math.max(1.00, Math.min(10.00, newFare));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '2rem',
            borderBottom: '2px solid var(--gray-200)',
            position: 'relative'
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--gray-500)',
              padding: '0.5rem'
            }}
          >
            ✕
          </button>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Support This Route</h2>
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '1rem' }}>
            {proposal.route_name}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div style={{ padding: '2rem' }}>
            {/* Fare Preview Box */}
            {proposal.fare_preview && (
              <div
                style={{
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '16px',
                  color: 'white'
                }}
              >
                <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                  💰 Current Fare ({proposal.total_pledges} pledges)
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  £{proposal.fare_preview.current_fare.toFixed(2)}
                </div>
                {proposal.total_pledges < proposal.target_passengers && (
                  <>
                    <div
                      style={{
                        height: '1px',
                        background: 'rgba(255,255,255,0.3)',
                        margin: '1rem 0'
                      }}
                    />
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                      📉 If {proposal.target_passengers - proposal.total_pledges} more pledge:
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                      £{proposal.fare_preview.fare_at_target?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
                      You save: £
                      {(
                        proposal.fare_preview.current_fare -
                        (proposal.fare_preview.fare_at_target || 0)
                      ).toFixed(2)}{' '}
                      per trip!
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Vote Type Selection */}
            <div style={{ marginBottom: '2rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '1rem',
                  fontWeight: 600,
                  fontSize: '1rem'
                }}
              >
                How interested are you?
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Pledge Option */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem',
                    border: voteType === 'pledge' ? '3px solid #10b981' : '2px solid var(--gray-300)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: voteType === 'pledge' ? 'rgba(16, 185, 129, 0.05)' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    value="pledge"
                    checked={voteType === 'pledge'}
                    onChange={() => setVoteType('pledge')}
                    style={{ marginTop: '0.25rem' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                      {getVoteTypeIcon('pledge')} I Pledge to Use This
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      I will regularly use this service (binding commitment)
                    </div>
                  </div>
                </label>

                {/* Interested Option */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem',
                    border: voteType === 'interested' ? '3px solid #3b82f6' : '2px solid var(--gray-300)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: voteType === 'interested' ? 'rgba(59, 130, 246, 0.05)' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    value="interested"
                    checked={voteType === 'interested'}
                    onChange={() => setVoteType('interested')}
                    style={{ marginTop: '0.25rem' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                      {getVoteTypeIcon('interested')} I'm Interested
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      I like this idea and might use it
                    </div>
                  </div>
                </label>

                {/* Maybe Option */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem',
                    border: voteType === 'maybe' ? '3px solid #f59e0b' : '2px solid var(--gray-300)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: voteType === 'maybe' ? 'rgba(245, 158, 11, 0.05)' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    value="maybe"
                    checked={voteType === 'maybe'}
                    onChange={() => setVoteType('maybe')}
                    style={{ marginTop: '0.25rem' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                      {getVoteTypeIcon('maybe')} Maybe Occasionally
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      I might use this occasionally
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Pledge Commitment Details */}
            {voteType === 'pledge' && (
              <div
                style={{
                  padding: '1.5rem',
                  background: 'var(--gray-50)',
                  borderRadius: '12px',
                  marginBottom: '2rem',
                  border: '2px solid #10b981'
                }}
              >
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#10b981' }}>
                  🤝 Pledge Details
                </h4>

                {/* Frequency */}
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  >
                    How often would you use this? *
                  </label>
                  <select
                    value={expectedFrequency}
                    onChange={(e) => setExpectedFrequency(e.target.value)}
                    required={voteType === 'pledge'}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Select frequency...</option>
                    <option value="daily">Every day</option>
                    <option value="weekly">Once a week</option>
                    <option value="2-3_times_week">2-3 times per week</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Willing to Pay */}
                <div style={{ marginBottom: 0 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  >
                    Maximum fare per trip? *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '1rem',
                        color: 'var(--gray-600)'
                      }}
                    >
                      £
                    </span>
                    <input
                      type="number"
                      step="0.50"
                      min="1.00"
                      max="50.00"
                      value={willingToPay}
                      onChange={(e) => setWillingToPay(e.target.value)}
                      placeholder="5.00"
                      required={voteType === 'pledge'}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.75rem 0.75rem 2rem',
                        border: '2px solid var(--gray-300)',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <small style={{ color: 'var(--gray-600)', fontSize: '0.75rem' }}>
                    Helps us calculate route viability
                  </small>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                Additional comments (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., I work at the hospital 8am-4pm Mon-Fri"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Privacy Option */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.875rem' }}>
                  Vote anonymously (your name won't be shown)
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '1rem',
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem'
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '1.5rem 2rem',
              borderTop: '2px solid var(--gray-200)',
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: 'var(--gray-700)',
                border: '2px solid var(--gray-300)',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '1rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 2rem',
                background:
                  voteType === 'pledge'
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '1rem',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading
                ? 'Submitting...'
                : voteType === 'pledge'
                ? '🤝 Submit Pledge'
                : voteType === 'interested'
                ? '👍 Submit Vote'
                : '🤔 Submit Maybe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoteModal;
