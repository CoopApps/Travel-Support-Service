import './RosterStats.css';

interface RosterStatsData {
  drivers: number;
  assignments: number;
  transport?: number;
  bus?: number;
}

interface RosterStatsProps {
  stats: RosterStatsData;
  loading: boolean;
  showServiceType: boolean;
}

function RosterStats({ stats, loading, showServiceType }: RosterStatsProps) {
  if (loading) {
    return (
      <div className="roster-stats-grid">
        {[...Array(showServiceType ? 4 : 2)].map((_, i) => (
          <div key={i} className="stat-card stat-card-loading">
            <div className="stat-value">-</div>
            <div className="stat-label">Loading...</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="roster-stats-grid">
      <StatCard
        label="Drivers"
        value={stats.drivers}
        subtitle="On duty today"
        theme="blue"
      />
      <StatCard
        label="Assignments"
        value={stats.assignments}
        subtitle="Total scheduled"
        theme="green"
      />
      {showServiceType && (
        <>
          <StatCard
            label="Transport"
            value={stats.transport || 0}
            subtitle="Travel support trips"
            theme="purple"
          />
          <StatCard
            label="Bus"
            value={stats.bus || 0}
            subtitle="Bus routes"
            theme="orange"
          />
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  subtitle: string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'indigo';
}

function StatCard({ label, value, subtitle, theme }: StatCardProps) {
  return (
    <div className={'stat-card stat-card-' + theme}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );
}

export default RosterStats;
