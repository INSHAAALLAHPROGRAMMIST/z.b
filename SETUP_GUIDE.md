# 🚀 Zamon Books - To'liq O'rnatish Yo'riqnomasi

Bu yo'riqnoma sizga Zamon Books loyihasini noldan to'liq ishga tushirishda yordam beradi. Har bir qadam batafsil tushuntirilgan.

## 📋 Oldindan Tayyorgarlik

### Kerakli Dasturlar
- **Node.js** (18.0.0 yoki yuqori) - [nodejs.org](https://nodejs.org)
- **Git** - [git-scm.com](https://git-scm.com)
- **Code Editor** - VS Code tavsiya etiladi

### Kerakli Hisoblar
- **GitHub** - [github.com](https://github.com)
- **Appwrite** - [cloud.appwrite.io](https://cloud.appwrite.io)
- **Cloudinary** - [cloudinary.com](https://cloudinary.com)
- **Telegram** - Bot yaratish uchun

## 🔧 1. Loyihani Sozlash

### 1.1 Repository Klonlash
```bash
# Repository'ni klonlash
git clone https://github.com/your-username/zamon-books-frontend.git
cd zamon-books-frontend

# Dependencies o'rnatish
npm install

# Environment file yaratish
cp .env.example .env
```

### 1.2 Loyiha Strukturasini Tushunish
```
zamon-books-frontend/
├── src/
│   ├── components/     # React komponentlar
│   ├── pages/         # Sahifa komponentlari
│   ├── utils/         # Yordamchi funksiyalar
│   ├── styles/        # CSS fayllari
│   └── config/        # Konfiguratsiya
├── public/            # Static fayllar
├── .env.example       # Environment variables namunasi
└── README.md         # Asosiy dokumentatsiya
```

## 📊 2. Appwrite Backend Sozlash

### 2.1 Appwrite Account va Project
1. [cloud.appwrite.io](https://cloud.appwrite.io) ga o'ting
2. **"Sign Up"** tugmasini bosing
3. Email va parol bilan ro'yxatdan o'ting
4. **"Create Project"** tugmasini bosing
5. Project nomi: `Zamon Books`
6. Project ID: `zamon-books` (yoki boshqa unique nom)

### 2.2 Database Yaratish
1. Chap sidebar'da **"Databases"** ni tanlang
2. **"Create Database"** tugmasini bosing
3. Database ID: `main-database`
4. Name: `Main Database`
5. **"Create"** tugmasini bosing

### 2.3 Collection'larni Yaratish

#### 📚 Books Collection
```bash
Collection ID: books
Name: Books
```

**Attributes (har birini alohida qo'shing):**

**String Attributes:**
- `title` - String, Size: 500, Required: ✅
- `description` - String, Size: 2000, Required: ❌
- `authorName` - String, Size: 200, Required: ❌
- `imageUrl` - String, Size: 500, Required: ❌
- `slug` - String, Size: 200, Required: ❌
- `supplier` - String, Size: 200, Required: ❌, Default: ""
- `estimatedDelivery` - String, Size: 200, Required: ❌, Default: ""

**Number Attributes:**
- `price` - Float, Required: ✅
- `publishedYear` - Integer, Required: ❌
- `stock` - Integer, Required: ❌, Default: 10
- `minStockLevel` - Integer, Required: ❌, Default: 2
- `maxStockLevel` - Integer, Required: ❌, Default: 50
- `preOrderCount` - Integer, Required: ❌, Default: 0
- `waitlistCount` - Integer, Required: ❌, Default: 0
- `salesCount` - Integer, Required: ❌, Default: 0
- `viewCount` - Integer, Required: ❌, Default: 0
- `demandScore` - Integer, Required: ❌, Default: 0
- `adminPriority` - Integer, Required: ❌, Default: 0

**Boolean Attributes:**
- `isAvailable` - Boolean, Required: ❌, Default: true
- `isFeatured` - Boolean, Required: ❌, Default: false
- `isNewArrival` - Boolean, Required: ❌, Default: false
- `isPreOrder` - Boolean, Required: ❌, Default: false
- `allowPreOrder` - Boolean, Required: ❌, Default: true
- `enableWaitlist` - Boolean, Required: ❌, Default: true
- `showWhenDiscontinued` - Boolean, Required: ❌, Default: false

**DateTime Attributes:**
- `lastRestocked` - DateTime, Required: ❌
- `expectedRestockDate` - DateTime, Required: ❌

**Enum Attributes:**
- `stockStatus` - Enum, Required: ❌, Default: "in_stock"
  - Elements: `in_stock`, `low_stock`, `out_of_stock`, `pre_order`, `coming_soon`, `discontinued`
- `visibility` - Enum, Required: ❌, Default: "visible"
  - Elements: `visible`, `hidden`, `admin_only`

#### 👥 Authors Collection
```bash
Collection ID: authors
Name: Authors
```

**Attributes:**
- `name` - String, Size: 200, Required: ✅
- `bio` - String, Size: 1000, Required: ❌
- `imageUrl` - String, Size: 500, Required: ❌
- `slug` - String, Size: 200, Required: ❌
- `birthYear` - Integer, Required: ❌
- `nationality` - String, Size: 100, Required: ❌

#### 🏷️ Genres Collection
```bash
Collection ID: genres
Name: Genres
```

**Attributes:**
- `name` - String, Size: 100, Required: ✅
- `description` - String, Size: 500, Required: ❌
- `slug` - String, Size: 100, Required: ❌
- `color` - String, Size: 7, Required: ❌ (Hex color code)

#### 🛒 Cart Items Collection
```bash
Collection ID: cart_items
Name: Cart Items
```

**Attributes:**
- `userId` - String, Size: 50, Required: ✅
- `bookId` - String, Size: 50, Required: ✅
- `quantity` - Integer, Required: ✅, Default: 1
- `priceAtTimeOfAdd` - Float, Required: ✅

#### 👤 Users Collection
```bash
Collection ID: users
Name: Users
```

**Attributes:**
- `authId` - String, Size: 50, Required: ✅, Unique: ✅
- `fullName` - String, Size: 200, Required: ✅
- `email` - String, Size: 200, Required: ✅
- `phone` - String, Size: 20, Required: ❌
- `telegram_username` - String, Size: 50, Required: ❌
- `address` - String, Size: 500, Required: ❌
- `role` - Enum, Required: ❌, Default: "user"
  - Elements: `user`, `admin`, `editor`
- `isActive` - Boolean, Required: ❌, Default: true
- `lastLogin` - DateTime, Required: ❌

#### 📋 Orders Collection
```bash
Collection ID: orders
Name: Orders
```

**Attributes:**
- `userId` - String, Size: 50, Required: ✅
- `bookId` - String, Size: 50, Required: ✅
- `bookTitle` - String, Size: 500, Required: ✅
- `bookPrice` - Float, Required: ✅
- `quantity` - Integer, Required: ✅
- `totalAmount` - Float, Required: ✅
- `status` - Enum, Required: ❌, Default: "pending"
  - Elements: `pending`, `processing`, `completed`, `cancelled`
- `customerName` - String, Size: 200, Required: ✅
- `customerEmail` - String, Size: 200, Required: ✅
- `customerPhone` - String, Size: 20, Required: ❌
- `customerAddress` - String, Size: 500, Required: ❌
- `telegram_username` - String, Size: 50, Required: ❌

#### 📦 Waitlist Collection
```bash
Collection ID: waitlist
Name: Waitlist
```

**Attributes:**
- `bookId` - String, Size: 50, Required: ✅
- `userId` - String, Size: 50, Required: ✅
- `bookTitle` - String, Size: 500, Required: ✅
- `status` - Enum, Required: ❌, Default: "waiting"
  - Elements: `waiting`, `notified`, `cancelled`
- `notificationSent` - Boolean, Required: ❌, Default: false
- `notifiedAt` - DateTime, Required: ❌

#### 🎯 PreOrder Collection
```bash
Collection ID: preorder
Name: PreOrder
```

**Attributes:**
- `bookId` - String, Size: 50, Required: ✅
- `userId` - String, Size: 50, Required: ✅
- `bookTitle` - String, Size: 500, Required: ✅
- `bookPrice` - Float, Required: ✅
- `status` - Enum, Required: ❌, Default: "pending"
  - Elements: `pending`, `fulfilled`, `cancelled`
- `estimatedDelivery` - String, Size: 200, Required: ❌
- `fulfilledAt` - DateTime, Required: ❌

### 2.4 Permissions Sozlash

Har bir collection uchun **"Settings"** → **"Permissions"** ga o'ting:

#### Books, Authors, Genres Permissions:
- **Read**: `any` (hamma o'qiy oladi)
- **Create**: `users` (login qilgan userlar)
- **Update**: `users` (o'z documentlarini), `role:admin`, `role:editor`
- **Delete**: `role:admin`, `role:editor`

#### Cart Items Permissions:
- **Read**: `users` (faqat o'z itemlarini)
- **Create**: `users`
- **Update**: `users` (faqat o'zlarini)
- **Delete**: `users` (faqat o'zlarini)

#### Users Permissions:
- **Read**: `users` (faqat o'z profilini), `role:admin`
- **Create**: `users`
- **Update**: `users` (faqat o'zini), `role:admin`
- **Delete**: `role:admin`

#### Orders Permissions:
- **Read**: `users` (faqat o'z orderlarini), `role:admin`, `role:editor`
- **Create**: `users`
- **Update**: `role:admin`, `role:editor`
- **Delete**: `role:admin`

#### Waitlist va PreOrder Permissions:
- **Read**: `users` (faqat o'zlarini), `role:admin`, `role:editor`
- **Create**: `users`
- **Update**: `users` (faqat o'zlarini), `role:admin`, `role:editor`
- **Delete**: `users` (faqat o'zlarini), `role:admin`

### 2.5 Environment Variables
`.env` fayliga quyidagilarni kiriting:
```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id_here
VITE_APPWRITE_DATABASE_ID=main-database
VITE_APPWRITE_COLLECTION_BOOKS_ID=books
VITE_APPWRITE_COLLECTION_AUTHORS_ID=authors
VITE_APPWRITE_COLLECTION_GENRES_ID=genres
VITE_APPWRITE_COLLECTION_CART_ITEMS_ID=cart_items
VITE_APPWRITE_COLLECTION_USERS_ID=users
VITE_APPWRITE_COLLECTION_ORDERS_ID=orders
VITE_APPWRITE_COLLECTION_WAITLIST_ID=waitlist
VITE_APPWRITE_COLLECTION_PREORDER_ID=preorder
```

## 🖼️ 3. Cloudinary Sozlash

### 3.1 Account Yaratish
1. [cloudinary.com](https://cloudinary.com) ga o'ting
2. **"Sign Up Free"** tugmasini bosing
3. Ma'lumotlaringizni kiriting va email tasdiqlang

### 3.2 Dashboard Ma'lumotlari
1. Dashboard'da **"Programmable Media"** bo'limini toping
2. Quyidagi ma'lumotlarni ko'ring:
   - **Cloud Name**: sizning unique cloud nomingiz
   - **API Key**: public API key
   - **API Secret**: private API secret

### 3.3 Upload Preset Yaratish
1. **"Settings"** → **"Upload"** ga o'ting
2. **"Upload presets"** bo'limida **"Add upload preset"** tugmasini bosing
3. Sozlamalar:
   ```
   Preset name: zamon_books_preset
   Signing Mode: Unsigned (muhim!)
   Folder: books/
   
   Image Transformations:
   - Quality: Auto
   - Format: Auto
   - Max width: 1200
   - Max height: 1200
   - Crop: Fill
   ```
4. **"Save"** tugmasini bosing

### 3.4 Environment Variables
```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
VITE_CLOUDINARY_UPLOAD_PRESET=zamon_books_preset
VITE_CLOUDINARY_API_KEY=your_api_key_here
VITE_CLOUDINARY_API_SECRET=your_api_secret_here
```

## 🤖 4. Telegram Bot Sozlash

### 4.1 Bot Yaratish
1. Telegram'da [@BotFather](https://t.me/BotFather) ga yozing
2. `/start` buyrug'ini yuboring
3. `/newbot` buyrug'ini yuboring
4. Bot nomi kiriting: `Zamon Books Notification Bot`
5. Bot username kiriting: `@zamonbooks_notification_bot` (unique bo'lishi kerak)
6. Bot token'ini saqlang

### 4.2 Bot Sozlamalari
```
/setdescription - Bot tavsifi:
"Zamon Books do'konidan buyurtmalar haqida xabarlar yuboruvchi bot"

/setabouttext - Bot haqida:
"Bu bot Zamon Books onlayn do'konidan yangi buyurtmalar haqida admin'larga xabar beradi."

/setcommands - Bot buyruqlari:
start - Botni ishga tushirish
help - Yordam
```

### 4.3 Chat ID Olish

**Shaxsiy chat uchun:**
1. Botingizga `/start` yuboring
2. Quyidagi URL'ga o'ting (bot token'ini o'zingizniki bilan almashtiring):
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
3. Javobda `"chat":{"id":123456789}` ko'rinishida chat ID'ni topasiz

**Guruh chat uchun:**
1. Botni guruhga qo'shing va admin qiling
2. Guruhda biror xabar yuboring
3. Yuqoridagi URL'dan chat ID'ni oling (manfiy son bo'ladi)

### 4.4 Environment Variables
```env
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
VITE_TELEGRAM_CHAT_ID=your_chat_id_here
VITE_ADMIN_TELEGRAM=@your_admin_username
```

## 🚀 5. Loyihani Ishga Tushirish

### 5.1 Development Server
```bash
# Loyihani ishga tushirish
npm run dev

# Browser'da ochish
# http://localhost:5173
```

### 5.2 Birinchi Admin Yaratish
1. Saytga o'ting va oddiy user sifatida ro'yxatdan o'ting
2. Browser console'ni oching (F12)
3. User ID'ni ko'ring yoki Appwrite console'dan oling
4. Terminal'da admin script'ini ishga tushiring:
```bash
node make-admin-script.js YOUR_USER_ID
```

### 5.3 Test Ma'lumotlari Qo'shish
Admin panelga kirib:
1. **Authors** bo'limida mualliflar qo'shing
2. **Genres** bo'limida janrlar qo'shing
3. **Books** bo'limida kitoblar qo'shing

## 🌐 6. Netlify Deploy

### 6.1 GitHub'ga Push
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 6.2 Netlify Sozlash
1. [netlify.com](https://netlify.com) ga o'ting
2. GitHub account bilan kiring
3. **"New site from Git"** tugmasini bosing
4. Repository'ni tanlang
5. Deploy sozlamalari:
   ```
   Branch: main
   Build command: npm run build
   Publish directory: dist
   ```

### 6.3 Environment Variables
Netlify dashboard'da **"Site settings"** → **"Environment variables"** ga o'ting va barcha `.env` o'zgaruvchilarini qo'shing.

### 6.4 Custom Domain (Ixtiyoriy)
1. **"Domain settings"** ga o'ting
2. **"Add custom domain"** tugmasini bosing
3. Domain nomini kiriting
4. DNS sozlamalarini o'zgartiring

## ✅ 7. Tekshirish va Test

### 7.1 Funksionallik Testi
- [ ] User registration/login
- [ ] Kitoblarni ko'rish va qidirish
- [ ] Savatga qo'shish
- [ ] Buyurtma berish
- [ ] Admin panelga kirish
- [ ] Kitob qo'shish/tahrirlash
- [ ] Telegram notification

### 7.2 Performance Test
```bash
# Build yaratish
npm run build

# Build'ni test qilish
npm run preview

# Bundle analysis
npm run analyze
```

## 🚨 8. Xavfsizlik va Backup

### 8.1 Xavfsizlik Choralari
- [ ] `.env` fayl `.gitignore`da
- [ ] API key'lar xavfsiz saqlangan
- [ ] Appwrite permissions to'g'ri sozlangan
- [ ] HTTPS yoqilgan (Netlify avtomatik)

### 8.2 Backup Strategiyasi
- [ ] Database backup (Appwrite console orqali)
- [ ] Code backup (GitHub)
- [ ] Environment variables backup (xavfsiz joyda)

## 🎉 Tabriklaymiz!

Loyihangiz muvaffaqiyatli ishga tushirildi! Endi siz:
- ✅ To'liq ishlaydigan e-commerce platformaga egasiz
- ✅ Modern AI-powered development tajribasini oldingiz
- ✅ Professional portfolio loyihasiga egasiz
- ✅ Scalable va maintainable kod bazasiga egasiz

## 📞 Yordam va Qo'llab-quvvatlash

Agar qiyinchiliklar yuzaga kelsa:
1. **GitHub Issues** - texnik muammolar uchun
2. **Documentation** - qo'shimcha ma'lumotlar uchun
3. **Community** - boshqa dasturchilar bilan fikr almashish

---

**Omad tilaymiz!** 🚀 Loyihangiz bilan muvaffaqiyat qozonishingizni umid qilamiz!