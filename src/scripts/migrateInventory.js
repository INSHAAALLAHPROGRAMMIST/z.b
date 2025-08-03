// Inventory Migration Script
// Bu script mavjud kitoblar uchun inventory fieldlarini qo'shadi

import { databases, Query } from '../appwriteConfig.js';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

export const migrateInventoryFields = async () => {
    try {
        console.log('🚀 Inventory migration boshlandi...');
        
        // Barcha kitoblarni olish
        let allBooks = [];
        let offset = 0;
        const limit = 25; // Appwrite limit
        
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
        
        // Har bir kitobni yangilash
        let updated = 0;
        let errors = 0;
        
        for (const book of allBooks) {
            try {
                // Faqat yangi fieldlar yo'q bo'lsa qo'shish
                const updateData = {};
                
                // Basic inventory fields
                if (book.stock === undefined) updateData.stock = 10;
                if (book.isAvailable === undefined) updateData.isAvailable = true;
                if (book.stockStatus === undefined) updateData.stockStatus = "in_stock";
                if (book.minStockLevel === undefined) updateData.minStockLevel = 2;
                if (book.maxStockLevel === undefined) updateData.maxStockLevel = 50;
                if (book.lastRestocked === undefined) updateData.lastRestocked = new Date().toISOString();
                if (book.supplier === undefined) updateData.supplier = "";
                
                // Pre-order and waitlist fields
                if (book.isPreOrder === undefined) updateData.isPreOrder = false;
                if (book.allowPreOrder === undefined) updateData.allowPreOrder = true;
                if (book.enableWaitlist === undefined) updateData.enableWaitlist = true;
                if (book.preOrderCount === undefined) updateData.preOrderCount = 0;
                if (book.waitlistCount === undefined) updateData.waitlistCount = 0;
                if (book.estimatedDelivery === undefined) updateData.estimatedDelivery = "";
                if (book.expectedRestockDate === undefined) updateData.expectedRestockDate = null;
                
                // Visibility and admin controls
                if (book.visibility === undefined) updateData.visibility = "visible";
                if (book.isVisibleOnSite === undefined) updateData.isVisibleOnSite = true;
                if (book.showWhenDiscontinued === undefined) updateData.showWhenDiscontinued = false;
                if (book.adminPriority === undefined) updateData.adminPriority = 0;
                
                // Analytics fields
                if (book.salesCount === undefined) updateData.salesCount = 0;
                if (book.viewCount === undefined) updateData.viewCount = 0;
                if (book.demandScore === undefined) updateData.demandScore = 0;
                
                // Agar yangilanishi kerak bo'lgan fieldlar bo'lsa
                if (Object.keys(updateData).length > 0) {
                    await databases.updateDocument(
                        DATABASE_ID,
                        BOOKS_COLLECTION_ID,
                        book.$id,
                        updateData
                    );
                    
                    updated++;
                    console.log(`✅ ${book.title} yangilandi`);
                } else {
                    console.log(`⏭️ ${book.title} allaqachon yangilangan`);
                }
                
                // Rate limiting uchun kichik pauza
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ ${book.title} yangilashda xato:`, error);
                errors++;
            }
        }
        
        console.log(`🎉 Migration yakunlandi:`);
        console.log(`✅ Yangilangan: ${updated}`);
        console.log(`❌ Xatolar: ${errors}`);
        console.log(`📊 Jami: ${allBooks.length}`);
        
        return { success: true, updated, errors, total: allBooks.length };
        
    } catch (error) {
        console.error('💥 Migration xatosi:', error);
        return { success: false, error: error.message };
    }
};

// Browser console'dan ishlatish uchun
if (typeof window !== 'undefined') {
    window.migrateInventory = migrateInventoryFields;
}

export default migrateInventoryFields;