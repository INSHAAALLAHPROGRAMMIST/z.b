// Analytics Service - Real-time data aggregation and analytics
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

class AnalyticsService {
  constructor() {
    this.db = db;
    this.collections = COLLECTIONS;
    this.listeners = new Map(); // Store active listeners
  }

  // ===============================================
  // REAL-TIME LISTENERS
  // ===============================================

  /**
   * Subscribe to real-time order updates
   */
  subscribeToOrderUpdates(callback) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersQuery = query(
      collection(this.db, this.collections.ORDERS),
      where('createdAt', '>=', today),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      const orderStats = this.calculateOrderStats(orders);
      callback(orderStats);
    }, (error) => {
      console.error('Order updates subscription error:', error);
      callback({ error: error.message });
    });

    this.listeners.set('orders', unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to real-time sales updates
   */
  subscribeToSalesUpdates(callback) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersQuery = query(
      collection(this.db, this.collections.ORDERS),
      where('createdAt', '>=', today),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const completedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      const salesStats = this.calculateSalesStats(completedOrders);
      callback(salesStats);
    }, (error) => {
      console.error('Sales updates subscription error:', error);
      callback({ error: error.message });
    });

    this.listeners.set('sales', unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to real-time inventory updates
   */
  subscribeToInventoryUpdates(callback) {
    const booksQuery = query(
      collection(this.db, this.collections.BOOKS),
      where('isAvailable', '==', true)
    );

    const unsubscribe = onSnapshot(booksQuery, (snapshot) => {
      const books = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const inventoryStats = this.calculateInventoryStats(books);
      callback(inventoryStats);
    }, (error) => {
      console.error('Inventory updates subscription error:', error);
      callback({ error: error.message });
    });

    this.listeners.set('inventory', unsubscribe);
    return unsubscribe;
  }

  // ===============================================
  // DATA AGGREGATION METHODS
  // ===============================================

  /**
   * Calculate order statistics
   */
  calculateOrderStats(orders) {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter(order => 
      order.createdAt >= todayStart
    );

    const pendingOrders = orders.filter(order => 
      order.status === 'pending'
    );

    const completedOrders = orders.filter(order => 
      order.status === 'completed'
    );

    const totalRevenue = completedOrders.reduce((sum, order) => 
      sum + (order.totalAmount || 0), 0
    );

    return {
      todayOrdersCount: todayOrders.length,
      pendingOrdersCount: pendingOrders.length,
      completedOrdersCount: completedOrders.length,
      totalRevenue,
      averageOrderValue: completedOrders.length > 0 ? 
        totalRevenue / completedOrders.length : 0,
      recentOrders: orders.slice(0, 10),
      lastUpdated: now
    };
  }

  /**
   * Calculate sales statistics
   */
  calculateSalesStats(completedOrders) {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySales = completedOrders.filter(order => 
      order.createdAt >= todayStart
    );

    const totalRevenue = completedOrders.reduce((sum, order) => 
      sum + (order.totalAmount || 0), 0
    );

    const todayRevenue = todaySales.reduce((sum, order) => 
      sum + (order.totalAmount || 0), 0
    );

    // Calculate hourly sales for today
    const hourlySales = this.calculateHourlySales(todaySales);

    // Top selling books
    const bookSales = this.calculateBookSales(completedOrders);

    return {
      totalRevenue,
      todayRevenue,
      todaySalesCount: todaySales.length,
      averageOrderValue: completedOrders.length > 0 ? 
        totalRevenue / completedOrders.length : 0,
      hourlySales,
      topSellingBooks: bookSales.slice(0, 10),
      lastUpdated: now
    };
  }

  /**
   * Calculate inventory statistics
   */
  calculateInventoryStats(books) {
    const now = new Date();
    
    const totalBooks = books.length;
    const inStockBooks = books.filter(book => 
      (book.stock || 0) > 0
    );
    
    const lowStockBooks = books.filter(book => 
      (book.stock || 0) <= (book.minStockLevel || 5) && (book.stock || 0) > 0
    );
    
    const outOfStockBooks = books.filter(book => 
      (book.stock || 0) === 0
    );

    const totalStockValue = books.reduce((sum, book) => 
      sum + ((book.stock || 0) * (book.price || 0)), 0
    );

    return {
      totalBooks,
      inStockCount: inStockBooks.length,
      lowStockCount: lowStockBooks.length,
      outOfStockCount: outOfStockBooks.length,
      totalStockValue,
      lowStockBooks: lowStockBooks.slice(0, 10),
      lastUpdated: now
    };
  }

  /**
   * Calculate hourly sales for charts
   */
  calculateHourlySales(todaySales) {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sales: 0,
      revenue: 0
    }));

    todaySales.forEach(order => {
      const hour = order.createdAt.getHours();
      hourlyData[hour].sales += 1;
      hourlyData[hour].revenue += order.totalAmount || 0;
    });

    return hourlyData;
  }

  /**
   * Calculate book sales statistics
   */
  calculateBookSales(orders) {
    const bookSalesMap = new Map();

    orders.forEach(order => {
      const bookId = order.bookId;
      const bookTitle = order.bookTitle || 'Unknown';
      const quantity = order.quantity || 1;
      const revenue = order.totalAmount || 0;

      if (bookSalesMap.has(bookId)) {
        const existing = bookSalesMap.get(bookId);
        existing.quantity += quantity;
        existing.revenue += revenue;
        existing.orders += 1;
      } else {
        bookSalesMap.set(bookId, {
          bookId,
          bookTitle,
          quantity,
          revenue,
          orders: 1
        });
      }
    });

    return Array.from(bookSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity);
  }

  // ===============================================
  // ANALYTICS DATA RETRIEVAL
  // ===============================================

  /**
   * Get sales analytics for date range
   */
  async getSalesAnalytics(dateRange) {
    try {
      const { start, end } = dateRange;
      
      const ordersQuery = query(
        collection(this.db, this.collections.ORDERS),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        where('status', '==', 'completed'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(ordersQuery);
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      return {
        orders,
        totalRevenue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        totalOrders: orders.length,
        averageOrderValue: orders.length > 0 ? 
          orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) / orders.length : 0,
        dailySales: this.calculateDailySales(orders, dateRange),
        topBooks: this.calculateBookSales(orders).slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting sales analytics:', error);
      throw new Error(`Sales analytics yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(dateRange) {
    try {
      const { start, end } = dateRange;

      // Get users registered in date range
      const usersQuery = query(
        collection(this.db, this.collections.USERS),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        orderBy('createdAt', 'desc')
      );

      const usersSnapshot = await getDocs(usersQuery);
      const newUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      // Get orders for customer analysis
      const ordersQuery = query(
        collection(this.db, this.collections.ORDERS),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        orderBy('createdAt', 'desc')
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      const customerStats = this.calculateCustomerStats(orders);

      return {
        newCustomers: newUsers.length,
        totalCustomers: await this.getTotalCustomersCount(),
        customerStats,
        topCustomers: customerStats.slice(0, 10),
        customerGrowth: this.calculateCustomerGrowth(newUsers, dateRange)
      };
    } catch (error) {
      console.error('Error getting customer analytics:', error);
      throw new Error(`Customer analytics yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Calculate daily sales for charts
   */
  calculateDailySales(orders, dateRange) {
    const { start, end } = dateRange;
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    const dailyData = Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return {
        date: date.toISOString().split('T')[0],
        sales: 0,
        revenue: 0,
        orders: 0
      };
    });

    orders.forEach(order => {
      const orderDate = order.createdAt.toISOString().split('T')[0];
      const dayData = dailyData.find(day => day.date === orderDate);
      if (dayData) {
        dayData.sales += order.quantity || 1;
        dayData.revenue += order.totalAmount || 0;
        dayData.orders += 1;
      }
    });

    return dailyData;
  }

  /**
   * Calculate customer statistics
   */
  calculateCustomerStats(orders) {
    const customerMap = new Map();

    orders.forEach(order => {
      const customerId = order.userId;
      const customerName = order.customerName || 'Unknown';
      const revenue = order.totalAmount || 0;

      if (customerMap.has(customerId)) {
        const existing = customerMap.get(customerId);
        existing.totalSpent += revenue;
        existing.orderCount += 1;
        existing.lastOrderDate = order.createdAt > existing.lastOrderDate ? 
          order.createdAt : existing.lastOrderDate;
      } else {
        customerMap.set(customerId, {
          customerId,
          customerName,
          totalSpent: revenue,
          orderCount: 1,
          firstOrderDate: order.createdAt,
          lastOrderDate: order.createdAt
        });
      }
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }

  /**
   * Get total customers count
   */
  async getTotalCustomersCount() {
    try {
      const usersSnapshot = await getDocs(collection(this.db, this.collections.USERS));
      return usersSnapshot.size;
    } catch (error) {
      console.error('Error getting total customers count:', error);
      return 0;
    }
  }

  /**
   * Calculate customer growth
   */
  calculateCustomerGrowth(newUsers, dateRange) {
    const { start, end } = dateRange;
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    const growthData = Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return {
        date: date.toISOString().split('T')[0],
        newUsers: 0
      };
    });

    newUsers.forEach(user => {
      const userDate = user.createdAt.toISOString().split('T')[0];
      const dayData = growthData.find(day => day.date === userDate);
      if (dayData) {
        dayData.newUsers += 1;
      }
    });

    return growthData;
  }

  // ===============================================
  // CLEANUP METHODS
  // ===============================================

  /**
   * Cleanup all active listeners
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
const analyticsService = new AnalyticsService();
export default analyticsService;