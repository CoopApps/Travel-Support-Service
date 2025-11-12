import React, { useState, useEffect } from 'react';
import * as cooperativeApi from '../../../services/cooperativeApi';

interface CooperativeOverviewProps {
  tenantId: number;
}

const CooperativeOverview: React.FC<CooperativeOverviewProps> = ({ tenantId }) => {
  const [overview, setOverview] = useState<cooperativeApi.CooperativeOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, [tenantId]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await cooperativeApi.getOverview(tenantId);
      setOverview(data);
    } catch (error) {
      console.error('Error loading cooperative overview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading overview...</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        Failed to load cooperative overview.
      </div>
    );
  }

  const getComplianceStatus = () => {
    const { meetings, reports } = overview.compliance;

    // Check if requirements are met (this is simplified - adjust based on actual requirements)
    const meetingsCompliant = meetings.held >= 1; // At least 1 meeting held
    const reportsCompliant = reports.approved >= 1; // At least 1 report approved

    if (meetingsCompliant && reportsCompliant) return 'compliant';
    if (meetings.total > 0 || reports.total > 0) return 'partial';
    return 'non-compliant';
  };

  const complianceStatus = getComplianceStatus();
  const statusColors = {
    compliant: { bg: '#10b981', text: 'Compliant' },
    partial: { bg: '#f59e0b', text: 'Partial Compliance' },
    'non-compliant': { bg: '#ef4444', text: 'Non-Compliant' },
  };

  const cooperativeModels: Record<string, string> = {
    worker: 'Worker Co-operative',
    consumer: 'Consumer Co-operative',
    producer: 'Producer Co-operative',
    multi_stakeholder: 'Multi-Stakeholder Co-operative',
    platform: 'Platform Co-operative',
    housing: 'Housing Co-operative',
    credit_union: 'Credit Union',
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Compliance Status Banner */}
      <div
        style={{
          background: statusColors[complianceStatus].bg,
          color: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '20px', fontWeight: 700 }}>
            {statusColors[complianceStatus].text}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            {complianceStatus === 'compliant' && 'Your cooperative is meeting all governance requirements'}
            {complianceStatus === 'partial' && 'Some governance requirements need attention'}
            {complianceStatus === 'non-compliant' && 'Action required to maintain co-operative status'}
          </p>
        </div>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {complianceStatus === 'compliant' && <polyline points="20 6 9 17 4 12" />}
          {complianceStatus === 'partial' && (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </>
          )}
          {complianceStatus === 'non-compliant' && (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </>
          )}
        </svg>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Organization Info Card */}
        <div className="card">
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Organization Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                  Organization Type
                </label>
                <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                  {overview.organization_type === 'cooperative_commonwealth' ? 'Co-operative Commonwealth' : 'Co-operative'}
                </div>
              </div>

              {overview.cooperative_model && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                    Co-operative Model
                  </label>
                  <div style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                    {cooperativeModels[overview.cooperative_model] || overview.cooperative_model}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                  Platform Discount
                </label>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
                  {overview.discount_percentage}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Membership Stats Card */}
        <div className="card">
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Membership Statistics
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                  {overview.membership.active}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                  Active Members
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                  {overview.membership.total_shares}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                  Total Shares
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                  {overview.membership.drivers}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                  Driver Members
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6' }}>
                  {overview.membership.customers}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                  Customer Members
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Meetings Compliance Card */}
        <div className="card">
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Meetings (Last 12 Months)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Scheduled</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
                  {overview.compliance.meetings.total}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Held</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#10b981' }}>
                  {overview.compliance.meetings.held}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Quorum Met</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}>
                  {overview.compliance.meetings.quorum_met}
                </span>
              </div>

              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                  Completion Rate
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: '8px', background: 'var(--gray-200)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${overview.compliance.meetings.total > 0 ? (overview.compliance.meetings.held / overview.compliance.meetings.total) * 100 : 0}%`,
                        height: '100%',
                        background: '#10b981',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-900)' }}>
                    {overview.compliance.meetings.total > 0
                      ? Math.round((overview.compliance.meetings.held / overview.compliance.meetings.total) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Compliance Card */}
        <div className="card">
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Reports (Last 12 Months)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Total</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
                  {overview.compliance.reports.total}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Submitted</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#f59e0b' }}>
                  {overview.compliance.reports.submitted}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Approved</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#10b981' }}>
                  {overview.compliance.reports.approved}
                </span>
              </div>

              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                  Approval Rate
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: '8px', background: 'var(--gray-200)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${overview.compliance.reports.total > 0 ? (overview.compliance.reports.approved / overview.compliance.reports.total) * 100 : 0}%`,
                        height: '100%',
                        background: '#10b981',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-900)' }}>
                    {overview.compliance.reports.total > 0
                      ? Math.round((overview.compliance.reports.approved / overview.compliance.reports.total) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Governance Requirements Info */}
      {overview.governance_requirements && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Governance Requirements
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)', lineHeight: '1.6' }}>
              Your co-operative must maintain the following to remain in good standing and retain platform discounts:
            </p>
            <ul style={{ margin: '1rem 0 0 0', padding: '0 0 0 1.5rem', fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.8' }}>
              <li>Hold at least one Annual General Meeting (AGM) per year</li>
              <li>Submit annual financial reports</li>
              <li>Maintain accurate membership records</li>
              <li>Meet quorum requirements for decision-making</li>
              <li>Keep meeting minutes for all governance meetings</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CooperativeOverview;
