/**
 * Dynamic Status Bar Hook
 * Changes the status bar color based on the current page/theme
 */

import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Predefined colors for different contexts
export const STATUS_BAR_COLORS = {
  default: { dark: '#020617', light: '#f8fafc' },
  primary: { dark: '#1e1b4b', light: '#eef2ff' },
  success: { dark: '#052e16', light: '#f0fdf4' },
  warning: { dark: '#451a03', light: '#fffbeb' },
  error: { dark: '#450a0a', light: '#fef2f2' },
};

export function useStatusBar(color = 'default') {
  const { isDark } = useTheme();

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const colorValue = typeof color === 'string'
      ? STATUS_BAR_COLORS[color]?.[isDark ? 'dark' : 'light'] || STATUS_BAR_COLORS.default[isDark ? 'dark' : 'light']
      : color;

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colorValue);
    }

    // Cleanup - restore default on unmount
    return () => {
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', STATUS_BAR_COLORS.default[isDark ? 'dark' : 'light']);
      }
    };
  }, [color, isDark]);
}

// Imperative function for use outside React
export function setStatusBarColor(color) {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', color);
  }
}
