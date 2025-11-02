import React from 'react';
import { useTenant } from '../../context/TenantContext';

/**
 * Co-operative Structure Page
 *
 * Displays information about the organization's co-operative status,
 * structure details, and benefits. For non-cooperatives, shows
 * information about available co-operative options and discounts.
 */
function CooperativeStructurePage() {
  const { tenant } = useTenant();

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

  const orgTypeLabels: Record<string, string> = {
    charity: 'Charity',
    cic: 'Community Interest Company (CIC)',
    third_sector: 'Third Sector Organization',
    cooperative: 'Co-operative',
    cooperative_commonwealth: 'Co-operative Commonwealth Member',
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
      {/* Current Status Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', color: 'var(--gray-900)' }}>
            Organization Status
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {/* Organization Type */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
                Organization Type
              </label>
              <div style={{
                display: 'inline-block',
                background: isCooperative ? '#10b981' : '#6b7280',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
              }}>
                {orgTypeLabels[tenant.organization_type] || tenant.organization_type}
              </div>
            </div>

            {/* Co-operative Model (if applicable) */}
            {isCooperative && tenant.cooperative_model && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
                  Co-operative Model
                </label>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                  {cooperativeModels[tenant.cooperative_model] || tenant.cooperative_model}
                </div>
              </div>
            )}

            {/* Pricing & Discount */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
                Monthly Subscription
              </label>
              <div>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--gray-900)' }}>
                  {currencySymbol}{actualPrice.toFixed(2)}
                </span>
                {discountPercentage > 0 && (
                  <>
                    <span style={{ fontSize: '16px', color: '#6b7280', textDecoration: 'line-through', marginLeft: '0.5rem' }}>
                      {currencySymbol}{basePrice.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 600, marginLeft: '0.5rem' }}>
                      {discountPercentage}% discount
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCooperative ? (
        /* Co-operative Benefits Section */
        <>
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
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
                        {discountPercentage}% Discount on Monthly Fees
                      </div>
                      <div style={{ fontSize: '13px', color: '#047857' }}>
                        You save {currencySymbol}{(basePrice - actualPrice).toFixed(2)} per month as a co-operative member
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: '#f0fdf4',
                  borderLeft: '4px solid #10b981',
                  borderRadius: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
                        Democratic Governance
                      </div>
                      <div style={{ fontSize: '13px', color: '#047857' }}>
                        Your organization has a voice in the Co-operative Commonwealth governance structure
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: '#f0fdf4',
                  borderLeft: '4px solid #10b981',
                  borderRadius: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>
                        Shared Ownership
                      </div>
                      <div style={{ fontSize: '13px', color: '#047857' }}>
                        Part of a mutually-owned platform built by and for co-operatives
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: '#f0fdf4',
                  borderLeft: '4px solid #10b981',
                  borderRadius: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <div>
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
        </>
      ) : (
        /* Information about Co-operative Options */
        <>
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
                  To convert your organization to co-operative status and receive the associated benefits and discounts, please contact the platform administrators. They will guide you through the conversion process and help determine the most suitable co-operative model for your organization.
                </p>
              </div>

              {/* Pricing Comparison */}
              <h3 style={{ margin: '1.5rem 0 1rem 0', fontSize: '16px', color: 'var(--gray-900)' }}>
                Co-operative Pricing Benefits
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {/* Standard Co-operative */}
                <div style={{
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '8px',
                  color: 'white',
                }}>
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '0.5rem' }}>
                    Co-operative
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '0.25rem' }}>
                    30% OFF
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>
                    {currencySymbol}{(basePrice * 0.7).toFixed(2)}/month
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '0.5rem' }}>
                    Save {currencySymbol}{(basePrice * 0.3).toFixed(2)}/month
                  </div>
                </div>

                {/* Commonwealth Member */}
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
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '0.5rem' }}>
                    Commonwealth Member
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '0.25rem' }}>
                    50% OFF
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>
                    {currencySymbol}{(basePrice * 0.5).toFixed(2)}/month
                  </div>
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
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                Different co-operative structures suit different organizational needs:
              </p>
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
        </>
      )}
    </div>
  );
}

export default CooperativeStructurePage;
