import React from 'react';
import { HolidayOverview } from '../../types/holiday.types';

interface HolidayStatsProps {
  overview: HolidayOverview;
}

const HolidayStats: React.FC<HolidayStatsProps> = ({ overview }) => {
  return (
    <div className="stats-grid">
      <div className="stat-card stat-card-blue">
        <h4 className="stat-value">{overview.requests?.total || 0}</h4>
        <small className="stat-label">Total Requests</small>
        <small className="stat-subtitle">All time</small>
      </div>

      <div className="stat-card stat-card-orange">
        <h4 className="stat-value">{overview.requests?.pending || 0}</h4>
        <small className="stat-label">Pending Approval</small>
        <small className="stat-subtitle">Awaiting review</small>
      </div>

      <div className="stat-card stat-card-green">
        <h4 className="stat-value">{overview.requests?.currentHolidays || 0}</h4>
        <small className="stat-label">Current Holidays</small>
        <small className="stat-subtitle">Active today</small>
      </div>

      <div className="stat-card stat-card-purple">
        <h4 className="stat-value">{overview.balances?.driversUsingAnnualLeave || 0}</h4>
        <small className="stat-label">Drivers Using Leave</small>
        <small className="stat-subtitle">This year</small>
      </div>
    </div>
  );
};

export default HolidayStats;
