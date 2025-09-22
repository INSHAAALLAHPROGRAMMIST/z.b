// Netlify Functions API with Firebase fallback
// Bu API Netlify Functions'ni ishlatadi, agar mavjud bo'lmasa Firebase fallback

import { fallbackBooksApi, fallbackSearchApi } from './fallbackApi';

const NETLIFY_FUNCTIONS_URL = '/.netlify/functions';

// Check if we're in development or production
const isDev = import.meta.env.DEV;
const baseUrl = isDev ? 'http://localhost:8888' : '';

/**
 * Books API with Netlify Functions + Firebase fallback
 */
export const booksApi = {
  async getBooks(params = {}) {
    try {
      // Try Netlify Function first
      const searchParams = new URLSearchParams(params);
      const response = await fetch(`${baseUrl}${NETLIFY_FUNCTIONS_URL}/api-books?${searchParams}`);
      
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.warn('Netlify Function failed, using Firebase fallback:', error.message);
      
      // Fallback to Firebase client-side
      return await fallbackBooksApi.getBooks(params);
    }
  }
};

/**
 * Search API with Netlify Functions + Firebase fallback
 */
export const searchApi = {
  async search(query, limit = 10) {
    try {
      // Try Netlify Function first
      const searchParams = new URLSearchParams({ 
        q: query, 
        limit: limit.toString() 
      });
      
      const response = await fetch(`${baseUrl}${NETLIFY_FUNCTIONS_URL}/api-search?${searchParams}`);
      
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.warn('Netlify Search Function failed, using Firebase fallback:', error.message);
      
      // Fallback to Firebase client-side
      return await fallbackSearchApi.search(query, limit);
    }
  },

  async getSuggestions(query, limit = 5) {
    try {
      // Try Netlify Function first
      const searchParams = new URLSearchParams({ 
        q: query, 
        limit: limit.toString(),
        suggestions: 'true'
      });
      
      const response = await fetch(`${baseUrl}${NETLIFY_FUNCTIONS_URL}/api-search?${searchParams}`);
      
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.warn('Netlify Suggestions Function failed, using Firebase fallback:', error.message);
      
      // Fallback to Firebase client-side
      return await fallbackSearchApi.getSuggestions(query, limit);
    }
  }
};

/**
 * Health check for Netlify Functions
 */
export const healthCheck = async () => {
  try {
    const response = await fetch(`${baseUrl}${NETLIFY_FUNCTIONS_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Get API status
 */
export const getApiStatus = async () => {
  const netlifyHealthy = await healthCheck();
  
  return {
    netlify: netlifyHealthy,
    firebase: true, // Firebase is always available client-side
    primary: netlifyHealthy ? 'netlify' : 'firebase'
  };
};