// Firebase Helper Functions
import { auth } from '../firebaseConfig';

/**
 * Get current user ID (authenticated or guest)
 */
export const getCurrentUserId = () => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    return currentUser.uid;
  }
  
  // Guest user ID
  let guestId = localStorage.getItem('firebaseGuestId');
  if (!guestId) {
    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('firebaseGuestId', guestId);
  }
  return guestId;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

/**
 * Check if user is guest
 */
export const isGuestUser = () => {
  return !auth.currentUser;
};

/**
 * Get user display name
 */
export const getUserDisplayName = () => {
  const currentUser = auth.currentUser;
  return currentUser?.displayName || currentUser?.email || 'Foydalanuvchi';
};

/**
 * Format Firebase timestamp to readable date
 */
export const formatFirebaseDate = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

/**
 * Format price to Uzbek format
 */
export const formatPrice = (price) => {
  if (!price) return '0 so\'m';
  
  try {
    return parseFloat(price).toLocaleString('uz-UZ') + ' so\'m';
  } catch (error) {
    return price + ' so\'m';
  }
};

/**
 * Generate order number
 */
export const generateOrderNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  
  return `ORD-${year}${month}${day}-${timestamp}`;
};

/**
 * Generate book slug from title
 */
export const generateBookSlug = (title, authorName = '') => {
  if (!title) return '';
  
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
  
  const cleanAuthor = authorName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  return cleanAuthor ? `${cleanTitle}-${cleanAuthor}` : cleanTitle;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Uzbekistan format)
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+998|998|8)?[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Format phone number to Uzbekistan format
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('998')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('8') && cleaned.length === 9) {
    return '+998' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    return '+998' + cleaned;
  }
  
  return phone;
};

/**
 * Debounce function for search
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for scroll events
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Truncate text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Get file extension from URL
 */
export const getFileExtension = (url) => {
  if (!url) return '';
  return url.split('.').pop().toLowerCase();
};

/**
 * Check if URL is valid
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate random ID
 */
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Local storage helpers with error handling
 */
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
};

/**
 * Firebase error handler
 */
export const handleFirebaseError = (error) => {
  console.error('Firebase error:', error);
  
  // Common Firebase error codes
  const errorMessages = {
    'permission-denied': 'Ruxsat berilmagan. Tizimga kiring yoki admin bilan bog\'laning.',
    'not-found': 'Ma\'lumot topilmadi.',
    'already-exists': 'Bu ma\'lumot allaqachon mavjud.',
    'invalid-argument': 'Noto\'g\'ri ma\'lumot kiritildi.',
    'deadline-exceeded': 'So\'rov vaqti tugadi. Qayta urinib ko\'ring.',
    'unavailable': 'Xizmat vaqtincha mavjud emas. Keyinroq urinib ko\'ring.',
    'unauthenticated': 'Tizimga kirish talab qilinadi.'
  };
  
  return errorMessages[error.code] || error.message || 'Noma\'lum xato yuz berdi';
};

export default {
  getCurrentUserId,
  isAuthenticated,
  isGuestUser,
  getUserDisplayName,
  formatFirebaseDate,
  formatPrice,
  generateOrderNumber,
  generateBookSlug,
  isValidEmail,
  isValidPhone,
  formatPhoneNumber,
  debounce,
  throttle,
  isEmpty,
  deepClone,
  capitalize,
  truncateText,
  getFileExtension,
  isValidUrl,
  generateId,
  storage,
  handleFirebaseError
};