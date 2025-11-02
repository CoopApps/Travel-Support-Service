import { useState } from 'react';
import { Driver } from '../../types';

interface DashboardAccessDisplayProps {
  driver: Driver;
  onEnableLogin: () => void;
  onDisableLogin: () => void;
  onEditUsername: () => void;
  onResetPassword: () => void;
  onLoginHistory?: () => void;
}

function DashboardAccessDisplay({
  driver,
  onEnableLogin,
  onDisableLogin,
  onEditUsername,
  onResetPassword,
  onLoginHistory
}: DashboardAccessDisplayProps) {
  if (!driver.is_login_enabled) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--gray-500)', fontStyle: 'italic' }}>
          No Dashboard Access
        </div>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onEnableLogin}
          style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
        >
          Enable Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--success)' }}>
        Dashboard Access Enabled
      </div>
      <div style={{ fontSize: '11px', color: 'var(--gray-700)' }}>
        Username: {driver.username || 'N/A'}
      </div>
      {driver.last_login && (
        <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
          Last Login: {new Date(driver.last_login).toLocaleDateString('en-GB')}
        </div>
      )}
      {driver.user_created && (
        <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
          Account Created: {new Date(driver.user_created).toLocaleDateString('en-GB')}
        </div>
      )}
      <button
        className="btn btn-sm btn-secondary"
        onClick={onEditUsername}
        style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
      >
        Edit Username
      </button>
      <button
        className="btn btn-sm btn-secondary"
        onClick={onResetPassword}
        style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
      >
        Reset Password
      </button>
      <button
        className="btn btn-sm btn-secondary"
        onClick={onLoginHistory}
        style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
      >
        Login History
      </button>
      <button
        className="btn btn-sm btn-danger"
        onClick={onDisableLogin}
        style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
      >
        Disable Login
      </button>
    </div>
  );
}

export default DashboardAccessDisplay;
