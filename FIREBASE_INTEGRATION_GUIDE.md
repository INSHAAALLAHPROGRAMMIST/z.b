# 🔥 Firebase Integration Guide - Zamon Books

## 📋 Overview

Bu qo'llanma Zamon Books loyihasida Firebase Firestore database'ni to'liq integratsiya qilish jarayonini tushuntiradi. Loyiha endi Firebase bilan to'liq ishlaydi va barcha database operatsiyalari Firebase Firestore orqali amalga oshiriladi.

## 🚀 Quick Start

### 1. Firebase Project Setup

1. **Firebase Console'ga kiring**: https://console.firebase.google.com
2. **Yangi loyiha yarating** yoki mavjud loyihani tanlang
3. **Web app qo'shing** va konfiguratsiya ma'lumotlarini oling

### 2. Environment Variables

`.env` faylini yarating va Firebase konfiguratsiyasini qo'shing:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

### 3. Firebase Services Setup

```bash
# Firebase Authentication va Firestore'ni yoqing
# Firebase Console > Authentication > Sign-in method > Email/Password > Enable
# Firebase Console > Firestore Database > Create database > Production mode
```

### 4. Deploy Security Rules va Indexes

```bash
# Security rules va indexes'ni deploy qiling
npm run firebase:deploy

# Yoki alohida-alohida:
npm run firebase:deploy:rules
npm run firebase:deploy:indexes
```

### 5. Sample Data Qo'shish

```bash
# Firebase'ga sample data qo'shish
npm run firebase:setup

# Yoki:
npm run firebase:seed
```

## 📊 Database Schema

### Collections Structure

```
firestore/
├── books/              # Kitoblar ma'lumotlari
├── users/              # Foydalanuvchilar
├── orders/             # Buyurtmalar
├── cart/               # Savatcha
├── wishlist/           # Sevimlilar
├── genres/             # Janrlar
├── authors/            # Mualliflar
├── waitlist/           # Navbat tizimi
└── preorders/          # Oldindan buyurtmalar
```

### Books Collection

```javascript
{
  id: "auto-generated",
  title: "Kitob nomi",
  description: "Kitob tavsifi",
  authorName: "Muallif ismi",
  authorId: "author_document_id",
  genreId: "genre_document_id",
  price: 25000,
  publishedYear: 2023,
  isbn: "978-9943-01-001-1",
  pageCount: 320,
  language: "uz",
  imageUrl: "cloudinary_url",
  
  // Inventory
  stock: 50,
  stockStatus: "available", // available, low_stock, out_of_stock, pre_order
  minStockLevel: 5,
  maxStockLevel: 100,
  
  // Business Logic
  isAvailable: true,
  isFeatured: true,
  isNewArrival: false,
  allowPreOrder: true,
  enableWaitlist: true,
  
  // Analytics
  viewCount: 1250,
  salesCount: 120,
  demandScore: 95,
  rating: 4.8,
  reviewCount: 45,
  
  // Admin
  adminPriority: 10,
  visibility: "visible", // visible, hidden, draft
  
  // SEO
  slug: "kitob-nomi-muallif-ismi",
  metaTitle: "SEO title",
  metaDescription: "SEO description",
  
  // Timestamps
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  publishedAt: serverTimestamp()
}
```

## 🛠️ API Usage

### FirebaseService

```javascript
import firebaseService from '../services/FirebaseService';

// Books operations
const books = await firebaseService.getBooks({
  limitCount: 50,
  orderByField: 'createdAt',
  orderDirection: 'desc',
  filters: { isAvailable: true }
});

const book = await firebaseService.getBookById('book_id');
const bookBySlug = await firebaseService.getBookBySlug('book-slug');

// Cart operations
const cartItems = await firebaseService.getCartItems('user_id');
await firebaseService.addToCart('user_id', 'book_id', 1);
await firebaseService.updateCartItem('cart_item_id', 2);

// Orders
const order = await firebaseService.createOrder(orderData);
const orders = await firebaseService.getOrders({ userId: 'user_id' });
```

### React Hooks

