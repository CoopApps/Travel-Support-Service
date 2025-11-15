import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';

/**
 * Advanced Bus Analytics Dashboard
 *
 * Comprehensive analytics for Section 22 bus services:
 * - Route profitability analysis
 * - Demand forecasting and patterns
 * - Occupancy trends
 * - Revenue analytics
 * - Passenger demographics
 * - Service efficiency metrics
 * - Booking patterns
 */

interface AnalyticsOverview {
  revenue: {
    total_revenue: string;
    total_bookings: number;
    average_fare: string;
    services_booked: number;
  };
  occupancy: {
    average: string;
    peak: string;
    lowest: string;
  };
  top_routes: Array<{
    route_name: string;
    revenue: string;
    bookings: number;
  }>;
}

interface RouteProfit {
  route_name: string;
  total_revenue: string;
  estimated_profit: string;
  profit_margin: string;
  occupancy_rate: string;
  total_bookings: number;
  profitability: string;
}

export default function BusAnalyticsPage() {
  const { tenant } = useTenant();
  const toast = useToast();

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [routeProfitability, setRouteProfitability] = useState<RouteProfit[]>([]);
  const [demandForecast, setDemandForecast] = useState<any>(null);
  const [demographics, setDemographics] = useState<any>(null);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [activeTab, setActiveTab] = useState<'overview' | 'profitability' | 'demand' | 'demographics' | 'efficiency'>('overview');

  useEffect(() => {
    if (tenant?.tenant_id) {
      fetchAnalytics();
    }
  }, [tenant?.tenant_id, selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [overviewRes, profitRes, demandRes, demoRes, effRes] = await Promise.all([
        fetch(`/api/tenants/${tenant!.tenant_id}/bus-analytics/overview?period=${selectedPeriod}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/tenants/${tenant!.tenant_id}/bus-analytics/route-profitability`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/tenants/${tenant!.tenant_id}/bus-analytics/demand-forecast`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/tenants/${tenant!.tenant_id}/bus-analytics/passenger-demographics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/tenants/${tenant!.tenant_id}/bus-analytics/efficiency-metrics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      const [overviewData, profitData, demandData, demoData, effData] = await Promise.all([
        overviewRes.json(),
        profitRes.json(),
        demandRes.json(),
        demoRes.json(),
        effRes.json(),
      ]);

      setOverview(overviewData);
      setRouteProfitability(profitData.routes);
      setDemandForecast(demandData);
      setDemographics(demoData);
      setEfficiencyMetrics(effData);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getProfitabilityColor = (profitability: string) => {
    return profitability === 'profitable' ? '#10b981' : profitability === 'loss' ? '#ef4444' : '#6b7280';
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            📊 Bus Analytics Dashboard
          </h1>
          <p style={{ color: '#6b7280' }}>
            Insights, trends, and performance metrics for your bus services
          </p>
        </div>
        <div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600 }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid #e5e7eb', display: 'flex', gap: '1rem' }}>
        {[
          { id: 'overview', label: '📈 Overview', icon: '📈' },
          { id: 'profitability', label: '💰 Route Profitability', icon: '💰' },
          { id: 'demand', label: '📅 Demand Patterns', icon: '📅' },
          { id: 'demographics', label: '👥 Demographics', icon: '👥' },
          { id: 'efficiency', label: '⚡ Efficiency', icon: '⚡' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
              fontWeight: 600,
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div>
          {/* Revenue Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Revenue</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                {formatCurrency(overview.revenue.total_revenue)}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Bookings</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>
                {overview.revenue.total_bookings}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Average Fare</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {formatCurrency(overview.revenue.average_fare)}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Avg Occupancy</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>
                {overview.occupancy.average}%
              </div>
            </div>
          </div>

          {/* Top Routes */}
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>🏆 Top Performing Routes</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {overview.top_routes.map((route, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '6px'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>#{idx + 1} {route.route_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {route.bookings} bookings
                    </div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                    {formatCurrency(route.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Route Profitability Tab */}
      {activeTab === 'profitability' && (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>ROUTE</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>BOOKINGS</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>REVENUE</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>PROFIT</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>MARGIN</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>OCCUPANCY</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {routeProfitability.map((route, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{route.route_name}</td>
                  <td style={{ padding: '1rem' }}>{route.total_bookings}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#10b981' }}>
                    {formatCurrency(route.total_revenue)}
                  </td>
                  <td style={{
                    padding: '1rem',
                    fontWeight: 600,
                    color: getProfitabilityColor(route.profitability)
                  }}>
                    {formatCurrency(route.estimated_profit)}
                  </td>
                  <td style={{ padding: '1rem' }}>{route.profit_margin}%</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        maxWidth: '100px'
                      }}>
                        <div style={{
                          width: `${route.occupancy_rate}%`,
                          height: '100%',
                          background: '#8b5cf6'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{route.occupancy_rate}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      background: route.profitability === 'profitable' ? '#d1fae5' :
                                 route.profitability === 'loss' ? '#fee2e2' : '#f3f4f6',
                      color: route.profitability === 'profitable' ? '#065f46' :
                             route.profitability === 'loss' ? '#991b1b' : '#374151',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {route.profitability === 'profitable' ? '✓ Profitable' :
                       route.profitability === 'loss' ? '✗ Loss' : '~ Break Even'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Demand Patterns Tab */}
      {activeTab === 'demand' && demandForecast && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Daily Pattern */}
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>📅 Daily Demand Pattern</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
              {demandForecast.daily_pattern.map((day: any, idx: number) => {
                const maxBookings = Math.max(...demandForecast.daily_pattern.map((d: any) => d.bookings));
                const height = (day.bookings / maxBookings) * 100;
                return (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <div style={{ height: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{
                        height: `${height}%`,
                        background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                        borderRadius: '4px 4px 0 0'
                      }} />
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>{day.bookings}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {dayNames[day.day_of_week].substring(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hourly Pattern */}
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>🕐 Hourly Demand Pattern</h3>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'flex-end', height: '200px' }}>
              {demandForecast.hourly_pattern.map((hour: any, idx: number) => {
                const maxBookings = Math.max(...demandForecast.hourly_pattern.map((h: any) => h.bookings));
                const height = hour.bookings > 0 ? (hour.bookings / maxBookings) * 100 : 2;
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '0.625rem', marginBottom: '0.25rem', fontWeight: 600 }}>
                      {hour.bookings > 0 ? hour.bookings : ''}
                    </div>
                    <div style={{
                      width: '100%',
                      height: `${height}%`,
                      background: 'linear-gradient(180deg, #8b5cf6, #7c3aed)',
                      borderRadius: '2px 2px 0 0',
                      minHeight: '4px'
                    }} />
                    <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {hour.hour}h
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Demographics Tab */}
      {activeTab === 'demographics' && demographics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Passenger Tiers */}
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>🎫 Passenger Types</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {demographics.tier_distribution.map((tier: any, idx: number) => {
                const total = demographics.tier_distribution.reduce((sum: number, t: any) => sum + parseInt(t.count), 0);
                const percentage = ((parseInt(tier.count) / total) * 100).toFixed(1);
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.875rem' }}>
                        {tier.tier.replace('_', ' ')}
                      </span>
                      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        {tier.count} ({percentage}%)
                      </span>
                    </div>
                    <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10b981, #059669)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking Lead Time */}
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>⏰ Booking Lead Time</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {demographics.booking_lead_time.map((lead: any, idx: number) => (
                <div key={idx} style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{lead.category}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Avg fare: {formatCurrency(lead.avg_fare)}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
                    {lead.bookings}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Efficiency Tab */}
      {activeTab === 'efficiency' && efficiencyMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Bookings per Service</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{efficiencyMetrics.bookings_per_service}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Revenue per Booking</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
              {formatCurrency(efficiencyMetrics.revenue_per_booking)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Completion Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>
              {efficiencyMetrics.completion_rate}%
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>No-Show Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
              {efficiencyMetrics.no_show_rate}%
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Cancellation Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>
              {efficiencyMetrics.cancellation_rate}%
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Services</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{efficiencyMetrics.total_services}</div>
          </div>
        </div>
      )}
    </div>
  );
}
