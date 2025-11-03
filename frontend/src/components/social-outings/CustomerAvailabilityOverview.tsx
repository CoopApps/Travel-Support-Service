import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';

interface CustomerAvailabilityOverviewProps {
  isVisible: boolean;
  onClose: () => void;
}

interface DayAvailability {
  dayName: string;
  dayKey: string;
  available: Customer[];
  busyWithService: Customer[];
  wheelchairAvailable: number;
}

/**
 * Customer Availability Overview
 *
 * Shows weekly customer availability for planning social outings
 * - Detects schedule conflicts with regular transport services
 * - Highlights wheelchair-accessible customers
 * - Provides booking strategy guidance
 */
function CustomerAvailabilityOverview({ isVisible, onClose }: CustomerAvailabilityOverviewProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyAvailability, setWeeklyAvailability] = useState<DayAvailability[]>([]);

  const days = [
    { key: 'mon', name: 'Monday' },
    { key: 'tue', name: 'Tuesday' },
    { key: 'wed', name: 'Wednesday' },
    { key: 'thu', name: 'Thursday' },
    { key: 'fri', name: 'Friday' },
    { key: 'sat', name: 'Saturday' },
    { key: 'sun', name: 'Sunday' },
  ];

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (customers.length > 0) {
      calculateWeeklyAvailability();
    }
  }, [customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const tenantId = localStorage.getItem('tenantId');
      const token = localStorage.getItem('token');

      if (!tenantId || !token) return;

      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiBase}/tenants/${tenantId}/customers`, {
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

  const calculateWeeklyAvailability = () => {
    const availability: DayAvailability[] = days.map(day => {
      // Customers with regular service scheduled for this day
      const busyWithService = customers.filter(customer => {
        const schedule = customer.schedule;
        if (!schedule || typeof schedule !== 'object') return false;

        const daySchedule = schedule[day.key];
        return daySchedule && (daySchedule.destination || daySchedule.morning || daySchedule.afternoon);
      });

      // Customers available (no regular service on this day)
      const available = customers.filter(customer => {
        const schedule = customer.schedule;
        if (!schedule || typeof schedule !== 'object') return true;

        const daySchedule = schedule[day.key];
        return !daySchedule || (!daySchedule.destination && !daySchedule.morning && !daySchedule.afternoon);
      });

      // Count wheelchair users who are available
      const wheelchairAvailable = available.filter(c =>
        c.accessibility_needs?.wheelchairUser === true
      ).length;

      return {
        dayName: day.name,
        dayKey: day.key,
        available,
        busyWithService,
        wheelchairAvailable,
      };
    });

    setWeeklyAvailability(availability);
  };

  if (!isVisible) return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        background: '#f8f9fa',
        padding: '1.25rem',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem'
        }}>
          <h3 style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--gray-900)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Weekly Customer Availability for Outings
          </h3>
          <button
            className="btn btn-sm btn-secondary"
            onClick={onClose}
            style={{ padding: '0.375rem 0.75rem' }}
          >
            Hide
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
            Loading customer availability...
          </div>
        ) : (
          <>
            {/* Weekly Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}>
              {weeklyAvailability.map((day, index) => (
                <div
                  key={day.dayKey}
                  style={{
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '6px',
                    borderLeft: '4px solid #2196f3',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Day Name */}
                  <h4 style={{
                    margin: '0 0 0.75rem 0',
                    color: 'var(--gray-900)',
                    fontSize: '0.9375rem',
                    fontWeight: 600
                  }}>
                    {day.dayName}
                  </h4>

                  {/* Summary Stats */}
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--gray-700)',
                    marginBottom: '0.75rem',
                    padding: '0.5rem',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    lineHeight: 1.6
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      <strong>Available:</strong> {day.available.length}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <strong>Regular service:</strong> {day.busyWithService.length}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#7b1fa2">
                        <circle cx="12" cy="4" r="2"/>
                        <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z"/>
                      </svg>
                      <strong>Wheelchair available:</strong> {day.wheelchairAvailable}
                    </div>
                  </div>

                  {/* Available Customers */}
                  {day.available.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h5 style={{
                        margin: '0 0 0.5rem 0',
                        color: '#4caf50',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Available ({day.available.length})
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {day.available.slice(0, 4).map(customer => (
                          <div
                            key={customer.customer_id}
                            style={{
                              padding: '0.5rem',
                              background: '#e8f5e9',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              border: '1px solid #4caf50',
                              lineHeight: 1.4
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#2e7d32', marginBottom: '0.125rem' }}>
                              {customer.name}
                            </div>
                            <div style={{ color: 'var(--gray-600)', fontSize: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              {customer.phone || 'No phone'}
                              {customer.accessibility_needs?.wheelchairUser && (
                                <span style={{ color: '#7b1fa2', marginLeft: '0.25rem' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="4" r="2"/>
                                    <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z"/>
                                  </svg>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {day.available.length > 4 && (
                          <div style={{
                            fontSize: '0.625rem',
                            color: 'var(--gray-500)',
                            textAlign: 'center',
                            padding: '0.25rem'
                          }}>
                            ... and {day.available.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No Customers Message */}
                  {day.available.length === 0 && day.busyWithService.length === 0 && (
                    <div style={{
                      color: 'var(--gray-500)',
                      fontStyle: 'italic',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      padding: '1rem'
                    }}>
                      No customers for this day
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Booking Strategy Guide */}
            <div style={{
              padding: '1rem',
              background: '#e3f2fd',
              borderRadius: '6px',
              border: '1px solid #2196f3'
            }}>
              <h4 style={{
                margin: '0 0 0.75rem 0',
                color: '#1976d2',
                fontSize: '0.9375rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Booking Strategy Guide
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '0.75rem',
                fontSize: '0.8125rem',
                lineHeight: 1.6
              }}>
                <div>
                  <strong style={{ color: '#4caf50', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Available Customers:
                  </strong>
                  Best to book - no regular service conflicts
                </div>
                <div>
                  <strong style={{ color: '#f44336', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Regular Service Customers:
                  </strong>
                  Avoid booking - already have scheduled transport
                </div>
                <div>
                  <strong style={{ color: '#7b1fa2', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="4" r="2"/>
                      <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z"/>
                    </svg>
                    Accessibility Planning:
                  </strong>
                  Book wheelchair-accessible vehicles for wheelchair users
                </div>
                <div>
                  <strong style={{ color: '#2196f3', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    Best Practice:
                  </strong>
                  Schedule outings on days when most customers are available
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CustomerAvailabilityOverview;
