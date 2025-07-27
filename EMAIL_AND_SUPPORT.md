# Email Unique va Support System

## Email Unique System

### Appwrite Built-in
- ✅ Appwrite avtomatik email unique'likni ta'minlaydi
- ✅ Bir email bilan faqat bitta hisob ochish mumkin
- ✅ Register paytida duplicate email xatosi

### Qo'shimcha Validation
- ✅ Email format tekshirish
- ✅ Aniq xato xabarlari
- ✅ User-friendly messages

### Xato Xabarlari:
- **Email mavjud**: "Bu email allaqachon ro'yxatdan o'tgan. Login qilishni urinib ko'ring."
- **Format xato**: "Email format noto'g'ri. To'g'ri format: example@domain.com"
- **Login xato**: "Email yoki parol noto'g'ri. Qaytadan urinib ko'ring."

## Support System

### Parol Unutish
- ❌ **Appwrite'da parol reset yo'q** (Auth API limitation)
- ✅ **Admin contact** orqali yordam
- ✅ **Telegram admin** bilan bog'lanish

### Admin Contact
- **Telegram**: `@the_palestine`
- **Xabar**: "Agar parolni eslay olmasangiz, admin bilan bog'laning:"

### Environment Variables
```env
VITE_ADMIN_TELEGRAM=@the_palestine
VITE_SUPPORT_MESSAGE=Agar parolni eslay olmasangiz, admin bilan bog'laning:
VITE_TELEGRAM_BOT_TOKEN=your_bot_token
VITE_TELEGRAM_CHAT_ID=your_chat_id
```

## Telegram Integration

### Bot Configuration
- ✅ Bot token .env'da
- ✅ Chat ID .env'da
- ✅ Xavfsiz va o'zgartirilishi oson

### Order Notifications
- ✅ Yangi buyurtma admin'ga yuboriladi
- ✅ User ma'lumotlari bilan
- ✅ Telegram username ko'rsatiladi

## User Experience

### Register Flow:
1. Email format tekshirish
2. Parol validation (8+ belgi)
3. Parol tasdiqlash
4. Appwrite unique email tekshirish
5. Aniq xato xabarlari

### Login Flow:
1. Email format tekshirish
2. Credentials validation
3. "Parolni unutdingizmi?" tugmasi
4. Admin contact modal

### Parol Unutish Flow:
1. "Parolni unutdingizmi?" tugmasini bosish
2. Admin contact modal ochiladi
3. Telegram username ko'rsatiladi
4. Yordam so'rash yo'riqnomasi

## Xavfsizlik

- 🛡️ **Email unique** - duplicate'lar yo'q
- 🛡️ **Parol validation** - 8+ belgi
- 🛡️ **Admin contact** - xavfsiz reset
- 🛡️ **Environment variables** - sensitive data himoyalangan

---

**Natija:** Professional email system va user-friendly support! 📧✨