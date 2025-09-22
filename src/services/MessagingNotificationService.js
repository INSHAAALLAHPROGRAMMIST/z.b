import notificationService from './NotificationService';
import messagingService from './MessagingService';
import authService from './AuthService';

// Notification types for messaging
export const MESSAGING_NOTIFICATION_TYPES = {
  NEW_MESSAGE: 'new_message',
  NEW_CONVERSATION: 'new_conversation',
  MESSAGE_READ: 'message_read',
  CONVERSATION_ASSIGNED: 'conversation_assigned',
  URGENT_MESSAGE: 'urgent_message',
  CUSTOMER_TYPING: 'customer_typing',
  ADMIN_MENTIONED: 'admin_mentioned'
};

class MessagingNotificationService {
  constructor() {
    this.listeners = new Map();
    this.telegramBotToken = process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
    this.telegramChatIds = new Map(); // Admin user ID -> Telegram chat ID mapping
    this.notificationQueue = [];
    this.isProcessingQueue = false;
  }

  // Initialize messaging notifications
  async initialize() {
    try {
      // Set up message listeners
      this.setupMessageListeners();
      
      // Load admin Telegram chat IDs
      await this.loadTelegramChatIds();
      
      // Start processing notification queue
      this.startQueueProcessor();
      
      console.log('Messaging notification service initialized');
    } catch (error) {
      console.error('Error initializing messaging notifications:', error);
    }
  }

  // Set up real-time listeners for messaging events
  setupMessageListeners() {
    // Listen for new messages
    messagingService.listenToConversations((conversations, error) => {
      if (error) return;
      
      conversations.forEach(conversation => {
        this.checkForNewMessages(conversation);
      });
    });
  }

