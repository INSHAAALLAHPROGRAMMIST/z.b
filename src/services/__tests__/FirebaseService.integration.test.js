// Integration tests for Enhanced Firebase Service
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

describe('Firebase Service Integration Tests', () => {
  let firebaseService;

  beforeEach(() => {
    firebaseService = FirebaseService;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Book Management Workflow', () => {
    it('should handle complete book lifecycle with Cloudinary integration', async () => {
      // Mock Cloudinary upload
      const mockUploadResult = {
        success: true,
        data: {
          url: 'https://res.cloudinary.com/test/image/upload/v123/book-cover.jpg',
          publicId: 'book-cover-123',
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

      // Mock Firebase operations
      const { addDoc, getDocs, updateDoc, writeBatch } = await import('firebase/firestore');
      const mockDocRef = { id: 'book123' };
      addDoc.mockResolvedValue(mockDocRef);

      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue()
      };
      writeBatch.mockReturnValue(mockBatch);

      // Mock search results
      const mockSearchSnapshot = {
        docs: [
          {
            id: 'book123',
            data: () => ({
              title: 'Test Book',
              authorName: 'Test Author',
              price: 25000,
              isAvailable: true,
              genreId: 'fiction',
              viewCount: 0,
              salesCount: 0,
              images: {
                main: mockUploadResult.data.url,
                publicId: mockUploadResult.data.publicId
              }
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };
      getDocs.mockResolvedValue(mockSearchSnapshot);

      // Step 1: Create book with image
      const bookData = {
        title: 'Test Book',
        authorName: 'Test Author',
        price: 25000,
        description: 'A test book for integration testing',
        genreId: 'fiction'
      };

      const mockImageFile = new File(['test'], 'cover.jpg', { type: 'image/jpeg' });
      const createdBook = await firebaseService.createBookWithImage(bookData, mockImageFile);

      expect(createdBook).toEqual(
        expect.objectContaining({
          id: 'book123',
          title: 'Test Book',
          images: expect.objectContaining({
            main: mockUploadResult.data.url,
            publicId: mockUploadResult.data.publicId
          }),
          inventory: expect.objectContaining({
            stock: 0,
            reserved: 0,
            lowStockThreshold: 5
          }),
          seo: expect.objectContaining({
            slug: 'test-book',
            metaTitle: 'Test Book'
          })
        })
      );

      // Step 2: Batch update multiple books
      const batchUpdates = [
        { bookId: 'book123', data: { price: 30000, isAvailable: true } },
        { bookId: 'book456', data: { stock: 10 } }
      ];

      const batchResult = await firebaseService.batchUpdateBooks(batchUpdates);

      expect(batchResult.success).toBe(true);
      expect(batchResult.summary.total).toBe(2);
      expect(batchResult.summary.successful).toBe(2);

      // Step 3: Advanced search
      const searchResult = await firebaseService.advancedSearch('Test', {
        genres: ['fiction'],
        priceRange: { min: 20000, max: 50000 },
        sortBy: 'relevance'
      });

      expect(searchResult.documents).toHaveLength(1);
      expect(searchResult.documents[0].title).toBe('Test Book');
      expect(searchResult.searchQuery).toBe('Test');

      // Verify all integrations worked
      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockImageFile,
        expect.objectContaining({
          folder: 'zamon-books/covers',
          tags: expect.arrayContaining(['book-cover'])
        })
      );
      expect(addDoc).toHaveBeenCalled();
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('Analytics and Inventory Integration', () => {
    it('should provide comprehensive analytics with inventory tracking', async () => {
      // Mock analytics data
      const mockBooksSnapshot = {
        docs: [
          {
            data: () => ({
              isAvailable: true,
              viewCount: 100,
              salesCount: 10,
              inventory: { stock: 2, lowStockThreshold: 5 }
            })
          },
          {
            data: () => ({
              isAvailable: true,
              viewCount: 200,
              salesCount: 20,
              inventory: { stock: 15, lowStockThreshold: 5 }
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockOrdersSnapshot = {
        docs: [
          {
            data: () => ({
              totalAmount: 50000,
              status: 'completed'
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockUsersSnapshot = {
        docs: [
          {
            data: () => ({
              isActive: true,
              isAdmin: false
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockTopBooksSnapshot = {
        docs: [
          {
            id: 'book1',
            data: () => ({
              title: 'Top Book',
              salesCount: 20,
              viewCount: 200,
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

      // Get analytics data
      const analyticsResult = await firebaseService.getAnalyticsData();

      expect(analyticsResult.success).toBe(true);
      expect(analyticsResult.data.books.total).toBe(2);
      expect(analyticsResult.data.books.lowStock).toBe(1); // One book with stock <= threshold
      expect(analyticsResult.data.orders.total).toBe(1);
      expect(analyticsResult.data.users.total).toBe(1);
      expect(analyticsResult.data.topBooks).toHaveLength(1);

      // Get low stock books - need to mock getDocs again for this call
      getDocs.mockResolvedValueOnce(mockBooksSnapshot);
      
      const lowStockResult = await firebaseService.getLowStockBooks();

      expect(lowStockResult.documents).toHaveLength(1);
      expect(lowStockResult.documents[0].currentStock).toBe(2);
      expect(lowStockResult.documents[0].threshold).toBe(5);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Cloudinary upload failure gracefully', async () => {
      cloudinaryService.uploadImage.mockRejectedValue(new Error('Cloudinary upload failed'));

      const bookData = { title: 'Test Book', authorName: 'Test Author' };
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(firebaseService.createBookWithImage(bookData, imageFile))
        .rejects.toThrow('Rasm bilan kitob yaratishda xato: Cloudinary upload failed');
    });

    it('should handle batch operation failures', async () => {
      const { writeBatch } = await import('firebase/firestore');
      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Batch commit failed'))
      };
      writeBatch.mockReturnValue(mockBatch);

      const updates = [
        { bookId: 'book1', data: { price: 30000 } }
      ];

      await expect(firebaseService.batchUpdateBooks(updates))
        .rejects.toThrow('Kitoblarni batch yangilashda xato: Batch commit failed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large search results efficiently', async () => {
      // Mock large dataset
      const largeMockSnapshot = {
        docs: Array(100).fill().map((_, index) => ({
          id: `book${index}`,
          data: () => ({
            title: `Book ${index}`,
            authorName: `Author ${index}`,
            price: 25000 + index * 1000,
            isAvailable: true,
            genreId: 'fiction',
            viewCount: index * 10,
            salesCount: index * 2
          })
        })),
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const { getDocs } = await import('firebase/firestore');
      getDocs.mockResolvedValue(largeMockSnapshot);

      const searchResult = await firebaseService.advancedSearch('Book', {
        genres: ['fiction'],
        sortBy: 'popularity',
        limitCount: 50
      });

      // The search returns all matching results, then client-side filtering is applied
      // So we expect all 100 results since they all match "Book"
      expect(searchResult.documents.length).toBe(100);
      expect(searchResult.totalFound).toBe(100);
      
      // Verify that search results contain expected data structure
      if (searchResult.documents.length > 0) {
        const firstBook = searchResult.documents[0];
        expect(firstBook).toHaveProperty('title');
        expect(firstBook).toHaveProperty('authorName');
        expect(firstBook).toHaveProperty('viewCount');
        expect(firstBook.title).toContain('Book');
      }
    });

    it('should handle batch operations within limits', async () => {
      const { writeBatch } = await import('firebase/firestore');
      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue()
      };
      writeBatch.mockReturnValue(mockBatch);

      // Test with maximum allowed batch size
      const maxUpdates = Array(500).fill().map((_, index) => ({
        bookId: `book${index}`,
        data: { price: 25000 + index }
      }));

      const result = await firebaseService.batchUpdateBooks(maxUpdates);

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(500);
      expect(mockBatch.update).toHaveBeenCalledTimes(500);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });
});