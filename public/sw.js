// Service Worker for Zamon Books PWA
// Offline support, caching, background sync

const CACHE_NAME = 'zamon-books-v1';
const STATIC_CACHE = 'zamon-books-static-v1';
const DYNAMIC_CACHE = 'zamon-books-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/offline.html',
  '/manifest.json',
  'https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/favicon_maovuy.svg'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\.netlify\/functions\/api-books/,
  /\.netlify\/functions\/api-search/,
  /\.netlify\/functions\/sitemap/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return fetch(request)
            .then((response) => {
              // Cache successful API responses
              if (response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // Return cached version if network fails
              return cache.match(request);
            });
        })
    );
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache images and static assets
            if (request.destination === 'image' || 
                request.url.includes('.css') || 
                request.url.includes('.js')) {
              
              const responseToCache = response.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }

            return response;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'background-sync-cart') {
    event.waitUntil(syncCartData());
  }
  
  if (event.tag === 'background-sync-search') {
    event.waitUntil(syncSearchData());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Yangi kitoblar mavjud!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ko\'rish',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Yopish',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Zamon Books', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions
async function syncCartData() {
  try {
    // Sync offline cart data when online
    const cartData = await getStoredCartData();
    if (cartData.length > 0) {
      await syncWithServer(cartData);
      await clearStoredCartData();
    }
  } catch (error) {
    console.error('Cart sync failed:', error);
  }
}

async function syncSearchData() {
  try {
    // Sync offline search queries for analytics
    const searchData = await getStoredSearchData();
    if (searchData.length > 0) {
      await syncSearchWithServer(searchData);
      await clearStoredSearchData();
    }
  } catch (error) {
    console.error('Search sync failed:', error);
  }
}

async function getStoredCartData() {
  // Implementation for getting stored cart data
  return [];
}

async function syncWithServer(data) {
  // Implementation for syncing with server
  console.log('Syncing cart data:', data);
}

async function clearStoredCartData() {
  // Implementation for clearing stored data
  console.log('Cart data cleared');
}

async function getStoredSearchData() {
  // Implementation for getting stored search data
  return [];
}

async function syncSearchWithServer(data) {
  // Implementation for syncing search data
  console.log('Syncing search data:', data);
}

async function clearStoredSearchData() {
  // Implementation for clearing search data
  console.log('Search data cleared');
}