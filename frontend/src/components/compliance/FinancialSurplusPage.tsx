import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { financialSurplusApi } from '../../services/api';
import { FinancialSurplus } from '../../types/permit.types';
import './Compliance.css';

/**
 * Financial Surplus Page (Not-for-Profit Compliance)
 *
 * Tracks annual financial performance to ensure operation without
 * a view to profit, as required by Section 19/22 permits:
 * - Annual income/expense tracking
 * - Surplus/deficit monitoring
 * - Surplus reinvestment tracking
 * - Full Cost Recovery (FCR) model support
 * - Competitive tendering limits
 */
function FinancialSurplusPage() {
  const { tenant, tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [surplusRecords, setSurplusRecords] = useState<FinancialSurplus[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [recordsData, summaryData] = await Promise.all([
        financialSurplusApi.getSurplusRecords(tenantId),
        financialSurplusApi.getSummary(tenantId),
      ]);

      setSurplusRecords(recordsData);
      setSummary(summaryData);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (surplusId: number) => {
    if (!tenantId) return;

    const reviewedBy = prompt('Reviewed by (name):');
    if (!reviewedBy) return;

    const reviewNotes = prompt('Review notes (optional):');

    try {
      await financialSurplusApi.reviewSurplus(tenantId, surplusId, {
        reviewed_by: reviewedBy,
        review_notes: reviewNotes || undefined,
      });
      await fetchData();
    } catch {
      // Error handled silently
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="financial-surplus-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Financial Surplus Tracking</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
            Not-for-Profit Compliance - Section 19/22 Requirements
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          Add Financial Year
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <>
          <div className="summary-cards" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-value">{summary.overall.total_years || 0}</div>
              <div className="stat-label">Financial Years Tracked</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--green-500)' }}>
              <div className="stat-value">{summary.overall.surplus_years || 0}</div>
              <div className="stat-label">Surplus Years</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--red-500)' }}>
              <div className="stat-value">{summary.overall.deficit_years || 0}</div>
              <div className="stat-label">Deficit Years</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatCurrency(parseFloat(summary.overall.avg_surplus || '0'))}</div>
              <div className="stat-label">Avg Annual Surplus</div>
            </div>
          </div>

          {/* Compliance Status */}
          <div
            className="compliance-summary"
            style={{
              background: 'white',
              border: '1px solid var(--gray-200)',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: '16px', fontWeight: 600 }}>Compliance Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div className={`compliance-indicator ${summary.compliance_status.operating_not_for_profit ? 'compliant' : 'non-compliant'}`}>
                <span>
                  {summary.compliance_status.operating_not_for_profit ? '✓' : '✗'} Operating Not-for-Profit
                </span>
              </div>
              <div className={`compliance-indicator ${summary.compliance_status.surplus_reinvestment_tracked ? 'compliant' : 'non-compliant'}`}>
                <span>
                  {summary.compliance_status.surplus_reinvestment_tracked ? '✓' : '✗'} Surplus Reinvestment Tracked
                </span>
              </div>
              <div className={`compliance-indicator ${summary.compliance_status.competitive_contracts_within_limits ? 'compliant' : 'non-compliant'}`}>
                <span>
                  {summary.compliance_status.competitive_contracts_within_limits ? '✓' : '✗'} Competitive Contracts &lt;50%
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Financial Records List */}
      {surplusRecords.length === 0 ? (
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 style={{ color: 'var(--gray-700)', marginBottom: '0.5rem' }}>No Financial Records</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            Track annual financial performance to demonstrate not-for-profit operation.<br />
            Required for Section 19/22 permit compliance.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Add First Financial Year
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {surplusRecords.map((record) => (
            <div key={record.surplus_id} className="surplus-card">
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
                      Financial Year {record.financial_year}
                    </h3>
                    {record.reviewed && (
                      <span className="badge" style={{ backgroundColor: 'var(--green-100)', color: 'var(--green-700)' }}>
                        Reviewed
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.25rem 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                    {new Date(record.year_start_date).toLocaleDateString()} - {new Date(record.year_end_date).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!record.reviewed && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleReview(record.surplus_id!)}
                    >
                      Mark Reviewed
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-info"
                    onClick={() => alert('Edit functionality coming soon')}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Financial Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Total Income
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {formatCurrency(record.total_income)}
                  </p>
                  {record.fare_revenue > 0 && (
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '13px', color: 'var(--gray-600)' }}>
                      Fares: {formatCurrency(record.fare_revenue)}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Total Expenses
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {formatCurrency(record.total_expenses)}
                  </p>
                  {record.driver_wages > 0 && (
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '13px', color: 'var(--gray-600)' }}>
                      Wages: {formatCurrency(record.driver_wages)}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Surplus/Deficit
                  </p>
                  <p
                    style={{
                      margin: '0.25rem 0 0 0',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: record.is_surplus ? 'var(--green-600)' : 'var(--red-600)',
                    }}
                  >
                    {formatCurrency(record.surplus_amount)}
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '13px', color: 'var(--gray-600)' }}>
                    {record.is_surplus ? 'Surplus' : 'Deficit'}
                  </p>
                </div>
              </div>

              {/* Compliance Info */}
              {(record.uses_fcr_model || record.surplus_reinvested || record.competitive_contracts_percentage) && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '14px' }}>
                    {record.uses_fcr_model && (
                      <div>
                        <span style={{ color: 'var(--gray-600)' }}>✓ Using Full Cost Recovery Model</span>
                      </div>
                    )}
                    {record.surplus_reinvested && (
                      <div>
                        <span style={{ color: 'var(--green-600)' }}>✓ Surplus Reinvested</span>
                        {record.reinvestment_date && (
                          <span style={{ color: 'var(--gray-600)', marginLeft: '0.5rem' }}>
                            ({new Date(record.reinvestment_date).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    )}
                    {record.competitive_contracts_percentage !== null && (
                      <div>
                        <span style={{ color: 'var(--gray-600)' }}>
                          Competitive Contracts: {record.competitive_contracts_percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Info */}
              {record.reviewed && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--gray-50)', borderRadius: '4px', fontSize: '14px' }}>
                  <strong>Reviewed by:</strong> {record.reviewed_by} on {new Date(record.review_date!).toLocaleDateString()}
                  {record.review_notes && <p style={{ margin: '0.5rem 0 0 0', color: 'var(--gray-600)' }}>{record.review_notes}</p>}
                </div>
              )}
            </div>
          ))}
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
              maxWidth: '700px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Add Financial Year</h3>
            <p style={{ color: 'var(--gray-600)' }}>
              Full financial tracking form with income/expense breakdowns, FCR model support, and reinvestment tracking coming soon.
            </p>
            <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialSurplusPage;
