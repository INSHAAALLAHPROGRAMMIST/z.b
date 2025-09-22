# Firebase Database Integration Design

## Overview

Bu design document Zamon Books loyihasida Firebase Firestore database'ni to'liq integratsiya qilish uchun yaratilgan. Loyihada hozirda Appwrite API'lari ishlatilmoqda, lekin Firebase konfiguratsiyasi mavjud. Maqsad - barcha database operatsiyalarini Firebase Firestore'ga o'tkazish va performance, scalability va maintainability'ni ta'minlash.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │────│  Firebase SDK    │────│  Firebase Cloud │
│   (Frontend)    │    │  (Client-side)   │    │   (Backend)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐            ┌─────▼─────┐         ┌──────▼──────┐
    │ UI      │            │ Firebase  │         │ Firestore   │
    │ Layer   │            │ Auth      │         │ Database    │
    └─────────┘            └───────────┘         └─────────────┘
```

### Database Schema Design

#### 1. Books Collection (`books`)
```javascript
{
  id: string,                    // Auto-generated document ID
  title: string,                 // Kitob nomi
  description: string,           // Kitob tavsifi
  authorName: string,            // Muallif nomi (denormalized)
  authorId: string,              // Muallif ID (reference)
  genreId: string,               // Janr ID (reference)
  imageUrl: string,              // Rasm URL (Cloudinary)
  price: number,                 // Narx (so'm)
  publishedYear: number,         // Nashr yili
  isbn: string,                  // ISBN raqami
  pageCount: number,             // Sahifalar soni
  language: string,              // Til (uz, ru, en)
  
  // Inventory Management
  stock: number,                 // Mavjud miqdor
  stockStatus: string,           // 'available', 'low_stock', 'out_of_stock', 'pre_order'
  minStockLevel: number,         // Minimum stock darajasi
  maxStockLevel: number,         // Maximum stock darajasi
  
  // Business Logic
  isAvailable: boolean,          // Sotuvda bormi
  isFeatured: boolean,           // Tavsiya etiladigan kitobmi
  isNewArrival: boolean,         // Yangi kelgan kitobmi
  allowPreOrder: boolean,        // Pre-order ruxsat berilganmi
  enableWaitlist: boolean,       // Waitlist yoqilganmi
  
  // Analytics
  viewCount: number,             // Ko'rilgan miqdor
  salesCount: number,            // Sotilgan miqdor
  demandScore: number,           // Talab darajasi (0-100)
  rating: number,                // Reyting (0-5)
  reviewCount: number,           // Sharhlar soni
  
  // Admin
  adminPriority: number,         // Admin prioriteti (0-10)
  visibility: string,            // 'visible', 'hidden', 'draft'
  
  // SEO
  slug: string,                  // URL slug (SEO uchun)
  metaTitle: string,             // Meta title
  metaDescription: string,       // Meta description
  
  // Timestamps
  createdAt: timestamp,          // Yaratilgan vaqt
  updatedAt: timestamp,          // Yangilangan vaqt
  publishedAt: timestamp         // Nashr qilingan vaqt
}
```

#### 2. Users Collection (`users`)
```javascript
{
  uid: string,                   // Firebase Auth UID
  email: string,                 // Email
  displayName: string,           // Ko'rsatiladigan ism
  fullName: string,              // To'liq ism
  phone: string,                 // Telefon raqami
  address: string,               // Manzil
  telegramUsername: string,      // Telegram username
  
  // User Role & Permissions
  role: string,                  // 'user', 'admin', 'editor', 'moderator'
  isAdmin: boolean,              // Admin huquqi
  isActive: boolean,             // Faol foydalanuvchi
  isVerified: boolean,           // Tasdiqlangan email
  
  // Preferences
  preferredLanguage: string,     // Tanlangan til
  theme: string,                 // 'dark', 'light'
  notifications: {
    email: boolean,              // Email xabarlari
    sms: boolean,                // SMS xabarlari
    telegram: boolean            // Telegram xabarlari
  },
  
  // Analytics
  lastLoginAt: timestamp,        // Oxirgi kirish vaqti
  loginCount: number,            // Kirish miqdori
  totalOrders: number,           // Jami buyurtmalar
  totalSpent: number,            // Jami sarflangan pul
  
  // Timestamps
  createdAt: timestamp,          // Ro'yxatdan o'tgan vaqt
  updatedAt: timestamp           // Yangilangan vaqt
}
```

#### 3. Orders Collection (`orders`)
```javascript
{
  id: string,                    // Auto-generated document ID
  orderNumber: string,           // Buyurtma raqami (ORD-2025-001)
  userId: string,                // Foydalanuvchi ID
  
  // Order Items
  items: [
    {
      bookId: string,            // Kitob ID
      bookTitle: string,         // Kitob nomi (denormalized)
      bookImage: string,         // Kitob rasmi (denormalized)
      quantity: number,          // Miqdor
      unitPrice: number,         // Birlik narxi
      totalPrice: number         // Jami narx
    }
  ],
  
  // Order Summary
  subtotal: number,              // Oraliq jami
  shippingCost: number,          // Yetkazib berish narxi
  discount: number,              // Chegirma
  totalAmount: number,           // Jami summa
  
  // Customer Info
  customerName: string,          // Mijoz ismi
  customerEmail: string,         // Mijoz emaili
  customerPhone: string,         // Mijoz telefoni
  shippingAddress: string,       // Yetkazib berish manzili
  telegramUsername: string,      // Telegram username
  
  // Order Status
  status: string,                // 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
  paymentStatus: string,         // 'pending', 'paid', 'failed', 'refunded'
  paymentMethod: string,         // 'cash', 'card', 'click', 'payme'
  
  // Tracking
  trackingNumber: string,        // Kuzatuv raqami
  estimatedDelivery: timestamp,  // Taxminiy yetkazib berish vaqti
  deliveredAt: timestamp,        // Yetkazib berilgan vaqt
  
  // Notes
  customerNotes: string,         // Mijoz izohlari
  adminNotes: string,            // Admin izohlari
  
  // Timestamps
  createdAt: timestamp,          // Yaratilgan vaqt
  updatedAt: timestamp,          // Yangilangan vaqt
  confirmedAt: timestamp,        // Tasdiqlangan vaqt
  shippedAt: timestamp          // Yuborilgan vaqt
}
```

#### 4. Cart Collection (`cart`)
```javascript
{
  id: string,                    // Auto-generated document ID
  userId: string,                // Foydalanuvchi ID (guest uchun ham)
  bookId: string,                // Kitob ID
  quantity: number,              // Miqdor
  priceAtTimeOfAdd: number,      // Qo'shilgan paytdagi narx
  
  // Timestamps
  createdAt: timestamp,          // Qo'shilgan vaqt
  updatedAt: timestamp           // Yangilangan vaqt
}
```

#### 5. Wishlist Collection (`wishlist`)
```javascript
{
  id: string,                    // Auto-generated document ID
  userId: string,                // Foydalanuvchi ID
  bookId: string,                // Kitob ID
  
  // Timestamps
  createdAt: timestamp           // Qo'shilgan vaqt
}
```

#### 6. Genres Collection (`genres`)
```javascript
{
  id: string,                    // Auto-generated document ID
  name: string,                  // Janr nomi
  description: string,           // Janr tavsifi
  imageUrl: string,              // Janr rasmi
  slug: string,                  // URL slug
  
  // Analytics
  bookCount: number,             // Ushbu janrdagi kitoblar soni
  popularityScore: number,       // Mashhurlik darajasi
  
  // Admin
  isActive: boolean,             // Faol janr
  sortOrder: number,             // Tartiblash
  
  // Timestamps
  createdAt: timestamp,          // Yaratilgan vaqt
  updatedAt: timestamp           // Yangilangan vaqt
}
```

#### 7. Authors Collection (`authors`)
```javascript
{
  id: string,                    // Auto-generated document ID
  name: string,                  // Muallif ismi
  biography: string,             // Tarjimai hol
  birthYear: number,             // Tug'ilgan yil
  deathYear: number,             // Vafot yili (agar vafot etgan bo'lsa)
  nationality: string,           // Millati
  imageUrl: string,              // Muallif rasmi
  slug: string,                  // URL slug
  
  // Social Links
  website: string,               // Veb-sayt
  socialLinks: {
    facebook: string,
    twitter: string,
    instagram: string
  },
  
  // Analytics
  bookCount: number,             // Kitoblar soni
  totalSales: number,            // Jami sotuvlar
  popularityScore: number,       // Mashhurlik darajasi
  
  // Admin
  isActive: boolean,             // Faol muallif
  isFeatured: boolean,           // Tavsiya etiladigan muallif
  
  // Timestamps
  createdAt: timestamp,          // Yaratilgan vaqt
  updatedAt: timestamp           // Yangilangan vaqt
}
```

#### 8. Waitlist Collection (`waitlist`)
```javascript
{
  id: string,                    // Auto-generated document ID
  bookId: string,                // Kitob ID
  userId: string,                // Foydalanuvchi ID
  bookTitle: string,             // Kitob nomi (denormalized)
  userEmail: string,             // Foydalanuvchi emaili (denormalized)
  
  // Status
  status: string,                // 'waiting', 'notified', 'fulfilled', 'cancelled'
  notificationSent: boolean,     // Xabar yuborilganmi
  notifiedAt: timestamp,         // Xabar yuborilgan vaqt
  
  // Timestamps
  createdAt: timestamp,          // Qo'shilgan vaqt
  updatedAt: timestamp           // Yangilangan vaqt
}
```

#### 9. Preorders Collection (`preorders`)
```javascript
{
  id: string,                    // Auto-generated document ID
  bookId: string,                // Kitob ID
  userId: string,                // Foydalanuvchi ID
  bookTitle: string,             // Kitob nomi (denormalized)
  bookPrice: number,             // Kitob narxi
  quantity: number,              // Miqdor
  
  // Customer Info
  customerName: string,          // Mijoz ismi
  customerEmail: string,         // Mijoz emaili
  customerPhone: string,         // Mijoz telefoni
  
  // Status
  status: string,                // 'pending', 'confirmed', 'fulfilled', 'cancelled'
  estimatedAvailability: string, // Taxminiy mavjud bo'lish vaqti
  fulfilledAt: timestamp,        // Bajarilgan vaqt
  
  // Timestamps
  createdAt: timestamp,          // Yaratilgan vaqt
  updatedAt: timestamp           // Yangilangan vaqt
}
```

## Components and Interfaces

### 1. Firebase Service Layer

#### FirebaseService Class
```javascript
class FirebaseService {
  // Books operations
  async getBooks(limit = 50, orderBy = 'createdAt')
  async getBookById(bookId)
  async getBookBySlug(slug)
  async createBook(bookData)
  async updateBook(bookId, updates)
  async deleteBook(bookId)
  async searchBooks(query, filters = {})
  
