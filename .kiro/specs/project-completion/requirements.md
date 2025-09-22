# Requirements Document

## Introduction

Bu loyiha Zamon Books e-commerce platformasini to'liq tugallash uchun zarur bo'lgan barcha Firebase va Cloudinary integratsiyalarini amalga oshirish rejasini belgilaydi. Asosiy maqsad - mavjud loyihani production-ready holatga keltirish, rasmlarni Cloudinary'da saqlash va barcha zarur funksionalliklarni to'liq ishlaydigan qilish.

## Requirements

### Requirement 1

**User Story:** Admin sifatida, men kitob rasmlarini Cloudinary orqali yuklashni va boshqarishni xohlayman, shunda rasmlar tez yuklansin va professional ko'rinishda bo'lsin.

#### Acceptance Criteria

1. WHEN admin kitob qo'shish formida rasm yuklasa THEN tizim rasmni Cloudinary'ga yuklashi KERAK
2. WHEN rasm muvaffaqiyatli yuklansa THEN Cloudinary URL Firestore'da saqlanishi KERAK
3. WHEN kitob sahifasida rasm ko'rsatilsa THEN Cloudinary'dan optimallashtirilgan rasm yuklanishi KERAK
4. IF rasm yuklashda xatolik yuz bersa THEN foydalanuvchiga tushunarli xabar ko'rsatilishi KERAK

### Requirement 2

**User Story:** Foydalanuvchi sifatida, men buyurtma berganimdan keyin Telegram orqali xabar olishni xohlayman, shunda buyurtmam holati haqida darhol xabardor bo'laman.

#### Acceptance Criteria

1. WHEN foydalanuvchi buyurtma bersa THEN admin Telegram botiga xabar yuborilishi KERAK
2. WHEN buyurtma holati o'zgarsa THEN foydalanuvchiga Telegram orqali bildirishnoma yuborilishi KERAK
3. WHEN Telegram bot sozlanmagan bo'lsa THEN tizim xatosiz ishlashda davom etishi KERAK
4. IF Telegram API'da xatolik yuz bersa THEN buyurtma jarayoni to'xtatilmasligi KERAK

### Requirement 3

**User Story:** Admin sifatida, men barcha buyurtmalarni boshqarish va holat o'zgartirishni xohlayman, shunda mijozlarga sifatli xizmat ko'rsata olaman.

#### Acceptance Criteria

1. WHEN admin panel'ga kirsam THEN barcha buyurtmalar ro'yxati ko'rinishi KERAK
2. WHEN buyurtma holatini o'zgartirsam THEN Firestore'da yangilanishi va mijozga xabar yuborilishi KERAK
3. WHEN yangi buyurtma kelsa THEN real-time ravishda admin panel'da ko'rinishi KERAK
4. IF buyurtma ma'lumotlari noto'g'ri bo'lsa THEN validation xatolari ko'rsatilishi KERAK

### Requirement 4

**User Story:** Foydalanuvchi sifatida, men kitoblarni qidirish va filtrlashni xohlayman, shunda kerakli kitobni tez topa olaman.

#### Acceptance Criteria

1. WHEN qidiruv maydoniga matn kiritsam THEN kitob nomi, muallif va tavsif bo'yicha qidirilishi KERAK
2. WHEN janr bo'yicha filtrlasam THEN faqat tanlangan janrdagi kitoblar ko'rinishi KERAK
3. WHEN narx oralig'ini belgilasam THEN shu oraliqda kitoblar ko'rsatilishi KERAK
4. IF qidiruv natijasi bo'lmasa THEN "Kitob topilmadi" xabari ko'rsatilishi KERAK

### Requirement 5

**User Story:** Tizim administratori sifatida, men loyihaning barcha qismlarini production muhitida ishga tushirishni xohlayman, shunda mijozlar xavfsiz va tez xizmatdan foydalana olsinlar.

#### Acceptance Criteria

1. WHEN loyiha production'ga deploy qilinsa THEN barcha environment variables to'g'ri sozlanishi KERAK
2. WHEN Firebase hosting ishga tushsa THEN SSL sertifikat va custom domain ishlashi KERAK
3. WHEN Firestore security rules qo'llanilsa THEN faqat ruxsat etilgan operatsiyalar bajarilishi KERAK
4. IF production'da xatolik yuz bersa THEN error monitoring va logging ishlashi KERAK

### Requirement 6

**User Story:** Foydalanuvchi sifatida, men savatdagi kitoblarni boshqarishni va buyurtma berishni xohlayman, shunda xarid jarayoni qulay bo'lsin.

#### Acceptance Criteria

1. WHEN kitobni savatga qo'shsam THEN localStorage va Firestore'da saqlanishi KERAK
2. WHEN savatdagi miqdorni o'zgartirsam THEN umumiy narx avtomatik hisoblanishi KERAK
3. WHEN buyurtma bersam THEN barcha ma'lumotlar Firestore'da saqlanishi KERAK
4. IF to'lov ma'lumotlari noto'g'ri bo'lsa THEN validation xatolari ko'rsatilishi KERAK

### Requirement 7

**User Story:** Admin sifatida, men kitoblar, mualliflar va janrlarni boshqarishni xohlayman, shunda katalogni yangilab tura olaman.

#### Acceptance Criteria

1. WHEN yangi kitob qo'shsam THEN barcha majburiy maydonlar to'ldirilishi KERAK
2. WHEN mavjud kitobni tahrirlasam THEN o'zgarishlar darhol saqlashishi KERAK
3. WHEN kitobni o'chirsam THEN tasdiqlash dialog ko'rsatilishi KERAK
4. IF kitob ma'lumotlari noto'g'ri bo'lsa THEN validation xatolari aniq ko'rsatilishi KERAK

### Requirement 8

**User Story:** Foydalanuvchi sifatida, men tizimga ro'yxatdan o'tish va kirishni xohlayman, shunda shaxsiy hisobimni boshqara olaman.

#### Acceptance Criteria

1. WHEN ro'yxatdan o'tsam THEN Firebase Authentication orqali hisob yaratilishi KERAK
2. WHEN tizimga kirsam THEN JWT token yaratilishi va localStorage'da saqlanishi KERAK
3. WHEN parolni unutsam THEN email orqali tiklash imkoniyati bo'lishi KERAK
4. IF authentication ma'lumotlari noto'g'ri bo'lsa THEN tushunarli xabar ko'rsatilishi KERAK