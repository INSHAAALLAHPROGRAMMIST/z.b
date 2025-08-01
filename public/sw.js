// Service Worker for Zamon Books - Performance Optimized
const CACHE_VERSION = 'v3.1.0';
const STATIC_CACHE = `zamon-books-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `zamon-books-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `zamon-books-images-${CACHE_VERSION}`;

// Cache static assets (critical resources)
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
    '/robots.txt',
    // Critical CSS will be inlined, so no need to cache separately
];

// Smart caching patterns
const CACHE_PATTERNS = {
    api: [
        /cloud\.appwrite\.io\/v1\/databases/,
        /cloud\.appwrite\.io\/v1\/storage/
    ],
    images: [
        /res\.cloudinary\.com/,
        /cloudinary\.com/,
        /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i
    ],
    fonts: [
        /fonts\.googleapis\.com/,
        /fonts\.gstatic\.com/,
        /\.(woff|woff2|ttf|eot)$/i
    ],
    static: [
        /\.(css|js)$/i,
        /\/assets\//
    ]
};

// Cache strategies and durations
const CACHE_STRATEGIES = {
    images: {
        duration: 7 * 24 * 60 * 60 * 1000, // 7 days
        strategy: 'CacheFirst'
    },
    api: {
        duration: 5 * 60 * 1000, // 5 minutes
        strategy: 'NetworkFirst'
    },
    static: {
        duration: 30 * 24 * 60 * 60 * 1000, // 30 days
        strategy: 'CacheFirst'
    },
    fonts: {
        duration: 365 * 24 * 60 * 60 * 1000, // 1 year
        strategy: 'CacheFirst'
    }
};

// Install event - Precache critical resources
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker v3.1.0');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE).then(cache => {
                return cache.addAll(STATIC_ASSETS);
            }),
            // Prefetch critical API data
            prefetchCriticalData()
        ]).then(() => {
            console.log('[SW] Installation complete');
            return self.skipWaiting();
        })
    );
});

// Prefetch critical data for faster initial load
async function prefetchCriticalData() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        
        // Prefetch featured books (if API endpoint exists)
        const criticalRequests = [
            // Add critical API endpoints here when available
        ];
        
        await Promise.allSettled(
            criticalRequests.map(async (url) => {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response);
                    }
                } catch (error) {
                    console.log(`[SW] Failed to prefetch ${url}:`, error);
                }
            })
        );
    } catch (error) {
        console.log('[SW] Prefetch failed:', error);
    }
}

// Activate event - Clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker v3.1.0');
    
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then(cacheNames => {
                const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (!validCaches.includes(cacheName)) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] Activation complete');
        })
    );
});

// Fetch event - Smart caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip chrome-extension and other protocols
    if (!url.protocol.startsWith('http')) return;
    
    // Determine cache strategy based on request type
    const cacheType = getCacheType(request.url);
    
    switch (cacheType) {
        case 'images':
            event.respondWith(handleImageRequest(request));
            break;
        case 'api':
            event.respondWith(handleApiRequest(request));
            break;
        case 'static':
            event.respondWith(handleStaticRequest(request));
            break;
        case 'fonts':
            event.respondWith(handleFontRequest(request));
            break;
        default:
            event.respondWith(handleDefaultRequest(request));
    }
});

// Determine cache type based on URL patterns
function getCacheType(url) {
    if (CACHE_PATTERNS.images.some(pattern => pattern.test(url))) return 'images';
    if (CACHE_PATTERNS.api.some(pattern => pattern.test(url))) return 'api';
    if (CACHE_PATTERNS.fonts.some(pattern => pattern.test(url))) return 'fonts';
    if (CACHE_PATTERNS.static.some(pattern => pattern.test(url))) return 'static';
    return 'default';
}

// Handle image requests - Cache First strategy
async function handleImageRequest(request) {
    try {
        const cache = await caches.open(IMAGE_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse && !isExpired(cachedResponse, CACHE_STRATEGIES.images.duration)) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Image request failed:', error);
        return caches.match('/favicon.ico'); // Fallback image
    }
}

// Handle API requests - Network First strategy
async function handleApiRequest(request) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                await cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        } catch (networkError) {
            // Network failed, try cache
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
                console.log('[SW] Serving API from cache (offline)');
                return cachedResponse;
            }
            throw networkError;
        }
    } catch (error) {
        console.log('[SW] API request failed:', error);
        return new Response(JSON.stringify({ error: 'Network unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle static assets - Cache First strategy
async function handleStaticRequest(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Static request failed:', error);
        return caches.match('/index.html'); // Fallback to app shell
    }
}

// Handle font requests - Cache First with long expiry
async function handleFontRequest(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Font request failed:', error);
        return new Response('', { status: 404 });
    }
}

// Handle default requests
async function handleDefaultRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('Offline', { status: 503 });
    }
}

// Check if cached response is expired
function isExpired(response, duration) {
    const cachedDate = response.headers.get('sw-cached-date');
    if (!cachedDate) return true;
    
    const cacheTime = new Date(cachedDate).getTime();
    const now = Date.now();
    return (now - cacheTime) > duration;
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('[SW] Background sync triggered');
    // Implement background sync logic here
}