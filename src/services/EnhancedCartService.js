// Enhanced Cart Service
// Handles Cloudinary images, session persistence, and advanced cart features

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
import { CartModel, CartValidation, CartItemStatus, CartEvents } from '../models/CartModel';
import firebaseService from './FirebaseService';

class EnhancedCartService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineChanges();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // ===============================================
  // CORE CART OPERATIONS
  // ===============================================

  /**
   * Get enhanced cart items with book data
   */
  async getEnhancedCartItems(userId) {
    try {
      const cacheKey = `cart_${userId}`;
      
      // Return cached data if available and fresh
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 30000) { // 30 seconds cache
          return cached.data;
        }
      }

      const q = query(
        collection(db, COLLECTIONS.CART),
        where('userId', '==', userId),
        where('savedForLater', '!=', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const cartItems = [];

      for (const docSnapshot of snapshot.docs) {
        const cartItem = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };

        // Enrich with current book data
        try {
          const currentBook = await firebaseService.getBookById(cartItem.bookId);
          cartItem.bookData = {
            title: currentBook.title,
            authorName: currentBook.authorName,
            images: {
              main: currentBook.images?.main || currentBook.imageUrl,
              thumbnail: this.getOptimizedImageUrl(currentBook.images?.main || currentBook.imageUrl, 'thumbnail')
            },
            price: currentBook.price,
            availability: currentBook.isAvailable,
            stock: currentBook.inventory?.stock || 0,
            isbn: currentBook.isbn,
            sku: currentBook.sku
          };

          // Check for price changes
          if (cartItem.priceAtTimeOfAdd !== currentBook.price) {
            cartItem.currentPrice = currentBook.price;
            cartItem.priceChanged = true;
          }

          // Check availability
          if (!currentBook.isAvailable || (currentBook.inventory?.stock || 0) < cartItem.quantity) {
            cartItem.status = CartItemStatus.OUT_OF_STOCK;
          }

        } catch (bookError) {
          console.warn(`Failed to load book data for ${cartItem.bookId}:`, bookError);
          cartItem.status = CartItemStatus.EXPIRED;
        }

        cartItems.push(cartItem);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: { documents: cartItems },
        timestamp: Date.now()
      });

      return { documents: cartItems };

    } catch (error) {
      console.error('Error getting enhanced cart items:', error);
      
      // Fallback to offline cache
      return this.getOfflineCart(userId);
    }
  }

  /**
   * Add item to cart with enhanced data
   */
  async addToCart(userId, bookId, quantity = 1, options = {}) {
    try {
      // Get current book data
      const book = await firebaseService.getBookById(bookId);
      
      if (!book.isAvailable) {
        throw new Error('Kitob hozirda mavjud emas');
      }

      if ((book.inventory?.stock || 0) < quantity) {
        throw new Error('Yetarli miqdorda kitob mavjud emas');
      }

      // Check if item already exists
      const existingQuery = query(
        collection(db, COLLECTIONS.CART),
        where('userId', '==', userId),
        where('bookId', '==', bookId),
        where('savedForLater', '!=', true)
      );

      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        // Update existing item
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();
        const newQuantity = existingData.quantity + quantity;

        // Validate total quantity
        if (newQuantity > CartValidation.maxQuantityPerItem) {
          throw new Error(`Maksimal miqdor: ${CartValidation.maxQuantityPerItem}`);
        }

        if ((book.inventory?.stock || 0) < newQuantity) {
          throw new Error('Yetarli miqdorda kitob mavjud emas');
        }

        await updateDoc(doc(db, COLLECTIONS.CART, existingDoc.id), {
          quantity: newQuantity,
          updatedAt: serverTimestamp(),
          lastAccessedAt: serverTimestamp(),
          currentPrice: book.price
        });

        // Clear cache
        this.clearCache(userId);

        // Dispatch event
        this.dispatchCartEvent(CartEvents.ITEM_UPDATED, {
          userId,
          bookId,
          quantity: newQuantity
        });

        return {
          id: existingDoc.id,
          ...existingData,
          quantity: newQuantity
        };
      }

      // Create new cart item
      const cartItemData = {
        userId,
        bookId,
        quantity,
        priceAtTimeOfAdd: book.price,
        currentPrice: book.price,
        
        // Book data snapshot
        bookData: {
          title: book.title,
          authorName: book.authorName,
          images: {
            main: book.images?.main || book.imageUrl,
            thumbnail: this.getOptimizedImageUrl(book.images?.main || book.imageUrl, 'thumbnail')
          },
          isbn: book.isbn,
          sku: book.sku,
          availability: book.isAvailable,
          stock: book.inventory?.stock || 0
        },
        
        // Session tracking
        sessionId: this.getSessionId(),
        deviceId: this.getDeviceId(),
        
        // Features
        savedForLater: false,
        priority: options.priority || 1,
        notes: options.notes || '',
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastAccessedAt: serverTimestamp(),
        expiresAt: this.getExpiryDate(userId)
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.CART), cartItemData);

      // Clear cache
      this.clearCache(userId);

      // Dispatch event
      this.dispatchCartEvent(CartEvents.ITEM_ADDED, {
        userId,
        bookId,
        quantity
      });

      return {
        id: docRef.id,
        ...cartItemData
      };

    } catch (error) {
      console.error('Error adding to cart:', error);
      
      // Offline fallback
      if (!this.isOnline) {
        return this.addToOfflineCart(userId, bookId, quantity, options);
      }
      
      throw error;
    }
  }

  /**
   * Update cart item with enhanced features
   */
  async updateCartItem(cartItemId, updates) {
    try {
      const docRef = doc(db, COLLECTIONS.CART, cartItemId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Savat elementi topilmadi');
      }

      const currentData = docSnap.data();

      // Validate quantity if being updated
      if (updates.quantity !== undefined) {
        if (updates.quantity <= 0) {
          return this.removeFromCart(cartItemId);
        }

        if (updates.quantity > CartValidation.maxQuantityPerItem) {
          throw new Error(`Maksimal miqdor: ${CartValidation.maxQuantityPerItem}`);
        }

        // Check stock availability
        const book = await firebaseService.getBookById(currentData.bookId);
        if ((book.inventory?.stock || 0) < updates.quantity) {
          throw new Error('Yetarli miqdorda kitob mavjud emas');
        }
      }

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        lastAccessedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);

      // Clear cache
      this.clearCache(currentData.userId);

      // Dispatch event
      this.dispatchCartEvent(CartEvents.ITEM_UPDATED, {
        cartItemId,
        updates
      });

      return {
        id: cartItemId,
        ...currentData,
        ...updates
      };

    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(cartItemId) {
    try {
      const docRef = doc(db, COLLECTIONS.CART, cartItemId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        await deleteDoc(docRef);

        // Clear cache
        this.clearCache(data.userId);

        // Dispatch event
        this.dispatchCartEvent(CartEvents.ITEM_REMOVED, {
          cartItemId,
          userId: data.userId,
          bookId: data.bookId
        });
      }

      return { success: true };

    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  // ===============================================
  // SAVE FOR LATER FUNCTIONALITY
  // ===============================================

  /**
   * Move item to save for later
   */
  async saveForLater(cartItemId) {
    return this.updateCartItem(cartItemId, {
      savedForLater: true,
      savedAt: serverTimestamp()
    });
  }

  /**
   * Move item back to cart from saved
   */
  async moveToCart(cartItemId) {
    return this.updateCartItem(cartItemId, {
      savedForLater: false,
      savedAt: null
    });
  }

  /**
   * Get saved for later items
   */
  async getSavedItems(userId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.CART),
        where('userId', '==', userId),
        where('savedForLater', '==', true),
        orderBy('savedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const savedItems = [];

      snapshot.forEach((doc) => {
        savedItems.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { documents: savedItems };

    } catch (error) {
      console.error('Error getting saved items:', error);
      throw error;
    }
  }

  // ===============================================
  // CART SHARING FUNCTIONALITY
  // ===============================================

  /**
   * Generate shareable cart link
   */
  async generateShareToken(userId) {
    try {
      const shareToken = this.generateUniqueToken();
      
      // Store share token in user's cart metadata
      const cartMetaRef = doc(db, COLLECTIONS.CART + '_meta', userId);
      await updateDoc(cartMetaRef, {
        shareToken,
        sharedAt: serverTimestamp(),
        isShared: true
      });

      return shareToken;

    } catch (error) {
      console.error('Error generating share token:', error);
      throw error;
    }
  }

  /**
   * Get shared cart by token
   */
  async getSharedCart(shareToken) {
    try {
      const q = query(
        collection(db, COLLECTIONS.CART + '_meta'),
        where('shareToken', '==', shareToken),
        where('isShared', '==', true)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error('Shared cart not found');
      }

      const cartMeta = snapshot.docs[0];
      const userId = cartMeta.id;

      return this.getEnhancedCartItems(userId);

    } catch (error) {
      console.error('Error getting shared cart:', error);
      throw error;
    }
  }

  // ===============================================
  // REAL-TIME SUBSCRIPTIONS
  // ===============================================

  /**
   * Subscribe to cart changes
   */
  subscribeToCart(userId, callback) {
    const q = query(
      collection(db, COLLECTIONS.CART),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const cartItems = [];

        for (const docSnapshot of snapshot.docs) {
          const cartItem = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };

          // Enrich with current book data
          try {
            const currentBook = await firebaseService.getBookById(cartItem.bookId);
            cartItem.bookData = {
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
            console.warn(`Failed to load book data for ${cartItem.bookId}:`, bookError);
          }

          cartItems.push(cartItem);
        }

        callback({ documents: cartItems });

      } catch (error) {
        console.error('Error in cart subscription:', error);
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
      cart: 'w_100,h_150,c_fill,f_auto,q_auto',
      default: 'f_auto,q_auto'
    };

    const transformation = transformations[context] || transformations.default;
    
    // Insert transformation into Cloudinary URL
    return imageUrl.replace('/upload/', `/upload/${transformation}/`);
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('cartSessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('cartSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Get or create device ID
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('cartDeviceId');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cartDeviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Get expiry date for cart items
   */
  getExpiryDate(userId) {
    const isGuest = userId.startsWith('guest_');
    const days = isGuest ? CartValidation.guestCartExpiryDays : CartValidation.sessionExpiryDays;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  /**
   * Generate unique token
   */
  generateUniqueToken() {
    return 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
  }

  /**
   * Clear cache for user
   */
  clearCache(userId) {
    const cacheKey = `cart_${userId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Dispatch cart events
   */
  dispatchCartEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent(eventType, { detail: data }));
  }

  // ===============================================
  // OFFLINE SUPPORT
  // ===============================================

  /**
   * Get offline cart from localStorage
   */
  getOfflineCart(userId) {
    try {
      const offlineCart = localStorage.getItem(`offline_cart_${userId}`);
      return offlineCart ? JSON.parse(offlineCart) : { documents: [] };
    } catch (error) {
      console.error('Error getting offline cart:', error);
      return { documents: [] };
    }
  }

  /**
   * Add to offline cart
   */
  addToOfflineCart(userId, bookId, quantity, options) {
    try {
      const offlineCart = this.getOfflineCart(userId);
      const existingItem = offlineCart.documents.find(item => item.bookId === bookId);

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.updatedAt = new Date().toISOString();
      } else {
        offlineCart.documents.push({
          id: 'offline_' + Date.now(),
          userId,
          bookId,
          quantity,
          ...options,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          offline: true
        });
      }

      localStorage.setItem(`offline_cart_${userId}`, JSON.stringify(offlineCart));
      
      // Add to sync queue
      this.syncQueue.push({
        action: 'add',
        userId,
        bookId,
        quantity,
        options
      });

      return offlineCart.documents[offlineCart.documents.length - 1];

    } catch (error) {
      console.error('Error adding to offline cart:', error);
      throw error;
    }
  }

  /**
   * Sync offline changes when back online
   */
  async syncOfflineChanges() {
    if (this.syncQueue.length === 0) return;

    console.log('Syncing offline cart changes...');

    for (const change of this.syncQueue) {
      try {
        switch (change.action) {
          case 'add':
            await this.addToCart(change.userId, change.bookId, change.quantity, change.options);
            break;
          case 'update':
            await this.updateCartItem(change.cartItemId, change.updates);
            break;
          case 'remove':
            await this.removeFromCart(change.cartItemId);
            break;
        }
      } catch (error) {
        console.error('Error syncing cart change:', error);
      }
    }

    // Clear sync queue
    this.syncQueue = [];
    console.log('Cart sync completed');
  }

  /**
   * Cleanup expired cart items
   */
  async cleanupExpiredItems() {
    try {
      const now = new Date();
      const q = query(
        collection(db, COLLECTIONS.CART),
        where('expiresAt', '<', now)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Cleaned up ${snapshot.size} expired cart items`);

    } catch (error) {
      console.error('Error cleaning up expired cart items:', error);
    }
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
  }
}

// Create singleton instance
const enhancedCartService = new EnhancedCartService();

// Auto-cleanup expired items every hour
setInterval(() => {
  enhancedCartService.cleanupExpiredItems();
}, 60 * 60 * 1000);

export default enhancedCartService;