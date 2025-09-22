# Enhanced Admin Dashboard Requirements

## Introduction

Bu spec Zamon Books loyihasidagi mavjud admin panelini yanada professional, samarali va to'liq funksional qilish uchun yaratilgan. Hozirda admin paneli asosiy funksiyalarga ega, lekin business analytics, customer relationship management, real-time monitoring va advanced reporting imkoniyatlari yo'q. Maqsad - admin'ning ish samaradorligini oshirish va biznes qarorlarini ma'lumotlarga asoslanib qabul qilish imkoniyatini berish.

## Requirements

### Requirement 1: Real-time Business Analytics Dashboard

**User Story:** Admin sifatida, men real-time biznes statistikalarini ko'rishni xohlayman, shunda biznesning hozirgi holatini tezda baholay olaman va to'g'ri qarorlar qabul qilishim mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN admin dashboard'ga kirsam THEN bugungi kun statistikalari real-time ko'rinishi SHART:
   - Bugungi buyurtmalar soni
   - Bugungi daromad miqdori
   - Faol foydalanuvchilar soni
   - Eng ko'p sotilgan kitoblar

2. WHEN statistika ma'lumotlari yangilansa THEN avtomatik ravishda dashboard'da ko'rinishi SHART

3. WHEN ma'lum muddat uchun statistika kerak bo'lsa THEN sana oralig'ini tanlash imkoniyati bo'lishi SHART

4. WHEN grafik ko'rinishda ma'lumot kerak bo'lsa THEN interactive chart'lar ko'rsatilishi SHART

5. IF ma'lumotlar yuklanmasa THEN loading indicator va error handling ko'rsatilishi SHART

### Requirement 2: Advanced Order Management System

**User Story:** Admin sifatida, men barcha buyurtmalarni samarali boshqarishni va mijozlar bilan aloqani oson qilishni xohlayman, shunda har bir buyurtmani tezda qayta ishlay olaman.

#### Acceptance Criteria

1. WHEN buyurtmalar sahifasiga kirsam THEN barcha buyurtmalar holati bo'yicha filtrlangan ko'rinishi SHART:
   - Yangi buyurtmalar (pending)
   - Tasdiqlangan buyurtmalar (confirmed)
   - Yetkazilayotgan buyurtmalar (shipping)
   - Tugallangan buyurtmalar (completed)
   - Bekor qilingan buyurtmalar (cancelled)

2. WHEN buyurtma holatini o'zgartirsam THEN avtomatik ravishda mijozga Telegram orqali xabar yuborilishi SHART

3. WHEN buyurtma tafsilotlarini ko'rsam THEN mijoz ma'lumotlari, kitob tafsilotlari va to'lov holati to'liq ko'rinishi SHART

4. WHEN mijoz bilan bog'lanish kerak bo'lsa THEN Telegram, telefon yoki email orqali tezda aloqa qilish imkoniyati bo'lishi SHART

5. IF buyurtma ma'lumotlarida muammo bo'lsa THEN admin'ga ogohlantirish va tuzatish imkoniyati berilishi SHART

### Requirement 3: Customer Relationship Management (CRM)

**User Story:** Admin sifatida, men har bir mijoz haqida to'liq ma'lumotga ega bo'lishni va ular bilan munosabatni yaxshilashni xohlayman, shunda mijozlar qoniqishini oshirishim mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN mijozlar ro'yxatini ko'rsam THEN har bir mijoz haqida quyidagi ma'lumotlar ko'rinishi SHART:
   - Shaxsiy ma'lumotlar (ism, telefon, email, Telegram)
   - Buyurtmalar tarixi va umumiy xarid miqdori
   - Sevimli kitoblar va janrlar
   - Oxirgi faollik sanasi
   - Mijoz darajasi (yangi, doimiy, VIP)

2. WHEN mijoz profili ochilsa THEN barcha buyurtmalar tarixi va aloqa tarixi ko'rinishi SHART

