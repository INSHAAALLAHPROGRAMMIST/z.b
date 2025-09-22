import React, { useState, useMemo } from 'react';
import './UserBehaviorDashboard.css';

/**
 * User Behavior Analytics Dashboard Component
 * Displays user behavior analytics and insights
 */
const UserBehaviorDashboard = ({ data, dateRange }) => {
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'activity', 'registration'

  // Memoized calculations
  const activityBreakdown = useMemo(() => {
    if (!data?.userActivity) return [];
    
    const { daily, weekly, monthly, inactive } = data.userActivity;
    const total = daily + weekly + monthly + inactive;
    
    return [
      { label: 'Kunlik faol', value: daily, percentage: total > 0 ? (daily / total) * 100 : 0, color: '#10b981' },
      { label: 'Haftalik faol', value: weekly, percentage: total > 0 ? (weekly / total) * 100 : 0, color: '#3b82f6' },
      { label: 'Oylik faol', value: monthly, percentage: total > 0 ? (monthly / total) * 100 : 0, color: '#f59e0b' },
      { label: 'Nofaol', value: inactive, percentage: total > 0 ? (inactive / total) * 100 : 0, color: '#ef4444' }
    ];
  }, [data?.userActivity]);

  const registrationTrend = useMemo(() => {
    if (!data?.registrationChartData) return [];
    
    return data.registrationChartData.map(item => ({
      ...item,
      formattedDate: new Date(item.date).toLocaleDateString('uz-UZ', {
        month: 'short',
        day: 'numeric'
      })
    }));
  }, [data?.registrationChartData]);

  if (!data) {
    return (
      <div className="user-behavior-dashboard">
        <div className="no-data">
          <p>Foydalanuvchi ma'lumotlari mavjud emas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-behavior-dashboard">
      {/* User Overview Cards */}
      <div className="user-overview">
        <div className="overview-card total-users">
          <div className="card-header">
            <h3>Jami Foydalanuvchilar</h3>
            <span className="card-icon">👥</span>
          </div>
          <div className="card-value">{data.totalUsers || 0}</div>
          <div className="card-subtitle">
            Ro'yxatdan o'tgan foydalanuvchilar
          </div>
        </div>

        <div className="overview-card active-users">
          <div className="card-header">
            <h3>Faol Foydalanuvchilar</h3>
            <span className="card-icon">✅</span>
          </div>
          <div className="card-value">{data.activeUsers || 0}</div>
          <div className="card-subtitle">
            Hozirda faol foydalanuvchilar
          </div>
        </div>

        <div className="overview-card engagement-rate">
          <div className="card-header">
            <h3>Faollik Darajasi</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-value">{data.engagementRate || 0}%</div>
          <div className="card-subtitle">
            Kunlik va haftalik faol foydalanuvchilar
          </div>
        </div>

        <div className="overview-card verified-users">
          <div className="card-header">
            <h3>Tasdiqlangan</h3>
            <span className="card-icon">🔐</span>
          </div>
          <div className="card-value">{data.verifiedUsers || 0}</div>
          <div className="card-subtitle">
            Email tasdiqlangan foydalanuvchilar
          </div>
        </div>

        <div className="overview-card admin-users">
          <div className="card-header">
            <h3>Administratorlar</h3>
            <span className="card-icon">👑</span>
          </div>
          <div className="card-value">{data.adminUsers || 0}</div>
          <div className="card-subtitle">
            Tizim administratorlari
          </div>
        </div>

        <div className="overview-card new-users">
          <div className="card-header">
            <h3>Bugungi Yangi</h3>
            <span className="card-icon">🆕</span>
          </div>
          <div className="card-value">{data.summary?.newUsersToday || 0}</div>
          <div className="card-subtitle">
            Bugun ro'yxatdan o'tganlar
          </div>
        </div>
      </div>

      {/* View Mode Controls */}
      <div className="view-controls">
        <div className="control-group">
          <label>Ko'rinish:</label>
          <div className="button-group">
            <button 
              className={viewMode === 'overview' ? 'active' : ''}
              onClick={() => setViewMode('overview')}
            >
              📊 Umumiy
            </button>
            <button 
              className={viewMode === 'activity' ? 'active' : ''}
              onClick={() => setViewMode('activity')}
            >
              🎯 Faollik
            </button>
            <button 
              className={viewMode === 'registration' ? 'active' : ''}
              onClick={() => setViewMode('registration')}
            >
              📈 Ro'yxat
            </button>
          </div>
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="overview-content">
          {/* User Activity Breakdown */}
          <div className="activity-breakdown-chart">
            <div className="chart-header">
              <h3>Foydalanuvchi Faolligi</h3>
              <div className="chart-subtitle">
                Oxirgi faollik vaqti bo'yicha taqsimot
              </div>
            </div>
            
            <div className="activity-bars">
              {activityBreakdown.map((item, index) => (
                <div key={index} className="activity-bar-item">
                  <div className="bar-container">
                    <div 
                      className="activity-bar"
                      style={{ 
                        height: `${item.percentage}%`,
                        backgroundColor: item.color,
                        minHeight: item.value > 0 ? '4px' : '0'
                      }}
                      title={`${item.label}: ${item.value} foydalanuvchi (${item.percentage.toFixed(1)}%)`}
                    ></div>
                  </div>
                  <div className="bar-label">{item.label}</div>
                  <div className="bar-value">{item.value}</div>
                  <div className="bar-percentage">{item.percentage.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* User Statistics */}
          <div className="user-statistics">
            <div className="section-header">
              <h3>Foydalanuvchi Statistikalari</h3>
              <span className="section-subtitle">
                Asosiy ko'rsatkichlar
              </span>
            </div>
            
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <div className="stat-label">Jami Foydalanuvchilar</div>
                  <div className="stat-value">{data.totalUsers || 0}</div>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <div className="stat-label">Faol Foydalanuvchilar</div>
                  <div className="stat-value">{data.activeUsers || 0}</div>
                  <div className="stat-percentage">
                    {data.totalUsers > 0 ? Math.round((data.activeUsers / data.totalUsers) * 100) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon">🔐</div>
                <div className="stat-info">
                  <div className="stat-label">Tasdiqlangan</div>
                  <div className="stat-value">{data.verifiedUsers || 0}</div>
                  <div className="stat-percentage">
                    {data.totalUsers > 0 ? Math.round((data.verifiedUsers / data.totalUsers) * 100) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <div className="stat-label">Faollik Darajasi</div>
                  <div className="stat-value">{data.engagementRate || 0}%</div>
                  <div className="stat-description">Kunlik va haftalik faol</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Mode */}
      {viewMode === 'activity' && (
        <div className="activity-content">
          <div className="activity-analysis">
            <div className="section-header">
              <h3>Faollik Tahlili</h3>
              <span className="section-subtitle">
                Foydalanuvchilarning oxirgi faollik vaqti bo'yicha tahlil
              </span>
            </div>
            
            <div className="activity-grid">
              {activityBreakdown.map((item, index) => (
                <div key={index} className="activity-card" style={{ borderLeftColor: item.color }}>
                  <div className="activity-header">
                    <h4>{item.label}</h4>
                    <div className="activity-count">{item.value}</div>
                  </div>
                  
                  <div className="activity-details">
                    <div className="activity-percentage">
                      {item.percentage.toFixed(1)}% foydalanuvchilar
                    </div>
                    
                    <div className="activity-bar-bg">
                      <div 
                        className="activity-bar-fill"
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="activity-description">
                    {index === 0 && "So'nggi 24 soat ichida faol bo'lgan"}
                    {index === 1 && "So'nggi hafta ichida faol bo'lgan"}
                    {index === 2 && "So'nggi oy ichida faol bo'lgan"}
                    {index === 3 && "Uzoq vaqtdan beri faol bo'lmagan"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Insights */}
          <div className="engagement-insights">
            <div className="section-header">
              <h3>Faollik Xulosalari</h3>
            </div>
            
            <div className="insights-list">
              <div className="insight-item positive">
                <div className="insight-icon">📈</div>
                <div className="insight-content">
                  <h4>Yaxshi Faollik</h4>
                  <p>
                    {data.userActivity?.daily || 0} foydalanuvchi kunlik faol, 
                    bu jami foydalanuvchilarning {
                      data.totalUsers > 0 ? 
                      Math.round((data.userActivity?.daily / data.totalUsers) * 100) : 0
                    }% ni tashkil etadi.
                  </p>
                </div>
              </div>
              
              {data.userActivity?.inactive > (data.totalUsers * 0.3) && (
                <div className="insight-item warning">
                  <div className="insight-icon">⚠️</div>
                  <div className="insight-content">
                    <h4>Ko'p Nofaol Foydalanuvchilar</h4>
                    <p>
                      {data.userActivity.inactive} foydalanuvchi uzoq vaqtdan beri nofaol. 
                      Ularni qaytarish uchun maxsus kampaniya o'tkazish tavsiya etiladi.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="insight-item info">
                <div className="insight-icon">💡</div>
                <div className="insight-content">
                  <h4>Tavsiya</h4>
                  <p>
                    Faollikni oshirish uchun yangi kitoblar haqida bildirishnomalar yuborish 
                    va maxsus chegirmalar taklif qilish mumkin.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Mode */}
      {viewMode === 'registration' && (
        <div className="registration-content">
          <div className="registration-chart">
            <div className="chart-header">
              <h3>Ro'yxatdan O'tish Trendi</h3>
              <div className="chart-subtitle">
                Kunlik ro'yxatdan o'tish statistikasi
              </div>
            </div>
            
            <div className="registration-chart-area">
              {registrationTrend.length > 0 ? (
                <div className="line-chart">
                  {registrationTrend.map((item, index) => {
                    const maxRegistrations = Math.max(...registrationTrend.map(d => d.registrations), 1);
                    const height = (item.registrations / maxRegistrations) * 100;
                    
                    return (
                      <div key={index} className="chart-point-container">
                        <div 
                          className="chart-point"
                          style={{ bottom: `${height}%` }}
                          title={`${item.formattedDate}: ${item.registrations} ro'yxat`}
                        >
                          <div className="point-value">{item.registrations}</div>
                        </div>
                        <div className="chart-date">{item.formattedDate}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-chart-data">
                  <p>Ro'yxatdan o'tish ma'lumotlari yo'q</p>
                </div>
              )}
            </div>
          </div>

          {/* Registration Statistics */}
          <div className="registration-stats">
            <div className="section-header">
              <h3>Ro'yxatdan O'tish Statistikalari</h3>
            </div>
            
            <div className="registration-summary">
              <div className="summary-item">
                <div className="summary-label">Jami ro'yxatdan o'tganlar:</div>
                <div className="summary-value">{data.totalUsers || 0}</div>
              </div>
              
              <div className="summary-item">
                <div className="summary-label">Bugungi yangi foydalanuvchilar:</div>
                <div className="summary-value">{data.summary?.newUsersToday || 0}</div>
              </div>
              
              <div className="summary-item">
                <div className="summary-label">O'rtacha kunlik ro'yxat:</div>
                <div className="summary-value">
                  {registrationTrend.length > 0 ? 
                    Math.round(registrationTrend.reduce((sum, item) => sum + item.registrations, 0) / registrationTrend.length) : 0
                  }
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-label">Eng ko'p ro'yxat kuni:</div>
                <div className="summary-value">
                  {registrationTrend.length > 0 ? 
                    Math.max(...registrationTrend.map(item => item.registrations)) : 0
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBehaviorDashboard;