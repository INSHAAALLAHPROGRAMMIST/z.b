// Advanced data caching service with LRU cache and compression
class DataCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100; // Maximum number of cache entries
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.compressionThreshold = options.compressionThreshold || 1024; // 1KB
    this.enableCompression = options.enableCompression || false;
    
    this.cache = new Map();
    this.accessOrder = new Map(); // For LRU tracking
    this.timers = new Map(); // For TTL cleanup
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      compressionSaves: 0
    };
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }

  // Generate cache key
  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  // Get data from cache
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      return null;
    }
    
    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.metrics.misses++;
      return null;
    }
    
    // Update access order for LRU
    this.updateAccessOrder(key);
    this.metrics.hits++;
    
    // Decompress if needed
    const data = this.decompress(entry.data, entry.compressed);
    return data;
  }

  // Set data in cache
  set(key, data, ttl = this.defaultTTL) {
    // Compress data if it's large enough
    const { compressedData, isCompressed } = this.compress(data);
    
    const entry = {
      data: compressedData,
      compressed: isCompressed,
      timestamp: Date.now(),
      ttl,
      size: this.calculateSize(compressedData),
      accessCount: 1
    };
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }
    
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.setTTLTimer(key, ttl);
    
    this.metrics.sets++;
    
    if (isCompressed) {
      this.metrics.compressionSaves++;
    }
  }

  // Delete entry from cache
  delete(key) {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    
    // Clear TTL timer
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    
    if (deleted) {
      this.metrics.deletes++;
    }
    
    return deleted;
  }

  // Check if entry exists and is not expired
  has(key) {
    const entry = this.cache.get(key);
    return entry && !this.isExpired(entry);
  }

  // Clear all cache entries
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    this.resetMetrics();
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.calculateTotalSize()
    };
  }

  // Compress data if it's large enough
  compress(data) {
    if (!this.enableCompression) {
      return { compressedData: data, isCompressed: false };
    }
    
    const serialized = JSON.stringify(data);
    
    if (serialized.length < this.compressionThreshold) {
      return { compressedData: data, isCompressed: false };
    }
    
    try {
      // Simple compression using LZ-string or similar
      const compressed = this.simpleCompress(serialized);
      return { compressedData: compressed, isCompressed: true };
    } catch (error) {
      console.warn('Compression failed:', error);
      return { compressedData: data, isCompressed: false };
    }
  }

  // Decompress data
  decompress(data, isCompressed) {
    if (!isCompressed) {
      return data;
    }
    
    try {
      const decompressed = this.simpleDecompress(data);
      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return data;
    }
  }

  // Simple compression implementation (placeholder)
  simpleCompress(str) {
    // In a real implementation, use a library like lz-string
    return btoa(str);
  }

  // Simple decompression implementation (placeholder)
  simpleDecompress(compressed) {
    // In a real implementation, use a library like lz-string
    return atob(compressed);
  }

  // Check if entry is expired
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // Update access order for LRU
  updateAccessOrder(key) {
    this.accessOrder.delete(key);
    this.accessOrder.set(key, Date.now());
    
    // Update access count
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessCount++;
    }
  }

  // Evict least recently used entry
  evictLRU() {
    const lruKey = this.accessOrder.keys().next().value;
    if (lruKey) {
      this.delete(lruKey);
      this.metrics.evictions++;
    }
  }

  // Set TTL timer for automatic cleanup
  setTTLTimer(key, ttl) {
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    
    this.timers.set(key, timer);
  }

  // Calculate size of data
  calculateSize(data) {
    return JSON.stringify(data).length;
  }

  // Calculate total cache size
  calculateTotalSize() {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });
    return totalSize;
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      compressionSaves: 0
    };
  }

  // Destroy cache and cleanup
  destroy() {
    this.clear();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  // Preload data into cache
  async preload(key, dataLoader, ttl) {
    if (this.has(key)) {
      return this.get(key);
    }
    
    try {
      const data = await dataLoader();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error('Preload failed:', error);
      throw error;
    }
  }

  // Batch operations
  setMany(entries) {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  getMany(keys) {
    return keys.map(key => ({
      key,
      data: this.get(key),
      hit: this.has(key)
    }));
  }

  deleteMany(keys) {
    return keys.map(key => this.delete(key));
  }
}

// Create singleton instances for different data types
export const dashboardCache = new DataCache({
  maxSize: 50,
  defaultTTL: 2 * 60 * 1000, // 2 minutes for dashboard data
  enableCompression: true
});

export const inventoryCache = new DataCache({
  maxSize: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes for inventory data
  enableCompression: true
});

export const customerCache = new DataCache({
  maxSize: 100,
  defaultTTL: 5 * 60 * 1000, // 5 minutes for customer data
  enableCompression: false
});

export const analyticsCache = new DataCache({
  maxSize: 30,
  defaultTTL: 15 * 60 * 1000, // 15 minutes for analytics data
  enableCompression: true
});

// Cache manager for coordinating multiple caches
export class CacheManager {
  constructor() {
    this.caches = new Map();
    this.globalMetrics = {
      totalHits: 0,
      totalMisses: 0,
      totalSets: 0
    };
  }

  registerCache(name, cache) {
    this.caches.set(name, cache);
  }

  getCache(name) {
    return this.caches.get(name);
  }

  clearAll() {
    this.caches.forEach(cache => cache.clear());
  }

  getGlobalStats() {
    const stats = {};
    let totalHits = 0;
    let totalMisses = 0;
    let totalSize = 0;
    
    this.caches.forEach((cache, name) => {
      const cacheStats = cache.getStats();
      stats[name] = cacheStats;
      totalHits += cacheStats.hits;
      totalMisses += cacheStats.misses;
      totalSize += cacheStats.size;
    });
    
    const globalHitRate = totalHits + totalMisses > 0 
      ? (totalHits / (totalHits + totalMisses) * 100).toFixed(2)
      : 0;
    
    return {
      caches: stats,
      global: {
        totalHits,
        totalMisses,
        hitRate: `${globalHitRate}%`,
        totalCaches: this.caches.size,
        totalEntries: totalSize
      }
    };
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager();

// Register default caches
cacheManager.registerCache('dashboard', dashboardCache);
cacheManager.registerCache('inventory', inventoryCache);
cacheManager.registerCache('customer', customerCache);
cacheManager.registerCache('analytics', analyticsCache);

export default DataCache;