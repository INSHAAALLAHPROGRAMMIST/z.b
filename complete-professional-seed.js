// COMPLETE Professional Firebase Seed - BARCHA FIELDLAR
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
    projectId: "zbdbonfb",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Emulator connect
try {
    connectFirestoreEmulator(db, '127.0.0.1', 8765);
    console.log('🔥 Connected to Firebase Emulator');
} catch (error) {
    console.log('Emulator already connected');
}

// COMPLETE DATA - BARCHA PROFESSIONAL FIELDLAR

// 1. GENRES - To'liq
const completeGenres = [
    {
        id: 'genre_001',
        name: 'Tarixiy roman',
        description: 'Tarixiy voqealar asosida yozilgan badiiy asarlar',
        slug: 'tarixiy-roman',
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/genre-historical.jpg',
        booksCount: 2,
        featured: true
    },
    {
        id: 'genre_002',
        name: 'Zamonaviy adabiyot',
        description: 'Hozirgi zamon muammolarini aks ettiruvchi asarlar',
        slug: 'zamonaviy-adabiyot',
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/genre-modern.jpg',
        booksCount: 1,
        featured: true
    }
];

// 2. AUTHORS - To'liq
const completeAuthors = [
    {
        id: 'author_001',
        name: 'Abdulla Qodiriy',
        biography: 'O\'zbek adabiyotining buyuk vakili, tarixiy roman janrining asoschisi',
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/author-qodiriy.jpg',
        birthYear: 1894,
        deathYear: 1938,
        nationality: 'O\'zbek',
        slug: 'abdulla-qodiriy',
        booksCount: 2
    },
    {
        id: 'author_002',
        name: 'Oybek',
        biography: 'O\'zbek sovet adabiyotining yirik vakili, shoir va yozuvchi',
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/author-oybek.jpg',
        birthYear: 1905,
        deathYear: 1968,
        nationality: 'O\'zbek',
        slug: 'oybek',
        booksCount: 1
    }
];

// 3. BOOKS - BARCHA PROFESSIONAL FIELDLAR (25+ fields!)
const completeBooks = [
    {
        id: 'book_001',
        // Basic Info
        title: "O'tkan kunlar",
        description: "XIX asr oxiri va XX asr boshlarida O'zbekistonda sodir bo'lgan ijtimoiy-siyosiy voqealarni aks ettiruvchi tarixiy roman",
        price: 45000,
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-otkan-kunlar.jpg',
        
        // Relations
        authorId: 'author_001',
        authorName: 'Abdulla Qodiriy',
        genreId: 'genre_001',
        genreName: 'Tarixiy roman',
        
        // Inventory
        stock: 25,
        stockStatus: 'available',
        
        // Publishing Info
        isbn: '978-9943-01-234-5',
        publishedYear: 1925,
        language: 'uz',
        pages: 320,
        
        // SEO & Display
        slug: 'otkan-kunlar-abdulla-qodiriy',
        featured: true,
        
        // ADVANCED E-COMMERCE FIELDS
        isNewArrival: false,
        allowPreOrder: false,
        enableWaitlist: true,
        preOrderCount: 0,
        waitlistCount: 5,
        expectedRestockDate: null,
        visibility: 'public', // public, private, draft
        showWhenDiscontinued: false,
        adminPriority: 10,
        demandScore: 85,
        
        // Additional Business Fields
        discountPercentage: 0,
        originalPrice: 45000,
        isDiscounted: false,
        tags: ['klassik', 'tarixiy', 'o\'zbek'],
        weight: 0.5, // kg
        dimensions: {
            length: 20, // cm
            width: 14,
            height: 2
        },
        condition: 'new', // new, used, refurbished
        ageRating: 'all', // all, 12+, 16+, 18+
        availability: 'in_stock' // in_stock, out_of_stock, pre_order, discontinued
    },
    {
        id: 'book_002',
        title: "Mehrobdan chayon",
        description: "Abdulla Qodiriyning yana bir mashhur asari, o'zbek xalqining tarixiy o'tmishini aks ettiradi",
        price: 38000,
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-mehrobdan-chayon.jpg',
        
        authorId: 'author_001',
        authorName: 'Abdulla Qodiriy',
        genreId: 'genre_001',
        genreName: 'Tarixiy roman',
        
        stock: 5,
        stockStatus: 'low_stock',
        
        isbn: '978-9943-01-235-2',
        publishedYear: 1928,
        language: 'uz',
        pages: 280,
        
        slug: 'mehrobdan-chayon-abdulla-qodiriy',
        featured: true,
        
        // Advanced fields
        isNewArrival: false,
        allowPreOrder: true,
        enableWaitlist: true,
        preOrderCount: 12,
        waitlistCount: 8,
        expectedRestockDate: new Date('2025-02-15'),
        visibility: 'public',
        showWhenDiscontinued: false,
        adminPriority: 9,
        demandScore: 78,
        
        discountPercentage: 10,
        originalPrice: 42000,
        isDiscounted: true,
        tags: ['klassik', 'tarixiy', 'chegirma'],
        weight: 0.4,
        dimensions: {
            length: 19,
            width: 13,
            height: 1.8
        },
        condition: 'new',
        ageRating: 'all',
        availability: 'low_stock'
    },
    {
        id: 'book_003',
        title: "Navoiy",
        description: "Alisher Navoiy haqidagi tarixiy roman, buyuk shoir va mutafakkir hayoti haqida",
        price: 52000,
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-navoiy.jpg',
        
        authorId: 'author_002',
        authorName: 'Oybek',
        genreId: 'genre_002',
        genreName: 'Zamonaviy adabiyot',
        
        stock: 0,
        stockStatus: 'out_of_stock',
        
        isbn: '978-9943-01-236-9',
        publishedYear: 1945,
        language: 'uz',
        pages: 450,
        
        slug: 'navoiy-oybek',
        featured: false,
        
        // Advanced fields
        isNewArrival: true,
        allowPreOrder: true,
        enableWaitlist: true,
        preOrderCount: 25,
        waitlistCount: 15,
        expectedRestockDate: new Date('2025-01-20'),
        visibility: 'public',
        showWhenDiscontinued: false,
        adminPriority: 8,
        demandScore: 92,
        
        discountPercentage: 0,
        originalPrice: 52000,
        isDiscounted: false,
        tags: ['yangi', 'mashhur', 'navoiy'],
        weight: 0.7,
        dimensions: {
            length: 22,
            width: 15,
            height: 2.5
        },
        condition: 'new',
        ageRating: 'all',
        availability: 'pre_order'
    }
];

