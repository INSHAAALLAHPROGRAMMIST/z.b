import { databases, ID, Query } from '../appwriteConfig';
import { generateSlug } from './slugUtils';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

// Create new book with auto-generated slug
export const createBookWithSlug = async (bookData) => {
    try {
        // Generate slug if not provided
        if (!bookData.slug) {
            bookData.slug = generateSlug(bookData.title, bookData.author?.name || bookData.authorName);
        }

        // Create book document
        const response = await databases.createDocument(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            ID.unique(),
            bookData
        );

        console.log('✅ Kitob yaratildi:', {
            title: response.title,
            slug: response.slug,
            url: `/kitob/${response.slug}`
        });

        return response;
    } catch (error) {
        console.error('❌ Kitob yaratishda xato:', error);
        throw error;
    }
};

// Update book with slug regeneration if needed
export const updateBookWithSlug = async (bookId, bookData) => {
    try {
        // Regenerate slug if title or author changed
        if (bookData.title || bookData.author || bookData.authorName) {
            // Get current book data
            const currentBook = await databases.getDocument(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                bookId
            );

            const newTitle = bookData.title || currentBook.title;
            const newAuthor = bookData.author?.name || bookData.authorName || currentBook.author?.name || currentBook.authorName;

            // Generate new slug
            bookData.slug = generateSlug(newTitle, newAuthor);
        }

        // Update book document
        const response = await databases.updateDocument(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            bookId,
            bookData
        );

        console.log('✅ Kitob yangilandi:', {
            title: response.title,
            slug: response.slug,
            url: `/kitob/${response.slug}`
        });

        return response;
    } catch (error) {
        console.error('❌ Kitob yangilashda xato:', error);
        throw error;
    }
};

// Check if slug is unique
export const isSlugUnique = async (slug, excludeBookId = null) => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            [
                Query.equal('slug', slug),
                Query.limit(1)
            ]
        );

        // If no documents found, slug is unique
        if (response.documents.length === 0) {
            return true;
        }

        // If found document is the same book we're updating, it's still unique
        if (excludeBookId && response.documents[0].$id === excludeBookId) {
            return true;
        }

        return false;
    } catch (error) {
        console.error('Slug uniqueness check error:', error);
        return false;
    }
};