import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA with force update to fix admin routing
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // First, unregister any existing service workers to clear old cache
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }

      // Register the updated service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Force fresh fetch of service worker
      });

      // Force immediate activation of new service worker
      if (registration.waiting) {
        registration.waiting.postMessage('skipWaiting');
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available, force it to take over
              newWorker.postMessage('skipWaiting');
            }
          });
        }
      });
    } catch (error) {
      console.log('Service worker registration failed:', error);
    }
  });
}
