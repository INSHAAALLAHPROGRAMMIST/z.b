import { useEffect, useRef } from 'react';

const PerformanceMonitor = ({ enabled = import.meta.env.DEV }) => {
    const observersRef = useRef([]);
    const metricsRef = useRef({});
    
    useEffect(() => {
        // Only run in development or when explicitly enabled
        if (!enabled) return;
        
        // Cleanup function
        const cleanup = () => {
            observersRef.current.forEach(observer => {
                if (observer && observer.disconnect) {
                    observer.disconnect();
                }
            });
            observersRef.current = [];
        };

        // Web Vitals monitoring with cleanup
        const measureWebVitals = () => {
            if (!('PerformanceObserver' in window)) return;

            try {
                // Largest Contentful Paint (LCP)
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    metricsRef.current.lcp = lastEntry.startTime;
                    
                    if (import.meta.env.DEV && lastEntry.startTime > 2500) {
                        console.warn('🐌 LCP is slow:', Math.round(lastEntry.startTime), 'ms');
                    }
                });
                
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                observersRef.current.push(lcpObserver);

                // First Input Delay (FID)
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        const fid = entry.processingStart - entry.startTime;
                        metricsRef.current.fid = fid;
                        
                        if (import.meta.env.DEV && fid > 100) {
                            console.warn('🐌 FID is slow:', Math.round(fid), 'ms');
                        }
                    });
                });
                
                fidObserver.observe({ entryTypes: ['first-input'] });
                observersRef.current.push(fidObserver);

                // Cumulative Layout Shift (CLS)
                const clsObserver = new PerformanceObserver((list) => {
                    let clsValue = 0;
                    const entries = list.getEntries();
                    
                    entries.forEach((entry) => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                    
                    metricsRef.current.cls = clsValue;
                    
                    if (import.meta.env.DEV && clsValue > 0.1) {
                        console.warn('🐌 CLS is high:', clsValue.toFixed(3));
                    }
                });
                
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                observersRef.current.push(clsObserver);

            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('Performance monitoring not supported:', error);
                }
            }
        };
        
        // Page load performance (run once)
        const measurePageLoad = () => {
            if (!('performance' in window)) return;

            const loadHandler = () => {
                // Use requestIdleCallback for non-blocking measurement
                const measure = () => {
                    try {
                        const perfData = performance.getEntriesByType('navigation')[0];
                        
                        if (perfData) {
                            const metrics = {
                                dns: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
                                tcp: Math.round(perfData.connectEnd - perfData.connectStart),
                                ttfb: Math.round(perfData.responseStart - perfData.requestStart),
                                download: Math.round(perfData.responseEnd - perfData.responseStart),
                                domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.navigationStart),
                                loadComplete: Math.round(perfData.loadEventEnd - perfData.navigationStart)
                            };
                            
                            metricsRef.current = { ...metricsRef.current, ...metrics };
                            
                            if (import.meta.env.DEV) {
                                console.group('📊 Page Load Metrics');
                                console.log('DNS:', metrics.dns + 'ms');
                                console.log('TCP:', metrics.tcp + 'ms');
                                console.log('TTFB:', metrics.ttfb + 'ms');
                                console.log('Download:', metrics.download + 'ms');
                                console.log('DOM Ready:', metrics.domReady + 'ms');
                                console.log('Load Complete:', metrics.loadComplete + 'ms');
                                console.groupEnd();
                                
                                // Warnings for slow metrics
                                if (metrics.ttfb > 600) console.warn('🐌 TTFB is slow');
                                if (metrics.domReady > 3000) console.warn('🐌 DOM Ready is slow');
                                if (metrics.loadComplete > 5000) console.warn('🐌 Load Complete is slow');
                            }
                        }
                    } catch (error) {
                        if (import.meta.env.DEV) {
                            console.warn('Page load measurement failed:', error);
                        }
                    }
                };

                // Use requestIdleCallback if available, otherwise setTimeout
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(measure, { timeout: 5000 });
                } else {
                    setTimeout(measure, 100);
                }
            };

            if (document.readyState === 'complete') {
                loadHandler();
            } else {
                window.addEventListener('load', loadHandler, { once: true });
            }
        };

        // Resource performance monitoring
        const measureResources = () => {
            if (!('PerformanceObserver' in window)) return;

            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    
                    entries.forEach((entry) => {
                        // Only log slow resources in development
                        if (import.meta.env.DEV && entry.duration > 1000) {
                            console.warn('🐌 Slow resource:', entry.name, Math.round(entry.duration) + 'ms');
                        }
                    });
                });
                
                resourceObserver.observe({ entryTypes: ['resource'] });
                observersRef.current.push(resourceObserver);
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.warn('Resource monitoring not supported:', error);
                }
            }
        };

        // Initialize monitoring
        measureWebVitals();
        measurePageLoad();
        measureResources();

        // Cleanup on unmount
        return cleanup;
    }, [enabled]);

    // Expose metrics for debugging (development only)
    useEffect(() => {
        if (import.meta.env.DEV && enabled) {
            window.__PERFORMANCE_METRICS__ = metricsRef.current;
        }
    }, [enabled]);

    return null; // This component doesn't render anything
};

export default PerformanceMonitor;