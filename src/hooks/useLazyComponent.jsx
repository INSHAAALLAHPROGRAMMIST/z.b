import React, { Suspense, lazy } from 'react';

// Create lazy component with custom fallback
export const createLazyComponent = (importFunc, fallback = null) => {
    const LazyComponent = lazy(importFunc);
    
    return React.forwardRef((props, ref) => (
        <Suspense fallback={fallback}>
            <LazyComponent {...props} ref={ref} />
        </Suspense>
    ));
};

// Default fallback component
export const DefaultLazyFallback = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '20px'
    }}>
        <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(106, 138, 255, 0.2)',
            borderTop: '4px solid var(--primary-color)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ 
            color: 'var(--light-text-color)',
            fontSize: '1.1rem',
            fontWeight: '500'
        }}>
            Yuklanmoqda...
        </p>
    </div>
);

// Optimized lazy component creator with error boundary
export const createOptimizedLazyComponent = (importFunc, fallback = <DefaultLazyFallback />) => {
    const LazyComponent = lazy(() => 
        importFunc().catch(err => {
            console.error('Lazy component loading failed:', err);
            // Return a fallback component in case of error
            return { 
                default: () => (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '50px',
                        color: 'var(--text-color)'
                    }}>
                        <p>Sahifani yuklashda xato yuz berdi.</p>
                        <button 
                            onClick={() => window.location.reload()}
                            style={{
                                marginTop: '20px',
                                padding: '10px 20px',
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Qayta yuklash
                        </button>
                    </div>
                )
            };
        })
    );
    
    return React.forwardRef((props, ref) => (
        <Suspense fallback={fallback}>
            <LazyComponent {...props} ref={ref} />
        </Suspense>
    ));
};