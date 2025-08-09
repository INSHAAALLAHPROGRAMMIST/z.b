// Netlify Function - Smart Search API
// Hozirgi qidiruv funksiyasini yaxshilaydi, dizaynni buzmaydi

// Netlify Functions environment'da require ishlatish kerak
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

// Advanced search with multiple strategies - O'zbek tili uchun optimallashtirilgan
async function performSmartSearch(query, limit) {
  const startTime = Date.now();
  
  try {
    // O'zbek tilidagi umumiy xatolarni tuzatish
    const correctedQuery = correctCommonMistakes(query);
    
    // So'zlarni ajratish (kitob nomi + muallif kombinatsiyasi uchun)
    const words = correctedQuery.split(/[\s,.\-+]+/).filter(word => word.length > 1);
    
    // Multiple search strategies parallel
    const searchPromises = [];
    
    // 1. Title search (eng muhim)
    searchPromises.push(searchByField('title', correctedQuery, Math.ceil(limit * 0.4)));
    
    // 2. Author search  
    searchPromises.push(searchByField('authorName', correctedQuery, Math.ceil(limit * 0.3)));
    
    // 3. Description search
    searchPromises.push(searchByField('description', correctedQuery, Math.ceil(limit * 0.2)));
    
    // 4. Individual word searches (kombinatsiya uchun)
    if (words.length > 1) {
      words.forEach(word => {
        if (word.length > 2) {
          searchPromises.push(searchByField('title', word, 5));
          searchPromises.push(searchByField('authorName', word, 5));
        }
      });
    }
    
    const allSearchResults = await Promise.all(searchPromises);
    
    // Combine all results
    const allResults = allSearchResults.flat();
    
    // Deduplicate
    const uniqueResults = Array.from(
      new Map(allResults.map(book => [book.$id, book])).values()
    );

    // Enhanced relevance scoring
    const scoredResults = uniqueResults.map(book => ({
      ...book,
      relevanceScore: calculateEnhancedRelevanceScore(book, query, correctedQuery, words)
    }));

    // Sort by relevance
    const sortedResults = scoredResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    const searchTime = Date.now() - startTime;

    return {
      books: sortedResults,
      total: uniqueResults.length,
      searchTime: `${searchTime}ms`,
      correctedQuery: correctedQuery !== query ? correctedQuery : null
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

// O'zbek tilidagi umumiy xatolarni tuzatish - kengaytirilgan versiya
function correctCommonMistakes(query) {
  const corrections = {
    // Lotin-Kiril aralashmasi
    'китоб': 'kitob',
    'китаб': 'kitab', 
    'муаллиф': 'muallif',
    'жанр': 'janr',
    'адабиёт': 'adabiyot',
    'роман': 'roman',
    'ҳикоя': 'hikoya',
    'шеър': 'she\'r',
    
    // Umumiy xatolar
    'kitob': 'kitab',
    'hikoya': 'hikoya',
    'she\'r': 'sher',
    'adabiyot': 'adabiyot',
    
    // X/H almashinuvi
    'xikoya': 'hikoya',
    'xaqida': 'haqida',
    'xarid': 'harid',
    'xalq': 'halq',
    
    // G'/Q almashinuvi  
    'qadim': 'qadim',
    'g\'adim': 'qadim',
    'qissa': 'qissa',
    'g\'issa': 'qissa',
    
    // O'/U almashinuvi
    'o\'zbek': 'o\'zbek',
    'uzbek': 'o\'zbek',
    'o\'qish': 'o\'qish',
    'uqish': 'o\'qish',
    
    // Inglizcha-o'zbekcha
    'book': 'kitab',
    'author': 'muallif',
    'novel': 'roman',
    'story': 'hikoya',
    'poem': 'she\'r',
    'literature': 'adabiyot',
    'genre': 'janr',
    
    // Ruscha-o'zbekcha
    'книга': 'kitab',
    'автор': 'muallif', 
    'роман': 'roman',
    'рассказ': 'hikoya',
    'стих': 'she\'r',
    'литература': 'adabiyot',
    'жанр': 'janr',
    
    // Mashhur mualliflar
    'abdulla qodiriy': 'Abdulla Qodiriy',
    'abdulla qadiriy': 'Abdulla Qodiriy',
    'qodiriy': 'Abdulla Qodiriy',
    'cholpon': 'Cho\'lpon',
    'chulpon': 'Cho\'lpon',
    'fitrat': 'Abdurauf Fitrat',
    'oybek': 'Oybek',
    'gafur gulom': 'G\'afur G\'ulom',
    'hamid olimjon': 'Hamid Olimjon',
    'erkin vohidov': 'Erkin Vohidov'
  };

  let corrected = query.toLowerCase();
  
  Object.keys(corrections).forEach(wrong => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, corrections[wrong]);
  });

  return corrected;
}

// Enhanced relevance score calculation - O'zbek tili uchun
function calculateEnhancedRelevanceScore(book, originalQuery, correctedQuery, words) {
  let score = 0;
  
  if (!book) return score;
  
  const bookTitle = (book.title || '').toLowerCase();
  const bookAuthor = (book.authorName || '').toLowerCase();
  const bookDescription = (book.description || '').toLowerCase();
  
  const queries = [originalQuery.toLowerCase(), correctedQuery.toLowerCase()];
  
  // Title matches
  queries.forEach(q => {
    if (bookTitle.includes(q)) {
      score += 20;
      
      // Exact match bonus
      if (bookTitle === q) {
        score += 30;
      }
      
      // Start match bonus
      if (bookTitle.startsWith(q)) {
        score += 25;
      }
    }
  });
  
  // Individual word matches in title
  words.forEach(word => {
    if (word.length > 2 && bookTitle.includes(word.toLowerCase())) {
      score += 12;
    }
  });
  
  // Author matches
  queries.forEach(q => {
    if (bookAuthor.includes(q)) {
      score += 15;
    }
  });
  
  // Individual word matches in author
  words.forEach(word => {
    if (word.length > 2 && bookAuthor.includes(word.toLowerCase())) {
      score += 10;
    }
  });
  
  // Description matches
  queries.forEach(q => {
    if (bookDescription.includes(q)) {
      score += 5;
    }
  });
  
  words.forEach(word => {
    if (word.length > 2 && bookDescription.includes(word.toLowerCase())) {
      score += 3;
    }
  });
  
  // Kombinatsiya bonus (kitob nomi + muallif)
  if (words.length >= 2) {
    let titleWords = 0;
    let authorWords = 0;
    
    words.forEach(word => {
      if (bookTitle.includes(word.toLowerCase())) titleWords++;
      if (bookAuthor.includes(word.toLowerCase())) authorWords++;
    });
    
    if (titleWords > 0 && authorWords > 0) {
      score += 20; // Kombinatsiya bonus
    }
  }
  
  // Popularity bonus
  if (book.salesCount) {
    score += Math.min(book.salesCount * 0.1, 5);
  }
  
  // Availability bonus
  if (book.isAvailable && book.stock > 0) {
    score += 3;
  }
  
  // New arrival bonus
  if (book.isNewArrival) {
    score += 2;
  }
  
  // Featured bonus
  if (book.isFeatured) {
    score += 2;
  }
  
  return score;
}