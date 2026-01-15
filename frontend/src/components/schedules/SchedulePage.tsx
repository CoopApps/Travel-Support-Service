import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';
import { tripApi } from '../../services/api';
import { ServerTime } from '../../types';
import ScheduledAppointmentsView from './ScheduledAppointmentsView';
import AdHocJourneysView from './AdHocJourneysView';
import AnalyticsDashboard from './AnalyticsDashboard';
import RouteOptimizer from './RouteOptimizer';
import TripCombinationOpportunities from './TripCombinationOpportunities';

/**
 * Schedule Page - Main Component
 *
 * Toggle between scheduled appointments and ad-hoc journeys
 * Displays server time from database
 */
function SchedulePage() {
  const { tenantId, tenant } = useTenant();
  const token = useAuthStore(state => state.token);

  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  // View mode state (scheduled, adhoc, analytics, or routeOptimizer)
  const [viewMode, setViewMode] = useState<'scheduled' | 'adhoc' | 'analytics' | 'routeOptimizer'>('scheduled');

  // Client time state (using computer clock like legacy version)
  const [clientTime, setClientTime] = useState<Date>(new Date());

  // Date range state for navigation
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modal states for new features
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCopyWeekModal, setShowCopyWeekModal] = useState(false);
  const [generateResult, setGenerateResult] = useState<any>(null);
  const [copyWeekResult, setCopyWeekResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Shared filter state (persists across tab switches)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  /**
   * Format date with ordinal suffix (1st, 2nd, 3rd, etc.)
   */
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  /**
   * Format client time for display
   */
  const formatClientTime = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${day}${getOrdinalSuffix(day)} ${month} ${year} ${time}`;
  };

  /**
   * Get current date in YYYY-MM-DD format from client time
   */
  const getCurrentDate = (): string => {
    const y = clientTime.getFullYear();
    const m = String(clientTime.getMonth() + 1).padStart(2, '0');
    const d = String(clientTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  /**
   * Navigate to previous week
   */
  const goToPreviousWeek = () => {
    const currentStart = startDate || getWeekStart(getCurrentDate());
    const [year, month, day] = currentStart.split('-').map(Number);
    const newStart = new Date(year, month - 1, day - 7);
    const newEnd = new Date(year, month - 1, day - 1);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setStartDate(formatDate(newStart));
    setEndDate(formatDate(newEnd));
  };

  /**
   * Navigate to next week
   */
  const goToNextWeek = () => {
    const currentStart = startDate || getWeekStart(getCurrentDate());
    const [year, month, day] = currentStart.split('-').map(Number);
    const newStart = new Date(year, month - 1, day + 7);
    const newEnd = new Date(year, month - 1, day + 13);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setStartDate(formatDate(newStart));
    setEndDate(formatDate(newEnd));
  };

  /**
   * Get week start (Monday) - avoiding timezone issues
   */
  const getWeekStart = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday is 1, Sunday is 0
    const monday = new Date(year, month - 1, day + diff);
    // Format manually to avoid timezone conversion
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  /**
   * Update client time every minute (like legacy version)
   */
  useEffect(() => {
    // Update client time every minute
    const interval = setInterval(() => {
      setClientTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Handler: Generate trips from customer schedules
   */
  const handleGenerateTrips = async () => {
    const weekStart = startDate || getWeekStart(getCurrentDate());
    const [year, month, day] = weekStart.split('-').map(Number);
    const weekStartDate = new Date(year, month - 1, day);
    const weekEndDate = new Date(year, month - 1, day + 6);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/trips/generate-from-schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: formatDate(weekStartDate),
          endDate: formatDate(weekEndDate),
          overwrite: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate trips');
      }

      const result = await response.json();
      setGenerateResult(result);
      setShowGenerateModal(true);

      // Refresh the view
      window.location.reload();
    } catch (error) {
      alert('Failed to generate trips. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handler: Copy current week to next week
   */
  const handleCopyWeek = async () => {
    const weekStart = startDate || getWeekStart(getCurrentDate());
    const [year, month, day] = weekStart.split('-').map(Number);
    const sourceStart = new Date(year, month - 1, day);
    const targetStart = new Date(year, month - 1, day + 7);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setIsCopying(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/trips/copy-week`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceStartDate: formatDate(sourceStart),
          targetStartDate: formatDate(targetStart)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to copy week');
      }

      const result = await response.json();
      setCopyWeekResult(result);
      setShowCopyWeekModal(true);
    } catch (error) {
      alert('Failed to copy week. Please try again.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Schedule Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>

        {/* Client Time Display with Week Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Previous Week Button */}
          <button
            onClick={goToPreviousWeek}
            style={{
              padding: '8px 12px',
              background: 'white',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--gray-700)'
            }}
            title="Previous week"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {/* Client Time Display */}
          <div style={{
            padding: '8px 16px',
            background: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid #0ea5e9',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#0ea5e9' }}>
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
              {formatClientTime(clientTime)}
            </div>
          </div>

          {/* Next Week Button */}
          <button
            onClick={goToNextWeek}
            style={{
              padding: '8px 12px',
              background: 'white',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--gray-700)'
            }}
            title="Next week"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* View Mode Toggle and Date Range Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* View Toggle Buttons */}
        <div style={{
          background: 'white',
          padding: '6px',
          borderRadius: '8px',
          border: '1px solid var(--gray-300)',
          display: 'inline-flex',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <button
            onClick={() => setViewMode('scheduled')}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '6px',
              background: viewMode === 'scheduled' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'scheduled' ? 'white' : 'var(--gray-700)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Scheduled Appointments
          </button>
          <button
            onClick={() => setViewMode('adhoc')}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '6px',
              background: viewMode === 'adhoc' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'adhoc' ? 'white' : 'var(--gray-700)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Ad-hoc Journeys
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '6px',
              background: viewMode === 'analytics' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'analytics' ? 'white' : 'var(--gray-700)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Analytics
          </button>
          <button
            onClick={() => setViewMode('routeOptimizer')}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '6px',
              background: viewMode === 'routeOptimizer' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'routeOptimizer' ? 'white' : 'var(--gray-700)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
              <polyline points="19 12 22 12 22 15 19 15"/>
            </svg>
            Route Optimizer
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={handleGenerateTrips}
            disabled={isGenerating}
            style={{
              padding: '8px 16px',
              background: '#e6e6fa',
              border: '1px solid #9370db',
              borderRadius: '6px',
              color: '#4b0082',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isGenerating ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isGenerating ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            title="Generate trips from customer recurring schedules"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="16 12 12 8 8 12"/>
              <line x1="12" y1="16" x2="12" y2="8"/>
            </svg>
            {isGenerating ? 'Generating...' : 'Generate Trips'}
          </button>

          <button
            onClick={handleCopyWeek}
            disabled={isCopying}
            style={{
              padding: '8px 16px',
              background: '#b0e0e6',
              border: '1px solid #4682b4',
              borderRadius: '6px',
              color: '#003d5c',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isCopying ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isCopying ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            title="Copy this week's trips to next week"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            {isCopying ? 'Copying...' : 'Copy to Next Week'}
          </button>
        </div>

        {/* Date Range Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--gray-300)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--gray-600)' }}>Week Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                fontSize: '13px',
                padding: '4px 8px',
                border: '1px solid var(--gray-300)',
                borderRadius: '4px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--gray-600)' }}>Week End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                fontSize: '13px',
                padding: '4px 8px',
                border: '1px solid var(--gray-300)',
                borderRadius: '4px'
              }}
            />
          </div>

          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: '1px solid var(--gray-300)',
              borderRadius: '4px',
              background: 'white',
              color: 'var(--gray-700)',
              cursor: 'pointer',
              fontWeight: 500,
              marginTop: '16px'
            }}
            title="Clear dates to show current week"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Shared Toolbar for Scheduled/Ad-hoc views */}
      {(viewMode === 'scheduled' || viewMode === 'adhoc') && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '200px' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px 5px 28px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '13px',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Filter button with popover */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                const el = document.getElementById('schedule-filter-popover');
                if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
              }}
              style={{
                padding: '6px 10px',
                fontSize: '13px',
                background: (selectedDriver || selectedCustomer || selectedStatus) ? '#eff6ff' : 'white',
                border: (selectedDriver || selectedCustomer || selectedStatus) ? '1px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: (selectedDriver || selectedCustomer || selectedStatus) ? '#1d4ed8' : '#374151'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filter
              {(selectedDriver || selectedCustomer || selectedStatus) && (
                <span style={{
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: '10px',
                  padding: '1px 5px',
                  borderRadius: '8px',
                  marginLeft: '2px'
                }}>
                  {[selectedDriver, selectedCustomer, selectedStatus].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Filter Popover */}
            <div
              id="schedule-filter-popover"
              style={{
                display: 'none',
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '12px',
                zIndex: 100,
                minWidth: '200px'
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px', color: '#6b7280' }}>Driver</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
                >
                  <option value="">All</option>
                  {/* Drivers will be loaded by child components */}
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px', color: '#6b7280' }}>Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
                >
                  <option value="">All</option>
                  {/* Customers will be loaded by child components */}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px', color: '#6b7280' }}>Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
                >
                  <option value="">All</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {(selectedDriver || selectedCustomer || selectedStatus) && (
                <button
                  onClick={() => {
                    setSelectedDriver('');
                    setSelectedCustomer('');
                    setSelectedStatus('');
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    fontSize: '12px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trip Combination Opportunities Widget */}
      <TripCombinationOpportunities
        onAddToTrip={(tripId, customerId) => {
          // Show success message and refresh the view
          alert(`Customer will be added to trip #${tripId}. Please assign them in the trip details.`);
          window.location.reload();
        }}
        autoRefresh={true}
      />

      {/* View Content */}
      {viewMode === 'scheduled' && (
        <ScheduledAppointmentsView
          tenantId={tenantId}
          serverTime={{ formatted_date: getCurrentDate() } as ServerTime}
          customStartDate={startDate}
          customEndDate={endDate}
          searchQuery={searchQuery}
          selectedDriver={selectedDriver}
          selectedCustomer={selectedCustomer}
          selectedStatus={selectedStatus}
        />
      )}

      {viewMode === 'adhoc' && (
        <AdHocJourneysView
          tenantId={tenantId}
          serverTime={{ formatted_date: getCurrentDate() } as ServerTime}
          customStartDate={startDate}
          customEndDate={endDate}
          searchQuery={searchQuery}
          selectedDriver={selectedDriver}
          selectedCustomer={selectedCustomer}
          selectedStatus={selectedStatus}
        />
      )}

      {viewMode === 'analytics' && (
        <AnalyticsDashboard tenantId={tenantId} />
      )}

      {viewMode === 'routeOptimizer' && (
        <RouteOptimizer tenantId={tenantId} />
      )}


      {/* Generate Trips Result Modal */}
      {showGenerateModal && generateResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--gray-900)' }}>
              Trips Generated Successfully
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  padding: '1rem',
                  background: '#e8f5e9',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1b5e20' }}>
                    {generateResult.generated}
                  </div>
                  <div style={{ fontSize: '12px', color: '#2e7d32' }}>Generated</div>
                </div>
                <div style={{
                  padding: '1rem',
                  background: '#fff3e0',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
                    {generateResult.skipped}
                  </div>
                  <div style={{ fontSize: '12px', color: '#ef6c00' }}>Skipped</div>
                </div>
                <div style={{
                  padding: '1rem',
                  background: '#ffebee',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c62828' }}>
                    {generateResult.conflicts?.length || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#d32f2f' }}>Conflicts</div>
                </div>
              </div>

              {generateResult.conflicts && generateResult.conflicts.length > 0 && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  padding: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>Conflicts:</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {generateResult.conflicts.map((conflict: any, idx: number) => (
                      <li key={idx} style={{ color: '#92400e', fontSize: '13px' }}>
                        <strong>{conflict.customer}</strong> on {conflict.day}: {conflict.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setGenerateResult(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Week Result Modal */}
      {showCopyWeekModal && copyWeekResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--gray-900)' }}>
              Week Copied Successfully
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                padding: '1rem',
                background: '#e8f5e9',
                borderRadius: '6px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1b5e20', textAlign: 'center' }}>
                  {copyWeekResult.copied}
                </div>
                <div style={{ fontSize: '14px', color: '#2e7d32', textAlign: 'center' }}>
                  Trips Copied
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                <div><strong>From:</strong> {copyWeekResult.sourceWeek?.start} to {copyWeekResult.sourceWeek?.end}</div>
                <div><strong>To:</strong> {copyWeekResult.targetWeek?.start} to {copyWeekResult.targetWeek?.end}</div>
              </div>

              {copyWeekResult.errors && copyWeekResult.errors.length > 0 && (
                <div style={{
                  background: '#ffebee',
                  border: '1px solid #ef5350',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#c62828' }}>Errors:</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {copyWeekResult.errors.map((error: string, idx: number) => (
                      <li key={idx} style={{ color: '#c62828', fontSize: '12px' }}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowCopyWeekModal(false);
                  setCopyWeekResult(null);
                  // Navigate to next week
                  goToNextWeek();
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                View Next Week
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulePage;
