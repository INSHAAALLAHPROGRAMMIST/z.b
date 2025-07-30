// Performance Monitoring Utilities
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observers = {};
        this.init();
    }

    init() {
        if (typeof window !== 'undefined') {
            this.observeWebVitals();
            this.observeResourceTiming();
            this.observeLongTasks();
        }
    }

    // Core Web Vitals monitoring
    observeWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.lcp = lastEntry.startTime;
                console.log('LCP:', lastEntry.startTime);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.lcp = lcpObserver;
        }

        // First Input Delay (FID)
        if ('PerformanceObserver' in window) {
            const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    this.metrics.fid = entry.processingStart - entry.startTime;
                    console.log('FID:', entry.processingStart - entry.startTime);
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
            this.observers.fid = fidObserver;
        }

        // Cumulative Layout Shift (CLS)
        if ('PerformanceObserver' in window) {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                this.metrics.cls = clsValue;
                console.log('CLS:', clsValue);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.cls = clsObserver;
        }
    }

    // Resource timing monitoring
    observeResourceTiming() {
        if ('PerformanceObserver' in window) {
            const resourceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.name.includes('cloudinary') || entry.name.includes('.jpg') || entry.name.includes('.webp')) {
                        console.log(`Image Load: ${entry.name} - ${entry.duration}ms`);
                    }
                });
            });
            resourceObserver.observe({ entryTypes: ['resource'] });
            this.observers.resource = resourceObserver;
        }
    }

    // Long tasks monitoring
    observeLongTasks() {
        if ('PerformanceObserver' in window) {
            const longTaskObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    console.warn(`Long Task: ${entry.duration}ms`);
                });
            });
            longTaskObserver.observe({ entryTypes: ['longtask'] });
            this.observers.longTask = longTaskObserver;
        }
    }

    // Get current metrics
    getMetrics() {
        return {
            ...this.metrics,
            navigation: this.getNavigationTiming(),
            memory: this.getMemoryInfo()
        };
    }

    // Navigation timing
    getNavigationTiming() {
        if ('performance' in window && 'timing' in performance) {
            const timing = performance.timing;
            return {
                dns: timing.domainLookupEnd - timing.domainLookupStart,
                tcp: timing.connectEnd - timing.connectStart,
                request: timing.responseStart - timing.requestStart,
                response: timing.responseEnd - timing.responseStart,
                dom: timing.domContentLoadedEventEnd - timing.navigationStart,
                load: timing.loadEventEnd - timing.navigationStart
            };
        }
        return null;
    }

    // Memory information
    getMemoryInfo() {
        if ('memory' in performance) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    // Log performance report
    logReport() {
        const metrics = this.getMetrics();
        console.group('📊 Performance Report');
        console.log('Core Web Vitals:', {
            LCP: metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'N/A',
            FID: metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'N/A',
            CLS: metrics.cls ? metrics.cls.toFixed(4) : 'N/A'
        });
        console.log('Navigation:', metrics.navigation);
        console.log('Memory:', metrics.memory);
        console.groupEnd();
    }

    // Cleanup observers
    disconnect() {
        Object.values(this.observers).forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });
    }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export default performanceMonitor;

// Utility functions
export const measurePageLoad = () => {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                performanceMonitor.logReport();
            }, 1000);
        });
    }
};

export const measureComponentRender = (componentName) => {
    const start = performance.now();
    return () => {
        const end = performance.now();
        console.log(`🔧 ${componentName} render time: ${(end - start).toFixed(2)}ms`);
    };
};