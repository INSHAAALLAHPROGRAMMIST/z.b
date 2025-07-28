import { useEffect, useCallback, useRef } from 'react';

// Debounce hook for performance optimization
export const useDebounce = (callback, delay) => {
    const timeoutRef = useRef(null);
    
    return useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
};

// Throttle hook for performance optimization
export const useThrottle = (callback, delay) => {
    const lastRun = useRef(Date.now());
    
    return useCallback((...args) => {
        if (Date.now() - lastRun.current >= delay) {
            callback(...args);
            lastRun.current = Date.now();
        }
    }, [callback, delay]);
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (options = {}) => {
    const elementRef = useRef(null);
    const observerRef = useRef(null);
    
    const { threshold = 0.1, rootMargin = '0px', onIntersect } = options;
    
    useEffect(() => {
        const element = elementRef.current;
        if (!element || !onIntersect) return;
        
        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onIntersect(entry);
                }
            },
            { threshold, rootMargin }
        );
        
        observerRef.current.observe(element);
        
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [threshold, rootMargin, onIntersect]);
    
    return elementRef;
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
    const renderStartTime = useRef(Date.now());
    
    useEffect(() => {
        const renderTime = Date.now() - renderStartTime.current;
        
        if (renderTime > 16) { // More than one frame (16ms)
            console.warn(`${componentName} render took ${renderTime}ms`);
        }
        
        renderStartTime.current = Date.now();
    });
};

// Memory cleanup hook
export const useCleanup = (cleanupFn) => {
    const cleanupRef = useRef(cleanupFn);
    cleanupRef.current = cleanupFn;
    
    useEffect(() => {
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
            }
        };
    }, []);
};