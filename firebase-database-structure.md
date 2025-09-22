# Firebase Database Structure - Zamon Books

## 🗂️ **Database Tree Structure**

```
zbdbonfb (Firebase Project)
│
├── 📚 **books** (Collection)
│   └── book_sample (Document)
│       ├── title: "Sample Book"
│       ├── description: "Sample book for testing all fields"
│       ├── price: 10000 (number)
│       ├── imageUrl: "" (string)
│       ├── authorId: "author_sample" (reference)
│       ├── authorName: "Sample Author" (denormalized)
│       ├── genreId: "genre_sample" (reference)
│       ├── genreName: "Sample Genre" (denormalized)
│       ├── stock: 10 (number)
│       ├── stockStatus: "available" (string)
│       ├── isbn: "978-0000000000" (string)
│       ├── publishedYear: 2024 (number)
│       ├── language: "uz" (string)
│       ├── pages: 100 (number)
│       ├── slug: "sample-book" (string)
│       ├── featured: false (boolean)
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── 👨‍💼 **authors** (Collection)
│   └── author_sample (Document)
│       ├── name: "Sample Author"
│       ├── biography: "Sample author for testing"
│       ├── imageUrl: "" (string)
│       ├── birthYear: 1900 (number)
│       ├── deathYear: null
│       ├── nationality: "O'zbek"
│       ├── slug: "sample-author"
│       ├── booksCount: 1 (denormalized counter)
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── 🏷️ **genres** (Collection)
│   └── genre_sample (Document)
│       ├── name: "Sample Genre"
│       ├── description: "Sample genre for testing"
│       ├── slug: "sample-genre"
│       ├── imageUrl: "" (string)
│       ├── booksCount: 1 (denormalized counter)
│       ├── featured: true (boolean)
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── 👥 **users** (Collection)
│   └── user_sample (Document)
│       ├── email: "admin@zamonbooks.uz"
│       ├── displayName: "Admin User"
│       ├── photoURL: "" (string)
│       ├── phone: "+998901234567"
│       ├── address: (map/object)
│       │   ├── street: "Sample Street"
│       │   ├── city: "Toshkent"
│       │   ├── region: "Toshkent"
│       │   └── postalCode: "100000"
│       ├── preferences: (map/object)
│       │   ├── language: "uz"
│       │   ├── currency: "UZS"
│       │   └── notifications: true
│       ├── role: "admin" (string)
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp
│       └── lastLoginAt: timestamp
│
├── 📦 **orders** (Collection)
│   └── order_sample (Document)
│       ├── userId: "user_sample" (reference)
│       ├── orderNumber: "ZB-2024-001"
│       ├── status: "pending" (string)
│       ├── items: (array)
│       │   └── [0]: (map/object)
│       │       ├── bookId: "book_sample"
│       │       ├── bookTitle: "Sample Book"
│       │       ├── bookImage: ""
│       │       ├── quantity: 1
│       │       ├── priceAtTimeOfOrder: 10000
│       │       └── subtotal: 10000
│       ├── subtotal: 10000 (number)
│       ├── shippingCost: 5000 (number)
│       ├── total: 15000 (number)
│       ├── currency: "UZS"
│       ├── shippingAddress: (map/object)
│       │   ├── fullName: "Admin User"
│       │   ├── phone: "+998901234567"
│       │   ├── street: "Sample Street"
│       │   ├── city: "Toshkent"
│       │   ├── region: "Toshkent"
│       │   └── postalCode: "100000"
│       ├── paymentMethod: "cash_on_delivery"
│       ├── paymentStatus: "pending"
│       ├── notes: "Sample order for testing"
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp
│       └── deliveryDate: null
│
├── 🛒 **cart** (Collection)
│   └── cart_sample (Document)
│       ├── userId: "user_sample" (reference)
│       ├── bookId: "book_sample" (reference)
│       ├── quantity: 1 (number)
│       ├── priceAtTimeOfAdd: 10000 (number)
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
└── ❤️ **wishlist** (Collection)
    └── wishlist_sample (Document)
        ├── userId: "user_sample" (reference)
        ├── bookId: "book_sample" (reference)
        ├── bookTitle: "Sample Book" (denormalized)
        ├── bookImage: "" (denormalized)
        ├── bookPrice: 10000 (denormalized)
        ├── bookAuthor: "Sample Author" (denormalized)
        └── addedAt: timestamp
```

## 📊 **Collection Summary**

| Collection | Documents | Purpose | Key Features |
|------------|-----------|---------|--------------|
| **books** | 1 | Kitoblar katalogi | 18 ta field, to'liq ma'lumot |
| **authors** | 1 | Mualliflar | Biography, books count |
| **genres** | 1 | Kitob janrlari | Books count, featured |
| **users** | 1 | Foydalanuvchilar | Address, preferences, roles |
| **orders** | 1 | Buyurtmalar | Items array, shipping info |
| **cart** | 1 | Savatcha | User-book relation |
| **wishlist** | 1 | Sevimlilar | Denormalized book info |

## 🔗 **Relationships**

### **Reference Fields:**
- `books.authorId` → `authors.id`
- `books.genreId` → `genres.id`
- `orders.userId` → `users.id`
- `cart.userId` → `users.id`
- `cart.bookId` → `books.id`
- `wishlist.userId` → `users.id`
- `wishlist.bookId` → `books.id`

### **Denormalized Fields (Performance uchun):**
- `books.authorName` (authors.name dan copy)
- `books.genreName` (genres.name dan copy)
- `authors.booksCount` (books collection'dagi count)
- `genres.booksCount` (books collection'dagi count)
- `wishlist.bookTitle, bookPrice, bookAuthor` (books dan copy)

## ✅ **Structure Validation**

### **✅ YAXSHI JIHATLAR:**
- 🎯 **To'liq e-commerce structure** - barcha kerakli collection'lar
- 📚 **18 ta book field** - to'liq kitob ma'lumotlari
- 🔗 **Proper relationships** - reference va denormalization
- 👤 **User management** - roles, preferences
- 📦 **Order system** - to'liq buyurtma jarayoni
- 🛒 **Cart & Wishlist** - foydalanuvchi tajribasi

### **🎯 ADMIN PANEL UCHUN TAYYOR:**
- ✅ Books CRUD operations
- ✅ Authors management  
- ✅ Genres management
- ✅ Users management
- ✅ Orders tracking
- ✅ Inventory management

### **🚀 PRODUCTION READY:**
- ✅ Scalable structure
- ✅ Performance optimized (denormalization)
- ✅ Security ready (roles)
- ✅ Analytics ready (timestamps)

## 🎉 **XULOSA: HAMMASI JOYIDA!** ✅

Database structure **professional e-commerce** loyiha uchun **mukammal** tuzilgan!