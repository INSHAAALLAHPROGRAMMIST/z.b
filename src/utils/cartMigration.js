import { databases, Query, ID } from '../appwriteConfig';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;

/**
 * Mehmon savatini ro'yxatdan o'tgan foydalanuvchiga ko'chirish
 * @param {string} newUserId - Yangi foydalanuvchi ID'si
 */
export async function migrateGuestCartToUser(newUserId) {
    try {
        const guestId = localStorage.getItem('appwriteGuestId');
        
        if (!guestId) {
            return;
        }

        // Mehmon savatidagi elementlarni olish
        const guestCartResponse = await databases.listDocuments(
            DATABASE_ID,
            CART_ITEMS_COLLECTION_ID,
            [
                Query.equal('userId', guestId)
            ]
        );

        if (guestCartResponse.documents.length === 0) {
            localStorage.removeItem('appwriteGuestId');
            return;
        }

        // Yangi foydalanuvchining mavjud savatini olish
        const userCartResponse = await databases.listDocuments(
            DATABASE_ID,
            CART_ITEMS_COLLECTION_ID,
            [
                Query.equal('userId', newUserId)
            ]
        );

        const userCartMap = new Map();
        userCartResponse.documents.forEach(item => {
            userCartMap.set(item.bookId, item);
        });

        // Mehmon savatidagi har bir element uchun
        for (const guestItem of guestCartResponse.documents) {
            const existingUserItem = userCartMap.get(guestItem.bookId);

            if (existingUserItem) {
                // Agar kitob foydalanuvchi savatida mavjud bo'lsa, miqdorni qo'shish
                const newQuantity = existingUserItem.quantity + guestItem.quantity;
                
                await databases.updateDocument(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    existingUserItem.$id,
                    {
                        quantity: newQuantity
                    }
                );
            } else {
                // Agar kitob foydalanuvchi savatida yo'q bo'lsa, yangi element yaratish
                await databases.createDocument(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    ID.unique(),
                    {
                        userId: newUserId,
                        bookId: guestItem.bookId,
                        quantity: guestItem.quantity,
                        priceAtTimeOfAdd: guestItem.priceAtTimeOfAdd
                    }
                );
            }

            // Mehmon savatidagi elementni o'chirish
            await databases.deleteDocument(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                guestItem.$id
            );
        }

        // Mehmon ID'sini o'chirish
        localStorage.removeItem('appwriteGuestId');
        
        // Global cart count'ni yangilash
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        
    } catch (error) {
        console.error('Savatni ko\'chirishda xato:', error);
    }
}