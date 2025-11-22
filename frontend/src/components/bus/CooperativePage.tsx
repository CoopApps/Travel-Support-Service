import React from 'react';
import CooperativeCommonwealthTracker from './CooperativeCommonwealthTracker';
import './BusDashboard.css';

/**
 * Co-operative Page
 *
 * Dedicated page for the Cooperative Commonwealth Fund tracking
 * and related co-operative features.
 */
export default function CooperativePage() {
  return (
    <div className="bus-dashboard">
      <div className="dashboard-header">
        <h1>Co-operative Commonwealth</h1>
        <p className="dashboard-subtitle">
          Track community impact and cooperative wealth building
        </p>
      </div>

      {/* Cooperative Commonwealth Impact Tracker */}
      <div style={{ marginTop: '1rem' }}>
        <CooperativeCommonwealthTracker />
      </div>
    </div>
  );
}
