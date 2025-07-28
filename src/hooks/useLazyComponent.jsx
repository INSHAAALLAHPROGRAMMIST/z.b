import React, { lazy, Suspense } from 'react';

// Default loading component
const ComponentLoader = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: 'var(--light-text-color)'
    }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '1.1rem'
        }}>
            <div className="spinner" style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(var(--primary-color-rgb, 79, 70, 229), 0.2)',
                borderTop: '2px solid var(--primary-color)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }}></div>
            Yuklanmoqda...
        </div>
    </div>
);

// Lazy load component with loading fallback
export const createLazyComponent = (importFunc, fallback = null) => {
    const LazyComponent = lazy(importFunc);
    
    return (props) => (
        <Suspense fallback={fallback || <ComponentLoader />}>
            <LazyComponent {...props} />
        </Suspense>
    );
};

// Preload component for better UX
export const preloadComponent = (importFunc) => {
    // Start loading the component
    importFunc();
};