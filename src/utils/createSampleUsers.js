// Create Sample Users for Firebase
import { db, COLLECTIONS } from '../firebaseConfig';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export const createSampleUsers = async () => {
  try {
    console.log('🧪 Sample users yaratilmoqda...');

    const sampleUsers = [
      {
        uid: 'sample_user_001',
        email: 'user1@example.com',
        displayName: 'Test User 1',
        photoURL: 'https://res.cloudinary.com/dcn4maral/image/upload/v1/users/user1-avatar.jpg',
        emailVerified: true,
        phone: '+998901234567',
        role: 'user',
        isAdmin: false,
        isActive: true,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        uid: 'sample_user_002',
        email: 'user2@example.com',
        displayName: 'Test User 2',
        photoURL: 'https://res.cloudinary.com/dcn4maral/image/upload/v1/users/user2-avatar.jpg',
        emailVerified: true,
        phone: '+998901234568',
        role: 'user',
        isAdmin: false,
        isActive: true,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        uid: 'sample_admin_001',
        email: 'admin@zamonbooks.uz',
        displayName: 'Admin User',
        photoURL: 'https://res.cloudinary.com/dcn4maral/image/upload/v1/users/admin-avatar.jpg',
        emailVerified: true,
        phone: '+998901234569',
        role: 'admin',
        isAdmin: true,
        isActive: true,
        totalOrders: 0,
        totalSpent: 0,
        permissions: [
          'books:read', 'books:write', 'books:delete',
          'users:read', 'users:write',
          'orders:read', 'orders:write',
          'analytics:read'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    let createdCount = 0;
    
    for (const user of sampleUsers) {
      // Document ID sifatida UID ishlatish
      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), user);
      createdCount++;
      console.log(`✅ User yaratildi: ${user.displayName} (${user.email})`);
    }

    console.log(`🎉 ${createdCount} ta sample user yaratildi!`);
    
    return {
      success: true,
      message: `${createdCount} ta sample user muvaffaqiyatli yaratildi`,
      count: createdCount
    };

  } catch (error) {
    console.error('❌ Sample users yaratishda xato:', error);
    throw error;
  }
};

export const createSingleUser = async (userData) => {
  try {
    const userDoc = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (userData.uid) {
      await setDoc(doc(db, COLLECTIONS.USERS, userData.uid), userDoc);
    } else {
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), userDoc);
      userDoc.uid = docRef.id;
    }

    console.log(`✅ User yaratildi: ${userDoc.displayName || userDoc.email}`);
    
    return {
      success: true,
      user: userDoc
    };

  } catch (error) {
    console.error('❌ User yaratishda xato:', error);
    throw error;
  }
};

// Development uchun global qilish
if (import.meta.env.DEV) {
  window.createSampleUsers = createSampleUsers;
  window.createSingleUser = createSingleUser;
  
  console.log('👥 Sample Users functions loaded!');
  console.log('📋 Available functions:');
  console.log('   - window.createSampleUsers() - Create sample users');
  console.log('   - window.createSingleUser(userData) - Create single user');
}

export default {
  createSampleUsers,
  createSingleUser
};