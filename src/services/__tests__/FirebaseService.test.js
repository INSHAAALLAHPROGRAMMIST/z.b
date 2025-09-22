// Enhanced Firebase Service Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FirebaseService from '../FirebaseService';
import cloudinaryService from '../CloudinaryService';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
  increment: vi.fn((value) => ({ _methodName: 'increment', _value: value })),
  writeBatch: vi.fn(),
  runTransaction: vi.fn(),
  getFirestore: vi.fn(() => ({ _type: 'mockFirestore' }))
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ _type: 'mockApp' })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ _type: 'mockApp' }))
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ _type: 'mockAuth' }))
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({ _type: 'mockStorage' }))
}));

vi.mock('../firebaseConfig', () => ({
  db: { _type: 'mockFirestore' },
  COLLECTIONS: {
    BOOKS: 'books',
    USERS: 'users',
    ORDERS: 'orders',
    CART: 'cart',
    WISHLIST: 'wishlist',
    GENRES: 'genres',
    AUTHORS: 'authors'
  }
}));

vi.mock('../CloudinaryService', () => ({
  default: {
    uploadImage: vi.fn(),
    uploadMultipleImages: vi.fn(),
    getBookThumbnailUrl: vi.fn(),
    getBookCoverUrls: vi.fn()
  }
}));

