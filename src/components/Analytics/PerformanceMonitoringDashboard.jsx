import React, { useState, useEffect } from 'react';
import './PerformanceMonitoringDashboard.css';

/**
 * Performance Monitoring Dashboard Component
 * Displays system health monitoring and performance metrics
 */
const PerformanceMonitoringDashboard = ({ data, dateRange }) => {
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    networkLatency: 0,
    activeConnections: 0
  });

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeMetrics({
        cpuUsage: Math.floor(Math.random() * 30) + 20, // 20-50%
        memoryUsage: Math.floor(Math.random() * 20) + 40, // 40-60%
        networkLatency: Math.floor(Math.random() * 50) + 10, // 10-60ms
        activeConnections: Math.floor(Math.random() * 100) + 50 // 50-150
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="performance-dashboard">
        <div className="no-data">
          <p>Tizim holati ma'lumotlari mavjud emas</p>
        </div>
      </div>
    );
  }

  const getHealthStatus = (health) => {
    switch (health) {
      case 'good':
        return { label: 'Yaxshi', color: '#10b981', icon: '✅' };
      case 'fair':
        return { label: 'O\'rtacha', color: '#f59e0b', icon: '⚠️' };
      case 'poor':
        return { label: 'Yomon', color: '#ef4444', icon: '❌' };
      default:
        return { label: 'Noma\'lum', color: '#64748b', icon: '❓' };
    }
  };

  const healthStatus = getHealthStatus(data.systemHealth);

  return (
    <div className="performance-dashboard">
      {/* System Health Overview */}
      <div className="health-overview">
        <div className="health-card main-health">
          <div className="health-header">
            <h3>Tizim Holati</h3>
            <span className="health-icon" style={{ color: healthStatus.color }}>
              {healthStatus.icon}
            </span>
          </div>
          <div className="health-status" style={{ color: healthStatus.color }}>
            {healthStatus.label}
          </div>
          <div className="health-details">
            <div className="detail-item">
              <span className="detail-label">Database javob vaqti:</span>
              <span className="detail-value">{data.databaseResponseTime || 0}ms</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Oxirgi yangilanish:</span>
              <span className="detail-value">
                {data.lastUpdated ? 
                  new Date(data.lastUpdated).toLocaleTimeString('uz-UZ') : 
                  'Noma\'lum'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="health-card uptime">
          <div className="health-header">
            <h3>Ishlash Vaqti</h3>
            <span className="health-icon">⏱️</span>
          </div>
          <div className="health-value">{data.uptime || 'N/A'}</div>
          <div className="health-subtitle">Tizim ishlash vaqti</div>
        </div>

        <div className="health-card error-rate">
          <div className="health-header">
            <h3>Xatolik Darajasi</h3>
            <span className="health-icon">🚨</span>
          </div>
          <div className="health-value">{data.errorRate || 'N/A'}</div>
          <div className="health-subtitle">Xatoliklar foizi</div>
        </div>

        <div className="health-card throughput">
          <div className="health-header">
            <h3>O'tkazuvchanlik</h3>
            <span className="health-icon">📊</span>
          </div>
          <div className="health-value">{data.throughput || 'N/A'}</div>
          <div className="health-subtitle">So'rovlar/daqiqa</div>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="realtime-metrics">
        <div className="section-header">
          <h3>Real-vaqt Ko'rsatkichlari</h3>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">JONLI</span>
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-card cpu">
            <div className="metric-header">
              <h4>CPU Foydalanish</h4>
              <span className="metric-icon">🖥️</span>
            </div>
            <div className="metric-gauge">
              <div className="gauge-container">
                <div 
                  className="gauge-fill"
                  style={{ 
                    width: `${realTimeMetrics.cpuUsage}%`,
                    backgroundColor: realTimeMetrics.cpuUsage > 80 ? '#ef4444' : 
                                   realTimeMetrics.cpuUsage > 60 ? '#f59e0b' : '#10b981'
                  }}
                ></div>
              </div>
              <div className="metric-value">{realTimeMetrics.cpuUsage}%</div>
            </div>
          </div>

          <div className="metric-card memory">
            <div className="metric-header">
              <h4>Xotira Foydalanish</h4>
              <span className="metric-icon">💾</span>
            </div>
            <div className="metric-gauge">
              <div className="gauge-container">
                <div 
                  className="gauge-fill"
                  style={{ 
                    width: `${realTimeMetrics.memoryUsage}%`,
                    backgroundColor: realTimeMetrics.memoryUsage > 80 ? '#ef4444' : 
                                   realTimeMetrics.memoryUsage > 60 ? '#f59e0b' : '#10b981'
                  }}
                ></div>
              </div>
              <div className="metric-value">{realTimeMetrics.memoryUsage}%</div>
            </div>
          </div>

          <div className="metric-card network">
            <div className="metric-header">
              <h4>Tarmoq Kechikishi</h4>
              <span className="metric-icon">🌐</span>
            </div>
            <div className="metric-display">
              <div className="metric-value">{realTimeMetrics.networkLatency}ms</div>
              <div className="metric-status">
                {realTimeMetrics.networkLatency < 50 ? 
                  <span className="status-good">Yaxshi</span> :
                  realTimeMetrics.networkLatency < 100 ?
                  <span className="status-fair">O'rtacha</span> :
                  <span className="status-poor">Sekin</span>
                }
              </div>
            </div>
          </div>

          <div className="metric-card connections">
            <div className="metric-header">
              <h4>Faol Ulanishlar</h4>
              <span className="metric-icon">🔗</span>
            </div>
            <div className="metric-display">
              <div className="metric-value">{realTimeMetrics.activeConnections}</div>
              <div className="metric-subtitle">Joriy ulanishlar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance History */}
      <div className="performance-history">
        <div className="section-header">
          <h3>Ishlash Tarixi</h3>
          <span className="section-subtitle">
            So'nggi 24 soat ichidagi ko'rsatkichlar
          </span>
        </div>

        <div className="history-chart">
          <div className="chart-placeholder">
            <div className="chart-line">
              {Array.from({ length: 24 }, (_, i) => {
                const height = Math.random() * 80 + 10;
                const isGood = height < 50;
                return (
                  <div 
                    key={i}
                    className="chart-bar"
                    style={{ 
                      height: `${height}%`,
                      backgroundColor: isGood ? '#10b981' : height < 70 ? '#f59e0b' : '#ef4444'
                    }}
                    title={`${24 - i} soat oldin: ${Math.round(height)}% yuklama`}
                  ></div>
                );
              })}
            </div>
            <div className="chart-labels">
              <span>24s oldin</span>
              <span>12s oldin</span>
              <span>Hozir</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="system-resources">
        <div className="section-header">
          <h3>Tizim Resurslari</h3>
        </div>

        <div className="resources-grid">
          <div className="resource-item">
            <div className="resource-header">
              <h4>Database Ulanishlari</h4>
              <span className="resource-icon">🗄️</span>
            </div>
            <div className="resource-info">
              <div className="resource-value">25/100</div>
              <div className="resource-bar">
                <div className="resource-fill" style={{ width: '25%' }}></div>
              </div>
              <div className="resource-status">Yaxshi</div>
            </div>
          </div>

          <div className="resource-item">
            <div className="resource-header">
              <h4>API So'rovlari</h4>
              <span className="resource-icon">🔄</span>
            </div>
            <div className="resource-info">
              <div className="resource-value">150/min</div>
              <div className="resource-bar">
                <div className="resource-fill" style={{ width: '60%' }}></div>
              </div>
              <div className="resource-status">Normal</div>
            </div>
          </div>

          <div className="resource-item">
            <div className="resource-header">
              <h4>Fayl Saqlash</h4>
              <span className="resource-icon">💿</span>
            </div>
            <div className="resource-info">
              <div className="resource-value">2.5GB/10GB</div>
              <div className="resource-bar">
                <div className="resource-fill" style={{ width: '25%' }}></div>
              </div>
              <div className="resource-status">Yetarli</div>
            </div>
          </div>

          <div className="resource-item">
            <div className="resource-header">
              <h4>CDN Trafik</h4>
              <span className="resource-icon">🌍</span>
            </div>
            <div className="resource-info">
              <div className="resource-value">1.2TB/oy</div>
              <div className="resource-bar">
                <div className="resource-fill" style={{ width: '40%' }}></div>
              </div>
              <div className="resource-status">Normal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Alerts */}
      <div className="performance-alerts">
        <div className="section-header">
          <h3>Tizim Ogohlantirishlari</h3>
        </div>

        <div className="alerts-list">
          {data.systemHealth === 'poor' && (
            <div className="alert-item critical">
              <div className="alert-icon">🚨</div>
              <div className="alert-content">
                <h4>Kritik: Tizim ishlashi yomon</h4>
                <p>Database javob vaqti {data.databaseResponseTime}ms. Tezkor choralar ko'rish kerak.</p>
                <div className="alert-time">Hozir</div>
              </div>
            </div>
          )}

          {data.systemHealth === 'fair' && (
            <div className="alert-item warning">
              <div className="alert-icon">⚠️</div>
              <div className="alert-content">
                <h4>Ogohlantirish: Tizim ishlashi sekinlashgan</h4>
                <p>Tizim ishlashi kutilganidan sekinroq. Monitoring qilish davom ettirilmoqda.</p>
                <div className="alert-time">5 daqiqa oldin</div>
              </div>
            </div>
          )}

          <div className="alert-item info">
            <div className="alert-icon">ℹ️</div>
            <div className="alert-content">
              <h4>Ma'lumot: Tizim yangilanishi</h4>
              <p>Tizim muvaffaqiyatli yangilandi. Barcha xizmatlar normal ishlayapti.</p>
              <div className="alert-time">1 soat oldin</div>
            </div>
          </div>

          <div className="alert-item success">
            <div className="alert-icon">✅</div>
            <div className="alert-content">
              <h4>Muvaffaqiyat: Backup yaratildi</h4>
              <p>Kunlik ma'lumotlar zaxirasi muvaffaqiyatli yaratildi.</p>
              <div className="alert-time">2 soat oldin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="performance-recommendations">
        <div className="section-header">
          <h3>Tavsiyalar</h3>
        </div>

        <div className="recommendations-list">
          <div className="recommendation-item">
            <div className="recommendation-icon">💡</div>
            <div className="recommendation-content">
              <h4>Database Optimizatsiyasi</h4>
              <p>Database so'rovlarini optimizatsiya qilish uchun indekslarni tekshiring va sekin so'rovlarni aniqlang.</p>
            </div>
          </div>

          <div className="recommendation-item">
            <div className="recommendation-icon">🚀</div>
            <div className="recommendation-content">
              <h4>Kesh Strategiyasi</h4>
              <p>Tez-tez so'raladigan ma'lumotlar uchun kesh tizimini joriy qiling.</p>
            </div>
          </div>

          <div className="recommendation-item">
            <div className="recommendation-icon">📊</div>
            <div className="recommendation-content">
              <h4>Monitoring Kengaytirish</h4>
              <p>Qo'shimcha monitoring vositalarini o'rnatib, tizim holatini yanada yaxshi kuzatish mumkin.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitoringDashboard;