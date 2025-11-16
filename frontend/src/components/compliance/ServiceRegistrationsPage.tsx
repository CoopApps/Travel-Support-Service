import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { serviceRegistrationsApi, permitsApi } from '../../services/api';
import { LocalBusServiceRegistration } from '../../types/permit.types';
import './Compliance.css';

/**
 * Service Registrations Page (Section 22 Compliance)
 *
 * Manages local bus service registrations with traffic commissioners:
 * - 28-day notice requirements
 * - Service start/variation/cancellation
 * - Traffic commissioner area selection
 * - Route and timetable management
 */
function ServiceRegistrationsPage() {
  const { tenant, tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<LocalBusServiceRegistration[]>([]);
  const [orgPermits, setOrgPermits] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', permitId: '' });

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId, filter]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [regsData, permitsData, complianceData] = await Promise.all([
        serviceRegistrationsApi.getRegistrations(tenantId, filter),
        permitsApi.getOrganizationalPermits(tenantId),
        serviceRegistrationsApi.checkCompliance(tenantId),
      ]);

      setRegistrations(regsData);
      setOrgPermits([...permitsData.section19, ...permitsData.section22]);
      setCompliance(complianceData);
    } catch (error) {
      console.error('Error fetching service registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (registrationId: number) => {
    if (!tenantId) return;

    const reason = prompt('Reason for cancellation:');
    if (!reason) return;

    const cancellationDate = prompt('Effective cancellation date (YYYY-MM-DD):');

    try {
      await serviceRegistrationsApi.cancelRegistration(tenantId, registrationId, {
        cancellation_date: cancellationDate || undefined,
        reason,
      });
      await fetchData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'registered': return '#10b981';
      case 'active': return '#059669';
      case 'varied': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      case 'expired': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const calculate28DayStatus = (serviceStartDate: string) => {
    const today = new Date();
    const startDate = new Date(serviceStartDate);
    const daysDifference = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference >= 28) {
      return { compliant: true, message: `${daysDifference} days notice`, color: 'var(--green-600)' };
    } else if (daysDifference > 0) {
      return { compliant: false, message: `Only ${daysDifference} days notice`, color: 'var(--red-600)' };
    } else {
      return { compliant: true, message: 'Service started', color: 'var(--gray-600)' };
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading service registrations...</p>
      </div>
    );
  }

  return (
    <div className="service-registrations-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Service Registrations</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
            Section 22 Local Bus Services - Traffic Commissioner Registration
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Register New Service
        </button>
      </div>

      {/* Compliance Summary */}
      {compliance && (
        <div className="summary-cards" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value">{compliance.summary.total_pending}</div>
            <div className="stat-label">Pending Registrations</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--green-500)' }}>
            <div className="stat-value">{compliance.summary.compliant_pending}</div>
            <div className="stat-label">28-Day Compliant</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--red-500)' }}>
            <div className="stat-value">{compliance.summary.non_compliant_pending}</div>
            <div className="stat-label">Non-Compliant</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div>
          <label htmlFor="status-filter" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px', fontWeight: 500 }}>Status</label>
          <select
            id="status-filter"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="form-select"
            style={{ width: '180px' }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="registered">Registered</option>
            <option value="active">Active</option>
            <option value="varied">Varied</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div>
          <label htmlFor="permit-filter" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px', fontWeight: 500 }}>Permit</label>
          <select
            id="permit-filter"
            value={filter.permitId}
            onChange={(e) => setFilter({ ...filter, permitId: e.target.value })}
            className="form-select"
            style={{ width: '250px' }}
          >
            <option value="">All Permits</option>
            {orgPermits.map((permit) => (
              <option key={permit.id} value={permit.id}>
                {permit.organisation_name} - {permit.permit_number}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Registrations List */}
      {registrations.length === 0 ? (
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 style={{ color: 'var(--gray-700)', marginBottom: '0.5rem' }}>No Service Registrations</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            Section 22 permits require registration with your local traffic commissioner.<br />
            Start by registering your first local bus service.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Register First Service
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {registrations.map((reg) => {
            const noticeStatus = calculate28DayStatus(reg.service_start_date);

            return (
              <div key={reg.registration_id} className="registration-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
                        {reg.service_name || reg.route_description}
                      </h3>
                      <span className={`registration-status ${reg.status}`}>
                        {reg.status}
                      </span>
                      {reg.status === 'pending' && (
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: noticeStatus.color,
                          }}
                        >
                          {noticeStatus.message}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <div>
                        <p style={{ margin: '0.25rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                          <strong>Registration #:</strong> {reg.registration_number}
                        </p>
                        <p style={{ margin: '0.25rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                          <strong>Traffic Commissioner:</strong> {reg.traffic_commissioner_area}
                        </p>
                        {reg.route_number && (
                          <p style={{ margin: '0.25rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                            <strong>Route #:</strong> {reg.route_number}
                          </p>
                        )}
                      </div>
                      <div>
                        <p style={{ margin: '0.25rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                          <strong>Start Date:</strong> {new Date(reg.service_start_date).toLocaleDateString()}
                        </p>
                        {reg.service_end_date && (
                          <p style={{ margin: '0.25rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                            <strong>End Date:</strong> {new Date(reg.service_end_date).toLocaleDateString()}
                          </p>
                        )}
                        {reg.registration_submitted_date && (
                          <p style={{ margin: '0.25rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                            <strong>Submitted:</strong> {new Date(reg.registration_submitted_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {reg.route_description && (
                      <p style={{ marginTop: '1rem', fontSize: '14px', color: 'var(--gray-700)' }}>
                        {reg.route_description}
                      </p>
                    )}

                    {reg.operating_days && (
                      <p style={{ marginTop: '0.5rem', fontSize: '14px', color: 'var(--gray-600)' }}>
                        <strong>Operating Days:</strong> {reg.operating_days}
                      </p>
                    )}

                    {reg.frequency_description && (
                      <p style={{ margin: '0.25rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                        <strong>Frequency:</strong> {reg.frequency_description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {reg.status !== 'cancelled' && reg.status !== 'expired' && (
                      <>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            alert('Edit functionality coming soon');
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleCancel(reg.registration_id!)}
                        >
                          Cancel Service
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                {(reg.variation_notice_date || reg.cancellation_notice_date) && (
                  <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--gray-200)', marginTop: '1rem' }}>
                    {reg.variation_notice_date && (
                      <p style={{ margin: '0.25rem 0', fontSize: '13px', color: 'var(--gray-600)' }}>
                        <strong>Variation Notice:</strong> {new Date(reg.variation_notice_date).toLocaleDateString()}
                      </p>
                    )}
                    {reg.cancellation_notice_date && (
                      <p style={{ margin: '0.25rem 0', fontSize: '13px', color: 'var(--red-600)' }}>
                        <strong>Cancellation Notice:</strong> {new Date(reg.cancellation_notice_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Register New Service</h3>
            <p style={{ color: 'var(--gray-600)' }}>
              Full registration form with traffic commissioner selection, route details, and 28-day notice validation coming soon.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceRegistrationsPage;
