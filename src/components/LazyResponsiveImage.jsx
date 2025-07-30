import React, { useState, useEffect, useRef } from 'react';

const LazyResponsiveImage = ({ 
    src, 
    alt, 
    className = '', 
    onClick = null,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    loading = 'lazy',
    context = 'default'
}) => {
    const [imageSrc, setImageSrc] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef(null);

    // Cloudinary URL'dan responsive versiyalarni yaratish
    const generateResponsiveSrc = (originalSrc, width) => {
        if (!originalSrc || !originalSrc.includes('cloudinary')) {
            return originalSrc;
        }
        
        const parts = originalSrc.split('/upload/');
        if (parts.length !== 2) return originalSrc;
        
        // Context va o'lchamga qarab quality optimization
        let quality, format;
        
        switch (context) {
            case 'homepage-card':
                quality = 'q_auto';
                format = 'f_webp';
                break;
            case 'book-detail':
                quality = 'q_90';
                format = 'f_webp';
                break;
            case 'admin-thumb':
            case 'cart-item':
            case 'order-item':
                quality = 'q_80';
                format = 'f_webp';
                break;
            default:
                quality = width <= 150 ? 'q_80' : 'q_auto';
                format = 'f_webp';
        }
        
        const transformations = `w_${width},c_fill,${format},${quality}`;
        return `${parts[0]}/upload/${transformations}/${parts[1]}`;
    };

    // Context va viewport'ga qarab optimal rasm o'lchamini aniqlash
    const getOptimalWidth = () => {
        const viewportWidth = window.innerWidth;
        const isMobile = viewportWidth <= 768;
        const isTablet = viewportWidth <= 1024;
        
        switch (context) {
            case 'homepage-card':
                if (isMobile) return 200;
                if (isTablet) return 280;
                return 320;
            case 'book-detail':
                if (isMobile) return 400;
                return 500;
            case 'cart-item':
                return 120;
            case 'order-item':
                return 100;
            case 'admin-thumb':
                return 80;
            default:
                if (viewportWidth <= 480) return 300;
                if (viewportWidth <= 768) return 400;
                if (viewportWidth <= 1024) return 500;
                return 600;
        }
    };

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (loading === 'eager') {
            setIsInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            { 
                rootMargin: '50px',
                threshold: 0.1 
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [loading]);

    // Load image when in view
    useEffect(() => {
        if (!src || !isInView) return;

        const optimalWidth = getOptimalWidth();
        const responsiveSrc = generateResponsiveSrc(src, optimalWidth);
        
        const img = new Image();
        img.onload = () => {
            setImageSrc(responsiveSrc);
            setIsLoading(false);
            setError(false);
        };
        img.onerror = () => {
            setError(true);
            setIsLoading(false);
        };
        img.src = responsiveSrc;
    }, [src, isInView]);

    if (isLoading) {
        return (
            <div 
                ref={imgRef}
                className={`responsive-image-placeholder ${className}`} 
                style={{
                    backgroundColor: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px',
                    borderRadius: '8px'
                }}
            >
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #ddd',
                    borderTop: '3px solid #6a8aff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
            </div>
        );
    }

    if (error) {
        return (
            <div 
                ref={imgRef}
                className={`responsive-image-error ${className}`} 
                style={{
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px',
                    borderRadius: '8px',
                    border: '2px dashed #ddd',
                    color: '#666'
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📷</div>
                    <div>Rasm yuklanmadi</div>
                </div>
            </div>
        );
    }

    return (
        <img
            ref={imgRef}
            src={imageSrc}
            alt={alt}
            className={`responsive-image ${className}`}
            onClick={onClick}
            sizes={sizes}
            loading={loading}
            style={{
                width: '100%',
                height: 'auto',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: onClick ? 'pointer' : 'default'
            }}
            onMouseEnter={(e) => {
                if (onClick) {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }
            }}
            onMouseLeave={(e) => {
                if (onClick) {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                }
            }}
        />
    );
};

export default LazyResponsiveImage;