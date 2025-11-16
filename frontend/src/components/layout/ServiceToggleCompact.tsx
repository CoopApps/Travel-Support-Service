import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServiceContext, ServiceType } from '../../contexts/ServiceContext';

/**
 * Compact Service Toggle - Header Icon Version
 * Matches NotificationBell and UserDropdown size/styling
 */

export function ServiceToggleCompact() {
  const navigate = useNavigate();
  const { activeService, setActiveService, bothEnabled } = useServiceContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (newService: ServiceType) => {
    if (newService === activeService) {
      setIsOpen(false);
      return;
    }

    setActiveService(newService);
    navigate('/dashboard');
    setIsOpen(false);
  };

  // Don't render if only one service is enabled
  if (!bothEnabled) {
    return null;
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="icon-button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Active: ${activeService === 'bus' ? 'Community Bus' : 'Community Transport'}`}
        aria-label="Switch service type"
      >
        {/* Show current service icon */}
        {activeService === 'bus' ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" style={{ minWidth: '240px' }}>
          <div className="notification-dropdown-header">
            <strong>Switch Service</strong>
          </div>

          <div className="notification-dropdown-content" style={{ padding: 0 }}>
            <button
              onClick={() => handleToggle('transport')}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: activeService === 'transport' ? 'var(--blue-50)' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                borderBottom: '1px solid var(--gray-200)'
              }}
              onMouseEnter={(e) => {
                if (activeService !== 'transport') {
                  e.currentTarget.style.background = 'var(--gray-50)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeService !== 'transport') {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: activeService === 'transport' ? 'var(--blue-600)' : 'var(--gray-600)' }}>
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{
                  fontWeight: activeService === 'transport' ? 600 : 400,
                  fontSize: '14px',
                  color: activeService === 'transport' ? 'var(--blue-600)' : 'var(--gray-900)'
                }}>
                  Community Transport
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                  Cars & Minibuses
                </div>
              </div>
              {activeService === 'transport' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </button>

            <button
              onClick={() => handleToggle('bus')}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: activeService === 'bus' ? 'var(--blue-50)' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (activeService !== 'bus') {
                  e.currentTarget.style.background = 'var(--gray-50)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeService !== 'bus') {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: activeService === 'bus' ? 'var(--blue-600)' : 'var(--gray-600)' }}>
                <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
              </svg>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{
                  fontWeight: activeService === 'bus' ? 600 : 400,
                  fontSize: '14px',
                  color: activeService === 'bus' ? 'var(--blue-600)' : 'var(--gray-900)'
                }}>
                  Community Bus (Section 22)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                  Fixed Routes & Schedules
                </div>
              </div>
              {activeService === 'bus' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
