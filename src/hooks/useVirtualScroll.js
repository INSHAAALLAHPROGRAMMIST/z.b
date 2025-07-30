import { useState, useEffect, useMemo } from 'react';

// Virtual scrolling hook for large lists
export const useVirtualScroll = ({
    items,
    itemHeight = 400, // Book card height
    containerHeight = window.innerHeight,
    overscan = 5 // Extra items to render
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    
    const visibleItems = useMemo(() => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const endIndex = Math.min(
            items.length - 1,
            Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
        );
        
        return {
            startIndex,
            endIndex,
            items: items.slice(startIndex, endIndex + 1),
            totalHeight: items.length * itemHeight,
            offsetY: startIndex * itemHeight
        };
    }, [items, scrollTop, itemHeight, containerHeight, overscan]);
    
    const handleScroll = (e) => {
        setScrollTop(e.target.scrollTop);
    };
    
    return {
        visibleItems,
        handleScroll,
        totalHeight: visibleItems.totalHeight
    };
};