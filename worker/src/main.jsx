import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA with smart update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      console.log('[Main] Registering service worker...');

      // Register the service worker with worker-specific scope
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Force fresh fetch of service worker
      });

      console.log('[Main] Service worker registered successfully');

      // Check for updates and handle gracefully
      if (registration.waiting) {
        console.log('[Main] New service worker waiting, activating...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        console.log('[Main] Service worker update found');
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[Main] New service worker installed, activating...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              // Optionally show user notification about update
              setTimeout(() => window.location.reload(), 1000);
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[Main] Message from SW:', event.data);
      });

    } catch (error) {
      console.log('[Main] Service worker registration failed:', error);
    }
  });
}