  // Users operations
  async createUser(userData)
  async getUserById(userId)
  async updateUser(userId, updates)
  async getUserOrders(userId)
  
  // Cart operations
  async getCartItems(userId)
  async addToCart(userId, bookId, quantity)
  async updateCartItem(cartItemId, quantity)
  async removeFromCart(cartItemId)
  async clearCart(userId)
  
  // Orders operations
  async createOrder(orderData)
  async getOrders(filters = {})
  async updateOrderStatus(orderId, status)
  async getOrderById(orderId)
  
  // Wishlist operations
  async addToWishlist(userId, bookId)
  async removeFromWishlist(userId, bookId)
  async getWishlist(userId)
  
  // Real-time subscriptions
  subscribeToBooks(callback)
  subscribeToCart(userId, callback)
  subscribeToOrders(callback)
}
```

### 2. React Hooks for Firebase

#### useFirebaseBooks Hook
```javascript
const useFirebaseBooks = (options = {}) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Real-time subscription
  // Filtering and sorting
  // Pagination
  
  return { books, loading, error, refetch };
}
```

#### useFirebaseCart Hook
```javascript
const useFirebaseCart = (userId) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const addToCart = async (bookId, quantity) => { /* ... */ };
  const updateQuantity = async (cartItemId, quantity) => { /* ... */ };
  const removeItem = async (cartItemId) => { /* ... */ };
  const clearCart = async () => { /* ... */ };
  
  return { 
    cartItems, 
    loading, 
    error, 
    addToCart, 
    updateQuantity, 
    removeItem, 
    clearCart 
  };
}
```

### 3. Component Updates

#### HomePage Component
- Firebase'dan kitoblarni yuklash
- Real-time yangilanishlar
- Optimistic updates
- Error handling

#### BookDetailPage Component
- Firebase'dan kitob ma'lumotlarini yuklash
- Related books
- Reviews integration

#### CartPage Component
- Firebase cart operations
- Real-time cart updates
- Checkout process

#### AdminPanel Components
- Firebase CRUD operations
- Real-time admin dashboard
- Bulk operations

## Data Models

### Book Model
```javascript
class Book {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.authorName = data.authorName;
    this.price = data.price;
    // ... other fields
  }
  
  // Validation methods
  validate() { /* ... */ }
  
  // Business logic methods
  isAvailable() { return this.stock > 0 && this.isAvailable; }
  canPreOrder() { return this.allowPreOrder && !this.isAvailable(); }
  getStockStatus() { /* ... */ }
  
  // Formatting methods
  getFormattedPrice() { return `${this.price.toLocaleString()} so'm`; }
  getSlugUrl() { return `/kitob/${this.slug}`; }
}
```

### Order Model
```javascript
class Order {
  constructor(data) {
    this.id = data.id;
    this.orderNumber = data.orderNumber;
    this.items = data.items;
    this.totalAmount = data.totalAmount;
    // ... other fields
  }
  
