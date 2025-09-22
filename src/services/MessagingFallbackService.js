import messagingService from './MessagingService';
import notificationService from './NotificationService';

// Fallback methods
export const FALLBACK_METHODS = {
  TELEGRAM: 'telegram',
  EMAIL: 'email',
  SMS: 'sms',
  PHONE: 'phone',
  WHATSAPP: 'whatsapp'
};

// Error types
export const ERROR_TYPES = {
  NETWORK_ERROR: 'network_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  AUTHENTICATION_ERROR: 'authentication_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  VALIDATION_ERROR: 'validation_error',
  UNKNOWN_ERROR: 'unknown_error'
};

// Feature flags
export const FEATURE_FLAGS = {
  MESSAGING_ENABLED: 'messaging_enabled',
  TELEGRAM_FALLBACK: 'telegram_fallback',
  EMAIL_FALLBACK: 'email_fallback',
  SMS_FALLBACK: 'sms_fallback',
  OFFLINE_MODE: 'offline_mode',
  AUTO_RETRY: 'auto_retry'
};

class MessagingFallbackService {
  constructor() {
    this.featureFlags = new Map();
    this.retryQueue = [];
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
    this.maxRetryDelay = 30000; // Max 30 seconds
    
    this.initializeFeatureFlags();
    this.setupNetworkListeners();
    this.startRetryProcessor();
  }

  // Initialize feature flags
  initializeFeatureFlags() {
    // Load from localStorage or environment variables
    const defaultFlags = {
      [FEATURE_FLAGS.MESSAGING_ENABLED]: true,
      [FEATURE_FLAGS.TELEGRAM_FALLBACK]: true,
      [FEATURE_FLAGS.EMAIL_FALLBACK]: true,
      [FEATURE_FLAGS.SMS_FALLBACK]: false,
      [FEATURE_FLAGS.OFFLINE_MODE]: true,
      [FEATURE_FLAGS.AUTO_RETRY]: true
    };

    Object.entries(defaultFlags).forEach(([flag, defaultValue]) => {
      const storedValue = localStorage.getItem(`feature_flag_${flag}`);
      this.featureFlags.set(flag, storedValue !== null ? JSON.parse(storedValue) : defaultValue);
    });
  }

  // Check if feature is enabled
  isFeatureEnabled(flag) {
    return this.featureFlags.get(flag) || false;
  }

  // Set feature flag
  setFeatureFlag(flag, enabled) {
    this.featureFlags.set(flag, enabled);
    localStorage.setItem(`feature_flag_${flag}`, JSON.stringify(enabled));
  }

  // Setup network status listeners
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Send message with fallback handling
  async sendMessageWithFallback(conversationId, content, type = 'text', options = {}) {
    try {
      // Check if messaging is enabled
      if (!this.isFeatureEnabled(FEATURE_FLAGS.MESSAGING_ENABLED)) {
        throw new Error('Messaging feature is disabled');
      }

      // Check network connectivity
      if (!this.isOnline) {
        if (this.isFeatureEnabled(FEATURE_FLAGS.OFFLINE_MODE)) {
          return await this.handleOfflineMessage(conversationId, content, type, options);
        } else {
          throw new Error('No internet connection and offline mode is disabled');
        }
      }

      // Try to send message normally
      const message = await messagingService.sendMessage(conversationId, content, type);
      
      // Clear any pending retries for this conversation
      this.clearRetries(conversationId);
      
      return message;
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorType = this.classifyError(error);
      return await this.handleMessageError(conversationId, content, type, options, error, errorType);
    }
  }

  // Handle offline messages
  async handleOfflineMessage(conversationId, content, type, options) {
    const offlineMessage = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      content,
      type,
      options,
      timestamp: Date.now(),
      status: 'queued'
    };

    this.offlineQueue.push(offlineMessage);
    
    // Store in localStorage for persistence
    localStorage.setItem('messaging_offline_queue', JSON.stringify(this.offlineQueue));
    
