// Netlify API utilities
// Hozirgi kod bilan mos, dizaynni buzmaydi

// API base URL - development va production uchun
const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8888/.netlify/functions'
  : '/.netlify/functions';

// Generic API call function
async function callNetlifyFunction(functionName, params = {}, options = {}) {
  try {
    const url = new URL(`${API_BASE}/${functionName}`, window.location.origin);
    
    // Query parameters qo'shish
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error(`Netlify Function Error (${functionName}):`, error);
    throw error;
  }
}

// Books API calls
export const booksApi = {
  // Kitoblar ro'yxatini olish
  async getBooks(params = {}) {
    return await callNetlifyFunction('api-books', params);
  },

  // Kitobni ID bo'yicha olish
  async getBookById(bookId) {
    return await callNetlifyFunction('api-books', { id: bookId });
  }
};

// Search API calls
export const searchApi = {
  // To'liq qidiruv
  async search(query, limit = 10) {
    return await callNetlifyFunction('api-search', { q: query, limit });
  },

  // Qidiruv tavsiyalari (dropdown uchun)
  async getSuggestions(query, limit = 5) {
    return await callNetlifyFunction('api-search', { 
      q: query, 
      limit, 
      suggestions: 'true' 
    });
  }
};

// Health check
export const healthApi = {
  async check() {
    return await callNetlifyFunction('health');
  }
};

// Fallback functions - agar Netlify Functions ishlamasa
export const fallbackToAppwrite = {
  async getBooks(params = {}) {
    // Hozirgi Appwrite logic'ni chaqirish
    console.warn('Falling back to direct Appwrite call');
    // Bu yerda hozirgi kod ishlatiladi
    return { success: false, fallback: true };
  },

  async search(query) {
    console.warn('Falling back to client-side search');
    return { success: false, fallback: true };
  }
};

// Progressive enhancement - Netlify Functions bor yoki yo'qligini tekshirish
export async function checkNetlifyFunctions() {
  try {
    await healthApi.check();
    return true;
  } catch (error) {
    console.warn('Netlify Functions not available, using fallback');
    return false;
  }
}

// Smart API caller - Netlify Functions yoki fallback
export const smartApi = {
  async getBooks(params = {}) {
    try {
      return await booksApi.getBooks(params);
    } catch (error) {
      console.warn('Netlify API failed, using fallback');
      return await fallbackToAppwrite.getBooks(params);
    }
  },

  async search(query, limit = 10) {
    try {
      return await searchApi.search(query, limit);
    } catch (error) {
      console.warn('Netlify Search failed, using fallback');
      return await fallbackToAppwrite.search(query);
    }
  }
};