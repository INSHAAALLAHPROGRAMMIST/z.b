/**
 * Enhanced Order Service Tests
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EnhancedOrderService from '../EnhancedOrderService';
import { OrderModel, OrderStatus, PaymentStatus, ShippingMethod } from '../../models/OrderModel';
import TelegramIntegration from '../TelegramIntegration';

// Mock Firebase
vi.mock('../../firebaseConfig', () => ({
  db: {},
  COLLECTIONS: {
    ORDERS: 'orders',
    USERS: 'users',
    BOOKS: 'books'
  }
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  onSnapshot: vi.fn()
}));

// Mock TelegramIntegration
vi.mock('../TelegramIntegration', () => ({
  default: {
    handleNewOrder: vi.fn(),
    handleOrderStatusChange: vi.fn()
  }
}));

describe('EnhancedOrderService', () => {
  const mockOrderData = {
    userId: 'user123',
    items: [
      {
        bookId: 'book1',
        bookTitle: 'Test Book',
        quantity: 2,
        unitPrice: 50000,
        totalPrice: 100000
      }
    ],
    totalAmount: 115000,
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+998901234567',
      address: {
        street: 'Test Street 123',
        city: 'Tashkent',
        region: 'Tashkent',
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
      subtotal: 100000,
      shippingCost: 15000,
      total: 115000
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createOrder', () => {
    it('should create order with enhanced data structure', async () => {
      // Mock Firestore operations
      const mockDocRef = { id: 'order123' };
      const { addDoc, updateDoc } = await import('firebase/firestore');
      addDoc.mockResolvedValue(mockDocRef);
      updateDoc.mockResolvedValue();

      // Mock TelegramIntegration
      TelegramIntegration.handleNewOrder.mockResolvedValue({
        success: true,
        telegramSent: true
      });

      const result = await EnhancedOrderService.createOrder(mockOrderData);

      expect(result).toHaveProperty('id', 'order123');
      expect(result).toHaveProperty('success', true);
      expect(result.orderNumber).toMatch(/^ORD-\d{8}-\d{9}$/);
      expect(addDoc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();
      expect(TelegramIntegration.handleNewOrder).toHaveBeenCalled();
    });

    it('should validate order data before creation', async () => {
      const invalidOrderData = {
        // Missing required fields
        items: []
      };

      await expect(EnhancedOrderService.createOrder(invalidOrderData))
        .rejects.toThrow('Order validation failed');
    });

    it('should handle notification failures gracefully', async () => {
      const mockDocRef = { id: 'order123' };
      const { addDoc, updateDoc } = await import('firebase/firestore');
      addDoc.mockResolvedValue(mockDocRef);
      updateDoc.mockResolvedValue();

      // Mock TelegramIntegration failure
      TelegramIntegration.handleNewOrder.mockRejectedValue(new Error('Telegram failed'));

      const result = await EnhancedOrderService.createOrder(mockOrderData);

      expect(result).toHaveProperty('success', true);
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should return OrderModel instance', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'order123',
        data: () => mockOrderData
      };

      const { getDoc } = await import('firebase/firestore');
      getDoc.mockResolvedValue(mockDoc);

      const result = await EnhancedOrderService.getOrderById('order123');

      expect(result).toBeInstanceOf(OrderModel);
      expect(result.id).toBe('order123');
    });

    it('should throw error if order not found', async () => {
      const mockDoc = {
        exists: () => false
      };

      const { getDoc } = await import('firebase/firestore');
      getDoc.mockResolvedValue(mockDoc);

      await expect(EnhancedOrderService.getOrderById('nonexistent'))
        .rejects.toThrow('Buyurtma topilmadi');
    });
  });

  describe('getOrders', () => {
    it('should return orders with filtering and pagination', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'order1',
            data: () => mockOrderData
          },
          {
            id: 'order2',
            data: () => mockOrderData
          }
        ]
      };

      const { getDocs } = await import('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);

      const options = {
        status: OrderStatus.PENDING,
        limitCount: 10
      };

      const result = await EnhancedOrderService.getOrders(options);

      expect(result.documents).toHaveLength(2);
      expect(result.documents[0]).toBeInstanceOf(OrderModel);
      expect(result.hasMore).toBe(false);
    });

    it('should handle multiple status filters', async () => {
      const mockSnapshot = { docs: [] };
      const { getDocs } = await import('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);

      const options = {
        status: [OrderStatus.PENDING, OrderStatus.CONFIRMED]
      };

      await EnhancedOrderService.getOrders(options);

      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update status with timestamp tracking', async () => {
      const mockOrderDoc = {
        exists: () => true,
        data: () => mockOrderData
      };

      const { runTransaction } = await import('firebase/firestore');
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue(mockOrderDoc),
          update: vi.fn()
        };
        return await callback(mockTransaction);
      });

      TelegramIntegration.handleOrderStatusChange.mockResolvedValue({
        success: true,
        telegramSent: true
      });

      const result = await EnhancedOrderService.updateOrderStatus(
        'order123',
        OrderStatus.CONFIRMED,
        'Order confirmed by admin'
      );

      expect(result).toBeInstanceOf(OrderModel);
      expect(runTransaction).toHaveBeenCalled();
      expect(TelegramIntegration.handleOrderStatusChange).toHaveBeenCalledWith(
        'order123',
        OrderStatus.CONFIRMED
      );
    });

    it('should handle transaction failures', async () => {
      const { runTransaction } = await import('firebase/firestore');
      runTransaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(EnhancedOrderService.updateOrderStatus('order123', OrderStatus.CONFIRMED))
        .rejects.toThrow('Buyurtma holatini yangilashda xato');
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status with transaction ID', async () => {
      const mockOrderDoc = {
        exists: () => true,
        data: () => mockOrderData
      };

      const { getDoc, updateDoc } = await import('firebase/firestore');
      getDoc.mockResolvedValue(mockOrderDoc);
      updateDoc.mockResolvedValue();

      const result = await EnhancedOrderService.updatePaymentStatus(
        'order123',
        PaymentStatus.PAID,
        'txn123',
        115000
      );

      expect(result).toBeInstanceOf(OrderModel);
      expect(result.payment.status).toBe(PaymentStatus.PAID);
      expect(result.payment.transactionId).toBe('txn123');
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('updateShippingInfo', () => {
    it('should update shipping information', async () => {
      const mockOrderDoc = {
        exists: () => true,
        data: () => mockOrderData
      };

      const { getDoc, updateDoc } = await import('firebase/firestore');
      getDoc.mockResolvedValue(mockOrderDoc);
      updateDoc.mockResolvedValue();

      const shippingData = {
        trackingNumber: 'TRK123456',
        carrier: 'Express Delivery',
        estimatedDelivery: new Date('2024-02-01')
      };

      const result = await EnhancedOrderService.updateShippingInfo('order123', shippingData);

      expect(result).toBeInstanceOf(OrderModel);
      expect(result.shipping.trackingNumber).toBe('TRK123456');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should update status to shipped when tracking number is added', async () => {
      const processingOrderData = {
        ...mockOrderData,
        status: OrderStatus.PROCESSING
      };

      const mockOrderDoc = {
        exists: () => true,
        data: () => processingOrderData
      };

      const { getDoc, updateDoc } = await import('firebase/firestore');
      getDoc.mockResolvedValue(mockOrderDoc);
      updateDoc.mockResolvedValue();

      const shippingData = {
        trackingNumber: 'TRK123456'
      };

      const result = await EnhancedOrderService.updateShippingInfo('order123', shippingData);

      expect(result.status).toBe(OrderStatus.SHIPPED);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order if cancellable', async () => {
      const pendingOrderData = {
        ...mockOrderData,
        status: OrderStatus.PENDING
      };

      const mockOrderDoc = {
        exists: () => true,
        data: () => pendingOrderData
      };

      const { getDoc, runTransaction } = await import('firebase/firestore');
      getDoc.mockResolvedValue(mockOrderDoc);
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue(mockOrderDoc),
          update: vi.fn()
        };
        return await callback(mockTransaction);
      });

      TelegramIntegration.handleOrderStatusChange.mockResolvedValue({
        success: true,
        telegramSent: true
      });

      const result = await EnhancedOrderService.cancelOrder('order123', 'Customer request');

      expect(result).toBeInstanceOf(OrderModel);
    });

    it('should throw error if order cannot be cancelled', async () => {
      const shippedOrderData = {
        ...mockOrderData,
        status: OrderStatus.SHIPPED
      };

      const mockOrderDoc = {
        exists: () => true,
        data: () => shippedOrderData
      };

      const { getDoc } = await import('firebase/firestore');
      getDoc.mockResolvedValue(mockOrderDoc);

      await expect(EnhancedOrderService.cancelOrder('order123'))
        .rejects.toThrow('Bu buyurtmani bekor qilib bo\'lmaydi');
    });
  });

  describe('getOrderAnalytics', () => {
    it('should return comprehensive analytics data', async () => {
      const mockOrders = [
        {
          id: 'order1',
          data: () => ({
            ...mockOrderData,
            status: OrderStatus.COMPLETED,
            timestamps: {
              createdAt: new Date('2024-01-01'),
              confirmedAt: new Date('2024-01-01T01:00:00'),
              deliveredAt: new Date('2024-01-03')
            }
          })
        },
        {
          id: 'order2',
          data: () => ({
            ...mockOrderData,
            status: OrderStatus.PENDING,
            timestamps: {
              createdAt: new Date('2024-01-02')
            }
          })
        }
      ];

      const mockSnapshot = { docs: mockOrders };
      const { getDocs } = await import('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);

      const result = await EnhancedOrderService.getOrderAnalytics();

      expect(result.success).toBe(true);
      expect(result.data.totalOrders).toBe(2);
      expect(result.data.totalRevenue).toBe(230000);
      expect(result.data.statusBreakdown).toHaveProperty(OrderStatus.COMPLETED, 1);
      expect(result.data.statusBreakdown).toHaveProperty(OrderStatus.PENDING, 1);
      expect(result.data.averageOrderValue).toBe(115000);
    });

    it('should handle date range filtering', async () => {
      const mockSnapshot = { docs: [] };
      const { getDocs } = await import('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);

      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const result = await EnhancedOrderService.getOrderAnalytics(dateRange);

      expect(result.success).toBe(true);
      expect(result.dateRange).toEqual(dateRange);
    });
  });

  describe('searchOrders', () => {
    it('should search orders by customer name', async () => {
      const mockOrders = [
        {
          id: 'order1',
          data: () => ({
            ...mockOrderData,
            customer: { ...mockOrderData.customer, name: 'John Doe' }
          })
        },
        {
          id: 'order2',
          data: () => ({
            ...mockOrderData,
            customer: { ...mockOrderData.customer, name: 'Jane Smith' }
          })
        }
      ];

      const mockSnapshot = { docs: mockOrders };
      const { getDocs } = await import('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);

      const result = await EnhancedOrderService.searchOrders('John');

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].customer.name).toBe('John Doe');
    });

    it('should search orders by phone number', async () => {
      const mockOrders = [
        {
          id: 'order1',
          data: () => ({
            ...mockOrderData,
            customer: { ...mockOrderData.customer, phone: '+998901234567' }
          })
        }
      ];

      const mockSnapshot = { docs: mockOrders };
      const { getDocs } = await import('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);

      const result = await EnhancedOrderService.searchOrders('901234567');

      expect(result.documents).toHaveLength(1);
    });
  });

  describe('batchUpdateOrders', () => {
    it('should update multiple orders in batch', async () => {
      const updates = [
        { orderId: 'order1', data: { status: OrderStatus.CONFIRMED } },
        { orderId: 'order2', data: { status: OrderStatus.PROCESSING } }
      ];

      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue()
      };

      const { writeBatch } = await import('firebase/firestore');
      writeBatch.mockReturnValue(mockBatch);

      const result = await EnhancedOrderService.batchUpdateOrders(updates);

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should validate batch size limit', async () => {
      const updates = Array(501).fill({ orderId: 'order1', data: {} });

      await expect(EnhancedOrderService.batchUpdateOrders(updates))
        .rejects.toThrow('Batch size cannot exceed 500 operations');
    });

    it('should validate update structure', async () => {
      const invalidUpdates = [
        { orderId: 'order1' }, // Missing data
        { data: {} } // Missing orderId
      ];

      await expect(EnhancedOrderService.batchUpdateOrders(invalidUpdates))
        .rejects.toThrow('Each update must have orderId and data properties');
    });
  });

  describe('subscribeToOrderChanges', () => {
    it('should set up real-time order subscription', async () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      const { onSnapshot } = await import('firebase/firestore');
      onSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = EnhancedOrderService.subscribeToOrderChanges('order123', mockCallback);

      expect(onSnapshot).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('subscribeToOrdersList', () => {
    it('should set up real-time orders list subscription', async () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      const { onSnapshot } = await import('firebase/firestore');
      onSnapshot.mockReturnValue(mockUnsubscribe);

      const options = { status: OrderStatus.PENDING };
      const unsubscribe = EnhancedOrderService.subscribeToOrdersList(options, mockCallback);

      expect(onSnapshot).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
});