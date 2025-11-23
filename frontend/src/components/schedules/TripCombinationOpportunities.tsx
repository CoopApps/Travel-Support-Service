/**
 * Trip Combination Opportunities Component
 *
 * Displays proactive suggestions for combining trips to maximize vehicle utilization
 * Shows drivers with empty seats and compatible customers with similar destinations
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
  const [collapsed, setCollapsed] = useState(false);

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
    }, 5 * 60 * 1000); // 5 minutes

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
      console.error('Failed to fetch combination opportunities:', err);
      setError(err.response?.data?.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommended':
        return { bg: '#d1fae5', border: '#10b981', text: '#065f46', badge: '#10b981' };
      case 'recommended':
        return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', badge: '#3b82f6' };
      case 'acceptable':
        return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', badge: '#f59e0b' };
      default:
        return { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563', badge: '#9ca3af' };
    }
  };

  const getRecommendationLabel = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommended': return '⭐ Highly Recommended';
      case 'recommended': return '✓ Recommended';
      case 'acceptable': return '○ Acceptable';
      default: return '';
    }
  };

  const handleAddToTrip = (opportunity: any) => {
    if (onAddToTrip) {
      onAddToTrip(opportunity.trip_id, opportunity.compatible_customer.id);
    }
  };

  if (!tenantId) return null;

  return (
    <div className="trip-combination-opportunities">
      {/* Header */}
      <div className="opportunities-header">
        <div className="header-left">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-button"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▶' : '▼'}
          </button>
          <div>
            <h3>🚗 Trip Combination Opportunities</h3>
            <p className="header-subtitle">
              Maximize revenue by filling empty seats with compatible customers
            </p>
          </div>
        </div>

        <div className="header-actions">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
          <button
            onClick={fetchOpportunities}
            disabled={loading}
            className="refresh-button"
            title="Refresh opportunities"
          >
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Summary Stats */}
          {summary && opportunities.length > 0 && (
            <div className="summary-stats">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-label">Total Opportunities</div>
                  <div className="stat-value">{summary.total_opportunities}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-content">
                  <div className="stat-label">Highly Recommended</div>
                  <div className="stat-value">{summary.highly_recommended}</div>
                </div>
              </div>

              <div className="stat-card highlight">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <div className="stat-label">Potential Revenue</div>
                  <div className="stat-value">£{summary.total_potential_revenue}</div>
                </div>
              </div>
            </div>
          )}

          {/* Opportunities List */}
          <div className="opportunities-content">
            {loading && opportunities.length === 0 ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Finding combination opportunities...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>⚠️ {error}</p>
                <button onClick={fetchOpportunities} className="retry-button">
                  Try Again
                </button>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h4>All vehicles fully utilized!</h4>
                <p>No combination opportunities found for {selectedDate}</p>
                <p className="empty-hint">
                  Try selecting a different date or check back later.
                </p>
              </div>
            ) : (
              <div className="opportunities-list">
                {opportunities.map((opportunity, index) => {
                  const colors = getRecommendationColor(opportunity.recommendation);

                  return (
                    <div
                      key={index}
                      className="opportunity-card"
                      style={{
                        borderLeft: `4px solid ${colors.border}`,
                        background: colors.bg
                      }}
                    >
                      {/* Recommendation Badge */}
                      <div className="recommendation-badge" style={{ background: colors.badge }}>
                        {getRecommendationLabel(opportunity.recommendation)}
                      </div>

                      {/* Current Trip Info */}
                      <div className="opportunity-section">
                        <h4 className="section-title">Current Trip</h4>
                        <div className="trip-info">
                          <div className="info-row">
                            <span className="info-icon">👤</span>
                            <span className="info-label">Driver:</span>
                            <span className="info-value">{opportunity.driver.name}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-icon">🚗</span>
                            <span className="info-label">Vehicle:</span>
                            <span className="info-value">
                              {opportunity.vehicle.make} {opportunity.vehicle.model} ({opportunity.vehicle.registration})
                            </span>
                          </div>
                          <div className="info-row">
                            <span className="info-icon">💺</span>
                            <span className="info-label">Capacity:</span>
                            <span className="info-value">
                              {opportunity.vehicle.occupied_seats}/{opportunity.vehicle.capacity} seats used
                              <span className="available-seats">
                                {' '}({opportunity.vehicle.available_seats} available)
                              </span>
                            </span>
                          </div>
                          <div className="info-row">
                            <span className="info-icon">👥</span>
                            <span className="info-label">Customer:</span>
                            <span className="info-value">{opportunity.current_trip.customer_name}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-icon">📍</span>
                            <span className="info-label">Pickup:</span>
                            <span className="info-value">
                              {opportunity.current_trip.pickup_location} ({opportunity.pickup_time})
                            </span>
                          </div>
                          <div className="info-row">
                            <span className="info-icon">🎯</span>
                            <span className="info-label">Destination:</span>
                            <span className="info-value">{opportunity.current_trip.destination}</span>
                          </div>
                        </div>
                      </div>

                      {/* Compatible Customer Info */}
                      <div className="opportunity-section">
                        <h4 className="section-title">Compatible Customer</h4>
                        <div className="customer-info">
                          <div className="info-row">
                            <span className="info-icon">👤</span>
                            <span className="info-label">Name:</span>
                            <span className="info-value">{opportunity.compatible_customer.name}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-icon">🏠</span>
                            <span className="info-label">Address:</span>
                            <span className="info-value">
                              {opportunity.compatible_customer.address || 'N/A'}
                              {opportunity.compatible_customer.postcode && `, ${opportunity.compatible_customer.postcode}`}
                            </span>
                          </div>
                          {opportunity.compatible_customer.phone && (
                            <div className="info-row">
                              <span className="info-icon">📞</span>
                              <span className="info-label">Phone:</span>
                              <span className="info-value">{opportunity.compatible_customer.phone}</span>
                            </div>
                          )}
                          {opportunity.compatible_customer.similar_destination_trips > 0 && (
                            <div className="info-row">
                              <span className="info-icon">🎯</span>
                              <span className="info-label">Similar trips:</span>
                              <span className="info-value">
                                {opportunity.compatible_customer.similar_destination_trips} times to similar destination
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Revenue Potential */}
                      <div className="opportunity-section revenue-section">
                        <div className="revenue-highlight">
                          <span className="revenue-label">Potential Additional Revenue:</span>
                          <span className="revenue-value">
                            £{opportunity.potential_additional_revenue.toFixed(2)}
                          </span>
                        </div>
                        <div className="compatibility-score">
                          Compatibility Score: {opportunity.compatibility_score}/100
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="opportunity-actions">
                        <button
                          onClick={() => handleAddToTrip(opportunity)}
                          className="add-button"
                        >
                          ➕ Add to Trip
                        </button>
                        {opportunity.compatible_customer.phone ? (
                          <a
                            href={`tel:${opportunity.compatible_customer.phone}`}
                            className="call-button"
                          >
                            📞 Call Customer
                          </a>
                        ) : (
                          <span className="call-button" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                            📞 Call Customer
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default TripCombinationOpportunities;
