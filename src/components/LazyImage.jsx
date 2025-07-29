import React, { useState, useRef, useEffect, memo } from 'react';

// Optimized book placeholder SVG
const BOOK_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJvb2tHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNjM2NmYxIiBzdG9wLW9wYWNpdHk9IjAuMyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzM0ZDM5OSIgc3RvcC1vcGFjaXR5PSIwLjIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2Jvb2tHcmFkKSIvPjxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjM2MCIgaGVpZ2h0PSI0MjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSI4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjcpIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+TmiDQmtC40YLQvtCxPC90ZXh0Pjwvc3ZnPg==';

const LazyImage = memo(({ src, alt, className, style, placeholder = BOOK_PLACEHOLDER }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef();
    const observerRef = useRef();

    useEffect(() => {
        if (!imgRef.current) return;

        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observerRef.current?.disconnect();
                }
            },
            { 
                threshold: 0.05, // Lower threshold for earlier loading
                rootMargin: '100px' // Start loading 100px before entering viewport
            }
        );

        observerRef.current.observe(imgRef.current);

        return () => {
            observerRef.current?.disconnect();
        };
    }, []);

    const handleLoad = () => {
        setIsLoaded(true);
        setHasError(false);
    };

    const handleError = () => {
        setHasError(true);
        setIsLoaded(true);
    };

    // Optimize image source
    const optimizedSrc = isInView ? src : placeholder;

    return (
        <div ref={imgRef} className={className} style={{ position: 'relative', ...style }}>
            <img
                src={optimizedSrc}
                alt={alt}
                onLoad={handleLoad}
                onError={handleError}
                style={{
                    opacity: isLoaded ? 1 : (isInView ? 0.8 : 1), // Show placeholder fully until in view
                    transition: 'opacity 0.2s ease', // Faster transition
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: hasError ? 'grayscale(100%)' : 'none',
                    backgroundColor: 'var(--glass-bg-light, rgba(255,255,255,0.1))' // Fallback bg
                }}
                loading="lazy"
                decoding="async"
            />
            {/* Shimmer effect while loading */}
            {isInView && !isLoaded && !hasError && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    pointerEvents: 'none'
                }} />
            )}
        </div>
    );
});

export default LazyImage;