describe('Enhanced Firebase Service', () => {
  let firebaseService;
  let mockFirestore;

  beforeEach(() => {
    firebaseService = FirebaseService; // Use the singleton instance
    mockFirestore = {
      collection: vi.fn(),
      doc: vi.fn(),
      addDoc: vi.fn(),
      updateDoc: vi.fn(),
      getDocs: vi.fn(),
      getDoc: vi.fn(),
      writeBatch: vi.fn(),
      runTransaction: vi.fn()
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBookWithImage', () => {
    it('should create book with main image successfully', async () => {
      // Mock Cloudinary upload
      const mockUploadResult = {
        success: true,
        data: {
          url: 'https://res.cloudinary.com/test/image/upload/v123/test.jpg',
          publicId: 'test-public-id',
          width: 400,
          height: 600
        }
      };
      cloudinaryService.uploadImage.mockResolvedValue(mockUploadResult);
      cloudinaryService.getBookThumbnailUrl.mockReturnValue('https://res.cloudinary.com/test/thumbnail.jpg');
      cloudinaryService.getBookCoverUrls.mockReturnValue({
        thumbnail: 'https://res.cloudinary.com/test/thumbnail.jpg',
        small: 'https://res.cloudinary.com/test/small.jpg',
        medium: 'https://res.cloudinary.com/test/medium.jpg',
        large: 'https://res.cloudinary.com/test/large.jpg'
      });

      // Mock Firebase addDoc
      const mockDocRef = { id: 'book123' };
      const { addDoc } = await import('firebase/firestore');
      addDoc.mockResolvedValue(mockDocRef);

      const bookData = {
        title: 'Test Book',
        authorName: 'Test Author',
        price: 25000,
        description: 'Test description'
      };

      const mockImageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const result = await firebaseService.createBookWithImage(bookData, mockImageFile);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockImageFile,
        expect.objectContaining({
          folder: 'zamon-books/covers',
          tags: expect.arrayContaining(['book-cover']),
          context: expect.objectContaining({
            book_title: 'Test Book',
            book_author: 'Test Author'
          })
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'book123',
          $id: 'book123',
          title: 'Test Book',
          images: expect.objectContaining({
            main: mockUploadResult.data.url,
            publicId: mockUploadResult.data.publicId,
            thumbnail: expect.any(String)
          }),
          inventory: expect.objectContaining({
            stock: 0,
            reserved: 0,
            lowStockThreshold: 5
          }),
          seo: expect.objectContaining({
            slug: 'test-book',
            metaTitle: 'Test Book'
          }),
          analytics: expect.objectContaining({
            viewCount: 0,
            salesCount: 0,
            wishlistCount: 0
          })
        })
      );
    });

    it('should create book with multiple gallery images', async () => {
      const mockMainUpload = {
        success: true,
        data: {
          url: 'https://res.cloudinary.com/test/main.jpg',
          publicId: 'main-id'
        }
      };

      const mockGalleryUpload = {
        success: true,
        results: [
          {
            data: {
              url: 'https://res.cloudinary.com/test/gallery1.jpg',
              publicId: 'gallery1-id'
            }
          },
          {
            data: {
              url: 'https://res.cloudinary.com/test/gallery2.jpg',
              publicId: 'gallery2-id'
            }
          }
        ]
      };

      cloudinaryService.uploadImage.mockResolvedValue(mockMainUpload);
      cloudinaryService.uploadMultipleImages.mockResolvedValue(mockGalleryUpload);
      cloudinaryService.getBookThumbnailUrl.mockReturnValue('https://res.cloudinary.com/test/thumb.jpg');
      cloudinaryService.getBookCoverUrls.mockReturnValue({});

      const { addDoc } = await import('firebase/firestore');
      addDoc.mockResolvedValue({ id: 'book123' });

      const bookData = { title: 'Test Book', authorName: 'Test Author' };
      const mainImage = new File(['main'], 'main.jpg', { type: 'image/jpeg' });
      const galleryImages = [
        new File(['gallery1'], 'gallery1.jpg', { type: 'image/jpeg' }),
        new File(['gallery2'], 'gallery2.jpg', { type: 'image/jpeg' })
      ];

      const result = await firebaseService.createBookWithImage(bookData, mainImage, galleryImages);

      expect(cloudinaryService.uploadMultipleImages).toHaveBeenCalledWith(
        galleryImages,
        expect.objectContaining({
          folder: 'zamon-books/gallery',
          concurrent: 2
        })
      );

      expect(result.images.gallery).toHaveLength(2);
      expect(result.images.gallery[0]).toEqual(
        expect.objectContaining({
          url: 'https://res.cloudinary.com/test/gallery1.jpg',
          publicId: 'gallery1-id'
        })
      );
    });

    it('should handle image upload failure gracefully', async () => {
      cloudinaryService.uploadImage.mockRejectedValue(new Error('Upload failed'));

      const bookData = { title: 'Test Book' };
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(firebaseService.createBookWithImage(bookData, imageFile))
        .rejects.toThrow('Rasm bilan kitob yaratishda xato: Upload failed');
    });
  });

  describe('batchUpdateBooks', () => {
    it('should update multiple books successfully', async () => {
      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue()
      };

      const { writeBatch } = await import('firebase/firestore');
      writeBatch.mockReturnValue(mockBatch);

      const updates = [
        { bookId: 'book1', data: { price: 30000 } },
        { bookId: 'book2', data: { isAvailable: false } },
        { bookId: 'book3', data: { stock: 10 } }
      ];

      const result = await firebaseService.batchUpdateBooks(updates);

      expect(mockBatch.update).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        results: expect.arrayContaining([
          { bookId: 'book1', status: 'completed' },
          { bookId: 'book2', status: 'completed' },
          { bookId: 'book3', status: 'completed' }
        ]),
        summary: {
          total: 3,
          successful: 3,
          failed: 0
        }
      });
    });

    it('should reject empty updates array', async () => {
      await expect(firebaseService.batchUpdateBooks([]))
        .rejects.toThrow('Updates array is required and cannot be empty');
    });

    it('should reject updates exceeding batch limit', async () => {
      const largeUpdates = Array(501).fill().map((_, i) => ({
        bookId: `book${i}`,
        data: { price: 1000 }
      }));

      await expect(firebaseService.batchUpdateBooks(largeUpdates))
        .rejects.toThrow('Batch size cannot exceed 500 operations');
    });

    it('should validate update structure', async () => {
      const invalidUpdates = [
        { bookId: 'book1' }, // Missing data
        { data: { price: 1000 } } // Missing bookId
      ];

      await expect(firebaseService.batchUpdateBooks(invalidUpdates))
        .rejects.toThrow('Each update must have bookId and data properties');
    });
  });

  describe('advancedSearch', () => {
    it('should perform basic search with filters', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'book1',
            data: () => ({
              title: 'JavaScript Guide',
              authorName: 'John Doe',
              price: 25000,
              isAvailable: true,
              genreId: 'tech',
              viewCount: 100
            })
          },
          {
            id: 'book2',
            data: () => ({
              title: 'Python Basics',
              authorName: 'Jane Smith',
              price: 30000,
              isAvailable: true,
              genreId: 'tech',
              viewCount: 150
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const { getDocs, query, collection, where, orderBy, limit } = await import('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);
      query.mockReturnValue('mock-query');
      collection.mockReturnValue('mock-collection');
      where.mockReturnValue('mock-where');
      orderBy.mockReturnValue('mock-orderBy');
      limit.mockReturnValue('mock-limit');

      const result = await firebaseService.advancedSearch('JavaScript', {
        genres: ['tech'],
        priceRange: { min: 20000, max: 50000 },
        sortBy: 'popularity'
      });

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].title).toBe('JavaScript Guide');
      expect(result.searchQuery).toBe('JavaScript');
      expect(result.totalFound).toBe(1);
    });

    it('should handle empty search results', async () => {
      const mockSnapshot = {
        docs: [],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const { getDocs } = await import('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);

      const result = await firebaseService.advancedSearch('NonexistentBook');

      expect(result.documents).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });

    it('should calculate relevance scores correctly', () => {
      const book1 = {
        title: 'JavaScript: The Good Parts',
        authorName: 'Douglas Crockford',
        description: 'A book about JavaScript programming',
        viewCount: 100,
        salesCount: 50
      };

      const book2 = {
        title: 'Learning Python',
        authorName: 'Mark Lutz',
        description: 'Python programming guide',
        viewCount: 80,
        salesCount: 30
      };

      const score1 = firebaseService.calculateRelevanceScore(book1, 'javascript');
      const score2 = firebaseService.calculateRelevanceScore(book2, 'javascript');

      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('getAnalyticsData', () => {
    it('should return comprehensive analytics data', async () => {
      // Mock books data
      const mockBooksSnapshot = {
        docs: [
          {
            data: () => ({
              isAvailable: true,
              viewCount: 100,
              salesCount: 10,
              inventory: { stock: 2, lowStockThreshold: 5 } // Low stock book
            })
          },
          {
            data: () => ({
              isAvailable: false,
              viewCount: 50,
              salesCount: 5,
              stock: 15 // Legacy stock field, not low stock
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      // Mock orders data
      const mockOrdersSnapshot = {
        docs: [
          {
            data: () => ({
              totalAmount: 50000,
              status: 'completed'
            })
          },
          {
            data: () => ({
              totalAmount: 30000,
              status: 'pending'
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      // Mock users data
      const mockUsersSnapshot = {
        docs: [
          {
            data: () => ({
              isActive: true,
              isAdmin: false
            })
          },
          {
            data: () => ({
              isActive: true,
              isAdmin: true
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      // Mock top books data
      const mockTopBooksSnapshot = {
        docs: [
          {
            id: 'book1',
            data: () => ({
              title: 'Best Seller',
              salesCount: 100,
              viewCount: 1000,
              price: 25000
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const { getDocs } = await import('firebase/firestore');
      getDocs
        .mockResolvedValueOnce(mockBooksSnapshot)
        .mockResolvedValueOnce(mockOrdersSnapshot)
        .mockResolvedValueOnce(mockUsersSnapshot)
        .mockResolvedValueOnce(mockTopBooksSnapshot);

      const result = await firebaseService.getAnalyticsData();

      expect(result.success).toBe(true);
      expect(result.data.books).toEqual({
        total: 2,
        available: 1,
        unavailable: 1,
        totalViews: 150,
        totalSales: 15,
        lowStock: 1,
        averageViewsPerBook: 75
      });

      expect(result.data.orders).toEqual({
        total: 2,
        pending: 1,
        completed: 1,
        cancelled: 0,
        averageOrderValue: 40000
      });

      expect(result.data.users).toEqual({
        total: 2,
        active: 2,
        inactive: 0,
        admins: 1
      });

      expect(result.data.topBooks).toHaveLength(1);
      expect(result.data.topBooks[0]).toEqual({
        id: 'book1',
        title: 'Best Seller',
        salesCount: 100,
        viewCount: 1000,
        revenue: 2500000
      });
    });
  });

  describe('updateInventory', () => {
    it('should update inventory successfully', async () => {
      const mockTransaction = {
        get: vi.fn(),
        update: vi.fn(),
        set: vi.fn()
      };

      const mockBookDoc = {
        exists: () => true,
        data: () => ({
          inventory: { stock: 10 },
          title: 'Test Book'
        })
      };

      mockTransaction.get.mockResolvedValue(mockBookDoc);

      const { runTransaction, doc, collection } = await import('firebase/firestore');
      runTransaction.mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });
      doc.mockReturnValue('mock-doc-ref');
      collection.mockReturnValue('mock-collection');

      const result = await firebaseService.updateInventory('book123', -2, {
        reason: 'sale',
        notes: 'Sold 2 copies'
      });

      expect(mockTransaction.update).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          'inventory.stock': 8,
          isAvailable: true
        })
      );

      expect(mockTransaction.set).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          bookId: 'book123',
          previousStock: 10,
          newStock: 8,
          change: -2,
          reason: 'sale',
          notes: 'Sold 2 copies'
        })
      );

      expect(result).toEqual({
        bookId: 'book123',
        previousStock: 10,
        newStock: 8,
        change: -2,
        isAvailable: true
      });
    });

    it('should handle stock going to zero', async () => {
      const mockTransaction = {
        get: vi.fn(),
        update: vi.fn(),
        set: vi.fn()
      };

      const mockBookDoc = {
        exists: () => true,
        data: () => ({
          inventory: { stock: 2 }
        })
      };

      mockTransaction.get.mockResolvedValue(mockBookDoc);

      const { runTransaction, doc, collection } = await import('firebase/firestore');
      runTransaction.mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });
      doc.mockReturnValue('mock-doc-ref');
      collection.mockReturnValue('mock-collection');

      const result = await firebaseService.updateInventory('book123', -5);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          'inventory.stock': 0,
          isAvailable: false
        })
      );

      expect(result.isAvailable).toBe(false);
    });

    it('should handle non-existent book', async () => {
      const mockTransaction = {
        get: vi.fn()
      };

      const mockBookDoc = {
        exists: () => false
      };

      mockTransaction.get.mockResolvedValue(mockBookDoc);

      const { runTransaction } = await import('firebase/firestore');
      runTransaction.mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await expect(firebaseService.updateInventory('nonexistent', 5))
        .rejects.toThrow('Inventar yangilashda xato: Kitob topilmadi');
    });
  });

  describe('getLowStockBooks', () => {
    it('should return books with low stock', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'book1',
            data: () => ({
              title: 'Low Stock Book',
              inventory: { stock: 2, lowStockThreshold: 5 },
              isAvailable: true
            })
          },
          {
            id: 'book2',
            data: () => ({
              title: 'Good Stock Book',
              inventory: { stock: 10, lowStockThreshold: 5 },
              isAvailable: true
            })
          },
          {
            id: 'book3',
            data: () => ({
              title: 'Legacy Stock Book',
              stock: 3, // Legacy stock field
              isAvailable: true
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const { getDocs } = await import('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);

      const result = await firebaseService.getLowStockBooks();

      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].title).toBe('Low Stock Book');
      expect(result.documents[0].currentStock).toBe(2);
      expect(result.documents[0].threshold).toBe(5);
      
      expect(result.documents[1].title).toBe('Legacy Stock Book');
      expect(result.documents[1].currentStock).toBe(3);
      expect(result.documents[1].threshold).toBe(5); // Default threshold
      
      expect(result.count).toBe(2);
    });
  });

  describe('generateSlug', () => {
    it('should generate proper slugs', () => {
      expect(firebaseService.generateSlug('Hello World')).toBe('hello-world');
      expect(firebaseService.generateSlug('JavaScript: The Good Parts')).toBe('javascript-the-good-parts');
      expect(firebaseService.generateSlug('Book with   Multiple   Spaces')).toBe('book-with-multiple-spaces');
      expect(firebaseService.generateSlug('Special!@#$%Characters')).toBe('specialcharacters');
      expect(firebaseService.generateSlug('')).toBe('');
    });
  });
});