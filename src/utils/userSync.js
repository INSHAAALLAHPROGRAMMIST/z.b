// User Sync Utility - Appwrite Auth va Database o'rtasida sync
import { databases, account, ID } from '../appwriteConfig';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;

/**
 * Auth user'ni database'ga sync qilish
 * @param {Object} authUser - Appwrite auth user object
 * @returns {Object} Database user object
 */
export const syncUserToDatabase = async (authUser) => {
    try {
        // Avval user mavjudligini tekshiramiz
        const existingUser = await getUserByAuthId(authUser.$id);
        
        if (existingUser) {
            // User mavjud bo'lsa, ma'lumotlarini yangilaymiz
            return await updateUserInDatabase(existingUser.$id, authUser);
        } else {
            // User mavjud bo'lmasa, yangi yaratamiz
            return await createUserInDatabase(authUser);
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
 * @returns {Object} Yaratilgan database user object
 */
export const createUserInDatabase = async (authUser) => {
    try {
        const userData = {
            userId: authUser.$id, // Auth user ID
            fullName: authUser.name || authUser.email?.split('@')[0] || 'Foydalanuvchi',
            email: authUser.email || '',
            phone: authUser.phone || '',
            role: 'user', // Default role
            address: '',
            telegram_username: '', // Bo'sh, keyinchalik to'ldiriladi
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
 * @returns {Object} Yangilangan database user object
 */
export const updateUserInDatabase = async (documentId, authUser) => {
    try {
        const updateData = {
            fullName: authUser.name || authUser.email?.split('@')[0] || 'Foydalanuvchi',
            email: authUser.email || '',
            phone: authUser.phone || '',
            lastLoginAt: new Date().toISOString()
        };

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
 * Login'dan keyin user'ni sync qilish
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} Login result with synced user
 */
export const loginAndSync = async (email, password) => {
    try {
        // Login qilamiz
        const session = await account.createEmailPasswordSession(email, password);
        
        // User ma'lumotlarini olamiz
        const authUser = await account.get();
        
        // Database'ga sync qilamiz
        const dbUser = await syncUserToDatabase(authUser);
        
        return {
            session,
            authUser,
            dbUser
        };
    } catch (error) {
        console.error('Login va sync xatosi:', error);
        throw error;
    }
};

/**
 * Register'dan keyin user'ni sync qilish
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User name
 * @returns {Object} Register result with synced user
 */
export const registerAndSync = async (email, password, name) => {
    try {
        // Register qilamiz
        const authUser = await account.create(ID.unique(), email, password, name);
        
        // Login qilamiz
        await account.createEmailPasswordSession(email, password);
        
        // Database'ga sync qilamiz
        const dbUser = await syncUserToDatabase(authUser);
        
        return {
            authUser,
            dbUser
        };
    } catch (error) {
        console.error('Register va sync xatosi:', error);
        throw error;
    }
};