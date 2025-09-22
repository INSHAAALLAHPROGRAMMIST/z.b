import { useEffect } from 'react';

// Performance monitoring hook
const usePerformanceMonitoring = () => {
  useEffect(() => {
    const measurePageLoad = () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        
        // Analytics ga yuborish
        if (window.gtag) {
          window.gtag('event', 'page_load_time', {
            custom_parameter: window.location.pathname,
            value: Math.round(loadTime),
            Time: loadTime
          });
        }
        
        console.log('Sahifa yuklash vaqti:', loadTime, 'ms');
      }
    };

    if (document.readyState === 'complete') {
      measurePageLoad();
    } else {
      window.addEventListener('load', measurePageLoad);
    }

    return () => {
      window.removeEventListener('load', measurePageLoad);
    };
  }, []);
};

export default usePerformanceMonitoring;