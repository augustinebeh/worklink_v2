import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

// Color theme definitions
export const COLOR_THEMES = {
  default: {
    name: 'Default',
    description: 'Classic dark blue',
    primary: '#10b981', // emerald
    accent: '#06b6d4', // cyan
    bg: '#020817',
    card: '#0a1628',
    preview: 'from-slate-900 to-slate-800',
  },
  midnight: {
    name: 'Midnight',
    description: 'Deep purple night',
    primary: '#8b5cf6', // violet
    accent: '#a855f7', // purple
    bg: '#0f0720',
    card: '#1a0d30',
    preview: 'from-violet-950 to-purple-950',
  },
  ocean: {
    name: 'Ocean',
    description: 'Deep sea blue',
    primary: '#06b6d4', // cyan
    accent: '#0ea5e9', // sky
    bg: '#021a27',
    card: '#082f41',
    preview: 'from-cyan-950 to-sky-950',
  },
  forest: {
    name: 'Forest',
    description: 'Natural green',
    primary: '#22c55e', // green
    accent: '#10b981', // emerald
    bg: '#031a09',
    card: '#0a2c14',
    preview: 'from-green-950 to-emerald-950',
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm orange glow',
    primary: '#f97316', // orange
    accent: '#ef4444', // red
    bg: '#1a0a02',
    card: '#2c1508',
    preview: 'from-orange-950 to-red-950',
  },
  purple: {
    name: 'Royal Purple',
    description: 'Elegant purple',
    primary: '#d946ef', // fuchsia
    accent: '#ec4899', // pink
    bg: '#170520',
    card: '#280d35',
    preview: 'from-fuchsia-950 to-pink-950',
  },
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    // Load saved mode from localStorage, default to dark
    try {
      const saved = localStorage.getItem('theme');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [colorTheme, setColorTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('colorTheme');
      return saved && COLOR_THEMES[saved] ? saved : 'default';
    } catch {
      return 'default';
    }
  });

  // Apply mode (dark/light)
  useEffect(() => {
    const root = document.documentElement;

    if (mode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F5F7FA');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      const themeData = COLOR_THEMES[colorTheme] || COLOR_THEMES.default;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeData.bg);
    }

    localStorage.setItem('theme', mode);
  }, [mode, colorTheme]);

  // Apply color theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const themeData = COLOR_THEMES[colorTheme] || COLOR_THEMES.default;

    root.style.setProperty('--theme-primary', themeData.primary);
    root.style.setProperty('--theme-accent', themeData.accent);
    root.style.setProperty('--theme-bg', themeData.bg);
    root.style.setProperty('--theme-card', themeData.card);

    // Also apply as Tailwind-compatible classes via data attribute
    root.setAttribute('data-color-theme', colorTheme);

    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const toggleMode = () => {
    setMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = mode === 'dark';

  // Sync color theme from server when user data changes
  const syncThemeFromServer = async (userId) => {
    try {
      const res = await fetch(`/api/v1/gamification/theme/${userId}`);
      const data = await res.json();
      if (data.success && data.data.theme && COLOR_THEMES[data.data.theme]) {
        setColorTheme(data.data.theme);
      }
    } catch (error) {
      console.error('Failed to sync theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{
      // Mode (dark/light)
      mode,
      setMode,
      toggleMode,
      isDark,
      // Color theme
      colorTheme,
      setColorTheme,
      colorThemes: COLOR_THEMES,
      syncThemeFromServer,
      // Legacy compatibility
      theme: mode,
      setTheme: setMode,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
