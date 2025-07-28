import { useEffect, useCallback, useRef } from 'react';

// Above-the-fold optimization hook
export const useAboveFold = () => {
    const aboveFoldRef = useRef(null);
    const belowFoldRef = useRef(null);
    
    // Preload critical resources
    const preloadCriticalResources = useCallback(() => {
        // Preload critical fonts
        const fontLink = document.createElement('link');
        fontLink.rel = 'preload';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
        fontLink.as = 'style';
        fontLink.onload = () => {
            fontLink.rel = 'stylesheet';
        };
        document.head.appendChild(fontLink);
        
        // Preload critical images
        const logoUrl = "https://res.cloudinary.com/dcn4maral/image/upload/c_scale,h_280,f_auto,q_auto/v1752356041/favicon_maovuy.svg";
        const logoImg = new Image();
        logoImg.src = logoUrl;
    }, []);
    
    // Load below-the-fold content
    const loadBelowFoldContent = useCallback(() => {
        // Load non-critical CSS
        const loadNonCriticalCSS = () => {
            const cssFiles = [
                '/src/index.css',
                '/src/styles/components/profile.css'
            ];
            
            cssFiles.forEach(cssFile => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssFile;
                link.media = 'print';
                link.onload = () => {
                    link.media = 'all';
                };
                document.head.appendChild(link);
            });
        };
        
        // Use requestIdleCallback for better performance
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                loadNonCriticalCSS();
                
                // Show below-fold content
                const belowFoldElements = document.querySelectorAll('.below-fold');
                belowFoldElements.forEach((element, index) => {
                    setTimeout(() => {
                        element.classList.add('loaded');
                    }, index * 100); // Stagger animation
                });
            });
        } else {
            setTimeout(() => {
                loadNonCriticalCSS();
                
                const belowFoldElements = document.querySelectorAll('.below-fold');
                belowFoldElements.forEach((element, index) => {
                    setTimeout(() => {
                        element.classList.add('loaded');
                    }, index * 100);
                });
            }, 100);
        }
    }, []);
    
    useEffect(() => {
        // Preload critical resources immediately
        preloadCriticalResources();
        
        // Load below-fold content after initial render
        const timer = setTimeout(loadBelowFoldContent, 50);
        
        return () => clearTimeout(timer);
    }, [preloadCriticalResources, loadBelowFoldContent]);
    
    return { aboveFoldRef, belowFoldRef };
};

// Hook for lazy loading images
export const useLazyImage = (src, options = {}) => {
    const imgRef = useRef(null);
    const { threshold = 0.1, rootMargin = '50px' } = options;
    
    useEffect(() => {
        const img = imgRef.current;
        if (!img || !src) return;
        
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Create a new image to preload
                    const newImg = new Image();
                    newImg.onload = () => {
                        img.src = src;
                        img.classList.remove('loading-placeholder');
                        img.classList.add('loaded');
                    };
                    newImg.src = src;
                    observer.unobserve(img);
                }
            },
            { threshold, rootMargin }
        );
        
        observer.observe(img);
        
        return () => observer.disconnect();
    }, [src, threshold, rootMargin]);
    
    return imgRef;
};

// Hook for progressive enhancement
export const useProgressiveEnhancement = () => {
    useEffect(() => {
        // Add class to indicate JS is loaded
        document.documentElement.classList.add('js-loaded');
        
        // Remove no-js class if present
        document.documentElement.classList.remove('no-js');
        
        // Enhance form elements
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.classList.add('enhanced');
        });
        
        // Add smooth scrolling
        document.documentElement.style.scrollBehavior = 'smooth';
        
        return () => {
            document.documentElement.classList.remove('js-loaded');
        };
    }, []);
};

// Hook for critical path optimization
export const useCriticalPath = (criticalElements = []) => {
    useEffect(() => {
        // Prioritize critical elements
        criticalElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.willChange = 'transform, opacity';
                element.classList.add('critical-element');
            });
        });
        
        // Clean up after initial render
        const cleanup = setTimeout(() => {
            criticalElements.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    element.style.willChange = 'auto';
                });
            });
        }, 1000);
        
        return () => clearTimeout(cleanup);
    }, [criticalElements]);
};