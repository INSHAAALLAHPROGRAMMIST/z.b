// Smart Search Hook with Netlify Functions
// Hozirgi qidiruv komponentlari bilan mos

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchApi, smartApi } from '../utils/netlifyApi';
import { useDebounce } from './useDebounce';

export const useSmartSearch = (options = {}) => {
  const {
    debounceDelay = 300,
    minQueryLength = 2,
    maxSuggestions = 5,
    enableSuggestions = true
  } = options;

  // States
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTime, setSearchTime] = useState(null);

  // Debounced query for suggestions
  const debouncedQuery = useDebounce(query, debounceDelay);
  
  // Refs for cleanup
  const searchAbortController = useRef(null);
  const suggestionsAbortController = useRef(null);

  // Search function
  const performSearch = useCallback(async (searchQuery, options = {}) => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      setResults([]);
      setError(null);
      return;
    }

    // Cancel previous search
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
    searchAbortController.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const startTime = Date.now();
      
      // Use smart API with fallback
      const response = await smartApi.search(searchQuery, options.limit || 10);
      
      if (response.success) {
        setResults(response.results || []);
        setSearchTime(response.searchTime || `${Date.now() - startTime}ms`);
      } else {
        throw new Error(response.message || 'Search failed');
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Search Error:', err);
        setError(err.message);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [minQueryLength]);

  // Get suggestions function
  const getSuggestions = useCallback(async (searchQuery) => {
    if (!enableSuggestions || !searchQuery || searchQuery.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    // Cancel previous suggestions request
    if (suggestionsAbortController.current) {
      suggestionsAbortController.current.abort();
    }
    suggestionsAbortController.current = new AbortController();

    try {
      setSuggestionsLoading(true);

      const response = await searchApi.getSuggestions(searchQuery, maxSuggestions);
      
      if (response.success) {
        setSuggestions(response.suggestions || []);
      } else {
        setSuggestions([]);
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Suggestions Error:', err);
        setSuggestions([]);
      }
    } finally {
      setSuggestionsLoading(false);
    }
  }, [enableSuggestions, minQueryLength, maxSuggestions]);

  // Auto-suggestions on debounced query change
  useEffect(() => {
    if (enableSuggestions && debouncedQuery) {
      getSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery, getSuggestions, enableSuggestions]);

  // Clear function
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setError(null);
    setSearchTime(null);
    
    // Cancel ongoing requests
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
    if (suggestionsAbortController.current) {
      suggestionsAbortController.current.abort();
    }
  }, []);

  // Search with current query
  const search = useCallback((customQuery = null) => {
    const searchQuery = customQuery || query;
    performSearch(searchQuery);
  }, [query, performSearch]);

  // Set query and optionally trigger search
  const setQueryAndSearch = useCallback((newQuery, triggerSearch = false) => {
    setQuery(newQuery);
    if (triggerSearch) {
      performSearch(newQuery);
    }
  }, [performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
      if (suggestionsAbortController.current) {
        suggestionsAbortController.current.abort();
      }
    };
  }, []);

  return {
    // State
    query,
    results,
    suggestions,
    loading,
    suggestionsLoading,
    error,
    searchTime,

    // Actions
    setQuery,
    setQueryAndSearch,
    search,
    clear,
    performSearch,
    getSuggestions,

    // Computed
    hasResults: results.length > 0,
    hasSuggestions: suggestions.length > 0,
    isSearching: loading,
    canSearch: query.length >= minQueryLength
  };
};