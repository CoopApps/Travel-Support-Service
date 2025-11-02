import React from 'react';

/**
 * TaskCard Component
 *
 * Displays an actionable task/alert with count and optional items list
 * Used in the main dashboard to show pending work items
 */

interface TaskCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  items?: any[];
  onViewAll?: () => void;
  renderItem?: (item: any, index: number) => React.ReactNode;
  priority?: 'normal' | 'warning' | 'critical';
  emptyMessage?: string;
}

function TaskCard({
  title,
  count,
  icon,
  color,
  items = [],
  onViewAll,
  renderItem,
  priority = 'normal',
  emptyMessage = 'No items',
}: TaskCardProps) {
  const priorityStyles = {
    normal: {
      borderColor: '#d1d5db',
      bgColor: '#f9fafb',
      badgeColor: '#6b7280',
    },
    warning: {
      borderColor: '#fbbf24',
      bgColor: '#fffbeb',
      badgeColor: '#d97706',
    },
    critical: {
      borderColor: '#ef4444',
      bgColor: '#fef2f2',
      badgeColor: '#dc2626',
    },
  };

  const styles = priorityStyles[priority];

  return (
    <div
      className="card"
      style={{
        padding: '1rem',
        borderLeft: `3px solid ${styles.borderColor}`,
        background: count > 0 ? styles.bgColor : 'white',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ color, width: '18px', height: '18px', display: 'flex', alignItems: 'center' }}>
            {icon}
          </div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--gray-900)' }}>
            {title}
          </h3>
        </div>
        <div
          style={{
            background: styles.badgeColor,
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            minWidth: '24px',
            textAlign: 'center',
          }}
        >
          {count}
        </div>
      </div>

      {/* Content */}
      {count === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--gray-500)', fontStyle: 'italic' }}>
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Items Preview */}
          {renderItem && items && items.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              {items.slice(0, 3).map((item, index) => (
                <div key={index} style={{ marginBottom: index < 2 ? '0.5rem' : 0 }}>
                  {renderItem(item, index)}
                </div>
              ))}
            </div>
          )}

          {/* View All Button */}
          {onViewAll && count > 0 && (
            <button
              onClick={onViewAll}
              style={{
                width: '100%',
                padding: '0.4rem',
                fontSize: '11px',
                fontWeight: 600,
                color,
                background: 'white',
                border: `1px solid ${color}`,
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = color;
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = color;
              }}
            >
              View All {count > 3 ? `(${count - 3} more)` : ''}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default TaskCard;
