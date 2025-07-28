// Critical CSS injection utility for above-the-fold optimization

export const injectCriticalCSS = () => {
    // Check if critical CSS is already injected
    if (document.getElementById('critical-css')) return;
    
    const criticalCSS = `
        :root {
            --primary-color: #6366f1;
            --text-color: #f3f4f6;
            --glass-bg-light: rgba(255, 255, 255, 0.1);
            --glass-border: rgba(255, 255, 255, 0.2);
            --transition-fast: 0.3s ease;
        }
        
        body.light-mode {
            --primary-color: #4f46e5;
            --text-color: #1f2937;
            --glass-bg-light: rgba(255, 255, 255, 0.7);
            --glass-border: rgba(0, 0, 0, 0.1);
        }
        
        *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background: linear-gradient(145deg, #0f172a, #1e293b);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            transition: all var(--transition-fast);
        }
        
        body.light-mode {
            background: linear-gradient(145deg, #f8fafc, #e2e8f0);
        }
        
        .glassmorphism-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            height: 70px;
        }
        
        .glassmorphism-header .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 30px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 100%;
        }
        
        .logo {
            display: flex;
            align-items: center;
            text-decoration: none;
            color: var(--text-color);
            font-size: 1.5rem;
            font-weight: bold;
            flex-shrink: 0;
        }
        
        .header-logo {
            height: 40px;
            width: auto;
            margin-right: 10px;
        }
        
        .glassmorphism-button {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 8px;
            padding: 8px 12px;
            color: var(--text-color);
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.95em;
        }
        
        main {
            margin-top: 70px;
            flex: 1;
        }
        
        .loading-placeholder {
            background: linear-gradient(90deg, 
                rgba(255, 255, 255, 0.1) 0%, 
                rgba(255, 255, 255, 0.2) 50%, 
                rgba(255, 255, 255, 0.1) 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        .below-fold {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }
        
        .below-fold.loaded {
            opacity: 1;
            transform: translateY(0);
        }
        
        @media (max-width: 1191px) {
            .hamburger-menu {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 35px;
                height: 35px;
                font-size: 1.8rem;
                cursor: pointer;
                color: var(--text-color);
                z-index: 1005;
            }
        }
    `;
    
    const style = document.createElement('style');
    style.id = 'critical-css';
    style.textContent = criticalCSS;
    document.head.insertBefore(style, document.head.firstChild);
};

// Preload critical resources
export const preloadCriticalResources = () => {
    const resources = [
        {
            href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
            as: 'style'
        },
        {
            href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
            as: 'style'
        },
        {
            href: 'https://res.cloudinary.com/dcn4maral/image/upload/c_scale,h_280,f_auto,q_auto/v1752356041/favicon_maovuy.svg',
            as: 'image'
        }
    ];
    
    resources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as;
        
        if (resource.as === 'style') {
            link.onload = () => {
                link.rel = 'stylesheet';
            };
        }
        
        document.head.appendChild(link);
    });
};

// Optimize initial page load
export const optimizeInitialLoad = () => {
    // Inject critical CSS immediately
    injectCriticalCSS();
    
    // Preload critical resources
    preloadCriticalResources();
    
    // Set up intersection observer for below-the-fold content
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('loaded');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        // Observe below-the-fold elements when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            const belowFoldElements = document.querySelectorAll('.below-fold');
            belowFoldElements.forEach(element => {
                observer.observe(element);
            });
        });
    }
};

// Initialize critical path optimization
export const initCriticalPath = () => {
    // Run immediately
    optimizeInitialLoad();
    
    // Also run when DOM is ready as fallback
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', optimizeInitialLoad);
    } else {
        optimizeInitialLoad();
    }
};