import { PermitsStats } from '../../types';

interface PermitsStatsCardsProps {
  stats: PermitsStats;
}

function PermitsStatsCards({ stats }: PermitsStatsCardsProps) {
  const statCardStyle = {
    padding: '12px',
    borderRadius: '6px',
    minHeight: '95px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  };

  const statValueStyle = {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    color: 'inherit',
    lineHeight: 1.2,
  };

  const statLabelStyle = {
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    display: 'block',
    color: 'inherit',
    opacity: 0.85,
    marginTop: '2px',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
      <div style={{ ...statCardStyle, background: '#d1fae5', color: '#065f46' }}>
        <h4 style={statValueStyle}>{stats.drivers.compliant}</h4>
        <small style={statLabelStyle}>Fully Compliant</small>
      </div>

      <div style={{ ...statCardStyle, background: '#fed7aa', color: '#92400e' }}>
        <h4 style={statValueStyle}>{stats.drivers.expiring}</h4>
        <small style={statLabelStyle}>Expiring Soon</small>
      </div>

      <div style={{ ...statCardStyle, background: '#fee2e2', color: '#991b1b' }}>
        <h4 style={statValueStyle}>{stats.drivers.expired + stats.drivers.missing}</h4>
        <small style={statLabelStyle}>Non-Compliant</small>
      </div>

      <div style={{ ...statCardStyle, background: '#dbeafe', color: '#1e40af' }}>
        <h4 style={statValueStyle}>{stats.drivers.total}</h4>
        <small style={statLabelStyle}>Total Drivers</small>
      </div>
    </div>
  );
}

export default PermitsStatsCards;
