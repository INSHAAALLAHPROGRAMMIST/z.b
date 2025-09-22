/**
 * Security Configuration
 * Central configuration for all security-related settings
 */

export const SECURITY_CONFIG = {
  // Authentication settings
  auth: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordMinLength: 8,
    requireStrongPassword: true,
    enableTwoFactor: false // Future feature
  },

  // Rate limiting settings
  rateLimiting: {
    enabled: true,
    limits: {
      // Authentication actions
      login: { requests: 5, windowMs: 15 * 60 * 1000 },
      register: { requests: 3, windowMs: 60 * 60 * 1000 },
      passwordReset: { requests: 3, windowMs: 60 * 60 * 1000 },
      
      // Order actions
      createOrder: { requests: 10, windowMs: 60 * 60 * 1000 },
      updateOrder: { requests: 20, windowMs: 60 * 60 * 1000 },
      
      // Search actions
      search: { requests: 100, windowMs: 60 * 1000 },
      advancedSearch: { requests: 50, windowMs: 60 * 1000 },
      
      // Image upload actions
      imageUpload: { requests: 20, windowMs: 60 * 60 * 1000 },
      
      // Contact/feedback actions
      contactForm: { requests: 5, windowMs: 60 * 60 * 1000 },
      feedback: { requests: 10, windowMs: 60 * 60 * 1000 },
      
      // API calls
      apiCall: { requests: 1000, windowMs: 60 * 60 * 1000 },
      
      // Admin actions
      adminAction: { requests: 500, windowMs: 60 * 60 * 1000 }
    }
  },

  // File upload security settings
  fileUpload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    allowedImageExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    allowedDocumentTypes: ['application/pdf', 'text/plain'],
    allowedDocumentExtensions: ['.pdf', '.txt'],
    maxImageDimensions: { width: 4000, height: 4000 },
    enableVirusScanning: false, // Future feature
    enableContentAnalysis: true
  },

  // Input validation settings
  validation: {
    enableXSSProtection: true,
    enableSQLInjectionProtection: true,
    enablePathTraversalProtection: true,
    maxInputLength: {
      name: 100,
      email: 254,
      phone: 20,
      description: 2000,
      address: 200
    },
    enableInputSanitization: true,
    strictValidation: true
  },

  // Content Security Policy
  csp: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://res.cloudinary.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https://res.cloudinary.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", 'https://api.telegram.org', 'https://api.cloudinary.com'],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    }
  },

  // Security headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  },

  // Logging and monitoring
  logging: {
    enableSecurityLogs: true,
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    maxLogEntries: 1000,
    logRetentionDays: 30,
    enableRealTimeAlerts: false, // Future feature
    sensitiveDataMasking: true
  },

  // Encryption settings
  encryption: {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    iterations: 100000,
    enableFieldLevelEncryption: false // Future feature
  },

  // Session security
  session: {
    enableSecureCookies: true,
    enableHttpOnly: true,
    enableSameSite: 'strict',
    enableSessionRotation: true,
    detectSessionHijacking: true,
    enableConcurrentSessionLimit: false, // Future feature
    maxConcurrentSessions: 3
  },

  // API security
  api: {
    enableCORS: true,
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://zamon-books.netlify.app'
    ],
    enableAPIKeyValidation: false, // Future feature
    enableRequestSigning: false, // Future feature
    enableResponseEncryption: false // Future feature
  },

  // Cloudinary security
  cloudinary: {
    enableSignedUploads: true,
    enableTransformationValidation: true,
    allowedTransformations: [
      'c_fill', 'c_fit', 'c_scale', 'c_crop',
      'w_auto', 'h_auto', 'q_auto', 'f_auto',
      'dpr_auto', 'fl_progressive'
    ],
    maxTransformationChain: 5,
    enableWatermarking: false // Future feature
  },

  // Telegram security
  telegram: {
    enableWebhookValidation: true,
    enableMessageEncryption: false, // Future feature
    enableRateLimiting: true,
    maxMessageLength: 4096,
    allowedUpdateTypes: ['message', 'callback_query']
  },

  // Database security
  database: {
    enableQueryLogging: false, // Don't log in production
    enableSlowQueryDetection: true,
    slowQueryThreshold: 1000, // ms
    enableConnectionPooling: true,
    maxConnections: 10,
    enableReadOnlyReplicas: false // Future feature
  },

  // Error handling
  errorHandling: {
    enableDetailedErrors: false, // Only in development
    enableErrorReporting: true,
    enableStackTraces: false, // Never in production
    enableSensitiveDataMasking: true,
    errorRetentionDays: 7
  },

  // Feature flags for security features
  features: {
    enableAdvancedThreatDetection: false,
    enableBehaviorAnalysis: false,
    enableGeolocationBlocking: false,
    enableDeviceFingerprinting: false,
    enableBotDetection: true,
    enableHoneypots: false,
    enableDecoyFields: true
  },

  // Compliance settings
  compliance: {
    enableGDPRCompliance: true,
    enableCCPACompliance: false,
    enableDataRetentionPolicies: true,
    enableAuditLogging: true,
    enableDataMinimization: true
  }
};

// Environment-specific overrides
export const getSecurityConfig = () => {
  const config = { ...SECURITY_CONFIG };
  
  // Development environment overrides
  if (import.meta.env.DEV) {
    config.errorHandling.enableDetailedErrors = true;
    config.logging.logLevel = 'debug';
    config.rateLimiting.limits.login.requests = 10; // More lenient for development
  }
  
  // Production environment overrides
  if (import.meta.env.PROD) {
    config.auth.requireStrongPassword = true;
    config.logging.enableRealTimeAlerts = true;
    config.errorHandling.enableStackTraces = false;
    config.errorHandling.enableDetailedErrors = false;
  }
  
  return config;
};

// Security middleware configuration
export const SECURITY_MIDDLEWARE = {
  // Request validation middleware
  requestValidation: {
    enabled: true,
    validateHeaders: true,
    validateBody: true,
    validateQuery: true,
    maxRequestSize: '10mb'
  },
  
  // Response security middleware
  responseSecurity: {
    enabled: true,
    removeServerHeader: true,
    addSecurityHeaders: true,
    enableContentTypeValidation: true
  },
  
  // Authentication middleware
  authentication: {
    enabled: true,
    requireAuthForAPI: true,
    enableTokenRefresh: true,
    validateTokenSignature: true
  },
  
  // Authorization middleware
  authorization: {
    enabled: true,
    enableRoleBasedAccess: true,
    enableResourceBasedAccess: false,
    enablePermissionCaching: true
  }
};

export default SECURITY_CONFIG;