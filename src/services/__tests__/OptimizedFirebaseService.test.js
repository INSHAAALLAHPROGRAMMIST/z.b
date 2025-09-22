import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OptimizedFirebaseService from '../OptimizedFirebaseService';

// Mock the base FirebaseService
vi.mock('../FirebaseService', () => ({
  default: {
    getBooks: vi.fn(),
    getBookById: vi.fn(),
    searchBooks: vi.fn(),
    getGenres: vi.fn(),
    getAuthors: vi.fn(),
    getCartItems: vi.fn(),
    createBook: vi.fn(),
    updateBook: vi.fn(),
    deleteBook: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateCartQuantity: vi.fn(),
    booksCollection: {},
    db: {}
  }
}));

// Mock CacheService
vi.mock('../CacheService', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    getStats: vi.fn(),
    clearAll: vi.fn()
  }
}));

describe('OptimizedFirebaseService', () => {
  let service;
  let mockFirebaseService;
  let mockCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get mocked modules
    mockFirebaseService = require('../FirebaseService').default;
    mockCacheService = require('../CacheService').default;
    
    service = new OptimizedFirebaseService();
  });

  describe('Book Operations with Caching', () => {
    it('should return cached books when available', async () => {
      const cachedBooks = {
        documents: [{ $id: '1', title: 'Test Book' }],
        total: 1,
        page: 1,
        hasMore: false
      };

      mockCacheService.get.mockResolvedValue(cachedBooks);

      const result = await service.getBooks({ page: 1 });

      expect(result).toEqual(cachedBooks);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        'books',
        'books',
        expect.objectContaining({ page: 1 })
      );
      expect(mockFirebaseService.getBooks).not.toHaveBeenCalled();
    });

    it('should fetch from Firebase when cache misses', async () => {
      const firebaseBooks = [{ id: '1', title: 'Test Book' }];
      
      mockCacheService.get.mockResolvedValue(null);
      
      // Mock Firebase query result
      const mockSnapshot = {
        docs: firebaseBooks.map(book => ({
          id: book.id,
          data: () => book
        }))
      };

      // Mock Firebase query functions
      vi.doMock('firebase/firestore', () => ({
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        getDocs: vi.fn().mockResolvedValue(mockSnapshot)
      }));

      const result = await service.getBooks({ page: 1 });

      expect(mockCacheService.set).toHaveBeenCalled();
      expect(result.documents).toHaveLength(1);
    });

    it('should get single book with caching', async () => {
      const bookId = 'test-book-id';
      const cachedBook = { $id: bookId, title: 'Cached Book' };

      mockCacheService.get.mockResolvedValue(cachedBook);

      const result = await service.getBookById(bookId);

      expect(result).toEqual(cachedBook);
      expect(mockCacheService.get).toHaveBeenCalledWith('books', `book_${bookId}`);
    });
  });

  describe('Search Operations', () => {
    it('should return cached search results', async () => {
      const searchTerm = 'test query';
      const cachedResults = {
        documents: [{ $id: '1', title: 'Test Book', relevanceScore: 10 }],
        total: 1
      };

      mockCacheService.get.mockResolvedValue(cachedResults);

      const result = await service.searchBooks(searchTerm);

      expect(result).toEqual(cachedResults);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        'search',
        'search',
        expect.objectContaining({ searchTerm })
      );
    });

    it('should add relevance scoring to search results', async () => {
      const searchTerm = 'test';
      const mockResults = {
        documents: [
          { $id: '1', title: 'Test Book', author: 'Test Author' },
          { $id: '2', title: 'Another Book', description: 'test description' }
        ]
      };

      mockCacheService.get.mockResolvedValue(null);
      mockFirebaseService.searchBooks.mockResolvedValue(mockResults);

      const result = await service.searchBooks(searchTerm);

      expect(result.documents[0].relevanceScore).toBeGreaterThan(0);
      expect(result.documents[0].relevanceScore).toBeGreaterThan(result.documents[1].relevanceScore);
    });

    it('should not cache short search terms', async () => {
      const shortTerm = 'ab';
      const mockResults = { documents: [] };

      mockFirebaseService.searchBooks.mockResolvedValue(mockResults);

      await service.searchBooks(shortTerm);

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('Relevance Scoring', () => {
    it('should score title matches highest', () => {
      const books = [
        { title: 'Test Book', author: 'Author' },
        { title: 'Another Book', author: 'Test Author' }
      ];

      const scored = service.addRelevanceScoring(books, 'test');

      expect(scored[0].relevanceScore).toBeGreaterThan(scored[1].relevanceScore);
    });

    it('should give bonus for title starting with search term', () => {
      const books = [
        { title: 'Test Book' },
        { title: 'Book Test' }
      ];

      const scored = service.addRelevanceScoring(books, 'test');

      expect(scored[0].relevanceScore).toBeGreaterThan(scored[1].relevanceScore);
    });

    it('should score different fields appropriately', () => {
      const books = [
        { title: 'Test Book' }, // Title match: 10 + 5 (starts with) = 15
        { author: 'Test Author' }, // Author match: 7
        { genre: 'Test Genre' }, // Genre match: 5
        { description: 'Test description' } // Description match: 3
      ];

      const scored = service.addRelevanceScoring(books, 'test');

      expect(scored[0].relevanceScore).toBe(15);
      expect(scored[1].relevanceScore).toBe(7);
      expect(scored[2].relevanceScore).toBe(5);
      expect(scored[3].relevanceScore).toBe(3);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when creating book', async () => {
      const bookData = { title: 'New Book' };
      mockFirebaseService.createBook.mockResolvedValue({ id: 'new-id' });

      await service.createBook(bookData);

      expect(mockCacheService.invalidate).toHaveBeenCalledWith('books');
    });

    it('should invalidate specific book cache when updating', async () => {
      const bookId = 'test-id';
      const bookData = { title: 'Updated Book' };
      mockFirebaseService.updateBook.mockResolvedValue(true);

      await service.updateBook(bookId, bookData);

      expect(mockCacheService.invalidate).toHaveBeenCalledWith('books', `book_${bookId}`);
    });

    it('should invalidate cart cache when adding to cart', async () => {
      const userId = 'user-id';
      const bookId = 'book-id';
      mockFirebaseService.addToCart.mockResolvedValue(true);

      await service.addToCart(userId, bookId, 1);

      expect(mockCacheService.invalidate).toHaveBeenCalledWith('cart', `cart_${userId}`);
    });
  });

  describe('Batch Operations', () => {
    it('should batch get multiple books efficiently', async () => {
      const bookIds = ['id1', 'id2', 'id3'];
      const books = [
        { $id: 'id1', title: 'Book 1' },
        { $id: 'id2', title: 'Book 2' },
        { $id: 'id3', title: 'Book 3' }
      ];

      // Mock individual getBookById calls
      service.getBookById = vi.fn()
        .mockResolvedValueOnce(books[0])
        .mockResolvedValueOnce(books[1])
        .mockResolvedValueOnce(books[2]);

      const result = await service.batchGetBooks(bookIds);

      expect(result).toEqual(books);
      expect(service.getBookById).toHaveBeenCalledTimes(3);
    });

    it('should filter out null results in batch operations', async () => {
      const bookIds = ['id1', 'id2', 'id3'];
      const books = [
        { $id: 'id1', title: 'Book 1' },
        null, // Missing book
        { $id: 'id3', title: 'Book 3' }
      ];

      service.getBookById = vi.fn()
        .mockResolvedValueOnce(books[0])
        .mockResolvedValueOnce(books[1])
        .mockResolvedValueOnce(books[2]);

      const result = await service.batchGetBooks(bookIds);

      expect(result).toHaveLength(2);
      expect(result).toEqual([books[0], books[2]]);
    });
  });

  describe('Error Handling', () => {
    it('should handle Firebase errors gracefully', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockFirebaseService.searchBooks.mockRejectedValue(new Error('Firebase error'));

      await expect(service.searchBooks('test')).rejects.toThrow('Firebase error');
    });

    it('should handle cache errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));
      mockFirebaseService.getGenres.mockResolvedValue({ documents: [] });

      const result = await service.getGenres();

      expect(result).toEqual({ documents: [] });
      expect(mockFirebaseService.getGenres).toHaveBeenCalled();
    });
  });

  describe('Performance Optimizations', () => {
    it('should prefetch next page in background', async () => {
      const options = { page: 1, limit: 20 };
      const mockResult = {
        documents: new Array(20).fill().map((_, i) => ({ id: i })),
        hasMore: true
      };

      mockCacheService.get.mockResolvedValue(null);
      
      // Mock the prefetch method
      service.prefetchNextPage = vi.fn();

      // Simulate successful first page load
      vi.spyOn(service, 'getBooks').mockResolvedValue(mockResult);

      await service.getBooks(options);

      // Should trigger prefetch for page 2
      expect(service.prefetchNextPage).toHaveBeenCalledWith(options);
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache statistics', () => {
      const mockStats = {
        memoryItems: 10,
        sessionItems: 5,
        localStorageItems: 15
      };

      mockCacheService.getStats.mockReturnValue(mockStats);

      const stats = service.getCacheStats();

      expect(stats).toEqual(mockStats);
    });
  });
});