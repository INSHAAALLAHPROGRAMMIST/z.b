// Simple NotificationService Tests
// Requirements: 2.1, 2.2, 2.3, 2.4

import { describe, it, expect, vi } from 'vitest';
import { 
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITIES, 
  NOTIFICATION_CATEGORIES,
  createNotificationData,
  ORDER_NOTIFICATION_TEMPLATES,
  STOCK_NOTIFICATION_TEMPLATES
} from '../../models/NotificationModel';

describe('NotificationModel', () => {
  describe('createNotificationData', () => {
    it('should create notification data with required fields', () => {
      const notificationData = createNotificationData({
        userId: 'user-123',
        type: NOTIFICATION_TYPES.ORDER,
        title: 'Test Notification',
        message: 'Test message'
      });

      expect(notificationData).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          type: NOTIFICATION_TYPES.ORDER,
          title: 'Test Notification',
          message: 'Test message',
          read: false,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          createdAt: expect.any(Date),
          readAt: null
        })
      );
    });

    it('should create notification data with custom priority', () => {
      const notificationData = createNotificationData({
        userId: 'user-123',
        type: NOTIFICATION_TYPES.ORDER,
        title: 'Urgent Notification',
        message: 'Urgent message',
        priority: NOTIFICATION_PRIORITIES.URGENT
      });

      expect(notificationData.priority).toBe(NOTIFICATION_PRIORITIES.URGENT);
    });

    it('should create notification data with additional data', () => {
      const additionalData = { orderId: 'order-123', amount: 50000 };
      
      const notificationData = createNotificationData({
        userId: 'user-123',
        type: NOTIFICATION_TYPES.ORDER,
        title: 'Order Notification',
        message: 'Order created',
        data: additionalData
      });

      expect(notificationData.data).toEqual(additionalData);
    });

    it('should create notification data with action URL and text', () => {
      const notificationData = createNotificationData({
        userId: 'user-123',
        type: NOTIFICATION_TYPES.ORDER,
        title: 'Order Notification',
        message: 'Order created',
        actionUrl: '/orders/123',
        actionText: 'View Order'
      });

      expect(notificationData.actionUrl).toBe('/orders/123');
      expect(notificationData.actionText).toBe('View Order');
    });

    it('should create notification data with expiration date', () => {
      const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      const notificationData = createNotificationData({
        userId: 'user-123',
        type: NOTIFICATION_TYPES.PROMOTION,
        title: 'Limited Offer',
        message: 'Special discount available',
        expiresAt: expirationDate
      });

      expect(notificationData.expiresAt).toBe(expirationDate);
    });
  });

  describe('Notification Templates', () => {
    it('should have order notification templates', () => {
      expect(ORDER_NOTIFICATION_TEMPLATES).toHaveProperty(NOTIFICATION_CATEGORIES.ORDER_CREATED);
      expect(ORDER_NOTIFICATION_TEMPLATES).toHaveProperty(NOTIFICATION_CATEGORIES.ORDER_CONFIRMED);
      expect(ORDER_NOTIFICATION_TEMPLATES).toHaveProperty(NOTIFICATION_CATEGORIES.ORDER_SHIPPED);
      expect(ORDER_NOTIFICATION_TEMPLATES).toHaveProperty(NOTIFICATION_CATEGORIES.ORDER_DELIVERED);
      expect(ORDER_NOTIFICATION_TEMPLATES).toHaveProperty(NOTIFICATION_CATEGORIES.ORDER_CANCELLED);
    });

    it('should have stock notification templates', () => {
      expect(STOCK_NOTIFICATION_TEMPLATES).toHaveProperty(NOTIFICATION_CATEGORIES.STOCK_LOW);
      expect(STOCK_NOTIFICATION_TEMPLATES).toHaveProperty(NOTIFICATION_CATEGORIES.STOCK_OUT);
      expect(STOCK_NOTIFICATION_TEMPLATES).toHaveProperty(NOTIFICATION_CATEGORIES.STOCK_RESTOCKED);
    });

    it('should have correct template structure', () => {
      const template = ORDER_NOTIFICATION_TEMPLATES[NOTIFICATION_CATEGORIES.ORDER_CREATED];
      
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('message');
      expect(template).toHaveProperty('priority');
      expect(template).toHaveProperty('actionText');
      
      expect(typeof template.title).toBe('string');
      expect(typeof template.message).toBe('string');
      expect(Object.values(NOTIFICATION_PRIORITIES)).toContain(template.priority);
    });
  });

  describe('Notification Constants', () => {
    it('should have all notification types', () => {
      expect(NOTIFICATION_TYPES).toHaveProperty('ORDER');
      expect(NOTIFICATION_TYPES).toHaveProperty('WISHLIST');
      expect(NOTIFICATION_TYPES).toHaveProperty('PROMOTION');
      expect(NOTIFICATION_TYPES).toHaveProperty('SYSTEM');
      expect(NOTIFICATION_TYPES).toHaveProperty('LOW_STOCK');
    });

    it('should have all notification priorities', () => {
      expect(NOTIFICATION_PRIORITIES).toHaveProperty('LOW');
      expect(NOTIFICATION_PRIORITIES).toHaveProperty('MEDIUM');
      expect(NOTIFICATION_PRIORITIES).toHaveProperty('HIGH');
      expect(NOTIFICATION_PRIORITIES).toHaveProperty('URGENT');
    });

    it('should have all notification categories', () => {
      expect(NOTIFICATION_CATEGORIES).toHaveProperty('ORDER_CREATED');
      expect(NOTIFICATION_CATEGORIES).toHaveProperty('ORDER_CONFIRMED');
      expect(NOTIFICATION_CATEGORIES).toHaveProperty('ORDER_SHIPPED');
      expect(NOTIFICATION_CATEGORIES).toHaveProperty('ORDER_DELIVERED');
      expect(NOTIFICATION_CATEGORIES).toHaveProperty('ORDER_CANCELLED');
      expect(NOTIFICATION_CATEGORIES).toHaveProperty('STOCK_LOW');
      expect(NOTIFICATION_CATEGORIES).toHaveProperty('STOCK_OUT');
      expect(NOTIFICATION_CATEGORIES).toHaveProperty('WISHLIST_AVAILABLE');
    });
  });
});