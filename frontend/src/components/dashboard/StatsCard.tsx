import React from 'react';

/**
 * StatsCard Component
 *
 * Displays a key business metric with gradient background
 * Used in the main dashboard for KPIs
 */

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
}

function StatsCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  trend,
}: StatsCardProps) {
  return (
    <div
      className="card"
      style={{
        padding: '1rem',
        background: gradient,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Icon Background */}
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '80px',
          height: '80px',
          opacity: 0.15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '60px', height: '60px' }}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Title */}
        <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '0.3rem', fontWeight: 500 }}>
          {title}
        </div>

        {/* Value */}
        <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '0.3rem', lineHeight: 1 }}>
          {value}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div style={{ fontSize: '10px', opacity: 0.8 }}>
            {subtitle}
          </div>
        )}

        {/* Trend Indicator */}
        {trend && (
          <div
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
            <span>{trend.value}%</span>
            <span style={{ opacity: 0.8, fontWeight: 400 }}>{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsCard;