3. WHEN mijozga xabar yuborish kerak bo'lsa THEN Telegram bot orqali to'g'ridan-to'g'ri xabar yuborish imkoniyati bo'lishi SHART

4. WHEN mijoz qidirish kerak bo'lsa THEN ism, telefon, email yoki Telegram username bo'yicha qidirish mumkin bo'lishi SHART

5. IF mijoz bilan muammo bo'lsa THEN eslatma qo'shish va keyingi aloqa sanasini belgilash imkoniyati bo'lishi SHART

### Requirement 4: Inventory Management & Stock Alerts

**User Story:** Admin sifatida, men kitoblar stock'ini samarali boshqarishni va stock tugash haqida oldindan ogohlantirishni xohlayman, shunda kitoblar tugab qolmasin va mijozlar norozi bo'lmasin.

#### Acceptance Criteria

1. WHEN inventory sahifasiga kirsam THEN barcha kitoblar stock holati bo'yicha ko'rinishi SHART:
   - Stock mavjud (in_stock)
   - Kam qolgan (low_stock)
   - Tugagan (out_of_stock)
   - Pre-order (pre_order)

2. WHEN stock kam qolganda THEN avtomatik ogohlantirish yuborilishi SHART

3. WHEN kitob stock'ini yangilasam THEN barcha bog'liq sahifalarda real-time yangilanishi SHART

4. WHEN stock hisoboti kerak bo'lsa THEN Excel formatda export qilish imkoniyati bo'lishi SHART

5. IF kitob stock'i 0 ga yetsa THEN avtomatik ravishda "out_of_stock" holatiga o'tishi va mijozlarga waitlist taklif qilinishi SHART

### Requirement 5: Sales Analytics & Reporting

**User Story:** Admin sifatida, men sotuvlar tahlili va hisobotlarini ko'rishni xohlayman, shunda biznes samaradorligini baholay olaman va kelajak uchun rejalar tuzishim mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN sales analytics sahifasiga kirsam THEN quyidagi hisobotlar ko'rinishi SHART:
   - Kunlik, haftalik, oylik sotuvlar grafigi
   - Eng ko'p sotilgan kitoblar ro'yxati
   - Eng faol mijozlar ro'yxati
   - Janr bo'yicha sotuvlar taqsimoti
   - Daromad dinamikasi

2. WHEN ma'lum muddat uchun hisobot kerak bo'lsa THEN sana oralig'ini tanlash va filtrlash imkoniyati bo'lishi SHART

3. WHEN hisobotni saqlash kerak bo'lsa THEN PDF yoki Excel formatda export qilish mumkin bo'lishi SHART

4. WHEN taqqoslash kerak bo'lsa THEN oldingi muddat bilan taqqoslash grafiklari ko'rsatilishi SHART

5. IF ma'lumotlar yetarli bo'lmasa THEN "Ma'lumot yetarli emas" xabari va tavsiyalar ko'rsatilishi SHART

### Requirement 6: System Monitoring & Health Check

**User Story:** Admin sifatida, men tizimning sog'lom ishlayotganligini va potensial muammolarni erta aniqlashni xohlayman, shunda tizim uzluksiz ishlashini ta'minlay olaman.

#### Acceptance Criteria

1. WHEN system status sahifasiga kirsam THEN quyidagi ma'lumotlar ko'rinishi SHART:
   - Firebase connection holati
   - Cloudinary service holati
   - Telegram bot holati
   - Website performance metrics
   - Error logs summary

2. WHEN tizimda muammo aniqlansa THEN darhol admin'ga xabar yuborilishi SHART

3. WHEN error logs ko'rish kerak bo'lsa THEN oxirgi 24 soat ichidagi xatolar ro'yxati ko'rinishi SHART

4. WHEN performance metrics kerak bo'lsa THEN sahifa yuklash tezligi, database response time ko'rsatilishi SHART

5. IF kritik xato yuz bersa THEN SMS yoki Telegram orqali darhol ogohlantirish yuborilishi SHART

