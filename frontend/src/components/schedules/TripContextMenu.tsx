import { useEffect, useRef } from 'react';
import { Trip } from '../../types';

interface TripContextMenuProps {
  trip: Trip | null;
  position: { x: number; y: number };
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Trip Context Menu
 *
 * Right-click menu for trip status changes and actions
 */
function TripContextMenu({
  trip,
  position,
  onStatusChange,
  onEdit,
  onDelete,
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
    { value: 'scheduled', label: 'Scheduled', icon: '📅', color: '#17a2b8' },
    { value: 'in_progress', label: 'In Progress', icon: '🚗', color: '#ffc107' },
    { value: 'completed', label: 'Completed', icon: '✓', color: '#28a745' },
    { value: 'cancelled', label: 'Cancelled', icon: '✗', color: '#dc3545' },
    { value: 'no_show', label: 'No Show', icon: '⚠', color: '#6c757d' },
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
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000,
        minWidth: '200px',
        fontSize: '13px',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--gray-200)',
        background: 'var(--gray-50)',
        fontWeight: 600,
        fontSize: '12px',
        color: 'var(--gray-700)'
      }}>
        {trip ? `Trip for ${trip.customer_name}` : 'No Trip Selected'}
      </div>

      {/* Status Options */}
      <div style={{ padding: '4px 0' }}>
        <div style={{
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--gray-600)',
          textTransform: 'uppercase'
        }}>
          Change Status
        </div>
        {statusOptions.map(option => (
          <div
            key={option.value}
            onClick={() => {
              if (!isDisabled) {
                onStatusChange(option.value);
                onClose();
              }
            }}
            style={{
              padding: '8px 12px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: trip?.status === option.value ? 'var(--gray-100)' : 'transparent',
              opacity: isDisabled ? 0.4 : 1,
              pointerEvents: isDisabled ? 'none' : 'auto'
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
            <span style={{ fontSize: '14px' }}>{option.icon}</span>
            <span style={{ flex: 1 }}>{option.label}</span>
            {trip?.status === option.value && <span style={{ color: option.color, fontSize: '16px' }}>●</span>}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--gray-200)', margin: '4px 0' }}></div>

      {/* Actions */}
      <div style={{ padding: '4px 0' }}>
        <div
          onClick={() => {
            if (!isDisabled) {
              onEdit();
              onClose();
            }
          }}
          style={{
            padding: '8px 12px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isDisabled ? 0.4 : 1,
            pointerEvents: isDisabled ? 'none' : 'auto'
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.background = 'var(--gray-100)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <span>✏️</span>
          <span>Edit Trip</span>
        </div>
        <div
          onClick={() => {
            if (!isDisabled && trip && confirm(`Delete trip for ${trip.customer_name}?`)) {
              onDelete();
              onClose();
            }
          }}
          style={{
            padding: '8px 12px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#dc3545',
            opacity: isDisabled ? 0.4 : 1,
            pointerEvents: isDisabled ? 'none' : 'auto'
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.background = '#fee';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <span>🗑️</span>
          <span>Delete Trip</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid var(--gray-200)',
        background: 'var(--gray-50)',
        fontSize: '10px',
        color: 'var(--gray-500)',
        textAlign: 'center'
      }}>
        {isDisabled ? 'No trip available - options disabled' : 'Right-click for options'}
      </div>
    </div>
  );
}

export default TripContextMenu;
