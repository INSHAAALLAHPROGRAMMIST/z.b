// Admin user yaratish uchun oddiy script
import { auth, db, COLLECTIONS } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const createAdminUser = async () => {
  try {
    console.log('🔥 Admin user yaratilmoqda...');
    
    const adminData = {
      email: 'admin@zamonbooks.uz',
      password: 'Admin123!',
      displayName: 'Admin User'
    };
    
    // 1. Firebase Auth da user yaratish
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      adminData.email, 
      adminData.password
    );
    
    const user = userCredential.user;
    console.log('✅ Firebase Auth user yaratildi:', user.uid);
    
    // 2. Firestore da admin ma'lumotlarini saqlash
    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      uid: user.uid,
      email: adminData.email,
      displayName: adminData.displayName,
      photoURL: 'https://res.cloudinary.com/dcn4maral/image/upload/v1/users/admin-avatar.jpg',
      emailVerified: true,
      phone: '+998901234567',
      
      // Admin huquqlari
      role: 'admin',
      isAdmin: true,
      isActive: true,
      permissions: [
        'books:read', 'books:write', 'books:delete',
        'users:read', 'users:write',
        'orders:read', 'orders:write',
        'analytics:read'
      ],
      
      // User statistikasi
      totalOrders: 0,
      totalSpent: 0,
      
      // Preferences
      preferences: {
        language: 'uz',
        currency: 'UZS',
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        theme: 'dark'
      },
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Admin ma\'lumotlari Firestore ga saqlandi');
    console.log('🎉 Admin user muvaffaqiyatli yaratildi!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('🔗 Admin panel: /admin-login');
    
    return {
      success: true,
      uid: user.uid,
      email: adminData.email,
      password: adminData.password
    };
    
  } catch (error) {
    console.error('❌ Admin user yaratishda xato:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ Bu email allaqachon mavjud!');
      console.log('💡 Firebase Console da o\'sha user ga admin huquqlarini bering');
    }
    
    throw error;
  }
};

// Global qilish (development va production uchun)
window.createAdminUser = createAdminUser;
console.log('👨‍💼 Admin creation function loaded!');
console.log('📋 Ishlatish: window.createAdminUser()');

// Development uchun qo'shimcha ma'lumot
if (import.meta.env.DEV) {
  console.log('🔧 Development mode: Admin functions available');
}