import React from 'react';
import { ViewMode } from '../../types/messages.types';

interface MessageFiltersProps {
  viewMode: ViewMode;
  inboxCount: number;
  onViewModeChange: (mode: ViewMode) => void;
  onNewMessageClick: () => void;
  showMessageForm: boolean;
}

export const MessageFilters: React.FC<MessageFiltersProps> = ({
  viewMode,
  inboxCount,
  onViewModeChange,
  onNewMessageClick,
  showMessageForm,
}) => {
  const tabStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
    color: isActive ? 'var(--primary)' : 'var(--gray-600)',
    fontWeight: isActive ? 600 : 400,
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <>
      {/* Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid var(--gray-200)',
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Messages</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--gray-600)' }}>
            Universal messaging system - In-App, Email & SMS
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={onNewMessageClick}
        >
          {showMessageForm ? 'Cancel' : 'New Message'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '1rem 1.5rem 0',
        overflowX: 'auto',
        borderBottom: '1px solid var(--gray-200)'
      }}>
        <button
          onClick={() => onViewModeChange('all')}
          style={tabStyle(viewMode === 'all')}
        >
          All Messages
        </button>
        <button
          onClick={() => onViewModeChange('inbox')}
          style={tabStyle(viewMode === 'inbox')}
        >
          Inbox ({inboxCount})
        </button>
        <button
          onClick={() => onViewModeChange('drafts')}
          style={tabStyle(viewMode === 'drafts')}
        >
          Drafts
        </button>
        <button
          onClick={() => onViewModeChange('scheduled')}
          style={tabStyle(viewMode === 'scheduled')}
        >
          Scheduled
        </button>
        <button
          onClick={() => onViewModeChange('sent')}
          style={tabStyle(viewMode === 'sent')}
        >
          Sent
        </button>
      </div>
    </>
  );
};

export default MessageFilters;
