import { useEffect } from 'react';

const PerformanceMonitor = () => {
    useEffect(() => {
        // Web Vitals monitoring
        const measureWebVitals = () => {
            // Largest Contentful Paint (LCP)
            if ('PerformanceObserver' in window) {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    console.log('LCP:', lastEntry.startTime);
                    
                    // Send to analytics if needed
                    if (lastEntry.startTime > 2500) {
                        console.warn('LCP is slow:', lastEntry.startTime);
                    }
                });
                
                try {
                    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                } catch (e) {
                    // Fallback for browsers that don't support LCP
                }
                
                // First Input Delay (FID)
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        console.log('FID:', entry.processingStart - entry.startTime);
                        
                        if (entry.processingStart - entry.startTime > 100) {
                            console.warn('FID is slow:', entry.processingStart - entry.startTime);
                        }
                    });
                });
                
                try {
                    fidObserver.observe({ entryTypes: ['first-input'] });
                } catch (e) {
                    // Fallback for browsers that don't support FID
                }
                
                // Cumulative Layout Shift (CLS)
                const clsObserver = new PerformanceObserver((list) => {
                    let clsValue = 0;
                    const entries = list.getEntries();
                    
                    entries.forEach((entry) => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                    
                    console.log('CLS:', clsValue);
                    
                    if (clsValue > 0.1) {
                        console.warn('CLS is high:', clsValue);
                    }
                });
                
                try {
                    clsObserver.observe({ entryTypes: ['layout-shift'] });
                } catch (e) {
                    // Fallback for browsers that don't support CLS
                }
            }
        };
        
        // Page load performance
        const measurePageLoad = () => {
            if ('performance' in window) {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        const perfData = performance.getEntriesByType('navigation')[0];
                        
                        if (perfData) {
                            const metrics = {
                                dns: perfData.domainLookupEnd - perfData.domainLookupStart,
                                tcp: perfData.connectEnd - perfData.connectStart,
                                ttfb: perfData.responseStart - perfData.requestStart,
                                download: perfData.responseEnd - perfData.responseStart,
                                domReady: perfData.domContentLoadedEventEnd - perfData.navigationStart,
                                windowLoad: perfData.loadEventEnd - perfData.navigationStart
                            };
                            
                            console.log('Performance Metrics:', metrics);
                            
                            // Warn about slow metrics
                            if (metrics.ttfb > 600) {
                                console.warn('TTFB is slow:', metrics.ttfb);
                            }
                            if (metrics.domReady > 1500) {
                                console.warn('DOM Ready is slow:', metrics.domReady);
                            }
                            if (metrics.windowLoad > 3000) {
                                console.warn('Window Load is slow:', metrics.windowLoad);
                            }
                        }
                    }, 0);
                });
            }
        };
        
        // Memory usage monitoring
        const monitorMemory = () => {
            if ('memory' in performance) {
                const checkMemory = () => {
                    const memory = performance.memory;
                    const memoryInfo = {
                        used: Math.round(memory.usedJSHeapSize / 1048576),
                        total: Math.round(memory.totalJSHeapSize / 1048576),
                        limit: Math.round(memory.jsHeapSizeLimit / 1048576)
                    };
                    
                    console.log('Memory Usage (MB):', memoryInfo);
                    
                    // Warn about high memory usage
                    if (memoryInfo.used > 50) {
                        console.warn('High memory usage:', memoryInfo.used, 'MB');
                    }
                };
                
                // Check memory every 30 seconds
                const memoryInterval = setInterval(checkMemory, 30000);
                
                return () => clearInterval(memoryInterval);
            }
        };
        
        // Resource loading monitoring
        const monitorResources = () => {
            if ('PerformanceObserver' in window) {
                const resourceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    
                    entries.forEach((entry) => {
                        // Log slow resources
                        if (entry.duration > 1000) {
                            console.warn('Slow resource:', entry.name, entry.duration + 'ms');
                        }
                        
                        // Log failed resources
                        if (entry.transferSize === 0 && entry.decodedBodySize === 0) {
                            console.error('Failed to load resource:', entry.name);
                        }
                    });
                });
                
                try {
                    resourceObserver.observe({ entryTypes: ['resource'] });
                } catch (e) {
                    // Fallback for browsers that don't support resource timing
                }
            }
        };
        
        // Initialize monitoring
        measureWebVitals();
        measurePageLoad();
        const memoryCleanup = monitorMemory();
        monitorResources();
        
        return () => {
            if (memoryCleanup) {
                memoryCleanup();
            }
        };
    }, []);
    
    return null; // This component doesn't render anything
};

export default PerformanceMonitor;