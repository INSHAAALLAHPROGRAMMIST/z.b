import React, { useState } from 'react';
import { databases, Query } from '../appwriteConfig';
import { toast } from '../utils/toastUtils';
// Collection setup qo'lda qilinadi - Appwrite Console orqali

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const WAITLIST_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_WAITLIST_ID;
const PREORDER_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_PREORDER_ID;

function SimpleEnhancedMigration() {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [result, setResult] = useState(null);

    const migrateEnhancedFields = async () => {
        try {
            console.log('🚀 Enhanced inventory migration boshlandi...');
            
            const onProgress = (progressData) => {
                setProgress(progressData);
            };
            
            // Barcha kitoblarni olish
            let allBooks = [];
            let offset = 0;
            const limit = 25;
            
            while (true) {
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    [
                        Query.limit(limit),
                        Query.offset(offset)
                    ]
                );
                
                allBooks = [...allBooks, ...response.documents];
                
                if (response.documents.length < limit) {
                    break;
                }
                
                offset += limit;
            }
            
            console.log(`📚 Jami ${allBooks.length} ta kitob topildi`);
            
            let updated = 0;
            let errors = 0;
            
            for (const book of allBooks) {
                try {
                    console.log(`🔍 ${book.title} kitobini tekshirmoqda...`);
                    console.log('Mavjud fieldlar:', Object.keys(book));
                    
                    const updateData = {};
                    
                    // FAQAT BOOKS COLLECTION'DA MAVJUD BO'LGAN FIELDLAR
                    console.log('✅ Faqat mavjud fieldlarni yangilaymiz...');
                    
                    // Pre-order and waitlist fields (MAVJUD)
                    if (book.allowPreOrder === undefined) {
                        console.log('✅ allowPreOrder qo\'shilmoqda');
                        updateData.allowPreOrder = true;
                    }
                    if (book.enableWaitlist === undefined) {
                        console.log('✅ enableWaitlist qo\'shilmoqda');
                        updateData.enableWaitlist = true;
                    }
                    if (book.preOrderCount === undefined) {
                        console.log('✅ preOrderCount qo\'shilmoqda');
                        updateData.preOrderCount = 0;
                    }
                    if (book.waitlistCount === undefined) {
                        console.log('✅ waitlistCount qo\'shilmoqda');
                        updateData.waitlistCount = 0;
                    }
                    if (book.expectedRestockDate === undefined) {
                        console.log('✅ expectedRestockDate qo\'shilmoqda');
                        updateData.expectedRestockDate = null;
                    }
                    
                    // Visibility and admin controls (MAVJUD)
                    if (book.visibility === undefined) {
                        console.log('✅ visibility qo\'shilmoqda');
                        updateData.visibility = "visible";
                    }
                    if (book.showWhenDiscontinued === undefined) {
                        console.log('✅ showWhenDiscontinued qo\'shilmoqda');
                        updateData.showWhenDiscontinued = false;
                    }
                    if (book.adminPriority === undefined) {
                        console.log('✅ adminPriority qo\'shilmoqda');
                        updateData.adminPriority = 0;
                    }
                    if (book.demandScore === undefined) {
                        console.log('✅ demandScore qo\'shilmoqda');
                        updateData.demandScore = 0;
                    }
                    
                    console.log('📝 Yangilanishi kerak bo\'lgan fieldlar:', Object.keys(updateData));
                    
                    if (Object.keys(updateData).length > 0) {
                        await databases.updateDocument(
                            DATABASE_ID,
                            BOOKS_COLLECTION_ID,
                            book.$id,
                            updateData
                        );
                        
                        updated++;
                        console.log(`✅ ${book.title} yangilandi`);
                        onProgress({ updated, total: allBooks.length, current: book.title });
                    } else {
                        console.log(`⏭️ ${book.title} allaqachon yangilangan`);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`❌ ${book.title} yangilashda xato:`, error);
                    console.error('Xato tafsiloti:', error.message);
                    errors++;
                }
            }
            
            console.log(`🎉 Enhanced migration yakunlandi:`);
            console.log(`✅ Yangilangan: ${updated}`);
            console.log(`❌ Xatolar: ${errors}`);
            console.log(`📊 Jami: ${allBooks.length}`);
            
            return { success: true, updated, errors, total: allBooks.length };
            
        } catch (error) {
            console.error('💥 Enhanced migration xatosi:', error);
            return { success: false, error: error.message };
        }
    };

    const handleMigration = async () => {
        if (!confirm('Enhanced Migration\'ni boshlashni xohlaysizmi?')) {
            return;
        }

        setLoading(true);
        setProgress({ updated: 0, total: 0, current: 'Boshlanyapti...' });
        setResult(null);

        try {
            const migrationResult = await migrateEnhancedFields();
            setResult(migrationResult);
            
            if (migrationResult.success) {
                toast.success(`✅ Enhanced Migration muvaffaqiyatli yakunlandi!`);
            } else {
                toast.error(`❌ Migration'da xato: ${migrationResult.error}`);
            }
        } catch (error) {
            console.error('❌ Migration error:', error);
            const errorResult = { success: false, error: error.message };
            setResult(errorResult);
            toast.error(`❌ Migration'da xato yuz berdi: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            padding: '2rem', 
            maxWidth: '800px', 
            margin: '0 auto',
            background: 'var(--glass-bg-light)',
            borderRadius: '1rem',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(10px)'
        }}>
            <h1 style={{ 
                color: 'var(--text-color)', 
                textAlign: 'center',
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
            }}>
                Enhanced Inventory Migration
            </h1>
            
            {/* Collection Status */}
            <div style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem', 
                background: 'var(--glass-bg-light)', 
                borderRadius: '0.75rem',
                border: '1px solid var(--glass-border)'
            }}>
                <h3 style={{ color: 'var(--text-color)', marginBottom: '1rem' }}>Collection Status:</h3>
                <p style={{ color: 'var(--text-color)' }}>
                    Waitlist: {WAITLIST_COLLECTION_ID ? '✅ Configured' : '❌ Not configured'}
                </p>
                <p style={{ color: 'var(--text-color)' }}>
                    PreOrder: {PREORDER_COLLECTION_ID ? '✅ Configured' : '❌ Not configured'}
                </p>
            </div>

            {/* Setup Warning - Show if not configured */}
            {(!WAITLIST_COLLECTION_ID || !PREORDER_COLLECTION_ID) && (
                <div style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem', 
                    background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 193, 7, 0.05))', 
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '0.75rem',
                    textAlign: 'center'
                }}>
                    <h3 style={{ color: '#ffc107', marginBottom: '1rem' }}>
                        ⚠️ Collection'lar Sozlanmagan
                    </h3>
                    <p style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>
                        Appwrite Console'da "waitlist" va "preorder" collection'larini yarating
                    </p>
                    <p style={{ color: 'var(--text-color)' }}>
                        <strong>Ko'rsatma:</strong> <code style={{ 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '0.25rem',
                            color: 'var(--primary-color)'
                        }}>ENHANCED_INVENTORY_SETUP.md</code>
                    </p>
                </div>
            )}

            {/* Migration Button */}
            <button
                onClick={handleMigration}
                disabled={loading || !WAITLIST_COLLECTION_ID || !PREORDER_COLLECTION_ID}
                style={{
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    background: (loading || !WAITLIST_COLLECTION_ID || !PREORDER_COLLECTION_ID) 
                        ? 'var(--secondary-color)' 
                        : 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: (loading || !WAITLIST_COLLECTION_ID || !PREORDER_COLLECTION_ID) ? 'not-allowed' : 'pointer',
                    marginBottom: '2rem',
                    transition: 'all 0.3s ease'
                }}
            >
                {loading ? 'Migration davom etmoqda...' : 
                 !WAITLIST_COLLECTION_ID || !PREORDER_COLLECTION_ID ? 'Collection\'lar Yaratilmagan' :
                 'Enhanced Migration\'ni Boshlash'}
            </button>

            {/* Progress */}
            {progress && (
                <div style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem', 
                    background: 'var(--glass-bg-light)', 
                    borderRadius: '0.75rem',
                    border: '1px solid var(--glass-border)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '1rem',
                        color: 'var(--text-color)'
                    }}>
                        <span>🚀 Jarayon: {progress.updated}/{progress.total}</span>
                        <span>📖 Hozirgi: {progress.current}</span>
                    </div>
                    <div style={{ 
                        width: '100%', 
                        height: '12px', 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        borderRadius: '6px', 
                        overflow: 'hidden',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))',
                            borderRadius: '6px',
                            width: `${progress.total > 0 ? (progress.updated / progress.total) * 100 : 0}%`,
                            transition: 'width 0.3s ease'
                        }}></div>
                    </div>
                </div>
            )}

            {/* Result */}
            {result && (
                <div style={{ 
                    padding: '1.5rem', 
                    background: result.success 
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))' 
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))', 
                    borderRadius: '0.75rem',
                    border: `1px solid ${result.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                    <h3 style={{ 
                        color: result.success ? '#10b981' : '#ef4444',
                        marginBottom: '1rem'
                    }}>
                        {result.success ? '✅ Migration Muvaffaqiyatli!' : '❌ Migration Xatosi'}
                    </h3>
                    {result.success ? (
                        <div style={{ color: 'var(--text-color)' }}>
                            <p>✅ Yangilangan kitoblar: <strong>{result.updated}</strong></p>
                            <p>❌ Xatolar: <strong>{result.errors}</strong></p>
                            <p>📚 Jami kitoblar: <strong>{result.total}</strong></p>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-color)' }}>❌ Xato: {result.error}</p>
                    )}
                </div>
            )}

            {/* Instructions */}
            <div style={{ 
                marginTop: '2rem', 
                padding: '1.5rem', 
                background: 'var(--glass-bg-light)', 
                borderRadius: '0.75rem',
                border: '1px solid var(--glass-border)'
            }}>
                <h4 style={{ 
                    color: 'var(--text-color)', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <i className="fas fa-info-circle" style={{ color: 'var(--primary-color)' }}></i>
                    Ko'rsatmalar:
                </h4>
                <ol style={{ color: 'var(--text-color)', lineHeight: '1.6' }}>
                    <li>Avval Waitlist va PreOrder collection'larini yarating</li>
                    <li>Environment variables'ni .env fayliga qo'shing</li>
                    <li>Loyihani qayta ishga tushiring</li>
                    <li>Enhanced Migration'ni bajaring</li>
                </ol>
            </div>
        </div>
    );
}

export default SimpleEnhancedMigration;