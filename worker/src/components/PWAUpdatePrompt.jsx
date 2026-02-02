import { useState, useEffect } from 'react';
import { DownloadIcon, XIcon, RefreshCwIcon } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Safely import PWA register hook only if available
  const [pwaHook, setPwaHook] = useState(null);

  useEffect(() => {
    const loadPWAHook = async () => {
      try {
        const { useRegisterSW } = await import('virtual:pwa-register/react');
        setPwaHook(() => useRegisterSW({
          onRegistered(r) {
            console.log('SW Registered: ' + r);
          },
          onRegisterError(error) {
            console.log('SW registration error', error);
          },
        }));
      } catch (error) {
        console.log('PWA not available in development mode');
        // PWA not available (development mode)
      }
    };

    loadPWAHook();
  }, []);

  const offlineReady = pwaHook?.offlineReady?.[0] || false;
  const setOfflineReady = pwaHook?.offlineReady?.[1] || (() => {});
  const needRefresh = pwaHook?.needRefresh?.[0] || false;
  const setNeedRefresh = pwaHook?.needRefresh?.[1] || (() => {});
  const updateServiceWorker = pwaHook?.updateServiceWorker || (() => Promise.resolve());

  useEffect(() => {
    if (needRefresh) {
      setUpdateAvailable(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateServiceWorker(true);
      setUpdateAvailable(false);
      setNeedRefresh(false);
      // Reload will happen automatically
    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    setNeedRefresh(false);
  };

  // Don't show if no update available or PWA not loaded
  if (!updateAvailable && !needRefresh) return null;
  if (!pwaHook) return null; // PWA not available

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96">
      <div className="bg-[#0a1628] border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-500/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <DownloadIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">App Update Available</h3>
            <p className="text-white/60 text-sm mb-3">
              A new version of WorkLink is ready to install with improvements and bug fixes.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? (
                  <>
                    <RefreshCwIcon className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <DownloadIcon className="h-4 w-4" />
                    Update Now
                  </>
                )}
              </button>
              <button
                onClick={handleDismiss}
                disabled={isUpdating}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            disabled={isUpdating}
            className="p-1 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAUpdatePrompt;