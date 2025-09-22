/**
 * Security Middleware
 * Centralized security middleware that integrates all security services
 */

import SecurityService from '../services/SecurityService';
import ValidationService from '../services/ValidationService';
import RateLimitingService from '../services/RateLimitingService';
import SecureFileUploadService from '../services/SecureFileUploadService';
import { getSecurityConfig } from '../config/security.config';

class SecurityMiddleware {
  constructor() {
    this.config = getSecurityConfig();
    this.isInitialized = false;
  }

  // Initialize security middleware
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Set up security headers
      this.setupSecurityHeaders();
      
      // Initialize Content Security Policy
      this.setupCSP();
      
      // Set up global error handlers
      this.setupErrorHandlers();
      
      // Initialize security monitoring
      this.setupSecurityMonitoring();
      
      this.isInitialized = true;
      console.log('Security middleware initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize security middleware:', error);
      throw error;
    }
  }

  // Set up security headers
  setupSecurityHeaders() {
    if (!this.config.headers) return;

    // Add security headers to all responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Add security headers to response (for client-side tracking)
      Object.entries(this.config.headers).forEach(([header, value]) => {
        if (response.headers && typeof response.headers.set === 'function') {
          response.headers.set(header, value);
        }
      });
      
      return response;
    };
  }

  // Set up Content Security Policy
  setupCSP() {
    if (!this.config.csp.enabled) return;

    const cspDirectives = Object.entries(this.config.csp.directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');

    // Create meta tag for CSP (fallback)
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = cspDirectives;
    document.head.appendChild(meta);
  }

  // Set up global error handlers
  setupErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleSecurityError('unhandled_promise_rejection', {
        error: event.reason,
        promise: event.promise
      });
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleSecurityError('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
  }

  // Set up security monitoring
  setupSecurityMonitoring() {
    // Monitor for suspicious DOM manipulation
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.checkForSuspiciousElements(node);
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    // Monitor for suspicious network requests
    this.monitorNetworkRequests();
  }

  // Check for suspicious DOM elements
  checkForSuspiciousElements(element) {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /<script/i,
      /on\w+\s*=/i
    ];

    const checkAttributes = (el) => {
      if (el.attributes) {
        Array.from(el.attributes).forEach(attr => {
          const value = attr.value;
          if (suspiciousPatterns.some(pattern => pattern.test(value))) {
            this.handleSecurityThreat('suspicious_dom_element', {
              element: el.tagName,
              attribute: attr.name,
              value: value,
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    };

    checkAttributes(element);
    
    // Check child elements
    if (element.children) {
      Array.from(element.children).forEach(child => {
        checkAttributes(child);
      });
    }
  }

  // Monitor network requests for suspicious activity
  monitorNetworkRequests() {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalFetch = window.fetch;

    // Monitor XMLHttpRequest
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      SecurityMiddleware.instance.validateNetworkRequest(method, url, 'xhr');
      return originalXHROpen.call(this, method, url, ...args);
    };

    // Monitor fetch requests
    window.fetch = async function(url, options = {}) {
      SecurityMiddleware.instance.validateNetworkRequest(options.method || 'GET', url, 'fetch');
      return originalFetch.call(this, url, options);
    };
  }

  // Validate network requests
  validateNetworkRequest(method, url, type) {
    try {
      const urlObj = new URL(url, window.location.origin);
      
      // Check for suspicious URLs
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /file:/i,
        /ftp:/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(urlObj.protocol))) {
        this.handleSecurityThreat('suspicious_network_request', {
          method,
          url: url.toString(),
          type,
          protocol: urlObj.protocol,
          timestamp: new Date().toISOString()
        });
        return false;
      }

      // Check if URL is in allowed origins for external requests
      if (urlObj.origin !== window.location.origin) {
        const allowedOrigins = this.config.api.allowedOrigins || [];
        if (!allowedOrigins.includes(urlObj.origin)) {
          console.warn('Request to non-whitelisted origin:', urlObj.origin);
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating network request:', error);
      return false;
    }
  }

  // Authentication middleware
  async authenticateRequest(request) {
    try {
      // Validate session
      const sessionValidation = SecurityService.validateSession();
      if (!sessionValidation.isValid) {
        throw new Error('Invalid session: ' + sessionValidation.reason);
      }

      // Check rate limiting
      const identifier = RateLimitingService.getUserIdentifier();
      const rateLimit = RateLimitingService.checkLimit(identifier, 'apiCall');
      if (!rateLimit.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`);
      }

      // Record the API call
      RateLimitingService.recordAction(identifier, 'apiCall');

      return {
        authenticated: true,
        session: sessionValidation.session,
        rateLimit
      };

    } catch (error) {
      this.handleSecurityError('authentication_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        authenticated: false,
        error: error.message
      };
    }
  }

  // Input validation middleware
  validateInput(data, validationType = 'general') {
    try {
      const validatedData = {};
      const errors = {};

      Object.entries(data).forEach(([key, value]) => {
        let validation;

        switch (key) {
          case 'email':
            validation = ValidationService.validateEmail(value);
            break;
          case 'name':
          case 'firstName':
          case 'lastName':
            validation = ValidationService.validateName(value, key);
            break;
          case 'phone':
            validation = ValidationService.validatePhone(value);
            break;
          case 'price':
          case 'amount':
          case 'totalAmount':
            validation = ValidationService.validatePrice(value, key);
            break;
          case 'description':
          case 'message':
          case 'comment':
            validation = ValidationService.validateText(value, key, 0, 2000);
            break;
          case 'imageUrl':
          case 'profileImage':
            validation = ValidationService.validateImageUrl(value, key);
            break;
          default:
            // Generic text validation
            validation = ValidationService.validateText(value, key, 0, 1000);
        }

        if (validation.isValid) {
          validatedData[key] = validation.value;
        } else {
          errors[key] = validation.error;
        }
      });

      return {
        isValid: Object.keys(errors).length === 0,
        data: validatedData,
        errors
      };

    } catch (error) {
      this.handleSecurityError('input_validation_failed', {
        error: error.message,
        data: Object.keys(data),
        timestamp: new Date().toISOString()
      });

      return {
        isValid: false,
        errors: { general: 'Input validation failed' }
      };
    }
  }

  // File upload validation middleware
  async validateFileUpload(file, fileType = 'image', options = {}) {
    try {
      // Check rate limiting for file uploads
      const identifier = RateLimitingService.getUserIdentifier();
      const rateLimit = RateLimitingService.checkLimit(identifier, 'imageUpload');
      if (!rateLimit.allowed) {
        throw new Error(`Upload rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`);
      }

      // Validate file
      const validation = await SecureFileUploadService.validateFile(file, fileType, options);
      
      if (validation.isValid) {
        // Record successful upload attempt
        RateLimitingService.recordAction(identifier, 'imageUpload');
      }

      return validation;

    } catch (error) {
      this.handleSecurityError('file_upload_validation_failed', {
        error: error.message,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
        timestamp: new Date().toISOString()
      });

      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  // Handle security errors
  handleSecurityError(errorType, errorData) {
    SecurityService.logSecurityEvent(errorType, {
      ...errorData,
      severity: 'error',
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to send this to a monitoring service
    if (this.config.logging.enableRealTimeAlerts) {
      this.sendSecurityAlert(errorType, errorData);
    }
  }

  // Handle security threats
  handleSecurityThreat(threatType, threatData) {
    SecurityService.logSecurityEvent(threatType, {
      ...threatData,
      severity: 'critical',
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });

    // Block user if threat is severe
    const severeThreatTypes = [
      'suspicious_dom_element',
      'suspicious_network_request',
      'xss_attempt',
      'sql_injection_attempt'
    ];

    if (severeThreatTypes.includes(threatType)) {
      const identifier = RateLimitingService.getUserIdentifier();
      RateLimitingService.blockUser(identifier, 60 * 60 * 1000); // Block for 1 hour
      
      // Clear session
      SecurityService.clearSession();
      
      // Redirect to security warning page
      this.showSecurityWarning(threatType);
    }
  }

  // Send security alert (placeholder for real implementation)
  sendSecurityAlert(alertType, alertData) {
    // In a real implementation, this would send alerts to:
    // - Security monitoring service
    // - Admin notifications
    // - Telegram bot for critical alerts
    console.warn('Security Alert:', alertType, alertData);
  }

  // Show security warning to user
  showSecurityWarning(threatType) {
    const warningMessage = `Security threat detected: ${threatType}. Your session has been terminated for security reasons.`;
    
    // Create warning overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 18px;
      text-align: center;
    `;
    
    overlay.innerHTML = `
      <div>
        <h2>Security Warning</h2>
        <p>${warningMessage}</p>
        <p>Please refresh the page and try again.</p>
        <button onclick="window.location.reload()" style="
          background: white;
          color: red;
          border: none;
          padding: 10px 20px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 20px;
        ">Reload Page</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  // Clean up security data
  cleanup() {
    // Clean up old rate limiting data
    RateLimitingService.cleanup();
    
    // Clean up old security logs
    SecurityService.clearOldLogs(this.config.logging.logRetentionDays);
  }

  // Get security status
  getSecurityStatus() {
    const identifier = RateLimitingService.getUserIdentifier();
    const sessionValidation = SecurityService.validateSession();
    const blockStatus = RateLimitingService.isUserBlocked(identifier);
    const suspiciousActivity = RateLimitingService.detectSuspiciousActivity(identifier);

    return {
      sessionValid: sessionValidation.isValid,
      userBlocked: blockStatus.blocked,
      suspiciousActivity: suspiciousActivity.isSuspicious,
      riskScore: suspiciousActivity.riskScore,
      securityLogs: SecurityService.getSecurityLogs(10),
      lastActivity: sessionValidation.session?.lastActivity,
      rateLimits: {
        login: RateLimitingService.checkLimit(identifier, 'login'),
        apiCall: RateLimitingService.checkLimit(identifier, 'apiCall'),
        imageUpload: RateLimitingService.checkLimit(identifier, 'imageUpload')
      }
    };
  }
}

// Create singleton instance
const securityMiddleware = new SecurityMiddleware();

// Auto-initialize when module is loaded
securityMiddleware.initialize().catch(error => {
  console.error('Failed to initialize security middleware:', error);
});

// Make instance available globally for debugging (development only)
if (import.meta.env.DEV) {
  window.SecurityMiddleware = securityMiddleware;
}

export default securityMiddleware;