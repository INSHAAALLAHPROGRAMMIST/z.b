// Minimal Seed - Faqat collection'lar hosil bo'lishi uchun
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
    connectFirestoreEmulator(db, '127.0.0.1', 8081);
    console.log('🔥 Connected to Firebase Emulator');
} catch (error) {
    console.log('Emulator already connected');
}

// MINIMAL DATA - faqat collection yaratish uchun

// 1 ta genre
const minimalGenre = {
    id: 'genre_sample',
    name: 'Sample Genre',
    description: 'Sample genre for testing',
    slug: 'sample-genre',
    imageUrl: '',
    booksCount: 1,
    featured: true
};

// 1 ta author  
const minimalAuthor = {
    id: 'author_sample',
    name: 'Sample Author',
    biography: 'Sample author for testing',
    imageUrl: '',
    birthYear: 1900,
    deathYear: null,
    nationality: 'O\'zbek',
    slug: 'sample-author',
    booksCount: 1
};

// 1 ta book (barcha 18 field bilan)
const minimalBook = {
    id: 'book_sample',
    title: 'Sample Book',
    description: 'Sample book for testing all fields',
    price: 10000,
    imageUrl: '',
    authorId: 'author_sample',
    authorName: 'Sample Author',
    genreId: 'genre_sample', 
    genreName: 'Sample Genre',
    stock: 10,
    stockStatus: 'available',
    isbn: '978-0000000000',
    publishedYear: 2024,
    language: 'uz',
    pages: 100,
    slug: 'sample-book',
    featured: false
};

// 1 ta user (admin panel test uchun)
const minimalUser = {
    id: 'user_sample',
    email: 'admin@zamonbooks.uz',
    displayName: 'Admin User',
    photoURL: '',
    phone: '+998901234567',
    address: {
        street: 'Sample Street',
        city: 'Toshkent',
        region: 'Toshkent',
        postalCode: '100000'
    },
    preferences: {
        language: 'uz',
        currency: 'UZS',
        notifications: true
    },
    role: 'admin'
};

// 1 ta order (admin panel uchun)
const minimalOrder = {
    id: 'order_sample',
    userId: 'user_sample',
    orderNumber: 'ZB-2024-001',
    status: 'pending',
    items: [
        {
            bookId: 'book_sample',
            bookTitle: 'Sample Book',
            bookImage: '',
            quantity: 1,
            priceAtTimeOfOrder: 10000,
            subtotal: 10000
        }
    ],
    subtotal: 10000,
    shippingCost: 5000,
    total: 15000,
    currency: 'UZS',
    shippingAddress: {
        fullName: 'Admin User',
        phone: '+998901234567',
        street: 'Sample Street',
        city: 'Toshkent',
        region: 'Toshkent',
        postalCode: '100000'
    },
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'pending',
    notes: 'Sample order for testing'
};

// 1 ta cart item
const minimalCart = {
    id: 'cart_sample',
    userId: 'user_sample',
    bookId: 'book_sample',
    quantity: 1,
    priceAtTimeOfAdd: 10000
};

// 1 ta wishlist item
const minimalWishlist = {
    id: 'wishlist_sample',
    userId: 'user_sample',
    bookId: 'book_sample',
    bookTitle: 'Sample Book',
    bookImage: '',
    bookPrice: 10000,
    bookAuthor: 'Sample Author'
};

// Minimal seed function
async function createMinimalCollections() {
    try {
        console.log('🌱 Creating minimal collections...');
        
        // Genres collection
        await setDoc(doc(db, 'genres', minimalGenre.id), {
            ...minimalGenre,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('✅ Created genres collection');
        
        // Authors collection
        await setDoc(doc(db, 'authors', minimalAuthor.id), {
            ...minimalAuthor,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('✅ Created authors collection');
        
        // Books collection (18 fields)
        await setDoc(doc(db, 'books', minimalBook.id), {
            ...minimalBook,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('✅ Created books collection (18 fields)');
        
        // Users collection
        await setDoc(doc(db, 'users', minimalUser.id), {
            ...minimalUser,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: new Date()
        });
        console.log('✅ Created users collection');
        
        // Orders collection
        await setDoc(doc(db, 'orders', minimalOrder.id), {
            ...minimalOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
            deliveryDate: null
        });
        console.log('✅ Created orders collection');
        
        // Cart collection
        await setDoc(doc(db, 'cart', minimalCart.id), {
            ...minimalCart,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('✅ Created cart collection');
        
        // Wishlist collection
        await setDoc(doc(db, 'wishlist', minimalWishlist.id), {
            ...minimalWishlist,
            addedAt: new Date()
        });
        console.log('✅ Created wishlist collection');
        
        console.log('🎉 All collections created successfully!');
        console.log('📊 Created: 7 collections with 1 sample document each');
        console.log('🌐 View at: http://127.0.0.1:4000/firestore');
        console.log('');
        console.log('🎯 READY FOR:');
        console.log('✅ Admin panel testing');
        console.log('✅ Manual data entry');
        console.log('✅ Code migration');
        console.log('✅ Production deployment');
        
    } catch (error) {
        console.error('❌ Failed to create collections:', error);
    }
}

// Run minimal seed
createMinimalCollections();