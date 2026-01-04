import React, { useState, useEffect } from 'react';
import { getFuelReconciliation } from '../../services/fuelCardsApi';
import { useTenant } from '../../context/TenantContext';
import { ReconciliationResponse } from '../../types/fuelCard.types';

const ReconciliationDashboard: React.FC = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<ReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeCategory, setActiveCategory] = useState<'unmatched' | 'exceeded' | 'unusual' | 'suspicious'>('unmatched');

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getFuelReconciliation(tenantId!, {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setData(result);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadData();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading reconciliation data...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Data Reconciliation Dashboard</h3>
        <p style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
          Identify and resolve data quality issues, anomalies, and potential fraud
        </p>
      </div>

      {/* Date Filters */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: 'var(--gray-50)',
        borderRadius: '8px',
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px', fontWeight: 500 }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '4px',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px', fontWeight: 500 }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '4px',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={handleFilter} className="btn btn-primary">
            Apply Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div
          onClick={() => setActiveCategory('unmatched')}
          style={{
            padding: '1.25rem',
            background: activeCategory === 'unmatched' ? 'var(--danger-50)' : 'white',
            border: `2px solid ${activeCategory === 'unmatched' ? 'var(--danger)' : 'var(--gray-200)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.5rem' }}>
            {data?.summary.unmatched_transactions || 0}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--gray-700)', fontWeight: 500 }}>
            Unmatched Transactions
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
            Missing driver/vehicle
          </div>
        </div>

        <div
          onClick={() => setActiveCategory('exceeded')}
          style={{
            padding: '1.25rem',
            background: activeCategory === 'exceeded' ? 'var(--warning-50)' : 'white',
            border: `2px solid ${activeCategory === 'exceeded' ? 'var(--warning)' : 'var(--gray-200)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.5rem' }}>
            {data?.summary.cards_exceeding_limits || 0}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--gray-700)', fontWeight: 500 }}>
            Cards Over Limit
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
            Monthly limit exceeded
          </div>
        </div>

        <div
          onClick={() => setActiveCategory('unusual')}
          style={{
            padding: '1.25rem',
            background: activeCategory === 'unusual' ? 'var(--info-50)' : 'white',
            border: `2px solid ${activeCategory === 'unusual' ? 'var(--info)' : 'var(--gray-200)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--info)', marginBottom: '0.5rem' }}>
            {data?.summary.unusual_transactions || 0}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--gray-700)', fontWeight: 500 }}>
            Unusual Transactions
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
            High cost/volume/price
          </div>
        </div>

        <div
          onClick={() => setActiveCategory('suspicious')}
          style={{
            padding: '1.25rem',
            background: activeCategory === 'suspicious' ? 'var(--danger-50)' : 'white',
            border: `2px solid ${activeCategory === 'suspicious' ? 'var(--danger)' : 'var(--gray-200)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.5rem' }}>
            {data?.summary.suspicious_transactions || 0}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--gray-700)', fontWeight: 500 }}>
            Suspicious Activity
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
            Possible duplicates
          </div>
        </div>
      </div>

      {/* Issue Details */}
      <div style={{
        background: 'white',
        border: '1px solid var(--gray-200)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
          <h4 style={{ margin: 0 }}>
            {activeCategory === 'unmatched' && 'Unmatched Transactions'}
            {activeCategory === 'exceeded' && 'Cards Exceeding Limits'}
            {activeCategory === 'unusual' && 'Unusual Transactions'}
            {activeCategory === 'suspicious' && 'Suspicious Transactions'}
          </h4>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {/* Unmatched Transactions */}
          {activeCategory === 'unmatched' && (
            <table style={{ width: '100%', fontSize: '14px' }}>
              <thead style={{ background: 'var(--gray-50)' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Card</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Provider</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Cost</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Litres</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Issue</th>
                </tr>
              </thead>
              <tbody>
                {data?.issues.unmatched_transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
                      ✅ No unmatched transactions found
                    </td>
                  </tr>
                ) : (
                  data?.issues.unmatched_transactions.map((txn, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--gray-200)' }}>
                      <td style={{ padding: '0.75rem' }}>{new Date(txn.transaction_date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>••••{txn.card_number_last_four}</td>
                      <td style={{ padding: '0.75rem' }}>{txn.provider}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>£{txn.total_cost.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{txn.litres.toFixed(1)}L</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: 'var(--danger-50)',
                          color: 'var(--danger-700)',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}>
                          {txn.issue_type}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Cards Exceeding Limits */}
          {activeCategory === 'exceeded' && (
            <table style={{ width: '100%', fontSize: '14px' }}>
              <thead style={{ background: 'var(--gray-50)' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Card</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Driver</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Monthly Limit</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Spent</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Over By</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Transactions</th>
                </tr>
              </thead>
              <tbody>
                {data?.issues.cards_exceeding_limits.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
                      ✅ No cards exceeding limits
                    </td>
                  </tr>
                ) : (
                  data?.issues.cards_exceeding_limits.map((card, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--gray-200)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        ••••{card.card_number_last_four}
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{card.provider}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{card.driver_name || 'Unassigned'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>£{card.monthly_limit.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>£{card.monthly_total.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--danger)' }}>
                        £{(card.monthly_total - card.monthly_limit).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>{card.transaction_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Unusual Transactions */}
          {activeCategory === 'unusual' && (
            <table style={{ width: '100%', fontSize: '14px' }}>
              <thead style={{ background: 'var(--gray-50)' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Card/Driver</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Vehicle</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Cost</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Litres</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Price/L</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Issue Type</th>
                </tr>
              </thead>
              <tbody>
                {data?.issues.unusual_transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
                      ✅ No unusual transactions found
                    </td>
                  </tr>
                ) : (
                  data?.issues.unusual_transactions.map((txn, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--gray-200)' }}>
                      <td style={{ padding: '0.75rem' }}>{new Date(txn.transaction_date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>
                        ••••{txn.card_number_last_four}
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{txn.driver_name || 'Unknown'}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{txn.vehicle_registration || 'Unknown'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>£{txn.total_cost.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{txn.litres.toFixed(1)}L</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>£{txn.price_per_litre.toFixed(3)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: 'var(--warning-50)',
                          color: 'var(--warning-700)',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}>
                          {txn.issue_type}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Suspicious Transactions */}
          {activeCategory === 'suspicious' && (
            <table style={{ width: '100%', fontSize: '14px' }}>
              <thead style={{ background: 'var(--gray-50)' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Time</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Card</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Driver</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Cost</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Similar Count</th>
                </tr>
              </thead>
              <tbody>
                {data?.issues.suspicious_transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
                      ✅ No suspicious transactions found
                    </td>
                  </tr>
                ) : (
                  data?.issues.suspicious_transactions.map((txn, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--gray-200)' }}>
                      <td style={{ padding: '0.75rem' }}>{new Date(txn.transaction_date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>{txn.transaction_time || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>••••{txn.card_number_last_four}</td>
                      <td style={{ padding: '0.75rem' }}>{txn.driver_name || 'Unknown'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>£{txn.total_cost.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: 'var(--danger-50)',
                          color: 'var(--danger-700)',
                          borderRadius: '50%',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          {txn.similar_count}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconciliationDashboard;