  // Check for new messages and send notifications
  async checkForNewMessages(conversation) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) return;

      // Check if there are unread messages for admins
      const adminUnreadCount = conversation.unreadCount?.admin || 0;
      
      if (adminUnreadCount > 0 && conversation.lastMessage) {
        const lastMessage = conversation.lastMessage;
        
        // Don't notify if the last message was sent by an admin
        if (lastMessage.senderRole === 'admin' || lastMessage.senderRole === 'super_admin') {
          return;
        }

        await this.sendNewMessageNotification(conversation, lastMessage);
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }

  // Send notification for new message
  async sendNewMessageNotification(conversation, message) {
    try {
      const customerInfo = conversation.metadata?.customerInfo || {};
      const orderInfo = conversation.metadata?.orderInfo;
      
      // Create in-app notification
      const notification = {
        type: MESSAGING_NOTIFICATION_TYPES.NEW_MESSAGE,
        title: `New message from ${customerInfo.name || 'Customer'}`,
        message: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
        data: {
          conversationId: conversation.id,
          messageId: message.id,
          customerId: customerInfo.id,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          orderInfo
        },
        priority: conversation.metadata?.priority || 'normal',
        category: 'messaging',
        actions: [
          {
            label: 'Reply',
            action: 'open_conversation',
            data: { conversationId: conversation.id }
          },
          {
            label: 'Mark as Read',
            action: 'mark_read',
            data: { conversationId: conversation.id }
          }
        ]
      };

      // Send to notification service
      await notificationService.createNotification(notification);

      // Send Telegram notification to admins
      await this.sendTelegramNotification(notification);

      // Send browser push notification
      await this.sendBrowserNotification(notification);

    } catch (error) {
      console.error('Error sending new message notification:', error);
    }
  }

  // Send notification for new conversation
  async sendNewConversationNotification(conversation) {
    try {
      const customerInfo = conversation.metadata?.customerInfo || {};
      
      const notification = {
        type: MESSAGING_NOTIFICATION_TYPES.NEW_CONVERSATION,
        title: 'New conversation started',
        message: `${customerInfo.name || 'A customer'} started a new conversation`,
        data: {
          conversationId: conversation.id,
          customerId: customerInfo.id,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          conversationType: conversation.type
        },
        priority: 'high',
        category: 'messaging',
        actions: [
          {
            label: 'View Conversation',
            action: 'open_conversation',
            data: { conversationId: conversation.id }
          }
        ]
      };

      await notificationService.createNotification(notification);
      await this.sendTelegramNotification(notification);
      await this.sendBrowserNotification(notification);

    } catch (error) {
      console.error('Error sending new conversation notification:', error);
    }
  }

  // Send urgent message notification
  async sendUrgentMessageNotification(conversation, message) {
    try {
      const customerInfo = conversation.metadata?.customerInfo || {};
      
      const notification = {
        type: MESSAGING_NOTIFICATION_TYPES.URGENT_MESSAGE,
        title: `🚨 URGENT: Message from ${customerInfo.name || 'Customer'}`,
        message: message.content,
        data: {
          conversationId: conversation.id,
          messageId: message.id,
          customerId: customerInfo.id,
          customerName: customerInfo.name
        },
        priority: 'critical',
        category: 'messaging',
        requiresAcknowledgment: true,
        actions: [
          {
            label: 'Reply Now',
            action: 'open_conversation',
            data: { conversationId: conversation.id }
          }
        ]
      };

      await notificationService.createNotification(notification);
      
      // Send immediate Telegram alert to all admins
      await this.sendUrgentTelegramAlert(notification);
      
      // Send browser notification with sound
      await this.sendBrowserNotification(notification, { requireInteraction: true });

    } catch (error) {
      console.error('Error sending urgent message notification:', error);
    }
  }

  // Send Telegram notification
  async sendTelegramNotification(notification) {
    try {
      if (!this.telegramBotToken) {
        console.warn('Telegram bot token not configured');
        return;
      }

      // Get all admin users who have Telegram enabled
      const adminUsers = await this.getAdminUsersWithTelegram();
      
      for (const adminUser of adminUsers) {
        const chatId = this.telegramChatIds.get(adminUser.id);
        if (!chatId) continue;

        const message = this.formatTelegramMessage(notification);
        
        await this.sendTelegramMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: this.createTelegramKeyboard(notification)
        });
      }
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }

  // Send urgent Telegram alert
  async sendUrgentTelegramAlert(notification) {
    try {
      if (!this.telegramBotToken) return;

      const adminUsers = await this.getAdminUsersWithTelegram();
      
      for (const adminUser of adminUsers) {
        const chatId = this.telegramChatIds.get(adminUser.id);
        if (!chatId) continue;

        const urgentMessage = `🚨 <b>URGENT MESSAGE</b> 🚨\n\n${this.formatTelegramMessage(notification)}`;
        
        await this.sendTelegramMessage(chatId, urgentMessage, {
          parse_mode: 'HTML',
          reply_markup: this.createTelegramKeyboard(notification)
        });
      }
    } catch (error) {
      console.error('Error sending urgent Telegram alert:', error);
    }
  }

  // Format message for Telegram
  formatTelegramMessage(notification) {
    const { title, message, data } = notification;
    
    let telegramMessage = `<b>${title}</b>\n\n${message}`;
    
    if (data.customerName) {
      telegramMessage += `\n\n👤 Customer: ${data.customerName}`;
    }
    
    if (data.customerEmail) {
      telegramMessage += `\n📧 Email: ${data.customerEmail}`;
    }
    
    if (data.orderInfo) {
      telegramMessage += `\n📦 Order: #${data.orderInfo.id}`;
    }
    
    telegramMessage += `\n\n⏰ ${new Date().toLocaleString()}`;
    
    return telegramMessage;
  }

  // Create Telegram inline keyboard
  createTelegramKeyboard(notification) {
    const keyboard = {
      inline_keyboard: []
    };
    
    if (notification.data.conversationId) {
      keyboard.inline_keyboard.push([
        {
          text: '💬 Open Conversation',
          url: `${window.location.origin}/admin/messaging?conversation=${notification.data.conversationId}`
        }
      ]);
    }
    
    keyboard.inline_keyboard.push([
      {
        text: '✅ Mark as Read',
        callback_data: `mark_read_${notification.data.conversationId}`
      },
      {
        text: '🔕 Mute',
        callback_data: `mute_${notification.data.conversationId}`
      }
    ]);
    
    return keyboard;
  }

  // Send Telegram message
  async sendTelegramMessage(chatId, message, options = {}) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  // Send browser push notification
  async sendBrowserNotification(notification, options = {}) {
    try {
      if (!('Notification' in window)) {
        console.warn('Browser notifications not supported');
        return;
      }

      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Notification permission denied');
          return;
        }
      }

      const notificationOptions = {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `messaging_${notification.data.conversationId}`,
        data: notification.data,
        actions: [
          {
            action: 'reply',
            title: 'Reply'
          },
          {
            action: 'mark_read',
            title: 'Mark as Read'
          }
        ],
        ...options
      };

      const browserNotification = new Notification(notification.title, notificationOptions);

      browserNotification.onclick = () => {
        window.focus();
        window.location.href = `/admin/messaging?conversation=${notification.data.conversationId}`;
        browserNotification.close();
      };

      // Auto-close after 10 seconds unless it's urgent
      if (notification.priority !== 'critical') {
        setTimeout(() => {
          browserNotification.close();
        }, 10000);
      }

    } catch (error) {
      console.error('Error sending browser notification:', error);
    }
  }

  // Load admin Telegram chat IDs
  async loadTelegramChatIds() {
    try {
      // This would typically load from database
      // For now, using mock data
      const mockChatIds = new Map([
        ['admin1', '123456789'],
        ['admin2', '987654321']
      ]);
      
      this.telegramChatIds = mockChatIds;
    } catch (error) {
      console.error('Error loading Telegram chat IDs:', error);
    }
  }

  // Get admin users with Telegram enabled
  async getAdminUsersWithTelegram() {
    try {
      // This would typically query the database
      // For now, returning mock data
      return [
        { id: 'admin1', email: 'admin1@example.com', telegramEnabled: true },
        { id: 'admin2', email: 'admin2@example.com', telegramEnabled: true }
      ];
    } catch (error) {
      console.error('Error getting admin users:', error);
      return [];
    }
  }

  // Add notification to queue
  queueNotification(notification) {
    this.notificationQueue.push({
      ...notification,
      timestamp: Date.now()
    });
  }

  // Start processing notification queue
  startQueueProcessor() {
    setInterval(() => {
      this.processNotificationQueue();
    }, 1000); // Process every second
  }

  // Process notification queue
  async processNotificationQueue() {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const notification = this.notificationQueue.shift();
      
      // Check if notification is not too old (5 minutes)
      if (Date.now() - notification.timestamp > 5 * 60 * 1000) {
        console.warn('Dropping old notification:', notification);
        return;
      }

      // Process the notification
      await this.processNotification(notification);
      
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Process individual notification
  async processNotification(notification) {
    try {
      switch (notification.type) {
        case MESSAGING_NOTIFICATION_TYPES.NEW_MESSAGE:
          await this.sendNewMessageNotification(notification.conversation, notification.message);
          break;
        case MESSAGING_NOTIFICATION_TYPES.NEW_CONVERSATION:
          await this.sendNewConversationNotification(notification.conversation);
          break;
        case MESSAGING_NOTIFICATION_TYPES.URGENT_MESSAGE:
          await this.sendUrgentMessageNotification(notification.conversation, notification.message);
          break;
        default:
          console.warn('Unknown notification type:', notification.type);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  }

  // Handle Telegram webhook callbacks
  async handleTelegramCallback(callbackQuery) {
    try {
      const { data, from } = callbackQuery;
      const [action, conversationId] = data.split('_');

      switch (action) {
        case 'mark_read':
          await messagingService.markMessagesAsRead(conversationId);
          break;
        case 'mute':
          // Implement muting logic
          break;
        default:
          console.warn('Unknown callback action:', action);
      }

      // Answer the callback query
      await this.answerCallbackQuery(callbackQuery.id, 'Action completed');
      
    } catch (error) {
      console.error('Error handling Telegram callback:', error);
    }
  }

  // Answer Telegram callback query
  async answerCallbackQuery(callbackQueryId, text) {
    try {
      await fetch(`https://api.telegram.org/bot${this.telegramBotToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text
        })
      });
    } catch (error) {
      console.error('Error answering callback query:', error);
    }
  }

  // Clean up resources
  cleanup() {
    this.listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();
    this.notificationQueue = [];
  }
}

// Create singleton instance
const messagingNotificationService = new MessagingNotificationService();

export default messagingNotificationService;