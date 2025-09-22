/**
 * TelegramIntegration - Integration layer between Firebase and Telegram services
 * Provides high-level methods for common notification scenarios
 */

import TelegramService from './TelegramService.js';
import FirebaseService from './FirebaseService.js';

class TelegramIntegration {
  constructor() {
    this.telegramService = TelegramService;
    this.firebaseService = FirebaseService;
  }

  /**
   * Handle new order notification workflow
   * @param {Object} orderData - Order information
   * @returns {Promise<Object>} Notification result
   */
  async handleNewOrder(orderData) {
    try {
      // Send Telegram notification to admin
      const telegramResult = await this.telegramService.notifyNewOrder(orderData);
      
      // Update order with notification status
      if (orderData.id) {
        await this.firebaseService.updateOrder(orderData.id, {
          'notifications.telegramSent': telegramResult.success,
          'notifications.adminNotified': telegramResult.success,
          updatedAt: new Date()
        });
      }

      return {
        success: true,
        telegramSent: telegramResult.success,
        message: telegramResult.success ? 
          'Order notification sent successfully' : 
          'Order created but notification failed'
      };
    } catch (error) {
      console.error('Failed to handle new order notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle order status change notification
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New order status
   * @returns {Promise<Object>} Notification result
   */
  async handleOrderStatusChange(orderId, newStatus) {
    try {
      // Get order details from Firebase
      const orderData = await this.firebaseService.getOrder(orderId);
      if (!orderData) {
        throw new Error('Order not found');
      }

      // Send status update notification
      const telegramResult = await this.telegramService.notifyOrderStatus(
        orderData.userId, 
        orderData, 
        newStatus
      );

      // Update order status and notification info
      await this.firebaseService.updateOrder(orderId, {
        status: newStatus,
        'notifications.customerNotified': telegramResult.success,
        updatedAt: new Date()
      });

      return {
        success: true,
        telegramSent: telegramResult.success,
        message: `Order status updated to ${newStatus}`
      };
    } catch (error) {
      console.error('Failed to handle order status change:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check inventory and send low stock alerts
   * @param {number} threshold - Stock threshold for alerts (default: 5)
   * @returns {Promise<Object>} Alert results
   */
  async checkInventoryAndAlert(threshold = 5) {
    try {
      // Get all books with low stock
      const lowStockBooks = await this.firebaseService.getLowStockBooks(threshold);
      
      if (lowStockBooks.length === 0) {
        return {
          success: true,
          alertsSent: 0,
          message: 'No low stock items found'
        };
      }

      // Send alerts for each low stock book
      const alertResults = [];
      for (const book of lowStockBooks) {
        const result = await this.telegramService.notifyLowStock(book);
        alertResults.push({
          bookId: book.id,
          title: book.title,
          stock: book.inventory?.stock || book.stock || 0,
          alertSent: result.success
        });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const successfulAlerts = alertResults.filter(r => r.alertSent).length;

      return {
        success: true,
        alertsSent: successfulAlerts,
        totalLowStockItems: lowStockBooks.length,
        details: alertResults,
        message: `Sent ${successfulAlerts} low stock alerts out of ${lowStockBooks.length} items`
      };
    } catch (error) {
      console.error('Failed to check inventory and send alerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send bulk promotional notifications
   * @param {string} message - Promotional message
   * @param {Array} userIds - Array of user IDs to notify (optional, sends to all if empty)
   * @returns {Promise<Object>} Bulk notification results
   */
  async sendPromotionalNotification(message, userIds = []) {
    try {
      let users = [];

      if (userIds.length > 0) {
        // Get specific users
        for (const userId of userIds) {
          const user = await this.firebaseService.getUser(userId);
          if (user && user.telegramChatId) {
            users.push(user);
          }
        }
      } else {
        // Get all users with Telegram chat IDs
        users = await this.firebaseService.getUsersWithTelegramIds();
      }

      if (users.length === 0) {
        return {
          success: true,
          sent: 0,
          message: 'No users with Telegram IDs found'
        };
      }

      // Send bulk notifications
      const results = await this.telegramService.sendBulkNotifications(users, message);
      const successfulSends = results.filter(r => r.success).length;

      return {
        success: true,
        sent: successfulSends,
        total: users.length,
        details: results,
        message: `Sent promotional message to ${successfulSends} out of ${users.length} users`
      };
    } catch (error) {
      console.error('Failed to send promotional notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test Telegram bot connection and configuration
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      const result = await this.telegramService.testConnection();
      return {
        success: result.success,
        configured: this.telegramService.isConfigured(),
        botInfo: result.botInfo,
        message: result.message || result.error
      };
    } catch (error) {
      return {
        success: false,
        configured: false,
        error: error.message
      };
    }
  }

  /**
   * Get notification statistics
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>} Notification statistics
   */
  async getNotificationStats(startDate, endDate) {
    try {
      // This would require additional tracking in Firebase
      // For now, return basic configuration info
      return {
        success: true,
        configured: this.telegramService.isConfigured(),
        period: {
          start: startDate,
          end: endDate
        },
        // These would be implemented with proper tracking
        stats: {
          orderNotifications: 0,
          statusUpdates: 0,
          lowStockAlerts: 0,
          promotionalMessages: 0
        },
        message: 'Notification statistics (tracking to be implemented)'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export singleton instance
const telegramIntegration = new TelegramIntegration();
export default telegramIntegration;