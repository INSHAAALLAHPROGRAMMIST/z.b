// Performance Monitoring Utility
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    // Web Vitals monitoring
    this.observeWebVitals();
    
    // Resource timing
    this.observeResourceTiming();
    
    // Navigation timing
    this.observeNavigationTiming();
    
    // Long tasks
    this.observeLongTasks();
  }

  observeWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entry) => {
      this.metrics.lcp = entry.startTime;
      this.reportMetric('LCP', entry.startTime);
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entry) => {
      this.metrics.fid = entry.processingStart - entry.startTime;
      this.reportMetric('FID', this.metrics.fid);
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observeMetric('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        this.metrics.cls = clsValue;
        this.reportMetric('CLS', clsValue);
      }
    });
  }

  observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.initiatorType === 'img') {
            this.trackImageLoad(entry);
          } else if (entry.initiatorType === 'script') {
            this.trackScriptLoad(entry);
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    }
  }

  observeNavigationTiming() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        this.metrics.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
        this.metrics.ttfb = navigation.responseStart - navigation.requestStart;
        
        this.reportMetric('DOM Content Loaded', this.metrics.domContentLoaded);
        this.reportMetric('Load Complete', this.metrics.loadComplete);
        this.reportMetric('TTFB', this.metrics.ttfb);
      }
    });
  }

  observeLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            this.reportMetric('Long Task', entry.duration);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.push(observer);
      } catch (e) {
        // Long task API not supported
      }
    }
  }

  observeMetric(type, callback) {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      
      try {
        observer.observe({ entryTypes: [type] });
        this.observers.push(observer);
      } catch (e) {
        console.warn(`Performance observer for ${type} not supported`);
      }
    }
  }

  trackImageLoad(entry) {
    const loadTime = entry.responseEnd - entry.startTime;
    if (loadTime > 1000) { // 1 second threshold
      this.reportMetric('Slow Image Load', loadTime, { url: entry.name });
    }
  }

  trackScriptLoad(entry) {
    const loadTime = entry.responseEnd - entry.startTime;
    if (loadTime > 500) { // 500ms threshold
      this.reportMetric('Slow Script Load', loadTime, { url: entry.name });
    }
  }

  reportMetric(name, value, extra = {}) {
    // Console logging for development
    if (import.meta.env.DEV) {
      console.log(`📊 Performance: ${name} = ${Math.round(value)}ms`, extra);
    }

    // Send to analytics in production
    if (import.meta.env.PROD && window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: Math.round(value),
        ...extra
      });
    }

    // Store for later analysis
    if (!this.metrics.custom) this.metrics.custom = [];
    this.metrics.custom.push({
      name,
      value: Math.round(value),
      timestamp: Date.now(),
      ...extra
    });
  }

  getMetrics() {
    return { ...this.metrics };
  }

  // Performance budget checking
  checkBudgets() {
    const budgets = {
      lcp: 2500, // 2.5s
      fid: 100,  // 100ms
      cls: 0.1,  // 0.1
      ttfb: 600  // 600ms
    };

    const violations = [];
    
    Object.entries(budgets).forEach(([metric, budget]) => {
      if (this.metrics[metric] && this.metrics[metric] > budget) {
        violations.push({
          metric,
          value: this.metrics[metric],
          budget,
          violation: this.metrics[metric] - budget
        });
      }
    });

    if (violations.length > 0) {
      console.warn('⚠️ Performance budget violations:', violations);
    }

    return violations;
  }

  // Cleanup
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = React.useState({});

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 5000); // Update every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    metrics,
    checkBudgets: () => performanceMonitor.checkBudgets(),
    reportCustomMetric: (name, value, extra) => performanceMonitor.reportMetric(name, value, extra)
  };
};

export default performanceMonitor;