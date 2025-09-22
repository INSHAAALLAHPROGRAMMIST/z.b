/**
 * Enhanced Order Service
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp,
  runTransaction,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebaseConfig';
import { OrderModel, OrderStatus, PaymentStatus, ShippingMethod } from '../models/OrderModel';
import TelegramIntegration from './TelegramIntegration';

class EnhancedOrderService {
  constructor() {
    this.db = db;
    this.collections = COLLECTIONS;
  }

  /**
   * Create new order with enhanced data structure
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async createOrder(orderData) {
    try {
      // Create OrderModel instance and validate
      const orderModel = new OrderModel(orderData);
      const validation = orderModel.validate();

      if (!validation.isValid) {
        throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
      }

      // Calculate totals
      orderModel.calculateTotals();

      // Set creation timestamp
      orderModel.timestamps.createdAt = serverTimestamp();
      orderModel.timestamps.updatedAt = serverTimestamp();

      // Convert to plain object for Firestore
      const orderObject = orderModel.toObject();

      // Create order in Firestore
      const docRef = await addDoc(collection(this.db, this.collections.ORDERS), orderObject);

      // Update order with generated ID
      orderModel.id = docRef.id;
      await updateDoc(docRef, { id: docRef.id });

      // Send notifications if enabled
      try {
        const notificationResult = await TelegramIntegration.handleNewOrder(orderModel.toObject());
        if (notificationResult.success) {
          await this.updateNotificationStatus(docRef.id, {
            adminNotified: true,
            telegramSent: notificationResult.telegramSent
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send order notification:', notificationError);
        // Don't fail order creation if notification fails
      }

      return {
        id: docRef.id,
        ...orderModel.toObject(),
        success: true
      };
    } catch (error) {
      console.error('Error creating enhanced order:', error);
      throw new Error(`Buyurtma yaratishda xato: ${error.message}`);
    }
  }

  /**
   * Get order by ID with full details
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async getOrderById(orderId) {
    try {
      const docRef = doc(this.db, this.collections.ORDERS, orderId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() };
        return OrderModel.fromObject(orderData);
      } else {
        throw new Error('Buyurtma topilmadi');
      }
    } catch (error) {
      console.error('Error getting order:', error);
      throw new Error(`Buyurtma yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Get orders with advanced filtering and pagination
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async getOrders(options = {}) {
    try {
      const {
        userId = null,
        status = null,
        paymentStatus = null,
        dateRange = null,
        limitCount = 50,
        startAfterDoc = null,
        orderByField = 'timestamps.createdAt',
        orderDirection = 'desc'
      } = options;

      let q = collection(this.db, this.collections.ORDERS);
      const queryConstraints = [];

      // Apply filters
      if (userId) {
        queryConstraints.push(where('userId', '==', userId));
      }

      if (status) {
        if (Array.isArray(status)) {
          queryConstraints.push(where('status', 'in', status));
        } else {
          queryConstraints.push(where('status', '==', status));
        }
      }

      if (paymentStatus) {
        queryConstraints.push(where('payment.status', '==', paymentStatus));
      }

      if (dateRange) {
        if (dateRange.start) {
          queryConstraints.push(where('timestamps.createdAt', '>=', dateRange.start));
        }
        if (dateRange.end) {
          queryConstraints.push(where('timestamps.createdAt', '<=', dateRange.end));
        }
      }

      // Apply ordering
      queryConstraints.push(orderBy(orderByField, orderDirection));

      // Apply pagination
      if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
      }

      queryConstraints.push(limit(limitCount));

      // Build and execute query
      q = query(q, ...queryConstraints);
      const snapshot = await getDocs(q);

      const orders = [];
      snapshot.forEach((doc) => {
        const orderData = { id: doc.id, ...doc.data() };
        orders.push(OrderModel.fromObject(orderData));
      });

      return {
        documents: orders,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount,
        total: orders.length
      };
    } catch (error) {
      console.error('Error getting orders:', error);
      throw new Error(`Buyurtmalarni yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Update order status with timestamp tracking
   * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4
   */
  async updateOrderStatus(orderId, newStatus, notes = '') {
    try {
      return await runTransaction(this.db, async (transaction) => {
        const orderRef = doc(this.db, this.collections.ORDERS, orderId);
        const orderDoc = await transaction.get(orderRef);

        if (!orderDoc.exists()) {
          throw new Error('Buyurtma topilmadi');
        }

        const orderData = orderDoc.data();
        const orderModel = OrderModel.fromObject({ id: orderId, ...orderData });

        // Update status with timestamp tracking
        const previousStatus = orderModel.status;
        orderModel.updateStatus(newStatus, notes);

        // Update in Firestore
        transaction.update(orderRef, {
          status: orderModel.status,
          statusHistory: orderModel.statusHistory,
          timestamps: orderModel.timestamps,
          'timestamps.updatedAt': serverTimestamp()
        });

        // Send notification if status changed
        if (previousStatus !== newStatus) {
          try {
            const notificationResult = await TelegramIntegration.handleOrderStatusChange(
              orderId, 
              newStatus
            );
            
            if (notificationResult.success) {
              transaction.update(orderRef, {
                'notifications.customerNotified': true,
                'notifications.telegramSent': notificationResult.telegramSent
              });
            }
          } catch (notificationError) {
            console.warn('Failed to send status change notification:', notificationError);
          }
        }

        return orderModel;
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error(`Buyurtma holatini yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Update payment status with tracking
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async updatePaymentStatus(orderId, paymentStatus, transactionId = null, amount = null) {
    try {
      const orderRef = doc(this.db, this.collections.ORDERS, orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Buyurtma topilmadi');
      }

      const orderData = orderDoc.data();
      const orderModel = OrderModel.fromObject({ id: orderId, ...orderData });

      // Update payment status
      orderModel.updatePaymentStatus(paymentStatus, transactionId);

      if (amount) {
        orderModel.payment.amount = amount;
      }

      // Update in Firestore
      await updateDoc(orderRef, {
        payment: orderModel.payment,
        'timestamps.updatedAt': serverTimestamp()
      });

      return orderModel;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new Error(`To'lov holatini yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Update shipping information
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async updateShippingInfo(orderId, shippingData) {
    try {
      const orderRef = doc(this.db, this.collections.ORDERS, orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Buyurtma topilmadi');
      }

      const orderData = orderDoc.data();
      const orderModel = OrderModel.fromObject({ id: orderId, ...orderData });

      // Update shipping information
      Object.assign(orderModel.shipping, shippingData);

      // If tracking number is provided, update status to shipped
      if (shippingData.trackingNumber && orderModel.status === OrderStatus.PROCESSING) {
        orderModel.updateStatus(OrderStatus.SHIPPED, 'Tracking number added');
      }

      // Update in Firestore
      await updateDoc(orderRef, {
        shipping: orderModel.shipping,
        status: orderModel.status,
        statusHistory: orderModel.statusHistory,
        timestamps: orderModel.timestamps,
        'timestamps.updatedAt': serverTimestamp()
      });

      return orderModel;
    } catch (error) {
      console.error('Error updating shipping info:', error);
      throw new Error(`Yetkazib berish ma'lumotlarini yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Add tracking number to order
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async addTrackingNumber(orderId, trackingNumber, carrier = null) {
    try {
      return await this.updateShippingInfo(orderId, {
        trackingNumber,
        carrier,
        shippedAt: new Date()
      });
    } catch (error) {
      console.error('Error adding tracking number:', error);
      throw new Error(`Kuzatuv raqamini qo'shishda xato: ${error.message}`);
    }
  }

  /**
   * Cancel order
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async cancelOrder(orderId, reason = '') {
    try {
      const orderModel = await this.getOrderById(orderId);

      if (!orderModel.canBeCancelled()) {
        throw new Error('Bu buyurtmani bekor qilib bo\'lmaydi');
      }

      await this.updateOrderStatus(orderId, OrderStatus.CANCELLED, reason);

      // If payment was made, initiate refund process
      if (orderModel.payment.status === PaymentStatus.PAID) {
        await this.updatePaymentStatus(orderId, PaymentStatus.REFUNDED);
      }

      return orderModel;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw new Error(`Buyurtmani bekor qilishda xato: ${error.message}`);
    }
  }

  /**
   * Get order analytics and reporting data
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async getOrderAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      let q = collection(this.db, this.collections.ORDERS);
      const queryConstraints = [];

      // Apply date range filter
      if (startDate) {
        queryConstraints.push(where('timestamps.createdAt', '>=', startDate));
      }
      if (endDate) {
        queryConstraints.push(where('timestamps.createdAt', '<=', endDate));
      }

      queryConstraints.push(orderBy('timestamps.createdAt', 'desc'));
      queryConstraints.push(limit(1000)); // Limit for performance

      q = query(q, ...queryConstraints);
      const snapshot = await getDocs(q);

      const analytics = {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusBreakdown: {},
        paymentBreakdown: {},
        shippingBreakdown: {},
        dailyStats: {},
        topCustomers: {},
        processingTimes: [],
        deliveryTimes: []
      };

      const orders = [];
      snapshot.forEach((doc) => {
        const orderData = { id: doc.id, ...doc.data() };
        orders.push(OrderModel.fromObject(orderData));
      });

      analytics.totalOrders = orders.length;

      // Calculate analytics
      orders.forEach(order => {
        // Revenue calculation
        analytics.totalRevenue += order.totalAmount;

        // Status breakdown
        analytics.statusBreakdown[order.status] = (analytics.statusBreakdown[order.status] || 0) + 1;

        // Payment breakdown
        analytics.paymentBreakdown[order.payment.status] = (analytics.paymentBreakdown[order.payment.status] || 0) + 1;

        // Shipping breakdown
        analytics.shippingBreakdown[order.shipping.method] = (analytics.shippingBreakdown[order.shipping.method] || 0) + 1;

        // Daily stats
        const dateKey = order.timestamps.createdAt.toISOString().split('T')[0];
        if (!analytics.dailyStats[dateKey]) {
          analytics.dailyStats[dateKey] = { orders: 0, revenue: 0 };
        }
        analytics.dailyStats[dateKey].orders += 1;
        analytics.dailyStats[dateKey].revenue += order.totalAmount;

        // Top customers
        const customerId = order.userId;
        if (!analytics.topCustomers[customerId]) {
          analytics.topCustomers[customerId] = {
            name: order.customer.name,
            orders: 0,
            totalSpent: 0
          };
        }
        analytics.topCustomers[customerId].orders += 1;
        analytics.topCustomers[customerId].totalSpent += order.totalAmount;

        // Processing times
        if (order.timestamps.confirmedAt && order.timestamps.createdAt) {
          const processingTime = order.timestamps.confirmedAt - order.timestamps.createdAt;
          analytics.processingTimes.push(processingTime);
        }

        // Delivery times
        if (order.timestamps.deliveredAt && order.timestamps.shippedAt) {
          const deliveryTime = order.timestamps.deliveredAt - order.timestamps.shippedAt;
          analytics.deliveryTimes.push(deliveryTime);
        }
      });

      // Calculate averages
      analytics.averageOrderValue = analytics.totalOrders > 0 ? 
        Math.round(analytics.totalRevenue / analytics.totalOrders) : 0;

      analytics.averageProcessingTime = analytics.processingTimes.length > 0 ?
        analytics.processingTimes.reduce((a, b) => a + b, 0) / analytics.processingTimes.length : 0;

      analytics.averageDeliveryTime = analytics.deliveryTimes.length > 0 ?
        analytics.deliveryTimes.reduce((a, b) => a + b, 0) / analytics.deliveryTimes.length : 0;

      // Convert top customers to array and sort
      analytics.topCustomers = Object.values(analytics.topCustomers)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      return {
        success: true,
        data: analytics,
        dateRange: { startDate, endDate },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting order analytics:', error);
      throw new Error(`Buyurtma analitikasini olishda xato: ${error.message}`);
    }
  }

  /**
   * Update notification status
   * Requirements: 2.1, 2.2
   */
  async updateNotificationStatus(orderId, notificationData) {
    try {
      const orderRef = doc(this.db, this.collections.ORDERS, orderId);
      const updateData = {};

      Object.keys(notificationData).forEach(key => {
        updateData[`notifications.${key}`] = notificationData[key];
      });

      updateData['timestamps.updatedAt'] = serverTimestamp();

      await updateDoc(orderRef, updateData);
      return { success: true };
    } catch (error) {
      console.error('Error updating notification status:', error);
      throw new Error(`Bildirishnoma holatini yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Batch update orders
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async batchUpdateOrders(updates) {
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error('Updates array is required and cannot be empty');
      }

      if (updates.length > 500) {
        throw new Error('Batch size cannot exceed 500 operations');
      }

      const batch = writeBatch(this.db);
      const results = [];

      for (const update of updates) {
        const { orderId, data } = update;
        
        if (!orderId || !data) {
          throw new Error('Each update must have orderId and data properties');
        }

        const orderRef = doc(this.db, this.collections.ORDERS, orderId);
        const updateData = {
          ...data,
          'timestamps.updatedAt': serverTimestamp()
        };

        batch.update(orderRef, updateData);
        results.push({ orderId, status: 'pending' });
      }

      await batch.commit();

      return {
        success: true,
        results: results.map(r => ({ ...r, status: 'completed' })),
        summary: {
          total: updates.length,
          successful: updates.length,
          failed: 0
        }
      };
    } catch (error) {
      console.error('Error in batch update orders:', error);
      throw new Error(`Buyurtmalarni batch yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Listen to order changes in real-time
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  subscribeToOrderChanges(orderId, callback) {
    try {
      const orderRef = doc(this.db, this.collections.ORDERS, orderId);
      
      return onSnapshot(orderRef, (doc) => {
        if (doc.exists()) {
          const orderData = { id: doc.id, ...doc.data() };
          const orderModel = OrderModel.fromObject(orderData);
          callback(orderModel);
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error in order subscription:', error);
        callback(null, error);
      });
    } catch (error) {
      console.error('Error setting up order subscription:', error);
      throw new Error(`Buyurtma o'zgarishlarini kuzatishda xato: ${error.message}`);
    }
  }

  /**
   * Listen to orders list changes in real-time
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  subscribeToOrdersList(options = {}, callback) {
    try {
      const {
        userId = null,
        status = null,
        limitCount = 50
      } = options;

      let q = collection(this.db, this.collections.ORDERS);
      const queryConstraints = [];

      if (userId) {
        queryConstraints.push(where('userId', '==', userId));
      }

      if (status) {
        queryConstraints.push(where('status', '==', status));
      }

      queryConstraints.push(orderBy('timestamps.createdAt', 'desc'));
      queryConstraints.push(limit(limitCount));

      q = query(q, ...queryConstraints);

      return onSnapshot(q, (snapshot) => {
        const orders = [];
        snapshot.forEach((doc) => {
          const orderData = { id: doc.id, ...doc.data() };
          orders.push(OrderModel.fromObject(orderData));
        });
        callback(orders);
      }, (error) => {
        console.error('Error in orders list subscription:', error);
        callback([], error);
      });
    } catch (error) {
      console.error('Error setting up orders list subscription:', error);
      throw new Error(`Buyurtmalar ro'yxati o'zgarishlarini kuzatishda xato: ${error.message}`);
    }
  }

  /**
   * Search orders by customer name, order number, or phone
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async searchOrders(searchQuery, options = {}) {
    try {
      const { limitCount = 50 } = options;
      
      // Get all orders (in production, this should be optimized with proper indexing)
      const q = query(
        collection(this.db, this.collections.ORDERS),
        orderBy('timestamps.createdAt', 'desc'),
        limit(limitCount * 2) // Get more to filter client-side
      );

      const snapshot = await getDocs(q);
      const allOrders = [];
      
      snapshot.forEach((doc) => {
        const orderData = { id: doc.id, ...doc.data() };
        allOrders.push(OrderModel.fromObject(orderData));
      });

      // Client-side search filtering
      const searchLower = searchQuery.toLowerCase().trim();
      const filteredOrders = allOrders.filter(order => {
        const orderNumberMatch = order.orderNumber?.toLowerCase().includes(searchLower);
        const customerNameMatch = order.customer.name?.toLowerCase().includes(searchLower);
        const customerPhoneMatch = order.customer.phone?.includes(searchQuery);
        const customerEmailMatch = order.customer.email?.toLowerCase().includes(searchLower);
        
        return orderNumberMatch || customerNameMatch || customerPhoneMatch || customerEmailMatch;
      });

      return {
        documents: filteredOrders.slice(0, limitCount),
        total: filteredOrders.length,
        searchQuery
      };
    } catch (error) {
      console.error('Error searching orders:', error);
      throw new Error(`Buyurtmalarni qidirishda xato: ${error.message}`);
    }
  }
}

export default new EnhancedOrderService();