/**
 * Utility functions for formatting data
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

/**
 * Format date to readable string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
    ...options
  };
  
  return dateObj.toLocaleDateString('uz-UZ', defaultOptions);
};

/**
 * Format date to short string (without time)
 */
export const formatDateShort = (date) => {
  return formatDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Format time only
 */
export const formatTime = (date) => {
  return formatDate(date, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format currency (UZS)
 */
export const formatCurrency = (amount, currency = 'UZS') => {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 so\'m';
  
  const formatted = amount.toLocaleString('uz-UZ');
  
  switch (currency) {
    case 'UZS':
      return `${formatted} so'm`;
    case 'USD':
      return `$${formatted}`;
    case 'EUR':
      return `€${formatted}`;
    default:
      return `${formatted} ${currency}`;
  }
};

/**
 * Format number with thousand separators
 */
export const formatNumber = (number) => {
  if (typeof number !== 'number' || isNaN(number)) return '0';
  return number.toLocaleString('uz-UZ');
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Uzbek phone numbers
  if (cleaned.startsWith('998') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
  }
  
  // Format other phone numbers
  if (cleaned.length >= 10) {
    return `+${cleaned}`;
  }
  
  return phone;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format duration (in milliseconds)
 */
export const formatDuration = (milliseconds) => {
  if (!milliseconds || milliseconds < 0) return '0 daqiqa';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} kun ${hours % 24} soat`;
  } else if (hours > 0) {
    return `${hours} soat ${minutes % 60} daqiqa`;
  } else if (minutes > 0) {
    return `${minutes} daqiqa`;
  } else {
    return `${seconds} soniya`;
  }
};

/**
 * Format percentage
 */
export const formatPercentage = (value, total, decimals = 1) => {
  if (!total || total === 0) return '0%';
  
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Format address
 */
export const formatAddress = (address) => {
  if (!address) return '';
  
  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.region && address.region !== address.city) parts.push(address.region);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country && address.country !== 'Uzbekistan') parts.push(address.country);
  
  return parts.join(', ');
};

/**
 * Format order status for display
 */
export const formatOrderStatus = (status) => {
  const statusMap = {
    'pending': 'Kutilmoqda',
    'confirmed': 'Tasdiqlangan',
    'processing': 'Jarayonda',
    'shipped': 'Yuborilgan',
    'delivered': 'Yetkazilgan',
    'cancelled': 'Bekor qilingan',
    'refunded': 'Qaytarilgan'
  };
  
  return statusMap[status] || status;
};

/**
 * Format payment status for display
 */
export const formatPaymentStatus = (status) => {
  const statusMap = {
    'pending': 'Kutilmoqda',
    'paid': 'To\'langan',
    'failed': 'Muvaffaqiyatsiz',
    'refunded': 'Qaytarilgan',
    'partial': 'Qisman to\'langan'
  };
  
  return statusMap[status] || status;
};

/**
 * Format shipping method for display
 */
export const formatShippingMethod = (method) => {
  const methodMap = {
    'pickup': 'Olib ketish',
    'delivery': 'Yetkazib berish',
    'courier': 'Kuryer',
    'post': 'Pochta'
  };
  
  return methodMap[method] || method;
};

/**
 * Format payment method for display
 */
export const formatPaymentMethod = (method) => {
  const methodMap = {
    'cash': 'Naqd pul',
    'card': 'Plastik karta',
    'transfer': 'Bank o\'tkazmasi',
    'online': 'Onlayn to\'lov'
  };
  
  return methodMap[method] || method;
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 7) {
    return formatDateShort(dateObj);
  } else if (diffDays > 0) {
    return `${diffDays} kun oldin`;
  } else if (diffHours > 0) {
    return `${diffHours} soat oldin`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} daqiqa oldin`;
  } else {
    return 'Hozir';
  }
};

/**
 * Format order number for display
 */
export const formatOrderNumber = (orderNumber) => {
  if (!orderNumber) return '';
  
  // If it's already formatted, return as is
  if (orderNumber.startsWith('ORD-')) {
    return orderNumber;
  }
  
  // If it's just an ID, format it
  return `#${orderNumber.substring(0, 8).toUpperCase()}`;
};

/**
 * Format tracking number for display
 */
export const formatTrackingNumber = (trackingNumber) => {
  if (!trackingNumber) return '';
  
  return `#${trackingNumber}`;
};

/**
 * Format inventory status
 */
export const formatInventoryStatus = (stock, threshold = 5) => {
  if (stock <= 0) {
    return { text: 'Tugagan', class: 'out-of-stock' };
  } else if (stock <= threshold) {
    return { text: 'Kam qolgan', class: 'low-stock' };
  } else {
    return { text: 'Mavjud', class: 'in-stock' };
  }
};

/**
 * Format rating (stars)
 */
export const formatRating = (rating, maxRating = 5) => {
  if (!rating || rating < 0) return '☆'.repeat(maxRating);
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);
  
  return '★'.repeat(fullStars) + 
         (hasHalfStar ? '☆' : '') + 
         '☆'.repeat(emptyStars);
};

/**
 * Format search query for highlighting
 */
export const formatSearchHighlight = (text, query) => {
  if (!query || !text) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

/**
 * Format validation errors
 */
export const formatValidationErrors = (errors) => {
  if (!errors || !Array.isArray(errors)) return '';
  
  return errors.join('; ');
};

/**
 * Format API response for display
 */
export const formatApiResponse = (response) => {
  if (!response) return 'No response';
  
  if (response.success) {
    return response.message || 'Success';
  } else {
    return response.error || response.message || 'Unknown error';
  }
};

export default {
  formatDate,
  formatDateShort,
  formatTime,
  formatCurrency,
  formatNumber,
  formatPhoneNumber,
  formatFileSize,
  formatDuration,
  formatPercentage,
  formatAddress,
  formatOrderStatus,
  formatPaymentStatus,
  formatShippingMethod,
  formatPaymentMethod,
  truncateText,
  formatRelativeTime,
  formatOrderNumber,
  formatTrackingNumber,
  formatInventoryStatus,
  formatRating,
  formatSearchHighlight,
  formatValidationErrors,
  formatApiResponse
};