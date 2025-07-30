// Service Worker for Zamon Books
const CACHE_NAME = 'zamon-books-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Cache static assets
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    // Add critical CSS and JS files
];

// Cache API responses with smart caching strategy
const API_CACHE_PATTERNS = [
    /\/v1\/databases\/.*\/collections\/.*\/documents/,
    /cloudinary\.com/
];

// Cache duration settings
const CACHE_DURATIONS = {
    images: 7 * 24 * 60 * 60 * 1000, // 7 days
    api: 5 * 60 * 1000, // 5 minutes
    static: 30 * 24 * 60 * 60 * 1000 // 30 days
};

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Handle API requests
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
        event.respondWith(
            caches.open(DYNAMIC_CACHE).then(cache => {
                return cache.match(request).then(response => {
                    if (response) {
                        // Return cached version and update in background
                        fetch(request).then(fetchResponse => {
                            cache.put(request, fetchResponse.clone());
                        });
                        return response;
                    }
                    
                    // Fetch and cache
                    return fetch(request).then(fetchResponse => {
                        cache.put(request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
        );
        return;
    }
    
    // Handle static assets
    event.respondWith(
        caches.match(request).then(response => {
            return response || fetch(request);
        })
    );
});