import React, { useState, useMemo } from 'react';
import './SalesReportingDashboard.css';

/**
 * Sales Reporting Dashboard Component
 * Displays comprehensive sales analytics and revenue tracking
 */
const SalesReportingDashboard = ({ data, trends, dateRange }) => {
  const [chartType, setChartType] = useState('revenue'); // 'revenue' or 'orders'
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'

  // Memoized calculations
  const chartData = useMemo(() => {
    if (!data?.salesChartData) return [];
    
    return data.salesChartData.map(item => ({
      ...item,
      displayValue: chartType === 'revenue' ? item.revenue : item.orders,
      formattedDate: new Date(item.date).toLocaleDateString('uz-UZ', {
        month: 'short',
        day: 'numeric'
      })
    }));
  }, [data?.salesChartData, chartType]);

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map(item => item.displayValue), 1);
  }, [chartData]);

  if (!data) {
    return (
      <div className="sales-dashboard">
        <div className="no-data">
          <p>Sotuv ma'lumotlari mavjud emas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-dashboard">
      {/* Sales Summary Cards */}
      <div className="sales-summary">
        <div className="summary-card total-revenue">
          <div className="card-header">
            <h3>Jami Daromad</h3>
            <span className="trend-indicator positive">
              {trends?.revenueGrowth > 0 ? '↗' : trends?.revenueGrowth < 0 ? '↘' : '→'}
            </span>
          </div>
          <div className="card-value">
            {data.totalRevenue?.toLocaleString() || 0} so'm
          </div>
          <div className="card-subtitle">
            {trends?.summary?.revenueGrowth || '+0.0%'} o'sish
          </div>
        </div>

        <div className="summary-card total-orders">
          <div className="card-header">
            <h3>Jami Buyurtmalar</h3>
            <span className="trend-indicator positive">
              {trends?.ordersGrowth > 0 ? '↗' : trends?.ordersGrowth < 0 ? '↘' : '→'}
            </span>
          </div>
          <div className="card-value">
            {data.totalOrders || 0}
          </div>
          <div className="card-subtitle">
            {trends?.summary?.ordersGrowth || '+0.0%'} o'sish
          </div>
        </div>

        <div className="summary-card avg-order">
          <div className="card-header">
            <h3>O'rtacha Buyurtma</h3>
            <span className="trend-indicator">
              {trends?.avgOrderValueGrowth > 0 ? '↗' : trends?.avgOrderValueGrowth < 0 ? '↘' : '→'}
            </span>
          </div>
          <div className="card-value">
            {data.averageOrderValue?.toLocaleString() || 0} so'm
          </div>
          <div className="card-subtitle">
            {trends?.summary?.avgOrderValueGrowth || '+0.0%'} o'sish
          </div>
        </div>

        <div className="summary-card completion-rate">
          <div className="card-header">
            <h3>Bajarilish Darajasi</h3>
            <span className="completion-icon">✅</span>
          </div>
          <div className="card-value">
            {data.completionRate || 0}%
          </div>
          <div className="card-subtitle">
            {data.completedOrders || 0} / {data.totalOrders || 0} buyurtma
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="chart-controls">
        <div className="control-group">
          <label>Ko'rinish:</label>
          <div className="button-group">
            <button 
              className={chartType === 'revenue' ? 'active' : ''}
              onClick={() => setChartType('revenue')}
            >
              💰 Daromad
            </button>
            <button 
              className={chartType === 'orders' ? 'active' : ''}
              onClick={() => setChartType('orders')}
            >
              📋 Buyurtmalar
            </button>
          </div>
        </div>
        
        <div className="control-group">
          <label>Format:</label>
          <div className="button-group">
            <button 
              className={viewMode === 'chart' ? 'active' : ''}
              onClick={() => setViewMode('chart')}
            >
              📊 Grafik
            </button>
            <button 
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              📋 Jadval
            </button>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      {viewMode === 'chart' && (
        <div className="sales-chart-container">
          <div className="chart-header">
            <h3>
              {chartType === 'revenue' ? 'Kunlik Daromad' : 'Kunlik Buyurtmalar'} Grafigi
            </h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color"></span>
                {chartType === 'revenue' ? 'Daromad (so\'m)' : 'Buyurtmalar soni'}
              </span>
            </div>
          </div>
          
          <div className="chart-area">
            {chartData.length > 0 ? (
              <div className="bar-chart">
                {chartData.map((item, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar"
                      style={{ 
                        height: `${(item.displayValue / maxValue) * 100}%`,
                        minHeight: item.displayValue > 0 ? '4px' : '0'
                      }}
                      title={`${item.formattedDate}: ${
                        chartType === 'revenue' 
                          ? `${item.revenue.toLocaleString()} so'm` 
                          : `${item.orders} buyurtma`
                      }`}
                    >
                      <div className="bar-value">
                        {chartType === 'revenue' 
                          ? item.revenue.toLocaleString() 
                          : item.orders
                        }
                      </div>
                    </div>
                    <div className="chart-label">{item.formattedDate}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-chart-data">
                <p>Grafik uchun ma'lumot yo'q</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sales Table */}
      {viewMode === 'table' && (
        <div className="sales-table-container">
          <div className="table-header">
            <h3>Kunlik Sotuv Ma'lumotlari</h3>
          </div>
          
          <div className="table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Buyurtmalar</th>
                  <th>Daromad</th>
                  <th>O'rtacha Buyurtma</th>
                </tr>
              </thead>
              <tbody>
                {chartData.length > 0 ? (
                  chartData.map((item, index) => (
                    <tr key={index}>
                      <td>{new Date(item.date).toLocaleDateString('uz-UZ')}</td>
                      <td>{item.orders}</td>
                      <td>{item.revenue.toLocaleString()} so'm</td>
                      <td>
                        {item.orders > 0 
                          ? Math.round(item.revenue / item.orders).toLocaleString() 
                          : 0
                        } so'm
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="no-data">Ma'lumot yo'q</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Performing Books */}
      <div className="top-books-section">
        <div className="section-header">
          <h3>Eng Ko'p Sotilgan Kitoblar</h3>
          <span className="section-subtitle">
            Daromad bo'yicha eng yaxshi natijalar
          </span>
        </div>
        
        <div className="top-books-grid">
          {data.topBooks && data.topBooks.length > 0 ? (
            data.topBooks.slice(0, 6).map((book, index) => (
              <div key={book.bookId || index} className="book-performance-card">
                <div className="book-rank">#{index + 1}</div>
                <div className="book-info">
                  <h4 className="book-title">{book.title || 'Noma\'lum kitob'}</h4>
                  <div className="book-stats">
                    <div className="stat">
                      <span className="stat-label">Sotildi:</span>
                      <span className="stat-value">{book.quantity || 0} dona</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Daromad:</span>
                      <span className="stat-value">{(book.revenue || 0).toLocaleString()} so'm</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Buyurtmalar:</span>
                      <span className="stat-value">{book.orders || 0} ta</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-books-data">
              <p>Kitob sotuvi ma'lumotlari yo'q</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Customers */}
      <div className="top-customers-section">
        <div className="section-header">
          <h3>Eng Faol Mijozlar</h3>
          <span className="section-subtitle">
            Xarid miqdori bo'yicha eng yaxshi mijozlar
          </span>
        </div>
        
        <div className="customers-list">
          {data.topCustomers && data.topCustomers.length > 0 ? (
            data.topCustomers.slice(0, 5).map((customer, index) => (
              <div key={customer.customerId || index} className="customer-item">
                <div className="customer-rank">#{index + 1}</div>
                <div className="customer-info">
                  <div className="customer-name">{customer.name || 'Noma\'lum mijoz'}</div>
                  <div className="customer-stats">
                    <span className="customer-orders">{customer.orders || 0} buyurtma</span>
                    <span className="customer-spent">{(customer.totalSpent || 0).toLocaleString()} so'm</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-customers-data">
              <p>Mijozlar ma'lumotlari yo'q</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="order-status-section">
        <div className="section-header">
          <h3>Buyurtmalar Holati</h3>
          <span className="section-subtitle">
            Buyurtmalar holatining taqsimoti
          </span>
        </div>
        
        <div className="status-breakdown">
          <div className="status-item completed">
            <div className="status-icon">✅</div>
            <div className="status-info">
              <div className="status-label">Bajarilgan</div>
              <div className="status-count">{data.completedOrders || 0}</div>
            </div>
          </div>
          
          <div className="status-item pending">
            <div className="status-icon">⏳</div>
            <div className="status-info">
              <div className="status-label">Kutilmoqda</div>
              <div className="status-count">{data.pendingOrders || 0}</div>
            </div>
          </div>
          
          <div className="status-item cancelled">
            <div className="status-icon">❌</div>
            <div className="status-info">
              <div className="status-label">Bekor qilingan</div>
              <div className="status-count">{data.cancelledOrders || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReportingDashboard;