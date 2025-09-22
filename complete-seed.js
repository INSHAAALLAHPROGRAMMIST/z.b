// Complete Firebase Seed Script - BARCHA COLLECTIONS
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';

// Firebase config (emulator uchun)
const firebaseConfig = {
    projectId: "zbdbonfb",
};

// Firebase app initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Emulator'ga connect qilish
try {
    connectFirestoreEmulator(db, '127.0.0.1', 8081);
    console.log('🔥 Connected to Firestore Emulator');
} catch (error) {
    console.log('Emulator already connected');
}

// 1. GENRES COLLECTION
const sampleGenres = [
    {
        id: 'genre_001',
        name: 'Tarixiy roman',
        description: 'Tarixiy voqealar asosida yozilgan badiiy asarlar',
        slug: 'tarixiy-roman',
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/genre-historical.jpg',
        booksCount: 3,
        featured: true
    },
    {
        id: 'genre_002',
        name: 'Zamonaviy adabiyot',
        description: 'Hozirgi zamon muammolarini aks ettiruvchi asarlar',
        slug: 'zamonaviy-adabiyot',
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/genre-modern.jpg',
        booksCount: 0,
        featured: true
    }
];

// 2. AUTHORS COLLECTION
const sampleAuthors = [
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

// 3. BOOKS COLLECTION - BARCHA 18 TA FIELD!
const sampleBooks = [
    {
        id: 'book_001',
        title: "O'tkan kunlar",
        description: "XIX asr oxiri va XX asr boshlarida O'zbekistonda sodir bo'lgan ijtimoiy-siyosiy voqealarni aks ettiruvchi tarixiy roman",
        price: 45000,
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-otkan-kunlar.jpg',
        authorId: 'author_001',
        authorName: 'Abdulla Qodiriy',
        genreId: 'genre_001',
        genreName: 'Tarixiy roman',
        stock: 25,
        stockStatus: 'available',
        isbn: '978-9943-01-234-5',
        publishedYear: 1925,
        language: 'uz',
        pages: 320,
        slug: 'otkan-kunlar-abdulla-qodiriy',
        featured: true
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
        stock: 15,
        stockStatus: 'low_stock',
        isbn: '978-9943-01-235-2',
        publishedYear: 1928,
        language: 'uz',
        pages: 280,
        slug: 'mehrobdan-chayon-abdulla-qodiriy',
        featured: true
    },
    {
        id: 'book_003',
        title: "Navoiy",
        description: "Alisher Navoiy haqidagi tarixiy roman, buyuk shoir va mutafakkir hayoti haqida",
        price: 52000,
        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-navoiy.jpg',
        authorId: 'author_002',
        authorName: 'Oybek',
        genreId: 'genre_001',
        genreName: 'Tarixiy roman',
        stock: 30,
        stockStatus: 'available',
        isbn: '978-9943-01-236-9',
        publishedYear: 1945,
        language: 'uz',
        pages: 450,
        slug: 'navoiy-oybek',
        featured: true
    }
];

// Complete Seed Function
async function seedAllData() {
    try {
        console.log('🌱 Starting COMPLETE seed process...');
        
        // 1. Genres qo'shish
        console.log('🏷️ Adding genres...');
        for (const genre of sampleGenres) {
            const { id, ...genreData } = genre;
            await setDoc(doc(db, 'genres', id), {
                ...genreData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Added genre: ${genre.name}`);
        }
        
        // 2. Authors qo'shish
        console.log('👨‍💼 Adding authors...');
        for (const author of sampleAuthors) {
            const { id, ...authorData } = author;
            await setDoc(doc(db, 'authors', id), {
                ...authorData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Added author: ${author.name}`);
        }
        
        // 3. Books qo'shish (18 ta field!)
        console.log('📚 Adding books with ALL 18 fields...');
        for (const book of sampleBooks) {
            const { id, ...bookData } = book;
            await setDoc(doc(db, 'books', id), {
                ...bookData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Added book: ${book.title} (${Object.keys(bookData).length + 2} fields)`);
        }
        
        console.log('🎉 COMPLETE seed finished successfully!');
        console.log(`📊 Added: ${sampleGenres.length} genres, ${sampleAuthors.length} authors, ${sampleBooks.length} books`);
        console.log('🌐 View all data at: http://127.0.0.1:4000/firestore');
        
    } catch (error) {
        console.error('❌ Seed failed:', error);
    }
}

// Run complete seed
seedAllData();