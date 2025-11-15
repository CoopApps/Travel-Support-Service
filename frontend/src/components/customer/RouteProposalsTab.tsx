/**
 * Route Proposals Tab - Customer Dashboard
 *
 * Democratic route planning where customers can:
 * - Browse active route proposals
 * - See invitations for routes matching their travel patterns
 * - Create new route proposals
 * - Vote/pledge interest in proposals
 * - View dynamic fare preview based on capacity
 */

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';
import RouteProposalCard from './RouteProposalCard';
import CreateProposalModal from './CreateProposalModal';

interface RouteProposal {
  proposal_id: number;
  route_name: string;
  origin_area: string;
  destination_name: string;
  proposed_frequency: string;
  departure_time_window_start: string;
  departure_time_window_end: string;
  operates_monday: boolean;
  operates_tuesday: boolean;
  operates_wednesday: boolean;
  operates_thursday: boolean;
  operates_friday: boolean;
  operates_saturday: boolean;
  operates_sunday: boolean;
  total_votes: number;
  total_pledges: number;
  target_passengers: number;
  minimum_passengers_required: number;
  is_viable: boolean;
  target_reached: boolean;
  display_name: string;
  status: string;
  created_at: string;
  fare_preview: {
    current_fare: number;
    fare_at_target: number;
    is_viable: boolean;
  };
}

interface Invitation {
  invitation_id: number;
  proposal_id: number;
  route_name: string;
  origin_area: string;
  destination_name: string;
  match_score: number;
  match_reason: string;
  total_pledges: number;
  target_passengers: number;
  is_viable: boolean;
  target_reached: boolean;
}

const RouteProposalsTab: React.FC = () => {
  const { tenant } = useTenant();
  const token = useAuthStore((state) => state.token);

  const [proposals, setProposals] = useState<RouteProposal[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'invitations'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'closing_soon'>('popular');

  useEffect(() => {
    loadProposals();
    loadInvitations();
  }, [tenant?.tenant_id, sortBy]);

  const loadProposals = async () => {
    if (!tenant?.tenant_id || !token) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/customer-route-proposals?sortBy=${sortBy}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProposals(data);
      }
    } catch (error) {
      console.error('Failed to load proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    if (!tenant?.tenant_id || !token) return;

    try {
      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/customer-route-proposals/my-invitations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };

  const getOperatingDays = (proposal: RouteProposal): string => {
    const days = [];
    if (proposal.operates_monday) days.push('Mon');
    if (proposal.operates_tuesday) days.push('Tue');
    if (proposal.operates_wednesday) days.push('Wed');
    if (proposal.operates_thursday) days.push('Thu');
    if (proposal.operates_friday) days.push('Fri');
    if (proposal.operates_saturday) days.push('Sat');
    if (proposal.operates_sunday) days.push('Sun');

    if (days.length === 7) return 'Daily';
    if (days.length === 5 && !proposal.operates_saturday && !proposal.operates_sunday) {
      return 'Weekdays';
    }
    if (days.length === 2 && proposal.operates_saturday && proposal.operates_sunday) {
      return 'Weekends';
    }
    return days.join(', ');
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Loading route proposals...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>🗳️ Community Route Proposals</h2>
            <p style={{ margin: 0, color: 'var(--gray-600)' }}>
              Propose new routes or support existing proposals from your community
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>➕</span>
            Propose a New Route
          </button>
        </div>

        {/* Invitations Alert */}
        {invitations.length > 0 && filter === 'all' && (
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ fontSize: '2rem' }}>📧</div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '1.1rem' }}>
                You have {invitations.length} route invitation{invitations.length !== 1 ? 's' : ''}!
              </strong>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>
                We found routes that match your travel patterns
              </p>
            </div>
            <button
              onClick={() => setFilter('invitations')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              View Invitations
            </button>
          </div>
        )}
      </div>

      {/* Filter and Sort Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '0.75rem 1.5rem',
              background: filter === 'all' ? 'var(--primary-color)' : 'white',
              color: filter === 'all' ? 'white' : 'var(--gray-700)',
              border: filter === 'all' ? 'none' : '2px solid var(--gray-300)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            All Proposals ({proposals.length})
          </button>
          <button
            onClick={() => setFilter('invitations')}
            style={{
              padding: '0.75rem 1.5rem',
              background: filter === 'invitations' ? 'var(--primary-color)' : 'white',
              color: filter === 'invitations' ? 'white' : 'var(--gray-700)',
              border: filter === 'invitations' ? 'none' : '2px solid var(--gray-300)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            My Invitations
            {invitations.length > 0 && (
              <span
                style={{
                  background: 'var(--danger-color)',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  fontWeight: 700
                }}
              >
                {invitations.length}
              </span>
            )}
          </button>
        </div>

        {/* Sort Dropdown */}
        {filter === 'all' && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '0.75rem 1rem',
              border: '2px solid var(--gray-300)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <option value="popular">Most Popular</option>
            <option value="recent">Most Recent</option>
            <option value="closing_soon">Closing Soon</option>
          </select>
        )}
      </div>

      {/* Proposals Grid */}
      {filter === 'all' ? (
        <>
          {proposals.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--gray-100)',
                borderRadius: '12px'
              }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚌</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No Active Proposals</h3>
              <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
                Be the first to propose a route that meets your community's needs!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
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
                Propose a Route
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: '1.5rem'
              }}
            >
              {proposals.map((proposal) => (
                <RouteProposalCard
                  key={proposal.proposal_id}
                  proposal={proposal}
                  operatingDays={getOperatingDays(proposal)}
                  onVoted={loadProposals}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Invitations View */}
          {invitations.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--gray-100)',
                borderRadius: '12px'
              }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No Invitations Yet</h3>
              <p style={{ color: 'var(--gray-600)' }}>
                When routes match your travel patterns, you'll see invitations here
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: '1.5rem'
              }}
            >
              {invitations.map((invitation) => {
                const proposalData: RouteProposal = {
                  proposal_id: invitation.proposal_id,
                  route_name: invitation.route_name,
                  origin_area: invitation.origin_area,
                  destination_name: invitation.destination_name,
                  proposed_frequency: '',
                  departure_time_window_start: '',
                  departure_time_window_end: '',
                  operates_monday: false,
                  operates_tuesday: false,
                  operates_wednesday: false,
                  operates_thursday: false,
                  operates_friday: false,
                  operates_saturday: false,
                  operates_sunday: false,
                  total_votes: 0,
                  total_pledges: invitation.total_pledges,
                  target_passengers: invitation.target_passengers,
                  minimum_passengers_required: 8,
                  is_viable: invitation.is_viable,
                  target_reached: invitation.target_reached,
                  display_name: '',
                  status: 'open',
                  created_at: '',
                  fare_preview: {
                    current_fare: 0,
                    fare_at_target: 0,
                    is_viable: invitation.is_viable
                  }
                };

                return (
                  <div key={invitation.invitation_id} style={{ position: 'relative' }}>
                    {/* Match Score Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        zIndex: 10,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    >
                      {invitation.match_score}% Match
                    </div>
                    <RouteProposalCard
                      proposal={proposalData}
                      operatingDays=""
                      onVoted={() => {
                        loadProposals();
                        loadInvitations();
                      }}
                      isInvitation
                      matchReason={invitation.match_reason}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <CreateProposalModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            loadProposals();
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

export default RouteProposalsTab;
