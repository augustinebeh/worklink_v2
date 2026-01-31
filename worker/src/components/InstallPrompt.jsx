/**
 * Install Prompt Component
 * Shows a custom "Add to Home Screen" banner for PWA installation
 */

import { useState, useEffect } from 'react';
import { XIcon, DownloadIcon, ShareIcon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { clsx } from 'clsx';
import { haptic } from '../hooks/useHaptic';

export default function InstallPrompt() {
  const { isDark } = useTheme();
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // Don't show if already installed

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if dismissed recently (within 7 days)
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
      const dismissedDate = new Date(parseInt(dismissed));
      const daysSinceDismissed = (Date.now() - dismissedDate) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after a delay so user has time to explore
      setTimeout(() => setShowPrompt(true), 30000); // 30 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show prompt after delay
    if (iOS && !standalone) {
      setTimeout(() => setShowPrompt(true), 30000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    haptic.medium();

    if (deferredPrompt) {
      // Android/Chrome - trigger native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        haptic.success();
      }
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    haptic.light();
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className={clsx(
      'fixed bottom-24 left-4 right-4 p-4 rounded-2xl border shadow-2xl z-50 animate-slide-up',
      isDark
        ? 'bg-dark-900 border-white/10'
        : 'bg-white border-slate-200'
    )}>
      <button
        onClick={handleDismiss}
        className={clsx(
          'absolute top-3 right-3 p-1 rounded-full',
          isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-slate-400 hover:bg-slate-100'
        )}
      >
        <XIcon className="h-5 w-5" />
      </button>

      <div className="flex items-start gap-4">
        {/* App Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-white">W</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
            Install WorkLink
          </h3>
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-dark-400' : 'text-slate-500')}>
            {isIOS
              ? 'Add to your home screen for the best experience'
              : 'Install our app for quick access'
            }
          </p>

          {isIOS ? (
            // iOS instructions
            <div className={clsx(
              'mt-3 p-3 rounded-xl text-sm',
              isDark ? 'bg-dark-800' : 'bg-slate-100'
            )}>
              <p className={isDark ? 'text-dark-300' : 'text-slate-600'}>
                Tap <ShareIcon className="h-4 w-4 inline mx-1" /> then <strong>"Add to Home Screen"</strong>
              </p>
            </div>
          ) : (
            // Android/Chrome install button
            <button
              onClick={handleInstall}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium text-sm"
            >
              <DownloadIcon className="h-4 w-4" />
              Install App
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
