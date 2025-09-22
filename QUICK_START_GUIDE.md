# ⚡ ZAMON BOOKS - QUICK START GUIDE

## 🚀 5 DAQIQADA ISHGA TUSHIRISH

### 1️⃣ FIREBASE SETUP (2 daqiqa)
```bash
# 1. Firebase Console'ga kiring
https://console.firebase.google.com

# 2. Yangi loyiha yarating
Project name: zamon-books-production

# 3. Authentication yoqing
Authentication > Email/Password > Enable

# 4. Firestore yarating  
Firestore > Create database > Production mode

# 5. Web app qo'shing
Project Overview > Add app > Web
```

### 2️⃣ ENVIRONMENT SETUP (1 daqiqa)
```bash
# .env fayl yarating
cp .env.example .env

# Firebase config'ni .env'ga qo'shing
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... boshqa variables
```

### 3️⃣ LOYIHANI ISHGA TUSHIRISH (1 daqiqa)
```bash
# Dependencies o'rnatish
npm install

# Development server
npm run dev

# Browser'da ochish
http://localhost:5173
```

### 4️⃣ ADMIN USER YARATISH (1 daqiqa)
```bash
# 1. Saytda ro'yxatdan o'ting
/auth > Register

# 2. Firebase Console'da admin qiling
Firestore > users > your_user > Edit
isAdmin: true
role: "admin"

# 3. Admin panel'ga kiring
/admin-dashboard
```

### 5️⃣ PRODUCTION DEPLOY (30 soniya)
```bash
# Build va deploy
npm run build
npm run deploy:safe

# Yoki Netlify'ga ulang
# GitHub > Netlify > Auto deploy
```

## ✅ TEKSHIRISH CHECKLIST

- [ ] Sayt ochilayapti
- [ ] Login/Register ishlayapti  
- [ ] Admin panel ochilayapti
- [ ] Kitoblar ko'rinayapti
- [ ] Console'da xato yo'q

## 🆘 TEZKOR YORDAM

### Keng Uchraydigan Muammolar

**❌ Firebase connection error**
```bash
# .env faylni tekshiring
# API key'lar to'g'ri ekanligini tasdiqlang
```

**❌ Admin panel ochilmayapti**
```bash
# Firestore'da isAdmin: true ekanligini tekshiring
# Browser cache'ni tozalang
```

**❌ Build error**
```bash
# Dependencies'ni qayta o'rnating
rm -rf node_modules package-lock.json
npm install
```

### Yordam Olish
- 📖 **To'liq qo'llanma**: `PRODUCTION_FIREBASE_SETUP.md`
- 🐛 **Issues**: GitHub Issues
- 💬 **Telegram**: @your_admin_username

---

**🎉 Tabriklaymiz! Loyihangiz tayyor!**