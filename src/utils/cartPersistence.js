// Cart persistence utilities for offline support and cross-device sync

import { db, COLLECTIONS } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

// Local storage keys
const CART_STORAGE_KEY = 'enhanced_cart_data';
const OFFLINE_CHANGES_KEY = 'offline_cart_changes';
const SYNC_STATUS_KEY = 'cart_sync_status';

/**
 * Cart persistence manager
 */
export class CartPersistenceManager {
  constructor(userId) {
    this.userId = userId;
    this.storageKey = `${CART_STORAGE_KEY}_${userId}`;
    this.offlineChangesKey = `${OFFLINE_CHANGES_KEY}_${userId}`;
    this.syncStatusKey = `${SYNC_STATUS_KEY}_${userId}`;
  }

  /**
   * Save cart data to localStorage
   */
  saveToLocal(cartData) {
    try {
      const dataToSave = {
        ...cartData,
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
      return true;
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
      return false;
    }
  }

  /**
   * Load cart data from localStorage
   */
  loadFromLocal() {
    try {
      const savedData = localStorage.getItem(this.storageKey);
      if (!savedData) return null;

      const parsedData = JSON.parse(savedData);
      
      // Check if data is not too old (7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      if (Date.now() - parsedData.timestamp > maxAge) {
        this.clearLocal();
        return null;
      }

      return parsedData;
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      this.clearLocal();
      return null;
    }
  }

