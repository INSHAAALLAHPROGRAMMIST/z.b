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
/*

    // Only show in development
    if (!import.meta.env.DEV) return null;

    return (
        <div style={{ 
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '450px',
            background: 'var(--glass-bg-light)', 
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            maxHeight: '400px',
            overflow: 'auto'
        }}>
            
         <h3 style={{ margin: '0 0 15px 0', color: 'var(--primary-color)' }}>
                🔧 Slug Format Updater (Dev Only)
            </h3>
            
            <p style={{ fontSize: '0.9rem', marginBottom: '15px', opacity: '0.8' }}>
                Slug formatini yangilash: <strong>kitob-nomi-muallif</strong>
            </p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button 
                    onClick={updateBookSlugs}
                    disabled={loading}
                    className="glassmorphism-button"
                    style={{
                        flex: 1,
                        padding: '10px',
                        fontSize: '0.9rem'
                    }}
                >
                    {loading ? 'Jarayonda...' : '🔄 Slug\'larni Yangilash'}
                </button>
                
                <button 
                    onClick={clearAllSlugs}
                    disabled={loading}
                    className="glassmorphism-button"
                    style={{
                        padding: '10px',
                        fontSize: '0.9rem',
                        background: 'rgba(255, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 0, 0, 0.3)'
                    }}
                >
                    🗑️ Tozalash
                </button>
            </div>
            
            {progress.total > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '10px',
                        height: '8px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            background: 'var(--primary-color)',
                            height: '100%',
                            width: `${(progress.current / progress.total) * 100}%`,
                            transition: 'width 0.3s ease'
                        }}></div>
                    </div>
                    <p style={{ fontSize: '0.8rem', margin: '5px 0', textAlign: 'center' }}>
                        {progress.current} / {progress.total}
                    </p>
                </div>
            )}
            
            {status && (
                <div style={{ 
                    background: 'rgba(0,0,0,0.1)', 
                    borderRadius: '5px',
                    padding: '10px',
                    fontSize: '0.8rem',
                    maxHeight: '150px',
                    overflow: 'auto',
                    whiteSpace: 'pre-line'
                }}>
                    {status}
                </div>
            )}
            
            <p style={{ 
                fontSize: '0.7rem', 
                opacity: '0.6', 
                marginTop: '10px',
                textAlign: 'center'
            }}>
                ⚠️ Faqat development'da ko'rinadi
            </p>
        </div>
    );
*/
};

export default SlugUpdater;