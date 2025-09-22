// useFirebaseBooks Hook - Books bilan ishlash uchun
import { useState, useEffect, useCallback, useRef } from 'react';
import firebaseService from '../services/FirebaseService';

const useFirebaseBooks = (options = {}) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  
  const {
    limitCount = 50,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    filters = {},
    realTime = false,
    autoLoad = true
  } = options;

  const unsubscribeRef = useRef(null);
  const mountedRef = useRef(true);

  // Load books function
  const loadBooks = useCallback(async (reset = false) => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const queryOptions = {
        limitCount,
        orderByField,
        orderDirection,
        filters,
        startAfterDoc: reset ? null : lastDoc
      };

      const result = await firebaseService.getBooks(queryOptions);

      if (!mountedRef.current) return;

      if (reset) {
        setBooks(result.documents);
      } else {
        setBooks(prev => [...prev, ...result.documents]);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('Error loading books:', err);
      setError(err.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [limitCount, orderByField, orderDirection, filters, lastDoc]);

  // Load more books
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadBooks(false);
    }
  }, [loading, hasMore, loadBooks]);

  // Refresh books
  const refresh = useCallback(() => {
    setLastDoc(null);
    loadBooks(true);
  }, [loadBooks]);

  // Real-time subscription
  useEffect(() => {
    if (!realTime || !mountedRef.current) return;

    try {
      const unsubscribe = firebaseService.subscribeToBooks((result) => {
        if (mountedRef.current) {
          setBooks(result.documents);
          setLoading(false);
          setError(null);
        }
      }, { filters });

      unsubscribeRef.current = unsubscribe;

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
      };
    } catch (err) {
      console.error('Error setting up real-time subscription:', err);
      setError(err.message);
    }
  }, [realTime, filters]);

  // Initial load
  useEffect(() => {
    if (autoLoad && !realTime) {
      loadBooks(true);
    }
  }, [autoLoad, realTime, loadBooks]);

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
    books,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    refetch: refresh
  };
};

export default useFirebaseBooks;