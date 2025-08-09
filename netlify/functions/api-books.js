// Netlify Function - Books API
// Bu function hozirgi dizaynni buzmaydi, faqat API ni serverless qiladi

// Netlify Functions environment'da require ishlatish kerak
const { Client, Databases, Query } = require('appwrite');

// Appwrite client setup
const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_SERVER_API_KEY); // Server-side API key kerak

const databases = new Databases(client);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = process.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

exports.handler = async (event, context) => {
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

    // Query building - hozirgi frontend logic bilan mos
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

    // Sorting - hozirgi frontend logic
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

    // Appwrite dan ma'lumot olish
    const response = await databases.listDocuments(
      DATABASE_ID,
      BOOKS_COLLECTION_ID,
      queries
    );

    // Response format - hozirgi frontend bilan mos
    const result = {
      success: true,
      books: response.documents,
      total: response.total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(response.total / parseInt(limit)),
      hasMore: response.documents.length === parseInt(limit)
    };

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' // 5 min cache
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