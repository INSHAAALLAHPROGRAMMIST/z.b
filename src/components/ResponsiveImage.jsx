import React, { useState, useEffect, useRef } from 'react';

const ResponsiveImage = ({ 
    src, 
    alt, 
    className = '', 
    onClick = null,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    loading = 'lazy',
    context = 'default' // 'homepage-card', 'cart-item', 'admin-thumb', 'order-item', 'book-detail'
}) => {
    const [imageSrc, setImageSrc] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    // Cloudinary URL'dan responsive versiyalarni yaratish
    const generateResponsiveSrc = (originalSrc, width) => {
        if (!originalSrc || !originalSrc.includes('cloudinary')) {
            return originalSrc;
        }
        
        // Cloudinary URL'ni parse qilish
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
                quality = 'q_80'; // Kichik rasmlar uchun past sifat
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
        
        // Context-based optimal sizing
        switch (context) {
            case 'homepage-card':
                if (isMobile) return 200; // Mobile card
                if (isTablet) return 280; // Tablet card
                return 320; // Desktop card
                
            case 'book-detail':
                if (isMobile) return 400; // Mobile detail
                return 500; // Desktop detail
                
            case 'cart-item':
                return 120; // Fixed small size for cart
                
            case 'order-item':
                return 100; // Fixed small size for orders
                
            case 'admin-thumb':
                return 80; // Fixed tiny size for admin
                
            default:
                // Agar sizes prop'da aniq o'lcham berilgan bo'lsa
                if (sizes && sizes.includes('px')) {
                    const sizeMatch = sizes.match(/(\d+)px/);
                    if (sizeMatch) {
                        const targetSize = parseInt(sizeMatch[1]);
                        return Math.min(targetSize * 2, 400);
                    }
                }
                
                // Default viewport-based sizing
                if (viewportWidth <= 480) return 300;
                if (viewportWidth <= 768) return 400;
                if (viewportWidth <= 1024) return 500;
                return 600;
        }
    };

    // Lazy loading state
    const [isInView, setIsInView] = useState(loading === 'eager');
    const imgRef = useRef(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (loading === 'eager' || isInView) return;

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
                rootMargin: '100px', // Load 100px before visible
                threshold: 0.1 
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [loading, isInView]);

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

        // Viewport resize listener (throttled)
        let resizeTimeout;
        const handleResize = () => {
            if (resizeTimeout) return;
            resizeTimeout = setTimeout(() => {
                const newOptimalWidth = getOptimalWidth();
                const newResponsiveSrc = generateResponsiveSrc(src, newOptimalWidth);
                if (newResponsiveSrc !== responsiveSrc) {
                    setImageSrc(newResponsiveSrc);
                }
                resizeTimeout = null;
            }, 250);
        };

        window.addEventListener('resize', handleResize, { passive: true });
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimeout) clearTimeout(resizeTimeout);
        };
    }, [src, isInView]);

    if (isLoading || !isInView) {
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
                {isInView ? (
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #ddd',
                        borderTop: '3px solid #6a8aff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                ) : (
                    <div style={{
                        color: '#999',
                        fontSize: '0.9rem'
                    }}>
                        📷
                    </div>
                )}
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

export default ResponsiveImage;