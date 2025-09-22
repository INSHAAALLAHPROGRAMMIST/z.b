# 🔥 Firebase Setup Guide

Bu qo'llanma Zamon Books loyihasini Firebase bilan sozlash uchun.

## 📋 Talablar

- Node.js 18+ 
- Firebase account
- Firebase CLI (ixtiyoriy)

## 🚀 1. Firebase Console'da Loyiha Yaratish

1. [Firebase Console](https://console.firebase.google.com/) ga kiring
2. "Create a project" tugmasini bosing
3. Loyiha nomini kiriting (masalan: `zamon-books`)
4. Google Analytics'ni yoqing (tavsiya etiladi)
5. Loyihani yarating

## 🔧 2. Firebase Services'larni Yoqish

### Authentication
1. Firebase Console → Authentication
2. "Get started" tugmasini bosing
3. Sign-in method → Email/Password'ni yoqing
4. Advanced settings → User account linking → "One account per email address"

### Firestore Database
1. Firebase Console → Firestore Database
2. "Create database" tugmasini bosing
3. "Start in test mode" tanlang (keyinroq rules sozlanadi)
4. Location tanlang (europe-west yoki us-central)

### Storage (ixtiyoriy)
1. Firebase Console → Storage
2. "Get started" tugmasini bosing
3. Test mode'da boshlang

## 🔑 3. Firebase Config Olish

1. Firebase Console → Project Settings (⚙️ icon)
2. "Your apps" bo'limida "Web app" qo'shing
3. App nickname kiriting: `zamon-books-web`
4. Firebase Hosting'ni yoqmang (Netlify ishlatamiz)
5. Config object'ni nusxalang

## 📝 4. Environment Variables Sozlash

`.env` faylini yarating va Firebase config'ni qo'shing:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# Netlify Functions uchun Firebase Admin SDK
FIREBASE_CLIENT_EMAIL=your_service_account_email_here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Telegram Configuration
VITE_TELEGRAM_BOT_TOKEN=your_bot_token
VITE_TELEGRAM_CHAT_ID=your_chat_id
VITE_ADMIN_TELEGRAM=@your_admin_username

# Analytics
VITE_GA_MEASUREMENT_ID=your_ga_measurement_id
```

## 🔐 5. Firebase Admin SDK Sozlash (Netlify Functions uchun)

1. Firebase Console → Project Settings → Service accounts
2. "Generate new private key" tugmasini bosing
3. JSON faylni yuklab oling
4. JSON fayldan `client_email` va `private_key` ni oling
5. `.env` fayliga qo'shing

## 📚 6. Sample Data Qo'shish

Loyihani ishga tushirish uchun sample data qo'shing:

```bash
npm run firebase:setup
```

Bu script quyidagilarni yaratadi:
- Sample kitoblar
- Janrlar
- Mualliflar
- Admin user

## 👨‍💼 7. Admin User Yaratish

### Avtomatik (script orqali):
```bash
npm run firebase:admin create admin@zamonbooks.uz admin123456 "Admin User"
```

### Qo'lda:
1. Loyihani ishga tushiring: `npm run dev`
2. `/auth` sahifasiga o'ting
3. Ro'yxatdan o'ting
4. Firebase Console → Firestore → users collection
5. O'z user document'ingizni toping
6. `isAdmin: true` va `role: "admin"` qo'shing

## 🔒 8. Firestore Security Rules

Firestore Console → Rules bo'limida quyidagi rules'ni qo'shing:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Books collection
    match /books/{bookId} {
      allow read: if true; // Public read
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Orders collection
    match /orders/{orderId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }
    
    // Cart collection
    match /cart/{cartId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Wishlist collection
    match /wishlist/{wishlistId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Public collections
    match /genres/{genreId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /authors/{authorId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## 🚀 9. Loyihani Ishga Tushirish

```bash
# Dependencies o'rnatish
npm install

# Development server
npm run dev

# Netlify dev (functions bilan)
npm run dev:netlify

# Production build
npm run build
```

## 🔍 10. Tekshirish

1. Loyiha ishga tushganini tekshiring: `http://localhost:5173`
2. Admin panel'ga kiring: `/admin-login`
3. Sample data ko'rinishini tekshiring
4. Kitob qo'shish/tahrirlash funksiyalarini sinab ko'ring

## 🆘 Muammolar va Yechimlar

### Firebase connection error
- `.env` faylidagi config'ni tekshiring
- Firebase Console'da services yoqilganini tasdiqlang
- Internet aloqasini tekshiring

### Admin panel ishlamayapti
- User'da `isAdmin: true` borligini tekshiring
- Browser cache'ini tozalang
- Console'da error'larni ko'ring

### Firestore permission denied
- Security rules to'g'ri sozlanganini tekshiring
- User authentication holatini tekshiring

## 📞 Yordam

Muammolar bo'lsa:
1. Browser console'ni tekshiring
2. Firebase Console'da logs'ni ko'ring
3. GitHub Issues'da savol bering

---

✅ **Firebase setup yakunlangandan so'ng loyiha to'liq ishga tayyor bo'ladi!**