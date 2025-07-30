// Component for updating slugs to new format (kitob-nomi-muallif)
import React, { useState } from 'react';
import { databases, Query } from '../appwriteConfig';
import { generateSlug } from '../utils/slugUtils';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

const SlugUpdater = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const updateBookSlugs = async () => {
        setLoading(true);
        setStatus('Kitoblar ro\'yxati yuklanmoqda...');
        
        try {
            // Get all books
            const response = await databases.listDocuments(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                [Query.limit(1000)]
            );
            
            const books = response.documents;
            setProgress({ current: 0, total: books.length });
            setStatus(`Jami ${books.length} ta kitob topildi. Slug'lar tekshirilmoqda...`);
            
            let updated = 0;
            let skipped = 0;
            let errors = 0;
            
            for (let i = 0; i < books.length; i++) {
                const book = books[i];
                setProgress({ current: i + 1, total: books.length });
                
                try {
                    // Generate correct slug format (kitob-nomi-muallif)
                    const correctSlug = generateSlug(book.title, book.author?.name || book.authorName);
                    
                    if (!correctSlug) {
                        errors++;
                        setStatus(`${i + 1}/${books.length}: "${book.title}" - Slug yaratib bo'lmadi`);
                        continue;
                    }
                    
                    // Check if current slug is different from correct format
                    if (book.slug === correctSlug) {
                        skipped++;
                        setStatus(`${i + 1}/${books.length}: "${book.title}" - Slug to'g'ri ✓`);
                        continue;
                    }
                    
                    // Update book with correct slug format
                    await databases.updateDocument(
                        DATABASE_ID,
                        BOOKS_COLLECTION_ID,
                        book.$id,
                        { slug: correctSlug }
                    );
                    
                    updated++;
                    setStatus(`${i + 1}/${books.length}: "${book.title}"\n  Eski: "${book.slug || 'yo\'q'}"\n  Yangi: "${correctSlug}" ✅`);
                    
                } catch (error) {
                    errors++;
                    setStatus(`${i + 1}/${books.length}: "${book.title}" - Xato: ${error.message}`);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            setStatus(`🎉 Tugadi!\n\n📊 Natijalar:\n✅ Yangilandi: ${updated}\n⏭️ O'tkazildi: ${skipped}\n❌ Xatolar: ${errors}\n\n${updated > 0 ? '🚀 Barcha slug\'lar yangi formatda (kitob-nomi-muallif)!' : '✨ Barcha slug\'lar allaqachon to\'g\'ri formatda!'}`);
            
        } catch (error) {
            setStatus(`❌ Xato: ${error.message}`);
        }
        
        setLoading(false);
    };

    const clearAllSlugs = async () => {
        if (!confirm('Haqiqatan ham barcha slug\'larni o\'chirmoqchimisiz? Bu amal qaytarib bo\'lmaydi!')) {
            return;
        }

        setLoading(true);
        setStatus('Slug\'lar o\'chirilmoqda...');
        
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                [Query.limit(1000)]
            );
            
            const books = response.documents;
            setProgress({ current: 0, total: books.length });
            
            let cleared = 0;
            let errors = 0;
            
            for (let i = 0; i < books.length; i++) {
                const book = books[i];
                setProgress({ current: i + 1, total: books.length });
                
                try {
                    if (book.slug) {
                        await databases.updateDocument(
                            DATABASE_ID,
                            BOOKS_COLLECTION_ID,
                            book.$id,
                            { slug: '' }
                        );
                        cleared++;
                        setStatus(`${i + 1}/${books.length}: "${book.title}" - Slug o'chirildi`);
                    } else {
                        setStatus(`${i + 1}/${books.length}: "${book.title}" - Slug yo'q edi`);
                    }
                } catch (error) {
                    errors++;
                    setStatus(`${i + 1}/${books.length}: "${book.title}" - Xato: ${error.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            setStatus(`🧹 Tozalash tugadi!\n\n📊 Natijalar:\n🗑️ O'chirildi: ${cleared}\n❌ Xatolar: ${errors}`);
            
        } catch (error) {
            setStatus(`❌ Xato: ${error.message}`);
        }
        
        setLoading(false);
    };

};

export default SlugUpdater;
