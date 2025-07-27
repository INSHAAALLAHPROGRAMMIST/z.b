// User Sync Utility - Appwrite Auth va Database o'rtasida sync
import { databases, account, ID, Query } from '../appwriteConfig';
import { syncUserUniqueToDatabase } from './uniqueUserSync';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;

/**
 * Auth user'ni database'ga sync qilish
 * @param {Object} authUser - Appwrite auth user object
 * @param {Object} additionalData - Qo'shimcha ma'lumotlar
 * @returns {Object} Database user object
 */
export const syncUserToDatabase = async (authUser, additionalData = {}) => {
    try {
        // Avval user mavjudligini tekshiramiz
        const existingUser = await getUserByAuthId(authUser.$id);
        
        if (existingUser) {
            // User mavjud bo'lsa, ma'lumotlarini yangilaymiz
            return await updateUserInDatabase(existingUser.$id, authUser, additionalData);
        } else {
            // User mavjud bo'lmasa, yangi yaratamiz
            return await createUserInDatabase(authUser, additionalData);
        }
    } catch (error) {
        console.error('User sync xatosi:', error);
        throw error;
    }
};

/**
 * Auth ID bo'yicha database'dan user topish
 * @param {string} authId - Appwrite auth user ID
 * @returns {Object|null} Database user object yoki null
 */
export const getUserByAuthId = async (authId) => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            [
                Query.equal('userId', authId),
                Query.limit(1)
            ]
        );
        
        return response.documents.length > 0 ? response.documents[0] : null;
    } catch (error) {
        console.error('User topishda xato:', error);
        return null;
    }
};

/**
 * Database'ga yangi user yaratish
 * @param {Object} authUser - Appwrite auth user object
 * @param {Object} additionalData - Qo'shimcha ma'lumotlar
 * @returns {Object} Yaratilgan database user object
 */
export const createUserInDatabase = async (authUser, additionalData = {}) => {
    try {
        // Auth preferences'dan ma'lumotlarni olamiz
        const currentUser = await account.get();
        const prefs = currentUser.prefs || {};
        
        const userData = {
            userId: authUser.$id, // Auth user ID
            fullName: authUser.name || authUser.email?.split('@')[0] || 'Foydalanuvchi',
            email: authUser.email || '',
            phone: additionalData.phone || prefs.phone || authUser.phone || '',
            role: 'user', // Default role
            address: additionalData.address || prefs.address || '',
            telegram_username: additionalData.telegram_username || prefs.telegram_username || '',
            isActive: true,
            lastLoginAt: new Date().toISOString()
        };

        const newUser = await databases.createDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            ID.unique(),
            userData
        );

        console.log('Yangi user yaratildi:', newUser);
        return newUser;
    } catch (error) {
        console.error('User yaratishda xato:', error);
        throw error;
    }
};

/**
 * Database'dagi user ma'lumotlarini yangilash
 * @param {string} documentId - Database document ID
 * @param {Object} authUser - Appwrite auth user object
 * @param {Object} additionalData - Qo'shimcha ma'lumotlar
 * @returns {Object} Yangilangan database user object
 */
export const updateUserInDatabase = async (documentId, authUser, additionalData = {}) => {
    try {
        // Auth preferences'dan ma'lumotlarni olamiz
        const currentUser = await account.get();
        const prefs = currentUser.prefs || {};
        
        const updateData = {
            fullName: authUser.name || authUser.email?.split('@')[0] || 'Foydalanuvchi',
            email: authUser.email || '',
            phone: additionalData.phone || prefs.phone || authUser.phone || '',
            lastLoginAt: new Date().toISOString()
        };

        // Agar telegram_username mavjud bo'lsa, uni ham yangilaymiz
        if (additionalData.telegram_username || prefs.telegram_username) {
            updateData.telegram_username = additionalData.telegram_username || prefs.telegram_username;
        }

        // Agar address mavjud bo'lsa, uni ham yangilaymiz
        if (additionalData.address || prefs.address) {
            updateData.address = additionalData.address || prefs.address;
        }

        const updatedUser = await databases.updateDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            documentId,
            updateData
        );

        console.log('User yangilandi:', updatedUser);
        return updatedUser;
    } catch (error) {
        console.error('User yangilashda xato:', error);
        throw error;
    }
};

