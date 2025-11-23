import { SocialOuting } from '../../types';

interface OutingCardProps {
  outing: SocialOuting;
  onEdit: (outing: SocialOuting) => void;
  onDelete: (outing: SocialOuting) => void;
  onManageBookings: (outing: SocialOuting) => void;
  onAssignDrivers: (outing: SocialOuting) => void;
}

/**
 * Outing Card Component
 *
 * Displays a single social outing with details and action buttons
 */
function OutingCard({ outing, onEdit, onDelete, onManageBookings, onAssignDrivers }: OutingCardProps) {
  const outingDate = new Date(outing.outing_date);
  const isPast = outingDate < new Date();

  // Format date
  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    const dayOfWeek = date.toLocaleDateString('en-GB', { weekday: 'long' });
    return `${dayOfWeek}, ${day} ${month} ${year}`;
  };

  // Calculate capacity percentage
  const bookingCount = outing.booking_count || 0;
  const capacityPercent = (bookingCount / outing.max_passengers) * 100;

  // Determine status
  const getStatusBadge = () => {
    if (isPast) {
      return <span className="badge badge-gray">Completed</span>;
    }
    if (bookingCount >= outing.max_passengers) {
      return <span className="badge badge-red">Fully Booked</span>;
    }
    if (bookingCount >= outing.max_passengers * 0.8) {
      return <span className="badge badge-orange">Almost Full</span>;
    }
    if (bookingCount > 0) {
      return <span className="badge badge-blue">Booking Open</span>;
    }
    return <span className="badge badge-green">Open</span>;
  };

  return (
    <div className={`outing-card ${isPast ? 'outing-card-past' : ''}`}>
      {/* Header */}
      <div className="outing-card-header">
        <div>
          <h3 className="outing-card-title">{outing.name}</h3>
          <div className="outing-card-destination">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {outing.destination}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          {outing.service_type === 'bus' && (
            <span className="badge" style={{ background: '#10b981', color: 'white', fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
              Bus
            </span>
          )}
          {outing.requires_section_22 && (
            <span className="badge" style={{ background: '#8b5cf6', color: 'white', fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
              S22
            </span>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {/* Date & Time */}
      <div className="outing-card-date">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{formatDate(outingDate)}</span>
      </div>

      <div className="outing-card-time">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>
          Departs: {outing.departure_time}
          {outing.return_time && ` • Returns: ${outing.return_time}`}
        </span>
      </div>

      {/* Stats */}
      <div className="outing-card-stats">
        <div className="outing-card-stat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>{bookingCount}/{outing.max_passengers} passengers</span>
        </div>

        {outing.driver_count !== undefined && outing.driver_count > 0 && (
          <div className="outing-card-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2v10l6 3"/>
            </svg>
            <span>{outing.driver_count} driver{outing.driver_count !== 1 ? 's' : ''}</span>
          </div>
        )}

        {outing.wheelchair_accessible && (
          <div className="outing-card-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m6-6h6M1 12h6"/>
            </svg>
            <span>Wheelchair Accessible</span>
          </div>
        )}
      </div>

      {/* Capacity Bar */}
      {bookingCount > 0 && (
        <div className="outing-card-capacity">
          <div className="capacity-bar">
            <div
              className="capacity-bar-fill"
              style={{
                width: `${Math.min(capacityPercent, 100)}%`,
                backgroundColor: capacityPercent >= 100 ? '#dc2626' : capacityPercent >= 80 ? '#f59e0b' : '#10b981'
              }}
            />
          </div>
          <span className="capacity-text">{Math.round(capacityPercent)}% full</span>
        </div>
      )}

      {/* Cost & Wheelchair Info */}
      {(outing.cost_per_person > 0 || (outing.wheelchair_bookings || 0) > 0) && (
        <div className="outing-card-info">
          {outing.cost_per_person > 0 && (
            <span>£{outing.cost_per_person.toFixed(2)} per person</span>
          )}
          {(outing.wheelchair_bookings || 0) > 0 && (
            <span>{outing.wheelchair_bookings} wheelchair user{outing.wheelchair_bookings !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {/* Description */}
      {outing.description && (
        <div className="outing-card-description">
          {outing.description}
        </div>
      )}

      {/* Actions */}
      <div className="outing-card-actions">
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onManageBookings(outing)}
          title="Manage bookings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Bookings
        </button>

        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onAssignDrivers(outing)}
          title="Assign drivers"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2v10l6 3"/>
          </svg>
          Drivers
        </button>

        <button
          className="btn btn-sm btn-outline"
          onClick={() => onEdit(outing)}
          title="Edit outing"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>

        <button
          className="btn btn-sm btn-danger"
          onClick={() => onDelete(outing)}
          title="Delete outing"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}

export default OutingCard;