  // Business logic methods
  calculateTotal() { /* ... */ }
  canCancel() { return this.status === 'pending'; }
  canRefund() { return this.status === 'delivered'; }
  
  // Status methods
  isCompleted() { return this.status === 'delivered'; }
  isPending() { return this.status === 'pending'; }
}
```

## Error Handling

### Error Types
```javascript
class FirebaseError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Specific error types
class NetworkError extends FirebaseError { /* ... */ }
class PermissionError extends FirebaseError { /* ... */ }
class ValidationError extends FirebaseError { /* ... */ }
```

### Error Handling Strategy
1. **Network Errors**: Retry mechanism with exponential backoff
2. **Permission Errors**: Redirect to login or show appropriate message
3. **Validation Errors**: Show user-friendly validation messages
4. **Unknown Errors**: Log to console and show generic error message

### Offline Support
- Cache frequently accessed data
- Queue write operations when offline
- Sync when connection restored
- Show offline indicator

## Testing Strategy

### Unit Tests
- Firebase service methods
- React hooks
- Data models
- Utility functions

### Integration Tests
- Firebase operations
- Component interactions
- User workflows

### E2E Tests
- Complete user journeys
- Admin workflows
- Error scenarios

### Performance Tests
- Database query performance
- Real-time updates
- Large dataset handling

## Security Considerations

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Books - read for all, write for admins only
    match /books/{bookId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Users - read/write own data only
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if isAdmin();
    }
    
    // Cart - read/write own cart only
    match /cart/{cartId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Orders - read own orders, admins can read all
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if request.auth != null;
      allow update: if isAdmin();
    }
    
    // Helper functions
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

### Data Validation
- Client-side validation for UX
- Server-side validation in security rules
- Input sanitization
- XSS protection

## Performance Optimization

### Database Optimization
- Proper indexing for queries
- Denormalization where appropriate
- Pagination for large datasets
- Caching strategies

### Real-time Updates
- Selective subscriptions
- Unsubscribe on component unmount
- Debounced updates
- Optimistic UI updates

### Bundle Optimization
- Lazy load Firebase modules
- Tree shaking unused Firebase features
- Code splitting for admin features

## Migration Strategy

### Phase 1: Setup Firebase Infrastructure
1. Create Firestore collections
2. Set up security rules
3. Create sample data
4. Test Firebase connection

### Phase 2: Migrate Core Features
1. Books display and search
2. User authentication
3. Basic cart functionality
4. Order creation

### Phase 3: Advanced Features
1. Real-time updates
2. Admin panel integration
3. Inventory management
4. Analytics and reporting

### Phase 4: Optimization and Testing
1. Performance optimization
2. Error handling improvement
3. Comprehensive testing
4. Production deployment

## Monitoring and Analytics

### Firebase Analytics
- User engagement tracking
- Performance monitoring
- Error tracking
- Custom events

### Business Metrics
- Book views and sales
- User behavior analysis
- Cart abandonment rates
- Order completion rates