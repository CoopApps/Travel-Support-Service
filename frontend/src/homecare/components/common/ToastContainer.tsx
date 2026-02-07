import { useToast, Toast } from '../../context/ToastContext';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Toast Container Component
 * Displays toast notifications
 */

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: { bg: '#d1fae5', border: '#a7f3d0', text: '#065f46', icon: '#10b981' },
  error: { bg: '#fee2e2', border: '#fecaca', text: '#991b1b', icon: '#ef4444' },
  warning: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', icon: '#f59e0b' },
  info: { bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af', icon: '#3b82f6' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = icons[toast.type];
  const color = colors[toast.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        background: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <Icon size={20} color={color.icon} style={{ flexShrink: 0, marginTop: '1px' }} />
      <p style={{ flex: 1, margin: 0, color: color.text, fontSize: '14px' }}>
        {toast.message}
      </p>
      <button
        onClick={onRemove}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: color.text,
          opacity: 0.7,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          zIndex: 9999,
        }}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}
