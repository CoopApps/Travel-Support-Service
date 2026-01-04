import React, { useState, useEffect } from 'react';
import { getFuelAnalytics } from '../../services/fuelCardsApi';
import { useTenant } from '../../context/TenantContext';
import { AnalyticsResponse } from '../../types/fuelCard.types';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AnalyticsDashboard: React.FC = () => {
  const { tenantId } = useTenant();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6');

  useEffect(() => {
    loadData();
  }, [tenantId, period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getFuelAnalytics(tenantId!, period);
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
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading analytics...</p>
      </div>
    );
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ marginBottom: '0.5rem' }}>Advanced Fuel Analytics</h3>
          <p style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
            Comprehensive insights into fuel usage, costs, and efficiency
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['3', '6', '12'].map(months => (
            <button
              key={months}
              onClick={() => setPeriod(months)}
              style={{
                padding: '0.5rem 1rem',
                border: `2px solid ${period === months ? 'var(--primary)' : 'var(--gray-300)'}`,
                background: period === months ? 'var(--primary-50)' : 'white',
                color: period === months ? 'var(--primary)' : 'var(--gray-700)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {months} Months
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Trends Chart */}
      <div style={{
        background: 'white',
        border: '1px solid var(--gray-200)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <h4 style={{ marginBottom: '1rem' }}>Monthly Trends</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data?.monthly_trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#3b82f6"
              style={{ fontSize: '12px' }}
              label={{ value: 'Cost (£)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#10b981"
              style={{ fontSize: '12px' }}
              label={{ value: 'MPG', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
            />
            <Tooltip
              contentStyle={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'total_cost') return [`£${value.toFixed(2)}`, 'Total Cost'];
                if (name === 'total_litres') return [`${value.toFixed(1)}L`, 'Total Litres'];
                if (name === 'avg_mpg') return [`${value.toFixed(1)} MPG`, 'Avg MPG'];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="total_cost"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Total Cost"
              dot={{ fill: '#3b82f6' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avg_mpg"
              stroke="#10b981"
              strokeWidth={2}
              name="Avg MPG"
              dot={{ fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Driver Rankings */}
        <div style={{
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}>
          <h4 style={{ marginBottom: '1rem' }}>Top Drivers by Spending</h4>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Driver</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Spent</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>MPG</th>
                </tr>
              </thead>
              <tbody>
                {data?.driver_rankings.slice(0, 10).map((driver, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      {driver.driver_name}
                      <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                        {driver.transaction_count} trips
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500 }}>
                      £{driver.total_spent.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      {driver.avg_mpg > 0 ? `${driver.avg_mpg.toFixed(1)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Efficiency */}
        <div style={{
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}>
          <h4 style={{ marginBottom: '1rem' }}>Vehicle Fuel Efficiency</h4>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={data?.vehicle_efficiency.slice(0, 8)}
              layout="horizontal"
              margin={{ left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" style={{ fontSize: '11px' }} />
              <YAxis
                dataKey="registration"
                type="category"
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value.toFixed(1)} MPG`, 'Fuel Efficiency']}
              />
              <Bar dataKey="avg_mpg" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Station Comparison */}
        <div style={{
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}>
          <h4 style={{ marginBottom: '1rem' }}>Station Price Comparison</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.station_comparison.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="station_name"
                stroke="#6b7280"
                style={{ fontSize: '10px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
                label={{ value: 'Price per Litre (£)', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`£${value.toFixed(3)}`, 'Avg Price/L']}
              />
              <Bar dataKey="avg_price_per_litre" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Usage Patterns */}
        <div style={{
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}>
          <h4 style={{ marginBottom: '1rem' }}>Usage Patterns by Day</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data?.usage_patterns.map(p => ({
                ...p,
                day_name: dayNames[p.day_of_week].substring(0, 3),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day_name" stroke="#6b7280" style={{ fontSize: '11px' }} />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
                label={{ value: 'Transactions', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'transaction_count') return [value, 'Transactions'];
                  if (name === 'total_cost') return [`£${value.toFixed(2)}`, 'Total Cost'];
                  return [value, name];
                }}
              />
              <Bar dataKey="transaction_count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
