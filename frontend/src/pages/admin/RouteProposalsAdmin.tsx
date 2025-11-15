/**
 * Route Proposals Admin Page
 *
 * Admin dashboard for reviewing and managing customer route proposals:
 * - View all proposals with viability analysis
 * - Filter by status (open, threshold_met, approved, rejected)
 * - See detailed financial breakdown
 * - Approve/reject proposals
 * - Convert approved proposals to actual bus routes
 */

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';

interface RouteProposal {
  proposal_id: number;
  route_name: string;
  origin_area: string;
  origin_postcodes: string[];
  destination_name: string;
  destination_postcode: string | null;
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
  status: 'open' | 'threshold_met' | 'approved' | 'rejected' | 'converted_to_route';
  display_name: string;
  created_at: string;
  proposal_description: string | null;
  proposed_by_customer_id: number | null;
  submit_as_anonymous: boolean;
  viability_analysis?: {
    is_financially_viable: boolean;
    monthly_revenue: number;
    monthly_costs: number;
    monthly_surplus: number;
    average_fare: number;
    total_pledges: number;
    average_willing_to_pay: number;
    services_per_month: number;
    viability_status: 'Highly Viable' | 'Viable' | 'Marginal' | 'Not Viable';
  };
}

interface PledgedCustomer {
  customer_id: number;
  customer_name: string;
  expected_frequency: string;
  willing_to_pay_amount: number;
}

