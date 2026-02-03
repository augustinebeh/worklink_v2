/**
 * Service Worker for WorkLink PWA
 * Updated caching strategy to prevent stale content and admin route conflicts
 */

const CACHE_NAME = 'worklink-v22-scoped';
const STATIC_CACHE = 'worklink-static-v22-scoped';
const DYNAMIC_CACHE = 'worklink-dynamic-v22-scoped';

// Static assets to cache immediately (excluding root paths that conflict with admin)
const STATIC_ASSETS = [
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

// Routes to exclude from caching (admin, API, WebSocket)
const EXCLUDED_ROUTES = [
  '/admin',
  '/api',
  '/ws',
  '/health'
];

// Install event - cache static assets only
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v22...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete, skipping waiting');
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v21...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete, claiming clients');
        self.clients.claim();
      })
  );
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip excluded routes (admin, API, WebSocket)
  if (EXCLUDED_ROUTES.some(route => pathname.startsWith(route))) {
    console.log('[SW] Skipping cache for excluded route:', pathname);
    return;
  }

  // Skip cross-origin requests except for assets
  if (url.origin !== location.origin) {
    // Only cache cross-origin assets (fonts, images, etc.)
    if (event.request.destination === 'font' ||
        event.request.destination === 'image' ||
        event.request.destination === 'style') {
      event.respondWith(cacheFirst(event.request, DYNAMIC_CACHE));
    }
    return;
  }

  // HTML pages: Network-first to prevent stale content
  if (event.request.destination === 'document' || pathname === '/' || pathname.includes('.html')) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
  }
  // Static assets: Cache-first for performance
  else if (event.request.destination === 'script' ||
           event.request.destination === 'style' ||
           event.request.destination === 'font' ||
           event.request.destination === 'image' ||
           pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
  }
  // API routes: Network-first with short cache
  else if (pathname.startsWith('/api')) {
    // This shouldn't hit due to exclusion above, but just in case
    return;
  }
  // Everything else: Network-first
  else {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
  }
});

// Network-first strategy - prevents stale content
async function networkFirst(request, cacheName) {
  try {
    console.log('[SW] Network-first for:', request.url);
    const response = await fetch(request);

    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }

    // If it's an HTML request and no cache, return index.html for SPA routing
    // BUT exclude admin routes from SPA fallback
    if (request.destination === 'document') {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // Don't serve PWA index.html to admin routes
      if (!EXCLUDED_ROUTES.some(route => pathname.startsWith(route))) {
        const indexCache = await caches.match('/index.html');
        if (indexCache) {
          console.log('[SW] Serving index.html for SPA route:', request.url);
          return indexCache;
        }
      }
    }

    throw error;
  }
}

// Cache-first strategy - for static assets
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW] Cache hit for:', request.url);
    return cached;
  }

  try {
    console.log('[SW] Cache miss, fetching:', request.url);
    const response = await fetch(request);

    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed for static asset:', request.url);
    throw error;
  }
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: 'v22-scoped' });
  }
});