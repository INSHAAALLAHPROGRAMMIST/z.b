// Application Constants

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  LCP_SLOW: 2500, // ms
  FID_SLOW: 100,  // ms
  CLS_HIGH: 0.1,  // score
  TTFB_SLOW: 600, // ms
  DOM_READY_SLOW: 3000, // ms
  LOAD_COMPLETE_SLOW: 5000, // ms
  RESOURCE_SLOW: 1000 // ms
};

// UI Constants
export const UI_CONSTANTS = {
  TOAST_DURATION: 3000, // ms
  MODAL_ANIMATION_DURATION: 300, // ms
  DEBOUNCE_DELAY: 300, // ms
  THROTTLE_DELAY: 100, // ms
  PAGINATION_DEFAULT_SIZE: 10,
  PAGINATION_OPTIONS: [5, 10, 20, 50],
  MAX_MOBILE_WIDTH: 768, // px
  MAX_TABLET_WIDTH: 1024, // px
  MIN_TOUCH_TARGET: 44, // px
  SEARCH_MIN_LENGTH: 2
};

// Cache durations
export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000,    // 5 minutes
  MEDIUM: 30 * 60 * 1000,  // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  WEBHOOK_CHECK: 10 * 60 * 1000 // 10 minutes
};

// Image settings
export const IMAGE_SETTINGS = {
  MAX_WIDTH: 800,
  MAX_HEIGHT: 600,
  QUALITY: 80,
  FORMATS: ['webp', 'jpg', 'png'],
  LAZY_LOAD_THRESHOLD: 100, // px
  BOOK_COVER_SIZES: {
    THUMBNAIL: { width: 150, height: 200 },
    CARD: { width: 250, height: 350 },
    DETAIL: { width: 400, height: 600 }
  }
};

// API settings
export const API_SETTINGS = {
  REQUEST_TIMEOUT: 10000, // ms
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
  BATCH_SIZE: 50,
  MAX_CONCURRENT_REQUESTS: 5
};

// Validation rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 1000,
  TITLE_MAX_LENGTH: 200
};

// User activity tracking
export const ACTIVITY_SETTINGS = {
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  ACTIVITY_CHECK_INTERVAL: 60 * 1000, // 1 minute
  SESSION_EXTEND_THRESHOLD: 5 * 60 * 1000 // 5 minutes
};

// Error codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTH_ERROR',
  AUTHORIZATION_ERROR: 'AUTHZ_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMIT: 'RATE_LIMIT'
};

// Status codes
export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500
};

// Local storage keys
export const STORAGE_KEYS = {
  USER_ID: 'currentUserId',
  GUEST_ID: 'appwriteGuestId',
  CART_ITEMS: 'cartItems',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  LAST_ACTIVITY: 'lastUserActivity',
  PERFORMANCE_METRICS: 'performanceMetrics'
};

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_PERFORMANCE_MONITORING: false,
  ENABLE_ERROR_REPORTING: true,
  ENABLE_ANALYTICS: false,
  ENABLE_A_B_TESTING: false,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_PUSH_NOTIFICATIONS: false
};

// Environment checks
export const ENV_CHECKS = {
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  IS_TEST: import.meta.env.MODE === 'test'
};