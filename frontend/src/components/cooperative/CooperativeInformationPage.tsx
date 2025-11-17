/**
 * Cooperative Information Page
 *
 * Educational page for non-cooperative tenants explaining:
 * - What cooperatives are
 * - Different cooperative models (passenger, worker, hybrid)
 * - Benefits of converting to a cooperative
 * - How to get started
 *
 * This page is shown in the admin module when tenant.cooperative_model is null
 */

import React from 'react';
import { useTenant } from '../../context/TenantContext';

export const CooperativeInformationPage: React.FC = () => {
  const { tenant } = useTenant();

  const cooperativeModels = [
    {
      type: 'Passenger Co-operative',
      icon: '🚗',
      description: 'Owned and controlled by the customers who use the service',
      benefits: [
        'Customers become members and co-owners',
        'Dividends distributed based on trips taken (patronage)',
        'Democratic voting on service decisions',
        'Members benefit directly from surplus revenue',
      ],
      examples: 'Community transport groups, shared taxi services',
    },
    {
      type: 'Worker Co-operative',
      icon: '👥',
      description: 'Owned and controlled by the drivers and staff',
      benefits: [
        'Drivers become member-owners of the business',
        'Dividends distributed based on hours worked',
        'Democratic workplace with equal voting rights',
        'Workers share in the success they create',
      ],
      examples: 'Driver-owned taxi companies, courier cooperatives',
    },
    {
      type: 'Hybrid Co-operative',
      icon: '🤝',
      description: 'Multi-stakeholder model with both customers and workers as members',
      benefits: [
        'Both drivers and customers are member-owners',
        'Dividends split between both groups',
        'Balanced governance with representation from all stakeholders',
        'Stronger community connection',
      ],
      examples: 'Community bus services, accessible transport schemes',
    },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '1rem', color: '#212529' }}>
          Discover Cooperative Ownership
        </h1>
        <p style={{ fontSize: '18px', color: '#6c757d', maxWidth: '800px', margin: '0 auto' }}>
          Transform your transport business into a member-owned cooperative and unlock new benefits
          for your organization, staff, and customers.
        </p>
      </div>

      {/* What is a Cooperative */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '3rem',
        borderRadius: '12px',
        color: 'white',
        marginBottom: '3rem'
      }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '1.5rem' }}>
          What is a Cooperative?
        </h2>
        <p style={{ fontSize: '16px', lineHeight: '1.8', marginBottom: '1.5rem', opacity: 0.95 }}>
          A cooperative (or "co-op") is a business owned and democratically controlled by its members.
          Unlike traditional businesses owned by external shareholders, cooperatives are owned by the
          people who use the service (customers), work in the business (employees), or both.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1.5rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', marginBottom: '0.75rem' }}>🏛️</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>Democratic Control</h3>
            <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.6' }}>
              One member, one vote - regardless of investment size
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1.5rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', marginBottom: '0.75rem' }}>💰</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>Shared Prosperity</h3>
            <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.6' }}>
              Surplus revenue distributed to members as dividends
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1.5rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', marginBottom: '0.75rem' }}>🌱</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>Sustainable Growth</h3>
            <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.6' }}>
              Focused on long-term community benefit, not short-term profit
            </p>
          </div>
        </div>
      </div>

      {/* Cooperative Models */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '2rem', color: '#212529' }}>
          Choose Your Cooperative Model
        </h2>
        <div style={{ display: 'grid', gap: '2rem' }}>
          {cooperativeModels.map((model) => (
            <div
              key={model.type}
              style={{
                background: 'white',
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                padding: '2rem',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                <div style={{ fontSize: '48px', flexShrink: 0 }}>
                  {model.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '0.75rem', color: '#212529' }}>
                    {model.type}
                  </h3>
                  <p style={{ fontSize: '16px', color: '#6c757d', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    {model.description}
                  </p>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem', color: '#495057' }}>
                      Key Benefits:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {model.benefits.map((benefit, index) => (
                        <li key={index} style={{ fontSize: '14px', color: '#6c757d', marginBottom: '0.5rem', lineHeight: '1.6' }}>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '6px',
                    borderLeft: '3px solid #667eea'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#495057', marginBottom: '0.25rem' }}>
                      Examples:
                    </div>
                    <div style={{ fontSize: '13px', color: '#6c757d' }}>
                      {model.examples}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Convert */}
      <div style={{
        background: '#f8f9fa',
        padding: '2.5rem',
        borderRadius: '12px',
        marginBottom: '3rem'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '1.5rem', color: '#212529' }}>
          Why Convert to a Cooperative?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem', color: '#495057' }}>
              💼 Better Business Resilience
            </h4>
            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.6' }}>
              Cooperatives have higher survival rates and are more resistant to economic downturns
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem', color: '#495057' }}>
              👨‍👩‍👧‍👦 Stronger Community Ties
            </h4>
            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.6' }}>
              Build trust and loyalty with customers and staff who become invested stakeholders
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem', color: '#495057' }}>
              💎 Attract Better Talent
            </h4>
            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.6' }}>
              Worker ownership attracts committed employees who care about the business
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem', color: '#495057' }}>
              🎯 Mission-Driven Focus
            </h4>
            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.6' }}>
              Prioritize social impact and community service over pure profit maximization
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem', color: '#495057' }}>
              💸 Tax Benefits
            </h4>
            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.6' }}>
              Potential tax advantages and access to cooperative-specific funding
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem', color: '#495057' }}>
              🔄 Succession Planning
            </h4>
            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.6' }}>
              Ensure business continuity by transitioning ownership to members
            </p>
          </div>
        </div>
      </div>

      {/* Special Features for Cooperatives */}
      <div style={{
        background: 'white',
        border: '2px solid #28a745',
        borderRadius: '12px',
        padding: '2.5rem',
        marginBottom: '3rem'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '1.5rem', color: '#212529' }}>
          🎁 Special Features for Cooperative Tenants
        </h2>
        <p style={{ fontSize: '16px', color: '#6c757d', marginBottom: '1.5rem', lineHeight: '1.7' }}>
          When you convert to a cooperative structure, you'll unlock additional features in this platform:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#155724', marginBottom: '0.25rem' }}>
              ✅ Dividend Distribution
            </div>
            <div style={{ fontSize: '13px', color: '#155724' }}>
              Automated surplus calculation and patronage-based dividends
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#155724', marginBottom: '0.25rem' }}>
              ✅ Member Voting
            </div>
            <div style={{ fontSize: '13px', color: '#155724' }}>
              Democratic voting on proposals and governance decisions
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#155724', marginBottom: '0.25rem' }}>
              ✅ Member Portal
            </div>
            <div style={{ fontSize: '13px', color: '#155724' }}>
              Track contributions, view dividend history, and engagement
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#155724', marginBottom: '0.25rem' }}>
              ✅ Discounted Pricing
            </div>
            <div style={{ fontSize: '13px', color: '#155724' }}>
              Cooperatives receive a discount on subscription fees
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div style={{
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        padding: '3rem',
        borderRadius: '12px',
        textAlign: 'center',
        color: 'white'
      }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '1rem' }}>
          Ready to Explore Cooperative Ownership?
        </h2>
        <p style={{ fontSize: '18px', marginBottom: '2rem', opacity: 0.95, maxWidth: '700px', margin: '0 auto 2rem' }}>
          We can help you understand which cooperative model is right for your organization and
          guide you through the conversion process.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="mailto:support@travelsupport.app?subject=Interested in Cooperative Conversion"
            style={{
              padding: '1rem 2rem',
              background: 'white',
              color: '#f5576c',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '16px',
              transition: 'all 0.3s ease',
              display: 'inline-block'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            📧 Contact Us About Cooperatives
          </a>
          <a
            href="https://www.uk.coop/start-new-co-op"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '1rem 2rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '16px',
              border: '2px solid white',
              transition: 'all 0.3s ease',
              display: 'inline-block'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = '#f5576c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = 'white';
            }}
          >
            📚 Learn More About Co-ops
          </a>
        </div>
      </div>
    </div>
  );
};

export default CooperativeInformationPage;
