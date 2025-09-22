import React, { useEffect, useRef } from 'react';

/**
 * Performance Monitor Component
 * Tracks and reports performance metrics for optimization
 */
const PerformanceMonitor = ({ enabled = true, reportInterval = 30000 }) => {
    const metricsRef = useRef({
        pageLoadTime: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
        timeToInteractive: 0
    });

    const observerRef = useRef(null);
    const reportTimerRef = useRef(null);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        // Initialize performance monitoring
        initializePerformanceMonitoring();

        // Set up periodic reporting
        reportTimerRef.current = setInterval(() => {
            reportMetrics();
        }, reportInterval);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
            if (reportTimerRef.current) {
                clearInterval(reportTimerRef.current);
            }
        };
    }, [enabled, reportInterval]);

    const initializePerformanceMonitoring = () => {
        // Measure page load time
        measurePageLoadTime();

        // Measure Core Web Vitals
        measureCoreWebVitals();

        // Monitor resource loading
        monitorResourceLoading();

        // Monitor memory usage
        monitorMemoryUsage();

        // Monitor network conditions
        monitorNetworkConditions();
    };

    const measurePageLoadTime = () => {
        if (performance.timing) {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            metricsRef.current.pageLoadTime = loadTime;
        }

        // Use Performance Observer for more accurate measurements
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'navigation') {
                        metricsRef.current.pageLoadTime = entry.loadEventEnd - entry.fetchStart;
                    }
                }
            });
            observer.observe({ entryTypes: ['navigation'] });
        }
    };

    const measureCoreWebVitals = () => {
        if (!('PerformanceObserver' in window)) return;

        // First Contentful Paint (FCP)
        const fcpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    metricsRef.current.firstContentfulPaint = entry.startTime;
                }
            }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            metricsRef.current.largestContentfulPaint = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                metricsRef.current.firstInputDelay = entry.processingStart - entry.startTime;
            }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            metricsRef.current.cumulativeLayoutShift = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        observerRef.current = {
            fcp: fcpObserver,
            lcp: lcpObserver,
            fid: fidObserver,
            cls: clsObserver
        };
    };

    const monitorResourceLoading = () => {
        if (!('PerformanceObserver' in window)) return;

        const resourceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // Track slow loading resources
                if (entry.duration > 1000) { // Resources taking more than 1 second
                    console.warn('Slow resource detected:', {
                        name: entry.name,
                        duration: entry.duration,
                        size: entry.transferSize,
                        type: entry.initiatorType
                    });
                }

                // Track failed resources
                if (entry.transferSize === 0 && entry.duration > 0) {
                    console.error('Failed resource:', entry.name);
                }
            }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
    };

    const monitorMemoryUsage = () => {
        if (!('memory' in performance)) return;

        const checkMemory = () => {
            const memory = performance.memory;
            const memoryUsage = {
                used: Math.round(memory.usedJSHeapSize / 1048576), // MB
                total: Math.round(memory.totalJSHeapSize / 1048576), // MB
                limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
            };

            // Warn if memory usage is high
            if (memoryUsage.used / memoryUsage.limit > 0.8) {
                console.warn('High memory usage detected:', memoryUsage);
            }

            return memoryUsage;
        };

        // Check memory usage periodically
        setInterval(checkMemory, 10000); // Every 10 seconds
    };

    const monitorNetworkConditions = () => {
        if (!('connection' in navigator)) return;

        const connection = navigator.connection;
        const networkInfo = {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
        };

        // Adjust behavior based on network conditions
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            console.warn('Slow network detected, consider optimizing:', networkInfo);
            // You can dispatch events to optimize for slow networks
            window.dispatchEvent(new CustomEvent('slowNetwork', { detail: networkInfo }));
        }

        // Listen for network changes
        connection.addEventListener('change', () => {
            console.log('Network conditions changed:', {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt
            });
        });
    };

    const reportMetrics = () => {
        const metrics = { ...metricsRef.current };
        
        // Add current memory usage if available
        if ('memory' in performance) {
            metrics.memoryUsage = {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576)
            };
        }

        // Add network information if available
        if ('connection' in navigator) {
            metrics.networkInfo = {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            };
        }

        // Log metrics (in production, you might want to send to analytics)
        if (process.env.NODE_ENV === 'development') {
            console.group('Performance Metrics');
            console.table(metrics);
            console.groupEnd();
        }

        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('performanceMetrics', { 
            detail: metrics 
        }));

        // You can send metrics to your analytics service here
        // sendToAnalytics(metrics);
    };

    const getPerformanceGrade = () => {
        const metrics = metricsRef.current;
        let score = 100;

        // Deduct points based on Core Web Vitals thresholds
        if (metrics.firstContentfulPaint > 1800) score -= 20;
        if (metrics.largestContentfulPaint > 2500) score -= 25;
        if (metrics.firstInputDelay > 100) score -= 25;
        if (metrics.cumulativeLayoutShift > 0.1) score -= 20;
        if (metrics.pageLoadTime > 3000) score -= 10;

        return Math.max(0, score);
    };

    // Expose performance data to window for debugging
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            window.getPerformanceMetrics = () => metricsRef.current;
            window.getPerformanceGrade = getPerformanceGrade;
        }
    }, []);

    // This component doesn't render anything visible
    return null;
};

export default PerformanceMonitor;