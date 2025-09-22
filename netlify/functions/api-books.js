// Netlify Function - Books API with Firebase
// Firebase Admin SDK for server-side operations

const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

export const handler = async (event, context) => {
  // CORS headers - hozirgi frontend bilan ishlash uchun
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS request uchun (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { httpMethod, queryStringParameters } = event;

    switch (httpMethod) {
      case 'GET':
        return await getBooks(queryStringParameters, headers);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ 
            error: 'Method not allowed',
            message: 'Faqat GET method qo\'llab-quvvatlanadi'
          })
        };
    }

  } catch (error) {
    console.error('API Books Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server error',
        message: 'Serverda xato yuz berdi'
      })
    };
  }
};

async function getBooks(params, headers) {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search, 
      genre,
      sortBy = 'recommended'
    } = params || {};

    // Firebase query building
    let booksRef = db.collection('books');
    
    // Genre filter
    if (genre && genre !== 'all') {
      booksRef = booksRef.where('genre', '==', genre);
    }

    // Search functionality (Firebase doesn't have full-text search, so we'll do basic filtering)
    if (search && search.trim()) {
      // Firebase search is limited, we'll filter on client side or use Algolia later
      // For now, we'll get all books and filter
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        booksRef = booksRef.orderBy('createdAt', 'desc');
        break;
      case 'oldest':
        booksRef = booksRef.orderBy('createdAt', 'asc');
        break;
      case 'price_low':
        booksRef = booksRef.orderBy('price', 'asc');
        break;
      case 'price_high':
        booksRef = booksRef.orderBy('price', 'desc');
        break;
      case 'alphabetical':
        booksRef = booksRef.orderBy('title', 'asc');
        break;
      case 'popular':
        booksRef = booksRef.orderBy('salesCount', 'desc');
        break;
      case 'admin_priority':
        booksRef = booksRef.orderBy('adminPriority', 'desc');
        break;
      default: // recommended
        booksRef = booksRef.orderBy('demandScore', 'desc');
        break;
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    if (offset > 0) {
      // Firebase pagination with offset is complex, using limit for now
      booksRef = booksRef.limit(parseInt(limit));
    } else {
      booksRef = booksRef.limit(parseInt(limit));
    }

    // Get data from Firebase
    const snapshot = await booksRef.get();
    const books = [];
    
    snapshot.forEach(doc => {
      const bookData = doc.data();
      books.push({
        id: doc.id,
        ...bookData
      });
    });

    // Apply search filter if needed (client-side for now)
    let filteredBooks = books;
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredBooks = books.filter(book => 
        book.title?.toLowerCase().includes(searchTerm) ||
        book.authorName?.toLowerCase().includes(searchTerm) ||
        book.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Get total count (approximate for pagination)
    const totalSnapshot = await db.collection('books').get();
    const total = totalSnapshot.size;

    const result = {
      success: true,
      books: filteredBooks,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasMore: filteredBooks.length === parseInt(limit)
    };

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Get Books Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Database error',
        message: 'Ma\'lumotlarni olishda xato'
      })
    };
  }
}