/**
 * Service Worker for WorkLink PWA
 * Provides offline support and caching
 */

const CACHE_NAME = 'worklink-v20-scoped';
const STATIC_CACHE = 'worklink-static-v20-scoped';
const DYNAMIC_CACHE = 'worklink-dynamic-v20-scoped';

// Static assets to cache immediately (versioned for cache-busting)
// Only cache worker app specific assets, avoid root paths that might conflict with admin
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png?v=2',
  '/favicon-16x16.png?v=2',
  '/favicon-32x32.png?v=2',
  '/favicon-48x48.png?v=2',
  '/favicon-64x64.png?v=2',
  '/apple-touch-icon.png?v=2',
  '/icon-72x72.png?v=2',
  '/icon-96x96.png?v=2',
  '/icon-128x128.png?v=2',
  '/icon-144x144.png?v=2',
  '/icon-152x152.png?v=2',
  '/icon-192x192.png?v=2',
  '/icon-256x256.png?v=2',
  '/icon-384x384.png?v=2',
  '/icon-512x512.png?v=2',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/v1/jobs',
  '/api/v1/gamification',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clear ALL old caches aggressively
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating - clearing all old caches...');
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        // Delete ALL caches that don't match current version
        return Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        // Force refresh all cached static assets
        return caches.open(STATIC_CACHE).then((cache) => {
          return Promise.all(
            STATIC_ASSETS.map((url) => {
              return fetch(url, { cache: 'reload' }).then((response) => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              }).catch(() => {});
            })
          );
        });
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // CRITICAL: Skip admin routes entirely - let them pass through
  if (url.pathname.startsWith('/admin/') || url.pathname === '/admin') {
    return;
  }

  // API requests - Network first, then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - Cache first, then network
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const url = new URL(request.url);

  // Double-check: never cache admin routes
  if (url.pathname.startsWith('/admin/') || url.pathname === '/admin') {
    return fetch(request);
  }

  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page if available, but only for worker routes
    if (!url.pathname.startsWith('/admin/')) {
      const offlinePage = await caches.match('/');
      if (offlinePage) return offlinePage;
    }
    throw error;
  }
}

// Network-first strategy (for API calls)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return a JSON error response for API failures
    return new Response(
      JSON.stringify({ success: false, error: 'You are offline', offline: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification',
    icon: '/apple-touch-icon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'WorkLink', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
