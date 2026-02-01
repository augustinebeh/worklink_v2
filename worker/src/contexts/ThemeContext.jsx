import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Load saved theme from localStorage, default to dark
    try {
      const saved = localStorage.getItem('theme');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      // Update theme-color meta tag for iOS status bar (soft blue)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F5F7FA');
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
