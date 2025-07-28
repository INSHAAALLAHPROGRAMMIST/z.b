// Unique User Sync - Prevent duplicates
import { databases, ID, Query } from '../appwriteConfig';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;

/**
 * Sync user uniquely to database
 * @param {Object} authUser - Auth user object
 * @param {Object} additionalData - Additional data
 * @returns {Object} Database user object
 */
export const syncUserUniqueToDatabase = async (authUser, additionalData = {}) => {
    try {
        // 1. First check if user exists
        const existingUserResponse = await databases.listDocuments(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            [
                Query.equal('userId', authUser.$id),
                Query.limit(1)
            ]
        );

        if (existingUserResponse.documents.length > 0) {
            // User exists - update it
            const existingUser = existingUserResponse.documents[0];

            const updateData = {
                fullName: authUser.name || authUser.email?.split('@')[0] || 'Foydalanuvchi',
                email: authUser.email || '',
                phone: additionalData.phone || existingUser.phone || '',
                address: additionalData.address || existingUser.address || '',
                telegram_username: additionalData.telegram_username || existingUser.telegram_username || '',
                lastLoginAt: new Date().toISOString()
            };

            const updatedUser = await databases.updateDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                existingUser.$id,
                updateData
            );

            console.log('✅ User updated (unique):', updatedUser);
            return updatedUser;
        } else {
            // User doesn't exist - create it
            const userData = {
                userId: authUser.$id, // Unique key
                fullName: authUser.name || authUser.email?.split('@')[0] || 'Foydalanuvchi',
                email: authUser.email || '',
                phone: additionalData.phone || '',
                address: additionalData.address || '',
                telegram_username: additionalData.telegram_username || '',
                role: 'user',
                isActive: true,
                lastLoginAt: new Date().toISOString()
            };

            const newUser = await databases.createDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                ID.unique(),
                userData
            );

            console.log('✅ New user created (unique):', newUser);
            return newUser;
        }
    } catch (error) {
        // If unique constraint error
        if (error.code === 409 || error.message.includes('unique')) {
            console.log('⚠️ User already exists, retrying...');

            // Retry - only update
            const existingUserResponse = await databases.listDocuments(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                [
                    Query.equal('userId', authUser.$id),
                    Query.limit(1)
                ]
            );

            if (existingUserResponse.documents.length > 0) {
                const existingUser = existingUserResponse.documents[0];

                const updateData = {
                    lastLoginAt: new Date().toISOString()
                };

                const updatedUser = await databases.updateDocument(
                    DATABASE_ID,
                    USERS_COLLECTION_ID,
                    existingUser.$id,
                    updateData
                );

                console.log('✅ User updated (conflict resolved):', updatedUser);
                return updatedUser;
            }
        }

        console.error('❌ User sync error:', error);
        throw error;
    }
};

/**
 * Clean up duplicate users
 * @param {string} userId - Auth user ID
 * @returns {Object} Cleanup result
 */
export const cleanupDuplicateUsers = async (userId) => {
    try {
        // Find all duplicates
        const duplicatesResponse = await databases.listDocuments(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            [
                Query.equal('userId', userId),
                Query.limit(100) // Maximum 100
            ]
        );

        const duplicates = duplicatesResponse.documents;

        if (duplicates.length <= 1) {
            console.log('✅ No duplicates');
            return { cleaned: 0, kept: duplicates.length };
        }

        // Keep the newest record (largest $createdAt)
        const sortedDuplicates = duplicates.sort((a, b) =>
            new Date(b.$createdAt) - new Date(a.$createdAt)
        );

        const keepRecord = sortedDuplicates[0]; // Newest
        const deleteRecords = sortedDuplicates.slice(1); // Rest

        // Delete old records
        const deletePromises = deleteRecords.map(record =>
            databases.deleteDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                record.$id
            )
        );

        await Promise.all(deletePromises);

        console.log(`✅ ${deleteRecords.length} duplicates deleted, 1 kept`);

        return {
            cleaned: deleteRecords.length,
            kept: 1,
            keptRecord: keepRecord
        };
    } catch (error) {
        console.error('❌ Error cleaning duplicates:', error);
        throw error;
    }
};

/**
 * Clean duplicates for all users
 * WARNING: This function checks the entire database!
 */
export const cleanupAllDuplicates = async () => {
    try {
        console.log('🧹 Cleaning all duplicates...');

        // Get all users
        const allUsersResponse = await databases.listDocuments(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            [Query.limit(1000)] // Maximum limit
        );

        const allUsers = allUsersResponse.documents;

        // Group by userId
        const userGroups = {};
        allUsers.forEach(user => {
            if (!userGroups[user.userId]) {
                userGroups[user.userId] = [];
            }
            userGroups[user.userId].push(user);
        });

        let totalCleaned = 0;
        let totalKept = 0;

        // Clean duplicates for each group
        for (const [userId, users] of Object.entries(userGroups)) {
            if (users.length > 1) {
                const result = await cleanupDuplicateUsers(userId);
                totalCleaned += result.cleaned;
                totalKept += result.kept;
            } else {
                totalKept += 1;
            }
        }

        console.log(`✅ Cleanup completed: ${totalCleaned} deleted, ${totalKept} kept`);

        return {
            totalCleaned,
            totalKept,
            totalGroups: Object.keys(userGroups).length
        };
    } catch (error) {
        console.error('❌ Error cleaning all duplicates:', error);
        throw error;
    }
};