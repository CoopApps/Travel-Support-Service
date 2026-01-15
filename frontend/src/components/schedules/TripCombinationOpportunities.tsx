/**
 * Trip Combination Opportunities Component
 *
 * Subtle insights widget showing opportunities to combine trips
 * Collapsed by default, expands to show compact table view
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { tripApi } from '../../services/api';
import './TripCombinationOpportunities.css';

interface TripCombinationOpportunitiesProps {
  onAddToTrip?: (tripId: number, customerId: number) => void;
  autoRefresh?: boolean;
}

function TripCombinationOpportunities({ onAddToTrip, autoRefresh = true }: TripCombinationOpportunitiesProps) {
  const tenantId = useAuthStore((state) => state.tenantId);
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchOpportunities();
    }
  }, [tenantId, selectedDate]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh || !tenantId) return;

    const interval = setInterval(() => {
      fetchOpportunities();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, tenantId, selectedDate]);

  const fetchOpportunities = async () => {
    if (!tenantId) return;

    setLoading(true);
    setError('');

    try {
      const response = await tripApi.getCombinationOpportunities(tenantId, {
        date: selectedDate
      });

      setOpportunities(response.opportunities || []);
      setSummary(response.summary || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTrip = (opportunity: any) => {
    if (onAddToTrip) {
      onAddToTrip(opportunity.trip_id, opportunity.compatible_customer.id);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  // Don't render if dismissed or no tenant
  if (!tenantId || dismissed) return null;

  // Don't render if no opportunities and not loading
  if (!loading && opportunities.length === 0 && !error) return null;

  const totalRevenue = summary?.total_potential_revenue || '0.00';
  const count = opportunities.length;

  return (
    <div className="tco-widget">
      {/* Collapsed View - Single Line */}
      <div className="tco-header" onClick={() => setExpanded(!expanded)}>
        <div className="tco-indicator">
          <span className={`tco-dot ${count > 0 ? 'active' : ''}`} />
          <span className="tco-summary">
            {loading ? (
              'Checking opportunities...'
            ) : error ? (
              <span className="tco-error">Unable to load opportunities</span>
            ) : (
              <>
                <strong>{count}</strong> combination {count === 1 ? 'opportunity' : 'opportunities'}
                {count > 0 && (
                  <span className="tco-revenue">+£{totalRevenue}</span>
                )}
              </>
            )}
          </span>
        </div>

        <div className="tco-actions">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              e.stopPropagation();
              setSelectedDate(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="tco-date-input"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchOpportunities();
            }}
            disabled={loading}
            className="tco-refresh"
            title="Refresh"
          >
            {loading ? '...' : '↻'}
          </button>
          <button
            className="tco-expand"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            className="tco-dismiss"
            title="Dismiss for now"
          >
            ×
          </button>
        </div>
      </div>

      {/* Expanded View - Table */}
      {expanded && count > 0 && (
        <div className="tco-table-container">
          <table className="tco-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Seats</th>
                <th>Destination</th>
                <th>Add Customer</th>
                <th>Revenue</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp, index) => (
                <tr key={index} className={`tco-row tco-row--${opp.recommendation}`}>
                  <td className="tco-cell-time">{formatTime(opp.pickup_time)}</td>
                  <td className="tco-cell-driver">{opp.driver.name}</td>
                  <td className="tco-cell-vehicle">{opp.vehicle.registration}</td>
                  <td className="tco-cell-seats">
                    <span className="tco-seats-badge">
                      {opp.vehicle.available_seats} free
                    </span>
                  </td>
                  <td className="tco-cell-destination" title={opp.current_trip.destination}>
                    {opp.current_trip.destination?.substring(0, 25)}
                    {opp.current_trip.destination?.length > 25 ? '...' : ''}
                  </td>
                  <td className="tco-cell-customer">
                    <div className="tco-customer-info">
                      <span className="tco-customer-name">{opp.compatible_customer.name}</span>
                      {opp.compatible_customer.phone && (
                        <a
                          href={`tel:${opp.compatible_customer.phone}`}
                          className="tco-phone-link"
                          onClick={(e) => e.stopPropagation()}
                          title={opp.compatible_customer.phone}
                        >
                          ☎
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="tco-cell-revenue">
                    +£{opp.potential_additional_revenue.toFixed(2)}
                  </td>
                  <td className="tco-cell-action">
                    <button
                      onClick={() => handleAddToTrip(opp)}
                      className="tco-add-btn"
                      title="Add customer to this trip"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer summary */}
          <div className="tco-footer">
            <span className="tco-footer-text">
              {summary?.highly_recommended || 0} highly recommended
            </span>
            <span className="tco-footer-total">
              Total potential: <strong>£{totalRevenue}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Expanded but empty/error */}
      {expanded && count === 0 && !loading && (
        <div className="tco-empty">
          {error ? (
            <button onClick={fetchOpportunities} className="tco-retry">
              Retry
            </button>
          ) : (
            <span>No opportunities for this date</span>
          )}
        </div>
      )}
    </div>
  );
}

export default TripCombinationOpportunities;
