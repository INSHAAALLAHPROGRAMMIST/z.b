# Firebase Setup Guide

## 1. Firebase Project yaratish

1. https://console.firebase.google.com ga kiring
2. "Create a project" tugmasini bosing
3. Project nomi: `zamon-books` (yoki boshqa nom)
4. Google Analytics: Enable qiling (SEO uchun foydali)
5. Project yaratilishini kuting

## 2. Firestore Database yaratish

1. Firebase console'da "Firestore Database" ga kiring
2. "Create database" tugmasini bosing
3. **Production mode** tanlang (security rules bilan)
4. Location: `europe-west` (yaqinroq server)

## 3. Authentication sozlash

1. "Authentication" bo'limiga kiring
2. "Get started" tugmasini bosing
3. "Sign-in method" tab'ida:
   - Email/Password: Enable
   - Google: Enable (ixtiyoriy)

## 4. Web App qo'shish

1. Project overview'da "Web" ikonasini bosing
2. App nickname: `zamon-books-web`
3. Firebase Hosting: Enable qiling
4. Config ma'lumotlarini saqlang (keyingi qadamda kerak)

## 5. Security Rules (boshlang'ich)

Firestore Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Kitoblar - hamma o'qiy oladi
    match /books/{bookId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Foydalanuvchi ma'lumotlari - faqat o'zi
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Buyurtmalar - faqat o'zi
    match /orders/{orderId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Savat - faqat o'zi
    match /cart/{cartId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

## Keyingi qadam: Config faylini loyihaga qo'shish