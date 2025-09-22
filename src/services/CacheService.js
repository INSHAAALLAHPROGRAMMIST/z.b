/**
 * Advanced Caching Service for Performance Optimization
 * Implements multiple caching strategies with TTL and memory management
 */

class CacheService {
    constructor() {
        this.memoryCache = new Map();
        this.sessionCache = new Map();
        this.localStoragePrefix = 'zb_cache_';
        this.maxMemoryItems = 100;
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes
        this.cleanupInterval = 60 * 1000; // 1 minute
        
        // Start cleanup interval
        this.startCleanup();
        
        // Bind methods
        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
        this.invalidate = this.invalidate.bind(this);
    }

    /**
     * Generate cache key with namespace
     */
    generateKey(namespace, key, params = {}) {
        const paramString = Object.keys(params).length > 0 
            ? JSON.stringify(params) 
            : '';
        return `${namespace}:${key}${paramString ? ':' + btoa(paramString) : ''}`;
    }

    /**
     * Get cached data with fallback chain
     */
    async get(namespace, key, params = {}) {
        const cacheKey = this.generateKey(namespace, key, params);
        
        // 1. Check memory cache first (fastest)
        const memoryData = this.getFromMemory(cacheKey);
        if (memoryData) {
            return memoryData;
        }

        // 2. Check session storage
        const sessionData = this.getFromSession(cacheKey);
        if (sessionData) {
            // Promote to memory cache
            this.setInMemory(cacheKey, sessionData, this.defaultTTL);
            return sessionData;
        }

        // 3. Check localStorage (persistent)
        const localData = this.getFromLocalStorage(cacheKey);
        if (localData) {
            // Promote to memory and session cache
            this.setInMemory(cacheKey, localData, this.defaultTTL);
            this.setInSession(cacheKey, localData, this.defaultTTL);
            return localData;
        }

        return null;
    }

    /**
     * Set data in all cache layers
     */
    async set(namespace, key, data, ttl = this.defaultTTL, params = {}) {
        const cacheKey = this.generateKey(namespace, key, params);
        
        // Set in all cache layers
        this.setInMemory(cacheKey, data, ttl);
        this.setInSession(cacheKey, data, ttl);
        this.setInLocalStorage(cacheKey, data, ttl);
        
        return true;
    }

    /**
     * Memory cache operations
     */
    getFromMemory(key) {
        const item = this.memoryCache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.memoryCache.delete(key);
            return null;
        }
        
        // Update access time for LRU
        item.lastAccess = Date.now();
        return item.data;
    }

    setInMemory(key, data, ttl) {
        // Implement LRU eviction if cache is full
        if (this.memoryCache.size >= this.maxMemoryItems) {
            this.evictLRU();
        }
        
        this.memoryCache.set(key, {
            data,
            expiry: Date.now() + ttl,
            lastAccess: Date.now()
        });
    }

    /**
     * Session storage operations
     */
    getFromSession(key) {
        try {
            const item = this.sessionCache.get(key);
            if (!item) return null;
            
            if (Date.now() > item.expiry) {
                this.sessionCache.delete(key);
                return null;
            }
            
            return item.data;
        } catch (error) {
            console.warn('Session cache error:', error);
            return null;
        }
    }

    setInSession(key, data, ttl) {
        try {
            this.sessionCache.set(key, {
                data,
                expiry: Date.now() + ttl
            });
        } catch (error) {
            console.warn('Session cache set error:', error);
        }
    }

    /**
     * LocalStorage operations with compression
     */
    getFromLocalStorage(key) {
        try {
            const item = localStorage.getItem(this.localStoragePrefix + key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            if (Date.now() > parsed.expiry) {
                localStorage.removeItem(this.localStoragePrefix + key);
                return null;
            }
            
            return parsed.data;
        } catch (error) {
            console.warn('LocalStorage cache error:', error);
            return null;
        }
    }

    setInLocalStorage(key, data, ttl) {
        try {
            const item = {
                data,
                expiry: Date.now() + ttl,
                created: Date.now()
            };
            
            localStorage.setItem(
                this.localStoragePrefix + key, 
                JSON.stringify(item)
            );
        } catch (error) {
            console.warn('LocalStorage cache set error:', error);
            // If storage is full, try to clean up old items
            this.cleanupLocalStorage();
        }
    }

    /**
     * Cache invalidation
     */
    invalidate(namespace, key = null, params = {}) {
        if (key) {
            // Invalidate specific key
            const cacheKey = this.generateKey(namespace, key, params);
            this.memoryCache.delete(cacheKey);
            this.sessionCache.delete(cacheKey);
            localStorage.removeItem(this.localStoragePrefix + cacheKey);
        } else {
            // Invalidate entire namespace
            this.invalidateNamespace(namespace);
        }
    }

    /**
     * Invalidate entire namespace
     */
    invalidateNamespace(namespace) {
        const prefix = namespace + ':';
        
        // Clear memory cache
        for (const key of this.memoryCache.keys()) {
            if (key.startsWith(prefix)) {
                this.memoryCache.delete(key);
            }
        }
        
        // Clear session cache
        for (const key of this.sessionCache.keys()) {
            if (key.startsWith(prefix)) {
                this.sessionCache.delete(key);
            }
        }
        
        // Clear localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.localStoragePrefix + prefix)) {
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * LRU eviction for memory cache
     */
    evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, item] of this.memoryCache.entries()) {
            if (item.lastAccess < oldestTime) {
                oldestTime = item.lastAccess;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.memoryCache.delete(oldestKey);
        }
    }

    /**
     * Cleanup expired items
     */
    cleanup() {
        const now = Date.now();
        
        // Cleanup memory cache
        for (const [key, item] of this.memoryCache.entries()) {
            if (now > item.expiry) {
                this.memoryCache.delete(key);
            }
        }
        
        // Cleanup session cache
        for (const [key, item] of this.sessionCache.entries()) {
            if (now > item.expiry) {
                this.sessionCache.delete(key);
            }
        }
    }

    /**
     * Cleanup localStorage
     */
    cleanupLocalStorage() {
        const now = Date.now();
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.localStoragePrefix)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (now > item.expiry) {
                        keysToRemove.push(key);
                    }
                } catch (error) {
                    // Invalid item, remove it
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    /**
     * Start cleanup interval
     */
    startCleanup() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
        
        // Cleanup localStorage less frequently
        setInterval(() => {
            this.cleanupLocalStorage();
        }, this.cleanupInterval * 5);
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            memoryItems: this.memoryCache.size,
            sessionItems: this.sessionCache.size,
            localStorageItems: Object.keys(localStorage)
                .filter(key => key.startsWith(this.localStoragePrefix)).length
        };
    }

    /**
     * Clear all caches
     */
    clearAll() {
        this.memoryCache.clear();
        this.sessionCache.clear();
        
        // Clear localStorage items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.localStoragePrefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;