// Wishlist hook - ehtiyotkorlik bilan qo'shildi
// Mavjud kodga hech qanday ta'sir qilmaydi

import { useState, useEffect, useCallback } from 'react';
import { databases, ID, Query } from '../appwriteConfig';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const WISHLIST_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_WISHLIST_ID || 'wishlist';

export const useWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get current user ID
  const getCurrentUserId = () => {
    return localStorage.getItem('currentUserId') || 
           localStorage.getItem('appwriteGuestId') || 
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

  // Load wishlist from database
  const loadWishlistFromDatabase = useCallback(async () => {
    try {
      const userId = getCurrentUserId();
      const response = await databases.listDocuments(
        DATABASE_ID,
        WISHLIST_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );
      
      const dbItems = response.documents.map(doc => ({
        bookId: doc.bookId,
        bookTitle: doc.bookTitle,
        bookAuthor: doc.bookAuthor,
        bookImage: doc.bookImage,
        bookPrice: doc.bookPrice,
        userId: doc.userId,
        addedAt: doc.addedAt
      }));
      
      setWishlistItems(dbItems);
      // Also save to localStorage as backup
      saveLocalWishlist(dbItems);
      
    } catch (error) {
      console.error('Failed to load wishlist from database:', error);
      // Fallback to localStorage
      const localItems = loadLocalWishlist();
      setWishlistItems(localItems);
    }
  }, [getCurrentUserId, loadLocalWishlist, saveLocalWishlist]);

  // Load wishlist on mount
  useEffect(() => {
    loadWishlistFromDatabase();
  }, [loadWishlistFromDatabase]);

  // Add to wishlist
  const addToWishlist = useCallback(async (book) => {
    try {
      setLoading(true);
      
      // Check if already in wishlist
      const isAlreadyInWishlist = wishlistItems.some(item => item.bookId === book.$id);
      if (isAlreadyInWishlist) {
        return { success: false, message: 'Kitob allaqachon sevimlilar ro\'yxatida' };
      }

      const wishlistItem = {
        bookId: book.$id,
        bookTitle: book.title,
        bookAuthor: book.authorName || book.author?.name || '',
        bookImage: book.imageUrl,
        bookPrice: book.price,
        userId: getCurrentUserId(),
        addedAt: new Date().toISOString()
      };

      // Save to database
      try {
        await databases.createDocument(
          DATABASE_ID,
          WISHLIST_COLLECTION_ID,
          ID.unique(),
          wishlistItem
        );
        console.log('Wishlist item saved to database');
      } catch (dbError) {
        console.error('Database save failed:', dbError);
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

      // Remove from database
      try {
        const userId = getCurrentUserId();
        const response = await databases.listDocuments(
          DATABASE_ID,
          WISHLIST_COLLECTION_ID,
          [
            Query.equal('bookId', bookId),
            Query.equal('userId', userId)
          ]
        );

        if (response.documents.length > 0) {
          await databases.deleteDocument(
            DATABASE_ID,
            WISHLIST_COLLECTION_ID,
            response.documents[0].$id
          );
          console.log('Wishlist item removed from database');
        }
      } catch (dbError) {
        console.error('Database remove failed:', dbError);
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