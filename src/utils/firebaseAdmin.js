// Firebase Admin Utilities - Appwrite'dan Firebase'ga migration
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebaseConfig';

// Firebase Admin Class - Appwrite'ga o'xshash API
export class FirebaseAdmin {
  
  // List Documents (Appwrite'dagi listDocuments'ga o'xshash)
  async listDocuments(collectionName, queries = []) {
    try {
      let q = collection(db, collectionName);
      
      // Apply queries
      queries.forEach(queryItem => {
        if (queryItem.type === 'where') {
          q = query(q, where(queryItem.field, queryItem.operator, queryItem.value));
        } else if (queryItem.type === 'orderBy') {
          q = query(q, orderBy(queryItem.field, queryItem.direction || 'asc'));
        } else if (queryItem.type === 'limit') {
          q = query(q, limit(queryItem.value));
        }
      });
      
      const snapshot = await getDocs(q);
      const documents = [];
      
      snapshot.forEach(doc => {
        documents.push({
          $id: doc.id,
          ...doc.data(),
          $createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          $updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        });
      });
      
      return {
        documents,
        total: documents.length
      };
    } catch (error) {
      console.error(`Error listing ${collectionName}:`, error);
      throw error;
    }
  }
  
  // Get Document
  async getDocument(collectionName, documentId) {
    try {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          $id: docSnap.id,
          ...docSnap.data(),
          $createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
          $updatedAt: docSnap.data().updatedAt?.toDate?.() || new Date()
        };
      } else {
        throw new Error('Document not found');
      }
    } catch (error) {
      console.error(`Error getting document ${documentId}:`, error);
      throw error;
    }
  }
  
  // Create Document
  async createDocument(collectionName, documentId, data) {
    try {
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      if (documentId) {
        // Create with specific ID
        const docRef = doc(db, collectionName, documentId);
        await updateDoc(docRef, docData);
        return { $id: documentId, ...docData };
      } else {
        // Auto-generate ID
        const docRef = await addDoc(collection(db, collectionName), docData);
        return { $id: docRef.id, ...docData };
      }
    } catch (error) {
      console.error(`Error creating document:`, error);
      throw error;
    }
  }
  
  // Update Document
  async updateDocument(collectionName, documentId, data) {
    try {
      const docRef = doc(db, collectionName, documentId);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
      return { $id: documentId, ...updateData };
    } catch (error) {
      console.error(`Error updating document ${documentId}:`, error);
      throw error;
    }
  }
  
  // Delete Document
  async deleteDocument(collectionName, documentId) {
    try {
      const docRef = doc(db, collectionName, documentId);
      await deleteDoc(docRef);
      return { $id: documentId };
    } catch (error) {
      console.error(`Error deleting document ${documentId}:`, error);
      throw error;
    }
  }
  
  // Batch Operations
  async batchWrite(operations) {
    try {
      const batch = writeBatch(db);
      
      operations.forEach(operation => {
        const docRef = doc(db, operation.collection, operation.id);
        
        if (operation.type === 'set') {
          batch.set(docRef, {
            ...operation.data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else if (operation.type === 'update') {
          batch.update(docRef, {
            ...operation.data,
            updatedAt: serverTimestamp()
          });
        } else if (operation.type === 'delete') {
          batch.delete(docRef);
        }
      });
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error in batch write:', error);
      throw error;
    }
  }
}

// Query helpers (Appwrite'dagi Query'ga o'xshash)
export const FirebaseQuery = {
  equal: (field, value) => ({ type: 'where', field, operator: '==', value }),
  notEqual: (field, value) => ({ type: 'where', field, operator: '!=', value }),
  lessThan: (field, value) => ({ type: 'where', field, operator: '<', value }),
  lessThanEqual: (field, value) => ({ type: 'where', field, operator: '<=', value }),
  greaterThan: (field, value) => ({ type: 'where', field, operator: '>', value }),
  greaterThanEqual: (field, value) => ({ type: 'where', field, operator: '>=', value }),
  search: (field, value) => ({ type: 'where', field, operator: 'array-contains', value }),
  orderAsc: (field) => ({ type: 'orderBy', field, direction: 'asc' }),
  orderDesc: (field) => ({ type: 'orderBy', field, direction: 'desc' }),
  limit: (value) => ({ type: 'limit', value })
};

// Global instance
export const firebaseAdmin = new FirebaseAdmin();

// Collection-specific helpers
export const BooksAdmin = {
  // Appwrite-compatible methods
  async listDocuments(filters = {}) {
    const queries = [];
    
    // Apply filters
    if (filters.search) {
      // For search, we'll get all and filter client-side (Firebase doesn't have full-text search)
      const allBooks = await firebaseAdmin.listDocuments(COLLECTIONS.BOOKS);
      const searchTerm = filters.search.toLowerCase();
      const filteredBooks = allBooks.documents.filter(book => 
        book.title?.toLowerCase().includes(searchTerm) ||
        book.authorName?.toLowerCase().includes(searchTerm) ||
        book.description?.toLowerCase().includes(searchTerm)
      );
      
      return {
        documents: filteredBooks,
        total: filteredBooks.length
      };
    }
    
    if (filters.authorId) {
      queries.push(where('authorId', '==', filters.authorId));
    }
    
    if (filters.genreId) {
      queries.push(where('genreId', '==', filters.genreId));
    }
    
    if (filters.limit) {
      queries.push(limit(filters.limit));
    }
    
    // Default ordering
    queries.push(orderBy('createdAt', 'desc'));
    
    return firebaseAdmin.listDocuments(COLLECTIONS.BOOKS, queries);
  },
  
  async getDocument(id) {
    return firebaseAdmin.getDocument(COLLECTIONS.BOOKS, id);
  },
  
  async createDocument(data) {
    return firebaseAdmin.createDocument(COLLECTIONS.BOOKS, null, data);
  },
  
  async updateDocument(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.BOOKS, id, data);
  },
  
  async deleteDocument(id) {
    return firebaseAdmin.deleteDocument(COLLECTIONS.BOOKS, id);
  },
  
  // Legacy methods for compatibility
  async getAll(queries = []) {
    return firebaseAdmin.listDocuments(COLLECTIONS.BOOKS, queries);
  },
  
  async getById(id) {
    return firebaseAdmin.getDocument(COLLECTIONS.BOOKS, id);
  },
  
  async create(data) {
    return firebaseAdmin.createDocument(COLLECTIONS.BOOKS, null, data);
  },
  
  async update(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.BOOKS, id, data);
  },
  
  async delete(id) {
    return firebaseAdmin.deleteDocument(COLLECTIONS.BOOKS, id);
  }
};

