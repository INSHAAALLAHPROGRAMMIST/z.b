// Firebase Seed Script - Emulator uchun
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, doc, setDoc } from 'firebase/firestore';

// Firebase config (emulator uchun)
const firebaseConfig = {
    projectId: "zbdbonfb", // Project ID yetarli emulator uchun
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

// Sample data
const sampleBooks = [
    {
        id: 'book_001',
        title: "O'tkan kunlar",
        description: "Abdulla Qodiriy asari - XIX asr oxiri va XX asr boshlarida O'zbekistonda sodir bo'lgan voqealar",
        price: 45000,
        authorName: "Abdulla Qodiriy",
        genreName: "Tarixiy roman",
        stock: 25,
        stockStatus: "available",
        language: "uz",
        featured: true
    },
    {
        id: 'book_002',
        title: "Mehrobdan chayon",
        description: "Abdulla Qodiriyning mashhur asari",
        price: 38000,
        authorName: "Abdulla Qodiriy",
        genreName: "Tarixiy roman",
        stock: 15,
        stockStatus: "low_stock",
        language: "uz",
        featured: true
    },
    {
        id: 'book_003',
        title: "Navoiy",
        description: "Alisher Navoiy haqidagi tarixiy roman",
        price: 52000,
        authorName: "Oybek",
        genreName: "Tarixiy roman",
        stock: 30,
        stockStatus: "available",
        language: "uz",
        featured: true
    }
];

// Seed function
async function seedData() {
    try {
        console.log('🌱 Starting seed process...');

        // Books qo'shish
        for (const book of sampleBooks) {
            const { id, ...bookData } = book;
            await setDoc(doc(db, 'books', id), {
                ...bookData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Added book: ${book.title}`);
        }

        console.log('🎉 Seed completed successfully!');
        console.log('🌐 View data at: http://127.0.0.1:4000/firestore');

    } catch (error) {
        console.error('❌ Seed failed:', error);
    }
}

// Run seed
seedData();