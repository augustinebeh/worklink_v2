/**
 * Haptic Feedback Hook & Utility
 * Provides native-like vibration feedback on user interactions
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

// Core haptic functions
const vibrate = (pattern) => canVibrate && navigator.vibrate(pattern);

// Standalone haptic object for use outside React components
export const haptic = {
  light: () => vibrate(10),
  medium: () => vibrate(20),
  heavy: () => vibrate(30),
  success: () => vibrate([10, 50, 10]),
  error: () => vibrate([30, 50, 30, 50, 30]),
  warning: () => vibrate([20, 40, 20]),
};

// React hook that returns the same haptic methods
export function useHaptic() {
  return { ...haptic, canVibrate };
}
