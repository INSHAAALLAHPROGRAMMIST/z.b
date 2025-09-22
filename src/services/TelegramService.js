/**
 * TelegramService - Service for sending notifications via Telegram Bot API
 * Handles order notifications, low stock alerts, and bulk messaging
 */

import errorHandlingService from './ErrorHandlingService';

class TelegramService {
  constructor() {
    this.botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    this.adminChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Check if Telegram service is properly configured
   * @returns {boolean} True if bot token and chat ID are available
   */
  isConfigured() {
    return !!(this.botToken && this.adminChatId);
  }

  /**
   * Send a message to a specific chat
   * @param {string} chatId - Telegram chat ID
   * @param {string} message - Message text
   * @param {Object} options - Additional options (parse_mode, reply_markup, etc.)
   * @returns {Promise<Object>} Telegram API response
   */
  async sendMessage(chatId, message, options = {}) {
    return await errorHandlingService.retryOperation(async () => {
      if (!this.isConfigured()) {
        const error = new Error('Telegram service not configured');
        error.code = 'telegram/not-configured';
        throw error;
      }

      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        ...options
      };

      return this._makeRequest('sendMessage', payload);
    }, { maxRetries: 2, baseDelay: 1000 });
  }

  /**
   * Notify admin about a new order
   * @param {Object} orderData - Order information
   * @returns {Promise<Object>} Notification result
   */
  async notifyNewOrder(orderData) {
    try {
      const message = this._formatNewOrderMessage(orderData);
      const result = await this.sendMessage(this.adminChatId, message);
      
      console.log('New order notification sent:', result.success);
      return result;
    } catch (error) {
      const processedError = errorHandlingService.handleError(
        error, 
        'telegram_new_order', 
        { orderId: orderData.id, orderNumber: orderData.orderNumber }
      );
      console.error('Failed to send new order notification:', processedError.userMessage);
      return { success: false, error: processedError.userMessage };
    }
  }

