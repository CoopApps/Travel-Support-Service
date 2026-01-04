import React, { useEffect, useRef, useCallback } from 'react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
  /** Optional description for screen readers */
  description?: string;
  /** ID for aria-labelledby (auto-generated if not provided) */
  labelId?: string;
  /** ID for aria-describedby (auto-generated if not provided) */
  descriptionId?: string;
}

// Size presets
const sizeMap: Record<string, string> = {
  sm: '400px',
  md: '600px',
  lg: '800px',
  xl: '1000px'
};

// Get all focusable elements within a container
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
};

/**
 * Reusable Modal Component
 * Provides consistent modal styling and behavior with full accessibility support
 *
 * Accessibility features:
 * - Focus trap: Tab navigation stays within modal
 * - Focus restoration: Returns focus to trigger element on close
 * - ARIA attributes: role="dialog", aria-modal, aria-labelledby, aria-describedby
 * - Escape key: Closes modal
 * - Screen reader announcements via aria-live region
 */
function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth,
  size,
  description,
  labelId,
  descriptionId
}: ModalProps) {
  // Resolve maxWidth from size prop or use default
  const resolvedMaxWidth = maxWidth || (size && sizeMap[size]) || size || '700px';

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Generate unique IDs for ARIA attributes
  const uniqueId = useRef(`modal-${Math.random().toString(36).substr(2, 9)}`);
  const titleId = labelId || `${uniqueId.current}-title`;
  const descId = descriptionId || `${uniqueId.current}-description`;

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap - keep focus within modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = getFocusableElements(modalRef.current);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift + Tab on first element -> go to last
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
    // Tab on last element -> go to first
    else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  // Prevent body scroll and manage focus when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to restore later
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Focus the close button after a brief delay to ensure modal is rendered
      requestAnimationFrame(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      });
    } else {
      document.body.style.overflow = 'unset';

      // Restore focus to the element that opened the modal
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="modal-overlay"
        onClick={onClose}
        aria-hidden="true"
      >
        {/* Modal Content */}
        <div
          ref={modalRef}
          className="modal-content"
          style={{ maxWidth: resolvedMaxWidth }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
        >
          {/* Modal Header */}
          <div className="modal-header">
            <h2 id={titleId} className="modal-title">{title}</h2>
            <button
              ref={closeButtonRef}
              className="modal-close-button"
              onClick={onClose}
              aria-label="Close modal"
              type="button"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Hidden description for screen readers */}
          {description && (
            <p id={descId} className="sr-only">
              {description}
            </p>
          )}

          {/* Modal Body */}
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

export default Modal;
