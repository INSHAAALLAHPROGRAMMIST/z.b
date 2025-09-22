/**
 * Unit tests for TelegramService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TelegramService from '../TelegramService.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_TELEGRAM_BOT_TOKEN: 'test_bot_token',
  VITE_TELEGRAM_CHAT_ID: 'test_chat_id'
}));

describe('TelegramService', () => {
  let telegramService;

  beforeEach(() => {
    // Create a new instance for each test
    telegramService = new (TelegramService.constructor)();
    telegramService.botToken = 'test_bot_token';
    telegramService.adminChatId = 'test_chat_id';
    telegramService.baseUrl = 'https://api.telegram.org/bottest_bot_token';
    
    // Reset fetch mock
    fetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should be configured when bot token and chat ID are available', () => {
      expect(telegramService.isConfigured()).toBe(true);
    });

    it('should not be configured when bot token is missing', () => {
      telegramService.botToken = null;
      expect(telegramService.isConfigured()).toBe(false);
    });

    it('should not be configured when chat ID is missing', () => {
      telegramService.adminChatId = null;
      expect(telegramService.isConfigured()).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockResponse = {
        ok: true,
        result: { message_id: 123 }
      };

      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve(mockResponse)
        })
      );

      const result = await telegramService.sendMessage('test_chat', 'Test message');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest_bot_token/sendMessage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: 'test_chat',
            text: 'Test message',
            parse_mode: 'HTML'
          })
        }
      );

      expect(result).toEqual({
        success: true,
        data: { message_id: 123 }
      });
    });

    it('should handle API errors', async () => {
      // Mock a response that will trigger the API error path
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({
            ok: false,
            description: 'Bad Request: chat not found'
          })
        })
      );

      const result = await telegramService.sendMessage('invalid_chat', 'Test message');

      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });

    it('should return error when service is not configured', async () => {
      telegramService.botToken = null;

      const result = await telegramService.sendMessage('test_chat', 'Test message');

      expect(result).toEqual({
        success: false,
        error: 'Service not configured'
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should retry on network errors', async () => {
      // First two attempts fail, third succeeds
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ ok: true, result: { message_id: 123 } })
        });

      const result = await telegramService.sendMessage('test_chat', 'Test message');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it('should fail after maximum retry attempts', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await telegramService.sendMessage('test_chat', 'Test message');

      expect(fetch).toHaveBeenCalledTimes(3); // Default retry attempts
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('notifyNewOrder', () => {
    const mockOrderData = {
      orderNumber: 'ORD-001',
      customer: {
        name: 'John Doe',
        phone: '+998901234567',
        email: 'john@example.com',
        address: {
          street: 'Main Street 123',
          city: 'Tashkent'
        }
      },
      items: [
        {
          title: 'Test Book 1',
          quantity: 2,
          price: 50000
        },
        {
          title: 'Test Book 2',
          quantity: 1,
          price: 75000
        }
      ],
      totalAmount: 175000,
      createdAt: new Date('2024-01-15T10:30:00Z')
    };

    it('should send new order notification with correct format', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
      });

      const result = await telegramService.notifyNewOrder(mockOrderData);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Yangi buyurtma!')
        })
      );

      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.text).toContain('ORD-001');
      expect(requestBody.text).toContain('John Doe');
      expect(requestBody.text).toContain('Test Book 1');
      expect(requestBody.text).toContain('175'); // Check for the number
    });

    it('should handle missing customer data gracefully', async () => {
      const orderWithoutCustomer = {
        ...mockOrderData,
        customer: {}
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
      });

      const result = await telegramService.notifyNewOrder(orderWithoutCustomer);

      expect(result.success).toBe(true);
      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.text).toContain('Noma\'lum'); // Should show "Unknown" for missing data
    });
  });

  describe('notifyOrderStatus', () => {
    const mockOrderData = {
      orderNumber: 'ORD-001',
      customer: {
        name: 'John Doe',
        phone: '+998901234567'
      }
    };

    it('should send order status notification', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
      });

      const result = await telegramService.notifyOrderStatus('user123', mockOrderData, 'confirmed');

      expect(result.success).toBe(true);
      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.text).toContain('Buyurtma holati o\'zgartirildi');
      expect(requestBody.text).toContain('ORD-001');
      expect(requestBody.text).toContain('Tasdiqlandi');
    });

    it('should handle different status types', async () => {
      const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      
      for (const status of statuses) {
        fetch.mockResolvedValueOnce({
          json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
        });

        const result = await telegramService.notifyOrderStatus('user123', mockOrderData, status);
        expect(result.success).toBe(true);
      }

      expect(fetch).toHaveBeenCalledTimes(statuses.length);
    });
  });

  describe('notifyLowStock', () => {
    const mockBookData = {
      title: 'Test Book',
      authorName: 'Test Author',
      price: 50000,
      inventory: {
        stock: 2
      }
    };

    it('should send low stock notification', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
      });

      const result = await telegramService.notifyLowStock(mockBookData);

      expect(result.success).toBe(true);
      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.text).toContain('Stok tugayapti!');
      expect(requestBody.text).toContain('Test Book');
      expect(requestBody.text).toContain('Test Author');
      expect(requestBody.text).toContain('2');
    });

    it('should handle book without inventory object', async () => {
      const bookWithoutInventory = {
        ...mockBookData,
        stock: 1,
        inventory: undefined
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
      });

      const result = await telegramService.notifyLowStock(bookWithoutInventory);

      expect(result.success).toBe(true);
      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.text).toContain('1');
    });
  });

  describe('sendBulkNotifications', () => {
    const mockUsers = [
      { id: 'user1', telegramChatId: 'chat1' },
      { id: 'user2', chatId: 'chat2' },
      { id: 'user3' } // No chat ID
    ];

    it('should send bulk notifications to multiple users', async () => {
      fetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ ok: true, result: { message_id: 124 } })
        });

      const results = await telegramService.sendBulkNotifications(mockUsers, 'Bulk message');

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ userId: 'user1', success: true, error: undefined });
      expect(results[1]).toEqual({ userId: 'user2', success: true, error: undefined });
      expect(results[2]).toEqual({ 
        userId: 'user3', 
        success: false, 
        error: 'No Telegram chat ID available' 
      });

      expect(fetch).toHaveBeenCalledTimes(2); // Only for users with chat IDs
    });

    it('should handle individual failures in bulk notifications', async () => {
      fetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const results = await telegramService.sendBulkNotifications(
        mockUsers.slice(0, 2), 
        'Bulk message'
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Network error');
    });
  });

  describe('testConnection', () => {
    it('should test bot connection successfully', async () => {
      const mockBotInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'testbot'
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: mockBotInfo })
      });

      const result = await telegramService.testConnection();

      expect(result.success).toBe(true);
      expect(result.botInfo).toEqual(mockBotInfo);
      expect(result.message).toContain('Test Bot');
      expect(result.message).toContain('@testbot');
    });

    it('should handle connection test failure', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ 
          ok: false, 
          description: 'Unauthorized' 
        })
      });

      const result = await telegramService.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should return error when service is not configured', async () => {
      telegramService.botToken = null;

      const result = await telegramService.testConnection();

      expect(result).toEqual({
        success: false,
        error: 'Service not configured'
      });
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await telegramService.notifyNewOrder({
        orderNumber: 'ORD-001',
        items: [],
        totalAmount: 0,
        customer: {},
        createdAt: new Date()
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle malformed responses', async () => {
      fetch.mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.reject(new Error('Invalid JSON'))
        })
      );

      const result = await telegramService.sendMessage('test_chat', 'Test message');

      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });
  });

  describe('Message Formatting', () => {
    it('should format messages with proper HTML tags', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
      });

      await telegramService.notifyNewOrder({
        orderNumber: 'ORD-001',
        customer: { name: 'Test User' },
        items: [{ title: 'Book', quantity: 1, price: 1000 }],
        totalAmount: 1000,
        createdAt: new Date()
      });

      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.text).toContain('<b>');
      expect(requestBody.parse_mode).toBe('HTML');
    });

    it('should handle special characters in messages', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
      });

      const bookWithSpecialChars = {
        title: 'Book with "quotes" & symbols',
        authorName: 'Author <Name>',
        price: 50000,
        inventory: { stock: 1 }
      };

      const result = await telegramService.notifyLowStock(bookWithSpecialChars);

      expect(result.success).toBe(true);
      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody.text).toContain('Book with "quotes" & symbols');
    });
  });
});