// 4. USERS - Professional
const completeUsers = [
    {
        id: 'user_admin',
        email: 'admin@zamonbooks.uz',
        displayName: 'Super Admin',
        photoURL: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/admin-avatar.jpg',
        phone: '+998901234567',
        address: {
            street: 'Amir Temur ko\'chasi 15',
            city: 'Toshkent',
            region: 'Toshkent',
            postalCode: '100000',
            country: 'Uzbekistan'
        },
        preferences: {
            language: 'uz',
            currency: 'UZS',
            notifications: true,
            theme: 'light',
            emailMarketing: true
        },
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'manage_users', 'manage_orders'],
        isActive: true,
        isVerified: true,
        lastLoginIP: '192.168.1.1',
        loginCount: 150,
        totalSpent: 0,
        orderCount: 0
    },
    {
        id: 'user_customer',
        email: 'customer@example.com',
        displayName: 'Test Customer',
        photoURL: '',
        phone: '+998901234568',
        address: {
            street: 'Mustaqillik ko\'chasi 25',
            city: 'Samarqand',
            region: 'Samarqand',
            postalCode: '140000',
            country: 'Uzbekistan'
        },
        preferences: {
            language: 'uz',
            currency: 'UZS',
            notifications: true,
            theme: 'light',
            emailMarketing: false
        },
        role: 'customer',
        permissions: ['read'],
        isActive: true,
        isVerified: true,
        lastLoginIP: '192.168.1.100',
        loginCount: 25,
        totalSpent: 125000,
        orderCount: 3
    }
];

// 5. ORDERS - Complete E-commerce
const completeOrders = [
    {
        id: 'order_001',
        userId: 'user_customer',
        orderNumber: 'ZB-2025-001',
        status: 'delivered', // pending, confirmed, processing, shipped, delivered, cancelled, refunded
        items: [
            {
                bookId: 'book_001',
                bookTitle: "O'tkan kunlar",
                bookImage: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-otkan-kunlar.jpg',
                quantity: 2,
                priceAtTimeOfOrder: 45000,
                subtotal: 90000,
                discountApplied: 0
            }
        ],
        subtotal: 90000,
        discountAmount: 0,
        discountCode: null,
        shippingCost: 15000,
        tax: 0,
        total: 105000,
        currency: 'UZS',
        
        // Shipping Info
        shippingAddress: {
            fullName: 'Test Customer',
            phone: '+998901234568',
            street: 'Mustaqillik ko\'chasi 25',
            city: 'Samarqand',
            region: 'Samarqand',
            postalCode: '140000',
            country: 'Uzbekistan'
        },
        shippingMethod: 'standard', // standard, express, pickup
        
        // Payment Info
        paymentMethod: 'cash_on_delivery', // cash_on_delivery, card, click, payme, uzcard
        paymentStatus: 'paid', // pending, paid, failed, refunded, partially_refunded
        paymentId: null,
        
        // Tracking
        trackingNumber: 'ZB2025001TRK',
        estimatedDelivery: new Date('2025-01-15'),
        actualDelivery: new Date('2025-01-14'),
        
        // Additional
        notes: 'Eshik oldiga qo\'ying',
        internalNotes: 'VIP customer',
        source: 'website', // website, mobile_app, phone, admin
        
        // Timestamps
        orderDate: new Date('2025-01-10'),
        confirmedAt: new Date('2025-01-10T10:30:00'),
        shippedAt: new Date('2025-01-12T14:00:00'),
        deliveredAt: new Date('2025-01-14T16:30:00')
    }
];

