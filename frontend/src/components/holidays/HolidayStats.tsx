import React from 'react';
import { HolidayOverview } from '../../types/holiday.types';

interface HolidayStatsProps {
  overview: HolidayOverview;
}

const HolidayStats: React.FC<HolidayStatsProps> = ({ overview }) => {
  return (
    <div className="holiday-stats-grid">
      <div className="stat-card stat-card-blue">
        <div className="stat-value">{overview.requests?.total || 0}</div>
        <div className="stat-label">Total Requests</div>
        <div className="stat-subtitle">All time records</div>
      </div>

      <div className="stat-card stat-card-orange">
        <div className="stat-value">{overview.requests?.pending || 0}</div>
        <div className="stat-label">Pending Approval</div>
        <div className="stat-subtitle">Awaiting action</div>
      </div>

      <div className="stat-card stat-card-green">
        <div className="stat-value">{overview.requests?.currentHolidays || 0}</div>
        <div className="stat-label">Current Holidays</div>
        <div className="stat-subtitle">Active now</div>
      </div>

      <div className="stat-card stat-card-purple">
        <div className="stat-value">{overview.balances?.driversUsingAnnualLeave || 0}</div>
        <div className="stat-label">Drivers Using Leave</div>
        <div className="stat-subtitle">On leave today</div>
      </div>
    </div>
  );
};

export default HolidayStats;
