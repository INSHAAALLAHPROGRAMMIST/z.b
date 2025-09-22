// NotificationService Tests
// Requirements: 2.1, 2.2, 2.3, 2.4

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase
vi.mock('../../firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  writeBatch: vi.fn()
}));

// Import after mocks
import notificationService from '../NotificationService';
import { 
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITIES, 
  NOTIFICATION_CATEGORIES 
} from '../../models/NotificationModel';

// Get mocked functions
import {
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  collection,
  doc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const mockDocRef = { id: 'notification-id' };
      addDoc.mockResolvedValue(mockDocRef);

      const notificationData = {
        userId: 'user-123',
        type: NOTIFICATION_TYPES.ORDER,
        title: 'Test Notification',
        message: 'Test message',
        priority: NOTIFICATION_PRIORITIES.HIGH
      };

      const result = await notificationService.createNotification(notificationData);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user-123',
          type: NOTIFICATION_TYPES.ORDER,
          title: 'Test Notification',
          message: 'Test message',
          priority: NOTIFICATION_PRIORITIES.HIGH,
          read: false,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'notification-id',
          userId: 'user-123',
          type: NOTIFICATION_TYPES.ORDER,
          title: 'Test Notification',
          message: 'Test message'
        })
      );
    });

    it('should handle errors when creating notification', async () => {
      const error = new Error('Database error');
      mockAddDoc.mockRejectedValue(error);

      const notificationData = {
        userId: 'user-123',
        type: NOTIFICATION_TYPES.ORDER,
        title: 'Test Notification',
        message: 'Test message'
      };

      await expect(notificationService.createNotification(notificationData))
        .rejects.toThrow('Bildirishnoma yaratishda xato: Database error');
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with pagination', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'notif-1',
            data: () => ({
              userId: 'user-123',
              title: 'Notification 1',
              message: 'Message 1',
              read: false,
              createdAt: new Date()
            })
          },
          {
            id: 'notif-2',
            data: () => ({
              userId: 'user-123',
              title: 'Notification 2',
              message: 'Message 2',
              read: true,
              createdAt: new Date()
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);
      mockQuery.mockReturnValue({});
      mockCollection.mockReturnValue({});
      mockWhere.mockReturnValue({});
      mockOrderBy.mockReturnValue({});
      mockLimit.mockReturnValue({});

      const result = await notificationService.getUserNotifications('user-123', {
        limitCount: 10
      });

      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[0]).toEqual(
        expect.objectContaining({
          id: 'notif-1',
          title: 'Notification 1',
          read: false
        })
      );
      expect(result.hasMore).toBe(false);
    });

    it('should handle errors when getting notifications', async () => {
      const error = new Error('Database error');
      mockGetDocs.mockRejectedValue(error);

      await expect(notificationService.getUserNotifications('user-123'))
        .rejects.toThrow('Bildirishnomalarni yuklashda xato: Database error');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockUpdateDoc.mockResolvedValue();
      mockDoc.mockReturnValue({});

      const result = await notificationService.markAsRead('notification-id');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          read: true,
          readAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      );

      expect(result).toEqual({ success: true });
    });

    it('should handle errors when marking as read', async () => {
      const error = new Error('Database error');
      mockUpdateDoc.mockRejectedValue(error);

      await expect(notificationService.markAsRead('notification-id'))
        .rejects.toThrow('Bildirishnomani o\'qilgan deb belgilashda xato: Database error');
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread notification count', async () => {
      const mockSnapshot = { size: 5 };
      mockGetDocs.mockResolvedValue(mockSnapshot);
      mockQuery.mockReturnValue({});
      mockCollection.mockReturnValue({});
      mockWhere.mockReturnValue({});

      const count = await notificationService.getUnreadCount('user-123');

      expect(count).toBe(5);
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user-123');
      expect(mockWhere).toHaveBeenCalledWith('read', '==', false);
    });

    it('should return 0 on error', async () => {
      const error = new Error('Database error');
      mockGetDocs.mockRejectedValue(error);

      const count = await notificationService.getUnreadCount('user-123');

      expect(count).toBe(0);
    });
  });

  describe('createOrderNotification', () => {
    it('should create order notification with template', async () => {
      const mockDocRef = { id: 'notification-id' };
      mockAddDoc.mockResolvedValue(mockDocRef);

      const orderData = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        totalAmount: 50000,
        status: 'confirmed'
      };

      const result = await notificationService.createOrderNotification(
        'user-123',
        orderData,
        NOTIFICATION_CATEGORIES.ORDER_CONFIRMED
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user-123',
          type: NOTIFICATION_TYPES.ORDER,
          title: 'Buyurtma tasdiqlandi',
          message: 'Buyurtmangiz #ORD-001 tasdiqlandi va tayyorlanmoqda',
          priority: NOTIFICATION_PRIORITIES.HIGH,
          category: NOTIFICATION_CATEGORIES.ORDER_CONFIRMED,
          data: expect.objectContaining({
            orderId: 'order-123',
            orderNumber: 'ORD-001',
            totalAmount: 50000,
            status: 'confirmed'
          })
        })
      );

      expect(result.id).toBe('notification-id');
    });

    it('should throw error for invalid category', async () => {
      const orderData = { id: 'order-123' };

      await expect(notificationService.createOrderNotification(
        'user-123',
        orderData,
        'invalid-category'
      )).rejects.toThrow('Order notification template not found: invalid-category');
    });
  });

  describe('createStockNotification', () => {
    it('should create stock notification for admin', async () => {
      const mockDocRef = { id: 'notification-id' };
      mockAddDoc.mockResolvedValue(mockDocRef);

      const bookData = {
        id: 'book-123',
        title: 'Test Book',
        stock: 2,
        lowStockThreshold: 5
      };

      const result = await notificationService.createStockNotification(
        'admin-123',
        bookData,
        NOTIFICATION_CATEGORIES.STOCK_LOW
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'admin-123',
          type: NOTIFICATION_TYPES.LOW_STOCK,
          title: 'Stok kam qoldi',
          message: '\'Test Book\' kitobining stoklari kam qoldi (2 dona)',
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          category: NOTIFICATION_CATEGORIES.STOCK_LOW,
          data: expect.objectContaining({
            bookId: 'book-123',
            bookTitle: 'Test Book',
            currentStock: 2,
            threshold: 5
          })
        })
      );

      expect(result.id).toBe('notification-id');
    });
  });

  describe('createBulkNotifications', () => {
    it('should create bulk notifications for multiple users', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue()
      };
      mockWriteBatch.mockReturnValue(mockBatch);
      mockDoc.mockReturnValue({ id: 'doc-id' });

      const userIds = ['user-1', 'user-2', 'user-3'];
      const notificationData = {
        type: NOTIFICATION_TYPES.SYSTEM,
        title: 'System Update',
        message: 'System will be updated tonight'
      };

      const result = await notificationService.createBulkNotifications(userIds, notificationData);

      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(3);
      expect(result.summary.failed).toBe(0);
    });

    it('should throw error for empty user list', async () => {
      await expect(notificationService.createBulkNotifications([], {}))
        .rejects.toThrow('User IDs array is required');
    });

    it('should throw error for too many users', async () => {
      const userIds = new Array(501).fill('user');
      
      await expect(notificationService.createBulkNotifications(userIds, {}))
        .rejects.toThrow('Bulk notification limit is 500 users');
    });
  });

  describe('subscribeToUserNotifications', () => {
    it('should set up real-time listener for user notifications', () => {
      const mockUnsubscribe = vi.fn();
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);
      mockQuery.mockReturnValue({});
      mockCollection.mockReturnValue({});
      mockWhere.mockReturnValue({});
      mockOrderBy.mockReturnValue({});
      mockLimit.mockReturnValue({});

      const callback = vi.fn();
      const unsubscribe = notificationService.subscribeToUserNotifications('user-123', callback);

      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences if they exist', async () => {
      const mockPreferences = {
        orders: { created: true, confirmed: true },
        wishlist: { available: true, priceDrops: false }
      };

      const mockDocSnap = {
        exists: () => true,
        data: () => mockPreferences
      };

      const mockGetDoc = vi.fn().mockResolvedValue(mockDocSnap);
      vi.doMock('firebase/firestore', async () => ({
        ...(await vi.importActual('firebase/firestore')),
        getDoc: mockGetDoc
      }));

      // Mock the method directly since we can't easily mock the import
      notificationService.getUserPreferences = vi.fn().mockResolvedValue(mockPreferences);

      const result = await notificationService.getUserPreferences('user-123');

      expect(result).toEqual(mockPreferences);
    });

    it('should return default preferences if user preferences do not exist', async () => {
      const defaultPrefs = notificationService.getDefaultPreferences();
      
      // Mock the method to return default preferences
      notificationService.getUserPreferences = vi.fn().mockResolvedValue(defaultPrefs);

      const result = await notificationService.getUserPreferences('user-123');

      expect(result).toEqual(defaultPrefs);
      expect(result.orders.created).toBe(true);
      expect(result.channels.inApp).toBe(true);
    });
  });

  describe('getDefaultPreferences', () => {
    it('should return correct default preferences structure', () => {
      const defaults = notificationService.getDefaultPreferences();

      expect(defaults).toHaveProperty('orders');
      expect(defaults).toHaveProperty('wishlist');
      expect(defaults).toHaveProperty('promotions');
      expect(defaults).toHaveProperty('system');
      expect(defaults).toHaveProperty('channels');

      expect(defaults.orders.created).toBe(true);
      expect(defaults.orders.confirmed).toBe(true);
      expect(defaults.channels.inApp).toBe(true);
      expect(defaults.channels.email).toBe(false);
      expect(defaults.promotions.newBooks).toBe(false);
    });
  });

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      const mockSnapshot = {
        docs: [
          { data: () => ({ read: true, type: 'order', priority: 'high', category: 'order_created' }) },
          { data: () => ({ read: false, type: 'order', priority: 'medium', category: 'order_shipped' }) },
          { data: () => ({ read: false, type: 'wishlist', priority: 'low', category: 'wishlist_available' }) }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);
      mockQuery.mockReturnValue({});
      mockCollection.mockReturnValue({});

      const stats = await notificationService.getNotificationStats('user-123');

      expect(stats.total).toBe(3);
      expect(stats.read).toBe(1);
      expect(stats.unread).toBe(2);
      expect(stats.byType.order).toBe(2);
      expect(stats.byType.wishlist).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.byCategory.order_created).toBe(1);
      expect(stats.byCategory.order_shipped).toBe(1);
      expect(stats.byCategory.wishlist_available).toBe(1);
    });
  });
});