// Enhanced Inventory Management Service
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc,
  updateDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebaseConfig';
import { STOCK_STATUS, getStockStatus } from '../utils/inventoryUtils';

class InventoryService {
  constructor() {
    this.db = db;
    this.collections = COLLECTIONS;
    this.listeners = new Map();
  }

  // ===============================================
  // REAL-TIME STOCK MONITORING
  // ===============================================

  /**
   * Subscribe to real-time stock updates
   */
  subscribeToStockUpdates(callback) {
    const booksQuery = query(
      collection(this.db, this.collections.BOOKS),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(booksQuery, (snapshot) => {
      const books = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }));

      const stockData = this.processStockData(books);
      callback(stockData);
    }, (error) => {
      console.error('Stock updates subscription error:', error);
      callback({ error: error.message });
    });

    this.listeners.set('stock', unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to low stock alerts
   */
  subscribeToLowStockAlerts(callback) {
    const lowStockQuery = query(
      collection(this.db, this.collections.BOOKS),
      where('stockStatus', 'in', [STOCK_STATUS.LOW_STOCK, STOCK_STATUS.OUT_OF_STOCK]),
      orderBy('stock', 'asc')
    );

    const unsubscribe = onSnapshot(lowStockQuery, (snapshot) => {
      const lowStockBooks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }));

      callback({
        alerts: lowStockBooks,
        count: lowStockBooks.length,
        criticalCount: lowStockBooks.filter(book => book.stock === 0).length,
        lastUpdated: new Date()
      });
    }, (error) => {
      console.error('Low stock alerts subscription error:', error);
      callback({ error: error.message });
    });

    this.listeners.set('lowStock', unsubscribe);
    return unsubscribe;
  }

  // ===============================================
  // STOCK DATA PROCESSING
  // ===============================================

  /**
   * Process and categorize stock data
   */
  processStockData(books) {
    const stockData = {
      totalBooks: books.length,
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
        averageStock: 0,
        stockTurnover: 0
      },
      alerts: [],
      lastUpdated: new Date()
    };

    books.forEach(book => {
      const stock = book.stock || 0;
      const price = parseFloat(book.price || 0);
      const minStockLevel = book.minStockLevel || 5;

      // Calculate statistics
      stockData.statistics.totalStock += stock;
      stockData.statistics.totalValue += stock * price;

      // Categorize books
      switch (book.stockStatus) {
        case STOCK_STATUS.IN_STOCK:
          stockData.categories.inStock.push(book);
          break;
        case STOCK_STATUS.LOW_STOCK:
          stockData.categories.lowStock.push(book);
          stockData.alerts.push({
            type: 'low_stock',
            book,
            message: `${book.title} - kam qoldi (${stock} dona)`
          });
          break;
        case STOCK_STATUS.OUT_OF_STOCK:
          stockData.categories.outOfStock.push(book);
          stockData.alerts.push({
            type: 'out_of_stock',
            book,
            message: `${book.title} - tugagan`
          });
          break;
        case STOCK_STATUS.PRE_ORDER:
          stockData.categories.preOrder.push(book);
          break;
        case STOCK_STATUS.DISCONTINUED:
          stockData.categories.discontinued.push(book);
          break;
      }
    });

    // Calculate averages
    if (books.length > 0) {
      stockData.statistics.averageStock = stockData.statistics.totalStock / books.length;
    }

    return stockData;
  }

  // ===============================================
  // STOCK MANAGEMENT OPERATIONS
  // ===============================================

  /**
   * Update single book stock
   */
  async updateBookStock(bookId, newStock, reason = '', adminId = null) {
    try {
      const bookRef = doc(this.db, this.collections.BOOKS, bookId);
      const bookSnap = await getDoc(bookRef);

      if (!bookSnap.exists()) {
        throw new Error('Kitob topilmadi');
      }

      const book = bookSnap.data();
      const oldStock = book.stock || 0;
      const minStockLevel = book.minStockLevel || 5;
      const newStatus = getStockStatus(newStock, minStockLevel);

      // Update book
      await updateDoc(bookRef, {
        stock: newStock,
        stockStatus: newStatus,
        isAvailable: newStock > 0 && newStatus !== STOCK_STATUS.DISCONTINUED,
        lastRestocked: newStock > oldStock ? serverTimestamp() : book.lastRestocked,
        updatedAt: serverTimestamp()
      });

      // Log stock change
      await this.logStockChange({
        bookId,
        bookTitle: book.title,
        oldStock,
        newStock,
        reason,
        adminId,
        timestamp: serverTimestamp()
      });

      return {
        success: true,
        bookId,
        oldStock,
        newStock,
        newStatus
      };
    } catch (error) {
      console.error('Stock update error:', error);
      throw new Error(`Stock yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Bulk stock update
   */
  async bulkUpdateStock(updates, adminId = null) {
    const batch = writeBatch(this.db);
    const results = [];

    try {
      for (const update of updates) {
        const { bookId, stock, reason = 'Bulk update' } = update;
        
        const bookRef = doc(this.db, this.collections.BOOKS, bookId);
        const bookSnap = await getDoc(bookRef);

        if (!bookSnap.exists()) {
          results.push({
            bookId,
            success: false,
            error: 'Kitob topilmadi'
          });
          continue;
        }

        const book = bookSnap.data();
        const oldStock = book.stock || 0;
        const minStockLevel = book.minStockLevel || 5;
        const newStatus = getStockStatus(stock, minStockLevel);

        // Add to batch
        batch.update(bookRef, {
          stock,
          stockStatus: newStatus,
          isAvailable: stock > 0 && newStatus !== STOCK_STATUS.DISCONTINUED,
          lastRestocked: stock > oldStock ? serverTimestamp() : book.lastRestocked,
          updatedAt: serverTimestamp()
        });

        results.push({
          bookId,
          success: true,
          oldStock,
          newStock: stock,
          newStatus
        });

        // Log change
        await this.logStockChange({
          bookId,
          bookTitle: book.title,
          oldStock,
          newStock: stock,
          reason,
          adminId,
          timestamp: serverTimestamp()
        });
      }

      // Commit batch
      await batch.commit();

      return {
        success: true,
        results,
        totalUpdated: results.filter(r => r.success).length
      };
    } catch (error) {
      console.error('Bulk stock update error:', error);
      throw new Error(`Bulk stock update xato: ${error.message}`);
    }
  }

  /**
   * Set stock alert levels
   */
  async setStockAlertLevels(bookId, minStockLevel, maxStockLevel = null) {
    try {
      const bookRef = doc(this.db, this.collections.BOOKS, bookId);
      const updateData = {
        minStockLevel,
        updatedAt: serverTimestamp()
      };

      if (maxStockLevel !== null) {
        updateData.maxStockLevel = maxStockLevel;
      }

      await updateDoc(bookRef, updateData);

      // Recalculate stock status based on new levels
      const bookSnap = await getDoc(bookRef);
      if (bookSnap.exists()) {
        const book = bookSnap.data();
        const currentStock = book.stock || 0;
        const newStatus = getStockStatus(currentStock, minStockLevel);

        if (newStatus !== book.stockStatus) {
          await updateDoc(bookRef, {
            stockStatus: newStatus,
            updatedAt: serverTimestamp()
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Set stock alert levels error:', error);
      throw new Error(`Stock alert levels sozlashda xato: ${error.message}`);
    }
  }

  // ===============================================
  // STOCK HISTORY AND LOGGING
  // ===============================================

  /**
   * Log stock changes
   */
  async logStockChange(changeData) {
    try {
      await addDoc(collection(this.db, 'stockHistory'), {
        ...changeData,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Stock change logging error:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Get stock history for a book
   */
  async getStockHistory(bookId, limit = 50) {
    try {
      const historyQuery = query(
        collection(this.db, 'stockHistory'),
        where('bookId', '==', bookId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(historyQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('Get stock history error:', error);
      throw new Error(`Stock history olishda xato: ${error.message}`);
    }
  }

  // ===============================================
  // INVENTORY REPORTS
  // ===============================================

  /**
   * Generate inventory report
   */
  async generateInventoryReport(options = {}) {
    try {
      const { 
        includeOutOfStock = true,
        includeDiscontinued = false,
        sortBy = 'stock',
        sortOrder = 'asc'
      } = options;

      let booksQuery = query(collection(this.db, this.collections.BOOKS));

      // Apply filters
      if (!includeOutOfStock) {
        booksQuery = query(booksQuery, where('stock', '>', 0));
      }

      if (!includeDiscontinued) {
        booksQuery = query(booksQuery, where('stockStatus', '!=', STOCK_STATUS.DISCONTINUED));
      }

      const snapshot = await getDocs(booksQuery);
      let books = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort books
      books = this.sortInventoryData(books, sortBy, sortOrder);

      // Calculate summary
      const summary = this.calculateInventorySummary(books);

      return {
        books,
        summary,
        generatedAt: new Date(),
        totalBooks: books.length
      };
    } catch (error) {
      console.error('Generate inventory report error:', error);
      throw new Error(`Inventory report yaratishda xato: ${error.message}`);
    }
  }

  /**
   * Sort inventory data
   */
  sortInventoryData(books, sortBy, sortOrder) {
    return books.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'stock':
          aValue = a.stock || 0;
          bValue = b.stock || 0;
          break;
        case 'value':
          aValue = (a.stock || 0) * (a.price || 0);
          bValue = (b.stock || 0) * (b.price || 0);
          break;
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'updated':
          aValue = a.updatedAt || new Date(0);
          bValue = b.updatedAt || new Date(0);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
  }

  /**
   * Calculate inventory summary
   */
  calculateInventorySummary(books) {
    const summary = {
      totalBooks: books.length,
      totalStock: 0,
      totalValue: 0,
      categories: {
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        preOrder: 0,
        discontinued: 0
      },
      topValueBooks: [],
      lowStockBooks: []
    };

    books.forEach(book => {
      const stock = book.stock || 0;
      const price = parseFloat(book.price || 0);
      const value = stock * price;

      summary.totalStock += stock;
      summary.totalValue += value;

      // Categorize
      switch (book.stockStatus) {
        case STOCK_STATUS.IN_STOCK:
          summary.categories.inStock++;
          break;
        case STOCK_STATUS.LOW_STOCK:
          summary.categories.lowStock++;
          summary.lowStockBooks.push({ ...book, value });
          break;
        case STOCK_STATUS.OUT_OF_STOCK:
          summary.categories.outOfStock++;
          break;
        case STOCK_STATUS.PRE_ORDER:
          summary.categories.preOrder++;
          break;
        case STOCK_STATUS.DISCONTINUED:
          summary.categories.discontinued++;
          break;
      }
    });

    // Top value books
    summary.topValueBooks = books
      .map(book => ({
        ...book,
        value: (book.stock || 0) * (book.price || 0)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Sort low stock books by stock level
    summary.lowStockBooks = summary.lowStockBooks
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 20);

    return summary;
  }

  // ===============================================
  // CLEANUP METHODS
  // ===============================================

  /**
   * Cleanup all listeners
   */
  cleanup() {
    this.listeners.forEach((unsubscribe, key) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();
  }

  /**
   * Cleanup specific listener
   */
  cleanupListener(key) {
    const unsubscribe = this.listeners.get(key);
    if (typeof unsubscribe === 'function') {
      unsubscribe();
      this.listeners.delete(key);
    }
  }
}

// Export singleton instance
const inventoryService = new InventoryService();
export default inventoryService;