import React, { useState } from 'react';

const InteractiveStatsCard = ({ 
  title, 
  value, 
  icon, 
  color = 'primary',
  trend = null,
  badge = null,
  onClick = null,
  loading = false,
  error = null,
  subtitle = null,
  formatter = null
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatValue = (val) => {
    if (formatter && typeof formatter === 'function') {
      return formatter(val);
    }
    
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    
    return val;
  };

  const getColorClasses = (colorType) => {
    const colors = {
      primary: {
        bg: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.2)',
        icon: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        text: '#3b82f6',
        accent: '#3b82f6'
      },
      success: {
        bg: 'rgba(34, 197, 94, 0.1)',
        border: 'rgba(34, 197, 94, 0.2)',
        icon: 'linear-gradient(135deg, #22c55e, #16a34a)',
        text: '#22c55e',
        accent: '#22c55e'
      },
      warning: {
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.2)',
        icon: 'linear-gradient(135deg, #f59e0b, #d97706)',
        text: '#f59e0b',
        accent: '#f59e0b'
      },
      danger: {
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.2)',
        icon: 'linear-gradient(135deg, #ef4444, #dc2626)',
        text: '#ef4444',
        accent: '#ef4444'
      },
      info: {
        bg: 'rgba(6, 182, 212, 0.1)',
        border: 'rgba(6, 182, 212, 0.2)',
        icon: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        text: '#06b6d4',
        accent: '#06b6d4'
      },
      purple: {
        bg: 'rgba(168, 85, 247, 0.1)',
        border: 'rgba(168, 85, 247, 0.2)',
        icon: 'linear-gradient(135deg, #a855f7, #7c3aed)',
        text: '#a855f7',
        accent: '#a855f7'
      }
    };
    return colors[colorType] || colors.primary;
  };

  const colorScheme = getColorClasses(color);

  if (loading) {
    return (
      <div className="interactive-stats-card loading">
        <div className="stats-card-skeleton">
          <div className="skeleton-icon"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-value"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="interactive-stats-card error">
        <div className="stats-card-error">
          <i className="fas fa-exclamation-triangle"></i>
          <span>Ma'lumot yuklanmadi</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`interactive-stats-card ${color} ${onClick ? 'clickable' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: colorScheme.bg,
        border: `1px solid ${colorScheme.border}`,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {/* Top accent line */}
      <div 
        className="stats-card-accent"
        style={{
          background: `linear-gradient(90deg, ${colorScheme.accent}, ${colorScheme.accent}80)`,
          opacity: isHovered ? 1 : 0
        }}
      ></div>

      {/* Badge */}
      {badge && (
        <div 
          className={`stats-card-badge ${badge.type || 'info'}`}
          style={{
            background: `${colorScheme.accent}20`,
            color: colorScheme.accent,
            border: `1px solid ${colorScheme.accent}30`
          }}
        >
          {badge.text}
        </div>
      )}

      <div className="stats-card-content">
        {/* Icon */}
        <div 
          className="stats-card-icon"
          style={{
            background: colorScheme.icon
          }}
        >
          <i className={icon}></i>
        </div>

        {/* Content */}
        <div className="stats-card-info">
          <div className="stats-card-header">
            <h3 className="stats-card-title">{title}</h3>
            {onClick && (
              <div className="stats-card-arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            )}
          </div>
          
          <div 
            className="stats-card-value"
            style={{ color: colorScheme.text }}
          >
            {formatValue(value)}
          </div>

          {subtitle && (
            <div className="stats-card-subtitle">
              {subtitle}
            </div>
          )}

          {/* Trend indicator */}
          {trend && (
            <div className={`stats-card-trend ${trend.direction}`}>
              <i className={`fas fa-arrow-${trend.direction === 'up' ? 'up' : 'down'}`}></i>
              <span>{trend.value}</span>
              <span className="trend-period">{trend.period}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover effect overlay */}
      <div 
        className="stats-card-overlay"
        style={{
          background: `${colorScheme.accent}05`,
          opacity: isHovered ? 1 : 0
        }}
      ></div>
    </div>
  );
};

export default InteractiveStatsCard;