import React, { useState, useEffect, useCallback } from 'react';
import analyticsService from '../services/AnalyticsService';
import SalesReportingDashboard from './analytics/SalesReportingDashboard';
import InventoryAnalyticsDashboard from './analytics/InventoryAnalyticsDashboard';
import UserBehaviorDashboard from './analytics/UserBehaviorDashboard';
import PerformanceMonitoringDashboard from './analytics/PerformanceMonitoringDashboard';
import AlertsPanel from './analytics/AlertsPanel';
import './AnalyticsDashboard.css';

/**
 * Main Analytics Dashboard Component
 * Provides comprehensive business intelligence and reporting
 */
const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Load analytics data
   */
  const loadAnalyticsData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;

      const result = await analyticsService.getDashboardAnalytics({
        startDate,
        endDate,
        includeComparisons: true
      });

      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        throw new Error('Failed to load analytics data');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  /**
   * Handle date range change
   */
  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  /**
   * Handle manual refresh
   */
  const handleRefresh = () => {
    loadAnalyticsData(true);
  };

  /**
   * Export analytics data
   */
  const handleExport = async (type = 'all') => {
    try {
      if (!analyticsData) return;

      const csvData = analyticsService.exportToCSV(analyticsData, type);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Ma\'lumotlarni eksport qilishda xato yuz berdi');
    }
  };

  // Load data on component mount and date range change
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalyticsData(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadAnalyticsData]);

  if (loading && !analyticsData) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Analitika ma'lumotlari yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="analytics-dashboard">
        <div className="error-container">
          <h3>Xato yuz berdi</h3>
          <p>{error}</p>
          <button onClick={() => loadAnalyticsData()} className="retry-button">
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Umumiy ko\'rinish', icon: '📊' },
    { id: 'sales', label: 'Sotuv hisoboti', icon: '💰' },
    { id: 'inventory', label: 'Inventar analitikasi', icon: '📦' },
    { id: 'users', label: 'Foydalanuvchilar', icon: '👥' },
    { id: 'performance', label: 'Tizim holati', icon: '⚡' }
  ];

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Analitika Dashboard</h1>
          <div className="header-actions">
            <div className="date-range-selector">
              <label>
                Boshlanish sanasi:
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange({
                    ...dateRange,
                    startDate: e.target.value
                  })}
                />
              </label>
              <label>
                Tugash sanasi:
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange({
                    ...dateRange,
                    endDate: e.target.value
                  })}
                />
              </label>
            </div>
            <div className="action-buttons">
              <button 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="refresh-button"
              >
                {refreshing ? '🔄' : '↻'} Yangilash
              </button>
              <div className="export-dropdown">
                <button className="export-button">📥 Eksport</button>
                <div className="export-menu">
                  <button onClick={() => handleExport('all')}>Barcha ma'lumotlar</button>
                  <button onClick={() => handleExport('sales')}>Sotuv hisoboti</button>
                  <button onClick={() => handleExport('inventory')}>Inventar hisoboti</button>
                  <button onClick={() => handleExport('users')}>Foydalanuvchilar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      {analyticsData?.alerts && analyticsData.alerts.length > 0 && (
        <AlertsPanel alerts={analyticsData.alerts} />
      )}

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewDashboard 
            data={analyticsData} 
            dateRange={dateRange}
            refreshing={refreshing}
          />
        )}
        
        {activeTab === 'sales' && (
          <SalesReportingDashboard 
            data={analyticsData?.sales} 
            trends={analyticsData?.trends}
            dateRange={dateRange}
          />
        )}
        
        {activeTab === 'inventory' && (
          <InventoryAnalyticsDashboard 
            data={analyticsData?.inventory}
            dateRange={dateRange}
          />
        )}
        
        {activeTab === 'users' && (
          <UserBehaviorDashboard 
            data={analyticsData?.users}
            dateRange={dateRange}
          />
        )}
        
        {activeTab === 'performance' && (
          <PerformanceMonitoringDashboard 
            data={analyticsData?.performance}
            dateRange={dateRange}
          />
        )}
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <p>
          Oxirgi yangilanish: {analyticsData?.generatedAt ? 
            new Date(analyticsData.generatedAt).toLocaleString('uz-UZ') : 
            'Noma\'lum'
          }
        </p>
        {refreshing && <span className="refresh-indicator">Yangilanmoqda...</span>}
      </div>
    </div>
  );
};

