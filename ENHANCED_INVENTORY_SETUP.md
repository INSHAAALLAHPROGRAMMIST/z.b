# 🚀 Enhanced Inventory Management Setup - Zamon Books

Bu guide Zamon Books loyihasida Enhanced Inventory Management tizimini sozlash uchun.

## 📋 Yangi Funksiyalar

- **6 ta Stock Status:** in_stock, low_stock, out_of_stock, discontinued, pre_order, coming_soon
- **Pre-order System:** Kelishi kutilayotgan kitoblar uchun
- **Waitlist System:** Tugagan kitoblar uchun navbat
- **Visibility Control:** visible, hidden, admin_only
- **Admin Priority:** 0-100 darajali tartib
- **Book Status Manager:** Har kitob uchun to'liq boshqaruv

## 🗄️ Database Setup (Qo'lda)

### 1. Firebase Console'da Collection'lar Yaratish

#### A. Waitlist Collection
```
Collection Name: waitlist
Collection ID: waitlist

Attributes:
- bookId: String (255, required)
- userId: String (255, required) 
- bookTitle: String (500, required)
- status: String (50, required, default: "waiting")
- createdAt: DateTime (required)
- notificationSent: Boolean (required, default: false)
- notifiedAt: DateTime (optional)

Permissions:
- Read: users, guests
- Create: users, guests
- Update: users (own), admins
- Delete: users (own), admins
```

#### B. PreOrder Collection
```
Collection Name: preorder
Collection ID: preorder

Attributes:
- bookId: String (255, required)
- userId: String (255, required)
- bookTitle: String (500, required)
- bookPrice: Float (required)
- status: String (50, required, default: "pending")
- createdAt: DateTime (required)
- estimatedDelivery: String (255, optional)
- fulfilledAt: DateTime (optional)

Permissions:
- Read: users, guests
- Create: users, guests
- Update: users (own), admins
- Delete: users (own), admins
```

### 2. Environment Variables

`.env` fayliga qo'shing:
```env
# Enhanced Inventory Collections
VITE_FIREBASE_COLLECTION_WAITLIST=waitlist
VITE_FIREBASE_COLLECTION_PREORDER=preorder
VITE_ENHANCED_INVENTORY_ENABLED=true
```

### 3. Books Collection'ga Yangi Fieldlar

Firebase Console → Firestore → Books Collection:
```
// Pre-order & Waitlist
allowPreOrder: Boolean (default: true)
enableWaitlist: Boolean (default: true) 
preOrderCount: Integer (default: 0)
waitlistCount: Integer (default: 0)
expectedRestockDate: DateTime (optional)

// Visibility & Admin
visibility: String (default: "visible")
showWhenDiscontinued: Boolean (default: false)
adminPriority: Integer (default: 0)

// Analytics
demandScore: Integer (default: 0)
```

## 🚀 Migration

### 1. Loyihani Qayta Ishga Tushiring
```bash
npm run dev
```

### 2. Enhanced Migration'ni Bajaring
```
1. Admin panelga kiring: /admin/enhanced-migration
2. Collection status'ni tekshiring (✅ Configured bo'lishi kerak)
3. "Enhanced Migration'ni Boshlash" tugmasini bosing
4. Progress'ni kuzatib turing
5. Yakunlanishini kutting
```

## 🎯 Qanday Ishlatish

### Admin Tomonidan:

#### Book Status Boshqaruvi
```
Admin → Inventory Management → ⚙️ tugmasi → Status o'zgartirish
```

#### Visibility Control
```
BookStatusManager → Advanced Controls → Visibility
```

#### Admin Priority
```
BookStatusManager → Advanced Controls → Admin Priority (0-100)
```

### User Tomonidan:

#### Pre-order
```
Kitob sahifasida → Stock status: pre_order/coming_soon → "Oldindan buyurtma berish"
```

#### Waitlist
```
Kitob sahifasida → Stock status: out_of_stock → "Navbatga qo'shilish"
```

## 🔍 Troubleshooting

### Collection'lar ko'rinmayapti
```
1. Firebase Console'da collection'lar yaratilganligini tekshiring
2. Collection ID'lar to'g'ri ekanligini tekshiring
3. Environment variables to'g'ri sozlanganligini tekshiring
4. Firebase security rules'ni tekshiring
5. Loyihani qayta ishga tushiring
```

### Migration ishlamayapti
```
1. Collection status "✅ Configured" ekanligini tekshiring
2. Browser console'da xato xabarlarini ko'ring
3. Database permissions'ni tekshiring
```

### Pre-order/Waitlist ko'rinmayapti
```
1. Migration muvaffaqiyatli yakunlanganligini tekshiring
2. Book status to'g'ri o'rnatilganligini tekshiring
3. Collection'larda attributes to'liq ekanligini tekshiring
```

## 🎉 Yakuniy Natija

Migration'dan keyin sizda quyidagi funksiyalar bo'ladi:

1. **📦 Advanced Inventory Management**
2. **🔔 Pre-order System**
3. **📋 Waitlist System**
4. **👁️ Visibility Control**
5. **👑 Admin Priority Sorting**
6. **📊 Enhanced Analytics**
7. **🚀 Professional Admin Panel**

**Barcha funksiyalar tayyor va ishlatishga tayyor!** 🎯