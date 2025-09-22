// useFirebaseCart Hook - Cart bilan ishlash uchun
import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../firebaseConfig';
import firebaseService from '../services/FirebaseService';
import { toastMessages } from '../utils/toastUtils';

const useFirebaseCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

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

  // Calculate cart totals
  const calculateTotals = useCallback((items) => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + (item.quantity * item.priceAtTimeOfAdd), 0);
    
    setCartCount(count);
    setCartTotal(total);
  }, []);

  // Load cart items
  const loadCartItems = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const userId = getCurrentUserId();
      const result = await firebaseService.getCartItems(userId);

      if (!mountedRef.current) return;

      setCartItems(result.documents);
      calculateTotals(result.documents);
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('Error loading cart items:', err);
      setError(err.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [getCurrentUserId, calculateTotals]);

  // Add item to cart
  const addToCart = useCallback(async (bookId, quantity = 1) => {
    try {
      const userId = getCurrentUserId();
      const result = await firebaseService.addToCart(userId, bookId, quantity);
      
      // Reload cart items
      await loadCartItems();
      
      // Dispatch global cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      return result;
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError(err.message);
      toastMessages.cartError();
      throw err;
    }
  }, [getCurrentUserId, loadCartItems]);

  // Update cart item quantity
  const updateQuantity = useCallback(async (cartItemId, quantity) => {
    try {
      const result = await firebaseService.updateCartItem(cartItemId, quantity);
      
      // Reload cart items
      await loadCartItems();
      
      // Dispatch global cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      return result;
    } catch (err) {
      console.error('Error updating cart quantity:', err);
      setError(err.message);
      toastMessages.cartError();
      throw err;
    }
  }, [loadCartItems]);

  // Remove item from cart
  const removeItem = useCallback(async (cartItemId) => {
    try {
      const result = await firebaseService.removeFromCart(cartItemId);
      
      // Reload cart items
      await loadCartItems();
      
      // Dispatch global cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      return result;
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError(err.message);
      toastMessages.cartError();
      throw err;
    }
  }, [loadCartItems]);

  // Clear entire cart
  const clearCart = useCallback(async () => {
    try {
      const userId = getCurrentUserId();
      const result = await firebaseService.clearCart(userId);
      
      // Reload cart items
      await loadCartItems();
      
      // Dispatch global cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      return result;
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError(err.message);
      toastMessages.cartError();
      throw err;
    }
  }, [getCurrentUserId, loadCartItems]);

  // Get quantity of specific book in cart
  const getBookQuantity = useCallback((bookId) => {
    const cartItem = cartItems.find(item => item.bookId === bookId);
    return cartItem ? cartItem.quantity : 0;
  }, [cartItems]);

  // Check if book is in cart
  const isInCart = useCallback((bookId) => {
    return cartItems.some(item => item.bookId === bookId);
  }, [cartItems]);

  // Real-time cart subscription
  useEffect(() => {
    if (!mountedRef.current) return;

    const userId = getCurrentUserId();
    
    try {
      const unsubscribe = firebaseService.subscribeToCart(userId, (result) => {
        if (mountedRef.current) {
          setCartItems(result.documents);
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
      console.error('Error setting up cart subscription:', err);
      setError(err.message);
      // Fallback to manual loading
      loadCartItems();
    }
  }, [getCurrentUserId, calculateTotals, loadCartItems]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (mountedRef.current) {
        // Reload cart when auth state changes
        loadCartItems();
      }
    });

    return unsubscribeAuth;
  }, [loadCartItems]);

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
    cartItems,
    loading,
    error,
    cartCount,
    cartTotal,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    getBookQuantity,
    isInCart,
    refresh: loadCartItems
  };
};

export default useFirebaseCart;