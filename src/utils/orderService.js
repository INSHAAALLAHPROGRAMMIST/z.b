// Order Service for Firebase - Enhanced Version
import { db, COLLECTIONS } from '../firebaseConfig';
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
  serverTimestamp
} from 'firebase/firestore';
import EnhancedOrderService from '../services/EnhancedOrderService';
import { OrderModel } from '../models/OrderModel';

export const orderService = {
  // Buyurtma yaratish - Enhanced version
  async createOrder(orderData) {
    try {
      // Use enhanced order service for new orders
      return await EnhancedOrderService.createOrder(orderData);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Buyurtmani yangilash - Enhanced version
  async updateOrder(orderId, updateData) {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      await updateDoc(orderRef, {
        ...updateData,
        'timestamps.updatedAt': serverTimestamp()
      });
      
      return { id: orderId, ...updateData };
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  },

  // Buyurtmani o'chirish
  async deleteOrder(orderId) {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      await deleteDoc(orderRef);
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  },

  // Buyurtmani olish
  async getOrder(orderId) {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        return {
          id: orderSnap.id,
          ...orderSnap.data()
        };
      } else {
        throw new Error('Order not found');
      }
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  },

  // Barcha buyurtmalarni olish
  async getAllOrders(limitCount = 50) {
    try {
      const ordersQuery = query(
        collection(db, COLLECTIONS.ORDERS),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(ordersQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  },

  // Foydalanuvchi buyurtmalarini olish
  async getUserOrders(userId) {
    try {
      const ordersQuery = query(
        collection(db, COLLECTIONS.ORDERS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(ordersQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  },

  // Buyurtma statusini yangilash - Enhanced version with notifications
  async updateOrderStatus(orderId, status, notes = '') {
    try {
      // Use enhanced order service for status updates with notifications
      return await EnhancedOrderService.updateOrderStatus(orderId, status, notes);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  // To'lov statusini yangilash - Enhanced version
  async updatePaymentStatus(orderId, paymentStatus, transactionId = null, amount = null) {
    try {
      // Use enhanced order service for payment status updates
      return await EnhancedOrderService.updatePaymentStatus(orderId, paymentStatus, transactionId, amount);
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  // Buyurtma statistikasi - Enhanced version
  async getOrderStats() {
    try {
      const ordersQuery = query(collection(db, COLLECTIONS.ORDERS));
      const querySnapshot = await getDocs(ordersQuery);
      
      const orders = querySnapshot.docs.map(doc => doc.data());
      
      const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting order stats:', error);
      throw error;
    }
  },

  // Enhanced methods using EnhancedOrderService
  
  // Get order analytics and reporting
  async getOrderAnalytics(dateRange = {}) {
    try {
      return await EnhancedOrderService.getOrderAnalytics(dateRange);
    } catch (error) {
      console.error('Error getting order analytics:', error);
      throw error;
    }
  },

  // Update shipping information
  async updateShippingInfo(orderId, shippingData) {
    try {
      return await EnhancedOrderService.updateShippingInfo(orderId, shippingData);
    } catch (error) {
      console.error('Error updating shipping info:', error);
      throw error;
    }
  },

  // Add tracking number
  async addTrackingNumber(orderId, trackingNumber, carrier = null) {
    try {
      return await EnhancedOrderService.addTrackingNumber(orderId, trackingNumber, carrier);
    } catch (error) {
      console.error('Error adding tracking number:', error);
      throw error;
    }
  },

  // Cancel order
  async cancelOrder(orderId, reason = '') {
    try {
      return await EnhancedOrderService.cancelOrder(orderId, reason);
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  },

  // Search orders
  async searchOrders(searchQuery, options = {}) {
    try {
      return await EnhancedOrderService.searchOrders(searchQuery, options);
    } catch (error) {
      console.error('Error searching orders:', error);
      throw error;
    }
  },

  // Batch update orders
  async batchUpdateOrders(updates) {
    try {
      return await EnhancedOrderService.batchUpdateOrders(updates);
    } catch (error) {
      console.error('Error batch updating orders:', error);
      throw error;
    }
  },

  // Subscribe to order changes
  subscribeToOrderChanges(orderId, callback) {
    return EnhancedOrderService.subscribeToOrderChanges(orderId, callback);
  },

  // Subscribe to orders list changes
  subscribeToOrdersList(options, callback) {
    return EnhancedOrderService.subscribeToOrdersList(options, callback);
  },

  // Create sample orders for testing
  async createSampleOrders() {
    try {
      const sampleOrders = [
        {
          userId: 'sample-user-1',
          items: [
            {
              bookId: 'book-1',
              bookTitle: 'O\'tkan kunlar',
              bookImage: '',
              quantity: 1,
              unitPrice: 45000,
              totalPrice: 45000
            }
          ],
          totalAmount: 45000,
          customer: {
            name: 'Ahmadjon Karimov',
            email: 'ahmadjon@example.com',
            phone: '+998901234567',
            address: {
              street: 'Amir Temur ko\'chasi 15',
              city: 'Toshkent',
              region: 'Toshkent',
              postalCode: '100000'
            }
          },
          payment: {
            method: 'cash',
            status: 'pending'
          },
          shipping: {
            method: 'delivery',
            cost: 15000
          },
          breakdown: {
            subtotal: 45000,
            shippingCost: 15000,
            total: 60000
          }
        },
        {
          userId: 'sample-user-2',
          items: [
            {
              bookId: 'book-2',
              bookTitle: 'Mehrobdan chayon',
              bookImage: '',
              quantity: 2,
              unitPrice: 35000,
              totalPrice: 70000
            }
          ],
          totalAmount: 70000,
          customer: {
            name: 'Malika Toshmatova',
            email: 'malika@example.com',
            phone: '+998907654321',
            address: {
              street: 'Mustaqillik ko\'chasi 25',
              city: 'Samarqand',
              region: 'Samarqand',
              postalCode: '140000'
            }
          },
          payment: {
            method: 'card',
            status: 'paid'
          },
          shipping: {
            method: 'courier',
            cost: 20000
          },
          breakdown: {
            subtotal: 70000,
            shippingCost: 20000,
            total: 90000
          }
        }
      ];

      const createdOrders = [];
      for (const orderData of sampleOrders) {
        const order = await this.createOrder(orderData);
        createdOrders.push(order);
      }

      return createdOrders;
    } catch (error) {
      console.error('Error creating sample orders:', error);
      throw error;
    }
  }
};

export default orderService;