const RouteProposalsAdmin: React.FC = () => {
  const { tenant } = useTenant();
  const token = useAuthStore((state) => state.token);

  const [proposals, setProposals] = useState<RouteProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'threshold_met' | 'approved' | 'rejected'>('all');
  const [selectedProposal, setSelectedProposal] = useState<RouteProposal | null>(null);
  const [pledgedCustomers, setPledgedCustomers] = useState<PledgedCustomer[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProposals();
  }, [tenant?.tenant_id]);

  const loadProposals = async () => {
    if (!tenant?.tenant_id || !token) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/admin/route-proposals`,
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

  const loadProposalDetails = async (proposalId: number) => {
    if (!tenant?.tenant_id || !token) return;

    try {
      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/admin/route-proposals/${proposalId}/pledges`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPledgedCustomers(data);
      }
    } catch (error) {
      console.error('Failed to load pledges:', error);
    }
  };

  const handleViewDetails = (proposal: RouteProposal) => {
    setSelectedProposal(proposal);
    setShowDetailsModal(true);
    loadProposalDetails(proposal.proposal_id);
  };

  const handleApprove = async (proposalId: number) => {
    if (!tenant?.tenant_id || !token) return;
    if (!confirm('Are you sure you want to approve this route proposal? This will allow it to be converted to an actual bus route.')) return;

    try {
      setActionLoading(true);
      setError('');

      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/admin/route-proposals/${proposalId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve proposal');
      }

      await loadProposals();
      setShowDetailsModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (proposalId: number) => {
    if (!tenant?.tenant_id || !token) return;
    const reason = prompt('Please provide a reason for rejecting this proposal:');
    if (!reason) return;

    try {
      setActionLoading(true);
      setError('');

      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/admin/route-proposals/${proposalId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rejection_reason: reason })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject proposal');
      }

      await loadProposals();
      setShowDetailsModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
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

  const getStatusBadge = (proposal: RouteProposal) => {
    switch (proposal.status) {
      case 'approved':
        return { text: '✅ Approved', color: '#10b981', background: '#d1fae5' };
      case 'rejected':
        return { text: '❌ Rejected', color: '#ef4444', background: '#fee2e2' };
      case 'threshold_met':
        return { text: '🎯 Ready for Review', color: '#f59e0b', background: '#fef3c7' };
      case 'converted_to_route':
        return { text: '🚌 Converted to Route', color: '#8b5cf6', background: '#ede9fe' };
      default:
        return { text: '📊 Open', color: '#6b7280', background: '#f3f4f6' };
    }
  };

  const getViabilityBadge = (analysis: RouteProposal['viability_analysis']) => {
    if (!analysis) return null;

    const statusColors: Record<string, { color: string; background: string }> = {
      'Highly Viable': { color: '#10b981', background: '#d1fae5' },
      'Viable': { color: '#3b82f6', background: '#dbeafe' },
      'Marginal': { color: '#f59e0b', background: '#fef3c7' },
      'Not Viable': { color: '#ef4444', background: '#fee2e2' }
    };

    const colors = statusColors[analysis.viability_status] || statusColors['Not Viable'];

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.375rem 0.75rem',
          background: colors.background,
          color: colors.color,
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 700
        }}
      >
        {analysis.viability_status}
      </span>
    );
  };

  const filteredProposals = proposals.filter((proposal) => {
    if (filter === 'all') return true;
    return proposal.status === filter;
  });

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
        <h1 style={{ margin: '0 0 0.5rem 0' }}>🗳️ Customer Route Proposals</h1>
        <p style={{ margin: 0, color: 'var(--gray-600)' }}>
          Review and manage customer-submitted route proposals
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Proposals', count: proposals.length },
          { key: 'threshold_met', label: 'Ready for Review', count: proposals.filter(p => p.status === 'threshold_met').length },
          { key: 'open', label: 'Open', count: proposals.filter(p => p.status === 'open').length },
          { key: 'approved', label: 'Approved', count: proposals.filter(p => p.status === 'approved').length },
          { key: 'rejected', label: 'Rejected', count: proposals.filter(p => p.status === 'rejected').length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            style={{
              padding: '0.75rem 1.5rem',
              background: filter === key ? 'var(--primary-color)' : 'white',
              color: filter === key ? 'white' : 'var(--gray-700)',
              border: filter === key ? 'none' : '2px solid var(--gray-300)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {label}
            <span
              style={{
                background: filter === key ? 'rgba(255,255,255,0.2)' : 'var(--gray-200)',
                color: filter === key ? 'white' : 'var(--gray-700)',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 700
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'var(--gray-100)',
            borderRadius: '12px'
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No Proposals Found</h3>
          <p style={{ color: 'var(--gray-600)' }}>
            {filter === 'all'
              ? 'No customer route proposals yet'
              : `No proposals with status: ${filter}`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredProposals.map((proposal) => {
            const status = getStatusBadge(proposal);

            return (
              <div
                key={proposal.proposal_id}
                style={{
                  background: 'white',
                  border: proposal.status === 'threshold_met' ? '3px solid #f59e0b' : '2px solid var(--gray-200)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{proposal.route_name}</h3>
                      <span
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: status.background,
                          color: status.color,
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {status.text}
                      </span>
                      {proposal.viability_analysis && getViabilityBadge(proposal.viability_analysis)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      Proposed {new Date(proposal.created_at).toLocaleDateString()}
                      {proposal.submit_as_anonymous ? ' (Anonymous)' : ` by Customer #${proposal.proposed_by_customer_id}`}
                    </div>
                  </div>
                </div>

                {/* Route Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      ORIGIN AREAS
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                      📍 {proposal.origin_postcodes.join(', ')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      DESTINATION
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                      🏁 {proposal.destination_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      SCHEDULE
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                      📅 {getOperatingDays(proposal)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      DEPARTURE TIME
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                      🕐 {proposal.departure_time_window_start} - {proposal.departure_time_window_end}
                    </div>
                  </div>
                </div>

                {/* Pledges Progress */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                      {proposal.total_pledges} Pledges / {proposal.target_passengers} Target
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      (Minimum: {proposal.minimum_passengers_required})
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'var(--gray-200)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min((proposal.total_pledges / proposal.target_passengers) * 100, 100)}%`,
                        height: '100%',
                        background: proposal.target_reached
                          ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                          : proposal.is_viable
                          ? 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
                          : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Viability Analysis */}
                {proposal.viability_analysis && (
                  <div
                    style={{
                      background: 'var(--gray-50)',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
                      💰 Financial Viability
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Monthly Revenue</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                          £{proposal.viability_analysis.monthly_revenue.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Monthly Costs</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>
                          £{proposal.viability_analysis.monthly_costs.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Monthly Surplus</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: proposal.viability_analysis.monthly_surplus >= 0 ? '#10b981' : '#ef4444' }}>
                          {proposal.viability_analysis.monthly_surplus >= 0 ? '+' : ''}£{proposal.viability_analysis.monthly_surplus.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>Average Fare</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                          £{proposal.viability_analysis.average_fare.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleViewDetails(proposal)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: 'var(--primary-color)',
                      border: '2px solid var(--primary-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    View Details
                  </button>
                  {proposal.status === 'threshold_met' && (
                    <>
                      <button
                        onClick={() => handleReject(proposal.proposal_id)}
                        disabled={actionLoading}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          opacity: actionLoading ? 0.7 : 1
                        }}
                      >
                        ❌ Reject
                      </button>
                      <button
                        onClick={() => handleApprove(proposal.proposal_id)}
                        disabled={actionLoading}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          opacity: actionLoading ? 0.7 : 1
                        }}
                      >
                        ✅ Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedProposal && (
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
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 1rem 0' }}>{selectedProposal.route_name}</h2>

            {/* Description */}
            {selectedProposal.proposal_description && (
              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Description</div>
                <div style={{ color: 'var(--gray-700)' }}>{selectedProposal.proposal_description}</div>
              </div>
            )}

            {/* Pledged Customers */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>
                Pledged Customers ({pledgedCustomers.length})
              </h3>
              {pledgedCustomers.length === 0 ? (
                <p style={{ color: 'var(--gray-600)' }}>No pledges yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pledgedCustomers.map((customer) => (
                    <div
                      key={customer.customer_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        background: 'var(--gray-50)',
                        borderRadius: '8px'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{customer.customer_name}</span>
                      <span style={{ color: 'var(--gray-600)' }}>
                        {customer.expected_frequency} • Willing to pay: £{customer.willing_to_pay_amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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

            <button
              onClick={() => setShowDetailsModal(false)}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'var(--gray-200)',
                color: 'var(--gray-700)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteProposalsAdmin;
