/**
 * Comprehensive Error Handling Service
 * Provides centralized error handling, categorization, and monitoring
 */

class ErrorHandlingService {
  constructor() {
    this.errorCategories = {
      NETWORK: 'network',
      AUTHENTICATION: 'authentication',
      VALIDATION: 'validation',
      STORAGE: 'storage',
      CLOUDINARY: 'cloudinary',
      TELEGRAM: 'telegram',
      FIREBASE: 'firebase',
      SYSTEM: 'system',
      USER_INPUT: 'user_input'
    };

    this.errorSeverity = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };

    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    this.errorLog = [];
    this.errorListeners = [];
  }

  /**
   * Main error handling method
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Processed error information
   */
  handleError(error, context = 'unknown', metadata = {}) {
    try {
      const processedError = this.processError(error, context, metadata);
      
      // Log the error
      this.logError(processedError);
      
      // Notify listeners
      this.notifyErrorListeners(processedError);
      
      // Send to monitoring if configured
      this.sendToMonitoring(processedError);
      
      return processedError;
    } catch (handlingError) {
      console.error('Error in error handling:', handlingError);
      return this.createFallbackError(error, context);
    }
  }

  /**
   * Process and categorize error
   * @param {Error} error - Original error
   * @param {string} context - Error context
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Processed error
   */
  processError(error, context, metadata) {
    const timestamp = new Date().toISOString();
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    const userMessage = this.getUserFriendlyMessage(category, error);
    const shouldRetry = this.shouldRetry(error, category);
    
    return {
      id: this.generateErrorId(),
      timestamp,
      context,
      category,
      severity,
      originalError: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      userMessage,
      shouldRetry,
      retryCount: metadata.retryCount || 0,
      metadata: {
        ...metadata,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      }
    };
  }

  /**
   * Categorize error based on error properties
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';

    // Firebase errors
    if (code.startsWith('auth/')) {
      return this.errorCategories.AUTHENTICATION;
    }
    if (code.startsWith('firestore/') || code.startsWith('storage/')) {
      return this.errorCategories.FIREBASE;
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || error.name === 'NetworkError') {
      return this.errorCategories.NETWORK;
    }

    // Cloudinary errors
    if (message.includes('cloudinary') || code.includes('cloudinary')) {
      return this.errorCategories.CLOUDINARY;
    }

    // Telegram errors
    if (message.includes('telegram') || code.includes('telegram')) {
      return this.errorCategories.TELEGRAM;
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') ||
        error.name === 'ValidationError') {
      return this.errorCategories.VALIDATION;
    }

    // Storage errors
    if (message.includes('storage') || message.includes('upload') ||
        message.includes('file')) {
      return this.errorCategories.STORAGE;
    }

    return this.errorCategories.SYSTEM;
  }

  /**
   * Determine error severity
   * @param {Error} error - Error object
   * @param {string} category - Error category
   * @returns {string} Severity level
   */
  determineSeverity(error, category) {
    // Critical errors
    if (category === this.errorCategories.AUTHENTICATION && 
        error.code === 'auth/user-disabled') {
      return this.errorSeverity.CRITICAL;
    }

    // High severity errors
    if (category === this.errorCategories.FIREBASE ||
        category === this.errorCategories.SYSTEM) {
      return this.errorSeverity.HIGH;
    }

    // Medium severity errors
    if (category === this.errorCategories.CLOUDINARY ||
        category === this.errorCategories.TELEGRAM ||
        category === this.errorCategories.STORAGE) {
      return this.errorSeverity.MEDIUM;
    }

    // Low severity errors
    return this.errorSeverity.LOW;
  }

  /**
   * Get user-friendly error message
   * @param {string} category - Error category
   * @param {Error} error - Original error
   * @returns {string} User-friendly message
   */
  getUserFriendlyMessage(category, error) {
    const messages = {
      [this.errorCategories.NETWORK]: 'Internet aloqasini tekshiring va qayta urinib ko\'ring.',
      [this.errorCategories.AUTHENTICATION]: 'Tizimga kirish bilan bog\'liq muammo yuz berdi. Qayta kirish talab qilinishi mumkin.',
      [this.errorCategories.VALIDATION]: 'Kiritilgan ma\'lumotlarda xatolik bor. Iltimos, tekshirib qayta urinib ko\'ring.',
      [this.errorCategories.STORAGE]: 'Fayl yuklashda muammo yuz berdi. Fayl hajmi va formatini tekshiring.',
      [this.errorCategories.CLOUDINARY]: 'Rasm yuklashda muammo yuz berdi. Qayta urinib ko\'ring.',
      [this.errorCategories.TELEGRAM]: 'Bildirishnoma yuborishda muammo yuz berdi.',
      [this.errorCategories.FIREBASE]: 'Ma\'lumotlar bazasi bilan bog\'lanishda muammo yuz berdi.',
      [this.errorCategories.SYSTEM]: 'Tizimda vaqtincha muammo. Keyinroq urinib ko\'ring.',
      [this.errorCategories.USER_INPUT]: 'Kiritilgan ma\'lumotlar noto\'g\'ri. Iltimos, tekshirib qayta kiriting.'
    };

    return messages[category] || messages[this.errorCategories.SYSTEM];
  }

  /**
   * Determine if error should be retried
   * @param {Error} error - Error object
   * @param {string} category - Error category
   * @returns {boolean} Should retry
   */
  shouldRetry(error, category) {
    // Don't retry validation or authentication errors
    if (category === this.errorCategories.VALIDATION ||
        category === this.errorCategories.AUTHENTICATION) {
      return false;
    }

    // Retry network, storage, and service errors
    return [
      this.errorCategories.NETWORK,
      this.errorCategories.CLOUDINARY,
      this.errorCategories.TELEGRAM,
      this.errorCategories.STORAGE
    ].includes(category);
  }

  /**
   * Retry mechanism with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Operation result
   */
  async retryOperation(operation, options = {}) {
    const config = { ...this.retryConfig, ...options };
    let lastError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === config.maxRetries) {
          throw this.handleError(error, 'retry_exhausted', { 
            totalAttempts: attempt + 1 
          });
        }

        const processedError = this.processError(error, 'retry_attempt', { 
          attempt: attempt + 1,
          maxRetries: config.maxRetries 
        });

        if (!processedError.shouldRetry) {
          throw error;
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Log error to internal storage
   * @param {Object} processedError - Processed error object
   */
  logError(processedError) {
    this.errorLog.push(processedError);
    
    // Keep only last 1000 errors in memory
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-1000);
    }

    // Console logging based on severity
    const logMethod = this.getLogMethod(processedError.severity);
    logMethod(`[${processedError.category.toUpperCase()}] ${processedError.context}:`, {
      message: processedError.originalError.message,
      userMessage: processedError.userMessage,
      metadata: processedError.metadata
    });
  }

  /**
   * Get appropriate console log method based on severity
   * @param {string} severity - Error severity
   * @returns {Function} Console method
   */
  getLogMethod(severity) {
    switch (severity) {
      case this.errorSeverity.CRITICAL:
      case this.errorSeverity.HIGH:
        return console.error;
      case this.errorSeverity.MEDIUM:
        return console.warn;
      default:
        return console.log;
    }
  }

  /**
   * Send error to monitoring service
   * @param {Object} processedError - Processed error
   */
  sendToMonitoring(processedError) {
    // In a real application, this would send to services like:
    // - Sentry
    // - LogRocket
    // - Datadog
    // - Custom monitoring endpoint
    
    if (typeof window !== 'undefined' && window.gtag) {
      // Send to Google Analytics as exception
      window.gtag('event', 'exception', {
        description: `${processedError.category}: ${processedError.originalError.message}`,
        fatal: processedError.severity === this.errorSeverity.CRITICAL
      });
    }
  }

  /**
   * Add error listener
   * @param {Function} listener - Error listener function
   */
  addErrorListener(listener) {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   * @param {Function} listener - Error listener function
   */
  removeErrorListener(listener) {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  /**
   * Notify all error listeners
   * @param {Object} processedError - Processed error
   */
  notifyErrorListeners(processedError) {
    this.errorListeners.forEach(listener => {
      try {
        listener(processedError);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Get error statistics
   * @param {Object} filters - Filters for statistics
   * @returns {Object} Error statistics
   */
  getErrorStatistics(filters = {}) {
    let filteredErrors = this.errorLog;

    if (filters.category) {
      filteredErrors = filteredErrors.filter(e => e.category === filters.category);
    }

    if (filters.severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === filters.severity);
    }

    if (filters.timeRange) {
      const now = new Date();
      const cutoff = new Date(now.getTime() - filters.timeRange);
      filteredErrors = filteredErrors.filter(e => new Date(e.timestamp) > cutoff);
    }

    const categoryStats = {};
    const severityStats = {};

    filteredErrors.forEach(error => {
      categoryStats[error.category] = (categoryStats[error.category] || 0) + 1;
      severityStats[error.severity] = (severityStats[error.severity] || 0) + 1;
    });

    return {
      total: filteredErrors.length,
      categoryBreakdown: categoryStats,
      severityBreakdown: severityStats,
      recentErrors: filteredErrors.slice(-10)
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Generate unique error ID
   * @returns {string} Unique error ID
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create fallback error when error handling fails
   * @param {Error} originalError - Original error
   * @param {string} context - Error context
   * @returns {Object} Fallback error
   */
  createFallbackError(originalError, context) {
    return {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      context,
      category: this.errorCategories.SYSTEM,
      severity: this.errorSeverity.HIGH,
      originalError: {
        name: originalError?.name || 'UnknownError',
        message: originalError?.message || 'Unknown error occurred'
      },
      userMessage: 'Tizimda kutilmagan xatolik yuz berdi. Iltimos, sahifani yangilab qayta urinib ko\'ring.',
      shouldRetry: false,
      retryCount: 0,
      metadata: { fallback: true }
    };
  }

  /**
   * Delay utility for retry mechanism
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const errorHandlingService = new ErrorHandlingService();

export default errorHandlingService;
export { ErrorHandlingService };