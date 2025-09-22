// Enhanced Wishlist Hook
// Provides advanced wishlist functionality with real-time updates and notifications

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../firebaseConfig';
import enhancedWishlistService from '../services/EnhancedWishlistService';
import { WishlistEvents } from '../models/WishlistModel';
import { toastMessages } from '../utils/toastUtils';

const useEnhancedWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const unsubscribeRef = useRef(null);
  const mountedRef = useRef(true);

  // Get current user ID (authenticated or guest)
  const getCurrentUserId = useCallback(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      return currentUser.uid;
    }
    
    // Guest user ID
    let guestId = localStorage.getItem('firebaseGuestId');
    if (!guestId) {
      guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('firebaseGuestId', guestId);
    }
    return guestId;
  }, []);

  // Calculate wishlist totals
  const calculateTotals = useCallback((items) => {
    const count = items.length;
    const total = items.reduce((sum, item) => {
      const price = item.bookData?.price || 0;
      return sum + price;
    }, 0);
    
    setWishlistCount(count);
    setTotalValue(total);
  }, []);

  // Load wishlist items
  const loadWishlistItems = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const userId = getCurrentUserId();
      const result = await enhancedWishlistService.getEnhancedWishlistItems(userId);

      if (!mountedRef.current) return;

      setWishlistItems(result.documents);
      calculateTotals(result.documents);
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('Error loading wishlist items:', err);
      setError(err.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [getCurrentUserId, calculateTotals]);

  // Add item to wishlist
  const addToWishlist = useCallback(async (book, options = {}) => {
    try {
      const userId = getCurrentUserId();
      const result = await enhancedWishlistService.addToWishlist(userId, book.id || book.$id, {
        priority: options.priority || 3,
        notes: options.notes || '',
        tags: options.tags || [],
        notifications: {
          priceDrops: options.notifications?.priceDrops !== false,
          backInStock: options.notifications?.backInStock !== false,
          newEdition: options.notifications?.newEdition || false,
          authorNews: options.notifications?.authorNews || false
        },
        targetPrice: options.targetPrice || null,
        isPublic: options.isPublic || false
      });
      
      // Reload wishlist items
      await loadWishlistItems();
      
      // Show success message
      toastMessages.success(`${book.title} sevimlilarga qo'shildi`);
      
      return result;
    } catch (err) {
      console.error('Error adding to wishlist:', err);
      setError(err.message);
      
      if (err.message.includes('allaqachon')) {
        toastMessages.warning('Kitob allaqachon sevimlilar ro\'yxatida');
      } else {
        toastMessages.error('Sevimlilarga qo\'shishda xato yuz berdi');
      }
      
      throw err;
    }
  }, [getCurrentUserId, loadWishlistItems]);

  // Remove item from wishlist
  const removeFromWishlist = useCallback(async (bookId) => {
    try {
      const userId = getCurrentUserId();
      const result = await enhancedWishlistService.removeFromWishlist(userId, bookId);
      
      // Reload wishlist items
      await loadWishlistItems();
      
      toastMessages.success('Kitob sevimlilardan olib tashlandi');
      return result;
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      setError(err.message);
      toastMessages.error('Sevimlilardan olib tashlanishda xato yuz berdi');
      throw err;
    }
  }, [getCurrentUserId, loadWishlistItems]);

  // Update wishlist item
  const updateWishlistItem = useCallback(async (wishlistItemId, updates) => {
    try {
      const result = await enhancedWishlistService.updateWishlistItem(wishlistItemId, updates);
      
      // Reload wishlist items
      await loadWishlistItems();
      
      return result;
    } catch (err) {
      console.error('Error updating wishlist item:', err);
      setError(err.message);
      toastMessages.error('Yangilashda xato yuz berdi');
      throw err;
    }
  }, [loadWishlistItems]);

  // Update item priority
  const updatePriority = useCallback(async (wishlistItemId, priority) => {
    return updateWishlistItem(wishlistItemId, { priority });
  }, [updateWishlistItem]);

  // Update item notes
  const updateNotes = useCallback(async (wishlistItemId, notes) => {
    return updateWishlistItem(wishlistItemId, { notes });
  }, [updateWishlistItem]);

  // Update item tags
  const updateTags = useCallback(async (wishlistItemId, tags) => {
    return updateWishlistItem(wishlistItemId, { tags });
  }, [updateWishlistItem]);

  // Update target price
  const updateTargetPrice = useCallback(async (wishlistItemId, targetPrice) => {
    return updateWishlistItem(wishlistItemId, { targetPrice });
  }, [updateWishlistItem]);

  // Update notification preferences
  const updateNotificationPreferences = useCallback(async (wishlistItemId, notifications) => {
    return updateWishlistItem(wishlistItemId, { notifications });
  }, [updateWishlistItem]);

  // Check if book is in wishlist
  const isInWishlist = useCallback((bookId) => {
    return wishlistItems.some(item => item.bookId === bookId);
  }, [wishlistItems]);

  // Get wishlist item by book ID
  const getWishlistItem = useCallback((bookId) => {
    return wishlistItems.find(item => item.bookId === bookId);
  }, [wishlistItems]);

  // Get wishlist statistics
  const getWishlistStats = useCallback(() => {
    const availableItems = wishlistItems.filter(item => item.bookData?.availability).length;
    const outOfStockItems = wishlistItems.filter(item => !item.bookData?.availability).length;
    const priceDroppedItems = wishlistItems.filter(item => item.status === 'price_dropped').length;
    const highPriorityItems = wishlistItems.filter(item => item.priority >= 4).length;
    
    const averagePrice = wishlistItems.length > 0 
      ? totalValue / wishlistItems.length 
      : 0;

    return {
      totalItems: wishlistCount,
      availableItems,
      outOfStockItems,
      priceDroppedItems,
      highPriorityItems,
      totalValue,
      averagePrice
    };
  }, [wishlistItems, wishlistCount, totalValue]);

  // Get items by priority
  const getItemsByPriority = useCallback((priority) => {
    return wishlistItems.filter(item => item.priority === priority);
  }, [wishlistItems]);

  // Get items by status
  const getItemsByStatus = useCallback((status) => {
    return wishlistItems.filter(item => item.status === status);
  }, [wishlistItems]);

  // Get items with price drops
  const getPriceDroppedItems = useCallback(() => {
    return wishlistItems.filter(item => 
      item.priceChanged && item.priceChangeAmount < 0
    );
  }, [wishlistItems]);

  // Get items back in stock
  const getBackInStockItems = useCallback(() => {
    return wishlistItems.filter(item => 
      item.status === 'available' && item.bookData?.availability
    );
  }, [wishlistItems]);

  // Sort wishlist items
  const sortWishlistItems = useCallback((sortBy = 'createdAt', sortOrder = 'desc') => {
    const sorted = [...wishlistItems].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'priority':
          aValue = a.priority || 0;
          bValue = b.priority || 0;
          break;
        case 'price':
          aValue = a.bookData?.price || 0;
          bValue = b.bookData?.price || 0;
          break;
        case 'title':
          aValue = a.bookData?.title || '';
          bValue = b.bookData?.title || '';
          break;
        case 'author':
          aValue = a.bookData?.authorName || '';
          bValue = b.bookData?.authorName || '';
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [wishlistItems]);

  // Filter wishlist items
  const filterWishlistItems = useCallback((filters = {}) => {
    let filtered = [...wishlistItems];

    if (filters.availability !== undefined) {
      filtered = filtered.filter(item => 
        item.bookData?.availability === filters.availability
      );
    }

    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(item => 
        (item.bookData?.price || 0) >= filters.minPrice
      );
    }

    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(item => 
        (item.bookData?.price || 0) <= filters.maxPrice
      );
    }

    if (filters.priority !== undefined) {
      filtered = filtered.filter(item => 
        item.priority === filters.priority
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(item => 
        item.tags && item.tags.some(tag => filters.tags.includes(tag))
      );
    }

    if (filters.author) {
      filtered = filtered.filter(item => 
        item.bookData?.authorName?.toLowerCase().includes(filters.author.toLowerCase())
      );
    }

    if (filters.genre) {
      filtered = filtered.filter(item => 
        item.bookData?.genre?.toLowerCase().includes(filters.genre.toLowerCase())
      );
    }

    return filtered;
  }, [wishlistItems]);

  // Real-time wishlist subscription
  useEffect(() => {
    if (!mountedRef.current) return;

    const userId = getCurrentUserId();
    
    try {
      const unsubscribe = enhancedWishlistService.subscribeToWishlist(userId, (result) => {
        if (mountedRef.current) {
          setWishlistItems(result.documents);
          calculateTotals(result.documents);
          setLoading(false);
          setError(null);
        }
      });

      unsubscribeRef.current = unsubscribe;

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
      };
    } catch (err) {
      console.error('Error setting up wishlist subscription:', err);
      setError(err.message);
      // Fallback to manual loading
      loadWishlistItems();
    }
  }, [getCurrentUserId, calculateTotals, loadWishlistItems]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (mountedRef.current) {
        // Reload wishlist when auth state changes
        loadWishlistItems();
      }
    });

    return unsubscribeAuth;
  }, [loadWishlistItems]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for wishlist events
  useEffect(() => {
    const handleWishlistEvent = (event) => {
      console.log('Wishlist event:', event.type, event.detail);
      
      // Show notifications for specific events
      if (event.type === WishlistEvents.PRICE_CHANGED) {
        const { oldPrice, newPrice, bookId } = event.detail;
        const item = wishlistItems.find(item => item.bookId === bookId);
        
        if (item && newPrice < oldPrice) {
          toastMessages.success(
            `${item.bookData?.title} narxi tushdi: ${oldPrice.toLocaleString()} → ${newPrice.toLocaleString()} so'm`
          );
        }
      }

      if (event.type === WishlistEvents.BACK_IN_STOCK) {
        const { bookId } = event.detail;
        const item = wishlistItems.find(item => item.bookId === bookId);
        
        if (item) {
          toastMessages.success(`${item.bookData?.title} yana mavjud!`);
        }
      }
    };

    window.addEventListener(WishlistEvents.ITEM_ADDED, handleWishlistEvent);
    window.addEventListener(WishlistEvents.ITEM_UPDATED, handleWishlistEvent);
    window.addEventListener(WishlistEvents.ITEM_REMOVED, handleWishlistEvent);
    window.addEventListener(WishlistEvents.PRICE_CHANGED, handleWishlistEvent);
    window.addEventListener(WishlistEvents.BACK_IN_STOCK, handleWishlistEvent);

    return () => {
      window.removeEventListener(WishlistEvents.ITEM_ADDED, handleWishlistEvent);
      window.removeEventListener(WishlistEvents.ITEM_UPDATED, handleWishlistEvent);
      window.removeEventListener(WishlistEvents.ITEM_REMOVED, handleWishlistEvent);
      window.removeEventListener(WishlistEvents.PRICE_CHANGED, handleWishlistEvent);
      window.removeEventListener(WishlistEvents.BACK_IN_STOCK, handleWishlistEvent);
    };
  }, [wishlistItems]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    // Data
    wishlistItems,
    loading,
    error,
    wishlistCount,
    totalValue,
    isOnline,

    // Actions
    addToWishlist,
    removeFromWishlist,
    updateWishlistItem,
    updatePriority,
    updateNotes,
    updateTags,
    updateTargetPrice,
    updateNotificationPreferences,

    // Utilities
    isInWishlist,
    getWishlistItem,
    getWishlistStats,
    getItemsByPriority,
    getItemsByStatus,
    getPriceDroppedItems,
    getBackInStockItems,
    sortWishlistItems,
    filterWishlistItems,
    refresh: loadWishlistItems
  };
};

export default useEnhancedWishlist;