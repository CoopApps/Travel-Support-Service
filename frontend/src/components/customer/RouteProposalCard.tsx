/**
 * Route Proposal Card Component
 *
 * Displays a single route proposal with:
 * - Route details (origin → destination)
 * - Operating schedule
 * - Current pledges and progress
 * - Dynamic fare preview (cooperative pricing)
 * - Vote/pledge button
 */

import React, { useState } from 'react';
import VoteModal from './VoteModal';

interface RouteProposal {
  proposal_id: number;
  route_name: string;
  origin_area: string;
  destination_name: string;
  total_pledges: number;
  target_passengers: number;
  minimum_passengers_required: number;
  is_viable: boolean;
  target_reached: boolean;
  fare_preview?: {
    current_fare: number;
    fare_at_target: number;
    is_viable: boolean;
  };
}

interface RouteProposalCardProps {
  proposal: RouteProposal;
  operatingDays: string;
  onVoted: () => void;
  isInvitation?: boolean;
  matchReason?: string;
}

const RouteProposalCard: React.FC<RouteProposalCardProps> = ({
  proposal,
  operatingDays,
  onVoted,
  isInvitation = false,
  matchReason
}) => {
  const [showVoteModal, setShowVoteModal] = useState(false);

  const progressPercentage = Math.min(
    (proposal.total_pledges / proposal.target_passengers) * 100,
    100
  );

  const getStatusBadge = () => {
    if (proposal.target_reached) {
      return {
        text: '✅ Target Reached!',
        color: '#10b981',
        background: '#d1fae5'
      };
    } else if (proposal.is_viable) {
      return {
        text: `✓ Viable (${proposal.total_pledges}/${proposal.minimum_passengers_required})`,
        color: '#3b82f6',
        background: '#dbeafe'
      };
    } else {
      const needed = proposal.minimum_passengers_required - proposal.total_pledges;
      return {
        text: `Needs ${needed} more pledge${needed !== 1 ? 's' : ''}`,
        color: '#f59e0b',
        background: '#fef3c7'
      };
    }
  };

  const status = getStatusBadge();

  const getMatchReasonText = (reason: string) => {
    const reasons = reason.split(', ');
    const text = reasons.map(r => {
      switch (r) {
        case 'same_postcode_area': return 'Same area';
        case 'adjacent_postcode_area': return 'Nearby area';
        case 'same_destination': return 'Same destination';
        case 'matching_schedule': return 'Matching schedule';
        case 'partial_schedule_match': return 'Similar schedule';
        case 'matching_frequency': return 'Same frequency';
        default: return r;
      }
    });
    return text.join(' • ');
  };

  return (
    <>
      <div
        style={{
          background: 'white',
          border: proposal.target_reached
            ? '3px solid #10b981'
            : '2px solid var(--gray-200)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: proposal.target_reached
            ? '0 10px 30px rgba(16, 185, 129, 0.2)'
            : '0 4px 6px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = proposal.target_reached
            ? '0 15px 40px rgba(16, 185, 129, 0.3)'
            : '0 8px 16px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = proposal.target_reached
            ? '0 10px 30px rgba(16, 185, 129, 0.2)'
            : '0 4px 6px rgba(0,0,0,0.05)';
        }}
      >
        {/* Status Badge */}
        <div style={{ marginBottom: '1rem' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              background: status.background,
              color: status.color,
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: 700
            }}
          >
            {status.text}
          </span>
        </div>

        {/* Invitation Match Reason */}
        {isInvitation && matchReason && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#764ba2',
              fontWeight: 600
            }}
          >
            📍 Why you: {getMatchReasonText(matchReason)}
          </div>
        )}

        {/* Route Name */}
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: 'var(--gray-900)' }}>
          {proposal.route_name}
        </h3>

        {/* Route Summary */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            padding: '1rem',
            background: 'var(--gray-50)',
            borderRadius: '12px'
          }}
        >
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
              FROM
            </div>
            <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
              📍 {proposal.origin_area}
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', color: 'var(--gray-400)' }}>→</div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
              TO
            </div>
            <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
              🏁 {proposal.destination_name}
            </div>
          </div>
        </div>

        {/* Schedule (if available) */}
        {operatingDays && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: 'var(--gray-600)'
            }}
          >
            <span>📅</span>
            <span>{operatingDays}</span>
          </div>
        )}

        {/* Fare Preview */}
        {proposal.fare_preview && proposal.fare_preview.current_fare > 0 && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              color: 'white'
            }}
          >
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              💰 Current Fare
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              £{proposal.fare_preview.current_fare.toFixed(2)}
            </div>
            {proposal.fare_preview.fare_at_target &&
              proposal.fare_preview.fare_at_target < proposal.fare_preview.current_fare && (
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                Drops to £{proposal.fare_preview.fare_at_target.toFixed(2)} at full capacity!
              </div>
            )}
          </div>
        )}

        {/* Progress Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
              {proposal.total_pledges} pledge{proposal.total_pledges !== 1 ? 's' : ''}
            </span>
            <span style={{ color: 'var(--gray-600)' }}>
              Target: {proposal.target_passengers}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '12px',
              background: 'var(--gray-200)',
              borderRadius: '6px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                background: proposal.target_reached
                  ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                  : proposal.is_viable
                  ? 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
                  : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                transition: 'width 0.5s ease'
              }}
            />
          </div>

          {/* Progress Stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--gray-600)'
            }}
          >
            <span>{progressPercentage.toFixed(0)}% of target</span>
            <span>
              {proposal.target_passengers - proposal.total_pledges > 0
                ? `${proposal.target_passengers - proposal.total_pledges} more needed`
                : 'Target achieved!'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowVoteModal(true);
            }}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: proposal.target_reached
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {proposal.target_reached ? '✅ Join This Route' : '🗳️ Support This Route'}
          </button>
        </div>

        {/* Cooperative Principle Note */}
        {proposal.fare_preview && proposal.total_pledges < proposal.target_passengers && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'var(--gray-50)',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: 'var(--gray-600)',
              textAlign: 'center',
              fontStyle: 'italic'
            }}
          >
            💡 The more people who pledge, the cheaper it gets for everyone!
          </div>
        )}
      </div>

      {/* Vote Modal */}
      {showVoteModal && (
        <VoteModal
          proposal={proposal}
          onClose={() => setShowVoteModal(false)}
          onVoted={() => {
            onVoted();
            setShowVoteModal(false);
          }}
        />
      )}
    </>
  );
};

export default RouteProposalCard;
