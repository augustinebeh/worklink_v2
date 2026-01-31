/**
 * Keyboard Handling Hook
 * Handles virtual keyboard appearance on mobile devices
 */

import { useEffect, useState } from 'react';

export function useKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Use Visual Viewport API if available (modern browsers)
    if ('visualViewport' in window) {
      const viewport = window.visualViewport;

      const handleResize = () => {
        const heightDiff = window.innerHeight - viewport.height;
        const isOpen = heightDiff > 150; // Keyboard typically > 150px

        setIsKeyboardOpen(isOpen);
        setKeyboardHeight(isOpen ? heightDiff : 0);

        // Scroll focused element into view
        if (isOpen && document.activeElement) {
          setTimeout(() => {
            document.activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }, 100);
        }
      };

      viewport.addEventListener('resize', handleResize);
      return () => viewport.removeEventListener('resize', handleResize);
    }

    // Fallback for older browsers
    const handleFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setIsKeyboardOpen(true);
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleBlur = () => {
      setIsKeyboardOpen(false);
      setKeyboardHeight(0);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight };
}

// CSS class helper for keyboard-aware components
export function useKeyboardClass() {
  const { isKeyboardOpen } = useKeyboard();
  return isKeyboardOpen ? 'keyboard-open' : '';
}
