// Sample Users Creator - Test uchun
import { account, databases, ID } from '../appwriteConfig';
import { registerAndSync } from './userSync';

/**
 * Test uchun sample userlar yaratish
 */
export const createSampleUsers = async () => {
    try {
        const sampleUsers = [
            {
                email: 'user1@test.com',
                password: import.meta.env.VITE_DEFAULT_USER_PASSWORD || 'TempPass123!',
                name: 'Ali Valiyev'
            },
            {
                email: 'user2@test.com', 
                password: import.meta.env.VITE_DEFAULT_USER_PASSWORD || 'TempPass123!',
                name: 'Malika Karimova'
            },
            {
                email: 'admin@test.com',
                password: 'admin123',
                name: 'Admin User'
            }
        ];

        console.log('Sample userlar yaratilmoqda...');

        for (const userData of sampleUsers) {
            try {
                // Register va sync
                const result = await registerAndSync(userData.email, userData.password, userData.name);
                
                // Admin user uchun role o'zgartirish
                if (userData.email === 'admin@test.com') {
                    await databases.updateDocument(
                        import.meta.env.VITE_APPWRITE_DATABASE_ID,
                        import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID,
                        result.dbUser.$id,
                        {
                            role: 'admin'
                        }
                    );
                    console.log('Admin user yaratildi:', userData.email);
                } else {
                    console.log('User yaratildi:', userData.email);
                }

                // Logout qilish (keyingi user uchun)
                await account.deleteSession('current');
                
            } catch (err) {
                console.error(`${userData.email} yaratishda xato:`, err.message);
                // Agar user allaqachon mavjud bo'lsa, davom etamiz
                if (err.message.includes('already exists') || err.message.includes('user_already_exists')) {
                    console.log(`${userData.email} allaqachon mavjud`);
                    continue;
                }
            }
        }

        console.log('Sample userlar yaratish tugadi!');
        return sampleUsers.length;

    } catch (error) {
        console.error('Sample userlar yaratishda xato:', error);
        throw error;
    }
};

/**
 * Test userlarni login qilish uchun ma'lumotlar
 */
export const getSampleUserCredentials = () => {
    return [
        {
            email: 'user1@test.com',
            password: import.meta.env.VITE_DEFAULT_USER_PASSWORD || 'TempPass123!',
            name: 'Ali Valiyev',
            role: 'user'
        },
        {
            email: 'user2@test.com', 
            password: import.meta.env.VITE_DEFAULT_USER_PASSWORD || 'TempPass123!',
            name: 'Malika Karimova',
            role: 'user'
        },
        {
            email: 'admin@test.com',
            password: 'admin123',
            name: 'Admin User',
            role: 'admin'
        }
    ];
};