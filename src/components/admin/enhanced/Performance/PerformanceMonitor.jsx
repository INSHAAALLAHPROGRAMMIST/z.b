import React, { useState, useEffect, useRef } from 'react';

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    bundleSize: 0,
    networkRequests: 0,
    cacheHitRate: 0
  });
  const [performanceEntries, setPerformanceEntries] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    measureInitialMetrics();
    
    if (isMonitoring) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [isMonitoring]);

  const measureInitialMetrics = () => {
    // Measure page load time
    const navigation = performance.getEntriesByType('navigation')[0];
    const loadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;

    // Measure memory usage (if available)
    const memoryUsage = performance.memory ? 
      Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;

    // Get resource entries
    const resources = performance.getEntriesByType('resource');
    const networkRequests = resources.length;

    // Calculate bundle size estimation
    const bundleSize = resources
      .filter(resource => resource.name.includes('.js') || resource.name.includes('.css'))
      .reduce((total, resource) => total + (resource.transferSize || 0), 0);

    setMetrics(prev => ({
      ...prev,
      loadTime: Math.round(loadTime),
      memoryUsage,
      networkRequests,
      bundleSize: Math.round(bundleSize / 1024) // KB
    }));

    setPerformanceEntries(resources.slice(-10)); // Last 10 entries
  };

  const startMonitoring = () => {
    intervalRef.current = setInterval(() => {
      measureRealTimeMetrics();
    }, 1000);
  };

  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const measureRealTimeMetrics = () => {
    const startTime = performance.now();
    
    // Simulate render time measurement
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      
      setMetrics(prev => ({
        ...prev,
        renderTime: Math.round(renderTime * 100) / 100
      }));
    });

    // Update memory usage if available
    if (performance.memory) {
      const memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      setMetrics(prev => ({
        ...prev,
        memoryUsage
      }));
    }
  };

  const clearPerformanceData = () => {
    performance.clearResourceTimings();
    performance.clearMeasures();
    performance.clearMarks();
    measureInitialMetrics();
  };

  const exportPerformanceData = () => {
    const data = {
      metrics,
      performanceEntries: performanceEntries.map(entry => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: entry.transferSize,
        type: entry.initiatorType
      })),
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMetricColor = (metric, value) => {
    switch (metric) {
      case 'loadTime':
        return value < 1000 ? 'text-green-600' : value < 3000 ? 'text-yellow-600' : 'text-red-600';
      case 'renderTime':
        return value < 16 ? 'text-green-600' : value < 33 ? 'text-yellow-600' : 'text-red-600';
      case 'memoryUsage':
        return value < 50 ? 'text-green-600' : value < 100 ? 'text-yellow-600' : 'text-red-600';
      case 'bundleSize':
        return value < 500 ? 'text-green-600' : value < 1000 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getPerformanceScore = () => {
    let score = 100;
    
    if (metrics.loadTime > 3000) score -= 20;
    else if (metrics.loadTime > 1000) score -= 10;
    
    if (metrics.renderTime > 33) score -= 15;
    else if (metrics.renderTime > 16) score -= 8;
    
    if (metrics.memoryUsage > 100) score -= 20;
    else if (metrics.memoryUsage > 50) score -= 10;
    
    if (metrics.bundleSize > 1000) score -= 15;
    else if (metrics.bundleSize > 500) score -= 8;
    
    return Math.max(0, score);
  };

  const performanceScore = getPerformanceScore();

  return (
    <div className="performance-monitor">
      <div className="performance-header">
        <h2>Performance Monitor</h2>
        <p>Real-time application performance metrics and optimization insights</p>
        
        <div className="monitor-controls">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`monitor-toggle ${isMonitoring ? 'active' : ''}`}
          >
            {isMonitoring ? '⏸️ Stop Monitoring' : '▶️ Start Monitoring'}
          </button>
          <button onClick={clearPerformanceData} className="btn-clear">
            🗑️ Clear Data
          </button>
          <button onClick={exportPerformanceData} className="btn-export">
            📊 Export Report
          </button>
        </div>
      </div>

      {/* Performance Score */}
      <div className="performance-score">
        <div className="score-circle">
          <div className="score-value">{performanceScore}</div>
          <div className="score-label">Performance Score</div>
        </div>
        <div className="score-description">
          <h4>Overall Performance</h4>
          <p>
            {performanceScore >= 90 && "Excellent performance! Your application is running optimally."}
            {performanceScore >= 70 && performanceScore < 90 && "Good performance with room for improvement."}
            {performanceScore >= 50 && performanceScore < 70 && "Average performance. Consider optimization."}
            {performanceScore < 50 && "Poor performance. Immediate optimization needed."}
          </p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="performance-metrics">
        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h4>Load Time</h4>
            <span className={`metric-value ${getMetricColor('loadTime', metrics.loadTime)}`}>
              {metrics.loadTime}ms
            </span>
            <span className="metric-label">Page load duration</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎨</div>
          <div className="metric-content">
            <h4>Render Time</h4>
            <span className={`metric-value ${getMetricColor('renderTime', metrics.renderTime)}`}>
              {metrics.renderTime}ms
            </span>
            <span className="metric-label">Component render time</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🧠</div>
          <div className="metric-content">
            <h4>Memory Usage</h4>
            <span className={`metric-value ${getMetricColor('memoryUsage', metrics.memoryUsage)}`}>
              {metrics.memoryUsage}MB
            </span>
            <span className="metric-label">JavaScript heap size</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <h4>Bundle Size</h4>
            <span className={`metric-value ${getMetricColor('bundleSize', metrics.bundleSize)}`}>
              {metrics.bundleSize}KB
            </span>
            <span className="metric-label">Total bundle size</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🌐</div>
          <div className="metric-content">
            <h4>Network Requests</h4>
            <span className="metric-value text-blue-600">
              {metrics.networkRequests}
            </span>
            <span className="metric-label">Total requests made</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💾</div>
          <div className="metric-content">
            <h4>Cache Hit Rate</h4>
            <span className="metric-value text-green-600">
              {metrics.cacheHitRate}%
            </span>
            <span className="metric-label">Resource cache efficiency</span>
          </div>
        </div>
      </div>

      {/* Performance Entries */}
      <div className="performance-entries">
        <h3>Recent Resource Loading</h3>
        <div className="entries-table">
          <table>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Size</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {performanceEntries.map((entry, index) => (
                <tr key={index}>
                  <td>
                    <div className="resource-name">
                      {entry.name.split('/').pop() || entry.name}
                    </div>
                  </td>
                  <td>
                    <span className={`resource-type ${entry.initiatorType}`}>
                      {entry.initiatorType || 'other'}
                    </span>
                  </td>
                  <td>
                    <span className={`duration ${entry.duration > 1000 ? 'slow' : entry.duration > 500 ? 'medium' : 'fast'}`}>
                      {Math.round(entry.duration)}ms
                    </span>
                  </td>
                  <td>
                    {entry.transferSize ? `${Math.round(entry.transferSize / 1024)}KB` : 'N/A'}
                  </td>
                  <td>
                    <span className={`status ${entry.duration < 1000 ? 'success' : 'warning'}`}>
                      {entry.duration < 1000 ? 'Fast' : 'Slow'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="performance-recommendations">
        <h3>🚀 Performance Recommendations</h3>
        <div className="recommendations-list">
          {metrics.loadTime > 3000 && (
            <div className="recommendation warning">
              <div className="rec-icon">⚠️</div>
              <div className="rec-content">
                <h4>Slow Page Load</h4>
                <p>Page load time is over 3 seconds. Consider implementing code splitting and lazy loading.</p>
              </div>
            </div>
          )}
          
          {metrics.renderTime > 33 && (
            <div className="recommendation warning">
              <div className="rec-icon">🎨</div>
              <div className="rec-content">
                <h4>Slow Rendering</h4>
                <p>Component render time exceeds 33ms. Optimize component re-renders and use React.memo.</p>
              </div>
            </div>
          )}
          
          {metrics.memoryUsage > 100 && (
            <div className="recommendation error">
              <div className="rec-icon">🧠</div>
              <div className="rec-content">
                <h4>High Memory Usage</h4>
                <p>Memory usage is over 100MB. Check for memory leaks and optimize data structures.</p>
              </div>
            </div>
          )}
          
          {metrics.bundleSize > 1000 && (
            <div className="recommendation warning">
              <div className="rec-icon">📦</div>
              <div className="rec-content">
                <h4>Large Bundle Size</h4>
                <p>Bundle size exceeds 1MB. Implement code splitting and remove unused dependencies.</p>
              </div>
            </div>
          )}
          
          {performanceScore >= 90 && (
            <div className="recommendation success">
              <div className="rec-icon">✅</div>
              <div className="rec-content">
                <h4>Excellent Performance</h4>
                <p>Your application is performing optimally. Keep up the good work!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;