    // Show user feedback
    await notificationService.createNotification({
      type: 'info',
      title: 'Message Queued',
      message: 'Your message will be sent when connection is restored',
      category: 'messaging'
    });

    return offlineMessage;
  }

  // Process offline queue when back online
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log(`Processing ${this.offlineQueue.length} offline messages`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const message of queue) {
      try {
        await messagingService.sendMessage(
          message.conversationId,
          message.content,
          message.type
        );
        
        console.log('Offline message sent successfully:', message.id);
        
      } catch (error) {
        console.error('Failed to send offline message:', error);
        
        // Re-queue if it's a temporary error
        if (this.isTemporaryError(error)) {
          this.addToRetryQueue(message);
        }
      }
    }

    // Clear localStorage
    localStorage.removeItem('messaging_offline_queue');
    
    // Notify user
    if (queue.length > 0) {
      await notificationService.createNotification({
        type: 'success',
        title: 'Messages Sent',
        message: `${queue.length} queued message(s) have been sent`,
        category: 'messaging'
      });
    }
  }

  // Handle message sending errors
  async handleMessageError(conversationId, content, type, options, error, errorType) {
    switch (errorType) {
      case ERROR_TYPES.NETWORK_ERROR:
        return await this.handleNetworkError(conversationId, content, type, options, error);
      
      case ERROR_TYPES.SERVICE_UNAVAILABLE:
        return await this.handleServiceUnavailable(conversationId, content, type, options, error);
      
      case ERROR_TYPES.RATE_LIMIT_ERROR:
        return await this.handleRateLimit(conversationId, content, type, options, error);
      
      case ERROR_TYPES.AUTHENTICATION_ERROR:
        return await this.handleAuthError(conversationId, content, type, options, error);
      
      default:
        return await this.handleGenericError(conversationId, content, type, options, error);
    }
  }

  // Handle network errors
  async handleNetworkError(conversationId, content, type, options, error) {
    if (this.isFeatureEnabled(FEATURE_FLAGS.AUTO_RETRY)) {
      this.addToRetryQueue({
        conversationId,
        content,
        type,
        options,
        error,
        retryCount: 0
      });
    }

    // Try fallback methods
    await this.tryFallbackMethods(conversationId, content, options);
    
    throw error;
  }

  // Handle service unavailable
  async handleServiceUnavailable(conversationId, content, type, options, error) {
    // Immediately try fallback methods
    const fallbackResult = await this.tryFallbackMethods(conversationId, content, options);
    
    if (fallbackResult.success) {
      return fallbackResult;
    }

    // Queue for retry if fallback failed
    if (this.isFeatureEnabled(FEATURE_FLAGS.AUTO_RETRY)) {
      this.addToRetryQueue({
        conversationId,
        content,
        type,
        options,
        error,
        retryCount: 0
      });
    }

    throw error;
  }

  // Handle rate limiting
  async handleRateLimit(conversationId, content, type, options, error) {
    // Extract retry-after header if available
    const retryAfter = this.extractRetryAfter(error);
    
    this.addToRetryQueue({
      conversationId,
      content,
      type,
      options,
      error,
      retryCount: 0,
      retryAfter: retryAfter || 60000 // Default 1 minute
    });

    await notificationService.createNotification({
      type: 'warning',
      title: 'Rate Limited',
      message: `Message will be retried in ${Math.ceil((retryAfter || 60000) / 1000)} seconds`,
      category: 'messaging'
    });

    throw error;
  }

  // Handle authentication errors
  async handleAuthError(conversationId, content, type, options, error) {
    // Try to refresh authentication
    try {
      await this.refreshAuthentication();
      
      // Retry the message
      return await messagingService.sendMessage(conversationId, content, type);
      
    } catch (refreshError) {
      console.error('Failed to refresh authentication:', refreshError);
      
      // Try fallback methods
      await this.tryFallbackMethods(conversationId, content, options);
      
      throw error;
    }
  }

  // Handle generic errors
  async handleGenericError(conversationId, content, type, options, error) {
    console.error('Generic messaging error:', error);
    
    // Try fallback methods
    await this.tryFallbackMethods(conversationId, content, options);
    
    // Queue for retry if it might be temporary
    if (this.isTemporaryError(error) && this.isFeatureEnabled(FEATURE_FLAGS.AUTO_RETRY)) {
      this.addToRetryQueue({
        conversationId,
        content,
        type,
        options,
        error,
        retryCount: 0
      });
    }

    throw error;
  }

  // Try fallback communication methods
  async tryFallbackMethods(conversationId, content, options) {
    const conversation = await this.getConversation(conversationId);
    const customerInfo = conversation?.metadata?.customerInfo;
    
    if (!customerInfo) {
      return { success: false, error: 'No customer information available' };
    }

    const fallbackMethods = this.getAvailableFallbackMethods(customerInfo);
    
    for (const method of fallbackMethods) {
      try {
        const result = await this.sendViaFallbackMethod(method, customerInfo, content, options);
        
        if (result.success) {
          await notificationService.createNotification({
            type: 'info',
            title: 'Fallback Method Used',
            message: `Message sent via ${method.toUpperCase()} due to messaging service issues`,
            category: 'messaging'
          });
          
          return result;
        }
      } catch (fallbackError) {
        console.error(`Fallback method ${method} failed:`, fallbackError);
      }
    }

    return { success: false, error: 'All fallback methods failed' };
  }

  // Get available fallback methods for customer
  getAvailableFallbackMethods(customerInfo) {
    const methods = [];
    
    if (customerInfo.telegramId && this.isFeatureEnabled(FEATURE_FLAGS.TELEGRAM_FALLBACK)) {
      methods.push(FALLBACK_METHODS.TELEGRAM);
    }
    
    if (customerInfo.email && this.isFeatureEnabled(FEATURE_FLAGS.EMAIL_FALLBACK)) {
      methods.push(FALLBACK_METHODS.EMAIL);
    }
    
    if (customerInfo.phone && this.isFeatureEnabled(FEATURE_FLAGS.SMS_FALLBACK)) {
      methods.push(FALLBACK_METHODS.SMS);
    }
    
    return methods;
  }

  // Send message via fallback method
  async sendViaFallbackMethod(method, customerInfo, content, options) {
    switch (method) {
      case FALLBACK_METHODS.TELEGRAM:
        return await this.sendViaTelegram(customerInfo.telegramId, content);
      
      case FALLBACK_METHODS.EMAIL:
        return await this.sendViaEmail(customerInfo.email, content, options);
      
      case FALLBACK_METHODS.SMS:
        return await this.sendViaSMS(customerInfo.phone, content);
      
      default:
        throw new Error(`Unsupported fallback method: ${method}`);
    }
  }

  // Send via Telegram
  async sendViaTelegram(telegramId, content) {
    try {
      const botToken = process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: `Support message: ${content}`,
          parse_mode: 'HTML'
        })
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      return { success: true, method: FALLBACK_METHODS.TELEGRAM };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send via Email
  async sendViaEmail(email, content, options) {
    try {
      // This would integrate with your email service
      const emailData = {
        to: email,
        subject: options.subject || 'Message from Support',
        body: content,
        html: `<p>${content}</p>`
      };

      // Mock email sending - replace with actual email service
      console.log('Sending email:', emailData);
      
      return { success: true, method: FALLBACK_METHODS.EMAIL };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send via SMS
  async sendViaSMS(phone, content) {
    try {
      // This would integrate with your SMS service
      const smsData = {
        to: phone,
        message: content.substring(0, 160) // SMS character limit
      };

      // Mock SMS sending - replace with actual SMS service
      console.log('Sending SMS:', smsData);
      
      return { success: true, method: FALLBACK_METHODS.SMS };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Add message to retry queue
  addToRetryQueue(messageData) {
    this.retryQueue.push({
      ...messageData,
      id: `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    });
  }

  // Start retry processor
  startRetryProcessor() {
    setInterval(() => {
      this.processRetryQueue();
    }, 5000); // Check every 5 seconds
  }

  // Process retry queue
  async processRetryQueue() {
    if (this.retryQueue.length === 0) return;

    const now = Date.now();
    const readyToRetry = this.retryQueue.filter(item => {
      const delay = item.retryAfter || this.calculateRetryDelay(item.retryCount);
      return now - item.timestamp >= delay;
    });

    for (const item of readyToRetry) {
      try {
        await messagingService.sendMessage(item.conversationId, item.content, item.type);
        
        // Remove from retry queue
        this.retryQueue = this.retryQueue.filter(queueItem => queueItem.id !== item.id);
        
        console.log('Retry successful for message:', item.id);
        
      } catch (error) {
        item.retryCount++;
        item.timestamp = now;
        
        if (item.retryCount >= this.maxRetries) {
          // Remove from retry queue after max retries
          this.retryQueue = this.retryQueue.filter(queueItem => queueItem.id !== item.id);
          
          console.error('Max retries reached for message:', item.id);
          
          // Try fallback methods as last resort
          await this.tryFallbackMethods(item.conversationId, item.content, item.options);
        }
      }
    }
  }

  // Calculate retry delay with exponential backoff
  calculateRetryDelay(retryCount) {
    const delay = this.retryDelay * Math.pow(2, retryCount);
    return Math.min(delay, this.maxRetryDelay);
  }

  // Classify error type
  classifyError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_TYPES.NETWORK_ERROR;
    }
    
    if (message.includes('service unavailable') || message.includes('502') || message.includes('503')) {
      return ERROR_TYPES.SERVICE_UNAVAILABLE;
    }
    
    if (message.includes('rate limit') || message.includes('429')) {
      return ERROR_TYPES.RATE_LIMIT_ERROR;
    }
    
    if (message.includes('unauthorized') || message.includes('401') || message.includes('403')) {
      return ERROR_TYPES.AUTHENTICATION_ERROR;
    }
    
    if (message.includes('validation') || message.includes('400')) {
      return ERROR_TYPES.VALIDATION_ERROR;
    }
    
    return ERROR_TYPES.UNKNOWN_ERROR;
  }

  // Check if error is temporary
  isTemporaryError(error) {
    const temporaryErrors = [
      ERROR_TYPES.NETWORK_ERROR,
      ERROR_TYPES.SERVICE_UNAVAILABLE,
      ERROR_TYPES.RATE_LIMIT_ERROR
    ];
    
    return temporaryErrors.includes(this.classifyError(error));
  }

  // Extract retry-after header from error
  extractRetryAfter(error) {
    // This would extract from HTTP headers in a real implementation
    return null;
  }

  // Get conversation data
  async getConversation(conversationId) {
    try {
      // This would fetch from your database
      return await messagingService.getConversation(conversationId);
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }

  // Refresh authentication
  async refreshAuthentication() {
    // This would refresh auth tokens
    console.log('Refreshing authentication...');
  }

  // Clear retries for conversation
  clearRetries(conversationId) {
    this.retryQueue = this.retryQueue.filter(item => item.conversationId !== conversationId);
  }

  // Get service status
  getServiceStatus() {
    return {
      isOnline: this.isOnline,
      messagingEnabled: this.isFeatureEnabled(FEATURE_FLAGS.MESSAGING_ENABLED),
      retryQueueSize: this.retryQueue.length,
      offlineQueueSize: this.offlineQueue.length,
      featureFlags: Object.fromEntries(this.featureFlags)
    };
  }

  // Clean up resources
  cleanup() {
    this.retryQueue = [];
    this.offlineQueue = [];
    localStorage.removeItem('messaging_offline_queue');
  }
}

// Create singleton instance
const messagingFallbackService = new MessagingFallbackService();

export default messagingFallbackService;