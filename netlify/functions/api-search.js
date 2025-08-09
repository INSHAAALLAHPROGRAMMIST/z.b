// Netlify Function - Smart Search API
// Hozirgi qidiruv funksiyasini yaxshilaydi, dizaynni buzmaydi

const { Client, Databases, Query } = require('appwrite');

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_SERVER_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = process.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { q: query, limit = 10, suggestions = false } = event.queryStringParameters || {};

    if (!query || query.trim().length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Query too short',
          message: 'Kamida 2 ta belgi kiriting'
        })
      };
    }

    const cleanQuery = query.trim();

    // Suggestions uchun (dropdown da ko'rsatish)
    if (suggestions === 'true') {
      const suggestionResults = await getSearchSuggestions(cleanQuery, parseInt(limit));
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Cache-Control': 'public, max-age=60' // 1 daqiqa cache
        },
        body: JSON.stringify({
          success: true,
          suggestions: suggestionResults,
          query: cleanQuery
        })
      };
    }

    // To'liq qidiruv natijalari
    const searchResults = await performSmartSearch(cleanQuery, parseInt(limit));

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300' // 5 daqiqa cache
      },
      body: JSON.stringify({
        success: true,
        results: searchResults.books,
        total: searchResults.total,
        query: cleanQuery,
        searchTime: searchResults.searchTime
      })
    };

  } catch (error) {
    console.error('Search API Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Search failed',
        message: 'Qidirishda xato yuz berdi'
      })
    };
  }
};

// Smart search suggestions (dropdown uchun)
async function getSearchSuggestions(query, limit) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      BOOKS_COLLECTION_ID,
      [
        Query.search('title', query),
        Query.limit(limit),
        Query.select(['$id', 'title', 'authorName', 'imageUrl', 'price'])
      ]
    );

    return response.documents.map(book => ({
      id: book.$id,
      title: book.title,
      author: book.authorName,
      image: book.imageUrl,
      price: book.price
    }));

  } catch (error) {
    console.error('Suggestions Error:', error);
    return [];
  }
}

// Advanced search with multiple strategies
async function performSmartSearch(query, limit) {
  const startTime = Date.now();
  
  try {
    // O'zbek tilidagi umumiy xatolarni tuzatish
    const correctedQuery = correctCommonMistakes(query);
    
    // Multiple search strategies parallel
    const [titleResults, authorResults, descriptionResults] = await Promise.all([
      searchByField('title', correctedQuery, Math.ceil(limit * 0.6)),
      searchByField('authorName', correctedQuery, Math.ceil(limit * 0.3)),
      searchByField('description', correctedQuery, Math.ceil(limit * 0.1))
    ]);

    // Combine and deduplicate
    const allResults = [...titleResults, ...authorResults, ...descriptionResults];
    const uniqueResults = Array.from(
      new Map(allResults.map(book => [book.$id, book])).values()
    );

    // Relevance scoring
    const scoredResults = uniqueResults.map(book => ({
      ...book,
      relevanceScore: calculateRelevanceScore(book, query, correctedQuery)
    }));

    // Sort by relevance
    const sortedResults = scoredResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    const searchTime = Date.now() - startTime;

    return {
      books: sortedResults,
      total: uniqueResults.length,
      searchTime: `${searchTime}ms`
    };

  } catch (error) {
    console.error('Smart Search Error:', error);
    throw error;
  }
}

// Search by specific field
async function searchByField(field, query, limit) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      BOOKS_COLLECTION_ID,
      [
        Query.search(field, query),
        Query.limit(limit)
      ]
    );

    return response.documents;
  } catch (error) {
    console.error(`Search by ${field} error:`, error);
    return [];
  }
}

// O'zbek tilidagi umumiy xatolarni tuzatish
function correctCommonMistakes(query) {
  const corrections = {
    // Lotin-Kiril aralashmasi
    'kitob': 'kitab',
    'muallif': 'muallif',
    'janr': 'janr',
    'adabiyot': 'adabiyot',
    'roman': 'roman',
    'she\'r': 'she\'r',
    'hikoya': 'hikoya',
    
    // Inglizcha-o'zbekcha
    'book': 'kitab',
    'author': 'muallif',
    'novel': 'roman',
    'story': 'hikoya',
    
    // Umumiy xatolar
    'x': 'h', // "xikoya" -> "hikoya"
    'w': 'v', // "waqt" -> "vaqt"
  };

  let corrected = query.toLowerCase();
  
  Object.keys(corrections).forEach(wrong => {
    const regex = new RegExp(wrong, 'gi');
    corrected = corrected.replace(regex, corrections[wrong]);
  });

  return corrected;
}

// Relevance score calculation
function calculateRelevanceScore(book, originalQuery, correctedQuery) {
  let score = 0;
  const queries = [originalQuery.toLowerCase(), correctedQuery.toLowerCase()];
  
  queries.forEach(q => {
    // Title match (highest priority)
    if (book.title && book.title.toLowerCase().includes(q)) {
      score += 10;
      // Exact match bonus
      if (book.title.toLowerCase() === q) {
        score += 20;
      }
      // Start match bonus
      if (book.title.toLowerCase().startsWith(q)) {
        score += 15;
      }
    }

    // Author match
    if (book.authorName && book.authorName.toLowerCase().includes(q)) {
      score += 7;
    }

    // Description match
    if (book.description && book.description.toLowerCase().includes(q)) {
      score += 3;
    }
  });

  // Popularity bonus
  if (book.salesCount) {
    score += Math.min(book.salesCount * 0.1, 5);
  }

  // Availability bonus
  if (book.isAvailable && book.stock > 0) {
    score += 2;
  }

  return score;
}