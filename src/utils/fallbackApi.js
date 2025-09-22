// Fallback API for when Netlify Functions are not available
// Firebase client-side fallback

import { db } from '../firebaseConfig';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  startAfter
} from 'firebase/firestore';

// Fallback books API with Firebase
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

      // Firebase query building
      let booksRef = collection(db, 'books');
      let q = booksRef;

      // Genre filter
      if (genre && genre !== 'all') {
        q = query(q, where('genre', '==', genre));
      }

      // Sorting
      switch (sortBy) {
        case 'newest':
          q = query(q, orderBy('createdAt', 'desc'));
          break;
        case 'oldest':
          q = query(q, orderBy('createdAt', 'asc'));
          break;
        case 'price_low':
          q = query(q, orderBy('price', 'asc'));
          break;
        case 'price_high':
          q = query(q, orderBy('price', 'desc'));
          break;
        case 'alphabetical':
          q = query(q, orderBy('title', 'asc'));
          break;
        case 'popular':
          q = query(q, orderBy('salesCount', 'desc'));
          break;
        case 'admin_priority':
          q = query(q, orderBy('adminPriority', 'desc'));
          break;
        default: // recommended
          q = query(q, orderBy('demandScore', 'desc'));
          break;
      }

      // Limit
      q = query(q, firestoreLimit(parseInt(limit)));

      const querySnapshot = await getDocs(q);
      const books = [];
      
      querySnapshot.forEach((doc) => {
        const bookData = doc.data();
        books.push({
          id: doc.id,
          ...bookData
        });
      });

      // Apply search filter (client-side for now)
      let filteredBooks = books;
      if (search && search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        filteredBooks = books.filter(book => 
          book.title?.toLowerCase().includes(searchTerm) ||
          book.authorName?.toLowerCase().includes(searchTerm) ||
          book.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Get total count (approximate)
      const totalSnapshot = await getDocs(collection(db, 'books'));
      const total = totalSnapshot.size;

      return {
        success: true,
        books: filteredBooks,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: filteredBooks.length === parseInt(limit),
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

      // Firebase search (client-side filtering)
      const booksSnapshot = await getDocs(collection(db, 'books'));
      const allBooks = [];
      
      booksSnapshot.forEach((doc) => {
        const bookData = doc.data();
        allBooks.push({
          id: doc.id,
          ...bookData
        });
      });

      // Client-side search filtering
      const searchResults = allBooks.filter(book => {
        const title = (book.title || '').toLowerCase();
        const author = (book.authorName || '').toLowerCase();
        const description = (book.description || '').toLowerCase();
        const searchTerm = cleanQuery.toLowerCase();
        
        return title.includes(searchTerm) || 
               author.includes(searchTerm) || 
               description.includes(searchTerm);
      });
      
      const uniqueResults = searchResults;

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

      // Firebase suggestions
      const booksSnapshot = await getDocs(
        query(collection(db, 'books'), firestoreLimit(limit * 2))
      );
      
      const allBooks = [];
      booksSnapshot.forEach((doc) => {
        const bookData = doc.data();
        allBooks.push({
          id: doc.id,
          ...bookData
        });
      });

      // Filter and limit suggestions
      const filteredBooks = allBooks.filter(book => 
        (book.title || '').toLowerCase().includes(cleanQuery.toLowerCase())
      ).slice(0, limit);

      const suggestions = filteredBooks.map(book => ({
        id: book.id,
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