/**
 * Overview Dashboard Component
 */
const OverviewDashboard = ({ data, dateRange, refreshing }) => {
  if (!data) return <div>Ma'lumot yo'q</div>;

  const { overview, sales, inventory, users, performance } = data;

  return (
    <div className="overview-dashboard">
      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card revenue">
          <div className="metric-header">
            <h3>Jami Daromad</h3>
            <span className="metric-icon">💰</span>
          </div>
          <div className="metric-value">
            {overview?.totalRevenue?.toLocaleString() || 0} so'm
          </div>
          <div className="metric-change positive">
            +{data.trends?.revenueGrowth?.toFixed(1) || 0}%
          </div>
        </div>

        <div className="metric-card orders">
          <div className="metric-header">
            <h3>Jami Buyurtmalar</h3>
            <span className="metric-icon">📋</span>
          </div>
          <div className="metric-value">
            {overview?.totalOrders || 0}
          </div>
          <div className="metric-change positive">
            +{data.trends?.ordersGrowth?.toFixed(1) || 0}%
          </div>
        </div>

        <div className="metric-card books">
          <div className="metric-header">
            <h3>Jami Kitoblar</h3>
            <span className="metric-icon">📚</span>
          </div>
          <div className="metric-value">
            {overview?.totalBooks || 0}
          </div>
          <div className="metric-subtitle">
            {inventory?.availableBooks || 0} mavjud
          </div>
        </div>

        <div className="metric-card users">
          <div className="metric-header">
            <h3>Foydalanuvchilar</h3>
            <span className="metric-icon">👥</span>
          </div>
          <div className="metric-value">
            {overview?.totalUsers || 0}
          </div>
          <div className="metric-subtitle">
            {users?.engagementRate || 0}% faol
          </div>
        </div>

        <div className="metric-card aov">
          <div className="metric-header">
            <h3>O'rtacha Buyurtma</h3>
            <span className="metric-icon">📊</span>
          </div>
          <div className="metric-value">
            {overview?.averageOrderValue?.toLocaleString() || 0} so'm
          </div>
          <div className="metric-change">
            {data.trends?.avgOrderValueGrowth > 0 ? '+' : ''}
            {data.trends?.avgOrderValueGrowth?.toFixed(1) || 0}%
          </div>
        </div>

        <div className="metric-card conversion">
          <div className="metric-header">
            <h3>Konversiya</h3>
            <span className="metric-icon">🎯</span>
          </div>
          <div className="metric-value">
            {overview?.conversionRate || 0}%
          </div>
          <div className="metric-subtitle">
            Foydalanuvchi → Buyurtma
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stats-section">
          <h3>Bugungi Statistika</h3>
          <div className="stats-list">
            <div className="stat-item">
              <span className="stat-label">Yangi buyurtmalar:</span>
              <span className="stat-value">{sales?.pendingOrders || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Kam stokli kitoblar:</span>
              <span className="stat-value critical">{inventory?.lowStockCount || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tizim holati:</span>
              <span className={`stat-value ${performance?.systemHealth || 'unknown'}`}>
                {performance?.systemHealth === 'good' ? 'Yaxshi' : 
                 performance?.systemHealth === 'fair' ? 'O\'rtacha' : 
                 performance?.systemHealth === 'poor' ? 'Yomon' : 'Noma\'lum'}
              </span>
            </div>
          </div>
        </div>

        <div className="stats-section">
          <h3>Tezkor Harakatlar</h3>
          <div className="quick-actions">
            <button className="action-button">📋 Buyurtmalarni ko'rish</button>
            <button className="action-button">📦 Inventarni tekshirish</button>
            <button className="action-button">📊 Hisobot yaratish</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;