# Hybrid User System

Bu loyihada **Hybrid User System** ishlatiladi - Auth va Database'ning afzalliklarini birlashtiradi.

## Arxitektura

### 1. **Auth (Asosiy ma'lumotlar)**
- User credentials (email, password)
- User preferences (telegram_username, phone, address)
- Admin labels (faqat Console orqali)
- Session management

### 2. **Database (Admin funksiyalar)**
- User list va search
- Order'larda user ma'lumotlari
- Admin dashboard statistics
- User management

## Ma'lumotlar Sync

### Register/Login paytida:
1. ✅ **Auth'da** user yaratiladi/login qilinadi
2. ✅ **Preferences'da** qo'shimcha ma'lumotlar saqlanadi
3. ✅ **Database'da** unique sync qilinadi (duplicate'siz)

### Unique Sync:
- `userId` (Auth ID) unique key sifatida ishlatiladi
- Duplicate'lar avtomatik oldini olinadi
- Mavjud user'lar yangilanadi, yangi user'lar yaratiladi

## Foydalanish

### User ma'lumotlari olish:
```javascript
// Auth'dan (tez va xavfsiz)
const user = await account.get();
const prefs = user.prefs;

// Database'dan (admin funksiyalar uchun)
const dbUser = await getUserByAuthId(user.$id);
```

### Admin tekshirish:
```javascript
// Auth labels (asosiy)
const isAdmin = user.labels?.includes('admin');

// Database role (qo'shimcha)
const dbAdmin = dbUser.role === 'admin';
```

## Afzalliklari

### ✅ **Auth afzalliklari:**
- Xavfsizlik va session management
- Built-in authentication
- Preferences saqlash
- Server-side labels

### ✅ **Database afzalliklari:**
- Search va pagination
- Complex queries
- Admin dashboard
- User management

### ✅ **Unique Sync:**
- Duplicate'lar yo'q
- Consistent ma'lumotlar
- Automatic synchronization
- Error handling

## Xavfsizlik

- 🛡️ **Auth** - credentials va session
- 🛡️ **Database** - faqat public ma'lumotlar
- 🛡️ **Admin labels** - faqat Console orqali
- 🛡️ **Unique constraint** - duplicate'lar yo'q

## Maintenance

### Duplicate tozalash:
```javascript
// Browser console'da
const { cleanupAllDuplicates } = await import('./src/utils/uniqueUserSync.js');
await cleanupAllDuplicates();
```

### Database Index:
Appwrite Console > Database > Users Collection > Indexes:
- Key: `userId`
- Type: `unique`
- Order: `ASC`

---

**Natija:** Eng yaxshi ikki dunyodan - Auth'ning xavfsizligi va Database'ning funksionalligi! 🚀