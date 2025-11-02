import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { SocialOuting, OutingBooking, OutingRota } from '../../types';
import socialOutingsApi from '../../services/socialOutingsApi';
import OutingStats from './OutingStats';
import OutingCard from './OutingCard';
import OutingFormModal from './OutingFormModal';
import BookingManagementModal from './BookingManagementModal';
import DriverAssignmentModal from './DriverAssignmentModal';
import CustomerAvailabilityOverview from './CustomerAvailabilityOverview';
import AccessibilityOverviewModal from './AccessibilityOverviewModal';
import './SocialOutings.css';

/**
 * Social Outings Page
 *
 * Main page for managing social outings/events with bookings and driver assignments
 */
function SocialOutingsPage() {
  const { tenantId, tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [outings, setOutings] = useState<SocialOuting[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [showAvailability, setShowAvailability] = useState(false);
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);

  // Modal state
  const [showOutingForm, setShowOutingForm] = useState(false);
  const [editingOuting, setEditingOuting] = useState<SocialOuting | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [managingBookingsOuting, setManagingBookingsOuting] = useState<SocialOuting | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [assigningDriversOuting, setAssigningDriversOuting] = useState<SocialOuting | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchOutings();
    }
  }, [tenantId]);

  const fetchOutings = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const data = await socialOutingsApi.getOutings(tenantId);
      setOutings(data);
    } catch (err) {
      console.error('Error fetching outings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter outings based on active tab
  const filteredOutings = outings.filter(outing => {
    const outingDate = new Date(outing.outing_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activeTab === 'upcoming') {
      return outingDate >= today;
    } else if (activeTab === 'past') {
      return outingDate < today;
    }
    return true;
  }).sort((a, b) => {
    // Sort by date: upcoming ascending, past descending
    const dateA = new Date(a.outing_date).getTime();
    const dateB = new Date(b.outing_date).getTime();
    return activeTab === 'past' ? dateB - dateA : dateA - dateB;
  });

  // Handlers
  const handleAddOuting = () => {
    setEditingOuting(null);
    setShowOutingForm(true);
  };

  const handleEditOuting = (outing: SocialOuting) => {
    setEditingOuting(outing);
    setShowOutingForm(true);
  };

  const handleManageBookings = (outing: SocialOuting) => {
    setManagingBookingsOuting(outing);
    setShowBookingModal(true);
  };

  const handleAssignDrivers = (outing: SocialOuting) => {
    setAssigningDriversOuting(outing);
    setShowDriverModal(true);
  };

  const handleDeleteOuting = async (outing: SocialOuting) => {
    if (!tenantId) return;

    const hasBookings = (outing.booking_count || 0) > 0;
    const confirmMessage = hasBookings
      ? `Delete "${outing.name}"?\n\nThis outing has ${outing.booking_count} booking(s). All bookings and driver assignments will be permanently deleted.\n\nThis action cannot be undone.`
      : `Delete "${outing.name}"?\n\nThis action cannot be undone.`;

    const confirmed = confirm(confirmMessage);
    if (!confirmed) return;

    try {
      await socialOutingsApi.deleteOuting(tenantId, outing.id);
      fetchOutings();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete outing');
    }
  };

  const handleModalClose = (shouldRefresh: boolean) => {
    setShowOutingForm(false);
    setShowBookingModal(false);
    setShowDriverModal(false);
    setEditingOuting(null);
    setManagingBookingsOuting(null);
    setAssigningDriversOuting(null);

    if (shouldRefresh) {
      fetchOutings();
    }
  };

  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Social Outings</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowAccessibilityModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="4" r="2"/>
              <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z"/>
            </svg>
            Accessibility Overview
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowAvailability(!showAvailability)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Customer Availability
          </button>
          <button className="btn btn-primary" onClick={handleAddOuting}>
            + Create Outing
          </button>
        </div>
      </div>

      {/* Stats */}
      <OutingStats tenantId={tenantId} />

      {/* Customer Availability Overview */}
      <CustomerAvailabilityOverview
        isVisible={showAvailability}
        onClose={() => setShowAvailability(false)}
      />

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--gray-200)',
        paddingBottom: '0'
      }}>
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'upcoming' ? '2px solid var(--primary-500)' : '2px solid transparent',
            color: activeTab === 'upcoming' ? 'var(--primary-600)' : 'var(--gray-600)',
            fontWeight: activeTab === 'upcoming' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('past')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'past' ? '2px solid var(--primary-500)' : '2px solid transparent',
            color: activeTab === 'past' ? 'var(--primary-600)' : 'var(--gray-600)',
            fontWeight: activeTab === 'past' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Past
        </button>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'all' ? '2px solid var(--primary-500)' : '2px solid transparent',
            color: activeTab === 'all' ? 'var(--primary-600)' : 'var(--gray-600)',
            fontWeight: activeTab === 'all' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          All
        </button>
      </div>

      {/* Outings List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
          Loading outings...
        </div>
      ) : filteredOutings.length === 0 ? (
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            {activeTab === 'upcoming' ? 'No upcoming outings.' : activeTab === 'past' ? 'No past outings.' : 'No outings yet.'}
          </p>
          {activeTab !== 'past' && (
            <button className="btn btn-primary" onClick={handleAddOuting}>
              + Create Outing
            </button>
          )}
        </div>
      ) : (
        <div className="outings-grid">
          {filteredOutings.map(outing => (
            <OutingCard
              key={outing.id}
              outing={outing}
              onEdit={handleEditOuting}
              onDelete={handleDeleteOuting}
              onManageBookings={handleManageBookings}
              onAssignDrivers={handleAssignDrivers}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showOutingForm && (
        <OutingFormModal
          outing={editingOuting}
          onClose={handleModalClose}
        />
      )}

      {showBookingModal && managingBookingsOuting && (
        <BookingManagementModal
          outing={managingBookingsOuting}
          onClose={handleModalClose}
        />
      )}

      {showDriverModal && assigningDriversOuting && (
        <DriverAssignmentModal
          outing={assigningDriversOuting}
          onClose={handleModalClose}
        />
      )}

      <AccessibilityOverviewModal
        isOpen={showAccessibilityModal}
        onClose={() => setShowAccessibilityModal(false)}
      />
    </div>
  );
}

export default SocialOutingsPage;
