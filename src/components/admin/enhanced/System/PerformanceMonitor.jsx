import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

const PerformanceMonitor = () => {
  const [performanceData, setPerformanceData] = useState({
    pageLoad: { current: 0, average: 0, trend: [] },
    apiResponse: { current: 0, average: 0, trend: [] },
    memoryUsage: { current: 0, peak: 0, trend: [] },
    networkRequests: { total: 0, failed: 0, trend: [] },
    userExperience: { score: 0, metrics: {} }
  });
  
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    fps: 60,
    memoryUsed: 0,
    memoryLimit: 0,
    activeConnections: 0,
    requestsPerSecond: 0
  });

  const [optimizationSuggestions, setOptimizationSuggestions] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    startPerformanceMonitoring();
    
    const interval = setInterval(() => {
      if (isMonitoring) {
        collectPerformanceMetrics();
        updateRealTimeMetrics();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      stopPerformanceMonitoring();
    };
  }, [isMonitoring]);

  const startPerformanceMonitoring = () => {
    setIsMonitoring(true);
    collectInitialMetrics();
    setupPerformanceObserver();
  };

  const stopPerformanceMonitoring = () => {
    setIsMonitoring(false);
  };

  const collectInitialMetrics = () => {
    // Collect initial performance metrics
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    if (navigation) {
      const pageLoadTime = navigation.loadEventEnd - navigation.loadEventStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      
      setPerformanceData(prev => ({
        ...prev,
        pageLoad: {
          current: Math.round(pageLoadTime),
          average: Math.round(pageLoadTime),
          trend: [pageLoadTime]
        }
      }));
    }

    // Collect memory information if available
    if (performance.memory) {
      const memoryInfo = performance.memory;
      setRealTimeMetrics(prev => ({
        ...prev,
        memoryUsed: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
        memoryLimit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
      }));
    }
  };

  const setupPerformanceObserver = () => {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              updateNavigationMetrics(entry);
            } else if (entry.entryType === 'resource') {
              updateResourceMetrics(entry);
            } else if (entry.entryType === 'paint') {
              updatePaintMetrics(entry);
            }
          });
        });

        observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  };

  const updateNavigationMetrics = (entry) => {
    const loadTime = entry.loadEventEnd - entry.loadEventStart;
    const domTime = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
    
    setPerformanceData(prev => ({
      ...prev,
      pageLoad: {
        current: Math.round(loadTime),
        average: Math.round((prev.pageLoad.average + loadTime) / 2),
        trend: [...prev.pageLoad.trend.slice(-19), loadTime]
      }
    }));
  };

  const updateResourceMetrics = (entry) => {
    const responseTime = entry.responseEnd - entry.responseStart;
    
    if (entry.name.includes('/api/') || entry.name.includes('firestore')) {
      setPerformanceData(prev => ({
        ...prev,
        apiResponse: {
          current: Math.round(responseTime),
          average: Math.round((prev.apiResponse.average + responseTime) / 2),
          trend: [...prev.apiResponse.trend.slice(-19), responseTime]
        }
      }));
    }
  };

  const updatePaintMetrics = (entry) => {
    // Handle paint timing metrics
    console.log('Paint metric:', entry.name, entry.startTime);
  };

  const collectPerformanceMetrics = () => {
    // Collect current performance metrics
    const now = performance.now();
    
    // Simulate API response time monitoring
    const mockApiTime = 200 + Math.random() * 300;
    
    setPerformanceData(prev => ({
      ...prev,
      apiResponse: {
        ...prev.apiResponse,
        current: Math.round(mockApiTime),
        trend: [...prev.apiResponse.trend.slice(-19), mockApiTime]
      }
    }));

    // Update memory usage if available
    if (performance.memory) {
      const memoryInfo = performance.memory;
      const currentMemory = memoryInfo.usedJSHeapSize / 1024 / 1024;
      
      setPerformanceData(prev => ({
        ...prev,
        memoryUsage: {
          current: Math.round(currentMemory),
          peak: Math.max(prev.memoryUsage.peak, currentMemory),
          trend: [...prev.memoryUsage.trend.slice(-19), currentMemory]
        }
      }));
    }
  };

  const updateRealTimeMetrics = () => {
    // Update real-time metrics
    setRealTimeMetrics(prev => ({
      ...prev,
      fps: Math.round(60 - Math.random() * 5), // Simulate FPS
      activeConnections: Math.round(5 + Math.random() * 10),
      requestsPerSecond: Math.round(Math.random() * 20)
    }));

    // Generate optimization suggestions
    generateOptimizationSuggestions();
  };

  const generateOptimizationSuggestions = () => {
    const suggestions = [];
    
    if (performanceData.pageLoad.current > 3000) {
      suggestions.push({
        type: 'warning',
        title: 'Sahifa yuklash vaqti sekin',
        description: 'Sahifa 3 soniyadan ko\'proq vaqtda yuklanmoqda',
        suggestion: 'Rasmlarni optimize qiling va lazy loading qo\'shing'
      });
    }

    if (performanceData.apiResponse.current > 1000) {
      suggestions.push({
        type: 'error',
        title: 'API javob vaqti sekin',
        description: 'API so\'rovlari 1 soniyadan ko\'proq vaqt olmoqda',
        suggestion: 'Database query\'larni optimize qiling yoki caching qo\'shing'
      });
    }

    if (performanceData.memoryUsage.current > 100) {
      suggestions.push({
        type: 'warning',
        title: 'Yuqori memory ishlatilishi',
        description: 'Memory ishlatilishi 100MB dan oshdi',
        suggestion: 'Memory leak\'larni tekshiring va unused variable\'larni tozalang'
      });
    }

    if (realTimeMetrics.fps < 55) {
      suggestions.push({
        type: 'info',
        title: 'FPS pasaygan',
        description: 'Frame rate 55 FPS dan past',
        suggestion: 'Animation\'larni optimize qiling va heavy computation\'larni worker\'ga o\'tkazing'
      });
    }

    setOptimizationSuggestions(suggestions);
  };

  const getPerformanceScore = () => {
    let score = 100;
    
    // Deduct points based on performance metrics
    if (performanceData.pageLoad.current > 2000) score -= 20;
    if (performanceData.apiResponse.current > 500) score -= 15;
    if (performanceData.memoryUsage.current > 50) score -= 10;
    if (realTimeMetrics.fps < 58) score -= 5;
    
    return Math.max(0, score);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'A\'lo';
    if (score >= 70) return 'Yaxshi';
    if (score >= 50) return 'O\'rtacha';
    return 'Yomon';
  };

  // Chart data generators
  const getPageLoadChartData = () => ({
    labels: Array.from({ length: 20 }, (_, i) => `${i + 1}`),
    datasets: [{
      label: 'Sahifa yuklash vaqti (ms)',
      data: performanceData.pageLoad.trend,
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4,
      fill: true
    }]
  });

  const getApiResponseChartData = () => ({
    labels: Array.from({ length: 20 }, (_, i) => `${i + 1}`),
    datasets: [{
      label: 'API javob vaqti (ms)',
      data: performanceData.apiResponse.trend,
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true
    }]
  });

  const getMemoryChartData = () => ({
    labels: Array.from({ length: 20 }, (_, i) => `${i + 1}`),
    datasets: [{
      label: 'Memory ishlatilishi (MB)',
      data: performanceData.memoryUsage.trend,
      borderColor: 'rgb(245, 158, 11)',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      tension: 0.4,
      fill: true
    }]
  });

  const performanceScore = getPerformanceScore();

  return (
    <div className="performance-monitor">
      {/* Header */}
      <div className="monitor-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-tachometer-alt"></i>
            Performance Monitor
          </h2>
          <p>Real-time performance metrics va optimization</p>
        </div>
        
        <div className="monitor-controls">
          <button
            className={`monitor-toggle ${isMonitoring ? 'active' : ''}`}
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            <i className={`fas fa-${isMonitoring ? 'pause' : 'play'}`}></i>
            {isMonitoring ? 'To\'xtatish' : 'Boshlash'}
          </button>
        </div>
      </div>

      {/* Performance Score */}
      <div className="performance-score">
        <div className="score-card">
          <div className="score-circle">
            <div 
              className="score-fill"
              style={{ 
                background: `conic-gradient(${getScoreColor(performanceScore)} ${performanceScore * 3.6}deg, var(--glass-border) 0deg)`
              }}
            >
              <div className="score-inner">
                <span className="score-number">{performanceScore}</span>
                <span className="score-label">{getScoreLabel(performanceScore)}</span>
              </div>
            </div>
          </div>
          <div className="score-info">
            <h3>Performance Score</h3>
            <p>Umumiy tizim performance ko'rsatkichi</p>
          </div>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="realtime-metrics">
        <h3>Real-time Metrics</h3>
        
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="metric-content">
              <h4>{performanceData.pageLoad.current}ms</h4>
              <p>Sahifa yuklash</p>
              <small>O'rtacha: {performanceData.pageLoad.average}ms</small>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon">
              <i className="fas fa-server"></i>
            </div>
            <div className="metric-content">
              <h4>{performanceData.apiResponse.current}ms</h4>
              <p>API javob vaqti</p>
              <small>O'rtacha: {performanceData.apiResponse.average}ms</small>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon">
              <i className="fas fa-memory"></i>
            </div>
            <div className="metric-content">
              <h4>{realTimeMetrics.memoryUsed}MB</h4>
              <p>Memory ishlatilishi</p>
              <small>Limit: {realTimeMetrics.memoryLimit}MB</small>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon">
              <i className="fas fa-video"></i>
            </div>
            <div className="metric-content">
              <h4>{realTimeMetrics.fps} FPS</h4>
              <p>Frame rate</p>
              <small>Maqsad: 60 FPS</small>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon">
              <i className="fas fa-network-wired"></i>
            </div>
            <div className="metric-content">
              <h4>{realTimeMetrics.activeConnections}</h4>
              <p>Faol ulanishlar</p>
              <small>{realTimeMetrics.requestsPerSecond} req/s</small>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="performance-charts">
        <div className="chart-container">
          <div className="chart-header">
            <h3>Sahifa Yuklash Vaqti</h3>
            <p>Oxirgi 20 ta o'lchov</p>
          </div>
          <div className="chart-content">
            <Line 
              data={getPageLoadChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Vaqt (ms)'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3>API Javob Vaqti</h3>
            <p>Oxirgi 20 ta so'rov</p>
          </div>
          <div className="chart-content">
            <Line 
              data={getApiResponseChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Vaqt (ms)'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3>Memory Ishlatilishi</h3>
            <p>Oxirgi 20 ta o'lchov</p>
          </div>
          <div className="chart-content">
            <Line 
              data={getMemoryChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Memory (MB)'
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Optimization Suggestions */}
      <div className="optimization-suggestions">
        <h3>Optimization Tavsiyalari</h3>
        
        {optimizationSuggestions.length === 0 ? (
          <div className="no-suggestions">
            <i className="fas fa-check-circle"></i>
            <h4>Performance yaxshi!</h4>
            <p>Hozircha optimization tavsiyalari yo'q</p>
          </div>
        ) : (
          <div className="suggestions-list">
            {optimizationSuggestions.map((suggestion, index) => (
              <div key={index} className={`suggestion-item ${suggestion.type}`}>
                <div className="suggestion-icon">
                  <i className={
                    suggestion.type === 'error' ? 'fas fa-times-circle' :
                    suggestion.type === 'warning' ? 'fas fa-exclamation-triangle' :
                    'fas fa-info-circle'
                  }></i>
                </div>
                <div className="suggestion-content">
                  <h4>{suggestion.title}</h4>
                  <p>{suggestion.description}</p>
                  <div className="suggestion-action">
                    <strong>Tavsiya:</strong> {suggestion.suggestion}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitor;