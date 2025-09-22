import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import useEnhancedCart from '../useEnhancedCart';
import firebaseService from '../../services/FirebaseService';
import { getCurrentUserId } from '../../utils/firebaseHelpers';
import { toastMessages } from '../../utils/toastUtils';

// Mock dependencies
vi.mock('../../services/FirebaseService');
vi.mock('../../utils/firebaseHelpers');
vi.mock('../../utils/toastUtils');
vi.mock('../../firebaseConfig', () => ({
  db: {},
  COLLECTIONS: {
    CART: 'cart',
    WISHLIST: 'wishlist'
  }
}));

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', () => ({
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(),
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
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('useEnhancedCart', () => {
  const mockUserId = 'test-user-123';
  const mockCartItems = [
    {
      id: 'cart-1',
      bookId: 'book-1',
      quantity: 2,
      savedForLater: false,
      bookData: {
        title: 'Test Book 1',
        price: 50000,
        isAvailable: true,
        images: { main: 'image1.jpg' }
      }
    },
    {
      id: 'cart-2',
      bookId: 'book-2',
      quantity: 1,
      savedForLater: true,
      bookData: {
        title: 'Test Book 2',
        price: 75000,
        isAvailable: true,
        images: { main: 'image2.jpg' }
      }
    }
  ];

  const mockWishlistItems = [
    {
      id: 'wish-1',
      bookId: 'book-3',
      userId: mockUserId,
      bookData: {
        title: 'Wishlist Book 1',
        price: 60000,
        isAvailable: true
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockReturnValue(mockUserId);
    
    // Mock firebaseService methods
    firebaseService.subscribeToCart = vi.fn((userId, callback) => {
      callback({ documents: mockCartItems });
      return vi.fn(); // unsubscribe function
    });

    firebaseService.updateCartItem = vi.fn();
    firebaseService.removeFromCart = vi.fn();
    firebaseService.addToWishlist = vi.fn();
    firebaseService.removeFromWishlist = vi.fn();
    firebaseService.getBookById = vi.fn();

    // Mock onSnapshot for wishlist
    const { onSnapshot } = require('firebase/firestore');
    onSnapshot.mockImplementation((query, callback) => {
      callback({
        forEach: (fn) => {
          mockWishlistItems.forEach(item => {
            fn({
              id: item.id,
              data: () => item
            });
          });
        }
      });
      return vi.fn(); // unsubscribe function
    });

    // Mock localStorage
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useEnhancedCart());
      
      expect(result.current.loading).toBe(true);
      expect(result.current.cartItems).toEqual([]);
      expect(result.current.savedItems).toEqual([]);
      expect(result.current.wishlistItems).toEqual([]);
    });

    it('should load cart items when user is authenticated', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.savedItems).toHaveLength(1);
      expect(result.current.cartItems[0].id).toBe('cart-1');
      expect(result.current.savedItems[0].id).toBe('cart-2');
    });

    it('should load wishlist items', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.wishlistItems).toHaveLength(1);
      });

      expect(result.current.wishlistItems[0].id).toBe('wish-1');
    });
  });

  describe('cart operations', () => {
    it('should update item quantity', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateQuantity('cart-1', 3);
      });

      expect(firebaseService.updateCartItem).toHaveBeenCalledWith('cart-1', 3);
    });

    it('should not update quantity to less than 1', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateQuantity('cart-1', 0);
      });

      expect(firebaseService.updateCartItem).not.toHaveBeenCalled();
    });

    it('should remove item from cart', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeItem('cart-1');
      });

      expect(firebaseService.removeFromCart).toHaveBeenCalledWith('cart-1');
    });

    it('should save item for later', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { updateDoc } = require('firebase/firestore');

      await act(async () => {
        await result.current.saveForLater('cart-1');
      });

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should move item to cart', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { updateDoc } = require('firebase/firestore');

      await act(async () => {
        await result.current.moveToCart('cart-2');
      });

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('wishlist operations', () => {
    it('should add item to wishlist', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addToWishlist('book-4');
      });

      expect(firebaseService.addToWishlist).toHaveBeenCalledWith(mockUserId, 'book-4');
      expect(toastMessages.success).toHaveBeenCalledWith('Kitob sevimlilarga qo\'shildi');
    });

    it('should remove item from wishlist', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeFromWishlist('book-3');
      });

      expect(firebaseService.removeFromWishlist).toHaveBeenCalledWith(mockUserId, 'book-3');
      expect(toastMessages.success).toHaveBeenCalledWith('Kitob sevimlilardan o\'chirildi');
    });

    it('should check if item is in wishlist', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.wishlistItems).toHaveLength(1);
      });

      expect(result.current.isInWishlist('book-3')).toBe(true);
      expect(result.current.isInWishlist('book-999')).toBe(false);
    });
  });

  describe('computed values', () => {
    it('should calculate cart total correctly', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Only active cart items (not saved for later)
      expect(result.current.cartTotal).toBe(100000); // 50000 * 2
    });

    it('should calculate cart count correctly', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.cartCount).toBe(2); // Only active items quantity
    });

    it('should calculate saved total correctly', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.savedTotal).toBe(75000); // 75000 * 1
    });

    it('should calculate wishlist total correctly', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.wishlistItems).toHaveLength(1);
      });

      expect(result.current.wishlistTotal).toBe(60000);
    });
  });

  describe('cart statistics', () => {
    it('should return correct cart statistics', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const stats = result.current.getCartStats();

      expect(stats).toEqual({
        totalItems: 2, // cart + saved
        activeItems: 1,
        savedItems: 1,
        wishlistItems: 1,
        totalValue: 175000, // cart + saved
        cartValue: 100000,
        savedValue: 75000,
        wishlistValue: 60000,
        totalQuantity: 2,
        averageItemPrice: 100000 // cartTotal / cartItems.length
      });
    });
  });

  describe('offline functionality', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
    });

    it('should handle offline updates', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isOnline).toBe(false);

      await act(async () => {
        await result.current.updateQuantity('cart-1', 3);
      });

      // Should update locally but not call Firebase
      expect(firebaseService.updateCartItem).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should queue offline changes', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeItem('cart-1');
      });

      // Should save offline change to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offlineCartChanges',
        expect.stringContaining('remove')
      );
    });
  });

  describe('bulk operations', () => {
    it('should bulk update quantities', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { writeBatch } = require('firebase/firestore');
      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn()
      };
      writeBatch.mockReturnValue(mockBatch);

      const updates = [
        { cartItemId: 'cart-1', quantity: 3 },
        { cartItemId: 'cart-2', quantity: 2 }
      ];

      await act(async () => {
        await result.current.bulkUpdateQuantities(updates);
      });

      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should bulk remove items', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { writeBatch } = require('firebase/firestore');
      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn()
      };
      writeBatch.mockReturnValue(mockBatch);

      const itemIds = ['cart-1', 'cart-2'];

      await act(async () => {
        await result.current.bulkRemoveItems(itemIds);
      });

      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('cart sharing', () => {
    it('should generate share token', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { addDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue({ id: 'share-123' });

      let shareUrl;
      await act(async () => {
        shareUrl = await result.current.generateShareToken();
      });

      expect(addDoc).toHaveBeenCalled();
      expect(shareUrl).toContain('/shared-cart/share-123');
    });
  });

  describe('error handling', () => {
    it('should handle Firebase errors gracefully', async () => {
      firebaseService.updateCartItem.mockRejectedValue(new Error('Firebase error'));

      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateQuantity('cart-1', 3);
        })
      ).rejects.toThrow('Firebase error');
    });

    it('should handle wishlist errors gracefully', async () => {
      firebaseService.addToWishlist.mockRejectedValue(new Error('Wishlist error'));

      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.addToWishlist('book-4');
        })
      ).rejects.toThrow('Wishlist error');

      expect(toastMessages.error).toHaveBeenCalledWith('Wishlist error');
    });
  });

  describe('localStorage persistence', () => {
    it('should save cart data to localStorage', async () => {
      const { result } = renderHook(() => useEnhancedCart());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `cart_${mockUserId}`,
        expect.stringContaining('active')
      );
    });

    it('should load cart data from localStorage when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const savedCartData = JSON.stringify({
        active: [mockCartItems[0]],
        saved: [mockCartItems[1]],
        timestamp: Date.now()
      });

      localStorageMock.getItem.mockReturnValue(savedCartData);

      const { result } = renderHook(() => useEnhancedCart());

      expect(localStorageMock.getItem).toHaveBeenCalledWith(`cart_${mockUserId}`);
    });
  });
});