  /**
   * Clear local cart data
   */
  clearLocal() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.offlineChangesKey);
      localStorage.removeItem(this.syncStatusKey);
    } catch (error) {
      console.error('Error clearing local cart data:', error);
    }
  }

  /**
   * Add offline change to queue
   */
  addOfflineChange(change) {
    try {
      const changes = this.getOfflineChanges();
      changes.push({
        ...change,
        timestamp: Date.now(),
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      localStorage.setItem(this.offlineChangesKey, JSON.stringify(changes));
      this.setSyncStatus('pending');
    } catch (error) {
      console.error('Error adding offline change:', error);
    }
  }

  /**
   * Get offline changes queue
   */
  getOfflineChanges() {
    try {
      const changes = localStorage.getItem(this.offlineChangesKey);
      return changes ? JSON.parse(changes) : [];
    } catch (error) {
      console.error('Error getting offline changes:', error);
      return [];
    }
  }

  /**
   * Clear offline changes queue
   */
  clearOfflineChanges() {
    try {
      localStorage.removeItem(this.offlineChangesKey);
      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error clearing offline changes:', error);
    }
  }

  /**
   * Set sync status
   */
  setSyncStatus(status) {
    try {
      localStorage.setItem(this.syncStatusKey, JSON.stringify({
        status,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error setting sync status:', error);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    try {
      const statusData = localStorage.getItem(this.syncStatusKey);
      return statusData ? JSON.parse(statusData) : { status: 'synced', timestamp: Date.now() };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { status: 'unknown', timestamp: Date.now() };
    }
  }

  /**
   * Sync offline changes to Firebase
   */
  async syncOfflineChanges() {
    if (!this.userId) return false;

    try {
      this.setSyncStatus('syncing');
      const changes = this.getOfflineChanges();
      
      if (changes.length === 0) {
        this.setSyncStatus('synced');
        return true;
      }

      const batch = writeBatch(db);
      let processedChanges = 0;

      for (const change of changes) {
        try {
          await this.processOfflineChange(change, batch);
          processedChanges++;
        } catch (error) {
          console.error('Error processing offline change:', error);
          // Continue with other changes
        }
      }

      if (processedChanges > 0) {
        await batch.commit();
      }

      this.clearOfflineChanges();
      return true;

    } catch (error) {
      console.error('Error syncing offline changes:', error);
      this.setSyncStatus('error');
      return false;
    }
  }

  /**
   * Process individual offline change
   */
  async processOfflineChange(change, batch) {
    const { type, itemId, data } = change;

    switch (type) {
      case 'update_quantity':
        if (itemId && data.quantity) {
          const docRef = doc(db, COLLECTIONS.CART, itemId);
          batch.update(docRef, {
            quantity: data.quantity,
            updatedAt: serverTimestamp()
          });
        }
        break;

      case 'remove_item':
        if (itemId) {
          const docRef = doc(db, COLLECTIONS.CART, itemId);
          batch.delete(docRef);
        }
        break;

      case 'save_for_later':
        if (itemId) {
          const docRef = doc(db, COLLECTIONS.CART, itemId);
          batch.update(docRef, {
            savedForLater: true,
            updatedAt: serverTimestamp()
          });
        }
        break;

      case 'move_to_cart':
        if (itemId) {
          const docRef = doc(db, COLLECTIONS.CART, itemId);
          batch.update(docRef, {
            savedForLater: false,
            updatedAt: serverTimestamp()
          });
        }
        break;

      case 'update_notes':
        if (itemId && data.notes !== undefined) {
          const docRef = doc(db, COLLECTIONS.CART, itemId);
          batch.update(docRef, {
            notes: data.notes,
            updatedAt: serverTimestamp()
          });
        }
        break;

      case 'update_priority':
        if (itemId && data.priority) {
          const docRef = doc(db, COLLECTIONS.CART, itemId);
          batch.update(docRef, {
            priority: data.priority,
            updatedAt: serverTimestamp()
          });
        }
        break;

      default:
        console.warn('Unknown offline change type:', type);
    }
  }

  /**
   * Backup cart to cloud storage
   */
  async backupToCloud(cartData) {
    if (!this.userId) return false;

    try {
      const backupData = {
        userId: this.userId,
        cartItems: cartData.cartItems || [],
        savedItems: cartData.savedItems || [],
        wishlistItems: cartData.wishlistItems || [],
        metadata: {
          deviceInfo: this.getDeviceInfo(),
          backupTimestamp: serverTimestamp(),
          version: '1.0'
        }
      };

      const docRef = doc(db, 'cart_backups', this.userId);
      await setDoc(docRef, backupData, { merge: true });

      return true;
    } catch (error) {
      console.error('Error backing up cart to cloud:', error);
      return false;
    }
  }

  /**
   * Restore cart from cloud storage
   */
  async restoreFromCloud() {
    if (!this.userId) return null;

    try {
      const docRef = doc(db, 'cart_backups', this.userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const backupData = docSnap.data();
      
      // Check if backup is not too old (30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      const backupTime = backupData.metadata?.backupTimestamp?.toDate?.() || new Date(0);
      
      if (Date.now() - backupTime.getTime() > maxAge) {
        return null;
      }

      return {
        cartItems: backupData.cartItems || [],
        savedItems: backupData.savedItems || [],
        wishlistItems: backupData.wishlistItems || [],
        metadata: backupData.metadata
      };

    } catch (error) {
      console.error('Error restoring cart from cloud:', error);
      return null;
    }
  }

  /**
   * Get device information for backup metadata
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: Date.now()
    };
  }

  /**
   * Merge cart data from different sources
   */
  mergeCartData(localData, cloudData) {
    if (!localData && !cloudData) return null;
    if (!localData) return cloudData;
    if (!cloudData) return localData;

    // Use the most recent data based on timestamp
    const localTime = localData.timestamp || 0;
    const cloudTime = cloudData.metadata?.backupTimestamp?.toDate?.()?.getTime() || 0;

    if (localTime > cloudTime) {
      return localData;
    } else {
      return {
        cartItems: cloudData.cartItems || [],
        savedItems: cloudData.savedItems || [],
        wishlistItems: cloudData.wishlistItems || [],
        timestamp: cloudTime
      };
    }
  }

  /**
   * Clean up old data
   */
  async cleanup() {
    try {
      // Clean up local storage
      const localData = this.loadFromLocal();
      if (localData) {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (Date.now() - localData.timestamp > maxAge) {
          this.clearLocal();
        }
      }

      // Clean up old offline changes
      const changes = this.getOfflineChanges();
      const maxChangeAge = 24 * 60 * 60 * 1000; // 24 hours
      const validChanges = changes.filter(change => 
        Date.now() - change.timestamp < maxChangeAge
      );

      if (validChanges.length !== changes.length) {
        localStorage.setItem(this.offlineChangesKey, JSON.stringify(validChanges));
      }

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

/**
 * Utility functions
 */

/**
 * Create persistence manager for user
 */
export const createPersistenceManager = (userId) => {
  return new CartPersistenceManager(userId);
};

/**
 * Check if browser supports localStorage
 */
export const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get storage usage information
 */
export const getStorageInfo = () => {
  if (!isLocalStorageAvailable()) {
    return { available: false };
  }

  try {
    let totalSize = 0;
    let cartSize = 0;

    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = localStorage[key].length;
        totalSize += size;
        
        if (key.includes(CART_STORAGE_KEY) || 
            key.includes(OFFLINE_CHANGES_KEY) || 
            key.includes(SYNC_STATUS_KEY)) {
          cartSize += size;
        }
      }
    }

    return {
      available: true,
      totalSize,
      cartSize,
      totalSizeKB: Math.round(totalSize / 1024),
      cartSizeKB: Math.round(cartSize / 1024)
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { available: true, error: error.message };
  }
};

export default CartPersistenceManager;