// useAnalytics Hook - Real-time analytics data management
import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsService from '../services/AnalyticsService';

/**
 * Custom hook for real-time analytics data
 */
export const useAnalytics = (options = {}) => {
  const {
    enableRealTime = true,
    refreshInterval = 30000, // 30 seconds
    dateRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date()
    }
  } = options;

  const [analytics, setAnalytics] = useState({
    orders: {
      todayOrdersCount: 0,
      pendingOrdersCount: 0,
      completedOrdersCount: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      recentOrders: [],
      lastUpdated: null
    },
    sales: {
      totalRevenue: 0,
      todayRevenue: 0,
      todaySalesCount: 0,
      averageOrderValue: 0,
      hourlySales: [],
      topSellingBooks: [],
      lastUpdated: null
    },
    inventory: {
      totalBooks: 0,
      inStockCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalStockValue: 0,
      lowStockBooks: [],
      lastUpdated: null
    },
    customers: {
      newCustomers: 0,
      totalCustomers: 0,
      topCustomers: [],
      customerGrowth: [],
      lastUpdated: null
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribesRef = useRef([]);

  // Setup real-time listeners
  const setupRealTimeListeners = useCallback(() => {
    if (!enableRealTime) return;

    try {
      // Orders listener
      const ordersUnsubscribe = analyticsService.subscribeToOrderUpdates((orderStats) => {
        if (orderStats.error) {
          setError(orderStats.error);
          return;
        }
        
        setAnalytics(prev => ({
          ...prev,
          orders: orderStats
        }));
        setError(null);
      });

      // Sales listener
      const salesUnsubscribe = analyticsService.subscribeToSalesUpdates((salesStats) => {
        if (salesStats.error) {
          setError(salesStats.error);
          return;
        }
        
        setAnalytics(prev => ({
          ...prev,
          sales: salesStats
        }));
        setError(null);
      });

      // Inventory listener
      const inventoryUnsubscribe = analyticsService.subscribeToInventoryUpdates((inventoryStats) => {
        if (inventoryStats.error) {
          setError(inventoryStats.error);
          return;
        }
        
        setAnalytics(prev => ({
          ...prev,
          inventory: inventoryStats
        }));
        setError(null);
      });

      unsubscribesRef.current = [ordersUnsubscribe, salesUnsubscribe, inventoryUnsubscribe];
      setLoading(false);

    } catch (error) {
      console.error('Error setting up real-time listeners:', error);
      setError(error.message);
      setLoading(false);
    }
  }, [enableRealTime]);

  // Load historical analytics data
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load sales analytics
      const salesAnalytics = await analyticsService.getSalesAnalytics(dateRange);
      
      // Load customer analytics
      const customerAnalytics = await analyticsService.getCustomerAnalytics(dateRange);

      setAnalytics(prev => ({
        ...prev,
        sales: {
          ...prev.sales,
          ...salesAnalytics,
          lastUpdated: new Date()
        },
        customers: {
          ...prev.customers,
          ...customerAnalytics,
          lastUpdated: new Date()
        }
      }));

      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setError(error.message);
      setLoading(false);
    }
  }, [dateRange]);

  // Refresh analytics data
  const refreshAnalytics = useCallback(async () => {
    await loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Setup listeners and load data on mount
  useEffect(() => {
    setupRealTimeListeners();
    loadAnalyticsData();

    // Cleanup on unmount
    return () => {
      unsubscribesRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribesRef.current = [];
    };
  }, [setupRealTimeListeners, loadAnalyticsData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      loadAnalyticsData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, loadAnalyticsData]);

  return {
    analytics,
    loading,
    error,
    refreshAnalytics,
    isRealTime: enableRealTime
  };
};

/**
 * Hook for specific analytics data
 */
export const useOrderAnalytics = (options = {}) => {
  const { analytics, loading, error, refreshAnalytics } = useAnalytics(options);
  
  return {
    orders: analytics.orders,
    loading,
    error,
    refresh: refreshAnalytics
  };
};

export const useSalesAnalytics = (options = {}) => {
  const { analytics, loading, error, refreshAnalytics } = useAnalytics(options);
  
  return {
    sales: analytics.sales,
    loading,
    error,
    refresh: refreshAnalytics
  };
};

export const useInventoryAnalytics = (options = {}) => {
  const { analytics, loading, error, refreshAnalytics } = useAnalytics(options);
  
  return {
    inventory: analytics.inventory,
    loading,
    error,
    refresh: refreshAnalytics
  };
};

export const useCustomerAnalytics = (options = {}) => {
  const { analytics, loading, error, refreshAnalytics } = useAnalytics(options);
  
  return {
    customers: analytics.customers,
    loading,
    error,
    refresh: refreshAnalytics
  };
};

export default useAnalytics;