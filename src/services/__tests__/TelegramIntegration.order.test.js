import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TelegramIntegration from '../TelegramIntegration';
import TelegramService from '../TelegramService';
import FirebaseService from '../FirebaseService';

// Mock dependencies
vi.mock('../TelegramService');
vi.mock('../FirebaseService');

describe('TelegramIntegration - Order Management Integration', () => {
  const mockOrderData = {
    id: 'order123',
    orderNumber: 'ORD-2024-123456',
    userId: 'user123',
    customer: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+998901234567',
      address: {
        street: 'Test Street 123',
        city: 'Tashkent'
      }
    },
    items: [
      {
        bookId: 'book1',
        title: 'Test Book 1',
        quantity: 2,
        price: 50000
      },
      {
        bookId: 'book2',
        title: 'Test Book 2',
        quantity: 1,
        price: 75000
      }
    ],
    totalAmount: 175000,
    status: 'pending',
    createdAt: new Date('2024-01-15T10:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock TelegramService methods
    TelegramService.notifyNewOrder = vi.fn();
    TelegramService.notifyOrderStatus = vi.fn();
    TelegramService.isConfigured = vi.fn().mockReturnValue(true);
    
    // Mock FirebaseService methods
    FirebaseService.updateOrder = vi.fn();
    FirebaseService.getOrder = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleNewOrder', () => {
    it('should send new order notification and update order with notification status', async () => {
      // Arrange
      TelegramService.notifyNewOrder.mockResolvedValue({
        success: true,
        data: { message_id: 123 }
      });
      
      FirebaseService.updateOrder.mockResolvedValue({ success: true });

      // Act
      const result = await TelegramIntegration.handleNewOrder(mockOrderData);

      // Assert
      expect(TelegramService.notifyNewOrder).toHaveBeenCalledWith(mockOrderData);
      expect(FirebaseService.updateOrder).toHaveBeenCalledWith('order123', {
        'notifications.telegramSent': true,
        'notifications.adminNotified': true,
        updatedAt: expect.any(Date)
      });
      
      expect(result).toEqual({
        success: true,
        telegramSent: true,
        message: 'Order notification sent successfully'
      });
    });

    it('should handle notification failure gracefully', async () => {
      // Arrange
      TelegramService.notifyNewOrder.mockResolvedValue({
        success: false,
        error: 'Network error'
      });
      
      FirebaseService.updateOrder.mockResolvedValue({ success: true });

      // Act
      const result = await TelegramIntegration.handleNewOrder(mockOrderData);

      // Assert
      expect(TelegramService.notifyNewOrder).toHaveBeenCalledWith(mockOrderData);
      expect(FirebaseService.updateOrder).toHaveBeenCalledWith('order123', {
        'notifications.telegramSent': false,
        'notifications.adminNotified': false,
        updatedAt: expect.any(Date)
      });
      
      expect(result).toEqual({
        success: true,
        telegramSent: false,
        message: 'Order created but notification failed'
      });
    });

    it('should handle orders without ID', async () => {
      // Arrange
      const orderWithoutId = { ...mockOrderData };
      delete orderWithoutId.id;
      
      TelegramService.notifyNewOrder.mockResolvedValue({
        success: true,
        data: { message_id: 123 }
      });

      // Act
      const result = await TelegramIntegration.handleNewOrder(orderWithoutId);

      // Assert
      expect(TelegramService.notifyNewOrder).toHaveBeenCalledWith(orderWithoutId);
      expect(FirebaseService.updateOrder).not.toHaveBeenCalled();
      
      expect(result).toEqual({
        success: true,
        telegramSent: true,
        message: 'Order notification sent successfully'
      });
    });

    it('should handle Firebase update errors', async () => {
      // Arrange
      TelegramService.notifyNewOrder.mockResolvedValue({
        success: true,
        data: { message_id: 123 }
      });
      
      FirebaseService.updateOrder.mockRejectedValue(new Error('Firebase error'));

      // Act
      const result = await TelegramIntegration.handleNewOrder(mockOrderData);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Firebase error'
      });
    });
  });

  describe('handleOrderStatusChange', () => {
    const orderId = 'order123';
    const newStatus = 'processing';

    beforeEach(() => {
      FirebaseService.getOrder.mockResolvedValue(mockOrderData);
    });

    it('should send status change notification and update order', async () => {
      // Arrange
      TelegramService.notifyOrderStatus.mockResolvedValue({
        success: true,
        data: { message_id: 124 }
      });
      
      FirebaseService.updateOrder.mockResolvedValue({ success: true });

      // Act
      const result = await TelegramIntegration.handleOrderStatusChange(orderId, newStatus);

      // Assert
      expect(FirebaseService.getOrder).toHaveBeenCalledWith(orderId);
      expect(TelegramService.notifyOrderStatus).toHaveBeenCalledWith(
        mockOrderData.userId,
        mockOrderData,
        newStatus
      );
      expect(FirebaseService.updateOrder).toHaveBeenCalledWith(orderId, {
        status: newStatus,
        'notifications.customerNotified': true,
        updatedAt: expect.any(Date)
      });
      
      expect(result).toEqual({
        success: true,
        telegramSent: true,
        message: `Order status updated to ${newStatus}`
      });
    });

    it('should handle order not found', async () => {
      // Arrange
      FirebaseService.getOrder.mockResolvedValue(null);

      // Act
      const result = await TelegramIntegration.handleOrderStatusChange(orderId, newStatus);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Order not found'
      });
      
      expect(TelegramService.notifyOrderStatus).not.toHaveBeenCalled();
      expect(FirebaseService.updateOrder).not.toHaveBeenCalled();
    });

    it('should handle notification failure but still update status', async () => {
      // Arrange
      TelegramService.notifyOrderStatus.mockResolvedValue({
        success: false,
        error: 'Telegram API error'
      });
      
      FirebaseService.updateOrder.mockResolvedValue({ success: true });

      // Act
      const result = await TelegramIntegration.handleOrderStatusChange(orderId, newStatus);

      // Assert
      expect(FirebaseService.updateOrder).toHaveBeenCalledWith(orderId, {
        status: newStatus,
        'notifications.customerNotified': false,
        updatedAt: expect.any(Date)
      });
      
      expect(result).toEqual({
        success: true,
        telegramSent: false,
        message: `Order status updated to ${newStatus}`
      });
    });

    it('should handle Firebase errors during status update', async () => {
      // Arrange
      TelegramService.notifyOrderStatus.mockResolvedValue({
        success: true,
        data: { message_id: 124 }
      });
      
      FirebaseService.updateOrder.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await TelegramIntegration.handleOrderStatusChange(orderId, newStatus);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('Integration with AdminOrderManagement workflow', () => {
    it('should handle complete order lifecycle with notifications', async () => {
      // Test new order creation
      TelegramService.notifyNewOrder.mockResolvedValue({ success: true });
      FirebaseService.updateOrder.mockResolvedValue({ success: true });

      const newOrderResult = await TelegramIntegration.handleNewOrder(mockOrderData);
      expect(newOrderResult.success).toBe(true);
      expect(newOrderResult.telegramSent).toBe(true);

      // Test status change to processing
      FirebaseService.getOrder.mockResolvedValue(mockOrderData);
      TelegramService.notifyOrderStatus.mockResolvedValue({ success: true });

      const statusChangeResult = await TelegramIntegration.handleOrderStatusChange(
        mockOrderData.id, 
        'processing'
      );
      expect(statusChangeResult.success).toBe(true);
      expect(statusChangeResult.telegramSent).toBe(true);

      // Test status change to completed
      const completedResult = await TelegramIntegration.handleOrderStatusChange(
        mockOrderData.id, 
        'completed'
      );
      expect(completedResult.success).toBe(true);
      expect(completedResult.telegramSent).toBe(true);

      // Verify all notifications were sent
      expect(TelegramService.notifyNewOrder).toHaveBeenCalledTimes(1);
      expect(TelegramService.notifyOrderStatus).toHaveBeenCalledTimes(2);
    });

    it('should maintain order functionality even when notifications fail', async () => {
      // Simulate all notifications failing
      TelegramService.notifyNewOrder.mockResolvedValue({ 
        success: false, 
        error: 'Service unavailable' 
      });
      TelegramService.notifyOrderStatus.mockResolvedValue({ 
        success: false, 
        error: 'Service unavailable' 
      });
      
      FirebaseService.updateOrder.mockResolvedValue({ success: true });
      FirebaseService.getOrder.mockResolvedValue(mockOrderData);

      // New order should still be created
      const newOrderResult = await TelegramIntegration.handleNewOrder(mockOrderData);
      expect(newOrderResult.success).toBe(true);
      expect(newOrderResult.telegramSent).toBe(false);

      // Status changes should still work
      const statusChangeResult = await TelegramIntegration.handleOrderStatusChange(
        mockOrderData.id, 
        'processing'
      );
      expect(statusChangeResult.success).toBe(true);
      expect(statusChangeResult.telegramSent).toBe(false);

      // Verify Firebase operations still happened
      expect(FirebaseService.updateOrder).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      // Arrange
      TelegramService.notifyNewOrder.mockRejectedValue(new Error('Network timeout'));
      
      // Act
      const result = await TelegramIntegration.handleNewOrder(mockOrderData);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Network timeout'
      });
    });

    it('should handle malformed order data', async () => {
      // Arrange
      const malformedOrder = {
        id: 'order123',
        // Missing required fields
      };

      TelegramService.notifyNewOrder.mockRejectedValue(new Error('Invalid order data'));

      // Act
      const result = await TelegramIntegration.handleNewOrder(malformedOrder);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Invalid order data'
      });
    });

    it('should handle concurrent status updates', async () => {
      // Arrange
      FirebaseService.getOrder.mockResolvedValue(mockOrderData);
      TelegramService.notifyOrderStatus.mockResolvedValue({ success: true });
      FirebaseService.updateOrder.mockResolvedValue({ success: true });

      // Act - simulate concurrent status updates
      const promises = [
        TelegramIntegration.handleOrderStatusChange(mockOrderData.id, 'processing'),
        TelegramIntegration.handleOrderStatusChange(mockOrderData.id, 'shipped'),
        TelegramIntegration.handleOrderStatusChange(mockOrderData.id, 'delivered')
      ];

      const results = await Promise.all(promises);

      // Assert
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(FirebaseService.getOrder).toHaveBeenCalledTimes(3);
      expect(TelegramService.notifyOrderStatus).toHaveBeenCalledTimes(3);
      expect(FirebaseService.updateOrder).toHaveBeenCalledTimes(3);
    });
  });
});