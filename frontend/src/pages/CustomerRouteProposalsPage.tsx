/**
 * Customer Route Proposals Page
 *
 * Standalone page for customers to browse and create route proposals
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';
import RouteProposalsTab from '../components/customer/RouteProposalsTab';

function CustomerRouteProposalsPage() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { logout: authLogout } = useAuthStore();

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Company Header Bar */}
      <div
        style={{
          background: 'var(--primary)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/customer/dashboard')}
            style={{
              background: 'var(--primary-accent)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Dashboard
          </button>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>
              {tenant?.company_name || 'Travel Support'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: 1.2, marginTop: '2px' }}>
              Route Proposals
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'var(--primary-accent)',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary-accent)')}
        >
          Logout
        </button>
      </div>

      {/* Route Proposals Content */}
      <RouteProposalsTab />
    </div>
  );
}

export default CustomerRouteProposalsPage;
