import React, { useState, useEffect } from 'react';
import { getFuelSpendingAnalysis } from '../../services/fuelCardsApi';
import { useTenant } from '../../context/TenantContext';
import { SpendingAnalysisResponse } from '../../types/fuelCard.types';

const BudgetDashboard: React.FC = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<SpendingAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getFuelSpendingAnalysis(tenantId!);
      setData(result);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading budget data...</p>
      </div>
    );
  }

  const costChange = parseFloat(data?.month_comparison.changes.cost_change_percent || '0');
  const litresChange = parseFloat(data?.month_comparison.changes.litres_change_percent || '0');

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Budget Monitoring & Spending Analysis</h3>
        <p style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
          Track spending against budgets and identify overspend early
        </p>
      </div>

      {/* Month Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Current Month */}
        <div style={{
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h4>Current Month</h4>
            <span style={{
              padding: '0.25rem 0.75rem',
              background: 'var(--primary-50)',
              color: 'var(--primary-700)',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              Active
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--gray-900)' }}>
                £{data?.month_comparison.current_month.total_cost.toFixed(2)}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Total Spend</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--gray-900)' }}>
                {data?.month_comparison.current_month.transactions}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Transactions</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--gray-700)' }}>
                {data?.month_comparison.current_month.total_litres.toFixed(1)}L
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Total Litres</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--gray-700)' }}>
                £{data?.month_comparison.current_month.avg_per_transaction.toFixed(2)}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Avg per Trip</div>
            </div>
          </div>
        </div>

        {/* Previous Month with Changes */}
        <div style={{
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}>
          <h4 style={{ marginBottom: '1rem' }}>Previous Month</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--gray-700)' }}>
                  £{data?.month_comparison.previous_month.total_cost.toFixed(2)}
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: costChange > 0 ? 'var(--danger)' : 'var(--success)',
                }}>
                  {costChange > 0 ? '↑' : '↓'} {Math.abs(costChange).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Total Spend</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--gray-700)' }}>
                {data?.month_comparison.previous_month.transactions}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Transactions</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--gray-700)' }}>
                  {data?.month_comparison.previous_month.total_litres.toFixed(1)}L
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: litresChange > 0 ? 'var(--danger)' : 'var(--success)',
                }}>
                  {litresChange > 0 ? '↑' : '↓'} {Math.abs(litresChange).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Total Litres</div>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--gray-700)' }}>
                £{data?.month_comparison.previous_month.avg_per_transaction.toFixed(2)}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '0.25rem' }}>Avg per Trip</div>
            </div>
          </div>
        </div>
      </div>

      {/* Projected Spending Alert */}
      {data?.projected && (
        <div style={{
          background: parseFloat(data.projected.monthly_total) > 10000 ? 'var(--warning-50)' : 'var(--info-50)',
          border: `1px solid ${parseFloat(data.projected.monthly_total) > 10000 ? 'var(--warning-200)' : 'var(--info-200)'}`,
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem' }}>
                📈 Projected Monthly Total
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                Based on {data.projected.days_elapsed} days of data (avg £{data.projected.daily_average}/day)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '32px', fontWeight: 600 }}>
                £{parseFloat(data.projected.monthly_total).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                Estimated month-end total
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Status Table */}
      <div style={{
        background: 'white',
        border: '1px solid var(--gray-200)',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '2rem',
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
          <h4 style={{ margin: 0 }}>Card Budget Status</h4>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <thead style={{ background: 'var(--gray-50)' }}>
              <tr>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Card</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Driver</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Monthly Limit</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Current Spending</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Budget Used</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Transactions</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.budget_status.map((card, idx) => {
                const usagePercent = card.budget_used_percentage || 0;
                const statusColor =
                  card.status === 'Exceeded' ? 'var(--danger)' :
                  card.status === 'Warning (>80%)' ? 'var(--warning)' :
                  'var(--success)';

                return (
                  <tr key={idx} style={{ borderTop: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      ••••{card.card_number_last_four}
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{card.provider}</div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{card.driver_name || 'Unassigned'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {card.monthly_limit ? `£${card.monthly_limit.toFixed(2)}` : 'No limit'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 500 }}>
                      £{card.current_spending.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {card.monthly_limit ? (
                        <div>
                          <div style={{
                            width: '100%',
                            height: '8px',
                            background: 'var(--gray-200)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            marginBottom: '0.25rem',
                          }}>
                            <div style={{
                              width: `${Math.min(usagePercent, 100)}%`,
                              height: '100%',
                              background: statusColor,
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <div style={{ fontSize: '12px', textAlign: 'center', color: statusColor, fontWeight: 500 }}>
                            {usagePercent.toFixed(0)}%
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>-</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {card.transaction_count}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background:
                          card.status === 'Exceeded' ? 'var(--danger-50)' :
                          card.status === 'Warning (>80%)' ? 'var(--warning-50)' :
                          card.status === 'No limit set' ? 'var(--gray-50)' :
                          'var(--success-50)',
                        color:
                          card.status === 'Exceeded' ? 'var(--danger-700)' :
                          card.status === 'Warning (>80%)' ? 'var(--warning-700)' :
                          card.status === 'No limit set' ? 'var(--gray-600)' :
                          'var(--success-700)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}>
                        {card.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts Section */}
      {data?.alerts && data.alerts.length > 0 && (
        <div style={{
          background: 'var(--danger-50)',
          border: '1px solid var(--danger-200)',
          borderRadius: '8px',
          padding: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h4 style={{ margin: 0, color: 'var(--danger-700)' }}>Budget Alerts</h4>
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {data.alerts.map((alert, idx) => (
              <div key={idx} style={{
                padding: '0.75rem',
                background: 'white',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontWeight: 500 }}>••••{alert.card_number_last_four}</span>
                  {alert.driver_name && (
                    <span style={{ marginLeft: '0.5rem', color: 'var(--gray-600)' }}>
                      ({alert.driver_name})
                    </span>
                  )}
                  {' - '}
                  <span style={{ color: 'var(--danger-700)', fontWeight: 500 }}>{alert.status}</span>
                </div>
                <div style={{ fontWeight: 600 }}>
                  £{alert.current_spending.toFixed(2)} / £{alert.monthly_limit?.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetDashboard;
