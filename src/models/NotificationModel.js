// Notification Data Model
// Requirements: 2.1, 2.2, 2.3, 2.4

/**
 * Notification Model - User notification system data structure
 */
export const NotificationModel = {
  // Core fields
  id: String,
  userId: String,
  type: String,        // 'order', 'wishlist', 'promotion', 'system', 'low_stock'
  title: String,
  message: String,
  data: Object,        // Additional data specific to notification type
  
  // Status fields
  read: Boolean,
  priority: String,    // 'low', 'medium', 'high', 'urgent'
  
  // Timestamps
  createdAt: Date,
  readAt: Date,
  expiresAt: Date,     // Optional expiration date
  
  // Metadata
  source: String,      // 'system', 'admin', 'telegram', 'email'
  category: String,    // 'order_update', 'stock_alert', 'promotion', etc.
  actionUrl: String,   // Optional URL for action button
  actionText: String   // Optional text for action button
};

/**
 * Notification Types
 */
export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  WISHLIST: 'wishlist', 
  PROMOTION: 'promotion',
  SYSTEM: 'system',
  LOW_STOCK: 'low_stock',
  INVENTORY: 'inventory',
  USER_ACTION: 'user_action'
};

/**
 * Notification Priorities
 */
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

/**
 * Notification Categories
 */
export const NOTIFICATION_CATEGORIES = {
  ORDER_CREATED: 'order_created',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  STOCK_LOW: 'stock_low',
  STOCK_OUT: 'stock_out',
  STOCK_RESTOCKED: 'stock_restocked',
  WISHLIST_AVAILABLE: 'wishlist_available',
  WISHLIST_PRICE_DROP: 'wishlist_price_drop',
  PROMOTION_NEW: 'promotion_new',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_UPDATE: 'system_update',
  USER_WELCOME: 'user_welcome',
  USER_VERIFICATION: 'user_verification'
};

/**
 * Create notification data object
 */
export const createNotificationData = ({
  userId,
  type,
  title,
  message,
  data = {},
  priority = NOTIFICATION_PRIORITIES.MEDIUM,
  category = null,
  actionUrl = null,
  actionText = null,
  expiresAt = null,
  source = 'system'
}) => {
  return {
    userId,
    type,
    title,
    message,
    data,
    read: false,
    priority,
    category,
    actionUrl,
    actionText,
    source,
    createdAt: new Date(),
    readAt: null,
    expiresAt
  };
};

/**
 * Order notification templates
 */
export const ORDER_NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_CATEGORIES.ORDER_CREATED]: {
    title: "Yangi buyurtma yaratildi",
    message: "Buyurtmangiz #{orderNumber} muvaffaqiyatli yaratildi",
    priority: NOTIFICATION_PRIORITIES.HIGH,
    actionText: "Buyurtmani ko'rish"
  },
  [NOTIFICATION_CATEGORIES.ORDER_CONFIRMED]: {
    title: "Buyurtma tasdiqlandi",
    message: "Buyurtmangiz #{orderNumber} tasdiqlandi va tayyorlanmoqda",
    priority: NOTIFICATION_PRIORITIES.HIGH,
    actionText: "Buyurtmani kuzatish"
  },
  [NOTIFICATION_CATEGORIES.ORDER_SHIPPED]: {
    title: "Buyurtma jo'natildi",
    message: "Buyurtmangiz #{orderNumber} jo'natildi va yetkazib berish jarayonida",
    priority: NOTIFICATION_PRIORITIES.HIGH,
    actionText: "Yetkazib berishni kuzatish"
  },
  [NOTIFICATION_CATEGORIES.ORDER_DELIVERED]: {
    title: "Buyurtma yetkazildi",
    message: "Buyurtmangiz #{orderNumber} muvaffaqiyatli yetkazildi",
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    actionText: "Baholash"
  },
  [NOTIFICATION_CATEGORIES.ORDER_CANCELLED]: {
    title: "Buyurtma bekor qilindi",
    message: "Buyurtmangiz #{orderNumber} bekor qilindi",
    priority: NOTIFICATION_PRIORITIES.HIGH,
    actionText: "Tafsilotlar"
  }
};

/**
 * Stock notification templates
 */
export const STOCK_NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_CATEGORIES.STOCK_LOW]: {
    title: "Stok kam qoldi",
    message: "'{bookTitle}' kitobining stoklari kam qoldi ({stock} dona)",
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    actionText: "Stokni to'ldirish"
  },
  [NOTIFICATION_CATEGORIES.STOCK_OUT]: {
    title: "Stok tugadi",
    message: "'{bookTitle}' kitobining stoklari tugadi",
    priority: NOTIFICATION_PRIORITIES.HIGH,
    actionText: "Stokni to'ldirish"
  },
  [NOTIFICATION_CATEGORIES.STOCK_RESTOCKED]: {
    title: "Stok to'ldirildi",
    message: "'{bookTitle}' kitobining stoklari to'ldirildi",
    priority: NOTIFICATION_PRIORITIES.LOW,
    actionText: "Kitobni ko'rish"
  }
};

/**
 * Wishlist notification templates
 */
export const WISHLIST_NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_CATEGORIES.WISHLIST_AVAILABLE]: {
    title: "Sevimli kitobingiz mavjud",
    message: "'{bookTitle}' kitobingiz endi mavjud",
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    actionText: "Xarid qilish"
  },
  [NOTIFICATION_CATEGORIES.WISHLIST_PRICE_DROP]: {
    title: "Narx tushdi!",
    message: "'{bookTitle}' kitobining narxi {oldPrice} so'mdan {newPrice} so'mga tushdi",
    priority: NOTIFICATION_PRIORITIES.HIGH,
    actionText: "Xarid qilish"
  }
};

export default NotificationModel;