import { useEffect, useRef } from 'react';

/**
 * Custom hook for modal keyboard navigation and accessibility
 * Provides ESC key handling, focus trapping, and focus management
 */
export function useModalKeyboard({
  isOpen,
  onClose,
  autoFocus = true,
  trapFocus = true
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the element that was focused before the modal opened
    previousActiveElement.current = document.activeElement;

    // Focus the modal container if autoFocus is enabled
    if (autoFocus && modalRef.current) {
      // Find the first focusable element in the modal
      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        modalRef.current.focus();
      }
    }

    // Cleanup function to restore focus
    return () => {
      if (previousActiveElement.current && document.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, autoFocus]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      // Handle ESC key
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab' && trapFocus && modalRef.current) {
        const focusableElements = getFocusableElements(modalRef.current);

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab - moving backwards
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab - moving forwards
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Attach keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, trapFocus]);

  return {
    modalRef,
    // Additional helper functions that can be used by modal components
    focusFirstElement: () => {
      if (modalRef.current) {
        const focusableElements = getFocusableElements(modalRef.current);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    },
    focusLastElement: () => {
      if (modalRef.current) {
        const focusableElements = getFocusableElements(modalRef.current);
        if (focusableElements.length > 0) {
          focusableElements[focusableElements.length - 1].focus();
        }
      }
    }
  };
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container) {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];

  const elements = container.querySelectorAll(focusableSelectors.join(', '));

  // Filter out elements that are not visible
  return Array.from(elements).filter(element => {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      !element.hasAttribute('aria-hidden')
    );
  });
}

export default useModalKeyboard;