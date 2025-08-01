# 📚 Zamon Books - Zamonaviy Kitoblar Do'koni

Modern va responsive kitoblar do'koni - React, Vite, Appwrite va Cloudinary texnologiyalari asosida qurilgan.

## 🌟 Asosiy Xususiyatlar

### 👤 Foydalanuvchi Paneli
- **Kitoblarni ko'rish va qidirish** - Keng qidiruv imkoniyatlari
- **Kategoriya va janr bo'yicha filtrlash** - Oson navigatsiya
- **Savatcha funksiyasi** - Kitoblarni saqlash va buyurtma berish
- **Foydalanuvchi profili** - Shaxsiy ma'lumotlar boshqaruvi
- **Buyurtmalar tarixi** - Oldingi xaridlar ro'yxati
- **Responsive dizayn** - Barcha qurilmalarda mukammal ishlaydi

### 🔧 Admin Paneli
- **Kitoblar boshqaruvi** - Qo'shish, tahrirlash, o'chirish
- **Mualliflar va janrlar** - To'liq CRUD operatsiyalari
- **Buyurtmalar nazorati** - Real-time buyurtmalar kuzatuvi
- **Foydalanuvchilar boshqaruvi** - User management
- **Statistika va hisobotlar** - Biznes analytics
- **Rasm yuklash** - Cloudinary integratsiyasi

### 🎨 Dizayn Xususiyatlari
- **Neo-glassmorphism** - Zamonaviy UI/UX dizayn
- **Dark/Light Mode** - Ikki xil tema
- **Smooth Animations** - Yumshoq o'tish effektlari
- **Mobile-First** - Mobil qurilmalar uchun optimallashtirilgan
- **Accessibility** - Maxsus ehtiyojlar uchun moslashtirilgan

## 🚀 Texnologiyalar

### Frontend
- **React 18** - Modern JavaScript kutubxonasi
- **Vite** - Tez development server
- **React Router** - SPA routing
- **CSS3** - Modern styling (Flexbox, Grid, Animations)

### Backend & Database
- **Appwrite** - Backend-as-a-Service
- **Real-time Database** - Live ma'lumotlar yangilanishi
- **Authentication** - Xavfsiz login/register tizimi
- **File Storage** - Rasm va fayllar saqlash

### Integratsiyalar
- **Cloudinary** - Rasm optimizatsiya va saqlash
- **Telegram Bot** - Buyurtmalar haqida xabarlar
- **PWA Support** - Progressive Web App imkoniyatlari

## 📦 O'rnatish va Ishga Tushirish

### 1. Loyihani Klonlash
```bash
git clone https://github.com/your-username/zamonbooks-demo.git
cd zamonbooks-demo
```

### 2. Dependencies O'rnatish
```bash
npm install
# yoki
yarn install
```

### 3. Environment Variables Sozlash
```bash
cp .env.example .env
```

`.env` faylini tahrirlang va quyidagi ma'lumotlarni kiriting:

#### Appwrite Sozlamalari
1. [Appwrite Console](https://cloud.appwrite.io) ga kiring
2. Yangi loyiha yarating
3. Database va Collection'larni yarating
4. API key'larni `.env` ga kiriting

#### Cloudinary Sozlamalari
1. [Cloudinary](https://cloudinary.com) da ro'yxatdan o'ting
2. Upload preset yarating
3. API ma'lumotlarini `.env` ga kiriting

#### Telegram Bot Sozlamalari
1. [@BotFather](https://t.me/BotFather) orqali bot yarating
2. Bot token va chat ID ni oling
3. `.env` ga kiriting

### 4. Loyihani Ishga Tushirish
```bash
npm run dev
# yoki
yarn dev
```

Loyiha `http://localhost:5173` da ochiladi.

### 5. Production Build
```bash
npm run build
# yoki
yarn build
```

## 📁 Loyiha Strukturasi

```
zamonbooks-demo/
├── public/                 # Static fayllar
├── src/
│   ├── components/         # React komponentlar
│   │   ├── admin/         # Admin panel komponentlari
│   │   ├── user/          # Foydalanuvchi komponentlari
│   │   └── common/        # Umumiy komponentlar
│   ├── config/            # Konfiguratsiya fayllari
│   ├── styles/            # CSS fayllari
│   │   ├── admin/         # Admin panel stillari
│   │   └── user/          # Foydalanuvchi stillari
│   ├── utils/             # Yordamchi funksiyalar
│   └── hooks/             # Custom React hooks
├── docs/                  # Dokumentatsiya
├── .env.example           # Environment variables namunasi
└── README.md             # Ushbu fayl
```

## 🔐 Admin Panel

Admin panelga kirish uchun:
1. `/admin` sahifasiga o'ting
2. Admin hisobi yarating yoki mavjud hisobga kiring
3. Admin huquqlarini olish uchun `make-admin-script.js` dan foydalaning

```bash
node make-admin-script.js your-user-id
```

## 📱 Responsive Dizayn

Loyiha quyidagi ekran o'lchamlari uchun optimallashtirilgan:
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: 1024px+

## 🎨 Tema Tizimi

Loyihada ikki xil tema mavjud:
- **Dark Mode** - Qorong'u tema (default)
- **Light Mode** - Yorug' tema

Tema avtomatik ravishda localStorage da saqlanadi.

## 🔧 Konfiguratsiya

### Appwrite Collections Schema

#### Books Collection
```javascript
{
  title: String,
  description: String,
  author: String,
  genre: Array,
  price: Number,
  image: String,
  slug: String,
  publishedYear: Number,
  isFeatured: Boolean,
  isNewArrival: Boolean
}
```

#### Authors Collection
```javascript
{
  name: String,
  bio: String,
  image: String,
  slug: String
}
```

#### Genres Collection
```javascript
{
  name: String,
  description: String,
  slug: String
}
```

## 🚀 Deploy

### Netlify
1. GitHub repository'ni Netlify ga ulang
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables'ni sozlang

### Vercel
1. Vercel CLI o'rnating: `npm i -g vercel`
2. `vercel` buyrug'ini ishga tushiring
3. Environment variables'ni sozlang

## 🤝 Hissa Qo'shish

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/AmazingFeature`)
3. Commit qiling (`git commit -m 'Add some AmazingFeature'`)
4. Push qiling (`git push origin feature/AmazingFeature`)
5. Pull Request oching

## 📄 Litsenziya

Ushbu loyiha MIT litsenziyasi ostida tarqatiladi. Batafsil ma'lumot uchun `LICENSE` faylini ko'ring.

## 📞 Aloqa

- **Email**: your-email@example.com
- **Telegram**: @your_username
- **GitHub**: [your-username](https://github.com/your-username)

## 🙏 Minnatdorchilik

- [React](https://reactjs.org/) - UI kutubxonasi
- [Vite](https://vitejs.dev/) - Build tool
- [Appwrite](https://appwrite.io/) - Backend service
- [Cloudinary](https://cloudinary.com/) - Rasm boshqaruvi
- [Netlify](https://netlify.com/) - Hosting platform

---

**Zamon Books** - Zamonaviy kitoblar dunyosiga xush kelibsiz! 📚✨