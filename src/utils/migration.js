// Firebase Data Migration and Setup Utility
import { db, COLLECTIONS } from '../firebaseConfig';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { seedFirebaseData } from './firebaseSeed';

// Firebase migration functions
export const migrationService = {
  // Firebase'ga sample data yaratish
  async setupFirebaseData() {
    try {
      console.log('🔥 Firebase setup boshlandi...');
      
      // Check if data already exists
      const booksSnapshot = await getDocs(collection(db, COLLECTIONS.BOOKS));
      if (!booksSnapshot.empty) {
        console.log('📚 Ma\'lumotlar allaqachon mavjud');
        return { 
          success: true, 
          message: 'Data already exists',
          books: booksSnapshot.size 
        };
      }
      
      // Create sample data
      const result = await seedFirebaseData();
      
      console.log('🎉 Firebase setup tugadi!');
      return result;
      
    } catch (error) {
      console.error('❌ Firebase setup xatosi:', error);
      throw error;
    }
  },

  // Migration holatini tekshirish
  async checkMigrationStatus() {
    try {
      const booksSnapshot = await getDocs(collection(db, COLLECTIONS.BOOKS));
      const genresSnapshot = await getDocs(collection(db, COLLECTIONS.GENRES));
      const authorsSnapshot = await getDocs(collection(db, COLLECTIONS.AUTHORS));
      
      return {
        books: booksSnapshot.size,
        genres: genresSnapshot.size,
        authors: authorsSnapshot.size,
        total: booksSnapshot.size + genresSnapshot.size + authorsSnapshot.size,
        isEmpty: booksSnapshot.empty && genresSnapshot.empty && authorsSnapshot.empty
      };
    } catch (error) {
      console.error('Migration status xatosi:', error);
      return { error: error.message };
    }
  },

  // Database'ni tozalash (development uchun)
  async clearDatabase() {
    if (!import.meta.env.DEV) {
      throw new Error('Database clearing only allowed in development mode');
    }
    
    try {
      console.log('🧹 Database tozalanmoqda...');
      
      // Get all collections
      const collections = [COLLECTIONS.BOOKS, COLLECTIONS.AUTHORS, COLLECTIONS.GENRES];
      
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        const batch = [];
        
        snapshot.forEach(doc => {
          batch.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(batch);
        console.log(`✅ ${collectionName} collection tozalandi`);
      }
      
      console.log('🎉 Database tozalandi!');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Database tozalashda xato:', error);
      throw error;
    }
  }
};

// Development uchun global qilish
if (import.meta.env.DEV) {
  window.migrationService = migrationService;
}