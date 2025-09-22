/**
 * Optimized Firebase Service with Caching and Performance Enhancements
 * Extends existing FirebaseService with advanced caching and query optimization
 */

import firebaseService from './FirebaseService';
import cacheService from './CacheService';
import { 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter, 
    getDocs,
    doc,
    getDoc,
    enableNetwork,
    disableNetwork
} from 'firebase/firestore';

class OptimizedFirebaseService {
    constructor() {
        this.baseService = firebaseService;
        this.cache = cacheService;
        this.batchSize = 20;
        this.prefetchSize = 5;
        
        // Cache TTL configurations (in milliseconds)
        this.cacheTTL = {
            books: 10 * 60 * 1000,      // 10 minutes
            genres: 30 * 60 * 1000,     // 30 minutes
            authors: 30 * 60 * 1000,    // 30 minutes
            users: 5 * 60 * 1000,       // 5 minutes
            cart: 2 * 60 * 1000,        // 2 minutes
            orders: 5 * 60 * 1000,      // 5 minutes
            search: 5 * 60 * 1000       // 5 minutes
        };
        
        // Bind methods
        this.getBooks = this.getBooks.bind(this);
        this.getBookById = this.getBookById.bind(this);
        this.searchBooks = this.searchBooks.bind(this);
    }

    /**
     * Get books with advanced caching and pagination
     */
    async getBooks(options = {}) {
        const {
            page = 1,
            limit: pageLimit = this.batchSize,
            genre = null,
            author = null,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            useCache = true
        } = options;

        const cacheKey = 'books';
        const cacheParams = { page, pageLimit, genre, author, sortBy, sortOrder };

        // Try cache first
        if (useCache) {
            const cachedData = await this.cache.get('books', cacheKey, cacheParams);
            if (cachedData) {
                return cachedData;
            }
        }

        try {
            // Build optimized query
            let booksQuery = query(
                this.baseService.booksCollection,
                orderBy(sortBy, sortOrder),
                limit(pageLimit)
            );

            // Add filters
            if (genre) {
                booksQuery = query(booksQuery, where('genre', '==', genre));
            }
            
            if (author) {
                booksQuery = query(booksQuery, where('author', '==', author));
            }

            // Execute query
            const snapshot = await getDocs(booksQuery);
            const books = snapshot.docs.map(doc => ({
                $id: doc.id,
                ...doc.data()
            }));

            const result = {
                documents: books,
                total: books.length,
                page,
                hasMore: books.length === pageLimit
            };

            // Cache the result
            if (useCache) {
                await this.cache.set('books', cacheKey, result, this.cacheTTL.books, cacheParams);
            }

            // Prefetch next page in background
            if (result.hasMore && page === 1) {
                this.prefetchNextPage(options);
            }

            return result;
        } catch (error) {
            console.error('Error fetching books:', error);
            throw error;
        }
    }

    /**
     * Get single book with caching
     */
    async getBookById(bookId, useCache = true) {
        const cacheKey = `book_${bookId}`;

        // Try cache first
        if (useCache) {
            const cachedBook = await this.cache.get('books', cacheKey);
            if (cachedBook) {
                return cachedBook;
            }
        }

        try {
            const bookDoc = await getDoc(doc(this.baseService.booksCollection, bookId));
            
            if (!bookDoc.exists()) {
                return null;
            }

            const book = {
                $id: bookDoc.id,
                ...bookDoc.data()
            };

            // Cache the result
            if (useCache) {
                await this.cache.set('books', cacheKey, book, this.cacheTTL.books);
            }

            return book;
        } catch (error) {
            console.error('Error fetching book:', error);
            throw error;
        }
    }

    /**
     * Advanced search with caching and relevance scoring
     */
    async searchBooks(searchTerm, options = {}) {
        const {
            limit: searchLimit = 20,
            useCache = true,
            includeDescription = true
        } = options;

        const cacheKey = 'search';
        const cacheParams = { searchTerm, searchLimit, includeDescription };

        // Try cache first
        if (useCache && searchTerm.length > 2) {
            const cachedResults = await this.cache.get('search', cacheKey, cacheParams);
            if (cachedResults) {
                return cachedResults;
            }
        }

        try {
            // Use the base service search with optimizations
            const results = await this.baseService.searchBooks(searchTerm, {
                limit: searchLimit,
                includeDescription
            });

            // Add relevance scoring
            const scoredResults = this.addRelevanceScoring(results.documents, searchTerm);
            
            const optimizedResults = {
                ...results,
                documents: scoredResults
            };

            // Cache the results
            if (useCache && searchTerm.length > 2) {
                await this.cache.set(
                    'search', 
                    cacheKey, 
                    optimizedResults, 
                    this.cacheTTL.search, 
                    cacheParams
                );
            }

            return optimizedResults;
        } catch (error) {
            console.error('Error searching books:', error);
            throw error;
        }
    }

    /**
     * Get genres with caching
     */
    async getGenres(useCache = true) {
        const cacheKey = 'all_genres';

        if (useCache) {
            const cachedGenres = await this.cache.get('genres', cacheKey);
            if (cachedGenres) {
                return cachedGenres;
            }
        }

        try {
            const result = await this.baseService.getGenres();
            
            if (useCache) {
                await this.cache.set('genres', cacheKey, result, this.cacheTTL.genres);
            }

            return result;
        } catch (error) {
            console.error('Error fetching genres:', error);
            throw error;
        }
    }

    /**
     * Get authors with caching
     */
    async getAuthors(useCache = true) {
        const cacheKey = 'all_authors';

        if (useCache) {
            const cachedAuthors = await this.cache.get('authors', cacheKey);
            if (cachedAuthors) {
                return cachedAuthors;
            }
        }

        try {
            const result = await this.baseService.getAuthors();
            
            if (useCache) {
                await this.cache.set('authors', cacheKey, result, this.cacheTTL.authors);
            }

            return result;
        } catch (error) {
            console.error('Error fetching authors:', error);
            throw error;
        }
    }

    /**
     * Get cart items with caching
     */
    async getCartItems(userId, useCache = true) {
        const cacheKey = `cart_${userId}`;

        if (useCache) {
            const cachedCart = await this.cache.get('cart', cacheKey);
            if (cachedCart) {
                return cachedCart;
            }
        }

        try {
            const result = await this.baseService.getCartItems(userId);
            
            if (useCache) {
                await this.cache.set('cart', cacheKey, result, this.cacheTTL.cart);
            }

            return result;
        } catch (error) {
            console.error('Error fetching cart items:', error);
            throw error;
        }
    }

    /**
     * Add relevance scoring to search results
     */
    addRelevanceScoring(books, searchTerm) {
        const term = searchTerm.toLowerCase();
        
        return books.map(book => {
            let score = 0;
            
            // Title match (highest weight)
            if (book.title && book.title.toLowerCase().includes(term)) {
                score += 10;
                if (book.title.toLowerCase().startsWith(term)) {
                    score += 5; // Bonus for starting with search term
                }
            }
            
            // Author match
            if (book.author && book.author.toLowerCase().includes(term)) {
                score += 7;
            }
            
            // Genre match
            if (book.genre && book.genre.toLowerCase().includes(term)) {
                score += 5;
            }
            
            // Description match (lower weight)
            if (book.description && book.description.toLowerCase().includes(term)) {
                score += 3;
            }
            
            return {
                ...book,
                relevanceScore: score
            };
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Prefetch next page in background
     */
    async prefetchNextPage(options) {
        try {
            const nextPageOptions = {
                ...options,
                page: (options.page || 1) + 1,
                useCache: true
            };
            
            // Prefetch in background without blocking
            setTimeout(() => {
                this.getBooks(nextPageOptions).catch(error => {
                    console.warn('Prefetch failed:', error);
                });
            }, 100);
        } catch (error) {
            console.warn('Prefetch error:', error);
        }
    }

    /**
     * Batch operations for better performance
     */
    async batchGetBooks(bookIds) {
        const cacheKey = 'batch_books';
        const cacheParams = { bookIds: bookIds.sort() };

        // Try cache first
        const cachedBooks = await this.cache.get('books', cacheKey, cacheParams);
        if (cachedBooks) {
            return cachedBooks;
        }

        try {
            const books = await Promise.all(
                bookIds.map(id => this.getBookById(id, true))
            );

            const validBooks = books.filter(book => book !== null);
            
            // Cache the batch result
            await this.cache.set('books', cacheKey, validBooks, this.cacheTTL.books, cacheParams);

            return validBooks;
        } catch (error) {
            console.error('Error in batch get books:', error);
            throw error;
        }
    }

    /**
     * Invalidate cache when data changes
     */
    invalidateCache(type, key = null) {
        this.cache.invalidate(type, key);
        
        // Also invalidate related caches
        if (type === 'books') {
            this.cache.invalidate('search');
        }
    }

    /**
     * Network status management
     */
    async enableOfflineMode() {
        try {
            await disableNetwork(this.baseService.db);
            console.log('Offline mode enabled');
        } catch (error) {
            console.error('Error enabling offline mode:', error);
        }
    }

    async enableOnlineMode() {
        try {
            await enableNetwork(this.baseService.db);
            console.log('Online mode enabled');
        } catch (error) {
            console.error('Error enabling online mode:', error);
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cache.getStats();
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clearAll();
    }

    // Proxy other methods to base service
    async createBook(bookData) {
        const result = await this.baseService.createBook(bookData);
        this.invalidateCache('books');
        return result;
    }

    async updateBook(bookId, bookData) {
        const result = await this.baseService.updateBook(bookId, bookData);
        this.invalidateCache('books', `book_${bookId}`);
        return result;
    }

    async deleteBook(bookId) {
        const result = await this.baseService.deleteBook(bookId);
        this.invalidateCache('books');
        return result;
    }

    async addToCart(userId, bookId, quantity = 1) {
        const result = await this.baseService.addToCart(userId, bookId, quantity);
        this.invalidateCache('cart', `cart_${userId}`);
        return result;
    }

    async removeFromCart(userId, bookId) {
        const result = await this.baseService.removeFromCart(userId, bookId);
        this.invalidateCache('cart', `cart_${userId}`);
        return result;
    }

    async updateCartQuantity(userId, bookId, quantity) {
        const result = await this.baseService.updateCartQuantity(userId, bookId, quantity);
        this.invalidateCache('cart', `cart_${userId}`);
        return result;
    }
}

// Create singleton instance
const optimizedFirebaseService = new OptimizedFirebaseService();

export default optimizedFirebaseService;