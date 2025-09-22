// Enhanced Cart Model
// Supports Cloudinary images, session persistence, and advanced features

export const CartItemModel = {
  // Core fields
  id: String,
  userId: String,
  bookId: String,
  quantity: Number,
  
  // Enhanced pricing
  priceAtTimeOfAdd: Number,
  currentPrice: Number,
  discountAmount: Number,
  
  // Book data snapshot (for performance)
  bookData: {
    title: String,
    authorName: String,
    images: {
      main: String,        // Cloudinary URL
      thumbnail: String    // Optimized thumbnail
    },
    isbn: String,
    sku: String,
    availability: Boolean,
    stock: Number
  },
  
  // Session and device tracking
  sessionId: String,
  deviceId: String,
  
  // Cart features
  savedForLater: Boolean,
  priority: Number,        // For sorting
  notes: String,          // User notes
  
  // Sharing features
  sharedWith: [String],   // User IDs
  shareToken: String,     // For public sharing
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastAccessedAt: Date,
  expiresAt: Date         // Auto-cleanup
};

export const CartModel = {
  // Cart metadata
  userId: String,
  sessionId: String,
  deviceId: String,
  
  // Cart state
  items: [CartItemModel],
  totalItems: Number,
  totalAmount: Number,
  
  // Enhanced features
  savedItems: [CartItemModel],  // Save for later
  sharedCarts: [String],        // Shared cart IDs
  
  // Persistence
  syncedAt: Date,
  version: Number,              // For conflict resolution
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastAccessedAt: Date
};

// Cart validation rules
export const CartValidation = {
  maxItemsPerCart: 50,
  maxQuantityPerItem: 10,
  maxSavedItems: 100,
  sessionExpiryDays: 30,
  guestCartExpiryDays: 7
};

// Cart item status
export const CartItemStatus = {
  ACTIVE: 'active',
  SAVED_FOR_LATER: 'saved_for_later',
  OUT_OF_STOCK: 'out_of_stock',
  PRICE_CHANGED: 'price_changed',
  EXPIRED: 'expired'
};

// Cart events for real-time updates
export const CartEvents = {
  ITEM_ADDED: 'cart:item_added',
  ITEM_UPDATED: 'cart:item_updated',
  ITEM_REMOVED: 'cart:item_removed',
  CART_CLEARED: 'cart:cleared',
  CART_SYNCED: 'cart:synced',
  PRICE_UPDATED: 'cart:price_updated'
};

export default {
  CartItemModel,
  CartModel,
  CartValidation,
  CartItemStatus,
  CartEvents
};