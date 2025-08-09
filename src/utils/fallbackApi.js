// Fallback API for when Netlify Functions are not available
// Hozirgi Appwrite logic'ni saqlab qoladi

import { databases, Query } from '../appwriteConfig';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

// Fallback books API
export const fallbackBooksApi = {
  async getBooks(params = {}) {
    try {
      const { 
        page = 1, 
        limit = 12, 
        search, 
        genre,
        sortBy = 'recommended'
      } = params;

      // Query building - hozirgi logic
      const queries = [
        Query.limit(parseInt(limit)),
        Query.offset((parseInt(page) - 1) * parseInt(limit))
      ];

      // Search functionality
      if (search && search.trim()) {
        queries.push(Query.search('title', search.trim()));
      }

      // Genre filter
      if (genre && genre !== 'all') {
        queries.push(Query.equal('genre', genre));
      }

      // Sorting
      switch (sortBy) {
        case 'newest':
          queries.push(Query.orderDesc('$createdAt'));
          break;
        case 'oldest':
          queries.push(Query.orderAsc('$createdAt'));
          break;
        case 'price_low':
          queries.push(Query.orderAsc('price'));
          break;
        case 'price_high':
          queries.push(Query.orderDesc('price'));
          break;
        case 'alphabetical':
          queries.push(Query.orderAsc('title'));
          break;
        case 'popular':
          queries.push(Query.orderDesc('salesCount'));
          break;
        case 'admin_priority':
          queries.push(Query.orderDesc('adminPriority'));
          break;
        default: // recommended
          queries.push(Query.orderDesc('demandScore'));
          break;
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        BOOKS_COLLECTION_ID,
        queries
      );

      return {
        success: true,
        books: response.documents,
        total: response.total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(response.total / parseInt(limit)),
        hasMore: response.documents.length === parseInt(limit),
        fallback: true
      };

    } catch (error) {
      console.error('Fallback Books API Error:', error);
      return {
        success: false,
        error: error.message,
        books: [],
        total: 0,
        fallback: true
      };
    }
  }
};

// Fallback search API
export const fallbackSearchApi = {
  async search(query, limit = 10) {
    try {
      // Probellarni olib tashlash
      const cleanQuery = query ? query.trim() : '';
      if (!cleanQuery || cleanQuery.length < 2) {
        return {
          success: false,
          error: 'Query too short',
          results: []
        };
      }

      // Multiple search strategies parallel (tavsif qidiruvi qo'shildi)
      const [titleResults, authorResults, descriptionResults] = await Promise.all([
        databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [
          Query.search('title', cleanQuery),
          Query.limit(Math.ceil(limit * 0.5))
        ]),
        databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [
          Query.search('authorName', cleanQuery),
          Query.limit(Math.ceil(limit * 0.3))
        ]),
        databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [
          Query.search('description', cleanQuery),
          Query.limit(Math.ceil(limit * 0.2))
        ])
      ]);

      // Combine and deduplicate
      const allResults = [
        ...titleResults.documents,
        ...authorResults.documents,
        ...descriptionResults.documents
      ];
      
      const uniqueResults = Array.from(
        new Map(allResults.map(book => [book.$id, book])).values()
      );

      // Simple relevance scoring
      const scoredResults = uniqueResults.map(book => {
        let score = 0;
        const bookTitle = (book.title || '').toLowerCase();
        const bookAuthor = (book.authorName || '').toLowerCase();
        const bookDescription = (book.description || '').toLowerCase();
        
        // Title match (highest priority)
        if (bookTitle.includes(cleanQuery.toLowerCase())) score += 10;
        
        // Author match
        if (bookAuthor.includes(cleanQuery.toLowerCase())) score += 7;
        
        // Description match (lowest priority)
        if (bookDescription.includes(cleanQuery.toLowerCase())) score += 3;
        
        return { ...book, relevanceScore: score };
      });

      // Sort by relevance
      const sortedResults = scoredResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      return {
        success: true,
        results: sortedResults,
        total: uniqueResults.length,
        query: cleanQuery,
        searchTime: '0ms',
        fallback: true
      };

    } catch (error) {
      console.error('Fallback Search API Error:', error);
      return {
        success: false,
        error: error.message,
        results: [],
        fallback: true
      };
    }
  },

  async getSuggestions(query, limit = 5) {
    try {
      // Probellarni olib tashlash
      const cleanQuery = query ? query.trim() : '';
      if (!cleanQuery || cleanQuery.length < 2) {
        return {
          success: false,
          suggestions: []
        };
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        BOOKS_COLLECTION_ID,
        [
          Query.search('title', cleanQuery),
          Query.limit(limit)
        ]
      );

      const suggestions = response.documents.map(book => ({
        id: book.$id,
        title: book.title,
        author: book.authorName,
        image: book.imageUrl,
        price: book.price
      }));

      return {
        success: true,
        suggestions,
        fallback: true
      };

    } catch (error) {
      console.error('Fallback Suggestions API Error:', error);
      return {
        success: false,
        suggestions: [],
        fallback: true
      };
    }
  }
};