// 6. CART - Enhanced
const completeCarts = [
    {
        id: 'cart_001',
        userId: 'user_customer',
        bookId: 'book_002',
        quantity: 1,
        priceAtTimeOfAdd: 38000,
        discountApplied: 3800, // 10% discount
        finalPrice: 34200,
        addedVia: 'website', // website, mobile_app
        sessionId: 'sess_123456789'
    }
];

// 7. WISHLIST - Enhanced
const completeWishlists = [
    {
        id: 'wishlist_001',
        userId: 'user_customer',
        bookId: 'book_003',
        bookTitle: 'Navoiy',
        bookImage: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-navoiy.jpg',
        bookPrice: 52000,
        bookAuthor: 'Oybek',
        bookAvailability: 'pre_order',
        notifyWhenAvailable: true,
        priority: 'high' // high, medium, low
    }
];

// COMPLETE SEED FUNCTION
async function createCompleteDatabase() {
    try {
        console.log('🚀 Creating COMPLETE professional database...');
        
        // 1. Genres
        console.log('🏷️ Creating genres...');
        for (const genre of completeGenres) {
            const { id, ...genreData } = genre;
            await setDoc(doc(db, 'genres', id), {
                ...genreData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Created genre: ${genre.name}`);
        }
        
        // 2. Authors
        console.log('👨‍💼 Creating authors...');
        for (const author of completeAuthors) {
            const { id, ...authorData } = author;
            await setDoc(doc(db, 'authors', id), {
                ...authorData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Created author: ${author.name}`);
        }
        
        // 3. Books (25+ fields!)
        console.log('📚 Creating books with ALL professional fields...');
        for (const book of completeBooks) {
            const { id, ...bookData } = book;
            await setDoc(doc(db, 'books', id), {
                ...bookData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Created book: ${book.title} (${Object.keys(bookData).length + 2} fields)`);
        }
        
        // 4. Users
        console.log('👥 Creating users...');
        for (const user of completeUsers) {
            const { id, ...userData } = user;
            await setDoc(doc(db, 'users', id), {
                ...userData,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: new Date()
            });
            console.log(`✅ Created user: ${user.displayName} (${user.role})`);
        }
        
        // 5. Orders
        console.log('📦 Creating orders...');
        for (const order of completeOrders) {
            const { id, ...orderData } = order;
            await setDoc(doc(db, 'orders', id), {
                ...orderData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Created order: ${order.orderNumber}`);
        }
        
        // 6. Cart
        console.log('🛒 Creating cart items...');
        for (const cart of completeCarts) {
            const { id, ...cartData } = cart;
            await setDoc(doc(db, 'cart', id), {
                ...cartData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Created cart item`);
        }
        
        // 7. Wishlist
        console.log('❤️ Creating wishlist items...');
        for (const wishlist of completeWishlists) {
            const { id, ...wishlistData } = wishlist;
            await setDoc(doc(db, 'wishlist', id), {
                ...wishlistData,
                addedAt: new Date()
            });
            console.log(`✅ Created wishlist item`);
        }
        
        console.log('🎉 COMPLETE PROFESSIONAL DATABASE CREATED!');
        console.log('');
        console.log('📊 CREATED:');
        console.log(`   📚 ${completeBooks.length} books (25+ fields each)`);
        console.log(`   👨‍💼 ${completeAuthors.length} authors`);
        console.log(`   🏷️ ${completeGenres.length} genres`);
        console.log(`   👥 ${completeUsers.length} users`);
        console.log(`   📦 ${completeOrders.length} orders`);
        console.log(`   🛒 ${completeCarts.length} cart items`);
        console.log(`   ❤️ ${completeWishlists.length} wishlist items`);
        console.log('');
        console.log('🌐 View at: http://127.0.0.1:4000/firestore');
        console.log('');
        console.log('🎯 PROFESSIONAL FEATURES INCLUDED:');
        console.log('✅ Pre-order system');
        console.log('✅ Waitlist management');
        console.log('✅ New arrivals tracking');
        console.log('✅ Advanced inventory');
        console.log('✅ Discount system');
        console.log('✅ Admin prioritization');
        console.log('✅ Demand analytics');
        console.log('✅ Complete order tracking');
        console.log('✅ User permissions');
        console.log('✅ Professional e-commerce ready!');
        
    } catch (error) {
        console.error('❌ Failed to create database:', error);
    }
}

// Run complete seed
createCompleteDatabase();