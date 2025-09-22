// User Sync utilities for Firebase
import { db, COLLECTIONS } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';

export const userSync = {
  // Firebase Auth user ni Firestore ga sync qilish
  async syncUserToFirestore(user) {
    try {
      if (!user) return null;

      const userRef = doc(db, COLLECTIONS.USERS, user.uid);
      const userSnap = await getDoc(userRef);

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        emailVerified: user.emailVerified,
        updatedAt: new Date()
      };

      if (userSnap.exists()) {
        // User mavjud - yangilash
        await updateDoc(userRef, userData);
        console.log('✅ User updated in Firestore:', user.email);
      } else {
        // Yangi user - yaratish
        const newUserData = {
          ...userData,
          role: 'user',
          isAdmin: false,
          isActive: true,
          totalOrders: 0,
          totalSpent: 0,
          preferences: {
            language: 'uz',
            currency: 'UZS',
            notifications: {
              email: true,
              sms: false,
              push: true
            },
            theme: 'dark'
          },
          createdAt: new Date()
        };

        await setDoc(userRef, newUserData);
        console.log('✅ New user created in Firestore:', user.email);
      }

      return userData;
    } catch (error) {
      console.error('❌ Error syncing user to Firestore:', error);
      throw error;
    }
  },

  // Firestore dan user ma'lumotlarini olish
  async getUserFromFirestore(uid) {
    try {
      if (!uid) return null;

      const userRef = doc(db, COLLECTIONS.USERS, uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return {
          id: userSnap.id,
          ...userSnap.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting user from Firestore:', error);
      throw error;
    }
  },

  // User profilini yangilash
  async updateUserProfile(uid, updateData) {
    try {
      if (!uid) throw new Error('User ID required');

      const userRef = doc(db, COLLECTIONS.USERS, uid);
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: new Date()
      });

      console.log('✅ User profile updated:', uid);
      return true;
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  },

  // User preferences yangilash
  async updateUserPreferences(uid, preferences) {
    try {
      if (!uid) throw new Error('User ID required');

      const userRef = doc(db, COLLECTIONS.USERS, uid);
      await updateDoc(userRef, {
        preferences,
        updatedAt: new Date()
      });

      console.log('✅ User preferences updated:', uid);
      return true;
    } catch (error) {
      console.error('❌ Error updating user preferences:', error);
      throw error;
    }
  },

  // Current user ni olish va sync qilish
  async getCurrentUser() {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        
        if (user) {
          try {
            // Firebase Auth user ni Firestore ga sync qilish
            await this.syncUserToFirestore(user);
            
            // Firestore dan to'liq ma'lumotlarni olish
            const firestoreUser = await this.getUserFromFirestore(user.uid);
            
            resolve({
              ...user,
              ...firestoreUser
            });
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(null);
        }
      });
    });
  },

  // User statistikasini yangilash
  async updateUserStats(uid, stats) {
    try {
      if (!uid) throw new Error('User ID required');

      const userRef = doc(db, COLLECTIONS.USERS, uid);
      await updateDoc(userRef, {
        ...stats,
        updatedAt: new Date()
      });

      console.log('✅ User stats updated:', uid);
      return true;
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
      throw error;
    }
  }
};

export default userSync;