export const AuthorsAdmin = {
  // Appwrite-compatible methods
  async listDocuments() {
    return firebaseAdmin.listDocuments(COLLECTIONS.AUTHORS, [
      orderBy('name', 'asc')
    ]);
  },
  
  async createDocument(data) {
    return firebaseAdmin.createDocument(COLLECTIONS.AUTHORS, null, data);
  },
  
  async updateDocument(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.AUTHORS, id, data);
  },
  
  async deleteDocument(id) {
    return firebaseAdmin.deleteDocument(COLLECTIONS.AUTHORS, id);
  },
  
  // Legacy methods
  async getAll() {
    return firebaseAdmin.listDocuments(COLLECTIONS.AUTHORS);
  },
  
  async create(data) {
    return firebaseAdmin.createDocument(COLLECTIONS.AUTHORS, null, data);
  },
  
  async update(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.AUTHORS, id, data);
  },
  
  async delete(id) {
    return firebaseAdmin.deleteDocument(COLLECTIONS.AUTHORS, id);
  }
};

export const GenresAdmin = {
  // Appwrite-compatible methods
  async listDocuments() {
    return firebaseAdmin.listDocuments(COLLECTIONS.GENRES, [
      orderBy('name', 'asc')
    ]);
  },
  
  async createDocument(data) {
    return firebaseAdmin.createDocument(COLLECTIONS.GENRES, null, data);
  },
  
  async updateDocument(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.GENRES, id, data);
  },
  
  async deleteDocument(id) {
    return firebaseAdmin.deleteDocument(COLLECTIONS.GENRES, id);
  },
  
  // Legacy methods
  async getAll() {
    return firebaseAdmin.listDocuments(COLLECTIONS.GENRES);
  },
  
  async create(data) {
    return firebaseAdmin.createDocument(COLLECTIONS.GENRES, null, data);
  },
  
  async update(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.GENRES, id, data);
  },
  
  async delete(id) {
    return firebaseAdmin.deleteDocument(COLLECTIONS.GENRES, id);
  }
};

export const UsersAdmin = {
  // Appwrite-compatible methods
  async listDocuments() {
    return firebaseAdmin.listDocuments(COLLECTIONS.USERS, [
      orderBy('createdAt', 'desc')
    ]);
  },
  
  async getDocument(id) {
    return firebaseAdmin.getDocument(COLLECTIONS.USERS, id);
  },
  
  async updateDocument(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.USERS, id, data);
  },
  
  // Legacy methods
  async getAll() {
    return firebaseAdmin.listDocuments(COLLECTIONS.USERS);
  },
  
  async getById(id) {
    return firebaseAdmin.getDocument(COLLECTIONS.USERS, id);
  },
  
  async update(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.USERS, id, data);
  }
};

export const OrdersAdmin = {
  // Appwrite-compatible methods
  async listDocuments(queries = []) {
    return firebaseAdmin.listDocuments(COLLECTIONS.ORDERS, queries);
  },
  
  async getDocument(id) {
    return firebaseAdmin.getDocument(COLLECTIONS.ORDERS, id);
  },
  
  async updateDocument(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.ORDERS, id, data);
  },
  
  // Legacy methods
  async getAll(queries = []) {
    return firebaseAdmin.listDocuments(COLLECTIONS.ORDERS, queries);
  },
  
  async getById(id) {
    return firebaseAdmin.getDocument(COLLECTIONS.ORDERS, id);
  },
  
  async update(id, data) {
    return firebaseAdmin.updateDocument(COLLECTIONS.ORDERS, id, data);
  },
  
  async getRecentOrders(limitCount = 10) {
    return this.getAll([
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ]);
  }
};