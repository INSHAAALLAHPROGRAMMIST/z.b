/**
 * Order Model Tests
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrderModel, OrderStatus, PaymentStatus, ShippingMethod, PaymentMethod } from '../OrderModel';

describe('OrderModel', () => {
  let orderData;

  beforeEach(() => {
    orderData = {
      userId: 'user123',
      items: [
        {
          bookId: 'book1',
          bookTitle: 'Test Book 1',
          quantity: 2,
          unitPrice: 50000,
          totalPrice: 100000
        },
        {
          bookId: 'book2',
          bookTitle: 'Test Book 2',
          quantity: 1,
          unitPrice: 30000,
          totalPrice: 30000
        }
      ],
      totalAmount: 130000,
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
      }
    };
  });

  describe('constructor', () => {
    it('should create order with default values', () => {
      const order = new OrderModel();

      expect(order.id).toBeNull();
      expect(order.orderNumber).toMatch(/^ORD-\d{8}-\d{9}$/);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.items).toEqual([]);
      expect(order.customer.name).toBe('');
      expect(order.payment.method).toBe(PaymentMethod.CASH);
      expect(order.payment.status).toBe(PaymentStatus.PENDING);
      expect(order.shipping.method).toBe(ShippingMethod.PICKUP);
    });

    it('should create order with provided data', () => {
      const order = new OrderModel(orderData);

      expect(order.userId).toBe('user123');
      expect(order.items).toHaveLength(2);
      expect(order.customer.name).toBe('John Doe');
      expect(order.totalAmount).toBe(130000);
    });

    it('should generate unique order numbers', () => {
      const order1 = new OrderModel();
      const order2 = new OrderModel();

      expect(order1.orderNumber).not.toBe(order2.orderNumber);
      expect(order1.orderNumber).toMatch(/^ORD-\d{8}-\d{9}$/);
      expect(order2.orderNumber).toMatch(/^ORD-\d{8}-\d{9}$/);
    });
  });

  describe('updateStatus', () => {
    it('should update status and add to history', () => {
      const order = new OrderModel(orderData);
      const initialStatus = order.status;

      order.updateStatus(OrderStatus.CONFIRMED, 'Order confirmed by admin');

      expect(order.status).toBe(OrderStatus.CONFIRMED);
      expect(order.statusHistory).toHaveLength(1);
      expect(order.statusHistory[0].from).toBe(initialStatus);
      expect(order.statusHistory[0].to).toBe(OrderStatus.CONFIRMED);
      expect(order.statusHistory[0].notes).toBe('Order confirmed by admin');
    });

    it('should set appropriate timestamps for different statuses', () => {
      const order = new OrderModel(orderData);

      order.updateStatus(OrderStatus.CONFIRMED);
      expect(order.timestamps.confirmedAt).toBeInstanceOf(Date);

      order.updateStatus(OrderStatus.PROCESSING);
      expect(order.timestamps.processedAt).toBeInstanceOf(Date);

      order.updateStatus(OrderStatus.SHIPPED);
      expect(order.timestamps.shippedAt).toBeInstanceOf(Date);

      order.updateStatus(OrderStatus.DELIVERED);
      expect(order.timestamps.deliveredAt).toBeInstanceOf(Date);

      order.updateStatus(OrderStatus.CANCELLED);
      expect(order.timestamps.cancelledAt).toBeInstanceOf(Date);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status and transaction ID', () => {
      const order = new OrderModel(orderData);

      order.updatePaymentStatus(PaymentStatus.PAID, 'txn123');

      expect(order.payment.status).toBe(PaymentStatus.PAID);
      expect(order.payment.transactionId).toBe('txn123');
      expect(order.payment.paidAt).toBeInstanceOf(Date);
    });

    it('should set paidAt timestamp when status is PAID', () => {
      const order = new OrderModel(orderData);

      order.updatePaymentStatus(PaymentStatus.PAID);

      expect(order.payment.paidAt).toBeInstanceOf(Date);
    });
  });

  describe('addTrackingNumber', () => {
    it('should add tracking number and carrier', () => {
      const order = new OrderModel(orderData);

      order.addTrackingNumber('TRK123456', 'Express Delivery');

      expect(order.shipping.trackingNumber).toBe('TRK123456');
      expect(order.shipping.carrier).toBe('Express Delivery');
    });
  });

  describe('calculateTotals', () => {
    it('should calculate order totals correctly', () => {
      const order = new OrderModel(orderData);
      order.breakdown.shippingCost = 15000;
      order.breakdown.tax = 5000;
      order.breakdown.discount = 10000;

      order.calculateTotals();

      expect(order.breakdown.subtotal).toBe(130000);
      expect(order.breakdown.total).toBe(140000); // 130000 + 15000 + 5000 - 10000
      expect(order.totalAmount).toBe(140000);
    });
  });

  describe('addItem', () => {
    it('should add new item to order', () => {
      const order = new OrderModel(orderData);
      const initialItemCount = order.items.length;

      const newItem = {
        bookId: 'book3',
        bookTitle: 'New Book',
        quantity: 1,
        unitPrice: 25000
      };

      order.addItem(newItem);

      expect(order.items).toHaveLength(initialItemCount + 1);
      expect(order.items[initialItemCount].bookId).toBe('book3');
      expect(order.items[initialItemCount].totalPrice).toBe(25000);
    });

    it('should update quantity if item already exists', () => {
      const order = new OrderModel(orderData);

      const existingItem = {
        bookId: 'book1',
        bookTitle: 'Test Book 1',
        quantity: 1,
        unitPrice: 50000
      };

      order.addItem(existingItem);

      expect(order.items).toHaveLength(2); // Should not add new item
      expect(order.items[0].quantity).toBe(3); // 2 + 1
      expect(order.items[0].totalPrice).toBe(150000); // 3 * 50000
    });
  });

  describe('removeItem', () => {
    it('should remove item from order', () => {
      const order = new OrderModel(orderData);
      const initialItemCount = order.items.length;

      order.removeItem('book1');

      expect(order.items).toHaveLength(initialItemCount - 1);
      expect(order.items.find(item => item.bookId === 'book1')).toBeUndefined();
    });
  });

  describe('getSummary', () => {
    it('should return order summary', () => {
      const order = new OrderModel(orderData);

      const summary = order.getSummary();

      expect(summary).toHaveProperty('orderNumber');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('totalAmount');
      expect(summary).toHaveProperty('itemCount');
      expect(summary).toHaveProperty('customerName');
      expect(summary).toHaveProperty('createdAt');
      expect(summary.itemCount).toBe(2);
      expect(summary.customerName).toBe('John Doe');
    });
  });

  describe('getStatusText', () => {
    it('should return status text in Uzbek', () => {
      const order = new OrderModel(orderData);

      expect(order.getStatusText()).toBe('Kutilmoqda');

      order.updateStatus(OrderStatus.CONFIRMED);
      expect(order.getStatusText()).toBe('Tasdiqlangan');

      order.updateStatus(OrderStatus.DELIVERED);
      expect(order.getStatusText()).toBe('Yetkazilgan');
    });
  });

  describe('getPaymentStatusText', () => {
    it('should return payment status text in Uzbek', () => {
      const order = new OrderModel(orderData);

      expect(order.getPaymentStatusText()).toBe('Kutilmoqda');

      order.updatePaymentStatus(PaymentStatus.PAID);
      expect(order.getPaymentStatusText()).toBe('To\'langan');

      order.updatePaymentStatus(PaymentStatus.FAILED);
      expect(order.getPaymentStatusText()).toBe('Muvaffaqiyatsiz');
    });
  });

  describe('canBeCancelled', () => {
    it('should return true for pending and confirmed orders', () => {
      const order = new OrderModel(orderData);

      expect(order.canBeCancelled()).toBe(true);

      order.updateStatus(OrderStatus.CONFIRMED);
      expect(order.canBeCancelled()).toBe(true);

      order.updateStatus(OrderStatus.PROCESSING);
      expect(order.canBeCancelled()).toBe(false);

      order.updateStatus(OrderStatus.SHIPPED);
      expect(order.canBeCancelled()).toBe(false);
    });
  });

  describe('canBeRefunded', () => {
    it('should return true for paid and delivered/cancelled orders', () => {
      const order = new OrderModel(orderData);

      // Not paid yet
      expect(order.canBeRefunded()).toBe(false);

      // Paid but not delivered
      order.updatePaymentStatus(PaymentStatus.PAID);
      expect(order.canBeRefunded()).toBe(false);

      // Paid and delivered
      order.updateStatus(OrderStatus.DELIVERED);
      expect(order.canBeRefunded()).toBe(true);

      // Paid and cancelled
      order.updateStatus(OrderStatus.CANCELLED);
      expect(order.canBeRefunded()).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate valid order data', () => {
      const order = new OrderModel(orderData);

      const validation = order.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return errors for invalid order data', () => {
      const invalidOrder = new OrderModel({
        // Missing required fields
        items: [],
        totalAmount: 0,
        customer: {
          name: '',
          phone: '',
          email: ''
        }
      });

      const validation = invalidOrder.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('User ID is required');
      expect(validation.errors).toContain('Order must have at least one item');
      expect(validation.errors).toContain('Customer name is required');
      expect(validation.errors).toContain('Customer phone or email is required');
      expect(validation.errors).toContain('Total amount must be greater than 0');
    });

    it('should validate individual items', () => {
      const orderWithInvalidItems = new OrderModel({
        ...orderData,
        items: [
          {
            // Missing required fields
            quantity: 0,
            unitPrice: -100
          }
        ]
      });

      const validation = orderWithInvalidItems.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Item 1: Book ID is required');
      expect(validation.errors).toContain('Item 1: Quantity must be greater than 0');
      expect(validation.errors).toContain('Item 1: Unit price must be greater than 0');
    });
  });

  describe('toObject', () => {
    it('should convert to plain object', () => {
      const order = new OrderModel(orderData);

      const obj = order.toObject();

      expect(obj).toBeInstanceOf(Object);
      expect(obj).toHaveProperty('id');
      expect(obj).toHaveProperty('orderNumber');
      expect(obj).toHaveProperty('userId');
      expect(obj).toHaveProperty('items');
      expect(obj).toHaveProperty('customer');
      expect(obj).toHaveProperty('payment');
      expect(obj).toHaveProperty('shipping');
      expect(obj).toHaveProperty('timestamps');
    });
  });

  describe('fromObject', () => {
    it('should create OrderModel from plain object', () => {
      const order = new OrderModel(orderData);
      const obj = order.toObject();

      const recreatedOrder = OrderModel.fromObject(obj);

      expect(recreatedOrder).toBeInstanceOf(OrderModel);
      expect(recreatedOrder.userId).toBe(order.userId);
      expect(recreatedOrder.orderNumber).toBe(order.orderNumber);
      expect(recreatedOrder.items).toEqual(order.items);
    });
  });

  describe('status transitions', () => {
    it('should track status history correctly', () => {
      const order = new OrderModel(orderData);

      order.updateStatus(OrderStatus.CONFIRMED, 'Admin confirmed');
      order.updateStatus(OrderStatus.PROCESSING, 'Started processing');
      order.updateStatus(OrderStatus.SHIPPED, 'Package shipped');

      expect(order.statusHistory).toHaveLength(3);
      expect(order.statusHistory[0].to).toBe(OrderStatus.CONFIRMED);
      expect(order.statusHistory[1].to).toBe(OrderStatus.PROCESSING);
      expect(order.statusHistory[2].to).toBe(OrderStatus.SHIPPED);
    });
  });

  describe('enhanced fields', () => {
    it('should handle enhanced customer data', () => {
      const enhancedOrderData = {
        ...orderData,
        customer: {
          ...orderData.customer,
          telegramUsername: '@johndoe',
          address: {
            ...orderData.customer.address,
            country: 'Uzbekistan'
          }
        }
      };

      const order = new OrderModel(enhancedOrderData);

      expect(order.customer.telegramUsername).toBe('@johndoe');
      expect(order.customer.address.country).toBe('Uzbekistan');
    });

    it('should handle enhanced payment data', () => {
      const enhancedOrderData = {
        ...orderData,
        payment: {
          method: PaymentMethod.CARD,
          status: PaymentStatus.PAID,
          transactionId: 'txn123',
          amount: 130000,
          currency: 'UZS'
        }
      };

      const order = new OrderModel(enhancedOrderData);

      expect(order.payment.method).toBe(PaymentMethod.CARD);
      expect(order.payment.transactionId).toBe('txn123');
      expect(order.payment.currency).toBe('UZS');
    });

    it('should handle enhanced shipping data', () => {
      const enhancedOrderData = {
        ...orderData,
        shipping: {
          method: ShippingMethod.COURIER,
          cost: 20000,
          trackingNumber: 'TRK123',
          carrier: 'Express',
          estimatedDelivery: new Date('2024-02-01'),
          instructions: 'Call before delivery'
        }
      };

      const order = new OrderModel(enhancedOrderData);

      expect(order.shipping.method).toBe(ShippingMethod.COURIER);
      expect(order.shipping.trackingNumber).toBe('TRK123');
      expect(order.shipping.carrier).toBe('Express');
      expect(order.shipping.instructions).toBe('Call before delivery');
    });

    it('should handle metadata and analytics', () => {
      const enhancedOrderData = {
        ...orderData,
        metadata: {
          source: 'mobile',
          userAgent: 'Mozilla/5.0...',
          notes: 'Rush order'
        },
        analytics: {
          processingTime: 3600000, // 1 hour
          customerSatisfaction: 5
        }
      };

      const order = new OrderModel(enhancedOrderData);

      expect(order.metadata.source).toBe('mobile');
      expect(order.metadata.notes).toBe('Rush order');
      expect(order.analytics.processingTime).toBe(3600000);
      expect(order.analytics.customerSatisfaction).toBe(5);
    });
  });
});