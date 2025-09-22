// Enhanced Wishlist Service
// Handles real-time updates, notifications, and advanced wishlist features

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  increment
} from 'firebase/firestore';

import { db, COLLECTIONS } from '../firebaseConfig';
import { WishlistModel, WishlistValidation, WishlistItemStatus, WishlistEvents, WishlistNotificationTypes } from '../models/WishlistModel';
import firebaseService from './FirebaseService';

class EnhancedWishlistService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
    this.priceWatchers = new Map();
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineChanges();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Start price monitoring
    this.startPriceMonitoring();
  }

  // ===============================================
  // CORE WISHLIST OPERATIONS
  // ===============================================

  /**
   * Get enhanced wishlist items with book data
   */
  async getEnhancedWishlistItems(userId) {
    try {
      const cacheKey = `wishlist_${userId}`;
      
      // Return cached data if available and fresh
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
          return cached.data;
        }
      }

      const q = query(
        collection(db, COLLECTIONS.WISHLIST),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const wishlistItems = [];

      for (const docSnapshot of snapshot.docs) {
        const wishlistItem = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };

        // Enrich with current book data
        try {
          const currentBook = await firebaseService.getBookById(wishlistItem.bookId);
          
          // Update book data snapshot
          const updatedBookData = {
            title: currentBook.title,
            authorName: currentBook.authorName,
            images: {
              main: currentBook.images?.main || currentBook.imageUrl,
              thumbnail: this.getOptimizedImageUrl(currentBook.images?.main || currentBook.imageUrl, 'thumbnail')
            },
            price: currentBook.price,
            originalPrice: currentBook.originalPrice || currentBook.price,
            discountPercentage: this.calculateDiscountPercentage(currentBook.originalPrice || currentBook.price, currentBook.price),
            availability: currentBook.isAvailable,
            stock: currentBook.inventory?.stock || 0,
            isbn: currentBook.isbn,
            sku: currentBook.sku,
            genre: currentBook.genreName || ''
          };

          wishlistItem.bookData = updatedBookData;

          // Check for price changes
          const oldPrice = wishlistItem.bookData?.price || wishlistItem.priceAtTimeOfAdd;
          if (oldPrice && oldPrice !== currentBook.price) {
            wishlistItem.priceChanged = true;
            wishlistItem.priceChangeAmount = currentBook.price - oldPrice;
            wishlistItem.priceChangePercentage = ((currentBook.price - oldPrice) / oldPrice) * 100;
            
            if (currentBook.price < oldPrice) {
              wishlistItem.status = WishlistItemStatus.PRICE_DROPPED;
            } else {
              wishlistItem.status = WishlistItemStatus.PRICE_INCREASED;
            }

            // Update price history
            await this.updatePriceHistory(wishlistItem.id, currentBook.price);
          }

          // Check availability changes
          if (!currentBook.isAvailable) {
            wishlistItem.status = WishlistItemStatus.OUT_OF_STOCK;
          } else if (wishlistItem.status === WishlistItemStatus.OUT_OF_STOCK) {
            wishlistItem.status = WishlistItemStatus.AVAILABLE;
            
            // Send back in stock notification if enabled
            if (wishlistItem.notifications?.backInStock) {
              await this.sendBackInStockNotification(userId, wishlistItem);
            }
          }

          // Check target price
          if (wishlistItem.targetPrice && currentBook.price <= wishlistItem.targetPrice) {
            await this.sendTargetPriceNotification(userId, wishlistItem);
          }

        } catch (bookError) {
          console.warn(`Failed to load book data for ${wishlistItem.bookId}:`, bookError);
          wishlistItem.status = WishlistItemStatus.DISCONTINUED;
        }

        wishlistItems.push(wishlistItem);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: { documents: wishlistItems },
        timestamp: Date.now()
      });

      return { documents: wishlistItems };

    } catch (error) {
      console.error('Error getting enhanced wishlist items:', error);
      
      // Fallback to offline cache
      return this.getOfflineWishlist(userId);
    }
  }

  /**
   * Add item to wishlist with enhanced data
   */
  async addToWishlist(userId, bookId, options = {}) {
    try {
      // Check if item already exists
      const existingQuery = query(
        collection(db, COLLECTIONS.WISHLIST),
        where('userId', '==', userId),
        where('bookId', '==', bookId)
      );

      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        throw new Error('Kitob allaqachon sevimlilar ro\'yxatida');
      }

      // Get current book data
      const book = await firebaseService.getBookById(bookId);

      // Create wishlist item
      const wishlistItemData = {
        userId,
        bookId,
        
        // Book data snapshot
        bookData: {
          title: book.title,
          authorName: book.authorName,
          images: {
            main: book.images?.main || book.imageUrl,
            thumbnail: this.getOptimizedImageUrl(book.images?.main || book.imageUrl, 'thumbnail')
          },
          price: book.price,
          originalPrice: book.originalPrice || book.price,
          discountPercentage: this.calculateDiscountPercentage(book.originalPrice || book.price, book.price),
          availability: book.isAvailable,
          stock: book.inventory?.stock || 0,
          isbn: book.isbn,
          sku: book.sku,
          genre: book.genreName || ''
        },
        
        // Wishlist features
        priority: options.priority || 3,
        notes: options.notes || '',
        tags: options.tags || [],
        
        // Notification preferences
        notifications: {
          priceDrops: options.notifications?.priceDrops !== false,
          backInStock: options.notifications?.backInStock !== false,
          newEdition: options.notifications?.newEdition || false,
          authorNews: options.notifications?.authorNews || false
        },
        
        // Price tracking
        priceHistory: [{
          price: book.price,
          date: new Date(),
          source: 'initial'
        }],
        targetPrice: options.targetPrice || null,
        
        // Social features
        isPublic: options.isPublic || false,
        sharedWith: options.sharedWith || [],
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastCheckedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.WISHLIST), wishlistItemData);

      // Clear cache
      this.clearCache(userId);

      // Start price monitoring for this item
      this.startPriceWatcher(docRef.id, bookId);

      // Dispatch event
      this.dispatchWishlistEvent(WishlistEvents.ITEM_ADDED, {
        userId,
        bookId,
        wishlistItemId: docRef.id
      });

      // Update book wishlist count
      await this.updateBookWishlistCount(bookId, 1);

      return {
        id: docRef.id,
        ...wishlistItemData
      };

    } catch (error) {
      console.error('Error adding to wishlist:', error);
      
      // Offline fallback
      if (!this.isOnline) {
        return this.addToOfflineWishlist(userId, bookId, options);
      }
      
      throw error;
    }
  }

  /**
   * Update wishlist item
   */
  async updateWishlistItem(wishlistItemId, updates) {
    try {
      const docRef = doc(db, COLLECTIONS.WISHLIST, wishlistItemId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Wishlist item not found');
      }

      const currentData = docSnap.data();

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);

      // Clear cache
      this.clearCache(currentData.userId);

      // Dispatch event
      this.dispatchWishlistEvent(WishlistEvents.ITEM_UPDATED, {
        wishlistItemId,
        updates
      });

      return {
        id: wishlistItemId,
        ...currentData,
        ...updates
      };

    } catch (error) {
      console.error('Error updating wishlist item:', error);
      throw error;
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeFromWishlist(userId, bookId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.WISHLIST),
        where('userId', '==', userId),
        where('bookId', '==', bookId)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docToDelete = snapshot.docs[0];
        await deleteDoc(docToDelete.ref);

        // Stop price monitoring
        this.stopPriceWatcher(docToDelete.id);

        // Clear cache
        this.clearCache(userId);

        // Dispatch event
        this.dispatchWishlistEvent(WishlistEvents.ITEM_REMOVED, {
          userId,
          bookId,
          wishlistItemId: docToDelete.id
        });

        // Update book wishlist count
        await this.updateBookWishlistCount(bookId, -1);
      }

      return { success: true };

    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  }

  // ===============================================
  // PRICE MONITORING
  // ===============================================

  /**
   * Start price monitoring for all wishlist items
   */
  startPriceMonitoring() {
    // Check prices every hour
    setInterval(async () => {
      await this.checkAllPrices();
    }, 60 * 60 * 1000);

    // Initial check after 5 minutes
    setTimeout(() => {
      this.checkAllPrices();
    }, 5 * 60 * 1000);
  }

  /**
   * Check prices for all wishlist items
   */
  async checkAllPrices() {
    try {
      console.log('Checking wishlist prices...');

      const q = query(
        collection(db, COLLECTIONS.WISHLIST),
        where('notifications.priceDrops', '==', true)
      );

      const snapshot = await getDocs(q);

      for (const docSnapshot of snapshot.docs) {
        const wishlistItem = docSnapshot.data();
        await this.checkItemPrice(docSnapshot.id, wishlistItem);
      }

      console.log(`Checked prices for ${snapshot.size} wishlist items`);

    } catch (error) {
      console.error('Error checking wishlist prices:', error);
    }
  }

  /**
   * Check price for specific wishlist item
   */
  async checkItemPrice(wishlistItemId, wishlistItem) {
    try {
      const currentBook = await firebaseService.getBookById(wishlistItem.bookId);
      const oldPrice = wishlistItem.bookData?.price || 0;
      const newPrice = currentBook.price;

      if (oldPrice !== newPrice) {
        // Update price history
        await this.updatePriceHistory(wishlistItemId, newPrice);

        // Update book data
        await this.updateWishlistItem(wishlistItemId, {
          'bookData.price': newPrice,
          'bookData.availability': currentBook.isAvailable,
          'bookData.stock': currentBook.inventory?.stock || 0,
          lastCheckedAt: serverTimestamp()
        });

        // Send notifications
        if (newPrice < oldPrice && wishlistItem.notifications?.priceDrops) {
          await this.sendPriceDropNotification(wishlistItem.userId, wishlistItem, oldPrice, newPrice);
        }

        if (wishlistItem.targetPrice && newPrice <= wishlistItem.targetPrice) {
          await this.sendTargetPriceNotification(wishlistItem.userId, wishlistItem);
        }

        // Dispatch event
        this.dispatchWishlistEvent(WishlistEvents.PRICE_CHANGED, {
          wishlistItemId,
          oldPrice,
          newPrice,
          bookId: wishlistItem.bookId
        });
      }

    } catch (error) {
      console.error(`Error checking price for wishlist item ${wishlistItemId}:`, error);
    }
  }

  /**
   * Update price history
   */
  async updatePriceHistory(wishlistItemId, newPrice) {
    try {
      const docRef = doc(db, COLLECTIONS.WISHLIST, wishlistItemId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const priceHistory = data.priceHistory || [];
        
        priceHistory.push({
          price: newPrice,
          date: new Date(),
          source: 'monitoring'
        });

        // Keep only last 50 price points
        if (priceHistory.length > 50) {
          priceHistory.splice(0, priceHistory.length - 50);
        }

        await updateDoc(docRef, {
          priceHistory
        });
      }

    } catch (error) {
      console.error('Error updating price history:', error);
    }
  }

  // ===============================================
  // NOTIFICATIONS
  // ===============================================

  /**
   * Send price drop notification
   */
  async sendPriceDropNotification(userId, wishlistItem, oldPrice, newPrice) {
    try {
      const NotificationService = (await import('./NotificationService.js')).default;
      
      const discountAmount = oldPrice - newPrice;
      const discountPercentage = Math.round((discountAmount / oldPrice) * 100);

      await NotificationService.createWishlistNotification(
        userId,
        wishlistItem.bookData,
        'PRICE_DROP',
        {
          oldPrice,
          newPrice,
          discountAmount,
          discountPercentage,
          bookId: wishlistItem.bookId
        }
      );

    } catch (error) {
      console.error('Error sending price drop notification:', error);
    }
  }

  /**
   * Send target price notification
   */
  async sendTargetPriceNotification(userId, wishlistItem) {
    try {
      const NotificationService = (await import('./NotificationService.js')).default;
      
      await NotificationService.createWishlistNotification(
        userId,
        wishlistItem.bookData,
        'TARGET_PRICE_REACHED',
        {
          targetPrice: wishlistItem.targetPrice,
          currentPrice: wishlistItem.bookData.price,
          bookId: wishlistItem.bookId
        }
      );

    } catch (error) {
      console.error('Error sending target price notification:', error);
    }
  }

  /**
   * Send back in stock notification
   */
  async sendBackInStockNotification(userId, wishlistItem) {
    try {
      const NotificationService = (await import('./NotificationService.js')).default;
      
      await NotificationService.createWishlistNotification(
        userId,
        wishlistItem.bookData,
        'BACK_IN_STOCK',
        {
          bookId: wishlistItem.bookId,
          stock: wishlistItem.bookData.stock
        }
      );

    } catch (error) {
      console.error('Error sending back in stock notification:', error);
    }
  }

  // ===============================================
  // REAL-TIME SUBSCRIPTIONS
  // ===============================================

  /**
   * Subscribe to wishlist changes
   */
  subscribeToWishlist(userId, callback) {
    const q = query(
      collection(db, COLLECTIONS.WISHLIST),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const wishlistItems = [];

        for (const docSnapshot of snapshot.docs) {
          const wishlistItem = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };

          // Enrich with current book data
          try {
            const currentBook = await firebaseService.getBookById(wishlistItem.bookId);
            wishlistItem.bookData = {
              title: currentBook.title,
              authorName: currentBook.authorName,
              images: {
                main: currentBook.images?.main || currentBook.imageUrl,
                thumbnail: this.getOptimizedImageUrl(currentBook.images?.main || currentBook.imageUrl, 'thumbnail')
              },
              price: currentBook.price,
              availability: currentBook.isAvailable,
              stock: currentBook.inventory?.stock || 0
            };
          } catch (bookError) {
            console.warn(`Failed to load book data for ${wishlistItem.bookId}:`, bookError);
          }

          wishlistItems.push(wishlistItem);
        }

        callback({ documents: wishlistItems });

      } catch (error) {
        console.error('Error in wishlist subscription:', error);
        callback({ documents: [], error: error.message });
      }
    });

    // Store listener for cleanup
    this.listeners.set(userId, unsubscribe);

    return unsubscribe;
  }

  // ===============================================
  // UTILITY METHODS
  // ===============================================

  /**
   * Get optimized Cloudinary image URL
   */
  getOptimizedImageUrl(imageUrl, context = 'default') {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return imageUrl;
    }

    const transformations = {
      thumbnail: 'w_150,h_200,c_fill,f_auto,q_auto',
      wishlist: 'w_120,h_180,c_fill,f_auto,q_auto',
      default: 'f_auto,q_auto'
    };

    const transformation = transformations[context] || transformations.default;
    
    // Insert transformation into Cloudinary URL
    return imageUrl.replace('/upload/', `/upload/${transformation}/`);
  }

  /**
   * Calculate discount percentage
   */
  calculateDiscountPercentage(originalPrice, currentPrice) {
    if (!originalPrice || originalPrice <= currentPrice) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }

  /**
   * Update book wishlist count
   */
  async updateBookWishlistCount(bookId, increment) {
    try {
      const bookRef = doc(db, COLLECTIONS.BOOKS, bookId);
      await updateDoc(bookRef, {
        'analytics.wishlistCount': increment(increment)
      });
    } catch (error) {
      console.error('Error updating book wishlist count:', error);
    }
  }

  /**
   * Start price watcher for specific item
   */
  startPriceWatcher(wishlistItemId, bookId) {
    this.priceWatchers.set(wishlistItemId, {
      bookId,
      lastChecked: Date.now()
    });
  }

  /**
   * Stop price watcher for specific item
   */
  stopPriceWatcher(wishlistItemId) {
    this.priceWatchers.delete(wishlistItemId);
  }

  /**
   * Clear cache for user
   */
  clearCache(userId) {
    const cacheKey = `wishlist_${userId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Dispatch wishlist events
   */
  dispatchWishlistEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent(eventType, { detail: data }));
  }

  // ===============================================
  // OFFLINE SUPPORT
  // ===============================================

  /**
   * Get offline wishlist from localStorage
   */
  getOfflineWishlist(userId) {
    try {
      const offlineWishlist = localStorage.getItem(`offline_wishlist_${userId}`);
      return offlineWishlist ? JSON.parse(offlineWishlist) : { documents: [] };
    } catch (error) {
      console.error('Error getting offline wishlist:', error);
      return { documents: [] };
    }
  }

  /**
   * Add to offline wishlist
   */
  addToOfflineWishlist(userId, bookId, options) {
    try {
      const offlineWishlist = this.getOfflineWishlist(userId);
      const existingItem = offlineWishlist.documents.find(item => item.bookId === bookId);

      if (existingItem) {
        throw new Error('Kitob allaqachon sevimlilar ro\'yxatida');
      }

      offlineWishlist.documents.push({
        id: 'offline_' + Date.now(),
        userId,
        bookId,
        ...options,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        offline: true
      });

      localStorage.setItem(`offline_wishlist_${userId}`, JSON.stringify(offlineWishlist));

      return offlineWishlist.documents[offlineWishlist.documents.length - 1];

    } catch (error) {
      console.error('Error adding to offline wishlist:', error);
      throw error;
    }
  }

  /**
   * Sync offline changes when back online
   */
  async syncOfflineChanges() {
    // Implementation for syncing offline wishlist changes
    console.log('Syncing offline wishlist changes...');
  }

  /**
   * Cleanup method
   */
  cleanup() {
    // Unsubscribe from all listeners
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();

    // Clear cache
    this.cache.clear();

    // Clear price watchers
    this.priceWatchers.clear();
  }
}

// Create singleton instance
const enhancedWishlistService = new EnhancedWishlistService();

export default enhancedWishlistService;