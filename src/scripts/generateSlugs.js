// Script to generate slugs for existing data
import { databases, Query } from '../appwriteConfig.js';
import { generateSlug, generateAuthorSlug, generateGenreSlug } from '../utils/slugUtils.js';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID;
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;

// Generate slugs for books
export const generateBookSlugs = async () => {
    try {
        console.log('📚 Kitoblar uchun slug'lar yaratilmoqda...');
        
        // Get all books
        const response = await databases.listDocuments(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            [Query.limit(1000)]
        );
        
        console.log(`Jami ${response.documents.length} ta kitob topildi`);
        
        // Update each book with slug
        for (let i = 0; i < response.documents.length; i++) {
            const book = response.documents[i];
            const slug = generateSlug(book.title, book.author?.name);
            
            try {
                await databases.updateDocument(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    book.$id,
                    { slug: slug }
                );
                
                console.log(`✅ ${i + 1}/${response.documents.length}: "${book.title}" -> "${slug}"`);
            } catch (error) {
                console.error(`❌ Xato: "${book.title}":`, error.message);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ Kitoblar uchun slug yaratish tugadi!');
    } catch (error) {
        console.error('❌ Kitoblar slug yaratishda xato:', error);
    }
};

// Generate slugs for authors
export const generateAuthorSlugs = async () => {
    try {
        console.log('👤 Mualliflar uchun slug\'lar yaratilmoqda...');
        
        const response = await databases.listDocuments(
            DATABASE_ID,
            AUTHORS_COLLECTION_ID,
            [Query.limit(1000)]
        );
        
        console.log(`Jami ${response.documents.length} ta muallif topildi`);
        
        for (let i = 0; i < response.documents.length; i++) {
            const author = response.documents[i];
            const slug = generateAuthorSlug(author.name);
            
            try {
                await databases.updateDocument(
                    DATABASE_ID,
                    AUTHORS_COLLECTION_ID,
                    author.$id,
                    { slug: slug }
                );
                
                console.log(`✅ ${i + 1}/${response.documents.length}: "${author.name}" -> "${slug}"`);
            } catch (error) {
                console.error(`❌ Xato: "${author.name}":`, error.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ Mualliflar uchun slug yaratish tugadi!');
    } catch (error) {
        console.error('❌ Mualliflar slug yaratishda xato:', error);
    }
};

// Generate slugs for genres
export const generateGenreSlugs = async () => {
    try {
        console.log('📂 Janrlar uchun slug\'lar yaratilmoqda...');
        
        const response = await databases.listDocuments(
            DATABASE_ID,
            GENRES_COLLECTION_ID,
            [Query.limit(1000)]
        );
        
        console.log(`Jami ${response.documents.length} ta janr topildi`);
        
        for (let i = 0; i < response.documents.length; i++) {
            const genre = response.documents[i];
            const slug = generateGenreSlug(genre.name);
            
            try {
                await databases.updateDocument(
                    DATABASE_ID,
                    GENRES_COLLECTION_ID,
                    genre.$id,
                    { slug: slug }
                );
                
                console.log(`✅ ${i + 1}/${response.documents.length}: "${genre.name}" -> "${slug}"`);
            } catch (error) {
                console.error(`❌ Xato: "${genre.name}":`, error.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ Janrlar uchun slug yaratish tugadi!');
    } catch (error) {
        console.error('❌ Janrlar slug yaratishda xato:', error);
    }
};

// Run all slug generation
export const generateAllSlugs = async () => {
    console.log('🚀 Barcha slug\'lar yaratilmoqda...');
    
    await generateBookSlugs();
    await generateAuthorSlugs();
    await generateGenreSlugs();
    
    console.log('🎉 Barcha slug\'lar muvaffaqiyatli yaratildi!');
};

// For manual execution
if (typeof window !== 'undefined') {
    window.generateAllSlugs = generateAllSlugs;
    window.generateBookSlugs = generateBookSlugs;
    window.generateAuthorSlugs = generateAuthorSlugs;
    window.generateGenreSlugs = generateGenreSlugs;
}