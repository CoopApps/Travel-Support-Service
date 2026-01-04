import { useState, useEffect } from 'react';
import { maintenanceApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { MaintenanceOverview as MaintenanceOverviewType, MaintenanceRecord } from '../../types';

interface MaintenanceOverviewProps {
  onLogService: () => void;
}

/**
 * Maintenance Overview Component
 *
 * Displays maintenance alerts, costs, and service history
 */
function MaintenanceOverview({ onLogService }: MaintenanceOverviewProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<MaintenanceOverviewType | null>(null);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [overviewData, historyData] = await Promise.all([
        maintenanceApi.getOverview(tenantId),
        maintenanceApi.getHistory(tenantId, { limit: 10 })
      ]);

      setOverview(overviewData);
      setHistory(historyData);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '£0.00';
    return `£${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading maintenance data...</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
        Failed to load maintenance data
      </div>
    );
  }

  return (
    <div>
      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '4px' }}>Overdue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626' }}>{overview.overdue_count}</div>
        </div>
        <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '4px' }}>Due Soon (≤7 days)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>{overview.due_soon_count}</div>
        </div>
        <div style={{ background: '#fef9c3', padding: '1rem', borderRadius: '8px', border: '1px solid #fef08a' }}>
          <div style={{ fontSize: '0.875rem', color: '#713f12', marginBottom: '4px' }}>Due This Month</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#eab308' }}>{overview.due_this_month_count}</div>
        </div>
        <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '4px' }}>Up to Date</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#22c55e' }}>{overview.up_to_date_count}</div>
        </div>
      </div>

      {/* Costs Analysis */}
      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>Cost Analysis</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '4px' }}>This Month</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--gray-900)' }}>
              {formatCurrency(overview.recent_costs?.this_month)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '4px' }}>Last 3 Months</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--gray-900)' }}>
              {formatCurrency(overview.recent_costs?.last_3_months)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '4px' }}>Year to Date</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--gray-900)' }}>
              {formatCurrency(overview.recent_costs?.year_to_date)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '4px' }}>Avg per Vehicle</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--gray-900)' }}>
              {formatCurrency(overview.recent_costs?.avg_per_vehicle)}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Services */}
      {overview.upcoming_services?.length > 0 && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>Upcoming Services (Next 60 Days)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Vehicle</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Due Date</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Days Until</th>
                </tr>
              </thead>
              <tbody>
                {overview.upcoming_services?.map((service, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {service.registration} - {service.make} {service.model}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{service.service_type}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{formatDate(service.due_date)}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: service.days_until_due <= 7 ? '#fef3c7' : '#e0f2fe',
                        color: service.days_until_due <= 7 ? '#92400e' : '#0369a1'
                      }}>
                        {service.days_until_due} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Service History */}
      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Recent Service History</h3>
          <button onClick={onLogService} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
            Log Service
          </button>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
            No service records found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Vehicle</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Mileage</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.maintenance_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{formatDate(record.service_date)}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {record.vehicle_registration}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{record.service_type}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{record.description || '-'}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{record.mileage_at_service.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(record.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MaintenanceOverview;
