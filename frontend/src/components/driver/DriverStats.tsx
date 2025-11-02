import './DriverStats.css';

interface DriverStatsProps {
  tripStats?: {
    completed: number;
    cancelled: number;
    noShows: number;
    total: number;
    completionRate: number;
  };
  todaySchedules?: number;
  upcomingSchedules?: number;
  pendingHolidays?: number;
}

/**
 * Driver Statistics Cards
 *
 * Displays key metrics for the driver dashboard
 */
function DriverStats({
  tripStats,
  todaySchedules = 0,
  upcomingSchedules = 0,
  pendingHolidays = 0
}: DriverStatsProps) {
  return (
    <div className="driver-stats-grid">
      <StatCard
        label="Today's Trips"
        value={todaySchedules}
        theme="blue"
      />
      <StatCard
        label="Upcoming Trips"
        value={upcomingSchedules}
        theme="teal"
      />
      <StatCard
        label="Completion Rate"
        value={`${tripStats?.completionRate || 0}%`}
        theme="green"
      />
      <StatCard
        label="Completed (30d)"
        value={tripStats?.completed || 0}
        theme="purple"
      />
      <StatCard
        label="No Shows (30d)"
        value={tripStats?.noShows || 0}
        theme="orange"
      />
      <StatCard
        label="Pending Holidays"
        value={pendingHolidays}
        theme="indigo"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'indigo';
}

function StatCard({ label, value, theme }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${theme}`}>
      <h4 className="stat-value">{value}</h4>
      <small className="stat-label">{label}</small>
    </div>
  );
}

export default DriverStats;
