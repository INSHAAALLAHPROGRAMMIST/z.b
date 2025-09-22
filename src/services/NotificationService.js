/**
 * Notification Service
 * Handles all types of notifications including Telegram, email, and in-app notifications
 */

import { getTelegramConfig, formatMessage } from '../../config/telegram.production.js';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebaseConfig';

class NotificationService {
  constructor() {
    this.config = getTelegramConfig(process.env.NODE_ENV || 'production');
    this.retryQueue = new Map();
  }

  /**
   * Send order status notification to customer
   */
  async sendOrderStatusNotification(order, newStatus, notes = '') {
    try {
      const customer = order.customerInfo || order;
      const notificationData = {
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.substring(0, 8).toUpperCase(),
        customerName: customer.fullName || customer.name,
        customerPhone: customer.phone,
        customerTelegram: customer.telegramUsername,
        newStatus,
        notes,
        totalAmount: order.totalAmount,
        itemCount: order.items?.length || 1,
        orderDate: this.formatDate(order.createdAt),
        estimatedDelivery: this.getEstimatedDelivery(newStatus),
        trackingNumber: order.trackingNumber,
        supportContact: '@ZamonBooksBot'
      };

      // Send Telegram notification if customer has Telegram
      if (customer.telegramUsername) {
        await this.sendTelegramNotification(customer.telegramUsername, newStatus, notificationData);
      }

      // Send admin notification
      await this.sendAdminNotification('order_status_updated', notificationData);

      // Log notification
      await this.logNotification({
        type: 'order_status',
        recipient: customer.telegramUsername || customer.phone,
        orderId: order.id,
        status: newStatus,
        success: true
      });

      return { success: true };

    } catch (error) {
      console.error('Error sending order status notification:', error);
      
      // Log failed notification
      await this.logNotification({
        type: 'order_status',
        recipient: order.customerInfo?.telegramUsername || order.customerInfo?.phone,
        orderId: order.id,
        status: newStatus,
        success: false,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send Telegram notification to customer
   */
  async sendTelegramNotification(telegramUsername, status, data) {
    const template = this.config.templates.orderStatus[status];
    if (!template) {
      throw new Error(`No template found for status: ${status}`);
    }

    const message = formatMessage(template, data);
    
    // Get customer's chat ID (this would typically be stored in database)
    const chatId = await this.getCustomerChatId(telegramUsername);
    if (!chatId) {
      console.warn(`No chat ID found for customer: ${telegramUsername}`);
      return;
    }

    return await this.sendTelegramMessage(chatId, message);
  }

  /**
   * Send admin notification
   */
  async sendAdminNotification(type, data) {
    const adminChatId = this.config.chats.admin.chatId;
    if (!adminChatId) {
      console.warn('Admin chat ID not configured');
      return;
    }

    let message = '';
    switch (type) {
      case 'order_status_updated':
        message = `🔄 *Buyurtma holati yangilandi*

📋 Buyurtma: #${data.orderNumber}
👤 Mijoz: ${data.customerName}
📞 Telefon: ${data.customerPhone}
📊 Yangi holat: ${this.getStatusLabel(data.newStatus)}
💰 Summa: ${data.totalAmount} so'm

${data.notes ? `📝 Izoh: ${data.notes}` : ''}

⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}`;
        break;

      case 'new_order':
        message = formatMessage(this.config.templates.newOrder.admin, data);
        break;

      default:
        message = `📢 Admin notification: ${type}`;
    }

    return await this.sendTelegramMessage(adminChatId, message);
  }

  /**
   * Send Telegram message
   */
  async sendTelegramMessage(chatId, text, options = {}) {
    const url = `${this.config.bot.apiUrl}${this.config.bot.token}/sendMessage`;
    
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...options
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }

      return result;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      
      // Add to retry queue
      await this.addToRetryQueue(chatId, text, options);
      
      throw error;
    }
  }

  /**
   * Get customer's Telegram chat ID
   * This would typically query the database for stored chat IDs
   */
  async getCustomerChatId(telegramUsername) {
    try {
      // In a real implementation, this would query the database
      // For now, we'll return null and handle it gracefully
      console.log(`Looking up chat ID for: ${telegramUsername}`);
      return null;
    } catch (error) {
      console.error('Error getting customer chat ID:', error);
      return null;
    }
  }

  /**
   * Log notification to database
   */
  async logNotification(notificationData) {
    try {
      await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
        ...notificationData,
        createdAt: serverTimestamp(),
        environment: process.env.NODE_ENV || 'production'
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * Add failed message to retry queue
   */
  async addToRetryQueue(chatId, text, options) {
    const retryKey = `${chatId}_${Date.now()}`;
    this.retryQueue.set(retryKey, {
      chatId,
      text,
      options,
      attempts: 0,
      maxAttempts: this.config.notifications.retry.maxAttempts,
      nextRetry: Date.now() + this.config.notifications.retry.initialDelay
    });
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    for (const [key, item] of this.retryQueue.entries()) {
      if (Date.now() >= item.nextRetry && item.attempts < item.maxAttempts) {
        try {
          await this.sendTelegramMessage(item.chatId, item.text, item.options);
          this.retryQueue.delete(key);
        } catch (error) {
          item.attempts++;
          item.nextRetry = Date.now() + (this.config.notifications.retry.initialDelay * 
            Math.pow(this.config.notifications.retry.backoffMultiplier, item.attempts));
          
          if (item.attempts >= item.maxAttempts) {
            console.error(`Max retry attempts reached for message to ${item.chatId}`);
            this.retryQueue.delete(key);
          }
        }
      }
    }
  }

  /**
   * Send in-app notification
   */
  async sendInAppNotification(userId, notification) {
    try {
      await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
        userId,
        type: 'in_app',
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        isRead: false,
        createdAt: serverTimestamp()
      });

      // Trigger real-time update
      this.triggerNotificationUpdate(userId);

      return { success: true };
    } catch (error) {
      console.error('Error sending in-app notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger notification update for real-time UI
   */
  triggerNotificationUpdate(userId) {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll use a custom event
    const event = new CustomEvent('notificationUpdate', {
      detail: { userId }
    });
    window.dispatchEvent(event);
  }

  /**
   * Utility methods
   */
  formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getEstimatedDelivery(status) {
    const estimates = {
      confirmed: '2-3 kun',
      shipping: '1-2 kun',
      completed: 'Yetkazildi',
      cancelled: 'Bekor qilingan'
    };
    return estimates[status] || 'Aniqlanmagan';
  }

  getStatusLabel(status) {
    const labels = {
      pending: '⏳ Kutilmoqda',
      confirmed: '✅ Tasdiqlangan',
      shipping: '🚚 Yetkazilmoqda',
      completed: '🎉 Tugallangan',
      cancelled: '❌ Bekor qilingan'
    };
    return labels[status] || status;
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.sendOrderStatusNotification(
          notification.order,
          notification.status,
          notification.notes
        );
        results.push({ ...notification, result });
      } catch (error) {
        results.push({ 
          ...notification, 
          result: { success: false, error: error.message } 
        });
      }
    }

    return results;
  }

  /**
   * Send system alert
   */
  async sendSystemAlert(type, message, data = {}) {
    const alertsChatId = this.config.chats.alerts.chatId;
    if (!alertsChatId) {
      console.warn('Alerts chat ID not configured');
      return;
    }

    const alertMessage = `🚨 *Tizim ogohlantirishi*

📊 Turi: ${type}
📝 Xabar: ${message}
⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}

${data.details ? `📋 Tafsilotlar: ${data.details}` : ''}`;

    return await this.sendTelegramMessage(alertsChatId, alertMessage);
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Start retry queue processor
setInterval(() => {
  notificationService.processRetryQueue();
}, 30000); // Process every 30 seconds

export default notificationService;