import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, default to dark
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return 'dark'; // Dark theme is default
  });

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      // Update theme-color meta tag for iOS status bar
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#020617');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
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
