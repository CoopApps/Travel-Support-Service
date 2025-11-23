import React, { useState } from 'react';
import CooperativeCommonwealthTracker from './CooperativeCommonwealthTracker';
import SurplusPoolDashboard from './SurplusPoolDashboard';
import CooperativeMembersPage from './CooperativeMembersPage';
import DividendManagementPage from './DividendManagementPage';
import './CooperativePage.css';

/**
 * Co-operative Page
 *
 * Consolidated view of all cooperative features:
 * - Commonwealth: Community impact tracking
 * - Surplus Pool: Route-based surplus management
 * - Members: Cooperative membership management
 * - Dividends: Dividend calculation and distribution
 */

type TabId = 'commonwealth' | 'surplus' | 'members' | 'dividends';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: 'commonwealth',
    label: 'Commonwealth',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M2 12h20"></path>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    ),
  },
  {
    id: 'surplus',
    label: 'Surplus Pool',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
        <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"></path>
      </svg>
    ),
  },
  {
    id: 'members',
    label: 'Members',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
  {
    id: 'dividends',
    label: 'Dividends',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    ),
  },
];

export default function CooperativePage() {
  const [activeTab, setActiveTab] = useState<TabId>('commonwealth');

  return (
    <div className="cooperative-page">
      {/* Header */}
      <div className="cooperative-header">
        <div>
          <h1>Co-operative</h1>
          <p className="cooperative-subtitle">
            Manage your cooperative membership, surplus pools, and dividend distributions
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="cooperative-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`cooperative-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="cooperative-content">
        {activeTab === 'commonwealth' && (
          <CooperativeCommonwealthTracker />
        )}
        {activeTab === 'surplus' && (
          <SurplusPoolDashboard />
        )}
        {activeTab === 'members' && (
          <CooperativeMembersPage />
        )}
        {activeTab === 'dividends' && (
          <DividendManagementPage />
        )}
      </div>
    </div>
  );
}
