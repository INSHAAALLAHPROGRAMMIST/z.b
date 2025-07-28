import { useEffect, useCallback, useRef } from 'react';

const loadedStyles = new Set();
const loadingStyles = new Set();

export const useLazyCSS = (cssPath, priority = 'normal') => {
    const mountedRef = useRef(true);
    
    const loadCSS = useCallback(() => {
        if (!mountedRef.current || loadedStyles.has(cssPath) || loadingStyles.has(cssPath)) {
            return;
        }

        loadingStyles.add(cssPath);

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssPath;
        
        if (priority === 'high') {
            link.media = 'all';
        } else {
            link.media = 'print';
        }
        
        const handleLoad = () => {
            if (!mountedRef.current) return;
            
            if (priority !== 'high') {
                link.media = 'all';
            }
            loadedStyles.add(cssPath);
            loadingStyles.delete(cssPath);
        };
        
        const handleError = () => {
            if (!mountedRef.current) return;
            
            loadingStyles.delete(cssPath);
            console.warn(`Failed to load CSS: ${cssPath}`);
        };
        
        link.onload = handleLoad;
        link.onerror = handleError;
        
        document.head.appendChild(link);
    }, [cssPath, priority]);

    useEffect(() => {
        mountedRef.current = true;
        
        const delay = priority === 'high' ? 0 : 50; // Reduced delay
        const timer = setTimeout(loadCSS, delay);
        
        return () => {
            mountedRef.current = false;
            clearTimeout(timer);
        };
    }, [loadCSS, priority]);
};

// Preload critical CSS with better error handling
export const preloadCSS = (cssPath) => {
    if (loadedStyles.has(cssPath) || loadingStyles.has(cssPath)) return;
    
    loadingStyles.add(cssPath);
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = cssPath;
    
    link.onload = () => {
        link.rel = 'stylesheet';
        loadedStyles.add(cssPath);
        loadingStyles.delete(cssPath);
    };
    
    link.onerror = () => {
        loadingStyles.delete(cssPath);
        console.warn(`Failed to preload CSS: ${cssPath}`);
    };
    
    document.head.appendChild(link);
};

// Batch load multiple CSS files
export const useLazyBatchCSS = (cssPaths, priority = 'normal') => {
    useEffect(() => {
        const delay = priority === 'high' ? 0 : 100;
        
        const timer = setTimeout(() => {
            cssPaths.forEach(cssPath => {
                if (!loadedStyles.has(cssPath) && !loadingStyles.has(cssPath)) {
                    preloadCSS(cssPath);
                }
            });
        }, delay);
        
        return () => clearTimeout(timer);
    }, [cssPaths, priority]);
};