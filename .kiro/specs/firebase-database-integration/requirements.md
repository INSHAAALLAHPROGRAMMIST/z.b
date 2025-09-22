# Firebase Database Integration Requirements

## Introduction

Bu spec Zamon Books loyihasida Firebase Firestore database'ni to'liq integratsiya qilish uchun yaratilgan. Hozirda loyihada Appwrite API'lari ishlatilmoqda, lekin Firebase konfiguratsiyasi mavjud. Maqsad - barcha database operatsiyalarini Firebase Firestore'ga o'tkazish va to'liq ishlaydigan e-commerce platformasini yaratish.

## Requirements

### Requirement 1: Firebase Firestore Collections Setup

**User Story:** Admin sifatida, men Firebase Firestore'da barcha kerakli collection'larni yaratishni va ularni to'g'ri strukturada tashkil qilishni xohlayman, shunda loyiha to'liq ishlashi mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN Firebase setup script ishga tushirilsa THEN quyidagi collection'lar yaratilishi SHART:
   - books (kitoblar ma'lumotlari)
   - users (foydalanuvchilar)
   - orders (buyurtmalar)
   - cart (savatcha)
   - wishlist (sevimlilar)
   - genres (janrlar)
   - authors (mualliflar)
   - waitlist (navbat tizimi)
   - preorders (oldindan buyurtmalar)

2. WHEN har bir collection yaratilsa THEN to'g'ri field'lar va data type'lar bilan tuzilishi SHART

3. WHEN sample data qo'shilsa THEN kamida 10 ta kitob, 5 ta janr va 3 ta muallif ma'lumotlari bo'lishi SHART

### Requirement 2: Books Management System

**User Story:** Foydalanuvchi sifatida, men kitoblarni ko'rish, qidirish va ular haqida to'liq ma'lumot olishni xohlayman, shunda kerakli kitobni topib sotib olishim mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN bosh sahifa ochilsa THEN Firebase'dan barcha kitoblar yuklanishi va ko'rsatilishi SHART

2. WHEN kitob kartasiga bosilsa THEN kitob batafsil sahifasi ochilishi SHART

3. WHEN qidiruv amalga oshirilsa THEN kitob nomi, muallif va tavsif bo'yicha qidiruv ishlashi SHART

4. WHEN kitoblar ro'yxati ko'rsatilsa THEN narx, mashhurlik va yangilik bo'yicha saralash mumkin bo'lishi SHART

### Requirement 3: Shopping Cart System

**User Story:** Foydalanuvchi sifatida, men kitoblarni savatga qo'shish, miqdorini o'zgartirish va buyurtma berishni xohlayman, shunda xarid qilish jarayoni qulay bo'lsin.

#### Acceptance Criteria

1. WHEN "Savatga qo'shish" tugmasiga bosilsa THEN kitob Firebase cart collection'ga qo'shilishi SHART

2. WHEN savat sahifasi ochilsa THEN barcha savatdagi kitoblar ko'rsatilishi SHART

3. WHEN kitob miqdori o'zgartirilsa THEN Firebase'da real-time yangilanishi SHART

4. WHEN buyurtma berilsa THEN Firebase orders collection'ga yangi buyurtma yaratilishi SHART

### Requirement 4: User Authentication & Profile

**User Story:** Foydalanuvchi sifatida, men ro'yxatdan o'tish, kirish va profilimni boshqarishni xohlayman, shunda shaxsiy ma'lumotlarim xavfsiz saqlansin.

#### Acceptance Criteria

1. WHEN foydalanuvchi ro'yxatdan o'tsa THEN Firebase Auth va Firestore users collection'da profil yaratilishi SHART

2. WHEN foydalanuvchi kirsa THEN Firebase Auth orqali autentifikatsiya qilinishi SHART

3. WHEN profil sahifasi ochilsa THEN foydalanuvchi ma'lumotlari Firebase'dan yuklanishi SHART

4. WHEN profil yangilanisa THEN Firebase Firestore'da saqlash SHART

### Requirement 5: Admin Panel Integration

**User Story:** Admin sifatida, men kitoblar, foydalanuvchilar va buyurtmalarni boshqarishni xohlayman, shunda loyihani to'liq nazorat qilishim mumkin bo'lsin.

#### Acceptance Criteria

1. WHEN admin panelga kirilsa THEN Firebase'dan barcha ma'lumotlar yuklanishi SHART

2. WHEN yangi kitob qo'shilsa THEN Firebase books collection'ga saqlash SHART

3. WHEN kitob tahrir qilinsa THEN Firebase'da yangilanishi SHART

4. WHEN buyurtmalar ko'rilsa THEN Firebase orders collection'dan ma'lumotlar olinishi SHART

### Requirement 6: Real-time Features

**User Story:** Foydalanuvchi sifatida, men real-time yangilanishlarni ko'rishni xohlayman, shunda eng so'nggi ma'lumotlarga ega bo'lishim mumkin.

#### Acceptance Criteria

1. WHEN savat yangilanisa THEN boshqa sahifalarda ham real-time ko'rsatilishi SHART

2. WHEN yangi buyurtma berilsa THEN admin panelda real-time ko'rinishi SHART

3. WHEN kitob stock'i o'zgarsa THEN barcha sahifalarda yangilanishi SHART

### Requirement 7: Error Handling & Performance

**User Story:** Foydalanuvchi sifatida, men tizimning barqaror ishlashini va xatolar yuz berganda to'g'ri xabarlar ko'rishni xohlayman.

#### Acceptance Criteria

1. WHEN Firebase bilan bog'lanishda xato yuz bersa THEN foydalanuvchiga tushunarli xabar ko'rsatilishi SHART

2. WHEN ma'lumotlar yuklanayotganda THEN loading indikatori ko'rsatilishi SHART

3. WHEN offline holatda THEN cached ma'lumotlar ko'rsatilishi SHART

4. WHEN database operatsiyasi muvaffaqiyatsiz bo'lsa THEN retry mexanizmi ishlashi SHART