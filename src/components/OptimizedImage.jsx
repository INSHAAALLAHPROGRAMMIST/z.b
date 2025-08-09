// Optimized Image Component
// WebP support, lazy loading, fallback

import React, { useState, useRef, useEffect } from 'react';

const OptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  lazy = true,
  webp = true,
  fallback = '/default-book-image.jpg',
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Generate WebP URL from Cloudinary
  const getOptimizedUrl = (originalUrl) => {
    if (!originalUrl || !webp) return originalUrl;
    
    // Cloudinary URL optimization
    if (originalUrl.includes('cloudinary.com')) {
      return originalUrl.replace('/upload/', '/upload/f_auto,q_auto,w_400/');
    }
    
    return originalUrl;
  };

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  const imageSrc = hasError ? fallback : getOptimizedUrl(src);

  return (
    <div 
      ref={imgRef}
      className={`optimized-image-container ${className}`}
      style={{ 
        width: width || 'auto', 
        height: height || 'auto',
        backgroundColor: isLoaded ? 'transparent' : '#f0f0f0'
      }}
    >
      {isInView && (
        <>
          {/* Skeleton loader */}
          {!isLoaded && !hasError && (
            <div 
              className="image-skeleton"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#e0e0e0',
                animation: 'pulse 1.5s ease-in-out infinite',
                borderRadius: '8px'
              }}
            />
          )}
          
          {/* Actual image */}
          <img
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            loading={lazy ? 'lazy' : 'eager'}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              display: isLoaded || hasError ? 'block' : 'none',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
              transition: 'opacity 0.3s ease'
            }}
            {...props}
          />
        </>
      )}
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default OptimizedImage;