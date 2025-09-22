/**
 * Rate Limiting Service
 * Implements client-side rate limiting and abuse prevention
 */

class RateLimitingService {
  constructor() {
    this.limits = new Map();
    this.storage = window.localStorage;
    this.storagePrefix = 'rateLimit:';
  }

  // Define rate limits for different actions
  static LIMITS = {
    // Authentication actions
    login: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    register: { requests: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
    passwordReset: { requests: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
    
    // Order actions
    createOrder: { requests: 10, windowMs: 60 * 60 * 1000 }, // 10 orders per hour
    updateOrder: { requests: 20, windowMs: 60 * 60 * 1000 }, // 20 updates per hour
    
    // Search actions
    search: { requests: 100, windowMs: 60 * 1000 }, // 100 searches per minute
    advancedSearch: { requests: 50, windowMs: 60 * 1000 }, // 50 advanced searches per minute
    
    // Image upload actions
    imageUpload: { requests: 20, windowMs: 60 * 60 * 1000 }, // 20 uploads per hour
    
    // Contact/feedback actions
    contactForm: { requests: 5, windowMs: 60 * 60 * 1000 }, // 5 messages per hour
    feedback: { requests: 10, windowMs: 60 * 60 * 1000 }, // 10 feedback per hour
    
    // API calls
    apiCall: { requests: 1000, windowMs: 60 * 60 * 1000 }, // 1000 API calls per hour
    
    // Admin actions
    adminAction: { requests: 500, windowMs: 60 * 60 * 1000 }, // 500 admin actions per hour
  };

  // Check if action is allowed
  checkLimit(identifier, action, customLimit = null) {
    const limit = customLimit || RateLimitingService.LIMITS[action];
    
    if (!limit) {
      console.warn(`No rate limit defined for action: ${action}`);
      return { allowed: true, remaining: Infinity, resetTime: null };
    }

    const key = `${identifier}:${action}`;
    const now = Date.now();
    
    // Get stored data
    const stored = this.getStoredData(key);
    let data = stored || { count: 0, resetTime: now + limit.windowMs };

    // Reset if window has passed
    if (now > data.resetTime) {
      data = { count: 0, resetTime: now + limit.windowMs };
    }

    // Check if limit exceeded
    if (data.count >= limit.requests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      };
    }

    return {
      allowed: true,
      remaining: limit.requests - data.count,
      resetTime: data.resetTime,
      retryAfter: 0
    };
  }

  // Record an action (increment counter)
  recordAction(identifier, action, customLimit = null) {
    const limit = customLimit || RateLimitingService.LIMITS[action];
    
    if (!limit) {
      return;
    }

    const key = `${identifier}:${action}`;
    const now = Date.now();
    
    // Get stored data
    const stored = this.getStoredData(key);
    let data = stored || { count: 0, resetTime: now + limit.windowMs };

    // Reset if window has passed
    if (now > data.resetTime) {
      data = { count: 0, resetTime: now + limit.windowMs };
    }

    // Increment count
    data.count++;
    data.lastAction = now;
    
    // Store updated data
    this.setStoredData(key, data);

    return {
      count: data.count,
      remaining: Math.max(0, limit.requests - data.count),
      resetTime: data.resetTime
    };
  }

  // Get stored rate limit data
  getStoredData(key) {
    try {
      const stored = this.storage.getItem(this.storagePrefix + key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading rate limit data:', error);
      return null;
    }
  }

  // Store rate limit data
  setStoredData(key, data) {
    try {
      this.storage.setItem(this.storagePrefix + key, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing rate limit data:', error);
    }
  }

  // Clear rate limit data for a specific action
  clearLimit(identifier, action) {
    const key = `${identifier}:${action}`;
    this.storage.removeItem(this.storagePrefix + key);
  }

  // Clear all rate limit data
  clearAllLimits() {
    const keys = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => this.storage.removeItem(key));
  }

  // Get user identifier (IP-like identifier for client-side)
  getUserIdentifier() {
    // In a real application, this would be the user's IP address
    // For client-side, we use a combination of user agent and screen resolution
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Rate limiting fingerprint', 2, 2);
    
    const fingerprint = canvas.toDataURL();
    const userAgent = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    
    // Create a simple hash
    let hash = 0;
    const str = fingerprint + userAgent + screen;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  // Middleware function for API calls
  async withRateLimit(identifier, action, apiCall, customLimit = null) {
    // Check rate limit
    const limitCheck = this.checkLimit(identifier, action, customLimit);
    
    if (!limitCheck.allowed) {
      const error = new Error('Rate limit exceeded');
      error.code = 'RATE_LIMIT_EXCEEDED';
      error.retryAfter = limitCheck.retryAfter;
      error.resetTime = limitCheck.resetTime;
      throw error;
    }

    try {
      // Record the action
      this.recordAction(identifier, action, customLimit);
      
      // Execute the API call
      const result = await apiCall();
      
      return result;
    } catch (error) {
      // If the API call fails, we might want to not count it against the limit
      // depending on the error type
      if (error.code === 'NETWORK_ERROR' || error.code === 'SERVER_ERROR') {
        // Don't count network/server errors against the user
        const key = `${identifier}:${action}`;
        const stored = this.getStoredData(key);
        if (stored && stored.count > 0) {
          stored.count--;
          this.setStoredData(key, stored);
        }
      }
      
      throw error;
    }
  }

  // Detect suspicious activity patterns
  detectSuspiciousActivity(identifier) {
    const suspiciousPatterns = [];
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Check for rapid-fire requests
    const recentActions = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.storagePrefix + identifier)) {
        try {
          const data = JSON.parse(this.storage.getItem(key));
          if (data.lastAction && (now - data.lastAction) < oneHour) {
            recentActions.push({
              action: key.split(':')[2],
              count: data.count,
              lastAction: data.lastAction
            });
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }

    // Pattern 1: Too many different actions in short time
    if (recentActions.length > 10) {
      suspiciousPatterns.push('high_action_variety');
    }

    // Pattern 2: Extremely high request count
    const totalRequests = recentActions.reduce((sum, action) => sum + action.count, 0);
    if (totalRequests > 1000) {
      suspiciousPatterns.push('high_request_volume');
    }

    // Pattern 3: Rapid succession of failed login attempts
    const loginAction = recentActions.find(a => a.action === 'login');
    if (loginAction && loginAction.count >= 5) {
      suspiciousPatterns.push('brute_force_login');
    }

    return {
      isSuspicious: suspiciousPatterns.length > 0,
      patterns: suspiciousPatterns,
      riskScore: suspiciousPatterns.length * 25, // 0-100 scale
      recentActions
    };
  }

  // Block suspicious users temporarily
  blockUser(identifier, durationMs = 60 * 60 * 1000) { // 1 hour default
    const blockKey = `${identifier}:blocked`;
    const blockData = {
      blockedAt: Date.now(),
      unblockAt: Date.now() + durationMs,
      reason: 'suspicious_activity'
    };
    
    this.setStoredData(blockKey, blockData);
  }

  // Check if user is blocked
  isUserBlocked(identifier) {
    const blockKey = `${identifier}:blocked`;
    const blockData = this.getStoredData(blockKey);
    
    if (!blockData) {
      return { blocked: false };
    }

    const now = Date.now();
    if (now > blockData.unblockAt) {
      // Block has expired, remove it
      this.storage.removeItem(this.storagePrefix + blockKey);
      return { blocked: false };
    }

    return {
      blocked: true,
      reason: blockData.reason,
      unblockAt: blockData.unblockAt,
      remainingMs: blockData.unblockAt - now
    };
  }

  // Clean up old rate limit data
  cleanup() {
    const now = Date.now();
    const keysToRemove = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        try {
          const data = JSON.parse(this.storage.getItem(key));
          // Remove data older than 24 hours
          if (data.resetTime && (now - data.resetTime) > 24 * 60 * 60 * 1000) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Remove corrupted data
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => this.storage.removeItem(key));
    
    return keysToRemove.length;
  }
}

// Create singleton instance
const rateLimitingService = new RateLimitingService();

export default rateLimitingService;