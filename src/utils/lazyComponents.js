// Lazy loading utilities for better bundle splitting
import { lazy } from 'react';

// Lazy load heavy components
export const LazySlugUpdater = lazy(() => 
    import('../components/SlugUpdater').then(module => ({
        default: module.default
    }))
);

// Lazy load admin components
export const LazyAdminPanel = lazy(() => 
    import('../components/AdminDashboard').then(module => ({
        default: module.default
    }))
);

// Lazy load performance monitor (dev only)
export const LazyPerformanceMonitor = lazy(() => 
    import('../utils/performanceMonitor').then(module => ({
        default: module.default
    }))
);

// Preload critical components
export const preloadCriticalComponents = () => {
    // Preload components that will be needed soon
    if (typeof window !== 'undefined') {
        requestIdleCallback(() => {
            import('../components/BookDetailPage');
            import('../components/CartPage');
        });
    }
};