  /**
   * Notify customer about order status change
   * @param {string} userId - User ID (if available)
   * @param {Object} orderData - Order information
   * @param {string} status - New order status
   * @param {string} customerPhone - Customer phone number for notification
   * @returns {Promise<Object>} Notification result
   */
  async notifyOrderStatus(userId, orderData, status, customerPhone = null) {
    try {
      // For now, we'll send status updates to admin chat
      // In future, this could be extended to send to customer directly
      const message = this._formatOrderStatusMessage(orderData, status);
      const result = await this.sendMessage(this.adminChatId, message);
      
      console.log('Order status notification sent:', result.success);
      return result;
    } catch (error) {
      console.error('Failed to send order status notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send low stock alert to admin
   * @param {Object} bookData - Book information with stock details
   * @returns {Promise<Object>} Notification result
   */
  async notifyLowStock(bookData) {
    try {
      const message = this._formatLowStockMessage(bookData);
      const result = await this.sendMessage(this.adminChatId, message);
      
      console.log('Low stock notification sent:', result.success);
      return result;
    } catch (error) {
      console.error('Failed to send low stock notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk notifications to multiple users
   * @param {Array} users - Array of user objects with chat IDs
   * @param {string} message - Message to send
   * @param {Object} options - Additional message options
   * @returns {Promise<Array>} Array of notification results
   */
  async sendBulkNotifications(users, message, options = {}) {
    const results = [];
    
    for (const user of users) {
      try {
        const chatId = user.telegramChatId || user.chatId;
        if (!chatId) {
          results.push({
            userId: user.id,
            success: false,
            error: 'No Telegram chat ID available'
          });
          continue;
        }

        const result = await this.sendMessage(chatId, message, options);
        results.push({
          userId: user.id,
          success: result.success,
          error: result.error
        });

        // Add delay between messages to avoid rate limiting
        await this._delay(100);
      } catch (error) {
        results.push({
          userId: user.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Format new order message for admin notification
   * @param {Object} orderData - Order information
   * @returns {string} Formatted message
   * @private
   */
  _formatNewOrderMessage(orderData) {
    const items = orderData.items.map(item => 
      `• ${item.title} - ${item.quantity}x ${item.price.toLocaleString()} so'm`
    ).join('\n');

    return `🆕 <b>Yangi buyurtma!</b>

📋 <b>Buyurtma raqami:</b> ${orderData.orderNumber}
👤 <b>Mijoz:</b> ${orderData.customer?.name || 'Noma\'lum'}
📞 <b>Telefon:</b> ${orderData.customer?.phone || 'Noma\'lum'}
📧 <b>Email:</b> ${orderData.customer?.email || 'Noma\'lum'}

📚 <b>Kitoblar:</b>
${items}

💰 <b>Jami summa:</b> ${orderData.totalAmount.toLocaleString()} so'm
📅 <b>Sana:</b> ${new Date(orderData.createdAt).toLocaleString('uz-UZ')}

🏠 <b>Manzil:</b>
${orderData.customer?.address ? 
  `${orderData.customer.address.street}, ${orderData.customer.address.city}` : 
  'Noma\'lum'
}`;
  }

  /**
   * Format order status change message
   * @param {Object} orderData - Order information
   * @param {string} status - New status
   * @returns {string} Formatted message
   * @private
   */
  _formatOrderStatusMessage(orderData, status) {
    const statusEmojis = {
      'pending': '⏳',
      'confirmed': '✅',
      'processing': '📦',
      'shipped': '🚚',
      'delivered': '✅',
      'cancelled': '❌'
    };

    const statusTexts = {
      'pending': 'Kutilmoqda',
      'confirmed': 'Tasdiqlandi',
      'processing': 'Tayyorlanmoqda',
      'shipped': 'Yuborildi',
      'delivered': 'Yetkazildi',
      'cancelled': 'Bekor qilindi'
    };

    const emoji = statusEmojis[status] || '📋';
    const statusText = statusTexts[status] || status;

    return `${emoji} <b>Buyurtma holati o'zgartirildi</b>

📋 <b>Buyurtma:</b> ${orderData.orderNumber}
👤 <b>Mijoz:</b> ${orderData.customer?.name || 'Noma\'lum'}
📞 <b>Telefon:</b> ${orderData.customer?.phone || 'Noma\'lum'}

🔄 <b>Yangi holat:</b> ${statusText}
📅 <b>O'zgartirilgan vaqt:</b> ${new Date().toLocaleString('uz-UZ')}`;
  }

  /**
   * Format low stock alert message
   * @param {Object} bookData - Book information
   * @returns {string} Formatted message
   * @private
   */
  _formatLowStockMessage(bookData) {
    return `⚠️ <b>Stok tugayapti!</b>

📚 <b>Kitob:</b> ${bookData.title}
✍️ <b>Muallif:</b> ${bookData.authorName}
📦 <b>Qolgan miqdor:</b> ${bookData.inventory?.stock || bookData.stock || 0}
💰 <b>Narx:</b> ${bookData.price.toLocaleString()} so'm

🔔 <b>Ogohlantirish:</b> Kitob stoki kam qoldi. Yangi partiya buyurtma qilish kerak bo'lishi mumkin.`;
  }

  /**
   * Make HTTP request to Telegram API with retry logic
   * @param {string} method - API method name
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} API response
   * @private
   */
  async _makeRequest(method, payload) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/${method}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response) {
          throw new Error('No response received');
        }

        const data = await response.json();

        if (data.ok) {
          return { success: true, data: data.result };
        } else {
          throw new Error(`Telegram API error: ${data.description}`);
        }
      } catch (error) {
        lastError = error;
        console.warn(`Telegram API attempt ${attempt} failed:`, error.message);

        if (attempt < this.retryAttempts) {
          await this._delay(this.retryDelay * attempt);
        }
      }
    }

    return { success: false, error: lastError?.message || 'Unknown error' };
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test the Telegram bot connection
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, error: 'Service not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();

      if (data.ok) {
        return { 
          success: true, 
          botInfo: data.result,
          message: `Bot connected: ${data.result.first_name} (@${data.result.username})`
        };
      } else {
        return { success: false, error: data.description };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const telegramService = new TelegramService();
export default telegramService;