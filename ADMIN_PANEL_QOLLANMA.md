# 🎯 ZAMON BOOKS ADMIN PANEL - AMALIY FOYDALANISH QOLLANMASI

Bu qollanma Zamon Books admin panelini qanday ishlatishni bosqichma-bosqich ko'rsatadi. Har bir funksiya uchun aniq yo'riqnomalar va amaliy misollar berilgan.

## 📋 MUNDARIJA

1. [Admin Panelga Kirish](#admin-panelga-kirish)
2. [Dashboard - Asosiy Sahifa](#dashboard---asosiy-sahifa)
3. [Kitoblar Boshqaruvi](#kitoblar-boshqaruvi)
4. [Mualliflar Boshqaruvi](#mualliflar-boshqaruvi)
5. [Janrlar Boshqaruvi](#janrlar-boshqaruvi)
6. [Buyurtmalar Boshqaruvi](#buyurtmalar-boshqaruvi)
7. [Inventory Management](#inventory-management)
8. [Foydalanuvchilar Boshqaruvi](#foydalanuvchilar-boshqaruvi)
9. [Tizim Sozlamalari](#tizim-sozlamalari)
10. [Enhanced Migration](#enhanced-migration)

---

## 🔐 ADMIN PANELGA KIRISH

### **URL:** `http://localhost:5173/admin-login`

### **QANDAY KIRISH KERAK:**

#### **1-QADDAM: Admin Login Sahifasiga O'ting**
```
Browser'da yozing: http://localhost:5173/admin-login
```

#### **2-QADDAM: Login Ma'lumotlarini Kiriting**
- **Email:** Admin email manzilingizni kiriting
- **Parol:** Admin parolingizni kiriting
- **"Kirish" tugmasini bosing**

#### **3-QADDAM: Muvaffaqiyatli Kirish**
- Agar ma'lumotlar to'g'ri bo'lsa → Dashboard'ga yo'naltirilasiz
- Agar noto'g'ri bo'lsa → Qizil xato xabari ko'rinadi

#### **XATO BO'LSA NIMA QILISH:**
- Email to'g'ri yozilganligini tekshiring
- Parol to'g'riligini tasdiqlang
- Caps Lock yoqilmaganligini ko'ring
- Admin huquqlaringiz borligini tasdiqlang

#### **XAVFSIZLIK CHORALARI:**
- Parolni hech kimga bermang
- Ish tugagach "Logout" qiling
- Umumiy kompyuterda ishlamang

---

## 📊 DASHBOARD - ASOSIY SAHIFA

### **URL:** `http://localhost:5173/admin-dashboard`

### **DASHBOARD'DAN QANDAY FOYDALANISH:**

#### **1. STATISTIKA KARTLARINI O'QISH:**

**📊 Yuqori Qatordagi 4 ta Karta:**
- **Jami Kitoblar:** Sizning database'dagi barcha kitoblar soni
- **Jami Buyurtmalar:** Bugungi kunga qadar qilingan barcha buyurtmalar
- **Jami Foydalanuvchilar:** Ro'yxatdan o'tgan foydalanuvchilar soni  
- **Jami Daromad:** Barcha buyurtmalardan olingan umumiy pul miqdori

**Bu raqamlar nima degani:**
- Agar kitoblar soni kamaysa → yangi kitoblar qo'shish kerak
- Agar buyurtmalar ko'paysa → biznes yaxshi ketmoqda
- Agar daromad pasaysa → marketing qilish kerak

#### **2. SO'NGGI BUYURTMALARNI TEKSHIRISH:**

**Qanday ko'rish:**
- Dashboard'ning o'rta qismida "So'nggi Buyurtmalar" jadvali bor
- Oxirgi 5 ta buyurtma ko'rsatiladi
- Har bir buyurtmada: kim, nima, qachon, qancha

**Nima qilish kerak:**
- Yangi buyurtmalarni ko'rib chiqing
- Holatini "Kutilmoqda"dan "Tasdiqlangan"ga o'zgartiring
- Foydalanuvchiga Telegram orqali xabar yuboring

#### **3. ENG MASHHUR KITOBLARNI KUZATISH:**

**Nima uchun muhim:**
- Qaysi kitoblar ko'p sotilayotganini bilish
- Kam qolgan mashhur kitoblarni to'ldirish
- Yangi kitoblar tanlashda yo'l-yo'riq

**Qanday foydalanish:**
- Top 5 ro'yxatini har kuni tekshiring
- Mashhur kitoblarning stock'ini kuzatib turing
- O'xshash kitoblar qo'shishni o'ylang

#### **4. TELEGRAM BOT HOLATINI TEKSHIRISH:**

**Bot ishlayotganini qanday bilish:**
- Webhook Monitor bo'limida yashil "✅" belgisi bo'lishi kerak
- "So'nggi faollik" vaqti yaqin bo'lishi kerak
- Qizil xato xabarlari bo'lmasligi kerak

**Agar bot ishlamasa:**
- Settings → Telegram Bot sozlamalariga o'ting
- Bot token'ni tekshiring
- "Test Xabar Yuborish" tugmasini bosing

---

## 📚 KITOBLAR BOSHQARUVI

### **URL:** `http://localhost:5173/admin/books`

### **Asosiy Funksiyalar:**

#### **📖 Kitoblar Ro'yxati:**
- Barcha kitoblarning jadval ko'rinishi
- Har bir kitob uchun:
  - Rasm (thumbnail)
  - Nomi
  - Muallif
  - Narx
  - Nashr yili
  - Holat (mavjud/mavjud emas)

#### **🔍 Qidiruv va Filtrlash:**
- **Nom bo'yicha qidiruv**
- **Muallif bo'yicha filtrlash**
- **Janr bo'yicha filtrlash**
- **Narx oralig'i bo'yicha filtrlash**
- **Nashr yili bo'yicha saralash**

#### **YANGI KITOB QO'SHISH - BOSQICHMA-BOSQICH:**

#### **1-QADDAM: Kitoblar Sahifasiga O'ting**
```
Sidebar'da "📚 Kitoblar" tugmasini bosing
yoki URL: http://localhost:5173/admin/books
```

#### **2-QADDAM: Yangi Kitob Formini Oching**
- Sahifaning yuqori qismida **"+ Yangi Kitob Qo'shish"** tugmasini bosing
- Yangi oyna (modal) ochiladi

#### **3-QADDAM: Asosiy Ma'lumotlarni Kiriting**
**MAJBURIY MAYDONLAR:**
- **Kitob nomi:** To'liq va aniq nom yozing
- **Tavsif:** 2-3 jumlada kitob haqida
- **Narx:** Faqat raqam (masalan: 25000)
- **Muallif:** Dropdown'dan tanlang (agar yo'q bo'lsa, avval Mualliflar bo'limida qo'shing)
- **Janr:** Dropdown'dan tanlang
- **Nashr yili:** 4 raqamli yil (masalan: 2023)

**IXTIYORIY MAYDONLAR:**
- **Sahifalar soni:** Raqam
- **Til:** O'zbek, Rus, Ingliz
- **ISBN:** Agar mavjud bo'lsa

#### **4-QADDAM: Rasm Yuklash**
**3 xil usul:**
1. **Drag & Drop:** Rasmni browser oynasiga sudrab tashlang
2. **Fayl Tanlash:** "Rasm Tanlash" tugmasini bosib, kompyuterdan tanlang
3. **URL orqali:** Agar rasm internetda bo'lsa, URL'ni kiriting

**RASM TALABLARI:**
- Hajmi: 10MB dan kam
- Format: JPG, PNG, WebP
- Tavsiya: 400x600 pixel (kitob muqovasi nisbati)

#### **5-QADDAM: Saqlash**
- Barcha ma'lumotlarni tekshiring
- **"Saqlash"** tugmasini bosing
- Muvaffaqiyatli bo'lsa, yashil xabar ko'rinadi
- Kitob ro'yxatga qo'shiladi

#### **XATO BO'LSA:**
- Qizil xato xabari ko'rinadi
- Xato maydonlar qizil rangda belgilanadi
- Xatoni tuzatib, qayta "Saqlash"ni bosing

#### **KITOBNI TAHRIRLASH:**

#### **1-QADDAM: Kitobni Toping**
- Kitoblar ro'yxatida kerakli kitobni toping
- Yoki qidiruv maydoniga kitob nomini yozing

#### **2-QADDAM: Tahrirlash Rejimiga O'ting**
- Kitob qatorida **"✏️ Tahrirlash"** tugmasini bosing
- Tahrirlash formasi ochiladi (barcha mavjud ma'lumotlar ko'rsatiladi)

#### **3-QADDAM: Ma'lumotlarni O'zgartiring**
- Kerakli maydonlarni o'zgartiring
- Yangi rasm yuklash uchun: eski rasmni o'chiring, yangi yuklang
- Narxni o'zgartirish: faqat raqam kiriting

#### **4-QADDAM: Saqlash**
- **"Yangilash"** tugmasini bosing
- O'zgarishlar darhol qo'llaniladi

#### **KITOBNI O'CHIRISH (EHTIYOT!):**

#### **⚠️ DIQQAT: Bu amal qaytarib bo'lmaydi!**

#### **1-QADDAM: O'chirish Tugmasini Bosing**
- Kitob qatorida **"🗑️ O'chirish"** tugmasini bosing

#### **2-QADDAM: Tasdiqlash**
- "Haqiqatan ham o'chirmoqchimisiz?" degan savol chiqadi
- **"Ha, O'chirish"** tugmasini bosing

#### **3-QADDAM: Natija**
- Kitob ro'yxatdan o'chadi
- Barcha bog'liq ma'lumotlar (buyurtmalar, savat) saqlanadi
- Faqat kitob ma'lumotlari o'chadi

#### **QACHON O'CHIRISH KERAK:**
- ✅ Kitob hech qachon sotilmagan
- ✅ Noto'g'ri ma'lumot bilan qo'shilgan
- ✅ Takroriy kitob
- ❌ Faqat stock tugagani uchun o'chirmang (Inventory'da "Out of Stock" qiling)

#### **📊 Kitob Statistikasi:**
- Har bir kitob uchun:
  - Ko'rilgan miqdor
  - Sotilgan miqdor
  - Savatlarga qo'shilgan miqdor
  - Reyting (agar mavjud bo'lsa)

---

## 👨‍💼 MUALLIFLAR BOSHQARUVI

### **URL:** `http://localhost:5173/admin/authors`

### **Funksiyalar:**

#### **📋 Mualliflar Ro'yxati:**
- Barcha mualliflarning jadval ko'rinishi
- Har bir muallif uchun:
  - Ism-familiya
  - Biografiya (qisqacha)
  - Kitoblar soni
  - Qo'shilgan sana

#### **➕ Yangi Muallif Qo'shish:**
1. **"Yangi Muallif Qo'shish" tugmasini bosing**
2. **Ma'lumotlarni kiriting:**
   - To'liq ism
   - Biografiya
   - Tug'ilgan sana (ixtiyoriy)
   - Millati (ixtiyoriy)
3. **"Saqlash" tugmasini bosing**

#### **✏️ Muallif Ma'lumotlarini Tahrirlash:**
- Barcha ma'lumotlarni o'zgartirish mumkin
- Muallif o'chirilganda, uning kitoblari "Noma'lum muallif" ga o'tkaziladi

#### **📊 Muallif Statistikasi:**
- Kitoblar soni
- Umumiy sotilgan kitoblar
- Eng mashhur kitob

---

## 🏷️ JANRLAR BOSHQARUVI

### **URL:** `http://localhost:5173/admin/genres`

### **Funksiyalar:**

#### **📂 Janrlar Ro'yxati:**
- Barcha janrlarning ro'yxati
- Har bir janr uchun:
  - Janr nomi
  - Tavsif
  - Kitoblar soni
  - Rang kodi (UI uchun)

#### **➕ Yangi Janr Qo'shish:**
1. **Janr nomini kiriting**
2. **Qisqacha tavsif yozing**
3. **Rang tanlang (UI uchun)**
4. **"Saqlash" tugmasini bosing**

#### **🎨 Janr Ranglari:**
- Har bir janr uchun maxsus rang
- Homepage'da kategoriya filtrlashda ishlatiladi
- Kitob kartlarida janr ko'rsatishda ishlatiladi

---

## 🛒 BUYURTMALAR BOSHQARUVI

### **URL:** `http://localhost:5173/admin/orders`

### **Funksiyalar:**

#### **📦 Buyurtmalar Ro'yxati:**
- Barcha buyurtmalarning batafsil ro'yxati
- Har bir buyurtma uchun:
  - Buyurtma ID
  - Foydalanuvchi ma'lumotlari
  - Kitob(lar) ro'yxati
  - Jami summa
  - Buyurtma sanasi
  - Holat (kutilmoqda, tasdiqlangan, yetkazilgan, bekor qilingan)

#### **🔍 Buyurtmalarni Qidiruv:**
- Buyurtma ID bo'yicha
- Foydalanuvchi nomi bo'yicha
- Kitob nomi bo'yicha
- Sana oralig'i bo'yicha

#### **📊 Buyurtma Holatlari:**
- **Kutilmoqda (Pending):** Yangi buyurtma
- **Tasdiqlangan (Confirmed):** Admin tomonidan tasdiqlangan
- **Tayyorlanmoqda (Processing):** Yetkazish uchun tayyorlanmoqda
- **Yetkazilgan (Delivered):** Muvaffaqiyatli yetkazilgan
- **Bekor qilingan (Cancelled):** Bekor qilingan buyurtma

#### **BUYURTMA HOLATINI O'ZGARTIRISH - AMALIY:**

#### **BUYURTMA JARAYONI:**
```
Yangi Buyurtma → Tasdiqlash → Tayyorlash → Yetkazish → Yakunlash
```

#### **HAR BIR HOLAT UCHUN NIMA QILISH:**

#### **1. YANGI BUYURTMA KELGANDA:**
**Holat:** 🟡 Pending (Kutilmoqda)
**Nima qilish:**
- Buyurtma ma'lumotlarini tekshiring
- Kitob mavjudligini tasdiqlang
- Foydalanuvchi ma'lumotlarini ko'ring
- **"Confirmed"ga o'zgartiring**

#### **2. BUYURTMANI TASDIQLASH:**
**Holat:** 🟢 Confirmed (Tasdiqlangan)
**Nima qilish:**
- Kitobni tayyorlang
- Qadoqlash uchun belgilang
- **"Processing"ga o'zgartiring**

#### **3. BUYURTMANI TAYYORLASH:**
**Holat:** 🔵 Processing (Tayyorlanmoqda)
**Nima qilish:**
- Kitobni qadoqlang
- Yetkazish xizmatiga bering
- **"Delivered"ga o'zgartiring**

#### **4. YETKAZIB BERISH:**
**Holat:** ✅ Delivered (Yetkazilgan)
**Nima qilish:**
- Foydalanuvchi olganini tasdiqlang
- Agar muammo bo'lsa, hal qiling
- Bu yakuniy holat

#### **5. BEKOR QILISH:**
**Holat:** ❌ Cancelled (Bekor qilingan)
**Qachon ishlatish:**
- Foydalanuvchi bekor qilsa
- Kitob mavjud bo'lmasa
- To'lov muammosi bo'lsa

#### **AMALIY MISOL:**
```
1. Yangi buyurtma: "Foten" kitobi, 1 dona, 25000 so'm
2. Tekshirish: Kitob mavjud, foydalanuvchi ma'lumotlari to'g'ri
3. Confirmed'ga o'zgartirish
4. Telegram'da foydalanuvchiga: "Buyurtmangiz tasdiqlandi"
5. Kitobni tayyorlash
6. Processing'ga o'zgartirish
7. Yetkazish xizmatiga berish
8. Delivered'ga o'zgartirish
9. Foydalanuvchiga: "Buyurtmangiz yetkazildi"
```

#### **📧 Avtomatik Xabarlar:**
- Buyurtma holati o'zgarganda foydalanuvchiga Telegram orqali xabar yuboriladi
- Email xabarlari (agar sozlangan bo'lsa)

#### **💰 Moliyaviy Hisobotlar:**
- Kunlik daromad
- Haftalik daromad
- Oylik daromad
- Eng ko'p sotilgan kitoblar
- Eng faol foydalanuvchilar

---

## 📦 INVENTORY MANAGEMENT

### **URL:** `http://localhost:5173/admin/inventory`

### **Funksiyalar:**

#### **📊 Inventory Dashboard:**
- **Jami kitoblar soni**
- **Mavjud kitoblar**
- **Kam qolgan kitoblar**
- **Tugagan kitoblar**
- **Ishlab chiqarilmagan kitoblar**
- **Pre-order kitoblar**

#### **📋 Stock Boshqaruvi:**
- Har bir kitob uchun:
  - Hozirgi stock miqdori
  - Minimum stock darajasi
  - Maksimum stock darajasi
  - Oxirgi to'ldirilgan sana
  - Yetkazib beruvchi ma'lumotlari

#### **BOOK STATUS MANAGER - AMALIY QOLLANMA:**

#### **1-QADDAM: Status Manager'ni Ochish**
```
Inventory Management → Kitob ro'yxatida ⚙️ tugmasini bosing
```

#### **2-QADDAM: Status O'zgartirish**

**HAR BIR STATUS NIMA DEGANI:**

**🟢 IN STOCK (Mavjud):**
- Kitob sotuvda va mavjud
- Foydalanuvchilar savatga qo'sha oladi
- **Qachon ishlatish:** Stock 3+ dona bo'lsa

**🟡 LOW STOCK (Kam qolgan):**
- Kitob mavjud lekin kam qolgan
- "Kam qoldi!" xabari ko'rsatiladi
- **Qachon ishlatish:** Stock 1-2 dona bo'lsa

**🔴 OUT OF STOCK (Tugagan):**
- Kitob tugagan, lekin tez orada keladi
- "Navbatga qo'shilish" tugmasi ko'rsatiladi
- **Qachon ishlatish:** Stock 0 dona, lekin buyurtma berilgan

**⚫ DISCONTINUED (Ishlab chiqarilmagan):**
- Kitob ishlab chiqarilmaydi
- Saytda ko'rinmaydi (agar admin sozlamagan bo'lsa)
- **Qachon ishlatish:** Kitob chop etilmaydi

**🔵 PRE-ORDER (Oldindan buyurtma):**
- Kitob hali chiqmagan, lekin buyurtma qabul qilinadi
- "Oldindan buyurtma berish" tugmasi
- **Qachon ishlatish:** Yangi kitob, hali chiqmagan

**🟣 COMING SOON (Tez orada keladi):**
- Kitob tez orada keladi
- "Oldindan buyurtma berish" mumkin
- **Qachon ishlatish:** Kitob yo'lda, 1-2 haftada keladi

#### **3-QADDAM: Status Tanlash**
- Kerakli status tugmasini bosing
- Rang o'zgaradi va saytda darhol ko'rinadi

#### **👁️ Visibility Control:**
- **Visible:** Hammaga ko'rinadigan
- **Hidden:** Butunlay yashirin
- **Admin Only:** Faqat admin ko'radigan

#### **👑 Admin Priority:**
- 0-100 darajali tartib tizimi
- Homepage'da kitoblar tartibini belgilaydi
- Yuqori priority = yuqori o'rin

#### **📈 Advanced Controls:**
- **Expected Restock Date:** Qayta kelish sanasi
- **Allow Pre-order:** Oldindan buyurtmaga ruxsat
- **Enable Waitlist:** Navbat tizimini yoqish
- **Show When Discontinued:** Discontinued holatda ham ko'rsatish

#### **📊 Analytics:**
- **View Count:** Ko'rilgan miqdor
- **Sales Count:** Sotilgan miqdor
- **Pre-order Count:** Oldindan buyurtma miqdori
- **Waitlist Count:** Navbat miqdori
- **Demand Score:** Talab darajasi

#### **🔄 Bulk Operations:**
1. **Bir nechta kitobni tanlang**
2. **"Bulk Update" tugmasini bosing**
3. **Yangi stock miqdorini kiriting**
4. **"Yangilash" tugmasini bosing**

#### **⚠️ Low Stock Alerts:**
- Kam qolgan kitoblar avtomatik ko'rsatiladi
- Email/Telegram orqali ogohlantirish
- Minimum stock darajasiga yetganda xabar

---

## 👥 FOYDALANUVCHILAR BOSHQARUVI

### **URL:** `http://localhost:5173/admin/users`

### **Funksiyalar:**

#### **👤 Foydalanuvchilar Ro'yxati:**
- Barcha ro'yxatdan o'tgan foydalanuvchilar
- Har bir foydalanuvchi uchun:
  - Ism-familiya
  - Email
  - Telefon raqami
  - Ro'yxatdan o'tgan sana
  - Oxirgi faollik
  - Buyurtmalar soni
  - Jami xarid miqdori

#### **🔍 Foydalanuvchilarni Qidiruv:**
- Ism bo'yicha
- Email bo'yicha
- Telefon raqami bo'yicha

#### **📊 Foydalanuvchi Statistikasi:**
- Jami buyurtmalar
- Jami xarid miqdori
- Eng ko'p xarid qilgan kitob
- Oxirgi faollik sanasi

#### **🚫 Foydalanuvchini Bloklash:**
1. **Foydalanuvchini tanlang**
2. **"Bloklash" tugmasini bosing**
3. **Sabab ko'rsating**
4. **Tasdiqlang**

#### **📧 Foydalanuvchiga Xabar Yuborish:**
- Telegram orqali shaxsiy xabar
- Email yuborish (agar sozlangan bo'lsa)
- Ommaviy xabarlar yuborish

---

## ⚙️ TIZIM SOZLAMALARI

### **URL:** `http://localhost:5173/admin/settings`

### **Funksiyalar:**

#### **🔧 System Status:**
- **Database:** Ulanish holati
- **Books Collection:** Mavjudligi
- **Waitlist Collection:** Konfiguratsiya holati
- **PreOrder Collection:** Konfiguratsiya holati

#### **🤖 Telegram Bot Sozlamalari:**
- Bot token tekshirish
- Chat ID konfiguratsiyasi
- Webhook holati
- Test xabar yuborish

#### **☁️ Cloudinary Sozlamalari:**
- API kalitlari tekshirish
- Upload preset konfiguratsiyasi
- Rasm optimizatsiya sozlamalari

#### **📧 Email Sozlamalari:**
- SMTP server konfiguratsiyasi
- Email template'lar
- Avtomatik xabarlar sozlamalari

#### **🎨 UI/UX Sozlamalari:**
- Theme o'zgartirish (Light/Dark)
- Logo va branding
- Rang sxemasi
- Font sozlamalari

#### **🔒 Xavfsizlik Sozlamalari:**
- Admin parollarini o'zgartirish
- Sessiya vaqti
- IP whitelist
- Kirish loglarini ko'rish

#### **📊 Performance Monitoring:**
- Server performance
- Database query vaqtlari
- API response vaqtlari
- Error loglar

---

## 🚀 ENHANCED MIGRATION

### **URL:** `http://localhost:5173/admin/enhanced-migration`

### **Funksiyalar:**

#### **📋 Collection Status:**
- **Waitlist Collection:** Konfiguratsiya holati
- **PreOrder Collection:** Konfiguratsiya holati
- Real-time status monitoring

#### **🔄 Migration Process:**
1. **Collection status'ni tekshiring**
2. **"Enhanced Migration'ni Boshlash" tugmasini bosing**
3. **Progress bar'ni kuzatib turing**
4. **Har bir kitob uchun yangilanish jarayoni ko'rsatiladi**
5. **Yakuniy natijalar ko'rsatiladi**

#### **📊 Migration Statistics:**
- **Yangilangan kitoblar soni**
- **Xatolar soni**
- **Jami kitoblar soni**
- **Muvaffaqiyat foizi**

#### **🔧 Qo'shiladigan Fieldlar:**
- **allowPreOrder:** Oldindan buyurtmaga ruxsat
- **enableWaitlist:** Navbat tizimi
- **preOrderCount:** Oldindan buyurtma miqdori
- **waitlistCount:** Navbat miqdori
- **expectedRestockDate:** Kutilayotgan to'ldirilish sanasi
- **visibility:** Ko'rinish holati
- **showWhenDiscontinued:** Discontinued holatda ko'rsatish
- **adminPriority:** Admin tartibi
- **demandScore:** Talab darajasi

---

## 🎯 ADMIN PANEL NAVIGATION

### **Sidebar Menu:**
- **📊 Dashboard:** Asosiy sahifa
- **📚 Kitoblar:** Kitoblar boshqaruvi
- **👨‍💼 Mualliflar:** Mualliflar boshqaruvi
- **🏷️ Janrlar:** Janrlar boshqaruvi
- **🛒 Buyurtmalar:** Buyurtmalar boshqaruvi
- **📦 Inventory:** Stock boshqaruvi
- **👥 Foydalanuvchilar:** User management
- **⚙️ Sozlamalar:** Tizim sozlamalari
- **🚀 Enhanced Migration:** Database migration

### **Header Features:**
- **🔍 Global Search:** Barcha bo'limlar bo'yicha qidiruv
- **🌙 Theme Toggle:** Light/Dark mode
- **👤 Admin Profile:** Admin ma'lumotlari
- **🚪 Logout:** Tizimdan chiqish

### **Responsive Design:**
- **Desktop:** To'liq funksional sidebar
- **Tablet:** Collapsed sidebar
- **Mobile:** Hamburger menu

---

## 🔧 TROUBLESHOOTING

### **Umumiy Muammolar:**

#### **1. Admin panelga kira olmayapman**
- Email va parol to'g'riligini tekshiring
- Admin huquqlaringiz borligini tasdiqlang
- Browser cache'ni tozalang
- Internetga ulanishni tekshiring

#### **2. Ma'lumotlar yuklanmayapti**
- Database ulanishini tekshiring
- Appwrite service ishlayotganini tasdiqlang
- Browser console'da xatolarni ko'ring
- Sahifani yangilang (Ctrl+F5)

#### **3. Rasm yuklanmayapti**
- Cloudinary sozlamalari to'g'riligini tekshiring
- Fayl hajmi 10MB dan oshmasligini tekshiring
- Qo'llab-quvvatlanadigan formatlar: JPG, PNG, WebP
- Internet tezligini tekshiring

#### **4. Telegram bot ishlamayapti**
- Bot token to'g'riligini tekshiring
- Chat ID to'g'riligini tasdiqlang
- Bot'ni chat'da /start qiling
- Webhook holatini tekshiring

#### **5. Migration ishlamayapti**
- Collection'lar yaratilganligini tekshiring
- Environment variables to'g'riligini tekshiring
- Database permissions'ni tekshiring
- Browser console'da xatolarni ko'ring

### **Yordam Olish:**
- **Telegram:** @the_palestine
- **Email:** admin@zamonbooks.uz
- **Documentation:** Bu qollanma
- **GitHub Issues:** Texnik muammolar uchun

---

## 📈 BEST PRACTICES

### **Xavfsizlik:**
- Admin parollarini muntazam o'zgartiring
- Faqat ishonchli IP manzillardan kirish
- Sessiya vaqtini cheklang
- Barcha amallarni log qiling

### **Performance:**
- Katta hajmdagi operatsiyalarni kechqurun bajaring
- Database'ni muntazam backup qiling
- Keraksiz fayllarni o'chiring
- Cache'ni muntazam tozalang

### **Ma'lumotlar Boshqaruvi:**
- Kitob ma'lumotlarini to'liq kiriting
- Rasm sifatiga e'tibor bering
- SEO uchun tavsif yozing
- Kategoriyalarni to'g'ri tanlang

### **Foydalanuvchi Tajribasi:**
- Buyurtmalar holatini tez yangilang
- Foydalanuvchi so'rovlariga javob bering
- Stock holatini real-time yangilang
- Xato xabarlarini tushunarli qiling

---

## 🎉 XULOSA

Zamon Books Admin Panel - bu to'liq funksional, professional va foydalanuvchi-do'st boshqaruv tizimi. Barcha zamonaviy e-commerce funksiyalari, inventory management, real-time monitoring va advanced analytics bilan jihozlangan.

**Asosiy Afzalliklar:**
- ✅ To'liq responsive dizayn
- ✅ Real-time ma'lumotlar yangilanishi
- ✅ Advanced inventory management
- ✅ Telegram bot integratsiyasi
- ✅ Cloudinary rasm boshqaruvi
- ✅ Professional UI/UX
- ✅ Xavfsizlik va performance optimizatsiyasi
- ✅ Batafsil analytics va reporting

**Bu admin panel orqali siz:**
- Kitoblar va inventory'ni professional darajada boshqarishingiz
- Buyurtmalar va foydalanuvchilarni samarali nazorat qilishingiz
- Real-time statistika va analytics olishingiz
- Tizim holatini monitoring qilishingiz mumkin

**Muvaffaqiyatli biznes yuritish uchun barcha zarur vositalar tayyor!** 🚀📚💼