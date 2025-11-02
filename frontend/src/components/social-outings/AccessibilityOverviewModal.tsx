import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';

interface AccessibilityOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Accessibility Overview Modal
 *
 * Shows customer accessibility information to help plan outings
 * - Wheelchair users
 * - Mobility aid users
 * - Customers requiring assistance
 * - Planning guidelines
 */
function AccessibilityOverviewModal({ isOpen, onClose }: AccessibilityOverviewModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const tenantId = localStorage.getItem('tenantId');
      const token = localStorage.getItem('token');

      if (!tenantId || !token) return;

      const response = await fetch(`http://localhost:3001/api/tenants/${tenantId}/customers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to load customers');

      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const wheelchairUsers = customers.filter(c => c.accessibility_needs?.wheelchairUser === true);
  const mobilityAidUsers = customers.filter(c =>
    c.accessibility_needs?.mobilityAids &&
    c.accessibility_needs.mobilityAids.length > 0
  );
  const assistanceRequired = customers.filter(c =>
    c.accessibility_needs?.assistance_required &&
    c.accessibility_needs.assistance_required.trim() !== ''
  );

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--gray-200)'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--gray-900)' }}>
              Customer Accessibility Overview
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--gray-500)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
              Loading accessibility information...
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div style={{
                background: '#f8f9fa',
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
                  Accessibility Summary
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.875rem'
                }}>
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#7b1fa2' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="4" r="2"/>
                        <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z"/>
                      </svg>
                      Wheelchair Users:
                    </strong>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)', marginTop: '0.25rem' }}>
                      {wheelchairUsers.length}
                    </div>
                  </div>
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      Mobility Aid Users:
                    </strong>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)', marginTop: '0.25rem' }}>
                      {mobilityAidUsers.length}
                    </div>
                  </div>
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      Require Assistance:
                    </strong>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)', marginTop: '0.25rem' }}>
                      {assistanceRequired.length}
                    </div>
                  </div>
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      Total Customers:
                    </strong>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)', marginTop: '0.25rem' }}>
                      {customers.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Wheelchair Users List */}
              {wheelchairUsers.length > 0 && (
                <div style={{
                  background: '#f3e5f5',
                  padding: '1rem',
                  borderRadius: '6px',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#7b1fa2',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="4" r="2"/>
                      <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z"/>
                    </svg>
                    Wheelchair Users
                  </h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {wheelchairUsers.map(customer => (
                      <div
                        key={customer.customer_id}
                        style={{
                          background: 'white',
                          padding: '0.875rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--gray-900)' }}>
                          {customer.name}
                        </div>
                        <div style={{ color: 'var(--gray-600)', fontSize: '0.8125rem' }}>
                          {customer.phone || 'No phone number'}
                        </div>
                        {customer.accessibility_needs?.assistance_required && (
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            background: '#fef3c7',
                            borderRadius: '4px',
                            fontSize: '0.8125rem'
                          }}>
                            <strong>Note:</strong> {customer.accessibility_needs.assistance_required}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Planning Guidelines */}
              <div style={{
                background: '#e3f2fd',
                padding: '1rem',
                borderRadius: '6px'
              }}>
                <h4 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#1976d2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  Planning Guidelines
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: '1.5rem',
                  fontSize: '0.875rem',
                  lineHeight: 1.8,
                  color: 'var(--gray-700)'
                }}>
                  <li>Ensure wheelchair accessible vehicles for wheelchair users</li>
                  <li>Plan for extra space for mobility aids</li>
                  <li>Allow additional time for boarding assistance</li>
                  <li>Consider venue accessibility at destinations</li>
                  <li>Confirm availability of accessible toilets at destination</li>
                  <li>Check if destination has step-free access</li>
                </ul>
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--gray-200)'
          }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AccessibilityOverviewModal;
