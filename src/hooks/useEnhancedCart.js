import { useState, useEffect, useCallback, useMemo } from 'react';
import { onSnapshot, query, where, orderBy, collection, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebaseConfig';
import firebaseService from '../services/FirebaseService';
import { getCurrentUserId } from '../utils/firebaseHelpers';
import { toastMessages } from '../utils/toastUtils';

// Enhanced cart hook with Cloudinary support, wishlist, and advanced features
const useEnhancedCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'offline'

  const userId = getCurrentUserId();

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      syncOfflineChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync offline changes when coming back online
  const syncOfflineChanges = useCallback(async () => {
    try {
      const offlineChanges = JSON.parse(localStorage.getItem('offlineCartChanges') || '[]');
      
      for (const change of offlineChanges) {
        switch (change.type) {
          case 'update':
            await updateQuantity(change.itemId, change.quantity, false);
            break;
          case 'remove':
            await removeItem(change.itemId, false);
            break;
          case 'saveForLater':
            await saveForLater(change.itemId, false);
            break;
          case 'moveToCart':
            await moveToCart(change.itemId, false);
            break;
        }
      }

      localStorage.removeItem('offlineCartChanges');
      setSyncStatus('synced');
    } catch (err) {
      console.error('Error syncing offline changes:', err);
      setSyncStatus('offline');
    }
  }, []);

  // Add offline change to queue
  const addOfflineChange = useCallback((change) => {
    const offlineChanges = JSON.parse(localStorage.getItem('offlineCartChanges') || '[]');
    offlineChanges.push({ ...change, timestamp: Date.now() });
    localStorage.setItem('offlineCartChanges', JSON.stringify(offlineChanges));
  }, []);

  // Subscribe to cart changes
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribeCart = firebaseService.subscribeToCart(userId, (result) => {
      const items = result.documents || [];
      
      // Separate active cart items and saved items
      const activeItems = items.filter(item => !item.savedForLater);
      const savedForLaterItems = items.filter(item => item.savedForLater);
      
      setCartItems(activeItems);
      setSavedItems(savedForLaterItems);
      setLoading(false);
      setError(null);
    });

    return () => {
      if (unsubscribeCart) unsubscribeCart();
    };
  }, [userId]);

  // Subscribe to wishlist changes
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, COLLECTIONS.WISHLIST),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeWishlist = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setWishlistItems(items);
    });

    return () => unsubscribeWishlist();
  }, [userId]);

  // Load cart from localStorage for offline support
  useEffect(() => {
    if (!userId) return;

    const savedCart = localStorage.getItem(`cart_${userId}`);
    if (savedCart && !isOnline) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart.active || []);
        setSavedItems(parsedCart.saved || []);
      } catch (err) {
        console.error('Error loading offline cart:', err);
      }
    }
  }, [userId, isOnline]);

  // Save cart to localStorage for offline support
  useEffect(() => {
    if (!userId) return;

    const cartData = {
      active: cartItems,
      saved: savedItems,
      timestamp: Date.now()
    };

    localStorage.setItem(`cart_${userId}`, JSON.stringify(cartData));
  }, [cartItems, savedItems, userId]);

  // Update quantity
  const updateQuantity = useCallback(async (cartItemId, newQuantity, updateOffline = true) => {
    if (newQuantity < 1) return;

    try {
      if (!isOnline && updateOffline) {
        // Update locally and queue for sync
        setCartItems(prev => prev.map(item => 
          item.id === cartItemId ? { ...item, quantity: newQuantity } : item
        ));
        addOfflineChange({ type: 'update', itemId: cartItemId, quantity: newQuantity });
        return;
      }

      await firebaseService.updateCartItem(cartItemId, newQuantity);
    } catch (err) {
      console.error('Error updating quantity:', err);
      throw err;
    }
  }, [isOnline, addOfflineChange]);

  // Remove item
  const removeItem = useCallback(async (cartItemId, updateOffline = true) => {
    try {
      if (!isOnline && updateOffline) {
        // Update locally and queue for sync
        setCartItems(prev => prev.filter(item => item.id !== cartItemId));
        setSavedItems(prev => prev.filter(item => item.id !== cartItemId));
        addOfflineChange({ type: 'remove', itemId: cartItemId });
        return;
      }

      await firebaseService.removeFromCart(cartItemId);
    } catch (err) {
      console.error('Error removing item:', err);
      throw err;
    }
  }, [isOnline, addOfflineChange]);

  // Save for later
  const saveForLater = useCallback(async (cartItemId, updateOffline = true) => {
    try {
      if (!isOnline && updateOffline) {
        // Update locally and queue for sync
        const item = cartItems.find(item => item.id === cartItemId);
        if (item) {
          setCartItems(prev => prev.filter(item => item.id !== cartItemId));
          setSavedItems(prev => [...prev, { ...item, savedForLater: true }]);
        }
        addOfflineChange({ type: 'saveForLater', itemId: cartItemId });
        return;
      }

      const docRef = doc(db, COLLECTIONS.CART, cartItemId);
      await updateDoc(docRef, {
        savedForLater: true,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error saving for later:', err);
      throw err;
    }
  }, [cartItems, isOnline, addOfflineChange]);

  // Move to cart
  const moveToCart = useCallback(async (cartItemId, updateOffline = true) => {
    try {
      if (!isOnline && updateOffline) {
        // Update locally and queue for sync
        const item = savedItems.find(item => item.id === cartItemId);
        if (item) {
          setSavedItems(prev => prev.filter(item => item.id !== cartItemId));
          setCartItems(prev => [...prev, { ...item, savedForLater: false }]);
        }
        addOfflineChange({ type: 'moveToCart', itemId: cartItemId });
        return;
      }

      const docRef = doc(db, COLLECTIONS.CART, cartItemId);
      await updateDoc(docRef, {
        savedForLater: false,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error moving to cart:', err);
      throw err;
    }
  }, [savedItems, isOnline, addOfflineChange]);

  // Update notes
  const updateNotes = useCallback(async (cartItemId, notes) => {
    try {
      const docRef = doc(db, COLLECTIONS.CART, cartItemId);
      await updateDoc(docRef, {
        notes: notes || '',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating notes:', err);
      throw err;
    }
  }, []);

  // Update priority
  const updatePriority = useCallback(async (cartItemId, priority) => {
    try {
      const docRef = doc(db, COLLECTIONS.CART, cartItemId);
      await updateDoc(docRef, {
        priority: priority || 'normal',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating priority:', err);
      throw err;
    }
  }, []);

  // Wishlist operations
  const addToWishlist = useCallback(async (bookId) => {
    try {
      await firebaseService.addToWishlist(userId, bookId);
      toastMessages.success('Kitob sevimlilarga qo\'shildi');
    } catch (err) {
      console.error('Error adding to wishlist:', err);
      toastMessages.error(err.message);
      throw err;
    }
  }, [userId]);

  const removeFromWishlist = useCallback(async (bookId) => {
    try {
      await firebaseService.removeFromWishlist(userId, bookId);
      toastMessages.success('Kitob sevimlilardan o\'chirildi');
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      toastMessages.error(err.message);
      throw err;
    }
  }, [userId]);

  const isInWishlist = useCallback((bookId) => {
    return wishlistItems.some(item => item.bookId === bookId);
  }, [wishlistItems]);

  // Generate share token for cart sharing
  const generateShareToken = useCallback(async () => {
    try {
      const shareData = {
        userId,
        items: cartItems.map(item => ({
          bookId: item.bookId,
          quantity: item.quantity,
          bookTitle: item.bookData?.title,
          bookImage: item.bookData?.images?.main || item.bookData?.imageUrl
        })),
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      const docRef = await addDoc(collection(db, 'shared_carts'), shareData);
      const shareUrl = `${window.location.origin}/shared-cart/${docRef.id}`;
      
      return shareUrl;
    } catch (err) {
      console.error('Error generating share token:', err);
      throw err;
    }
  }, [userId, cartItems]);

  // Bulk operations
  const bulkUpdateQuantities = useCallback(async (updates) => {
    try {
      const batch = writeBatch(db);
      
      updates.forEach(({ cartItemId, quantity }) => {
        const docRef = doc(db, COLLECTIONS.CART, cartItemId);
        batch.update(docRef, {
          quantity,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (err) {
      console.error('Error bulk updating quantities:', err);
      throw err;
    }
  }, []);

  const bulkRemoveItems = useCallback(async (cartItemIds) => {
    try {
      const batch = writeBatch(db);
      
      cartItemIds.forEach(cartItemId => {
        const docRef = doc(db, COLLECTIONS.CART, cartItemId);
        batch.delete(docRef);
      });

      await batch.commit();
    } catch (err) {
      console.error('Error bulk removing items:', err);
      throw err;
    }
  }, []);

  // Computed values
  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = item.bookData?.price || item.priceAtTimeOfAdd || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  const savedTotal = useMemo(() => {
    return savedItems.reduce((total, item) => {
      const price = item.bookData?.price || item.priceAtTimeOfAdd || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [savedItems]);

  const wishlistTotal = useMemo(() => {
    return wishlistItems.reduce((total, item) => {
      const price = item.bookData?.price || 0;
      return total + price;
    }, 0);
  }, [wishlistItems]);

  // Get cart statistics
  const getCartStats = useCallback(() => {
    return {
      totalItems: cartItems.length + savedItems.length,
      activeItems: cartItems.length,
      savedItems: savedItems.length,
      wishlistItems: wishlistItems.length,
      totalValue: cartTotal + savedTotal,
      cartValue: cartTotal,
      savedValue: savedTotal,
      wishlistValue: wishlistTotal,
      totalQuantity: cartCount,
      averageItemPrice: cartItems.length > 0 ? cartTotal / cartItems.length : 0
    };
  }, [cartItems.length, savedItems.length, wishlistItems.length, cartTotal, savedTotal, wishlistTotal, cartCount]);

  return {
    // State
    cartItems,
    savedItems,
    wishlistItems,
    loading,
    error,
    isOnline,
    syncStatus,

    // Computed values
    cartTotal,
    cartCount,
    savedTotal,
    wishlistTotal,

    // Cart operations
    updateQuantity,
    removeItem,
    saveForLater,
    moveToCart,
    updateNotes,
    updatePriority,

    // Wishlist operations
    addToWishlist,
    removeFromWishlist,
    isInWishlist,

    // Bulk operations
    bulkUpdateQuantities,
    bulkRemoveItems,

    // Advanced features
    generateShareToken,
    getCartStats,
    syncOfflineChanges
  };
};

export default useEnhancedCart;