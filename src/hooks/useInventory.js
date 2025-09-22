import { useState, useEffect, useRef } from 'react';
import inventoryService from '../services/InventoryService';

/**
 * Custom hook for inventory management
 */
export const useInventory = (options = {}) => {
  const [stockData, setStockData] = useState({
    totalBooks: 0,
    categories: {
      inStock: [],
      lowStock: [],
      outOfStock: [],
      preOrder: [],
      discontinued: []
    },
    statistics: {
      totalValue: 0,
      totalStock: 0,
      averageStock: 0
    },
    alerts: [],
    lastUpdated: null
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Subscribe to stock updates
    const unsubscribe = inventoryService.subscribeToStockUpdates((data) => {
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setStockData(data);
      setError(null);
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const updateStock = async (bookId, newStock, reason = '') => {
    try {
      await inventoryService.updateBookStock(bookId, newStock, reason, 'admin');
      return { success: true };
    } catch (error) {
      console.error('Stock update error:', error);
      return { success: false, error: error.message };
    }
  };

  const bulkUpdateStock = async (updates) => {
    try {
      const result = await inventoryService.bulkUpdateStock(updates, 'admin');
      return result;
    } catch (error) {
      console.error('Bulk stock update error:', error);
      return { success: false, error: error.message };
    }
  };

  const setAlertLevels = async (bookId, minStockLevel, maxStockLevel = null) => {
    try {
      await inventoryService.setStockAlertLevels(bookId, minStockLevel, maxStockLevel);
      return { success: true };
    } catch (error) {
      console.error('Set alert levels error:', error);
      return { success: false, error: error.message };
    }
  };

  const generateReport = async (reportOptions = {}) => {
    try {
      const report = await inventoryService.generateInventoryReport(reportOptions);
      return { success: true, data: report };
    } catch (error) {
      console.error('Generate report error:', error);
      return { success: false, error: error.message };
    }
  };

  const getStockHistory = async (bookId, limit = 50) => {
    try {
      const history = await inventoryService.getStockHistory(bookId, limit);
      return { success: true, data: history };
    } catch (error) {
      console.error('Get stock history error:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    stockData,
    loading,
    error,
    updateStock,
    bulkUpdateStock,
    setAlertLevels,
    generateReport,
    getStockHistory
  };
};

/**
 * Custom hook for stock alerts
 */
export const useStockAlerts = (options = {}) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Subscribe to low stock alerts
    const unsubscribe = inventoryService.subscribeToLowStockAlerts((data) => {
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setAlerts(data.alerts || []);
      setError(null);
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const updateStock = async (bookId, newStock, reason = '') => {
    try {
      await inventoryService.updateBookStock(bookId, newStock, reason, 'admin');
      return { success: true };
    } catch (error) {
      console.error('Stock update error:', error);
      return { success: false, error: error.message };
    }
  };

  const setAlertLevel = async (bookId, minStockLevel) => {
    try {
      await inventoryService.setStockAlertLevels(bookId, minStockLevel);
      return { success: true };
    } catch (error) {
      console.error('Set alert level error:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    alerts,
    loading,
    error,
    updateStock,
    setAlertLevel
  };
};

/**
 * Custom hook for inventory statistics
 */
export const useInventoryStats = () => {
  const { stockData, loading, error } = useInventory();

  const stats = {
    totalBooks: stockData.totalBooks,
    totalStock: stockData.statistics.totalStock,
    totalValue: stockData.statistics.totalValue,
    averageStock: stockData.statistics.averageStock,
    inStockCount: stockData.categories.inStock.length,
    lowStockCount: stockData.categories.lowStock.length,
    outOfStockCount: stockData.categories.outOfStock.length,
    alertsCount: stockData.alerts.length,
    criticalAlertsCount: stockData.alerts.filter(alert => alert.type === 'out_of_stock').length
  };

  return {
    stats,
    loading,
    error
  };
};