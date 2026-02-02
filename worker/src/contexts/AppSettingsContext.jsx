import { createContext, useContext, useState, useEffect } from 'react';

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    referralBonus: 25, // Default fallback
    loading: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/v1/referrals/settings');
      const data = await res.json();
      if (data.success) {
        setSettings({
          referralBonus: data.data.bonusAmount || 25,
          referralTiers: data.data.tiers || [],
          loading: false,
        });
      } else {
        setSettings(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Failed to fetch app settings:', error);
      setSettings(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshSettings = () => {
    fetchSettings();
  };

  return (
    <AppSettingsContext.Provider value={{ ...settings, refreshSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}
