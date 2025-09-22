// Firebase Service Layer - Barcha database operatsiyalari uchun
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
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebaseConfig';
import cloudinaryService from './CloudinaryService';

class FirebaseService {
  constructor() {
    this.db = db;
    this.collections = COLLECTIONS;
  }

  // ===============================================
  // BOOKS OPERATIONS
  // ===============================================

  /**
   * Get all books with optional filtering and pagination
   */
  async getBooks(options = {}) {
    try {
      const {
        limitCount = 50,
        orderByField = 'createdAt',
        orderDirection = 'desc',
        filters = {},
        startAfterDoc = null
      } = options;

      let q = collection(this.db, this.collections.BOOKS);

      // Apply filters
      if (filters.isAvailable !== undefined) {
        q = query(q, where('isAvailable', '==', filters.isAvailable));
      }
      if (filters.isFeatured !== undefined) {
        q = query(q, where('isFeatured', '==', filters.isFeatured));
      }
      if (filters.genreId) {
        q = query(q, where('genreId', '==', filters.genreId));
      }
      if (filters.authorId) {
        q = query(q, where('authorId', '==', filters.authorId));
      }
      if (filters.stockStatus) {
        q = query(q, where('stockStatus', '==', filters.stockStatus));
      }

      // Apply ordering
      q = query(q, orderBy(orderByField, orderDirection));

      // Apply pagination
      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      // Apply limit
      q = query(q, limit(limitCount));

      const snapshot = await getDocs(q);
      const books = [];
      
      snapshot.forEach((doc) => {
        books.push({
          id: doc.id,
          $id: doc.id, // Compatibility
          ...doc.data()
        });
      });

      return {
        documents: books,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount
      };
    } catch (error) {
      console.error('Error getting books:', error);
      throw new Error(`Books yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Get single book by ID
   */
  async getBookById(bookId) {
    try {
      const docRef = doc(this.db, this.collections.BOOKS, bookId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          $id: docSnap.id, // Compatibility
          ...docSnap.data()
        };
      } else {
        throw new Error('Kitob topilmadi');
      }
    } catch (error) {
      console.error('Error getting book:', error);
      throw new Error(`Kitob yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Get book by slug
   */
  async getBookBySlug(slug) {
    try {
      const q = query(
        collection(this.db, this.collections.BOOKS),
        where('slug', '==', slug),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          $id: doc.id, // Compatibility
          ...doc.data()
        };
      } else {
        throw new Error('Kitob topilmadi');
      }
    } catch (error) {
      console.error('Error getting book by slug:', error);
      throw new Error(`Kitob yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Create new book (Admin only)
   */
  async createBook(bookData) {
    try {
      const docRef = await addDoc(collection(this.db, this.collections.BOOKS), {
        ...bookData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        viewCount: 0,
        salesCount: 0,
        demandScore: 0,
        rating: 0,
        reviewCount: 0
      });

      return {
        id: docRef.id,
        $id: docRef.id, // Compatibility
        ...bookData
      };
    } catch (error) {
      console.error('Error creating book:', error);
      throw new Error(`Kitob yaratishda xato: ${error.message}`);
    }
  }

  /**
   * Create new book with Cloudinary image support (Admin only)
   * Requirements: 1.1, 1.2
   */
  async createBookWithImage(bookData, imageFile = null, additionalImages = []) {
    try {
      let processedBookData = { ...bookData };

      // Handle main image upload
      if (imageFile) {
        const uploadResult = await cloudinaryService.uploadImage(imageFile, {
          folder: 'zamon-books/covers',
          tags: ['book-cover', bookData.title?.replace(/\s+/g, '-').toLowerCase()],
          context: {
            book_title: bookData.title,
            book_author: bookData.authorName
          }
        });

        if (uploadResult.success) {
          const imageData = uploadResult.data;
          processedBookData.images = {
            main: imageData.url,
            publicId: imageData.publicId,
            thumbnail: cloudinaryService.getBookThumbnailUrl(imageData.publicId),
            gallery: []
          };

          // Generate different sized URLs for responsive display
          processedBookData.imageUrls = cloudinaryService.getBookCoverUrls(imageData.publicId);
        }
      }

      // Handle additional gallery images
      if (additionalImages && additionalImages.length > 0) {
        const galleryUploadResult = await cloudinaryService.uploadMultipleImages(additionalImages, {
          folder: 'zamon-books/gallery',
          tags: ['book-gallery', bookData.title?.replace(/\s+/g, '-').toLowerCase()],
          concurrent: 2
        });

        if (galleryUploadResult.success && galleryUploadResult.results.length > 0) {
          if (!processedBookData.images) {
            processedBookData.images = { gallery: [] };
          }
          
          processedBookData.images.gallery = galleryUploadResult.results.map(result => ({
            url: result.data.url,
            publicId: result.data.publicId,
            thumbnail: cloudinaryService.getBookThumbnailUrl(result.data.publicId)
          }));
        }
      }

      // Enhanced book data with inventory and SEO fields
      const enhancedBookData = {
        ...processedBookData,
        inventory: {
          stock: bookData.stock || 0,
          reserved: 0,
          lowStockThreshold: bookData.lowStockThreshold || 5,
          restockDate: bookData.restockDate || null
        },
        seo: {
          slug: bookData.slug || this.generateSlug(bookData.title),
          metaTitle: bookData.metaTitle || bookData.title,
          metaDescription: bookData.metaDescription || bookData.description?.substring(0, 160),
          keywords: bookData.keywords || []
        },
        analytics: {
          viewCount: 0,
          salesCount: 0,
          wishlistCount: 0,
          rating: 0,
          reviewCount: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: bookData.isAvailable ? serverTimestamp() : null
      };

      const docRef = await addDoc(collection(this.db, this.collections.BOOKS), enhancedBookData);

      return {
        id: docRef.id,
        $id: docRef.id,
        ...enhancedBookData
      };
    } catch (error) {
      console.error('Error creating book with image:', error);
      throw new Error(`Rasm bilan kitob yaratishda xato: ${error.message}`);
    }
  }

  /**
   * Update book (Admin only)
   */
  async updateBook(bookId, updates) {
    try {
      const docRef = doc(this.db, this.collections.BOOKS, bookId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return await this.getBookById(bookId);
    } catch (error) {
      console.error('Error updating book:', error);
      throw new Error(`Kitob yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Delete book (Admin only)
   */
  async deleteBook(bookId) {
    try {
      await deleteDoc(doc(this.db, this.collections.BOOKS, bookId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting book:', error);
      throw new Error(`Kitob o'chirishda xato: ${error.message}`);
    }
  }

  /**
   * Search books by title, author, or description
   */
  async searchBooks(searchQuery, options = {}) {
    try {
      const { limitCount = 20 } = options;
      
      // Simple search implementation
      // For advanced search, consider using Algolia or similar service
      const q = query(
        collection(this.db, this.collections.BOOKS),
        where('isAvailable', '==', true),
        orderBy('title'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const allBooks = [];
      
      snapshot.forEach((doc) => {
        allBooks.push({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        });
      });

      // Client-side filtering for search
      const searchLower = searchQuery.toLowerCase();
      const filteredBooks = allBooks.filter(book => 
        book.title?.toLowerCase().includes(searchLower) ||
        book.authorName?.toLowerCase().includes(searchLower) ||
        book.description?.toLowerCase().includes(searchLower)
      );

      return { documents: filteredBooks };
    } catch (error) {
      console.error('Error searching books:', error);
      throw new Error(`Qidirishda xato: ${error.message}`);
    }
  }

  /**
   * Increment book view count
   */
  async incrementBookViews(bookId) {
    try {
      const docRef = doc(this.db, this.collections.BOOKS, bookId);
      await updateDoc(docRef, {
        viewCount: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error incrementing book views:', error);
      // Don't throw error for view counting
    }
  }

  /**
   * Batch update multiple books (Admin only)
   * Requirements: 1.1, 1.2
   */
  async batchUpdateBooks(updates) {
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error('Updates array is required and cannot be empty');
      }

      if (updates.length > 500) {
        throw new Error('Batch size cannot exceed 500 operations');
      }

      const batch = writeBatch(this.db);
      const results = [];

      for (const update of updates) {
        const { bookId, data } = update;
        
        if (!bookId || !data) {
          throw new Error('Each update must have bookId and data properties');
        }

        const docRef = doc(this.db, this.collections.BOOKS, bookId);
        const updateData = {
          ...data,
          updatedAt: serverTimestamp()
        };

        batch.update(docRef, updateData);
        results.push({ bookId, status: 'pending' });
      }

      await batch.commit();

      return {
        success: true,
        results: results.map(r => ({ ...r, status: 'completed' })),
        summary: {
          total: updates.length,
          successful: updates.length,
          failed: 0
        }
      };
    } catch (error) {
      console.error('Error in batch update books:', error);
      throw new Error(`Kitoblarni batch yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Advanced search with multiple filters
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  async advancedSearch(searchQuery = '', filters = {}) {
    try {
      const {
        genres = [],
        authors = [],
        priceRange = { min: null, max: null },
        availability = null,
        sortBy = 'relevance',
        sortOrder = 'desc',
        limitCount = 50,
        startAfterDoc = null
      } = filters;

      let q = collection(this.db, this.collections.BOOKS);
      const queryConstraints = [];

      // Basic availability filter
      if (availability !== null) {
        queryConstraints.push(where('isAvailable', '==', availability));
      } else {
        // Default to available books only
        queryConstraints.push(where('isAvailable', '==', true));
      }

      // Genre filter
      if (genres.length > 0) {
        if (genres.length === 1) {
          queryConstraints.push(where('genreId', '==', genres[0]));
        } else {
          queryConstraints.push(where('genreId', 'in', genres.slice(0, 10))); // Firestore limit
        }
      }

      // Author filter
      if (authors.length > 0) {
        if (authors.length === 1) {
          queryConstraints.push(where('authorId', '==', authors[0]));
        } else {
          queryConstraints.push(where('authorId', 'in', authors.slice(0, 10))); // Firestore limit
        }
      }

      // Price range filter
      if (priceRange.min !== null) {
        queryConstraints.push(where('price', '>=', priceRange.min));
      }
      if (priceRange.max !== null) {
        queryConstraints.push(where('price', '<=', priceRange.max));
      }

      // Sorting
      let orderByField = 'createdAt';
      let orderDirection = 'desc';

      switch (sortBy) {
        case 'price':
          orderByField = 'price';
          orderDirection = sortOrder;
          break;
        case 'title':
          orderByField = 'title';
          orderDirection = sortOrder;
          break;
        case 'popularity':
          orderByField = 'viewCount';
          orderDirection = 'desc';
          break;
        case 'rating':
          orderByField = 'rating';
          orderDirection = 'desc';
          break;
        case 'newest':
          orderByField = 'createdAt';
          orderDirection = 'desc';
          break;
        case 'oldest':
          orderByField = 'createdAt';
          orderDirection = 'asc';
          break;
        default:
          orderByField = 'createdAt';
          orderDirection = 'desc';
      }

      queryConstraints.push(orderBy(orderByField, orderDirection));

      // Pagination
      if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
      }

      queryConstraints.push(limit(limitCount));

      // Build and execute query
      q = query(q, ...queryConstraints);
      const snapshot = await getDocs(q);
      
      let books = [];
      snapshot.forEach((doc) => {
        books.push({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        });
      });

      // Client-side text search if search query provided
      if (searchQuery && searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim();
        books = books.filter(book => {
          const titleMatch = book.title?.toLowerCase().includes(searchLower);
          const authorMatch = book.authorName?.toLowerCase().includes(searchLower);
          const descriptionMatch = book.description?.toLowerCase().includes(searchLower);
          const keywordMatch = book.seo?.keywords?.some(keyword => 
            keyword.toLowerCase().includes(searchLower)
          );
          
          return titleMatch || authorMatch || descriptionMatch || keywordMatch;
        });

        // Re-sort by relevance if search query provided
        if (sortBy === 'relevance') {
          books.sort((a, b) => {
            const aScore = this.calculateRelevanceScore(a, searchLower);
            const bScore = this.calculateRelevanceScore(b, searchLower);
            return bScore - aScore;
          });
        }
      }

      return {
        documents: books,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount,
        totalFound: books.length,
        searchQuery,
        filters: filters
      };
    } catch (error) {
      console.error('Error in advanced search:', error);
      throw new Error(`Kengaytirilgan qidiruvda xato: ${error.message}`);
    }
  }

  /**
   * Calculate relevance score for search results
   * @private
   */
  calculateRelevanceScore(book, searchQuery) {
    let score = 0;
    const query = searchQuery.toLowerCase();

    // Title matches get highest score
    if (book.title?.toLowerCase().includes(query)) {
      score += 10;
      if (book.title?.toLowerCase().startsWith(query)) {
        score += 5; // Bonus for starting with query
      }
    }

    // Author matches
    if (book.authorName?.toLowerCase().includes(query)) {
      score += 7;
    }

    // Description matches
    if (book.description?.toLowerCase().includes(query)) {
      score += 3;
    }

    // Keyword matches
    if (book.seo?.keywords?.some(keyword => keyword.toLowerCase().includes(query))) {
      score += 5;
    }

    // Boost popular books slightly
    score += Math.min(book.viewCount || 0, 100) * 0.01;
    score += Math.min(book.salesCount || 0, 50) * 0.02;

    return score;
  }

  /**
   * Get analytics data for admin dashboard
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  async getAnalyticsData(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const analytics = {
        books: {},
        orders: {},
        users: {},
        revenue: {},
        inventory: {}
      };

      // Books analytics
      const booksQuery = query(
        collection(this.db, this.collections.BOOKS),
        orderBy('createdAt', 'desc'),
        limit(1000)
      );
      const booksSnapshot = await getDocs(booksQuery);
      
      let totalBooks = 0;
      let availableBooks = 0;
      let totalViews = 0;
      let totalSales = 0;
      let lowStockBooks = 0;

      booksSnapshot.forEach((doc) => {
        const book = doc.data();
        totalBooks++;
        
        if (book.isAvailable) availableBooks++;
        totalViews += book.viewCount || 0;
        totalSales += book.salesCount || 0;
        
        if ((book.inventory?.stock || book.stock || 0) <= (book.inventory?.lowStockThreshold || 5)) {
          lowStockBooks++;
        }
      });

      analytics.books = {
        total: totalBooks,
        available: availableBooks,
        unavailable: totalBooks - availableBooks,
        totalViews,
        totalSales,
        lowStock: lowStockBooks,
        averageViewsPerBook: totalBooks > 0 ? Math.round(totalViews / totalBooks) : 0
      };

      // Orders analytics
      let ordersQuery = query(
        collection(this.db, this.collections.ORDERS),
        orderBy('createdAt', 'desc'),
        limit(1000)
      );

      if (startDate) {
        ordersQuery = query(ordersQuery, where('createdAt', '>=', startDate));
      }
      if (endDate) {
        ordersQuery = query(ordersQuery, where('createdAt', '<=', endDate));
      }

      const ordersSnapshot = await getDocs(ordersQuery);
      
      let totalOrders = 0;
      let totalRevenue = 0;
      let pendingOrders = 0;
      let completedOrders = 0;
      let cancelledOrders = 0;

      ordersSnapshot.forEach((doc) => {
        const order = doc.data();
        totalOrders++;
        totalRevenue += order.totalAmount || 0;
        
        switch (order.status) {
          case 'pending':
            pendingOrders++;
            break;
          case 'completed':
          case 'delivered':
            completedOrders++;
            break;
          case 'cancelled':
            cancelledOrders++;
            break;
        }
      });

      analytics.orders = {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
      };

      analytics.revenue = {
        total: totalRevenue,
        average: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        currency: 'UZS'
      };

      // Users analytics
      const usersQuery = query(
        collection(this.db, this.collections.USERS),
        limit(1000)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      let totalUsers = 0;
      let activeUsers = 0;
      let adminUsers = 0;

      usersSnapshot.forEach((doc) => {
        const user = doc.data();
        totalUsers++;
        
        if (user.isActive) activeUsers++;
        if (user.isAdmin) adminUsers++;
      });

      analytics.users = {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        admins: adminUsers
      };

      // Top performing books
      const topBooksQuery = query(
        collection(this.db, this.collections.BOOKS),
        orderBy('salesCount', 'desc'),
        limit(10)
      );
      const topBooksSnapshot = await getDocs(topBooksQuery);
      
      analytics.topBooks = [];
      topBooksSnapshot.forEach((doc) => {
        analytics.topBooks.push({
          id: doc.id,
          title: doc.data().title,
          salesCount: doc.data().salesCount || 0,
          viewCount: doc.data().viewCount || 0,
          revenue: (doc.data().salesCount || 0) * (doc.data().price || 0)
        });
      });

      return {
        success: true,
        data: analytics,
        generatedAt: new Date().toISOString(),
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw new Error(`Analitika ma'lumotlarini olishda xato: ${error.message}`);
    }
  }

  /**
   * Update inventory for a book
   * Requirements: 1.1, 1.2
   */
  async updateInventory(bookId, stockChange, options = {}) {
    try {
      const { 
        reason = 'manual_adjustment',
        notes = '',
        lowStockThreshold = null,
        restockDate = null
      } = options;

      return await runTransaction(this.db, async (transaction) => {
        const bookRef = doc(this.db, this.collections.BOOKS, bookId);
        const bookDoc = await transaction.get(bookRef);

        if (!bookDoc.exists()) {
          throw new Error('Kitob topilmadi');
        }

        const bookData = bookDoc.data();
        const currentStock = bookData.inventory?.stock || bookData.stock || 0;
        const newStock = Math.max(0, currentStock + stockChange);

        const updateData = {
          updatedAt: serverTimestamp()
        };

        // Update inventory object if it exists, otherwise update legacy stock field
        if (bookData.inventory) {
          updateData['inventory.stock'] = newStock;
          if (lowStockThreshold !== null) {
            updateData['inventory.lowStockThreshold'] = lowStockThreshold;
          }
          if (restockDate !== null) {
            updateData['inventory.restockDate'] = restockDate;
          }
        } else {
          updateData.stock = newStock;
        }

        // Update availability based on stock
        updateData.isAvailable = newStock > 0;

        transaction.update(bookRef, updateData);

        // Log inventory change
        const inventoryLogRef = doc(collection(this.db, 'inventory_logs'));
        transaction.set(inventoryLogRef, {
          bookId,
          previousStock: currentStock,
          newStock,
          change: stockChange,
          reason,
          notes,
          createdAt: serverTimestamp()
        });

        return {
          bookId,
          previousStock: currentStock,
          newStock,
          change: stockChange,
          isAvailable: newStock > 0
        };
      });
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw new Error(`Inventar yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Get low stock books for alerts
   * Requirements: 1.1, 1.2
   */
  async getLowStockBooks(threshold = 5) {
    try {
      const q = query(
        collection(this.db, this.collections.BOOKS),
        where('isAvailable', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const lowStockBooks = [];

      snapshot.forEach((doc) => {
        const book = doc.data();
        const stock = book.inventory?.stock || book.stock || 0;
        const lowStockThreshold = book.inventory?.lowStockThreshold || threshold;

        if (stock <= lowStockThreshold) {
          lowStockBooks.push({
            id: doc.id,
            $id: doc.id,
            ...book,
            currentStock: stock,
            threshold: lowStockThreshold
          });
        }
      });

      return {
        documents: lowStockBooks,
        count: lowStockBooks.length
      };
    } catch (error) {
      console.error('Error getting low stock books:', error);
      throw new Error(`Kam qolgan kitoblarni olishda xato: ${error.message}`);
    }
  }

  /**
   * Generate slug from title
   * @private
   */
  generateSlug(title) {
    if (!title) return '';
    
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  // ===============================================
  // USERS OPERATIONS
  // ===============================================

  /**
   * Create user profile
   */
  async createUser(userData) {
    try {
      const docRef = doc(this.db, this.collections.USERS, userData.uid);
      await updateDoc(docRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        loginCount: 0,
        totalOrders: 0,
        totalSpent: 0,
        isActive: true,
        isVerified: false,
        role: 'user',
        isAdmin: false
      });

      return await this.getUserById(userData.uid);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Foydalanuvchi yaratishda xato: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const docRef = doc(this.db, this.collections.USERS, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          uid: docSnap.id,
          ...docSnap.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error(`Foydalanuvchi ma'lumotlarini yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId, updates) {
    try {
      const docRef = doc(this.db, this.collections.USERS, userId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(`Foydalanuvchi ma'lumotlarini yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Update user login stats
   */
  async updateUserLoginStats(userId) {
    try {
      const docRef = doc(this.db, this.collections.USERS, userId);
      await updateDoc(docRef, {
        lastLoginAt: serverTimestamp(),
        loginCount: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating login stats:', error);
      // Don't throw error for stats
    }
  }

  // ===============================================
  // CART OPERATIONS
  // ===============================================

  /**
   * Get cart items for user
   */
  async getCartItems(userId) {
    try {
      const q = query(
        collection(this.db, this.collections.CART),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const cartItems = [];
      
      snapshot.forEach((doc) => {
        cartItems.push({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        });
      });

      return { documents: cartItems };
    } catch (error) {
      console.error('Error getting cart items:', error);
      throw new Error(`Savat ma'lumotlarini yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(userId, bookId, quantity = 1) {
    try {
      // Check if item already exists
      const q = query(
        collection(this.db, this.collections.CART),
        where('userId', '==', userId),
        where('bookId', '==', bookId)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Update existing item
        const existingDoc = snapshot.docs[0];
        const existingData = existingDoc.data();
        
        await updateDoc(doc(this.db, this.collections.CART, existingDoc.id), {
          quantity: existingData.quantity + quantity,
          updatedAt: serverTimestamp()
        });

        return {
          id: existingDoc.id,
          $id: existingDoc.id,
          ...existingData,
          quantity: existingData.quantity + quantity
        };
      } else {
        // Create new cart item
        const book = await this.getBookById(bookId);
        
        const docRef = await addDoc(collection(this.db, this.collections.CART), {
          userId,
          bookId,
          quantity,
          priceAtTimeOfAdd: book.price,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        return {
          id: docRef.id,
          $id: docRef.id,
          userId,
          bookId,
          quantity,
          priceAtTimeOfAdd: book.price
        };
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw new Error(`Savatga qo'shishda xato: ${error.message}`);
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(cartItemId, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeFromCart(cartItemId);
      }

      const docRef = doc(this.db, this.collections.CART, cartItemId);
      await updateDoc(docRef, {
        quantity,
        updatedAt: serverTimestamp()
      });

      const docSnap = await getDoc(docRef);
      return {
        id: docSnap.id,
        $id: docSnap.id,
        ...docSnap.data()
      };
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw new Error(`Savat elementini yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(cartItemId) {
    try {
      await deleteDoc(doc(this.db, this.collections.CART, cartItemId));
      return { success: true };
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw new Error(`Savatdan o'chirishda xato: ${error.message}`);
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId) {
    try {
      const q = query(
        collection(this.db, this.collections.CART),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(this.db);

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw new Error(`Savatni tozalashda xato: ${error.message}`);
    }
  }

  // ===============================================
  // ORDERS OPERATIONS
  // ===============================================

  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      // Generate order number
      const orderNumber = `ORD-${new Date().getFullYear()}-${Date.now()}`;

      const docRef = await addDoc(collection(this.db, this.collections.ORDERS), {
        ...orderData,
        orderNumber,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update user stats
      if (orderData.userId && !orderData.userId.startsWith('guest_')) {
        await this.updateUser(orderData.userId, {
          totalOrders: increment(1),
          totalSpent: increment(orderData.totalAmount)
        });
      }

      // Update book sales counts
      if (orderData.items && orderData.items.length > 0) {
        const batch = writeBatch(this.db);
        
        orderData.items.forEach(item => {
          const bookRef = doc(this.db, this.collections.BOOKS, item.bookId);
          batch.update(bookRef, {
            salesCount: increment(item.quantity),
            stock: increment(-item.quantity),
            updatedAt: serverTimestamp()
          });
        });

        await batch.commit();
      }

      const newOrder = {
        id: docRef.id,
        $id: docRef.id,
        ...orderData,
        orderNumber,
        status: 'pending'
      };

      // Send automatic new order notification
      try {
        const TelegramIntegration = (await import('./TelegramIntegration.js')).default;
        await TelegramIntegration.handleNewOrder(newOrder);
      } catch (notificationError) {
        console.warn('Failed to send new order notification:', notificationError);
        // Don't throw error - order creation should succeed even if notification fails
      }

      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error(`Buyurtma yaratishda xato: ${error.message}`);
    }
  }

  /**
   * Get orders with filtering
   */
  async getOrders(options = {}) {
    try {
      const {
        userId = null,
        status = null,
        limitCount = 50,
        orderByField = 'createdAt',
        orderDirection = 'desc'
      } = options;

      let q = collection(this.db, this.collections.ORDERS);

      if (userId) {
        q = query(q, where('userId', '==', userId));
      }
      if (status) {
        q = query(q, where('status', '==', status));
      }

      q = query(q, orderBy(orderByField, orderDirection), limit(limitCount));

      const snapshot = await getDocs(q);
      const orders = [];
      
      snapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        });
      });

      return { documents: orders };
    } catch (error) {
      console.error('Error getting orders:', error);
      throw new Error(`Buyurtmalar yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Get single order by ID
   */
  async getOrderById(orderId) {
    try {
      const docRef = doc(this.db, this.collections.ORDERS, orderId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          $id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        throw new Error('Buyurtma topilmadi');
      }
    } catch (error) {
      console.error('Error getting order:', error);
      throw new Error(`Buyurtma yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, additionalData = {}) {
    try {
      const updates = {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      // Add timestamp for specific statuses
      if (status === 'confirmed') {
        updates.confirmedAt = serverTimestamp();
      } else if (status === 'shipped') {
        updates.shippedAt = serverTimestamp();
      } else if (status === 'delivered') {
        updates.deliveredAt = serverTimestamp();
      }

      const docRef = doc(this.db, this.collections.ORDERS, orderId);
      await updateDoc(docRef, updates);

      return await this.getOrderById(orderId);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error(`Buyurtma holatini yangilashda xato: ${error.message}`);
    }
  }

  // ===============================================
  // WISHLIST OPERATIONS
  // ===============================================

  /**
   * Get wishlist items for user
   */
  async getWishlist(userId) {
    try {
      const q = query(
        collection(this.db, this.collections.WISHLIST),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const wishlistItems = [];
      
      snapshot.forEach((doc) => {
        wishlistItems.push({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        });
      });

      return { documents: wishlistItems };
    } catch (error) {
      console.error('Error getting wishlist:', error);
      throw new Error(`Sevimlilar ro'yxatini yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Add book to wishlist
   */
  async addToWishlist(userId, bookId) {
    try {
      // Check if already in wishlist
      const q = query(
        collection(this.db, this.collections.WISHLIST),
        where('userId', '==', userId),
        where('bookId', '==', bookId)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        throw new Error('Kitob allaqachon sevimlilar ro\'yxatida');
      }

      const docRef = await addDoc(collection(this.db, this.collections.WISHLIST), {
        userId,
        bookId,
        createdAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        $id: docRef.id,
        userId,
        bookId
      };
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw new Error(`Sevimlilarga qo'shishda xato: ${error.message}`);
    }
  }

  /**
   * Remove book from wishlist
   */
  async removeFromWishlist(userId, bookId) {
    try {
      const q = query(
        collection(this.db, this.collections.WISHLIST),
        where('userId', '==', userId),
        where('bookId', '==', bookId)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await deleteDoc(doc.ref);
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw new Error(`Sevimlilardan o'chirishda xato: ${error.message}`);
    }
  }

  // ===============================================
  // GENRES & AUTHORS OPERATIONS
  // ===============================================

  /**
   * Get all genres
   */
  async getGenres() {
    try {
      const q = query(
        collection(this.db, this.collections.GENRES),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(q);
      const genres = [];
      
      snapshot.forEach((doc) => {
        genres.push({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        });
      });

      return { documents: genres };
    } catch (error) {
      console.error('Error getting genres:', error);
      throw new Error(`Janrlarni yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Get all authors
   */
  async getAuthors() {
    try {
      const q = query(
        collection(this.db, this.collections.AUTHORS),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(q);
      const authors = [];
      
      snapshot.forEach((doc) => {
        authors.push({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        });
      });

      return { documents: authors };
    } catch (error) {
      console.error('Error getting authors:', error);
      throw new Error(`Mualliflarni yuklashda xato: ${error.message}`);
    }
  }

  // ===============================================
  // WAITLIST OPERATIONS
  // ===============================================

  /**
   * Get waitlist entries
   */
  async getWaitlist(options = {}) {
    try {
      const { bookId = null, userId = null } = options;
      
      let q = collection(this.db, 'waitlist');
      
      if (bookId) {
        q = query(q, where('bookId', '==', bookId));
      }
      if (userId) {
        q = query(q, where('userId', '==', userId));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      const waitlistItems = [];
      
      snapshot.forEach((doc) => {
        waitlistItems.push({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        });
      });

      return { documents: waitlistItems };
    } catch (error) {
      console.error('Error getting waitlist:', error);
      throw new Error(`Navbat ro'yxatini yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Add to waitlist
   */
  async addToWaitlist(waitlistData) {
    try {
      const docRef = await addDoc(collection(this.db, 'waitlist'), {
        ...waitlistData,
        status: 'waiting',
        notificationSent: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        $id: docRef.id,
        ...waitlistData,
        status: 'waiting'
      };
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      throw new Error(`Navbatga qo'shishda xato: ${error.message}`);
    }
  }

  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(waitlistId) {
    try {
      await deleteDoc(doc(this.db, 'waitlist', waitlistId));
      return { success: true };
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      throw new Error(`Navbatdan o'chirishda xato: ${error.message}`);
    }
  }

  // ===============================================
  // PREORDER OPERATIONS
  // ===============================================

  /**
   * Get preorders
   */
  async getPreOrders(options = {}) {
    try {
      const { bookId = null, userId = null, status = null } = options;
      
      let q = collection(this.db, 'preorders');
      
      if (bookId) {
        q = query(q, where('bookId', '==', bookId));
      }
      if (userId) {
        q = query(q, where('userId', '==', userId));
      }
      if (status) {
        q = query(q, where('status', '==', status));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      const preOrders = [];
      
      snapshot.forEach((doc) => {
        preOrders.push({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        });
      });

      return { documents: preOrders };
    } catch (error) {
      console.error('Error getting preorders:', error);
      throw new Error(`Oldindan buyurtmalarni yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Create preorder
   */
  async createPreOrder(preOrderData) {
    try {
      const docRef = await addDoc(collection(this.db, 'preorders'), {
        ...preOrderData,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        $id: docRef.id,
        ...preOrderData,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error creating preorder:', error);
      throw new Error(`Oldindan buyurtma yaratishda xato: ${error.message}`);
    }
  }

  /**
   * Cancel preorder
   */
  async cancelPreOrder(preOrderId) {
    try {
      await deleteDoc(doc(this.db, 'preorders', preOrderId));
      return { success: true };
    } catch (error) {
      console.error('Error canceling preorder:', error);
      throw new Error(`Oldindan buyurtmani bekor qilishda xato: ${error.message}`);
    }
  }

  // ===============================================
  // REAL-TIME SUBSCRIPTIONS
  // ===============================================

  /**
   * Subscribe to books changes
   */
  subscribeToBooks(callback, options = {}) {
    try {
      const { filters = {} } = options;
      
      let q = collection(this.db, this.collections.BOOKS);
      
      if (filters.isAvailable !== undefined) {
        q = query(q, where('isAvailable', '==', filters.isAvailable));
      }
      
      q = query(q, orderBy('createdAt', 'desc'), limit(50));

      return onSnapshot(q, (snapshot) => {
        const books = [];
        snapshot.forEach((doc) => {
          books.push({
            id: doc.id,
            $id: doc.id,
            ...doc.data()
          });
        });
        callback({ documents: books });
      });
    } catch (error) {
      console.error('Error subscribing to books:', error);
      throw new Error(`Kitoblar obunasida xato: ${error.message}`);
    }
  }

  /**
   * Subscribe to cart changes
   */
  subscribeToCart(userId, callback) {
    try {
      const q = query(
        collection(this.db, this.collections.CART),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const cartItems = [];
        snapshot.forEach((doc) => {
          cartItems.push({
            id: doc.id,
            $id: doc.id,
            ...doc.data()
          });
        });
        callback({ documents: cartItems });
      });
    } catch (error) {
      console.error('Error subscribing to cart:', error);
      throw new Error(`Savat obunasida xato: ${error.message}`);
    }
  }

  /**
   * Subscribe to orders changes (Admin)
   */
  subscribeToOrders(callback, options = {}) {
    try {
      const { status = null } = options;
      
      let q = collection(this.db, this.collections.ORDERS);
      
      if (status) {
        q = query(q, where('status', '==', status));
      }
      
      q = query(q, orderBy('createdAt', 'desc'), limit(100));

      return onSnapshot(q, (snapshot) => {
        const orders = [];
        snapshot.forEach((doc) => {
          orders.push({
            id: doc.id,
            $id: doc.id,
            ...doc.data()
          });
        });
        callback({ documents: orders });
      });
    } catch (error) {
      console.error('Error subscribing to orders:', error);
      throw new Error(`Buyurtmalar obunasida xato: ${error.message}`);
    }
  }
}

// Singleton instance
const firebaseService = new FirebaseService();

export default firebaseService;