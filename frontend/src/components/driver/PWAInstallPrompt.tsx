import { useState, useEffect } from 'react';

interface PWAInstallPromptProps {
  onInstall?: () => void;
}

/**
 * PWA Install Prompt
 *
 * Shows a banner prompting drivers to install the app on their device
 * Handles the browser's install prompt API
 */
function PWAInstallPrompt({ onInstall }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      if (onInstall) onInstall();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    await deferredPrompt.userChoice;

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDaysInMs) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '1rem',
      right: '1rem',
      background: 'white',
      border: '2px solid var(--primary)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '1rem',
      zIndex: 9999,
      maxWidth: '500px',
      margin: '0 auto',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
        {/* App Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          background: 'var(--primary)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>
            Install Driver App
          </div>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
            Add to your home screen for quick access and offline features
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleInstallClick}
              style={{
                flex: 1,
                padding: '0.625rem 1rem',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-dark)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--primary)';
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'var(--primary-dark)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'var(--primary)';
              }}
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              style={{
                padding: '0.625rem 1rem',
                background: 'transparent',
                color: 'var(--gray-600)',
                border: '1px solid var(--gray-300)',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--gray-100)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'var(--gray-100)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Later
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          style={{
            width: '24px',
            height: '24px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gray-500)',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--gray-900)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--gray-500)';
          }}
          onFocus={(e) => {
            e.currentTarget.style.color = 'var(--gray-900)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.color = 'var(--gray-500)';
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
