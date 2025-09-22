// Firebase Sample Data Seeder
import { db, COLLECTIONS } from '../firebaseConfig';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// 1. GENRES Collection - Sample Data
const sampleGenres = [
  {
    // Core fields
    name: "Badiiy adabiyot",
    description: "Roman, hikoya va boshqa badiiy asarlar",
    slug: "badiiy-adabiyot",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/v1/genres/badiiy-adabiyot.jpg",

    // Firebase optimizations
    booksCount: 0,
    featured: true,
    isActive: true,

    // Search optimization
    searchKeywords: ["badiiy", "adabiyot", "roman", "hikoya"],

    // Analytics
    viewCount: 0,
    popularityScore: 85,

    // Firebase timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

// 2. AUTHORS Collection - Sample Data
const sampleAuthors = [
  {
    // Core fields
    name: "Abdulla Qodiriy",
    biography: "O'zbek adabiyotining asoschisi, taniqli yozuvchi va jadidchilik harakatining faol ishtirokchisi. 1894-yilda Toshkentda tug'ilgan.",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/v1/authors/qodiriy.jpg",
    slug: "abdulla-qodiriy",

    // Author details
    birthYear: 1894,
    deathYear: 1938,
    nationality: "O'zbek",
    birthPlace: "Toshkent",

    // Firebase optimizations
    booksCount: 0,
    isActive: true,

    // Search optimization
    searchKeywords: ["abdulla", "qodiriy", "uzbek", "writer", "jadid"],

    // Social media
    socialLinks: {
      wikipedia: "https://uz.wikipedia.org/wiki/Abdulla_Qodiriy",
      goodreads: "",
      instagram: ""
    },

    // Analytics
    viewCount: 0,
    popularityScore: 95,

    // Firebase timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

// 3. BOOKS Collection - Sample Data (Eng muhim)
const sampleBooks = [
  {
    // Core book info
    title: "O'tkan kunlar",
    description: "O'zbek adabiyotining eng mashhur romanlaridan biri. Jadidchilik harakati va o'zbek xalqining tarixiy o'tmishi haqida chuqur hikoya. Bu asar o'zbek milliy uyg'onish davrining muhim voqealarini aks ettiradi.",
    price: 45000,
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/v1/books/otkan-kunlar.jpg",
    slug: "otkan-kunlar-abdulla-qodiriy",

    // References (will be updated after creating authors/genres)
    authorId: "temp_author_id",
    authorName: "Abdulla Qodiriy",
    genreId: "temp_genre_id",
    genreName: "Badiiy adabiyot",

    // Book details
    isbn: "978-9943-01-234-5",
    publishedYear: 1925,
    language: "uz",
    pages: 320,
    publisher: "O'zbekiston",
    edition: "3-nashr",

    // Inventory management
    stock: 25,
    stockStatus: "available",
    minStockLevel: 5,
    maxStockLevel: 100,

    // Visibility & Admin
    isAvailable: true,
    featured: true,
    isNewArrival: false,
    isFeatured: true,
    adminPriority: 95,
    visibility: "visible",

    // Analytics & Performance
    salesCount: 120,
    viewCount: 1500,
    demandScore: 95,
    rating: 4.8,
    reviewCount: 45,

    // Search optimization
    searchKeywords: ["otkan", "kunlar", "qodiriy", "tarix", "jadid", "uzbek"],

    // Pre-order & Waitlist
    allowPreOrder: true,
    enableWaitlist: true,
    preOrderCount: 0,
    waitlistCount: 0,
    expectedRestockDate: null,

    // Pricing & Discounts
    originalPrice: 45000,
    discountPercent: 0,
    discountEndDate: null,

    // Firebase timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastViewedAt: serverTimestamp()
  }
];

// 4. USERS Collection - Sample Data (Admin User)
const sampleUsers = [
  {
    // Firebase Auth integration
    uid: "admin_user_001",
    email: "admin@zamonbooks.uz",
    displayName: "Admin User",
    photoURL: "https://res.cloudinary.com/dcn4maral/image/upload/v1/users/admin-avatar.jpg",
    emailVerified: true,

    // Additional user info
    phone: "+998901234567",
    dateOfBirth: null,
    gender: "other",

    // Address
    address: {
      street: "Amir Temur ko'chasi 15",
      city: "Toshkent",
      region: "Toshkent viloyati",
      postalCode: "100000",
      country: "Uzbekistan",
      isDefault: true
    },

    // User preferences
    preferences: {
      language: "uz",
      currency: "UZS",
      notifications: {
        email: true,
        sms: true,
        push: true,
        telegram: true
      },
      theme: "dark",
      newsletter: true
    },

    // Role & Permissions
    role: "admin",
    isAdmin: true,
    permissions: ["books:read", "books:write", "books:delete", "users:read", "users:write", "orders:read", "orders:write", "analytics:read"],

    // User activity
    lastLoginAt: serverTimestamp(),
    loginCount: 1,
    isActive: true,

    // Shopping behavior
    totalOrders: 0,
    totalSpent: 0,
    favoriteGenres: ["badiiy-adabiyot"],

    // Firebase timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

// 5. ORDERS Collection - Sample Data
const sampleOrders = [
  {
    // Order identification
    orderNumber: "ZB-2024-001",
    userId: "admin_user_001",

    // Order status
    status: "pending",
    paymentStatus: "pending",

    // Order items
    items: [
      {
        bookId: "temp_book_id",
        bookTitle: "O'tkan kunlar",
        bookImage: "https://res.cloudinary.com/dcn4maral/image/upload/v1/books/otkan-kunlar.jpg",
        bookAuthor: "Abdulla Qodiriy",
        quantity: 1,
        priceAtTimeOfOrder: 45000,
        subtotal: 45000
      }
    ],

    // Pricing
    subtotal: 45000,
    shippingCost: 15000,
    tax: 0,
    discount: 0,
    total: 60000,
    currency: "UZS",

    // Shipping info
    shippingAddress: {
      fullName: "Admin User",
      phone: "+998901234567",
      email: "admin@zamonbooks.uz",
      street: "Amir Temur ko'chasi 15",
      city: "Toshkent",
      region: "Toshkent",
      postalCode: "100000",
      country: "Uzbekistan",
      deliveryInstructions: "Eshik oldiga qo'ying"
    },

    // Payment info
    paymentMethod: "cash_on_delivery",
    paymentDetails: {
      cardLast4: "",
      transactionId: "",
      paymentGateway: ""
    },

    // Delivery tracking
    trackingNumber: "",
    estimatedDeliveryDate: null,
    actualDeliveryDate: null,
    deliveryNotes: "",

    // Customer notes
    notes: "Test buyurtma",
    adminNotes: "Sample order for testing",

    // Firebase timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    confirmedAt: null,
    shippedAt: null,
    deliveredAt: null
  }
];

// 6. CART Collection - Sample Data
const sampleCart = [
  {
    // User & Book reference
    userId: "admin_user_001",
    bookId: "temp_book_id",

    // Cart item details
    quantity: 1,
    priceAtTimeOfAdd: 45000,

    // Denormalized book info
    bookTitle: "O'tkan kunlar",
    bookImage: "https://res.cloudinary.com/dcn4maral/image/upload/v1/books/otkan-kunlar.jpg",
    bookAuthor: "Abdulla Qodiriy",
    bookPrice: 45000,
    bookStock: 25,
    bookAvailable: true,

    // Cart metadata
    sessionId: "session_001",
    deviceId: "device_001",

    // Firebase timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
];

// 7. WISHLIST Collection - Sample Data
const sampleWishlist = [
  {
    // User & Book reference
    userId: "admin_user_001",
    bookId: "temp_book_id",

    // Denormalized book info
    bookTitle: "O'tkan kunlar",
    bookImage: "https://res.cloudinary.com/dcn4maral/image/upload/v1/books/otkan-kunlar.jpg",
    bookPrice: 45000,
    bookAuthor: "Abdulla Qodiriy",
    bookGenre: "Badiiy adabiyot",
    bookAvailable: true,
    bookStock: 25,

    // Wishlist metadata
    priority: 5,
    notes: "Juda yaxshi kitob",
    priceAlert: true,
    stockAlert: true,

    // Notifications
    notificationSent: false,
    lastNotificationAt: null,

    // Firebase timestamps
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

// Firebase'ga sample data qo'shish - OPTIMIZED ORDER
export const seedFirebaseData = async () => {
  try {
    console.log('🔥 Firebase Collections yaratilmoqda...');

    let createdCollections = {
      genres: 0,
      authors: 0,
      books: 0,
      users: 0,
      orders: 0,
      cart: 0,
      wishlist: 0
    };

    // 1. GENRES Collection (Birinchi)
    console.log('🏷️ GENRES collection yaratilmoqda...');
    const genreRefs = [];
    for (const genre of sampleGenres) {
      const genreRef = await addDoc(collection(db, COLLECTIONS.GENRES), genre);
      genreRefs.push({ id: genreRef.id, name: genre.name });
      createdCollections.genres++;
      console.log(`✅ Genre yaratildi: ${genre.name} (ID: ${genreRef.id})`);
    }

    // 2. AUTHORS Collection (Ikkinchi)
    console.log('👤 AUTHORS collection yaratilmoqda...');
    const authorRefs = [];
    for (const author of sampleAuthors) {
      const authorRef = await addDoc(collection(db, COLLECTIONS.AUTHORS), author);
      authorRefs.push({ id: authorRef.id, name: author.name });
      createdCollections.authors++;
      console.log(`✅ Author yaratildi: ${author.name} (ID: ${authorRef.id})`);
    }

    // 3. BOOKS Collection (Uchinchi - references bilan)
    console.log('📚 BOOKS collection yaratilmoqda...');
    const bookRefs = [];
    for (const book of sampleBooks) {
      // Real IDs bilan yangilash
      const updatedBook = {
        ...book,
        authorId: authorRefs[0].id, // Abdulla Qodiriy
        genreId: genreRefs[0].id    // Badiiy adabiyot
      };

      const bookRef = await addDoc(collection(db, COLLECTIONS.BOOKS), updatedBook);
      bookRefs.push({ id: bookRef.id, title: book.title });
      createdCollections.books++;
      console.log(`✅ Book yaratildi: ${book.title} (ID: ${bookRef.id})`);
    }

    // 4. USERS Collection (To'rtinchi)
    console.log('👥 USERS collection yaratilmoqda...');
    const userRefs = [];
    for (const user of sampleUsers) {
      // Document ID sifatida UID ishlatish
      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), user);
      userRefs.push({ id: user.uid, name: user.displayName });
      createdCollections.users++;
      console.log(`✅ User yaratildi: ${user.displayName} (ID: ${user.uid})`);
    }

    // 5. ORDERS Collection (Beshinchi)
    console.log('📦 ORDERS collection yaratilmoqda...');
    for (const order of sampleOrders) {
      // Real book ID bilan yangilash
      const updatedOrder = {
        ...order,
        items: order.items.map(item => ({
          ...item,
          bookId: bookRefs[0].id
        }))
      };

      const orderRef = await addDoc(collection(db, COLLECTIONS.ORDERS), updatedOrder);
      createdCollections.orders++;
      console.log(`✅ Order yaratildi: ${order.orderNumber} (ID: ${orderRef.id})`);
    }

    // 6. CART Collection (Oltinchi)
    console.log('🛒 CART collection yaratilmoqda...');
    for (const cartItem of sampleCart) {
      // Real book ID bilan yangilash
      const updatedCartItem = {
        ...cartItem,
        bookId: bookRefs[0].id
      };

      const cartRef = await addDoc(collection(db, COLLECTIONS.CART), updatedCartItem);
      createdCollections.cart++;
      console.log(`✅ Cart item yaratildi (ID: ${cartRef.id})`);
    }

    // 7. WISHLIST Collection (Yettinchi)
    console.log('❤️ WISHLIST collection yaratilmoqda...');
    for (const wishlistItem of sampleWishlist) {
      // Real book ID bilan yangilash
      const updatedWishlistItem = {
        ...wishlistItem,
        bookId: bookRefs[0].id
      };

      const wishlistRef = await addDoc(collection(db, COLLECTIONS.WISHLIST), updatedWishlistItem);
      createdCollections.wishlist++;
      console.log(`✅ Wishlist item yaratildi (ID: ${wishlistRef.id})`);
    }

    const result = {
      success: true,
      message: 'Firebase Collections muvaffaqiyatli yaratildi!',
      data: createdCollections,
      references: {
        genres: genreRefs,
        authors: authorRefs,
        books: bookRefs,
        users: userRefs
      }
    };

    console.log('🎉 Firebase Collections setup tugadi!');
    console.log('📊 Yaratilgan collections:', createdCollections);
    console.log('🔗 References:', result.references);

    return result;

  } catch (error) {
    console.error('❌ Firebase Collections yaratishda xato:', error);
    throw error;
  }
};

// Test data yaratish funksiyasi
export const createTestData = async () => {
  try {
    console.log('🧪 Test data yaratilmoqda...');

    // Kichik test data set
    const testBook = {
      title: "Test Kitob",
      authorName: "Test Muallif",
      description: "Bu test uchun yaratilgan kitob",
      price: 15000,
      genre: "Test Janr",
      imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/v1/books/test-book.jpg",
      isAvailable: true,
      stock: 5,
      salesCount: 0,
      demandScore: 50,
      adminPriority: 5,
      isNewArrival: true,
      isFeatured: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await addDoc(collection(db, COLLECTIONS.BOOKS), testBook);
    console.log('✅ Test kitob qo\'shildi');

    return {
      success: true,
      message: 'Test data muvaffaqiyatli yaratildi',
      data: { books: 1, total: 1 }
    };

  } catch (error) {
    console.error('❌ Test data yaratishda xato:', error);
    throw error;
  }
};

// Development uchun global qilish
if (import.meta.env.DEV) {
  window.seedFirebaseData = seedFirebaseData;
  window.createTestData = createTestData;

  // Auto-run on load
  console.log('🔥 Firebase Seed functions loaded!');
  console.log('📋 Available functions:');
  console.log('   - window.seedFirebaseData() - Full setup');
  console.log('   - window.createTestData() - Quick test');
}