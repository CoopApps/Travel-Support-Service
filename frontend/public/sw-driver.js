// Service Worker for Driver Dashboard PWA
// Provides offline functionality and caching

const CACHE_NAME = 'driver-dashboard-v2';
const urlsToCache = [
  '/driver-dashboard',
  '/src/pages/DriverDashboard.tsx',
  '/src/pages/DriverDashboard.css',
  '/src/components/driver/DriverStats.tsx',
  '/src/components/driver/TripContextMenu.tsx',
  '/manifest-driver.json'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first for dynamic content, cache for offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // API requests - network first, cache fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before caching
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // HTML/JS/CSS files - network first to always get fresh content, cache fallback for offline
  const url = new URL(event.request.url);
  const isDynamicContent =
    event.request.destination === 'document' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.includes('/src/');

  if (isDynamicContent) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh content for offline use
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache (offline mode)
          return caches.match(event.request);
        })
    );
    return;
  }

  // Images and other static assets - cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Don't cache if not a success response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-trips') {
    event.waitUntil(
      // Sync trip status updates that were made offline
      syncTripUpdates()
    );
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icons/driver-icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'driver-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Transport Driver App', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/driver-dashboard')
  );
});

// Helper function to sync trip updates
async function syncTripUpdates() {
  try {
    // Get pending updates from IndexedDB or cache
    // Send them to the server
    console.log('[Service Worker] Syncing trip updates...');
    // Implementation would go here
    return Promise.resolve();
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    return Promise.reject(error);
  }
}
