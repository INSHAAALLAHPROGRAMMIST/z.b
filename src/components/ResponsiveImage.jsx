import React, { useState, useEffect, useRef } from 'react';

const ResponsiveImage = ({ 
    src, 
    alt, 
    className = '', 
    onClick = null,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    loading = 'lazy',
    context = 'default', // 'homepage-card', 'cart-item', 'admin-thumb', 'order-item', 'book-detail'
    isProtected = true // Enable image protection by default
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
    const containerRef = useRef(null);

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

    // Enhanced protection via DOM manipulation
    useEffect(() => {
        if (isProtected && containerRef.current) {
            const container = containerRef.current;
            
            const preventSelection = (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            };

            const preventContextMenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            };

            const preventMiddleClick = (e) => {
                if (e.button === 1) { // Middle mouse button
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            };

            // Add comprehensive event listeners
            container.addEventListener('selectstart', preventSelection, true);
            container.addEventListener('mousedown', preventSelection, true);
            container.addEventListener('contextmenu', preventContextMenu, true);
            container.addEventListener('auxclick', preventMiddleClick, true); // Middle click
            container.addEventListener('dragstart', preventSelection, true);
            
            return () => {
                container.removeEventListener('selectstart', preventSelection, true);
                container.removeEventListener('mousedown', preventSelection, true);
                container.removeEventListener('contextmenu', preventContextMenu, true);
                container.removeEventListener('auxclick', preventMiddleClick, true);
                container.removeEventListener('dragstart', preventSelection, true);
            };
        }
    }, [isProtected]);

    if (isLoading || !isInView) {
        return (
            <div 
                ref={imgRef}
                className={`responsive-image-placeholder ${className}`} 
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                }}
            >
                {isInView ? (
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '3px solid var(--primary-color, #6a8aff)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                ) : (
                    <div style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '2rem',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
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
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '2px dashed rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px',
                    borderRadius: '12px',
                    color: 'rgba(239, 68, 68, 0.8)',
                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.1)'
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                        fontSize: '2.5rem', 
                        marginBottom: '12px',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}>📷</div>
                    <div style={{
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                    }}>Rasm yuklanmadi</div>
                </div>
            </div>
        );
    }

    // Enhanced image protection handlers
    const handleContextMenu = (e) => {
        if (isProtected) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    };

    const handleDragStart = (e) => {
        if (isProtected) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    };

    const handleMouseDown = (e) => {
        if (isProtected) {
            // Prevent middle click (wheel button) for opening in new tab
            if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Prevent right click
            if (e.button === 2) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
    };

    const handleKeyDown = (e) => {
        if (isProtected) {
            // Disable F12, Ctrl+Shift+I, Ctrl+U, etc.
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.key === 'u') ||
                (e.ctrlKey && e.key === 's') ||
                (e.ctrlKey && e.key === 'p')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`responsive-image-container ${className}`}
            data-context={context}
            style={{ 
                position: 'relative',
                display: 'inline-block',
                width: '100%',
                borderRadius: context === 'admin-thumb' ? '6px' : context === 'cart-item' ? '10px' : context === 'book-detail' ? '20px' : '16px',
                overflow: 'hidden',
                background: 'transparent',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                border: 'none',
                boxShadow: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                userSelect: isProtected ? 'none' : 'auto',
                WebkitUserSelect: isProtected ? 'none' : 'auto',
                MozUserSelect: isProtected ? 'none' : 'auto',
                msUserSelect: isProtected ? 'none' : 'auto'
            }}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            onMouseDown={handleMouseDown}
            onKeyDown={handleKeyDown}
        >
            <img
                src={imageSrc}
                alt={alt}
                className="responsive-image"
                onClick={onClick}
                sizes={sizes}
                loading={loading}
                draggable={!isProtected}
                style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    borderRadius: context === 'admin-thumb' ? '6px' : context === 'cart-item' ? '10px' : context === 'book-detail' ? '20px' : '16px',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: onClick ? 'pointer' : 'default',
                    pointerEvents: isProtected && !onClick ? 'none' : 'auto'
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
                onDragStart={handleDragStart}
                onContextMenu={handleContextMenu}
                onMouseDown={handleMouseDown}
            />
            
            {/* Invisible overlay for additional protection */}
            {isProtected && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'transparent',
                        cursor: onClick ? 'pointer' : 'default',
                        zIndex: 1
                    }}
                    onClick={onClick}
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    onMouseDown={handleMouseDown}
                />
            )}
        </div>
    );
};

export default ResponsiveImage;