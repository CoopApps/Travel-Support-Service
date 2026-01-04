import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTenant } from '../../context/TenantContext';

/**
 * User Dropdown Component
 *
 * Displays user profile menu with options
 * Matches the legacy user-dropdown.js functionality
 */

interface MenuItem {
  icon: string;
  label: string;
  action: () => void;
  divider?: boolean;
  danger?: boolean;
}

function UserDropdown() {
  const { user, logout } = useAuthStore();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user initials
  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = user?.email?.split('@')[0] || user?.email || 'User';
  const initials = getUserInitials(displayName);
  const roleDisplay = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';

  // Menu items based on user role
  const getMenuItems = (): MenuItem[] => {
    return [
      {
        icon: 'user',
        label: 'My Profile',
        action: () => {
          setIsOpen(false);
          navigate('/profile');
        },
      },
      {
        icon: 'settings',
        label: 'System Settings',
        action: () => {
          setIsOpen(false);
          navigate('/settings');
        },
      },
      {
        icon: 'users',
        label: 'User Management',
        action: () => {
          setIsOpen(false);
          navigate('/admin/users');
        },
      },
      {
        icon: 'file-text',
        label: 'Audit Logs',
        action: () => {
          setIsOpen(false);
          navigate('/admin/audit-logs');
        },
      },
      {
        icon: 'log-out',
        label: 'Log Out',
        action: () => {
          if (confirm('Are you sure you want to log out?')) {
            logout();
            navigate('/login');
          }
        },
        danger: true,
        divider: true,
      },
    ];
  };

  const menuItems = getMenuItems();

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Icon SVG paths
  const getIcon = (iconName: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'user': (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </>
      ),
      'settings': (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2" />
        </>
      ),
      'users': (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),
      'file-text': (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </>
      ),
      'log-out': (
        <>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </>
      ),
      'chevron-down': <polyline points="6 9 12 15 18 9" />,
    };
    return icons[iconName] || null;
  };

  return (
    <div className="user-dropdown-container" ref={dropdownRef}>
      <button
        className="user-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-label="User menu"
      >
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <div className="user-name" title={displayName}>
            {displayName}
          </div>
          <div className="user-role">{roleDisplay}</div>
        </div>
        <svg className="dropdown-icon" viewBox="0 0 24 24" width="16" height="16">
          {getIcon('chevron-down')}
        </svg>
      </button>

      {isOpen && (
        <div className="user-dropdown-menu show">
          <div className="dropdown-header">
            <div className="dropdown-avatar">{initials}</div>
            <div>
              <div className="dropdown-user-name">{tenant?.company_name || 'Organization'}</div>
              <div className="dropdown-user-role">{roleDisplay}</div>
              <div className="dropdown-user-email">{user?.email || displayName}</div>
            </div>
          </div>

          {menuItems.map((item, index) => (
            <div key={index}>
              {item.divider && <div className="dropdown-divider"></div>}
              <button
                className={`dropdown-item${item.danger ? ' dropdown-item-danger' : ''}`}
                onClick={item.action}
              >
                <svg className="dropdown-item-icon" viewBox="0 0 24 24" width="18" height="18">
                  {getIcon(item.icon)}
                </svg>
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserDropdown;
