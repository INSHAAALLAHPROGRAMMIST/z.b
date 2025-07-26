// Sample Orders Creator - Test uchun
import { databases, ID, Query } from '../appwriteConfig';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;

/**
 * Test uchun sample orderlar yaratish
 */
export const createSampleOrders = async () => {
    try {
        // Birinchi users va books'ni olamiz
        const [usersResponse, booksResponse] = await Promise.all([
            databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, []),
            databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [])
        ]);

        if (usersResponse.documents.length === 0) {
            console.log('Users mavjud emas, sample orders yaratib bo\'lmaydi');
            return;
        }

        if (booksResponse.documents.length === 0) {
            console.log('Books mavjud emas, sample orders yaratib bo\'lmaydi');
            return;
        }

        const users = usersResponse.documents;
        const books = booksResponse.documents;

        // Sample orders yaratish
        const sampleOrders = [
            {
                userId: users[0]?.userId || users[0]?.$id, // Auth user ID
                bookId: books[0]?.$id,
                quantity: 2,
                priceAtTimeOfAdd: parseFloat(books[0]?.price || 50000),
                status: 'pending',
                orderDate: new Date().toISOString()
            },
            {
                userId: users[0]?.userId || users[0]?.$id,
                bookId: books[1]?.$id || books[0]?.$id,
                quantity: 1,
                priceAtTimeOfAdd: parseFloat(books[1]?.price || books[0]?.price || 75000),
                status: 'processing',
                orderDate: new Date(Date.now() - 86400000).toISOString() // 1 kun oldin
            },
            {
                userId: users[1]?.userId || users[0]?.userId || users[0]?.$id,
                bookId: books[2]?.$id || books[0]?.$id,
                quantity: 1,
                priceAtTimeOfAdd: parseFloat(books[2]?.price || books[0]?.price || 60000),
                status: 'completed',
                orderDate: new Date(Date.now() - 172800000).toISOString() // 2 kun oldin
            }
        ];

        // Orders yaratish
        for (const orderData of sampleOrders) {
            await databases.createDocument(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                ID.unique(),
                orderData
            );
        }

        console.log('Sample orders muvaffaqiyatli yaratildi!');
        return sampleOrders.length;

    } catch (error) {
        console.error('Sample orders yaratishda xato:', error);
        throw error;
    }
};

/**
 * Barcha test orderlarni o'chirish
 */
export const clearSampleOrders = async () => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            CART_ITEMS_COLLECTION_ID,
            [
                Query.isNotNull('status') // Faqat status bo'lgan (order) itemlar
            ]
        );

        for (const order of response.documents) {
            await databases.deleteDocument(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                order.$id
            );
        }

        console.log(`${response.documents.length} ta sample order o'chirildi`);
        return response.documents.length;

    } catch (error) {
        console.error('Sample orders o\'chirishda xato:', error);
        throw error;
    }
};