/**
 * Joriy auth user'ni olish va sync qilish
 * @returns {Object} Current user object
 */
export const getCurrentUserAndSync = async () => {
    try {
        // Auth user'ni olamiz
        const authUser = await account.get();
        
        // Database'ga sync qilamiz
        const dbUser = await syncUserToDatabase(authUser);
        
        return {
            authUser,
            dbUser
        };
    } catch (error) {
        console.error('Current user olishda xato:', error);
        throw error;
    }
};

/**
 * Login'dan keyin user'ni sync qilish (faqat Auth)
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} Login result with auth user
 */
export const loginAndSync = async (email, password) => {
    try {
        // Login qilamiz
        const session = await account.createEmailPasswordSession(email, password);
        
        // User ma'lumotlarini olamiz
        const authUser = await account.get();
        
        // Last login time'ni yangilaymiz
        const currentPrefs = authUser.prefs || {};
        await account.updatePrefs({
            ...currentPrefs,
            lastLoginAt: new Date().toISOString()
        });
        
        // Yangilangan user ma'lumotlarini olamiz
        const updatedAuthUser = await account.get();
        
        // Database'ga ham unique sync qilamiz (admin funksiyalar uchun)
        const dbUser = await syncUserUniqueToDatabase(updatedAuthUser);
        
        return {
            session,
            authUser: updatedAuthUser,
            dbUser: dbUser // Database ham sync qilindi
        };
    } catch (error) {
        console.error('Login va sync xatosi:', error);
        throw error;
    }
};

/**
 * Register'dan keyin user'ni sync qilish (faqat Auth'da saqlash)
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User name
 * @param {Object} additionalData - Qo'shimcha ma'lumotlar (phone, telegram_username, address)
 * @returns {Object} Register result with auth user
 */
export const registerAndSync = async (email, password, name, additionalData = {}) => {
    try {
        // Register qilamiz
        const authUser = await account.create(ID.unique(), email, password, name);
        
        // Login qilamiz
        await account.createEmailPasswordSession(email, password);
        
        // Auth preferences'ga barcha qo'shimcha ma'lumotlarni saqlaymiz
        const preferences = {
            telegram_username: additionalData.telegram_username || '',
            phone: additionalData.phone || '',
            address: additionalData.address || '',
            isActive: true,
            registeredAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
        };
        
        await account.updatePrefs(preferences);
        
        // Yangilangan user ma'lumotlarini olamiz
        const updatedAuthUser = await account.get();
        
        // Database'ga ham unique sync qilamiz (admin funksiyalar uchun)
        const dbUser = await syncUserUniqueToDatabase(updatedAuthUser, additionalData);
        
        return {
            authUser: updatedAuthUser,
            dbUser: dbUser // Database ham sync qilindi
        };
    } catch (error) {
        console.error('Register va sync xatosi:', error);
        throw error;
    }
};
/**

 * User'ning auth preferences'dan ma'lumotlarini olish
 * @returns {Object} User preferences
 */
export const getUserPreferences = async () => {
    try {
        const user = await account.get();
        return user.prefs || {};
    } catch (error) {
        console.error('User preferences olishda xato:', error);
        return {};
    }
};

/**
 * User preferences'ni yangilash
 * @param {Object} newPrefs - Yangi preferences
 * @returns {Object} Yangilangan user object
 */
export const updateUserPreferences = async (newPrefs) => {
    try {
        const updatedUser = await account.updatePrefs(newPrefs);
        console.log('User preferences yangilandi:', updatedUser.prefs);
        return updatedUser;
    } catch (error) {
        console.error('User preferences yangilashda xato:', error);
        throw error;
    }
};