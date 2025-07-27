// Browser console'da ishlatish uchun script
// F12 > Console'ga copy-paste qiling

(async () => {
    try {
        // Appwrite config'ni import qilish
        const { databases, account, Query } = window.appwriteConfig || await import('./src/appwriteConfig.js');
        
        // Environment variables
        const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;
        
        // Current user'ni olish
        const currentUser = await account.get();
        console.log('Current user:', currentUser);
        
        // Database'dan user'ni topish
        const response = await databases.listDocuments(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            [
                Query.equal('userId', currentUser.$id),
                Query.limit(1)
            ]
        );
        
        if (response.documents.length === 0) {
            console.error('User database\'da topilmadi');
            return;
        }
        
        const userDoc = response.documents[0];
        console.log('User document:', userDoc);
        
        // Admin role berish
        const updatedUser = await databases.updateDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            userDoc.$id,
            {
                role: 'admin'
            }
        );
        
        console.log('Admin role berildi:', updatedUser);
        console.log('✅ Admin role berildi! Sahifani yangilang.');
        window.location.reload();
        
    } catch (error) {
        console.error('❌ Xato:', error);
        console.error('❌ Xato: ' + error.message);
    }
})();