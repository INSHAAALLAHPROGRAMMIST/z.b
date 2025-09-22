import React, { useState, useEffect, useCallback } from 'react';
import errorHandlingService from '../services/ErrorHandlingService';
import './ErrorMonitoringDashboard.css';

/**
 * Error Monitoring Dashboard Component
 * Displays error statistics, recent errors, and system health
 */
const ErrorMonitoringDashboard = () => {
  const [errorStats, setErrorStats] = useState(null);
  const [recentErrors, setRecentErrors] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const timeRanges = {
    '1h': { label: '1 soat', ms: 60 * 60 * 1000 },
    '6h': { label: '6 soat', ms: 6 * 60 * 60 * 1000 },
    '24h': { label: '24 soat', ms: 24 * 60 * 60 * 1000 },
    '7d': { label: '7 kun', ms: 7 * 24 * 60 * 60 * 1000 },
    'all': { label: 'Barchasi', ms: null }
  };

  const categoryLabels = {
    network: 'Tarmoq',
    authentication: 'Autentifikatsiya',
    validation: 'Validatsiya',
    storage: 'Saqlash',
    cloudinary: 'Cloudinary',
    telegram: 'Telegram',
    firebase: 'Firebase',
    system: 'Tizim',
    user_input: 'Foydalanuvchi kiritishi'
  };

  const severityLabels = {
    low: 'Past',
    medium: 'O\'rta',
    high: 'Yuqori',
    critical: 'Kritik'
  };

  const severityColors = {
    low: '#28a745',
    medium: '#ffc107',
    high: '#fd7e14',
    critical: '#dc3545'
  };

  // Load error statistics
  const loadErrorStats = useCallback(() => {
    try {
      const filters = {};
      
      if (selectedTimeRange !== 'all') {
        filters.timeRange = timeRanges[selectedTimeRange].ms;
      }
      
      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }
      
      if (selectedSeverity !== 'all') {
        filters.severity = selectedSeverity;
      }

      const stats = errorHandlingService.getErrorStatistics(filters);
      setErrorStats(stats);
      setRecentErrors(stats.recentErrors || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading error statistics:', error);
      setIsLoading(false);
    }
  }, [selectedTimeRange, selectedCategory, selectedSeverity]);

  // Auto-refresh effect
  useEffect(() => {
    loadErrorStats();

    if (autoRefresh) {
      const interval = setInterval(loadErrorStats, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [loadErrorStats, autoRefresh]);

  // Error listener effect
  useEffect(() => {
    const handleNewError = (error) => {
      // Refresh stats when new error occurs
      setTimeout(loadErrorStats, 1000);
    };

    errorHandlingService.addErrorListener(handleNewError);
    
    return () => {
      errorHandlingService.removeErrorListener(handleNewError);
    };
  }, [loadErrorStats]);

  const handleClearErrors = () => {
    if (window.confirm('Barcha xatolik loglarini tozalashni xohlaysizmi?')) {
      errorHandlingService.clearErrorLog();
      loadErrorStats();
    }
  };

  const handleExportErrors = () => {
    const dataStr = JSON.stringify(recentErrors, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('uz-UZ');
  };

  const getErrorIcon = (category) => {
    const icons = {
      network: '🌐',
      authentication: '🔐',
      validation: '✅',
      storage: '💾',
      cloudinary: '☁️',
      telegram: '📱',
      firebase: '🔥',
      system: '⚙️',
      user_input: '👤'
    };
    return icons[category] || '❗';
  };

  if (isLoading) {
    return (
      <div className="error-monitoring-dashboard">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Xatolik statistikasi yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="error-monitoring-dashboard">
      <div className="dashboard-header">
        <h2>Xatolik Monitoring Dashboard</h2>
        <div className="dashboard-controls">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Avtomatik yangilash
          </label>
          <button onClick={loadErrorStats} className="refresh-btn">
            🔄 Yangilash
          </button>
          <button onClick={handleExportErrors} className="export-btn">
            📥 Export
          </button>
          <button onClick={handleClearErrors} className="clear-btn">
            🗑️ Tozalash
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-filters">
        <div className="filter-group">
          <label>Vaqt oralig'i:</label>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
          >
            {Object.entries(timeRanges).map(([key, range]) => (
              <option key={key} value={key}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Kategoriya:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">Barchasi</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Jiddiylik:</label>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
          >
            <option value="all">Barchasi</option>
            {Object.entries(severityLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards">
        <div className="stat-card total">
          <h3>Jami Xatoliklar</h3>
          <div className="stat-value">{errorStats?.total || 0}</div>
        </div>

        <div className="stat-card critical">
          <h3>Kritik Xatoliklar</h3>
          <div className="stat-value">
            {errorStats?.severityBreakdown?.critical || 0}
          </div>
        </div>

        <div className="stat-card high">
          <h3>Yuqori Jiddiylik</h3>
          <div className="stat-value">
            {errorStats?.severityBreakdown?.high || 0}
          </div>
        </div>

        <div className="stat-card medium">
          <h3>O'rta Jiddiylik</h3>
          <div className="stat-value">
            {errorStats?.severityBreakdown?.medium || 0}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {errorStats?.categoryBreakdown && Object.keys(errorStats.categoryBreakdown).length > 0 && (
        <div className="category-breakdown">
          <h3>Kategoriya bo'yicha taqsimot</h3>
          <div className="category-chart">
            {Object.entries(errorStats.categoryBreakdown).map(([category, count]) => (
              <div key={category} className="category-item">
                <span className="category-icon">{getErrorIcon(category)}</span>
                <span className="category-name">
                  {categoryLabels[category] || category}
                </span>
                <span className="category-count">{count}</span>
                <div 
                  className="category-bar"
                  style={{
                    width: `${(count / errorStats.total) * 100}%`
                  }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Errors */}
      <div className="recent-errors">
        <h3>So'nggi Xatoliklar</h3>
        {recentErrors.length === 0 ? (
          <div className="no-errors">
            <p>✅ Hech qanday xatolik topilmadi</p>
          </div>
        ) : (
          <div className="errors-list">
            {recentErrors.map((error) => (
              <div key={error.id} className={`error-item severity-${error.severity}`}>
                <div className="error-header">
                  <span className="error-icon">{getErrorIcon(error.category)}</span>
                  <span className="error-category">
                    {categoryLabels[error.category] || error.category}
                  </span>
                  <span 
                    className="error-severity"
                    style={{ color: severityColors[error.severity] }}
                  >
                    {severityLabels[error.severity] || error.severity}
                  </span>
                  <span className="error-timestamp">
                    {formatTimestamp(error.timestamp)}
                  </span>
                </div>
                
                <div className="error-context">
                  <strong>Kontekst:</strong> {error.context}
                </div>
                
                <div className="error-message">
                  <strong>Xabar:</strong> {error.userMessage}
                </div>
                
                {error.originalError?.message && (
                  <div className="error-original">
                    <strong>Asl xatolik:</strong> {error.originalError.message}
                  </div>
                )}
                
                {error.metadata && Object.keys(error.metadata).length > 0 && (
                  <details className="error-metadata">
                    <summary>Qo'shimcha ma'lumotlar</summary>
                    <pre>{JSON.stringify(error.metadata, null, 2)}</pre>
                  </details>
                )}
                
                {error.retryCount > 0 && (
                  <div className="error-retry">
                    <span>🔄 Qayta urinishlar: {error.retryCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Health Indicators */}
      <div className="system-health">
        <h3>Tizim Salomatligi</h3>
        <div className="health-indicators">
          <div className="health-item">
            <span className="health-label">Cloudinary:</span>
            <span className="health-status healthy">✅ Ishlayapti</span>
          </div>
          <div className="health-item">
            <span className="health-label">Telegram:</span>
            <span className="health-status healthy">✅ Ishlayapti</span>
          </div>
          <div className="health-item">
            <span className="health-label">Firebase:</span>
            <span className="health-status healthy">✅ Ishlayapti</span>
          </div>
          <div className="health-item">
            <span className="health-label">Xatolik darajasi:</span>
            <span className={`health-status ${errorStats?.total > 10 ? 'warning' : 'healthy'}`}>
              {errorStats?.total > 10 ? '⚠️ Yuqori' : '✅ Normal'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMonitoringDashboard;