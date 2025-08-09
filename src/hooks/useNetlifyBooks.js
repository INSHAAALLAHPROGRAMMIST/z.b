// Custom hook for Netlify Books API
// Hozirgi kod bilan mos, dizaynni buzmaydi

import { useState, useEffect, useCallback } from 'react';
import { booksApi, smartApi } from '../utils/netlifyApi';

export const useNetlifyBooks = (initialParams = {}) => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    // Default parameters
    const defaultParams = {
        page: 1,
        limit: 12,
        sortBy: 'recommended',
        ...initialParams
    };

    const [params, setParams] = useState(defaultParams);

    // Fetch books function
    const fetchBooks = useCallback(async (newParams = {}, append = false) => {
        try {
            setLoading(true);
            setError(null);

            const queryParams = { ...params, ...newParams };

            // Try Netlify Functions first, fallback to direct Appwrite
            const response = await smartApi.getBooks(queryParams);

            if (response.success) {
                const newBooks = response.books || [];

                if (append) {
                    setBooks(prevBooks => [...prevBooks, ...newBooks]);
                } else {
                    setBooks(newBooks);
                }

                setHasMore(response.hasMore || false);
                setTotalPages(response.totalPages || 0);
                setCurrentPage(response.page || 1);

                // Update params
                setParams(queryParams);

            } else {
                throw new Error(response.message || 'Failed to fetch books');
            }

        } catch (err) {
            console.error('useNetlifyBooks Error:', err);
            setError(err.message);

            // Fallback to empty state
            if (!append) {
                setBooks([]);
            }
        } finally {
            setLoading(false);
        }
    }, [params]);

    // Initial load
    useEffect(() => {
        fetchBooks();
    }, []); // Only run once on mount

    // Refresh function
    const refresh = useCallback(() => {
        fetchBooks({}, false);
    }, [fetchBooks]);

    // Load more function (pagination)
    const loadMore = useCallback(() => {
        if (hasMore && !loading) {
            fetchBooks({ page: currentPage + 1 }, true);
        }
    }, [fetchBooks, hasMore, loading, currentPage]);

    // Search function
    const search = useCallback((searchQuery) => {
        fetchBooks({
            search: searchQuery,
            page: 1
        }, false);
    }, [fetchBooks]);

    // Filter by genre
    const filterByGenre = useCallback((genre) => {
        fetchBooks({
            genre: genre,
            page: 1
        }, false);
    }, [fetchBooks]);

    // Sort books
    const sortBooks = useCallback((sortBy) => {
        fetchBooks({
            sortBy: sortBy,
            page: 1
        }, false);
    }, [fetchBooks]);

    // Reset to default
    const reset = useCallback(() => {
        setParams(defaultParams);
        fetchBooks(defaultParams, false);
    }, [fetchBooks]);

    return {
        // Data
        books,
        loading,
        error,
        hasMore,
        totalPages,
        currentPage,
        params,

        // Actions
        refresh,
        loadMore,
        search,
        filterByGenre,
        sortBooks,
        reset,

        // Manual fetch
        fetchBooks
    };
};