```javascript
import useFirebaseBooks from '../hooks/useFirebaseBooks';
import useFirebaseCart from '../hooks/useFirebaseCart';
import useFirebaseAuth from '../hooks/useFirebaseAuth';

// Books hook
const { books, loading, error, hasMore, loadMore, refresh } = useFirebaseBooks({
  limitCount: 50,
  filters: { isAvailable: true },
  realTime: true
});

// Cart hook
const { 
  cartItems, 
  cartCount, 
  cartTotal, 
  addToCart, 
  updateQuantity, 
  removeItem, 
  clearCart 
} = useFirebaseCart();

// Auth hook
const { 
  user, 
  userProfile, 
  isAdmin, 
  signIn, 
  signUp, 
  signOut, 
  updateProfile 
} = useFirebaseAuth();
```

## 🔒 Security Rules

Firebase Security Rules loyihada avtomatik o'rnatiladi:

```javascript
// Books - hamma o'qiy oladi, faqat admin yoza oladi
match /books/{bookId} {
  allow read: if true;
  allow write: if isAdmin();
}

// Users - faqat o'z ma'lumotlarini o'qiy/yoza oladi
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
  allow read: if isAdmin();
}

// Cart - faqat o'z savatini boshqara oladi
match /cart/{cartId} {
  allow read, write: if request.auth.uid == resource.data.userId;
}
```

## 📈 Performance Optimization

### Indexes

Firestore indexes avtomatik konfiguratsiya qilinadi:

```json
{
  "indexes": [
    {
      "collectionGroup": "books",
      "fields": [
        { "fieldPath": "isAvailable", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Caching Strategy

- **Real-time subscriptions** muhim ma'lumotlar uchun
- **Offline persistence** Firebase SDK tomonidan
- **Local state caching** React hooks'da

## 🔄 Real-time Features

```javascript
// Real-time books subscription
const unsubscribe = firebaseService.subscribeToBooks((books) => {
  setBooks(books.documents);
});

// Real-time cart subscription
const unsubscribe = firebaseService.subscribeToCart(userId, (cartItems) => {
  setCartItems(cartItems.documents);
});

// Cleanup
useEffect(() => {
  return () => {
    if (unsubscribe) unsubscribe();
  };
}, []);
```

## 🚨 Error Handling

```javascript
import { handleFirebaseError } from '../utils/firebaseHelpers';

try {
  const result = await firebaseService.getBooks();
} catch (error) {
  const userFriendlyMessage = handleFirebaseError(error);
  console.error('Error:', userFriendlyMessage);
}
```

## 🧪 Testing

### Development Testing

```bash
# Firebase emulators ishga tushirish
npm run firebase:emulators

# Test data qo'shish
npm run firebase:setup
```

### Production Testing

```bash
# Production build
npm run build:production

# Production deploy
npm run deploy:production
```

## 📱 Mobile Support

Firebase SDK mobil qurilmalarda ham to'liq ishlaydi:

- **Offline support** - ma'lumotlar cache'lanadi
- **Real-time sync** - internet qayta ulanganida
- **Progressive loading** - tez yuklash uchun

## 🔧 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```
   Sabab: Security rules yoki authentication muammosi
   Yechim: Rules'ni tekshiring, user login qilganligini tasdiqlang
   ```

2. **Network Error**
   ```
   Sabab: Internet aloqasi yoki Firebase service muammosi
   Yechim: Retry mechanism ishlatiladi, offline support mavjud
   ```

3. **Quota Exceeded**
   ```
   Sabab: Firebase free plan limiti
   Yechim: Blaze plan'ga o'ting yoki usage'ni kamaytiring
   ```

### Debug Mode

```javascript
// Development mode'da debug ma'lumotlari
if (import.meta.env.DEV) {
  console.log('Firebase operation:', result);
}
```

## 📊 Monitoring

### Firebase Console

- **Authentication** - foydalanuvchilar statistikasi
- **Firestore** - database usage va performance
- **Performance** - app performance monitoring

### Custom Analytics

```javascript
// Custom events tracking
firebaseService.incrementBookViews(bookId);
```

## 🚀 Deployment

### Netlify Deployment

```bash
# Build va deploy
npm run build
npm run deploy:safe
```

### Environment Variables (Production)

Netlify Dashboard'da quyidagi environment variables'ni o'rnating:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mon)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)

## 🎯 Next Steps

1. **Advanced Search** - Algolia yoki Elasticsearch integratsiyasi
2. **Push Notifications** - Firebase Cloud Messaging
3. **Analytics** - Firebase Analytics va Google Analytics
4. **A/B Testing** - Firebase Remote Config
5. **Machine Learning** - Firebase ML Kit

---

**🔥 Firebase integration muvaffaqiyatli yakunlandi!**

Loyiha endi to'liq Firebase bilan ishlaydi va production-ready holatda.