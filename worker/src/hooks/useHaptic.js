/**
 * Haptic Feedback Hook
 * Provides native-like vibration feedback on user interactions
 */

export function useHaptic() {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  // Light tap - for buttons, toggles
  const light = () => {
    if (canVibrate) navigator.vibrate(10);
  };

  // Medium tap - for selections, confirmations
  const medium = () => {
    if (canVibrate) navigator.vibrate(20);
  };

  // Heavy tap - for important actions, errors
  const heavy = () => {
    if (canVibrate) navigator.vibrate(30);
  };

  // Success pattern - for completed actions
  const success = () => {
    if (canVibrate) navigator.vibrate([10, 50, 10]);
  };

  // Error pattern - for failed actions
  const error = () => {
    if (canVibrate) navigator.vibrate([30, 50, 30, 50, 30]);
  };

  // Warning pattern
  const warning = () => {
    if (canVibrate) navigator.vibrate([20, 40, 20]);
  };

  return { light, medium, heavy, success, error, warning, canVibrate };
}

// Standalone functions for use outside React components
export const haptic = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(20),
  heavy: () => navigator.vibrate?.(30),
  success: () => navigator.vibrate?.([10, 50, 10]),
  error: () => navigator.vibrate?.([30, 50, 30, 50, 30]),
  warning: () => navigator.vibrate?.([20, 40, 20]),
};
