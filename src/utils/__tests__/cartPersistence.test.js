import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CartPersistenceManager, 
  createPersistenceManager, 
  isLocalStorageAvailable, 
  getStorageInfo 
} from '../cartPersistence';

// Mock Firebase
vi.mock('../../firebaseConfig', () => ({
  db: {},
  COLLECTIONS: {
    CART: 'cart',
    WISHLIST: 'wishlist'
  }
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn()
  }))
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', { 
  value: localStorageMock,
  writable: true
});

// Mock screen object
Object.defineProperty(window, 'screen', {
  value: { width: 1920, height: 1080 },
  writable: true
});

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true
});

Object.defineProperty(navigator, 'platform', {
  value: 'Test Platform',
  writable: true
});

Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  writable: true
});

// Mock Intl
global.Intl = {
  DateTimeFormat: () => ({
    resolvedOptions: () => ({ timeZone: 'UTC' })
  })
};

describe('CartPersistenceManager', () => {
  const userId = 'test-user-123';
  let manager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new CartPersistenceManager(userId);
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct storage keys', () => {
      expect(manager.userId).toBe(userId);
      expect(manager.storageKey).toBe(`enhanced_cart_data_${userId}`);
      expect(manager.offlineChangesKey).toBe(`offline_cart_changes_${userId}`);
      expect(manager.syncStatusKey).toBe(`cart_sync_status_${userId}`);
    });
  });

  describe('saveToLocal', () => {
    it('should save cart data to localStorage', () => {
      const cartData = {
        cartItems: [{ id: '1', bookId: 'book-1', quantity: 2 }],
        savedItems: [],
        wishlistItems: []
      };

      const result = manager.saveToLocal(cartData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        manager.storageKey,
        expect.stringContaining('timestamp')
      );
    });

    it('should handle localStorage errors', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const cartData = { cartItems: [] };
      const result = manager.saveToLocal(cartData);

      expect(result).toBe(false);
    });
  });

  describe('loadFromLocal', () => {
    it('should load valid cart data from localStorage', () => {
      const savedData = {
        cartItems: [{ id: '1', bookId: 'book-1', quantity: 2 }],
        timestamp: Date.now() - 1000, // 1 second ago
        version: '1.0'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      const result = manager.loadFromLocal();

      expect(result).toEqual(savedData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(manager.storageKey);
    });

    it('should return null for non-existent data', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = manager.loadFromLocal();

      expect(result).toBeNull();
    });

    it('should clear old data and return null', () => {
      const oldData = {
        cartItems: [],
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
        version: '1.0'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldData));

      const result = manager.loadFromLocal();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(3); // clearLocal calls
    });

    it('should handle JSON parse errors', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = manager.loadFromLocal();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(3); // clearLocal calls
    });
  });

  describe('clearLocal', () => {
    it('should clear all local storage keys', () => {
      manager.clearLocal();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(manager.storageKey);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(manager.offlineChangesKey);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(manager.syncStatusKey);
    });
  });

  describe('offline changes', () => {
    it('should add offline change to queue', () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const change = {
        type: 'update_quantity',
        itemId: 'cart-1',
        data: { quantity: 3 }
      };

      manager.addOfflineChange(change);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        manager.offlineChangesKey,
        expect.stringContaining('update_quantity')
      );
    });

    it('should get offline changes queue', () => {
      const changes = [
        { type: 'update_quantity', itemId: 'cart-1', data: { quantity: 3 } }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(changes));

      const result = manager.getOfflineChanges();

      expect(result).toEqual(changes);
    });

    it('should return empty array for invalid changes data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = manager.getOfflineChanges();

      expect(result).toEqual([]);
    });

    it('should clear offline changes queue', () => {
      manager.clearOfflineChanges();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(manager.offlineChangesKey);
    });
  });

  describe('sync status', () => {
    it('should set sync status', () => {
      manager.setSyncStatus('syncing');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        manager.syncStatusKey,
        expect.stringContaining('syncing')
      );
    });

    it('should get sync status', () => {
      const statusData = {
        status: 'synced',
        timestamp: Date.now()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(statusData));

      const result = manager.getSyncStatus();

      expect(result).toEqual(statusData);
    });

    it('should return default status for invalid data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = manager.getSyncStatus();

      expect(result.status).toBe('unknown');
      expect(result.timestamp).toBeTypeOf('number');
    });
  });

  describe('syncOfflineChanges', () => {
    it('should sync offline changes to Firebase', async () => {
      const changes = [
        {
          type: 'update_quantity',
          itemId: 'cart-1',
          data: { quantity: 3 },
          timestamp: Date.now()
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(changes));

      const { writeBatch } = require('firebase/firestore');
      const mockBatch = {
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn()
      };
      writeBatch.mockReturnValue(mockBatch);

      const result = await manager.syncOfflineChanges();

      expect(result).toBe(true);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should handle sync errors', async () => {
      const changes = [
        {
          type: 'update_quantity',
          itemId: 'cart-1',
          data: { quantity: 3 }
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(changes));

      const { writeBatch } = require('firebase/firestore');
      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Sync failed'))
      };
      writeBatch.mockReturnValue(mockBatch);

      const result = await manager.syncOfflineChanges();

      expect(result).toBe(false);
    });

    it('should return true for empty changes queue', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const result = await manager.syncOfflineChanges();

      expect(result).toBe(true);
    });
  });

  describe('processOfflineChange', () => {
    let mockBatch;

    beforeEach(() => {
      mockBatch = {
        update: vi.fn(),
        delete: vi.fn()
      };
    });

    it('should process update_quantity change', async () => {
      const change = {
        type: 'update_quantity',
        itemId: 'cart-1',
        data: { quantity: 3 }
      };

      await manager.processOfflineChange(change, mockBatch);

      expect(mockBatch.update).toHaveBeenCalled();
    });

    it('should process remove_item change', async () => {
      const change = {
        type: 'remove_item',
        itemId: 'cart-1'
      };

      await manager.processOfflineChange(change, mockBatch);

      expect(mockBatch.delete).toHaveBeenCalled();
    });

    it('should process save_for_later change', async () => {
      const change = {
        type: 'save_for_later',
        itemId: 'cart-1'
      };

      await manager.processOfflineChange(change, mockBatch);

      expect(mockBatch.update).toHaveBeenCalled();
    });

    it('should process move_to_cart change', async () => {
      const change = {
        type: 'move_to_cart',
        itemId: 'cart-1'
      };

      await manager.processOfflineChange(change, mockBatch);

      expect(mockBatch.update).toHaveBeenCalled();
    });

    it('should handle unknown change types', async () => {
      const change = {
        type: 'unknown_type',
        itemId: 'cart-1'
      };

      // Should not throw error
      await expect(manager.processOfflineChange(change, mockBatch)).resolves.toBeUndefined();
    });
  });

  describe('cloud backup', () => {
    it('should backup cart to cloud storage', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockResolvedValue();

      const cartData = {
        cartItems: [{ id: '1', bookId: 'book-1', quantity: 2 }],
        savedItems: [],
        wishlistItems: []
      };

      const result = await manager.backupToCloud(cartData);

      expect(result).toBe(true);
      expect(setDoc).toHaveBeenCalled();
    });

    it('should handle backup errors', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockRejectedValue(new Error('Backup failed'));

      const cartData = { cartItems: [] };

      const result = await manager.backupToCloud(cartData);

      expect(result).toBe(false);
    });

    it('should return false for no userId', async () => {
      const managerWithoutUser = new CartPersistenceManager(null);
      const result = await managerWithoutUser.backupToCloud({});

      expect(result).toBe(false);
    });
  });

  describe('cloud restore', () => {
    it('should restore cart from cloud storage', async () => {
      const { getDoc } = require('firebase/firestore');
      const backupData = {
        cartItems: [{ id: '1', bookId: 'book-1', quantity: 2 }],
        savedItems: [],
        wishlistItems: [],
        metadata: {
          backupTimestamp: {
            toDate: () => new Date(Date.now() - 1000) // 1 second ago
          }
        }
      };

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => backupData
      });

      const result = await manager.restoreFromCloud();

      expect(result).toEqual({
        cartItems: backupData.cartItems,
        savedItems: backupData.savedItems,
        wishlistItems: backupData.wishlistItems,
        metadata: backupData.metadata
      });
    });

    it('should return null for non-existent backup', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await manager.restoreFromCloud();

      expect(result).toBeNull();
    });

    it('should return null for old backup', async () => {
      const { getDoc } = require('firebase/firestore');
      const oldBackupData = {
        cartItems: [],
        metadata: {
          backupTimestamp: {
            toDate: () => new Date(Date.now() - (31 * 24 * 60 * 60 * 1000)) // 31 days ago
          }
        }
      };

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => oldBackupData
      });

      const result = await manager.restoreFromCloud();

      expect(result).toBeNull();
    });
  });

  describe('mergeCartData', () => {
    it('should return cloud data when local is null', () => {
      const cloudData = { cartItems: [], timestamp: Date.now() };
      const result = manager.mergeCartData(null, cloudData);

      expect(result).toBe(cloudData);
    });

    it('should return local data when cloud is null', () => {
      const localData = { cartItems: [], timestamp: Date.now() };
      const result = manager.mergeCartData(localData, null);

      expect(result).toBe(localData);
    });

    it('should return null when both are null', () => {
      const result = manager.mergeCartData(null, null);

      expect(result).toBeNull();
    });

    it('should return more recent data', () => {
      const localTime = Date.now();
      const cloudTime = localTime - 1000; // 1 second earlier

      const localData = { cartItems: ['local'], timestamp: localTime };
      const cloudData = {
        cartItems: ['cloud'],
        metadata: {
          backupTimestamp: {
            toDate: () => new Date(cloudTime)
          }
        }
      };

      const result = manager.mergeCartData(localData, cloudData);

      expect(result).toBe(localData);
    });
  });

  describe('cleanup', () => {
    it('should clean up old local data', async () => {
      const oldData = {
        cartItems: [],
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days ago
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldData));

      await manager.cleanup();

      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(3); // clearLocal calls
    });

    it('should clean up old offline changes', async () => {
      const oldChanges = [
        {
          type: 'update_quantity',
          timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
        }
      ];
      const newChanges = [
        {
          type: 'remove_item',
          timestamp: Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago
        }
      ];

      localStorageMock.getItem
        .mockReturnValueOnce(null) // loadFromLocal
        .mockReturnValueOnce(JSON.stringify([...oldChanges, ...newChanges])); // getOfflineChanges

      await manager.cleanup();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        manager.offlineChangesKey,
        JSON.stringify(newChanges)
      );
    });
  });

  describe('getDeviceInfo', () => {
    it('should return device information', () => {
      const deviceInfo = manager.getDeviceInfo();

      expect(deviceInfo).toEqual({
        userAgent: 'Mozilla/5.0 (Test Browser)',
        platform: 'Test Platform',
        language: 'en-US',
        screenResolution: '1920x1080',
        timezone: 'UTC',
        timestamp: expect.any(Number)
      });
    });
  });
});

