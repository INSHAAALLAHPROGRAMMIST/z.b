// Wishlist hook - ehtiyotkorlik bilan qo'shildi
// Mavjud kodga hech qanday ta'sir qilmaydi

import { useState, useEffect, useCallback } from 'react';
import { db, COLLECTIONS } from '../firebaseConfig';
import { collection, addDoc, deleteDoc, getDocs, query, where, doc } from 'firebase/firestore';

// Firebase collections
const WISHLIST_COLLECTION = COLLECTIONS.WISHLIST;

export const useWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get current user ID (Firebase Auth)
  const getCurrentUserId = () => {
    return localStorage.getItem('currentUserId') || 
           localStorage.getItem('firebaseGuestId') || 
           'guest';
  };

  // Load wishlist from localStorage (fallback)
  const loadLocalWishlist = useCallback(() => {
    try {
      const userId = getCurrentUserId();
      const stored = localStorage.getItem(`wishlist_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading local wishlist:', error);
      return [];
    }
  }, []);

  // Save to localStorage (fallback)
  const saveLocalWishlist = useCallback((items) => {
    try {
      const userId = getCurrentUserId();
      localStorage.setItem(`wishlist_${userId}`, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving local wishlist:', error);
    }
  }, []);

  // Load wishlist from Firebase
  const loadWishlistFromDatabase = useCallback(async () => {
    try {
      const userId = getCurrentUserId();
      const q = query(
        collection(db, WISHLIST_COLLECTION),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const dbItems = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        dbItems.push({
          id: doc.id,
          bookId: data.bookId,
          bookTitle: data.bookTitle,
          bookAuthor: data.bookAuthor,
          bookImage: data.bookImage,
          bookPrice: data.bookPrice,
          userId: data.userId,
          addedAt: data.addedAt
        });
      });
      
      setWishlistItems(dbItems);
      // Also save to localStorage as backup
      saveLocalWishlist(dbItems);
      
    } catch (error) {
      console.error('Failed to load wishlist from Firebase:', error);
      // Fallback to localStorage
      const localItems = loadLocalWishlist();
      setWishlistItems(localItems);
    }
  }, [loadLocalWishlist, saveLocalWishlist]);

  // Load wishlist on mount
  useEffect(() => {
    loadWishlistFromDatabase();
  }, [loadWishlistFromDatabase]);

  // Add to wishlist
  const addToWishlist = useCallback(async (book) => {
    try {
      setLoading(true);
      
      // Check if already in wishlist
      const isAlreadyInWishlist = wishlistItems.some(item => item.bookId === (book.id || book.$id));
      if (isAlreadyInWishlist) {
        return { success: false, message: 'Kitob allaqachon sevimlilar ro\'yxatida' };
      }

      const wishlistItem = {
        bookId: book.id || book.$id,
        bookTitle: book.title,
        bookAuthor: book.authorName || book.author?.name || '',
        bookImage: book.imageUrl,
        bookPrice: book.price,
        userId: getCurrentUserId(),
        addedAt: new Date().toISOString()
      };

      // Save to Firebase
      try {
        await addDoc(collection(db, WISHLIST_COLLECTION), wishlistItem);
        console.log('Wishlist item saved to Firebase');
      } catch (dbError) {
        console.error('Firebase save failed:', dbError);
        // Continue with localStorage as fallback
      }

      // Update local state and localStorage
      const newItems = [...wishlistItems, wishlistItem];
      setWishlistItems(newItems);
      saveLocalWishlist(newItems);

      return { success: true, message: 'Kitob sevimlilarga qo\'shildi' };

    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return { success: false, message: 'Xatolik yuz berdi' };
    } finally {
      setLoading(false);
    }
  }, [wishlistItems, saveLocalWishlist]);

  // Remove from wishlist
  const removeFromWishlist = useCallback(async (bookId) => {
    try {
      setLoading(true);

      // Remove from Firebase
      try {
        const userId = getCurrentUserId();
        const q = query(
          collection(db, WISHLIST_COLLECTION),
          where('bookId', '==', bookId),
          where('userId', '==', userId)
        );
        
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(async (document) => {
          await deleteDoc(doc(db, WISHLIST_COLLECTION, document.id));
          console.log('Wishlist item removed from Firebase');
        });
      } catch (dbError) {
        console.error('Firebase remove failed:', dbError);
        // Continue with localStorage as fallback
      }

      // Update local state and localStorage
      const newItems = wishlistItems.filter(item => item.bookId !== bookId);
      setWishlistItems(newItems);
      saveLocalWishlist(newItems);

      return { success: true, message: 'Kitob sevimlilardan olib tashlandi' };

    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return { success: false, message: 'Xatolik yuz berdi' };
    } finally {
      setLoading(false);
    }
  }, [wishlistItems, saveLocalWishlist]);

  // Check if book is in wishlist
  const isInWishlist = useCallback((bookId) => {
    return wishlistItems.some(item => item.bookId === bookId);
  }, [wishlistItems]);

  // Get wishlist count
  const wishlistCount = wishlistItems.length;

  return {
    wishlistItems,
    wishlistCount,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist
  };
};