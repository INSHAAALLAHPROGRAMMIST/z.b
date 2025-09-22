import React, { useState, useRef, useEffect } from 'react';
import { AdvancedImage } from '@cloudinary/react';
import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { auto as autoFormat } from '@cloudinary/url-gen/actions/delivery';
import { auto as autoQuality } from '@cloudinary/url-gen/actions/delivery';
import { blur } from '@cloudinary/url-gen/actions/effect';

// Cloudinary instance
const cld = new Cloudinary({
    cloud: {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    }
});

const OptimizedImage = ({
    src,
    alt,
    width,
    height,
    className = '',
    placeholder = true,
    lazy = true,
    quality = 'auto',
    format = 'auto',
    crop = 'auto',
    blur: blurAmount = 0,
    onLoad,
    onError,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(!lazy);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef(null);
    const observerRef = useRef(null);

    // Extract public ID from Cloudinary URL or use src directly
    const getPublicId = (url) => {
        if (!url) return null;
        
        // If it's already a public ID, return as is
        if (!url.includes('cloudinary.com')) {
            return url;
        }
        
        // Extract public ID from Cloudinary URL
        const match = url.match(/\/v\d+\/(.+?)(?:\.[^.]+)?$/);
        return match ? match[1] : url;
    };

    const publicId = getPublicId(src);

    // Create optimized image
    const createOptimizedImage = () => {
        if (!publicId) return null;

        try {
            let image = cld.image(publicId);

            // Apply transformations
            if (width || height) {
                image = image.resize(auto().width(width).height(height));
            }
            
            if (format === 'auto') {
                image = image.delivery(autoFormat());
            }
            
            if (quality === 'auto') {
                image = image.delivery(autoQuality());
            }

            if (blurAmount > 0) {
                image = image.effect(blur().strength(blurAmount));
            }

            return image;
        } catch (error) {
            console.error('Error creating optimized image:', error);
            return null;
        }
    };

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
            {
                rootMargin: '50px', // Load images 50px before they come into view
                threshold: 0.1
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [lazy, isInView]);

    const handleLoad = (e) => {
        setIsLoaded(true);
        if (onLoad) onLoad(e);
    };

    const handleError = (e) => {
        setHasError(true);
        if (onError) onError(e);
    };

    const optimizedImage = createOptimizedImage();

    // Fallback for non-Cloudinary images or errors
    if (!optimizedImage || hasError) {
        return (
            <img
                ref={imgRef}
                src={isInView ? src : undefined}
                alt={alt}
                className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
                onLoad={handleLoad}
                onError={handleError}
                loading={lazy ? 'lazy' : 'eager'}
                {...props}
            />
        );
    }

    return (
        <div 
            ref={imgRef}
            className={`optimized-image-container ${className}`}
            style={{ position: 'relative', overflow: 'hidden' }}
        >
            {/* Placeholder */}
            {placeholder && !isLoaded && (
                <div 
                    className="image-placeholder"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'var(--glass-bg-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1
                    }}
                >
                    <div 
                        style={{
                            width: '30px',
                            height: '30px',
                            border: '2px solid rgba(106, 138, 255, 0.2)',
                            borderTop: '2px solid var(--primary-color)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}
                    />
                </div>
            )}

            {/* Optimized Image */}
            {isInView && (
                <AdvancedImage
                    cldImg={optimizedImage}
                    alt={alt}
                    className={`optimized-image ${isLoaded ? 'loaded' : 'loading'}`}
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'opacity 0.3s ease',
                        opacity: isLoaded ? 1 : 0
                    }}
                    {...props}
                />
            )}
        </div>
    );
};

export default OptimizedImage;