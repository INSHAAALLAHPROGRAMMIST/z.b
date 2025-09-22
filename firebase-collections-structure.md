# Firebase Collections Structure - Zamon Books

## 📚 **Main Collections**

### 1. **books** (Kitoblar)
```javascript
{
  id: "book_001",
  title: "O'tkan kunlar",
  description: "Abdulla Qodiriy asari...",
  price: 45000,
  imageUrl: "https://cloudinary.com/...",
  authorId: "author_001", // Reference to authors collection
  authorName: "Abdulla Qodiriy", // Denormalized for quick access
  genreId: "genre_001", // Reference to genres collection  
  genreName: "Tarixiy roman", // Denormalized
  stock: 25,
  stockStatus: "available", // available, low_stock, out_of_stock
  isbn: "978-9943-01-234-5",
  publishedYear: 1925,
  language: "uz",
  pages: 320,
  slug: "otkan-kunlar-abdulla-qodiriy",
  featured: true, // Homepage'da ko'rsatish uchun
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. **authors** (Mualliflar)
```javascript
{
  id: "author_001",
  name: "Abdulla Qodiriy",
  biography: "1894-yilda tug'ilgan...",
  imageUrl: "https://cloudinary.com/...",
  birthYear: 1894,
  deathYear: 1938,
  nationality: "O'zbek",
  slug: "abdulla-qodiriy",
  booksCount: 12, // Denormalized counter
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3. **genres** (Janrlar)
```javascript
{
  id: "genre_001", 
  name: "Tarixiy roman",
  description: "Tarixiy voqealar asosida...",
  imageUrl: "https://cloudinary.com/...",
  slug: "tarixiy-roman",
  booksCount: 45, // Denormalized counter
  featured: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. **users** (Foydalanuvchilar)
```javascript
{
  id: "user_001", // Firebase Auth UID
  email: "user@example.com",
  displayName: "John Doe",
  photoURL: "https://cloudinary.com/...",
  phone: "+998901234567",
  address: {
    street: "Amir Temur ko'chasi 15",
    city: "Toshkent", 
    region: "Toshkent",
    postalCode: "100000"
  },
  preferences: {
    language: "uz",
    currency: "UZS",
    notifications: true
  },
  role: "customer", // customer, admin, moderator
  createdAt: timestamp,
  updatedAt: timestamp,
  lastLoginAt: timestamp
}
```

### 5. **orders** (Buyurtmalar)
```javascript
{
  id: "order_001",
  userId: "user_001",
  orderNumber: "ZB-2024-001",
  status: "pending", // pending, confirmed, shipped, delivered, cancelled
  items: [
    {
      bookId: "book_001",
      bookTitle: "O'tkan kunlar",
      bookImage: "https://cloudinary.com/...",
      quantity: 2,
      priceAtTimeOfOrder: 45000,
      subtotal: 90000
    }
  ],
  subtotal: 90000,
  shippingCost: 15000,
  total: 105000,
  currency: "UZS",
  shippingAddress: {
    fullName: "John Doe",
    phone: "+998901234567",
    street: "Amir Temur ko'chasi 15",
    city: "Toshkent",
    region: "Toshkent", 
    postalCode: "100000"
  },
  paymentMethod: "cash_on_delivery", // cash_on_delivery, card, click, payme
  paymentStatus: "pending", // pending, paid, failed, refunded
  notes: "Eshik oldiga qo'ying",
  createdAt: timestamp,
  updatedAt: timestamp,
  deliveryDate: timestamp
}
```

### 6. **cart** (Savatcha)
```javascript
{
  id: "cart_001",
  userId: "user_001",
  bookId: "book_001", 
  quantity: 2,
  priceAtTimeOfAdd: 45000,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 7. **wishlist** (Sevimlilar)
```javascript
{
  id: "wishlist_001",
  userId: "user_001",
  bookId: "book_001",
  bookTitle: "O'tkan kunlar", // Denormalized
  bookImage: "https://cloudinary.com/...", // Denormalized
  bookPrice: 45000, // Denormalized
  bookAuthor: "Abdulla Qodiriy", // Denormalized
  addedAt: timestamp
}
```

### 8. **reviews** (Sharhlar) - Kelajakda
```javascript
{
  id: "review_001",
  userId: "user_001",
  bookId: "book_001",
  rating: 5, // 1-5
  title: "Ajoyib kitob!",
  comment: "Juda yoqdi, tavsiya qilaman...",
  helpful: 12, // Necha kishi foydali deb belgilagan
  verified: true, // Kitobni sotib olganmi
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🔥 **Collection Creation Order**

1. **genres** - Birinchi janrlar
2. **authors** - Keyin mualliflar  
3. **books** - Eng oxirida kitoblar (author va genre reference kerak)
4. **users** - Authentication bilan birga
5. **cart, wishlist, orders** - Foydalanuvchilar paydo bo'lgandan keyin

## 🚀 **Next Steps**

1. Firebase console'da birinchi collection yaratamiz
2. Sample data qo'shamiz
3. Security rules yozamiz
4. Migration script ishga tushiramiz