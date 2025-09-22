// Enhanced Wishlist Model
// Supports real-time updates, notifications, and advanced features

export const WishlistItemModel = {
  // Core fields
  id: String,
  userId: String,
  bookId: String,
  
  // Book data snapshot (for performance)
  bookData: {
    title: String,
    authorName: String,
    images: {
      main: String,        // Cloudinary URL
      thumbnail: String    // Optimized thumbnail
    },
    price: Number,
    originalPrice: Number,
    discountPercentage: Number,
    isbn: String,
    sku: String,
    availability: Boolean,
    stock: Number,
    genre: String
  },
  
  // Wishlist features
  priority: Number,        // 1-5 rating
  notes: String,          // User notes
  tags: [String],         // Custom tags
  
  // Notification preferences
  notifications: {
    priceDrops: Boolean,
    backInStock: Boolean,
    newEdition: Boolean,
    authorNews: Boolean
  },
  
  // Price tracking
  priceHistory: [{
    price: Number,
    date: Date,
    source: String
  }],
  targetPrice: Number,     // Notify when price drops below this
  
  // Social features
  isPublic: Boolean,
  sharedWith: [String],    // User IDs
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastCheckedAt: Date,     // For price/availability checks
  notifiedAt: Date         // Last notification sent
};

export const WishlistModel = {
  // Wishlist metadata
  userId: String,
  name: String,            // Custom wishlist name
  description: String,
  
  // Wishlist state
  items: [WishlistItemModel],
  totalItems: Number,
  totalValue: Number,
  
  // Organization
  categories: [String],    // Custom categories
  isDefault: Boolean,      // Default wishlist
  
  // Privacy settings
  isPublic: Boolean,
  shareToken: String,      // For public sharing
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastAccessedAt: Date
};

// Wishlist validation rules
export const WishlistValidation = {
  maxItemsPerWishlist: 200,
  maxWishlistsPerUser: 10,
  maxNotesLength: 500,
  maxTagsPerItem: 10,
  maxTagLength: 50
};

// Wishlist item status
export const WishlistItemStatus = {
  AVAILABLE: 'available',
  OUT_OF_STOCK: 'out_of_stock',
  PRICE_DROPPED: 'price_dropped',
  PRICE_INCREASED: 'price_increased',
  DISCONTINUED: 'discontinued',
  NEW_EDITION: 'new_edition'
};

// Wishlist events for real-time updates
export const WishlistEvents = {
  ITEM_ADDED: 'wishlist:item_added',
  ITEM_UPDATED: 'wishlist:item_updated',
  ITEM_REMOVED: 'wishlist:item_removed',
  PRICE_CHANGED: 'wishlist:price_changed',
  BACK_IN_STOCK: 'wishlist:back_in_stock',
  WISHLIST_SHARED: 'wishlist:shared'
};

// Notification types for wishlist
export const WishlistNotificationTypes = {
  PRICE_DROP: 'price_drop',
  BACK_IN_STOCK: 'back_in_stock',
  TARGET_PRICE_REACHED: 'target_price_reached',
  NEW_EDITION_AVAILABLE: 'new_edition_available',
  AUTHOR_NEW_BOOK: 'author_new_book',
  SIMILAR_BOOK_AVAILABLE: 'similar_book_available'
};

export default {
  WishlistItemModel,
  WishlistModel,
  WishlistValidation,
  WishlistItemStatus,
  WishlistEvents,
  WishlistNotificationTypes
};