import React, { useMemo } from 'react';

// Enhanced chart component with multiple chart types
const SalesChart = ({ data, type = 'line', title, height = 300, metric = 'revenue', showTrendLine = false }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { points: [], maxValue: 0, labels: [], values: [], bars: [] };
    }

    const values = data.map(item => {
      switch (metric) {
        case 'revenue':
          return item.value || item.revenue || 0;
        case 'orders':
          return item.orders || 0;
        case 'sales':
          return item.sales || item.value || 0;
        default:
          return item.value || 0;
      }
    });
    
    const labels = data.map(item => item.label || item.date || item.hour || '');
    const maxValue = Math.max(...values, 1);

    // Calculate points for SVG path
    const points = values.map((value, index) => ({
      x: (index / (values.length - 1)) * 100,
      y: 100 - (value / maxValue) * 80 // 80% of height for chart, 20% for padding
    }));

    // Calculate bars for bar chart
    const bars = values.map((value, index) => ({
      x: (index / values.length) * 100,
      width: (100 / values.length) * 0.8, // 80% width with gaps
      height: (value / maxValue) * 80,
      y: 100 - (value / maxValue) * 80
    }));

    return { points, maxValue, labels, values, bars };
  }, [data, metric]);

  const createPath = (points) => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const createAreaPath = (points) => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} 100`; // Start from bottom
    path += ` L ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    path += ` L ${points[points.length - 1].x} 100 Z`; // Close path at bottom
    return path;
  };

  const formatValue = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  if (!data || data.length === 0) {
    return (
      <div className="sales-chart empty">
        <div className="chart-header">
          <h3>{title}</h3>
        </div>
        <div className="chart-empty">
          <i className="fas fa-chart-line"></i>
          <p>Ma'lumot mavjud emas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-chart">
      <div className="chart-header">
        <h3>{title}</h3>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color primary"></div>
            <span>Sotuvlar</span>
          </div>
        </div>
      </div>

      <div className="chart-container" style={{ height: `${height}px` }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="chart-svg"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Bar chart */}
          {type === 'bar' && chartData.bars.map((bar, index) => (
            <rect
              key={index}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill="var(--primary-color)"
              opacity="0.8"
              className="chart-bar"
            />
          ))}

          {/* Area fill */}
          {type === 'area' && (
            <path
              d={createAreaPath(chartData.points)}
              fill="url(#gradient)"
              opacity="0.3"
            />
          )}

          {/* Line */}
          {(type === 'line' || type === 'area') && (
            <path
              d={createPath(chartData.points)}
              fill="none"
              stroke="var(--primary-color)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-line"
            />
          )}

          {/* Trend line */}
          {showTrendLine && chartData.points.length > 1 && (
            <line
              x1={chartData.points[0].x}
              y1={chartData.points[0].y}
              x2={chartData.points[chartData.points.length - 1].x}
              y2={chartData.points[chartData.points.length - 1].y}
              stroke="rgba(255, 99, 132, 0.8)"
              strokeWidth="2"
              strokeDasharray="5,5"
              className="trend-line"
            />
          )}

          {/* Data points */}
          {(type === 'line' || type === 'area') && chartData.points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="var(--primary-color)"
              className="chart-point"
            />
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Tooltip overlay */}
        <div className="chart-overlay">
          {chartData.points.map((point, index) => (
            <div
              key={index}
              className="chart-tooltip-trigger"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                position: 'absolute',
                width: '20px',
                height: '20px',
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer'
              }}
              title={`${chartData.labels[index]}: ${formatValue(chartData.values[index])}`}
            />
          ))}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="chart-labels">
        {chartData.labels.map((label, index) => (
          <div
            key={index}
            className="chart-label"
            style={{
              left: `${(index / (chartData.labels.length - 1)) * 100}%`
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Y-axis values */}
      <div className="chart-y-axis">
        <div className="y-axis-label top">{formatValue(chartData.maxValue)}</div>
        <div className="y-axis-label middle">{formatValue(chartData.maxValue / 2)}</div>
        <div className="y-axis-label bottom">0</div>
      </div>
    </div>
  );
};

export default SalesChart;