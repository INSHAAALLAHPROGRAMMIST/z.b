# 🚀 Zamon Books - Deployment Guide

## 📋 Deployment Qadamlari

### 1. Environment Variables Sozlash

`.env.production` faylida quyidagi ma'lumotlarni to'ldiring:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_production_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_production_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Enhanced Admin Dashboard
VITE_ADMIN_PANEL_ENABLED=true
VITE_MESSAGING_ENABLED=true
VITE_ANALYTICS_ENABLED=true
VITE_SECURITY_MONITORING_ENABLED=true

# Cloudinary Production Settings
VITE_CLOUDINARY_CLOUD_NAME=your_production_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_production_preset

# Telegram Bot Production
VITE_TELEGRAM_BOT_TOKEN=your_production_bot_token
VITE_TELEGRAM_CHAT_ID=your_production_chat_id

# Google Analytics
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX-X
```

### 2. Firebase Loyihasi Sozlash

```bash
# Firebase CLI o'rnatish (agar o'rnatilmagan bo'lsa)
npm install -g firebase-tools

# Firebase ga login qilish
firebase login

# Loyihani Firebase bilan bog'lash
firebase init

# Firestore rules va indexes deploy qilish
npm run firebase:deploy
```

### 3. Production Build Yaratish

```bash
# Production build yaratish
npm run build:production

# Build ni tekshirish
npm run preview
```

### 4. Firebase Hosting ga Deploy Qilish

```bash
# Firebase functions deploy (Enhanced Admin uchun)
firebase deploy --only functions

# Firestore rules deploy
firebase deploy --only firestore:rules

# Hosting deploy
firebase deploy --only hosting

# Barcha Firebase xizmatlarini deploy qilish
npm run deploy:full
```

### 5. Google Analytics Sozlash

1. `index.html` faylida `GA_MEASUREMENT_ID` ni o'z Analytics ID bilan almashtiring
2. Google Analytics Console da yangi property yarating
3. Tracking ID ni `.env.production` ga qo'shing

## 🔧 Deployment Scripts

| Script | Tavsif |
|--------|--------|
| `npm run build:production` | Production build yaratish |
| `npm run firebase:deploy` | Firestore rules va indexes deploy |
| `npm run firebase:deploy:hosting` | Faqat hosting deploy |
| `npm run firebase:deploy:all` | Barcha Firebase xizmatlar |
| `npm run deploy:production` | Build + hosting deploy |
| `npm run deploy:full` | Build + barcha Firebase xizmatlar |
| `npm run firebase:emulators` | Local development uchun emulators |

## 📊 Monitoring va Analytics

### Performance Monitoring
- Google Analytics orqali sahifa yuklash vaqti kuzatiladi
- Error Boundary orqali xatolar avtomatik qayd qilinadi
- Console da performance ma'lumotlari ko'rsatiladi

### Sales Analytics
- Admin panelda sotuv statistikalari
- Eng ko'p sotilgan kitoblar ro'yxati
- Jami daromad va sotuvlar soni

## 🛠️ Troubleshooting

### Build Xatolari
```bash
# Dependencies ni qayta o'rnatish
rm -rf node_modules package-lock.json
npm install

# Cache ni tozalash
npm run build -- --force
```

### Firebase Xatolari
```bash
# Firebase CLI ni yangilash
npm install -g firebase-tools@latest

# Loyihani qayta bog'lash
firebase use --add
```

### Environment Variables Xatolari
- `.env.production` faylida barcha kerakli o'zgaruvchilar mavjudligini tekshiring
- Vite faqat `VITE_` prefiksi bilan boshlanadigan o'zgaruvchilarni ko'radi

## 🌐 Production URL

Deploy qilingandan keyin loyiha quyidagi URL da mavjud bo'ladi:
`https://your-project-id.web.app`

## 📞 Yordam

Agar deployment jarayonida muammolar yuzaga kelsa:
1. Console loglarini tekshiring
2. Firebase Console da xatolarni ko'ring
3. Network tab da so'rovlarni tekshiring
4. Environment variables to'g'ri sozlanganligini tasdiqlang