### Requirement 7: Content Management & SEO Tools

**User Story:** Admin sifatida, men kitoblar ma'lumotlarini samarali boshqarishni va SEO optimizatsiyasini qilishni xohlayman, shunda sayt Google'da yaxshi ko'rinsin va ko'proq mijoz jalb qilishim mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN kitob qo'shish yoki tahrirlashda THEN SEO maydonlari avtomatik to'ldirilishi SHART:
   - Meta title va description
   - SEO-friendly URL slug
   - Alt text for images
   - Keywords suggestions

2. WHEN kitob ma'lumotlari to'ldirilsa THEN SEO score va tavsiyalar ko'rsatilishi SHART

3. WHEN bulk operations kerak bo'lsa THEN bir nechta kitobni bir vaqtda tahrirlash imkoniyati bo'lishi SHART

4. WHEN rasm yuklashda THEN avtomatik optimizatsiya va multiple size generation bo'lishi SHART

5. IF SEO muammolari aniqlansa THEN aniq tavsiyalar va tuzatish yo'llari ko'rsatilishi SHART

### Requirement 8: Communication & Notification Center

**User Story:** Admin sifatida, men barcha xabarlar va bildirishnomalarni bir joyda ko'rishni va boshqarishni xohlayman, shunda hech qanday muhim xabarni o'tkazib yubormasligim mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN notification center'ga kirsam THEN barcha xabarlar kategoriya bo'yicha ko'rinishi SHART:
   - Yangi buyurtmalar
   - Stock alerts
   - System notifications
   - Customer messages
   - Error alerts

2. WHEN yangi xabar kelsa THEN real-time ravishda dashboard'da ko'rinishi SHART

3. WHEN xabarni o'qisam THEN "o'qilgan" deb belgilanishi SHART

4. WHEN xabarga javob berish kerak bo'lsa THEN to'g'ridan-to'g'ri Telegram orqali javob berish imkoniyati bo'lishi SHART

5. IF muhim xabar o'tkazib yuborilsa THEN eslatma tizimi ishlashi SHART

### Requirement 9: User-Admin Real-time Messaging System

**User Story:** Foydalanuvchi sifatida, men admin bilan to'g'ridan-to'g'ri real-time chat qilishni xohlayman, shunda kitoblar, buyurtmalar va boshqa savollarim bo'yicha tezda javob olishim mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN foydalanuvchi saytda "Admin bilan bog'lanish" tugmasini bossa THEN real-time chat oynasi ochilishi SHART

2. WHEN foydalanuvchi xabar yozsa THEN admin dashboard'da darhol ko'rinishi va notification kelishi SHART

3. WHEN admin javob bersa THEN foydalanuvchi real-time ravishda ko'rishi SHART

4. WHEN chat tarixi kerak bo'lsa THEN barcha oldingi suhbatlar saqlanishi va ko'rinishi SHART

5. IF messaging system ishlamasa THEN fallback sifatida Telegram yoki telefon raqami ko'rsatilishi SHART

### Requirement 10: Admin Messaging Dashboard

**User Story:** Admin sifatida, men barcha foydalanuvchilar bilan suhbatlarni bir joyda ko'rishni va boshqarishni xohlayman, shunda har bir mijoz bilan samarali muloqot qilishim mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN admin messaging dashboard'ga kirsam THEN barcha faol suhbatlar ro'yxati ko'rinishi SHART

2. WHEN yangi xabar kelsa THEN suhbat ro'yxatida unread badge ko'rinishi SHART

3. WHEN suhbatni ochsam THEN to'liq chat tarixi va foydalanuvchi ma'lumotlari ko'rinishi SHART

4. WHEN foydalanuvchi haqida ma'lumot kerak bo'lsa THEN uning buyurtmalar tarixi va profil ma'lumotlari ko'rinishi SHART

5. IF ko'p suhbat bo'lsa THEN qidiruv va filtrlash imkoniyati bo'lishi SHART