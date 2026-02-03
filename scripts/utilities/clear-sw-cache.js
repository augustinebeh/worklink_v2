/**
 * Helper script to clear service worker caches - paste this in browser console
 * Use this if you need to manually clear the service worker cache for testing
 */

// Clear all service worker registrations and caches
async function clearServiceWorkerCache() {
  if ('serviceWorker' in navigator) {
    try {
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} service worker registrations`);

      for (const registration of registrations) {
        await registration.unregister();
        console.log('Unregistered service worker:', registration.scope);
      }

      // Clear all caches
      const cacheNames = await caches.keys();
      console.log(`Found ${cacheNames.length} caches:`, cacheNames);

      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('Deleted cache:', cacheName);
      }

      console.log('✅ All service workers and caches cleared!');
      console.log('🔄 Refresh the page to start fresh');
    } catch (error) {
      console.error('Error clearing service worker cache:', error);
    }
  } else {
    console.log('Service workers not supported');
  }
}

// Run the function
clearServiceWorkerCache();