import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CacheService from '../CacheService';

describe('CacheService', () => {
  let cacheService;

  beforeEach(() => {
    // Create a fresh instance for each test
    cacheService = new CacheService();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cacheService.clearAll();
  });

  describe('Memory Cache Operations', () => {
    it('should store and retrieve data from memory cache', async () => {
      const testData = { id: 1, name: 'Test Book' };
      
      await cacheService.set('books', 'test-key', testData, 5000);
      const retrieved = await cacheService.get('books', 'test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired memory cache', async () => {
      const testData = { id: 1, name: 'Test Book' };
      
      await cacheService.set('books', 'test-key', testData, 1000);
      
      // Fast forward time beyond TTL
      vi.advanceTimersByTime(2000);
      
      const retrieved = await cacheService.get('books', 'test-key');
      expect(retrieved).toBeNull();
    });

    it('should implement LRU eviction when cache is full', async () => {
      // Set max items to 2 for testing
      cacheService.maxMemoryItems = 2;
      
      await cacheService.set('books', 'key1', { id: 1 }, 5000);
      await cacheService.set('books', 'key2', { id: 2 }, 5000);
      await cacheService.set('books', 'key3', { id: 3 }, 5000);
      
      // key1 should be evicted (oldest)
      const key1Data = await cacheService.get('books', 'key1');
      const key3Data = await cacheService.get('books', 'key3');
      
      expect(key1Data).toBeNull();
      expect(key3Data).toEqual({ id: 3 });
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const key1 = cacheService.generateKey('books', 'test', { page: 1 });
      const key2 = cacheService.generateKey('books', 'test', { page: 1 });
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different parameters', () => {
      const key1 = cacheService.generateKey('books', 'test', { page: 1 });
      const key2 = cacheService.generateKey('books', 'test', { page: 2 });
      
      expect(key1).not.toBe(key2);
    });

    it('should handle empty parameters', () => {
      const key = cacheService.generateKey('books', 'test');
      expect(key).toBe('books:test');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific cache key', async () => {
      await cacheService.set('books', 'test-key', { id: 1 }, 5000);
      
      cacheService.invalidate('books', 'test-key');
      
      const retrieved = await cacheService.get('books', 'test-key');
      expect(retrieved).toBeNull();
    });

    it('should invalidate entire namespace', async () => {
      await cacheService.set('books', 'key1', { id: 1 }, 5000);
      await cacheService.set('books', 'key2', { id: 2 }, 5000);
      await cacheService.set('users', 'key1', { id: 3 }, 5000);
      
      cacheService.invalidate('books');
      
      const book1 = await cacheService.get('books', 'key1');
      const book2 = await cacheService.get('books', 'key2');
      const user1 = await cacheService.get('users', 'key1');
      
      expect(book1).toBeNull();
      expect(book2).toBeNull();
      expect(user1).toEqual({ id: 3 }); // Should not be affected
    });
  });

  describe('LocalStorage Integration', () => {
    it('should fallback to localStorage when memory cache misses', async () => {
      const testData = { id: 1, name: 'Test Book' };
      
      // Mock localStorage
      const mockItem = JSON.stringify({
        data: testData,
        expiry: Date.now() + 5000,
        created: Date.now()
      });
      
      localStorage.getItem.mockReturnValue(mockItem);
      
      const retrieved = await cacheService.get('books', 'test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const retrieved = await cacheService.get('books', 'test-key');
      expect(retrieved).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', async () => {
      await cacheService.set('books', 'key1', { id: 1 }, 5000);
      await cacheService.set('books', 'key2', { id: 2 }, 5000);
      
      const stats = cacheService.getStats();
      
      expect(stats.memoryItems).toBe(2);
      expect(stats.sessionItems).toBe(2);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up expired items', async () => {
      await cacheService.set('books', 'key1', { id: 1 }, 1000);
      await cacheService.set('books', 'key2', { id: 2 }, 5000);
      
      // Fast forward past first item's TTL
      vi.advanceTimersByTime(2000);
      
      cacheService.cleanup();
      
      const item1 = await cacheService.get('books', 'key1');
      const item2 = await cacheService.get('books', 'key2');
      
      expect(item1).toBeNull();
      expect(item2).toEqual({ id: 2 });
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors in localStorage', async () => {
      localStorage.getItem.mockReturnValue('invalid-json');
      
      const retrieved = await cacheService.get('books', 'test-key');
      expect(retrieved).toBeNull();
    });

    it('should handle storage quota exceeded errors', async () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      // Should not throw error
      await expect(
        cacheService.set('books', 'test-key', { id: 1 }, 5000)
      ).resolves.toBe(true);
    });
  });
});