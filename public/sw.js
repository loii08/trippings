const CACHE_NAME = 'trippings-v1';
const STATIC_CACHE = 'trippings-static-v1';
const DYNAMIC_CACHE = 'trippings-dynamic-v1';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external APIs
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    // For API calls, try network first, then cache
    if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/v1/')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Cache successful API responses for 5 minutes
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Fallback to cache if network fails
            return caches.match(request);
          })
      );
    }
    return;
  }

  // For static assets, use cache first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache
          return cachedResponse;
        }

        // Fetch from network and cache
        return fetch(request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response for caching
            const responseToCache = response.clone();
            
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If it's a navigation request, serve the offline page
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
            
            // For other requests, return a basic offline response
            return new Response('Offline - No cached data available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-trips') {
    event.waitUntil(syncTripsData());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Trippings',
    icon: '/assets/logo-192x192.png',
    badge: '/assets/logo-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/assets/logo-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Trippings', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sync trips data when online
async function syncTripsData() {
  try {
    console.log('Service Worker: Syncing trips data...');
    
    // Get all pending sync operations from IndexedDB
    const pendingOperations = await getPendingSyncOperations();
    
    for (const operation of pendingOperations) {
      try {
        await executeSyncOperation(operation);
        await removeSyncOperation(operation.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync operation:', error);
      }
    }
    
    console.log('Service Worker: Trips data sync completed');
  } catch (error) {
    console.error('Service Worker: Sync failed:', error);
  }
}

// Helper functions for sync operations (these would need to be implemented)
async function getPendingSyncOperations() {
  // This would interact with IndexedDB to get pending operations
  return [];
}

async function executeSyncOperation(operation) {
  // This would execute the pending operation against Supabase
  console.log('Executing sync operation:', operation);
}

async function removeSyncOperation(operationId) {
  // This would remove the operation from IndexedDB after successful sync
  console.log('Removing sync operation:', operationId);
}
