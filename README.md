<div align="center">

[![Zamonbooks](https://res.cloudinary.com/dcn4maral/image/upload/v1752326416/favicon_xgeaxu.svg)](https://www.zamonbooks.uz/)

# 📚 Zamon Books - Zamonaviy Kitoblar Do'koni
[![Zamonbooks](https://res.cloudinary.com/dcn4maral/image/upload/v1752326416/favicon_xgeaxu.svg)](https://www.zamonbooks.uz/)

[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0.6-green.svg)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.1.0-orange.svg)](https://firebase.google.com/)
[![AI Powered](https://img.shields.io/badge/AI%20Powered-Kiro%20Assistant-purple.svg)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

Modern va responsive kitoblar do'koni - React, Vite, Firebase va enhanced admin dashboard bilan qurilgan professional e-commerce platforma.

> 🤖 **AI-Powered Development**: Bu loyiha deyarli to'liq **Kiro AI Assistant** yordamida ishlab chiqilgan. Arxitekturadan tortib, UI/UX dizayn, enhanced admin dashboard, real-time messaging, kod yozish, optimizatsiya va hatto bu README gacha - barchasi AI texnologiyalari yordamida yaratilgan. Bu zamonaviy AI-driven development'ning namunasi hisoblanadi.

## 🌟 Asosiy Xususiyatlar

### 👤 Foydalanuvchi Paneli
- **🔍 Keng Qidiruv Tizimi** - Kitob nomi, muallif, janr bo'yicha qidirish
- **📱 Responsive Dizayn** - Barcha qurilmalarda mukammal ishlaydi
- **🛒 Savatcha Funksiyasi** - Real-time savat boshqaruvi
- **👤 Profil Boshqaruvi** - Shaxsiy ma'lumotlar va buyurtmalar tarixi
- **🌙 Dark/Light Mode** - Ikki xil tema qo'llab-quvvatlash
- **📦 Pre-order & Waitlist** - Oldindan buyurtma va navbat tizimi
- **🔔 Real-time Notifications** - Toast xabarlari va yangilanishlar

### 🔧 Enhanced Admin Paneli
- **� Realb-time Analytics Dashboard** - Live statistics va performance metrics
- **� Advlanced Order Management** - Comprehensive order tracking va customer communication
- **�  Customer Relationship Management (CRM)** - Complete customer profiles va communication history
- **� Advdanced Inventory Management** - Stock tracking, alerts, bulk operations va reporting
- **� Real-ttime Messaging System** - Customer support chat va admin messaging dashboard
- **� Seacurity & Access Control** - Role-based permissions, audit logs va security monitoring
- **📈 Sales Analytics & Reporting** - Detailed sales analysis, trends va export functionality
- **🛠️ System Monitoring** - Health checks, error logs va performance monitoring
- **🎯 SEO Tools** - Content management, bulk operations va SEO optimization
- **📞 Communication Center** - Telegram integration, notifications va message templates

### 🎨 Dizayn va UX
- **✨ Neo-Glassmorphism** - Zamonaviy UI/UX dizayn
- **🎭 Smooth Animations** - CSS3 va JavaScript animatsiyalar
- **📱 Mobile-First** - Progressive Web App (PWA) qo'llab-quvvatlash
- **♿ Accessibility** - WCAG 2.1 standartlariga mos
- **🚀 Performance Optimized** - Lazy loading va code splitting

## 🛠️ Texnologiyalar

### Frontend Stack
```
React 19.1.0          - Modern UI kutubxonasi
Vite 7.0.6            - Lightning-fast build tool
React Router 7.6.3    - Client-side routing
CSS3 + Modern APIs    - Flexbox, Grid, Custom Properties
```

### Backend & Services
```
Firebase 12.1.0       - Backend-as-a-Service
Firestore             - NoSQL Database
Firebase Auth         - Authentication
Firebase Functions    - Serverless backend functions
Cloudinary            - Image management & CDN
Real-time Database    - Live data synchronization
```

### Development Tools
```
ESLint 9.30.1         - Code linting
Netlify CLI 23.1.3    - Local development
Firebase Admin        - Server-side operations
Terser 5.43.1         - Code minification
```

## 🚀 Tezkor Boshlash

### 1. Repository'ni Clone Qiling
```bash
git clone https://github.com/your-username/zamon-books-frontend.git
cd zamon-books-frontend
```

### 2. Dependencies O'rnating
```bash
npm install
```

### 3. Environment Variables Sozlang
`.env` fayl yarating va quyidagi ma'lumotlarni kiriting:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin SDK
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----"

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Telegram Configuration
VITE_TELEGRAM_BOT_TOKEN=your_bot_token
VITE_TELEGRAM_CHAT_ID=your_chat_id
VITE_ADMIN_TELEGRAM=@your_admin_username

# Enhanced Admin Dashboard
VITE_ADMIN_PANEL_ENABLED=true
VITE_MESSAGING_ENABLED=true
VITE_ANALYTICS_ENABLED=true
VITE_SECURITY_MONITORING_ENABLED=true

# Analytics & Monitoring
VITE_GA_MEASUREMENT_ID=your_ga_measurement_id
VITE_SENTRY_DSN=your_sentry_dsn
```

### 4. Firebase Sozlash
```bash
# Firebase CLI login
firebase login

# Firebase project initialize
firebase init

# Sample data qo'shish
npm run firebase:setup

# Enhanced admin user yaratish
npm run firebase:admin create admin@zamonbooks.uz admin123456

# Security rules deploy
firebase deploy --only firestore:rules
```

### 5. Development Server Ishga Tushiring
```bash
# Development server
npm run dev

# Enhanced admin dashboard bilan
npm run dev:admin

# Firebase emulators bilan
npm run dev:emulators
```

Loyiha `http://localhost:5173` da ochiladi.
Enhanced Admin Dashboard: `http://localhost:5173/admin/enhanced`

## 📁 Loyiha Strukturasi

```
zamon-books/
├── public/                          # Static fayllar
├── src/
│   ├── components/                  # React komponentlar
│   │   ├── admin/                  # Standard admin components
│   │   │   └── enhanced/           # Enhanced admin dashboard
│   │   │       ├── Dashboard/      # Real-time dashboard
│   │   │       ├── OrderManagement/ # Advanced order management
│   │   │       ├── CRM/           # Customer relationship management
│   │   │       ├── Inventory/     # Advanced inventory management
│   │   │       ├── Analytics/     # Sales analytics & reporting
│   │   │       ├── Messaging/     # Real-time messaging system
│   │   │       ├── Security/      # Security & access control
│   │   │       ├── System/        # System monitoring
│   │   │       ├── SEO/           # SEO tools
│   │   │       ├── Communication/ # Communication center
│   │   │       └── Performance/   # Performance optimization
│   │   ├── chat/                  # Customer chat components
│   │   └── profile/               # User profile components
│   ├── services/                   # Business logic services
│   │   ├── AnalyticsService.js    # Analytics data processing
│   │   ├── MessagingService.js    # Real-time messaging
│   │   ├── AuthService.js         # Enhanced authentication
│   │   ├── InventoryService.js    # Inventory management
│   │   ├── AuditService.js        # Security audit logging
│   │   └── NotificationService.js # Multi-channel notifications
│   ├── contexts/                   # React contexts
│   ├── hooks/                      # Custom React hooks
│   ├── utils/                      # Utility funksiyalar
│   └── styles/                     # CSS fayllar
├── deployment/                     # Deployment configuration
│   ├── docker/                    # Docker setup
│   ├── scripts/                   # Deployment scripts
│   └── monitoring/                # Monitoring configuration
├── firebase-setup.js              # Firebase setup script
└── docs/                          # Documentation
```

## 🔧 Backend Sozlamalari

### 🔥 Firebase Setup
Batafsil qo'llanma: [FIREBASE_SETUP_GUIDE.md](./FIREBASE_SETUP_GUIDE.md)

1. **Firebase Console'da loyiha yarating**
2. **Authentication va Firestore'ni yoqing**
3. **Web app konfiguratsiyasini oling**
4. **Environment variables'ni sozlang**
5. **Sample data qo'shing**

### ☁️ Cloudinary Setup
1. [Cloudinary](https://cloudinary.com) da account yarating
2. Dashboard'dan `cloud_name` va `upload_preset` oling
3. `.env` fayliga qo'shing

### 📱 Telegram Bot Setup
1. [@BotFather](https://t.me/botfather) orqali bot yarating
2. Bot token'ni oling
3. Chat ID'ni aniqlang
4. `.env` fayliga qo'shing

## 🚀 Deployment

### Netlify'ga Deploy Qilish
1. GitHub'ga push qiling
2. [Netlify](https://netlify.com) da loyihani ulang
3. Environment variables'ni sozlang
4. Deploy qiling

### Environment Variables (Netlify)
Netlify Dashboard → Site Settings → Environment Variables:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
VITE_CLOUDINARY_CLOUD_NAME
VITE_TELEGRAM_BOT_TOKEN
```

## 📊 Performance

- **Lighthouse Score**: 95+ (Performance, Accessibility, SEO)
- **Bundle Size**: < 500KB (gzipped)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Code Splitting**: Route-based va component-based
- **Image Optimization**: Cloudinary auto-optimization

## 🔒 Xavfsizlik

- **Firebase Security Rules** - Database access control
- **Input Validation** - XSS va injection himoyasi
- **HTTPS Only** - SSL sertifikat majburiy
- **Environment Variables** - Sensitive data himoyasi
- **Rate Limiting** - API abuse himoyasi

## 🧪 Testing

```bash
# Linting
npm run lint

# Build test
npm run build

# Functions test
npm run test:functions

# Bundle analysis
npm run analyze
```

## 📈 Monitoring

- **Google Analytics** - User behavior tracking
- **Firebase Analytics** - App performance
- **Error Tracking** - Console error monitoring
- **Performance Monitoring** - Core Web Vitals

## 🤝 Contributing

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/AmazingFeature`)
3. Commit qiling (`git commit -m 'Add some AmazingFeature'`)
4. Push qiling (`git push origin feature/AmazingFeature`)
5. Pull Request oching

## 📄 License

Bu loyiha MIT License ostida. Batafsil: [LICENSE](LICENSE) fayli.

## 👨‍💻 Muallif

**AI-Powered Development** - Kiro Assistant yordamida yaratilgan

## 🙏 Minnatdorchilik

- **Kiro AI Assistant** - Loyihaning asosiy ishlab chiqaruvchisi
- **React Team** - Ajoyib framework uchun
- **Firebase Team** - Backend services uchun
- **Cloudinary** - Image optimization uchun
- **Netlify** - Hosting va functions uchun

## 📞 Qo'llab-quvvatlash

- 📧 Email: support@zamonbooks.uz
- 💬 Telegram: [@zamon_books_support](https://t.me/zamon_books_support)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/zamon-books-frontend/issues)

---


⭐ **Loyiha yoqsa, star bering!** ⭐



