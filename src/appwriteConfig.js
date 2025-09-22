// Temporary compatibility layer for Appwrite to Firebase migration
// Bu fayl eski Appwrite kodlarini Firebase bilan ishlashi uchun yaratilgan

import { db, COLLECTIONS } from './firebaseConfig';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter 
} from 'firebase/firestore';
import { auth } from './firebaseConfig';

// Firebase Collections export
export const DATABASE_ID = 'firebase_db';
export const BOOKS_COLLECTION_ID = COLLECTIONS.BOOKS;
export const USERS_COLLECTION_ID = COLLECTIONS.USERS;
export const ORDERS_COLLECTION_ID = COLLECTIONS.ORDERS;
export const CART_COLLECTION_ID = COLLECTIONS.CART;
export const WISHLIST_COLLECTION_ID = COLLECTIONS.WISHLIST;
export const GENRES_COLLECTION_ID = COLLECTIONS.GENRES;
export const AUTHORS_COLLECTION_ID = COLLECTIONS.AUTHORS;
export const WAITLIST_COLLECTION_ID = COLLECTIONS.WAITLIST;
export const PREORDER_COLLECTION_ID = COLLECTIONS.PREORDER;

// Appwrite-style Query class for Firebase
export class Query {
  static equal(field, value) {
    return where(field, '==', value);
  }
  
  static notEqual(field, value) {
    return where(field, '!=', value);
  }
  
  static lessThan(field, value) {
    return where(field, '<', value);
  }
  
  static lessThanEqual(field, value) {
    return where(field, '<=', value);
  }
  
  static greaterThan(field, value) {
    return where(field, '>', value);
  }
  
  static greaterThanEqual(field, value) {
    return where(field, '>=', value);
  }
  
  static isNull(field) {
    return where(field, '==', null);
  }
  
  static isNotNull(field) {
    return where(field, '!=', null);
  }
  
  static between(field, min, max) {
    return [where(field, '>=', min), where(field, '<=', max)];
  }
  
  static startsWith(field, value) {
    return where(field, '>=', value);
  }
  
  static endsWith(field, value) {
    // Firebase doesn't support endsWith directly
    return where(field, '>=', value);
  }
  
  static search(field, value) {
    // Firebase doesn't support full-text search directly
    return where(field, '>=', value);
  }
  
  static orderAsc(field) {
    return orderBy(field, 'asc');
  }
  
  static orderDesc(field) {
    return orderBy(field, 'desc');
  }
  
  static limit(count) {
    return limit(count);
  }
  
  static offset(count) {
    // Firebase uses cursor-based pagination
    return startAfter(count);
  }
}

// Appwrite-style ID generator
export const ID = {
  unique() {
    return doc(collection(db, 'temp')).id;
  }
};

// Appwrite-style databases object
export const databases = {
  async listDocuments(databaseId, collectionId, queries = []) {
    try {
      let q = collection(db, collectionId);
      
      if (queries.length > 0) {
        q = query(q, ...queries);
      }
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        $id: doc.id,
        ...doc.data()
      }));
      
      return {
        documents,
        total: documents.length
      };
    } catch (error) {
      console.error('Error listing documents:', error);
      throw error;
    }
  },
  
  async getDocument(databaseId, collectionId, documentId) {
    try {
      const docRef = doc(db, collectionId, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          $id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        throw new Error('Document not found');
      }
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  },
  
  async createDocument(databaseId, collectionId, documentId, data) {
    try {
      if (documentId === ID.unique()) {
        const docRef = await addDoc(collection(db, collectionId), data);
        return {
          $id: docRef.id,
          ...data
        };
      } else {
        const docRef = doc(db, collectionId, documentId);
        await updateDoc(docRef, data);
        return {
          $id: documentId,
          ...data
        };
      }
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  },
  
  async updateDocument(databaseId, collectionId, documentId, data) {
    try {
      const docRef = doc(db, collectionId, documentId);
      await updateDoc(docRef, data);
      return {
        $id: documentId,
        ...data
      };
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },
  
  async deleteDocument(databaseId, collectionId, documentId) {
    try {
      const docRef = doc(db, collectionId, documentId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
};

// Appwrite-style account object
export const account = {
  async get() {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        if (user) {
          resolve({
            $id: user.uid,
            email: user.email,
            name: user.displayName,
            emailVerification: user.emailVerified
          });
        } else {
          reject(new Error('User not authenticated'));
        }
      });
    });
  },
  
  async create(userId, email, password, name) {
    // Firebase auth create user handled elsewhere
    throw new Error('Use Firebase auth directly for user creation');
  },
  
  async createEmailSession(email, password) {
    // Firebase auth sign in handled elsewhere
    throw new Error('Use Firebase auth directly for sign in');
  },
  
  async deleteSession(sessionId) {
    // Firebase auth sign out handled elsewhere
    throw new Error('Use Firebase auth directly for sign out');
  }
};

export default {
  databases,
  account,
  Query,
  ID
};