import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import CooperativeOverview from './cooperative/CooperativeOverview';
import MeetingManagement from './cooperative/MeetingManagement';
import MembershipManagement from './cooperative/MembershipManagement';
import ReportsManagement from './cooperative/ReportsManagement';
import VotingGovernance from './cooperative/VotingGovernance';
import ProfitDistribution from './cooperative/ProfitDistribution';

type CooperativeTab = 'overview' | 'meetings' | 'membership' | 'voting' | 'profit' | 'reports' | 'benefits';

/**
 * Co-operative Structure Page
 *
 * Complete governance and management interface for co-operatives.
 * For non-cooperatives, displays information about co-operative benefits and options.
 */
function CooperativeStructurePage() {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<CooperativeTab>('overview');

  if (!tenant) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading...</p>
      </div>
    );
  }

  const isCooperative = tenant.organization_type === 'cooperative' || tenant.organization_type === 'cooperative_commonwealth';
  const discountPercentage = tenant.discount_percentage || 0;
  const basePrice = tenant.base_price || 100;
  const actualPrice = basePrice * (1 - discountPercentage / 100);
  const currency = tenant.currency || 'GBP';
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;

  const cooperativeModels: Record<string, string> = {
    worker: 'Worker Co-operative',
    consumer: 'Consumer Co-operative',
    producer: 'Producer Co-operative',
    multi_stakeholder: 'Multi-Stakeholder Co-operative',
    platform: 'Platform Co-operative',
    housing: 'Housing Co-operative',
    credit_union: 'Credit Union',
  };

  if (!isCooperative) {
    // Show informational content for non-cooperatives
    return (
      <div style={{ padding: '1.5rem' }}>
        {/* Current Status Card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', color: 'var(--gray-900)' }}>
              Organization Status
            </h2>
            <div style={{
              display: 'inline-block',
              background: '#6b7280',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
            }}>
              Non-Cooperative Organization
            </div>
          </div>
        </div>

        {/* Become a Co-operative Section */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', color: 'var(--gray-900)' }}>
              Become a Co-operative
            </h2>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: 'var(--gray-600)', lineHeight: '1.6' }}>
              Join the Co-operative Commonwealth and benefit from democratic ownership, reduced fees, and a supportive network of like-minded organizations.
            </p>

            <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '16px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Interested in Co-operative Status?
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#78350f', lineHeight: '1.6' }}>
                To convert your organization to co-operative status and receive the associated benefits and discounts, please contact the platform administrators.
              </p>
            </div>

            {/* Pricing Comparison */}
            <h3 style={{ margin: '1.5rem 0 1rem 0', fontSize: '16px', color: 'var(--gray-900)' }}>
              Co-operative Pricing Benefits
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div style={{
                padding: '1.25rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '8px',
                color: 'white',
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '0.5rem' }}>Co-operative</div>
                <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '0.25rem' }}>30% OFF</div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>{currencySymbol}{(basePrice * 0.7).toFixed(2)}/month</div>
                <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '0.5rem' }}>
                  Save {currencySymbol}{(basePrice * 0.3).toFixed(2)}/month
                </div>
              </div>

              <div style={{
                padding: '1.25rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '8px',
                color: 'white',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '8px',
                  background: '#dc2626',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                }}>
                  BEST VALUE
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '0.5rem' }}>Commonwealth Member</div>
                <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '0.25rem' }}>50% OFF</div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>{currencySymbol}{(basePrice * 0.5).toFixed(2)}/month</div>
                <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '0.5rem' }}>
                  Save {currencySymbol}{(basePrice * 0.5).toFixed(2)}/month
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Co-operative Models */}
        <div className="card">
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', color: 'var(--gray-900)' }}>
              Co-operative Models Available
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {Object.entries(cooperativeModels).map(([key, label]) => (
                <div key={key} style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderLeft: '3px solid #10b981',
                  borderRadius: '6px',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--gray-900)', marginBottom: '0.25rem' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                    {key === 'worker' && 'Owned and democratically controlled by employees'}
                    {key === 'consumer' && 'Owned by the people who use its services'}
                    {key === 'producer' && 'Owned by producers of goods or services'}
                    {key === 'multi_stakeholder' && 'Combines multiple stakeholder groups'}
                    {key === 'platform' && 'Democratic platform for service delivery'}
                    {key === 'housing' && 'Resident-owned housing community'}
                    {key === 'credit_union' && 'Member-owned financial co-operative'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Co-operative interface with tabs
  return (
    <div>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '24px', fontWeight: 700, color: 'var(--gray-900)' }}>
          Co-operative Governance
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)' }}>
          {tenant.cooperative_model && cooperativeModels[tenant.cooperative_model]} - {discountPercentage}% Platform Discount
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--gray-200)',
        background: 'var(--gray-50)',
        overflowX: 'auto',
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: activeTab === 'overview' ? 'white' : 'transparent',
            borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'overview' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginBottom: '-2px',
          }}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab('meetings')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: activeTab === 'meetings' ? 'white' : 'transparent',
            borderBottom: activeTab === 'meetings' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'meetings' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginBottom: '-2px',
          }}
        >
          Meetings
        </button>

        <button
          onClick={() => setActiveTab('membership')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: activeTab === 'membership' ? 'white' : 'transparent',
            borderBottom: activeTab === 'membership' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'membership' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginBottom: '-2px',
          }}
        >
          Membership
        </button>

        <button
          onClick={() => setActiveTab('voting')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: activeTab === 'voting' ? 'white' : 'transparent',
            borderBottom: activeTab === 'voting' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'voting' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginBottom: '-2px',
          }}
        >
          Voting & Democracy
        </button>

        <button
          onClick={() => setActiveTab('profit')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: activeTab === 'profit' ? 'white' : 'transparent',
            borderBottom: activeTab === 'profit' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'profit' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginBottom: '-2px',
          }}
        >
          Profit & Dividends
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: activeTab === 'reports' ? 'white' : 'transparent',
            borderBottom: activeTab === 'reports' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'reports' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginBottom: '-2px',
          }}
        >
          Reports
        </button>

        <button
          onClick={() => setActiveTab('benefits')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: activeTab === 'benefits' ? 'white' : 'transparent',
            borderBottom: activeTab === 'benefits' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'benefits' ? 'var(--primary)' : 'var(--gray-600)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginBottom: '-2px',
          }}
        >
          Benefits & Info
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '1.5rem' }}>
        {activeTab === 'overview' && <CooperativeOverview tenantId={tenant.tenant_id} />}
        {activeTab === 'meetings' && <MeetingManagement tenantId={tenant.tenant_id} />}
        {activeTab === 'membership' && <MembershipManagement tenantId={tenant.tenant_id} />}
        {activeTab === 'voting' && <VotingGovernance tenantId={tenant.tenant_id} />}
        {activeTab === 'profit' && <ProfitDistribution tenantId={tenant.tenant_id} />}
        {activeTab === 'reports' && <ReportsManagement tenantId={tenant.tenant_id} />}
        {activeTab === 'benefits' && (
          <div style={{ padding: '1.5rem' }}>
            {/* Benefits content */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', color: 'var(--gray-900)' }}>
                  Your Co-operative Benefits
                </h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{
                    padding: '1rem',
                    background: '#f0fdf4',
                    borderLeft: '4px solid #10b981',
                    borderRadius: '6px',
                  }}>
                    <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
                      {discountPercentage}% Discount on Monthly Fees
                    </div>
                    <div style={{ fontSize: '13px', color: '#047857' }}>
                      You save {currencySymbol}{(basePrice - actualPrice).toFixed(2)} per month as a co-operative member
                    </div>
                  </div>

                  <div style={{
                    padding: '1rem',
                    background: '#f0fdf4',
                    borderLeft: '4px solid #10b981',
                    borderRadius: '6px',
                  }}>
                    <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
                      Democratic Governance
                    </div>
                    <div style={{ fontSize: '13px', color: '#047857' }}>
                      Your organization has a voice in the Co-operative Commonwealth governance structure
                    </div>
                  </div>

                  <div style={{
                    padding: '1rem',
                    background: '#f0fdf4',
                    borderLeft: '4px solid #10b981',
                    borderRadius: '6px',
                  }}>
                    <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
                      Shared Ownership
                    </div>
                    <div style={{ fontSize: '13px', color: '#047857' }}>
                      Part of a mutually-owned platform built by and for co-operatives
                    </div>
                  </div>

                  <div style={{
                    padding: '1rem',
                    background: '#f0fdf4',
                    borderLeft: '4px solid #10b981',
                    borderRadius: '6px',
                  }}>
                    <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
                      Priority Support
                    </div>
                    <div style={{ fontSize: '13px', color: '#047857' }}>
                      Access to dedicated support channels and co-operative network resources
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Co-operative Principles */}
            <div className="card">
              <div style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', color: 'var(--gray-900)' }}>
                  Co-operative Principles
                </h2>
                <p style={{ margin: '0 0 1rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                  As a co-operative, your organization operates according to these internationally recognized principles:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {[
                    'Voluntary & Open Membership',
                    'Democratic Member Control',
                    'Member Economic Participation',
                    'Autonomy & Independence',
                    'Education & Training',
                    'Co-operation Among Co-operatives',
                    'Concern for Community',
                  ].map((principle, index) => (
                    <div key={index} style={{
                      padding: '0.75rem',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--gray-700)',
                    }}>
                      {index + 1}. {principle}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CooperativeStructurePage;
