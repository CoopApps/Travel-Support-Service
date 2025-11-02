import { useEffect, useRef } from 'react';

interface Trip {
  assignment_id?: number;
  trip_id?: number;
  customer_name: string;
  pickup_time?: string;
  customer_address?: string;
  destination?: string;
  status?: string;
  urgent?: boolean;
}

interface TripContextMenuProps {
  trip: Trip | null;
  position: { x: number; y: number };
  onStatusChange: (trip: Trip, status: string) => void;
  onClose: () => void;
}

/**
 * Driver Trip Context Menu
 *
 * Professional right-click menu for trip status updates
 * Clean design matching the overall system
 */
function TripContextMenu({
  trip,
  position,
  onStatusChange,
  onClose
}: TripContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled', color: '#6c757d' },
    { value: 'in_progress', label: 'In Progress', color: '#0dcaf0' },
    { value: 'completed', label: 'Completed', color: '#28a745' },
    { value: 'cancelled', label: 'Cancelled', color: '#dc3545' },
    { value: 'no_show', label: 'No Show', color: '#ffc107' },
  ];

  const isDisabled = !trip;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        background: 'white',
        border: '1px solid var(--gray-300)',
        borderRadius: '6px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 10000,
        minWidth: '200px',
        fontSize: '14px',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--gray-200)',
        background: 'white'
      }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
          {trip ? trip.customer_name : 'No Trip Selected'}
        </div>
        {trip && trip.customer_address && (
          <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
            {trip.customer_address}
          </div>
        )}
      </div>

      {/* Status Options */}
      <div style={{ padding: '0.5rem 0' }}>
        <div style={{
          padding: '4px 1rem 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--gray-600)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Update Status
        </div>
        {statusOptions.map(option => (
          <div
            key={option.value}
            onClick={() => {
              if (!isDisabled && trip) {
                onStatusChange(trip, option.value);
                onClose();
              }
            }}
            style={{
              padding: '0.625rem 1rem',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: trip?.status === option.value ? 'var(--gray-100)' : 'transparent',
              opacity: isDisabled ? 0.4 : 1,
              pointerEvents: isDisabled ? 'none' : 'auto',
              transition: 'all 0.15s ease',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.background = 'var(--gray-100)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.background = trip?.status === option.value ? 'var(--gray-100)' : 'transparent';
              }
            }}
          >
            <span style={{ fontWeight: trip?.status === option.value ? 600 : 400, color: 'var(--gray-900)' }}>
              {option.label}
            </span>
            {trip?.status === option.value && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: option.color
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.5rem 1rem',
        borderTop: '1px solid var(--gray-200)',
        background: 'var(--gray-50)',
        fontSize: '11px',
        color: 'var(--gray-600)',
        textAlign: 'center',
        borderBottomLeftRadius: '6px',
        borderBottomRightRadius: '6px'
      }}>
        {isDisabled ? 'No trip selected' : 'Click to update • ESC to close'}
      </div>
    </div>
  );
}

export default TripContextMenu;
