import { useEffect, useRef } from 'react';

// Performance monitoring hook
export const usePerformance = (componentName) => {
    const renderStart = useRef(performance.now());
    const mountTime = useRef(null);
    
    useEffect(() => {
        // Component mount time
        mountTime.current = performance.now() - renderStart.current;
        
        if (import.meta.env.DEV) {
            console.log(`🔧 ${componentName} mount time: ${mountTime.current.toFixed(2)}ms`);
        }
        
        // Memory usage monitoring
        if ('memory' in performance) {
            const memoryInfo = performance.memory;
            if (import.meta.env.DEV) {
                console.log(`💾 ${componentName} memory:`, {
                    used: `${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                    total: `${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
                });
            }
        }
    }, [componentName]);
    
    // Re-render performance tracking
    useEffect(() => {
        renderStart.current = performance.now();
    });
    
    return {
        mountTime: mountTime.current,
        markRender: () => {
            const renderTime = performance.now() - renderStart.current;
            if (import.meta.env.DEV) {
                console.log(`🔄 ${componentName} render time: ${renderTime.toFixed(2)}ms`);
            }
            return renderTime;
        }
    };
};

// Web Vitals monitoring
export const useWebVitals = () => {
    useEffect(() => {
        // Only in production
        if (import.meta.env.PROD) {
            import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
                getCLS(console.log);
                getFID(console.log);
                getFCP(console.log);
                getLCP(console.log);
                getTTFB(console.log);
            });
        }
    }, []);
};