import { useState, useEffect, useMemo } from 'react';

// Debounce hook for search and filtering
export const useDebounce = (value, delay = 300) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

// Optimized search hook
export const useOptimizedSearch = (items, searchTerm, searchFields = ['title', 'author.name']) => {
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    
    const filteredItems = useMemo(() => {
        if (!debouncedSearchTerm.trim()) return items;
        
        const searchLower = debouncedSearchTerm.toLowerCase();
        
        return items.filter(item => {
            return searchFields.some(field => {
                const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item);
                return fieldValue?.toLowerCase().includes(searchLower);
            });
        });
    }, [items, debouncedSearchTerm, searchFields]);
    
    return filteredItems;
};