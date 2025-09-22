import { useState, useEffect, useRef, useCallback } from 'react';
import { onSnapshot, query, limit, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';

// Optimized Firebase hook with caching and cleanup
export const useOptimizedFirebase = (collectionName, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const unsubscribeRef = useRef(null);
  const cacheRef = useRef(new Map());
  const debounceRef = useRef(null);
  
  const {
    enableRealtime = true,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    debounceMs = 300,
    maxItems = 100,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    whereConditions = [],
    enablePagination = false,
    pageSize = 20
  } = options;

  // Create cache key from options
  const getCacheKey = useCallback(() => {
    return JSON.stringify({
      collectionName,
      maxItems,
      orderByField,
      orderDirection,
      whereConditions
    });
  }, [collectionName, maxItems, orderByField, orderDirection, whereConditions]);

  // Check if cached data is still valid
  const isCacheValid = useCallback((cacheEntry) => {
    if (!cacheEntry) return false;
    return Date.now() - cacheEntry.timestamp < cacheTimeout;
  }, [cacheTimeout]);

  // Get data from cache
  const getCachedData = useCallback(() => {
    const cacheKey = getCacheKey();
    const cacheEntry = cacheRef.current.get(cacheKey);
    
    if (isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }
    
    return null;
  }, [getCacheKey, isCacheValid]);

  // Set data to cache
  const setCachedData = useCallback((newData) => {
    const cacheKey = getCacheKey();
    cacheRef.current.set(cacheKey, {
      data: newData,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (cacheRef.current.size > 10) {
      const oldestKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(oldestKey);
    }
  }, [getCacheKey]);

  // Build Firestore query
  const buildQuery = useCallback(() => {
    let q = query(db, collectionName);
    
    // Add where conditions
    whereConditions.forEach(condition => {
      q = query(q, where(condition.field, condition.operator, condition.value));
    });
    
    // Add ordering
    q = query(q, orderBy(orderByField, orderDirection));
    
    // Add limit
    q = query(q, limit(maxItems));
    
    return q;
  }, [collectionName, whereConditions, orderByField, orderDirection, maxItems]);

  // Debounced data update
  const debouncedUpdate = useCallback((newData) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      setData(newData);
      setCachedData(newData);
      setLastUpdate(Date.now());
      setLoading(false);
    }, debounceMs);
  }, [debounceMs, setCachedData]);

  // Setup Firebase listener
  const setupListener = useCallback(() => {
    if (!enableRealtime) return;
    
    try {
      const q = buildQuery();
      
      unsubscribeRef.current = onSnapshot(q, 
        (snapshot) => {
          const newData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            _timestamp: doc.data().createdAt?.toDate() || new Date()
          }));
          
          debouncedUpdate(newData);
          setError(null);
        },
        (err) => {
          console.error('Firebase listener error:', err);
          setError(err);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up Firebase listener:', err);
      setError(err);
      setLoading(false);
    }
  }, [enableRealtime, buildQuery, debouncedUpdate]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      setLastUpdate(Date.now());
      return;
    }
    
    // If real-time is enabled, the listener will handle data loading
    if (enableRealtime) {
      setupListener();
    } else {
      // Load data once without real-time updates
      try {
        const q = buildQuery();
        const snapshot = await getDocs(q);
        const newData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          _timestamp: doc.data().createdAt?.toDate() || new Date()
        }));
        
        setData(newData);
        setCachedData(newData);
        setLastUpdate(Date.now());
        setError(null);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
  }, [getCachedData, enableRealtime, setupListener, buildQuery, setCachedData]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  // Refresh data manually
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Clear cache
    const cacheKey = getCacheKey();
    cacheRef.current.delete(cacheKey);
    
    // Reload data
    await loadInitialData();
  }, [getCacheKey, loadInitialData]);

  // Add new item optimistically
  const addOptimistic = useCallback((newItem) => {
    setData(prevData => [
      { ...newItem, id: `temp-${Date.now()}`, _optimistic: true },
      ...prevData
    ]);
  }, []);

  // Update item optimistically
  const updateOptimistic = useCallback((itemId, updates) => {
    setData(prevData => 
      prevData.map(item => 
        item.id === itemId 
          ? { ...item, ...updates, _optimistic: true }
          : item
      )
    );
  }, []);

  // Remove item optimistically
  const removeOptimistic = useCallback((itemId) => {
    setData(prevData => prevData.filter(item => item.id !== itemId));
  }, []);

  // Initialize
  useEffect(() => {
    loadInitialData();
    return cleanup;
  }, [loadInitialData, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh,
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    // Utility functions
    isStale: lastUpdate && Date.now() - lastUpdate > cacheTimeout,
    isEmpty: !loading && data.length === 0,
    hasError: !!error
  };
};

// Specialized hooks for common collections
export const useOptimizedOrders = (options = {}) => {
  return useOptimizedFirebase('orders', {
    orderByField: 'createdAt',
    orderDirection: 'desc',
    maxItems: 50,
    ...options
  });
};

export const useOptimizedInventory = (options = {}) => {
  return useOptimizedFirebase('books', {
    orderByField: 'title',
    orderDirection: 'asc',
    maxItems: 100,
    ...options
  });
};

export const useOptimizedCustomers = (options = {}) => {
  return useOptimizedFirebase('customers', {
    orderByField: 'createdAt',
    orderDirection: 'desc',
    maxItems: 50,
    ...options
  });
};

export const useOptimizedNotifications = (options = {}) => {
  return useOptimizedFirebase('notifications', {
    orderByField: 'timestamp',
    orderDirection: 'desc',
    maxItems: 20,
    cacheTimeout: 1 * 60 * 1000, // 1 minute for notifications
    ...options
  });
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCountRef.current += 1;
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCountRef.current} times. Time since last render: ${timeSinceLastRender}ms`);
    }
    
    lastRenderTime.current = currentTime;
  });
  
  return {
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTime.current
  };
};

export default useOptimizedFirebase;