describe('utility functions', () => {
  describe('createPersistenceManager', () => {
    it('should create a new persistence manager', () => {
      const userId = 'test-user';
      const manager = createPersistenceManager(userId);

      expect(manager).toBeInstanceOf(CartPersistenceManager);
      expect(manager.userId).toBe(userId);
    });
  });

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      const result = isLocalStorageAvailable();
      expect(result).toBe(true);
    });

    it('should return false when localStorage throws error', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage not available');
      });

      const result = isLocalStorageAvailable();
      expect(result).toBe(false);

      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('getStorageInfo', () => {
    beforeEach(() => {
      // Mock localStorage properties
      Object.defineProperty(localStorageMock, 'hasOwnProperty', {
        value: vi.fn().mockReturnValue(true),
        writable: true
      });

      // Mock localStorage iteration
      Object.defineProperty(localStorageMock, 'enhanced_cart_data_user1', {
        value: 'cart data',
        enumerable: true
      });
      Object.defineProperty(localStorageMock, 'other_data', {
        value: 'other data',
        enumerable: true
      });
    });

    it('should return storage information', () => {
      const result = getStorageInfo();

      expect(result.available).toBe(true);
      expect(result).toHaveProperty('totalSize');
      expect(result).toHaveProperty('cartSize');
      expect(result).toHaveProperty('totalSizeKB');
      expect(result).toHaveProperty('cartSizeKB');
    });

    it('should handle localStorage errors', () => {
      localStorageMock.hasOwnProperty.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = getStorageInfo();

      expect(result.available).toBe(true);
      expect(result.error).toBe('Storage error');
    });
  });
});