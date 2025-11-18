import React, { useState } from 'react';
import ReminderSettingsPage from './ReminderSettingsPage';
import RouteOptimizationSettings from './RouteOptimizationSettings';
import RosterOptimizationSettings from './RosterOptimizationSettings';

type TabType = 'reminders' | 'route-optimization' | 'roster-optimization';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('reminders');

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m6-6h6M1 12h6" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          Settings
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Configure system settings and integrations
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '30px'
      }}>
        <div style={{
          display: 'flex',
          gap: '0px',
        }}>
          <button
            onClick={() => setActiveTab('reminders')}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'reminders' ? '#2563eb' : '#6b7280',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'reminders' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Reminder Settings
          </button>
          <button
            onClick={() => setActiveTab('route-optimization')}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'route-optimization' ? '#2563eb' : '#6b7280',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'route-optimization' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" />
            </svg>
            Route Optimization
          </button>
          <button
            onClick={() => setActiveTab('roster-optimization')}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'roster-optimization' ? '#2563eb' : '#6b7280',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'roster-optimization' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
            Roster Optimization
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'reminders' && <ReminderSettingsPage />}
        {activeTab === 'route-optimization' && <RouteOptimizationSettings />}
        {activeTab === 'roster-optimization' && <RosterOptimizationSettings />}
      </div>
    </div>
  );
};

export default SettingsPage;
