import React, { useState, useEffect } from 'react';
import * as cooperativeApi from '../../services/cooperativeApi';
import { useTenant } from '../../context/TenantContext';

interface CooperativeMemberWidgetProps {
  tenantId: number;
  memberType: 'driver' | 'customer';
}

/**
 * Cooperative Member Widget
 *
 * Shows cooperative information for drivers (workers) and customers (investors):
 * - Ownership shares/investment amounts
 * - Recent profit shares/dividends
 * - Active proposals to vote on
 * - Upcoming distributions
 *
 * ONLY displays for cooperative tenants (tenant.cooperative_model is not null)
 */
const CooperativeMemberWidget: React.FC<CooperativeMemberWidgetProps> = ({ tenantId, memberType }) => {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [activeProposals, setActiveProposals] = useState<cooperativeApi.CooperativeProposal[]>([]);
  const [myDistributions, setMyDistributions] = useState<cooperativeApi.MemberDistribution[]>([]);
  const [myVotes, setMyVotes] = useState<any[]>([]);

  // Don't show widget for non-cooperative tenants
  const isCooperative = tenant?.organization_type === 'cooperative' || tenant?.organization_type === 'cooperative_commonwealth';

  useEffect(() => {
    if (isCooperative) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [tenantId, isCooperative]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [proposalsData, distributionsData, votesData] = await Promise.all([
        cooperativeApi.getActiveProposals(tenantId).catch(() => ({ proposals: [] })),
        cooperativeApi.getMyDistributions(tenantId).catch(() => ({ distributions: [] })),
        cooperativeApi.getMyVotes(tenantId).catch(() => ({ votes: [] })),
      ]);

      setActiveProposals(proposalsData.proposals || []);
      setMyDistributions(distributionsData.distributions || []);
      setMyVotes(votesData.votes || []);
    } catch (error) {
      console.error('Error loading cooperative data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const getDistributionTypeLabel = () => {
    return memberType === 'driver' ? 'Profit Shares' : 'Dividends';
  };

  const totalDistributions = myDistributions.reduce((sum, d) => sum + d.distribution_amount, 0);
  const totalPaid = myDistributions.filter(d => d.paid).reduce((sum, d) => sum + d.distribution_amount, 0);
  const totalUnpaid = myDistributions.filter(d => !d.paid).reduce((sum, d) => sum + d.distribution_amount, 0);

  const unvotedProposals = activeProposals.filter(proposal => {
    const hasVoted = myVotes.some(v => v.proposal_id === proposal.proposal_id);
    return !hasVoted && proposal.status === 'open';
  });

  // Don't render for non-cooperative tenants
  if (!isCooperative) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto', width: '24px', height: '24px' }}></div>
          <p style={{ marginTop: '0.5rem', fontSize: '13px', color: '#6b7280' }}>Loading cooperative info...</p>
        </div>
      </div>
    );
  }

  // If no cooperative data available
  if (myDistributions.length === 0 && activeProposals.length === 0) {
    return null; // Don't show widget if not a cooperative member
  }

  return (
    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
          Co-operative Member
        </h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>

      {/* Financial Summary */}
      {myDistributions.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            {getDistributionTypeLabel()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', border: '1px solid #86efac' }}>
              <div style={{ fontSize: '11px', color: '#065f46', marginBottom: '2px' }}>Total</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>
                {formatCurrency(totalDistributions)}
              </div>
            </div>
            <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '6px', border: '1px solid #86efac' }}>
              <div style={{ fontSize: '11px', color: '#065f46', marginBottom: '2px' }}>Paid</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
                {formatCurrency(totalPaid)}
              </div>
            </div>
            <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fcd34d' }}>
              <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '2px' }}>Pending</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>
                {formatCurrency(totalUnpaid)}
              </div>
            </div>
          </div>

          {/* Recent Distributions */}
          {myDistributions.slice(0, 3).length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>
                Recent Distributions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myDistributions.slice(0, 3).map((dist) => (
                  <div
                    key={dist.distribution_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      background: '#f9fafb',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, color: '#111827' }}>
                        {new Date(dist.period_start).toLocaleDateString()} - {new Date(dist.period_end).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {(dist.ownership_percentage || dist.investment_percentage || 0).toFixed(2)}% ownership
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#10b981' }}>
                        {formatCurrency(dist.distribution_amount)}
                      </div>
                      <div style={{ fontSize: '10px', color: dist.paid ? '#10b981' : '#f59e0b', marginTop: '2px' }}>
                        {dist.paid ? 'Paid' : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Proposals */}
      {unvotedProposals.length > 0 && (
        <div>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '6px',
            padding: '0.75rem',
            marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400e' }}>
                {unvotedProposals.length} Active Proposal{unvotedProposals.length !== 1 ? 's' : ''} Awaiting Your Vote
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#78350f' }}>
              Please review and vote on active proposals in the Co-operative section
            </div>
          </div>

          {/* Proposal List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {unvotedProposals.slice(0, 2).map((proposal) => (
              <div
                key={proposal.proposal_id}
                style={{
                  padding: '0.75rem',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e40af', marginBottom: '4px' }}>
                  {proposal.title}
                </div>
                <div style={{ fontSize: '11px', color: '#3b82f6' }}>
                  Closes: {new Date(proposal.voting_closes).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Voted */}
      {activeProposals.length > 0 && unvotedProposals.length === 0 && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '6px',
          padding: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#065f46' }}>
            You've voted on all active proposals
          </span>
        </div>
      )}
    </div>
  );
};

export default CooperativeMemberWidget;
