import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(...registerables);

// Optimized chart component with performance enhancements
const OptimizedChart = ({ 
  type = 'line', 
  data, 
  options = {}, 
  width = 400, 
  height = 200,
  enableAnimation = true,
  enableTooltips = true,
  enableLegend = true,
  datasetLimit = 10,
  pointLimit = 100,
  updateThreshold = 50 // Minimum ms between updates
}) => {
  const chartRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Optimize data by limiting points and datasets
  const optimizedData = useMemo(() => {
    if (!data || !data.datasets) return data;

    const optimized = {
      ...data,
      datasets: data.datasets.slice(0, datasetLimit).map(dataset => ({
        ...dataset,
        data: dataset.data.slice(0, pointLimit)
      }))
    };

    // Limit labels as well
    if (data.labels && data.labels.length > pointLimit) {
      optimized.labels = data.labels.slice(0, pointLimit);
    }

    return optimized;
  }, [data, datasetLimit, pointLimit]);

  // Optimize chart options for performance
  const optimizedOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: enableLegend,
          position: 'top'
        },
        tooltip: {
          enabled: enableTooltips,
          mode: 'index',
          intersect: false,
          animation: {
            duration: enableAnimation ? 200 : 0
          }
        }
      },
      animation: {
        duration: enableAnimation ? 750 : 0,
        easing: 'easeInOutQuart'
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          },
          ticks: {
            maxTicksLimit: 10
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(0,0,0,0.1)'
          },
          ticks: {
            maxTicksLimit: 8
          }
        }
      },
      elements: {
        point: {
          radius: type === 'line' ? 2 : 0,
          hoverRadius: 4
        },
        line: {
          tension: 0.1,
          borderWidth: 2
        }
      }
    };

    return {
      ...baseOptions,
      ...options
    };
  }, [options, enableAnimation, enableTooltips, enableLegend, type]);

  // Throttled update function
  const throttledUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < updateThreshold) {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      if (chartRef.current) {
        chartRef.current.update('none'); // Update without animation for performance
      }
      lastUpdateRef.current = now;
    });
  }, [updateThreshold]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Render appropriate chart type
  const renderChart = () => {
    const commonProps = {
      ref: chartRef,
      data: optimizedData,
      options: optimizedOptions,
      width,
      height
    };

    switch (type) {
      case 'bar':
        return <Bar {...commonProps} />;
      case 'doughnut':
      case 'pie':
        return <Doughnut {...commonProps} />;
      case 'line':
      default:
        return <Line {...commonProps} />;
    }
  };

  return (
    <div className="optimized-chart-container" style={{ width, height }}>
      {renderChart()}
    </div>
  );
};

// Chart performance monitor
export const ChartPerformanceMonitor = ({ children }) => {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    updateCount: 0,
    memoryUsage: 0
  });

  const startTime = useRef(Date.now());

  useEffect(() => {
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;

    setMetrics(prev => ({
      ...prev,
      renderTime,
      updateCount: prev.updateCount + 1,
      memoryUsage: performance.memory ? 
        Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0
    }));
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('Chart Performance:', metrics);
  }

  return children;
};

// Data sampling utility for large datasets
export const sampleData = (data, maxPoints = 100, method = 'uniform') => {
  if (!data || data.length <= maxPoints) return data;

  switch (method) {
    case 'uniform':
      // Take every nth point
      const step = Math.ceil(data.length / maxPoints);
      return data.filter((_, index) => index % step === 0);
    
    case 'peak':
      // Keep peaks and valleys
      const peaks = [];
      for (let i = 1; i < data.length - 1; i++) {
        const prev = data[i - 1];
        const curr = data[i];
        const next = data[i + 1];
        
        if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
          peaks.push(data[i]);
        }
      }
      
      // If we have too many peaks, sample uniformly
      if (peaks.length > maxPoints) {
        const step = Math.ceil(peaks.length / maxPoints);
        return peaks.filter((_, index) => index % step === 0);
      }
      
      return peaks;
    
    case 'recent':
      // Keep most recent points
      return data.slice(-maxPoints);
    
    default:
      return data.slice(0, maxPoints);
  }
};

// Chart data aggregator for time series
export const aggregateTimeSeriesData = (data, interval = 'hour') => {
  if (!data || !Array.isArray(data)) return data;

  const aggregated = new Map();
  
  data.forEach(point => {
    const date = new Date(point.timestamp);
    let key;
    
    switch (interval) {
      case 'minute':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
        break;
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth()}`;
        break;
      default:
        key = point.timestamp;
    }
    
    if (!aggregated.has(key)) {
      aggregated.set(key, {
        timestamp: key,
        values: [],
        count: 0
      });
    }
    
    const bucket = aggregated.get(key);
    bucket.values.push(point.value);
    bucket.count++;
  });
  
  // Calculate aggregated values
  return Array.from(aggregated.values()).map(bucket => ({
    timestamp: bucket.timestamp,
    value: bucket.values.reduce((sum, val) => sum + val, 0) / bucket.count,
    count: bucket.count,
    min: Math.min(...bucket.values),
    max: Math.max(...bucket.values)
  }));
};

// Chart color palette generator
export const generateChartColors = (count, opacity = 1) => {
  const colors = [
    `rgba(99, 102, 241, ${opacity})`,   // Indigo
    `rgba(34, 197, 94, ${opacity})`,   // Green
    `rgba(239, 68, 68, ${opacity})`,   // Red
    `rgba(245, 158, 11, ${opacity})`,  // Amber
    `rgba(168, 85, 247, ${opacity})`,  // Purple
    `rgba(6, 182, 212, ${opacity})`,   // Cyan
    `rgba(236, 72, 153, ${opacity})`,  // Pink
    `rgba(132, 204, 22, ${opacity})`,  // Lime
    `rgba(249, 115, 22, ${opacity})`,  // Orange
    `rgba(107, 114, 128, ${opacity})`  // Gray
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  
  return result;
};

// Chart theme provider
export const ChartThemeProvider = ({ theme = 'light', children }) => {
  const chartTheme = useMemo(() => {
    const themes = {
      light: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        textColor: 'rgba(0, 0, 0, 0.8)',
        gridColor: 'rgba(0, 0, 0, 0.1)'
      },
      dark: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textColor: 'rgba(255, 255, 255, 0.8)',
        gridColor: 'rgba(255, 255, 255, 0.1)'
      }
    };
    
    return themes[theme] || themes.light;
  }, [theme]);

  // Apply theme to Chart.js defaults
  useEffect(() => {
    ChartJS.defaults.color = chartTheme.textColor;
    ChartJS.defaults.borderColor = chartTheme.borderColor;
    ChartJS.defaults.backgroundColor = chartTheme.backgroundColor;
  }, [chartTheme]);

  return children;
};

export default OptimizedChart;