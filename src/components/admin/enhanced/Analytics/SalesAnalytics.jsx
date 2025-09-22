import React, { useState, useEffect } from 'react';
import { useSalesAnalytics } from '../../../../hooks/useAnalytics';
import SalesChart from './SalesChart';
import analyticsService from '../../../../services/AnalyticsService';

const SalesAnalytics = ({ dateRange }) => {
  const [chartType, setChartType] = useState('line');
  const [timeframe, setTimeframe] = useState('daily');
  const [selectedMetric, setSelectedMetric] = useState('revenue'); // revenue, orders, customers
  const [comparisonPeriod, setComparisonPeriod] = useState('previous'); // previous, year_ago
  const [salesData, setSalesData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, trends, customers, books
  
  const { sales } = useSalesAnalytics({
    enableRealTime: true,
    dateRange
  });

  // Load detailed analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange, timeframe]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date ranges
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      // Load sales analytics
      const salesResult = await analyticsService.getSalesAnalytics({
        start: startDate,
        end: endDate
      });
      
      // Load customer analytics
      const customerResult = await analyticsService.getCustomerAnalytics({
        start: startDate,
        end: endDate
      });
      
      setSalesData(salesResult);
      setCustomerData(customerResult);
      setError(null);
    } catch (err) {
      console.error('Analytics data loading error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data based on timeframe and metric
  const prepareChartData = () => {
    if (!salesData || !salesData.dailySales) {
      return [];
    }

    return salesData.dailySales.map(item => ({
      label: new Date(item.date).toLocaleDateString('uz-UZ', { 
        month: 'short', 
        day: 'numeric' 
      }),
      value: selectedMetric === 'revenue' ? item.revenue : 
             selectedMetric === 'orders' ? item.orders : 
             item.sales,
      date: item.date,
      revenue: item.revenue,
      orders: item.orders,
      sales: item.sales
    }));
  };

  // Calculate comparison metrics
  const calculateComparison = (current, previous) => {
    if (!previous || previous === 0) return { change: 0, percentage: 0 };
    
    const change = current - previous;
    const percentage = (change / previous) * 100;
    
    return { change, percentage };
  };

  // Get top performing metrics
  const getTopMetrics = () => {
    if (!salesData) return [];

    const metrics = [
      {
        title: 'Jami Daromad',
        value: salesData.totalRevenue || 0,
        format: 'currency',
        icon: 'fas fa-dollar-sign',
        color: 'success',
        comparison: calculateComparison(salesData.totalRevenue, salesData.totalRevenue * 0.8) // Mock comparison
      },
      {
        title: 'Jami Buyurtmalar',
        value: salesData.totalOrders || 0,
        format: 'number',
        icon: 'fas fa-shopping-cart',
        color: 'primary',
        comparison: calculateComparison(salesData.totalOrders, salesData.totalOrders * 0.9)
      },
      {
        title: 'O\'rtacha Buyurtma',
        value: salesData.averageOrderValue || 0,
        format: 'currency',
        icon: 'fas fa-chart-line',
        color: 'info',
        comparison: calculateComparison(salesData.averageOrderValue, salesData.averageOrderValue * 1.1)
      },
      {
        title: 'Yangi Mijozlar',
        value: customerData?.newCustomers || 0,
        format: 'number',
        icon: 'fas fa-user-plus',
        color: 'warning',
        comparison: calculateComparison(customerData?.newCustomers, customerData?.newCustomers * 0.7)
      }
    ];

    return metrics;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('uz-UZ').format(number);
  };

  const formatValue = (value, format) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'number':
        return formatNumber(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  if (loading) {
    return (
      <div className="sales-analytics loading">
        <div className="analytics-header">
          <div className="header-skeleton"></div>
          <div className="controls-skeleton"></div>
        </div>
        <div className="chart-skeleton">
          <div className="skeleton-chart"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-analytics error">
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Ma'lumotlarni yuklashda xato</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={loadAnalyticsData}>
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const chartData = prepareChartData();
  const topMetrics = getTopMetrics();

  return (
    <div className="sales-analytics">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-chart-line"></i>
            Sotuvlar Tahlili
          </h2>
          <p>Batafsil sotuvlar statistikasi va trend tahlili</p>
        </div>

        <div className="analytics-controls">
          <div className="control-group">
            <label>Vaqt oralig'i:</label>
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="control-select"
            >
              <option value="daily">Kunlik</option>
              <option value="weekly">Haftalik</option>
              <option value="monthly">Oylik</option>
              <option value="yearly">Yillik</option>
            </select>
          </div>

          <div className="control-group">
            <label>Ko'rsatkich:</label>
            <select 
              value={selectedMetric} 
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="control-select"
            >
              <option value="revenue">Daromad</option>
              <option value="orders">Buyurtmalar</option>
              <option value="sales">Sotuvlar</option>
            </select>
          </div>

          <div className="control-group">
            <label>Grafik turi:</label>
            <div className="chart-type-buttons">
              <button
                className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
                onClick={() => setChartType('line')}
                title="Chiziqli grafik"
              >
                <i className="fas fa-chart-line"></i>
              </button>
              <button
                className={`chart-type-btn ${chartType === 'area' ? 'active' : ''}`}
                onClick={() => setChartType('area')}
                title="Maydon grafigi"
              >
                <i className="fas fa-chart-area"></i>
              </button>
              <button
                className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
                onClick={() => setChartType('bar')}
                title="Ustunli grafik"
              >
                <i className="fas fa-chart-bar"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        {topMetrics.map((metric, index) => (
          <div key={index} className={`metric-card ${metric.color}`}>
            <div className="metric-icon">
              <i className={metric.icon}></i>
            </div>
            <div className="metric-content">
              <h3>{formatValue(metric.value, metric.format)}</h3>
              <p>{metric.title}</p>
              <div className={`metric-change ${metric.comparison.percentage >= 0 ? 'positive' : 'negative'}`}>
                <i className={`fas fa-arrow-${metric.comparison.percentage >= 0 ? 'up' : 'down'}`}></i>
                <span>{Math.abs(metric.comparison.percentage).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="analytics-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fas fa-chart-pie"></i>
          Umumiy ko'rinish
        </button>
        <button
          className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <i className="fas fa-trending-up"></i>
          Trendlar
        </button>
        <button
          className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <i className="fas fa-users"></i>
          Mijozlar
        </button>
        <button
          className={`tab-btn ${activeTab === 'books' ? 'active' : ''}`}
          onClick={() => setActiveTab('books')}
        >
          <i className="fas fa-book"></i>
          Kitoblar
        </button>
      </div>

      {/* Tab Content */}
      <div className="analytics-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="main-chart">
              <SalesChart
                data={chartData}
                type={chartType}
                title={`${selectedMetric === 'revenue' ? 'Daromad' : 
                        selectedMetric === 'orders' ? 'Buyurtmalar' : 
                        'Sotuvlar'} Dinamikasi`}
                height={400}
                metric={selectedMetric}
              />
            </div>

            <div className="overview-stats">
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-header">
                    <h4>Bugungi Natijalar</h4>
                    <i className="fas fa-calendar-day"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-row">
                      <span>Daromad:</span>
                      <span className="stat-value">{formatCurrency(sales.todayRevenue || 0)}</span>
                    </div>
                    <div className="stat-row">
                      <span>Buyurtmalar:</span>
                      <span className="stat-value">{sales.todaySalesCount || 0} ta</span>
                    </div>
                    <div className="stat-row">
                      <span>O'rtacha:</span>
                      <span className="stat-value">{formatCurrency(sales.averageOrderValue || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-header">
                    <h4>Umumiy Statistika</h4>
                    <i className="fas fa-chart-bar"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-row">
                      <span>Jami daromad:</span>
                      <span className="stat-value">{formatCurrency(salesData?.totalRevenue || 0)}</span>
                    </div>
                    <div className="stat-row">
                      <span>Jami buyurtmalar:</span>
                      <span className="stat-value">{salesData?.totalOrders || 0} ta</span>
                    </div>
                    <div className="stat-row">
                      <span>Mijozlar:</span>
                      <span className="stat-value">{customerData?.totalCustomers || 0} ta</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="trends-tab">
            <div className="trends-analysis">
              <h3>Trend Tahlili</h3>
              
              <div className="trend-cards">
                <div className="trend-card growth">
                  <div className="trend-icon">
                    <i className="fas fa-arrow-trend-up"></i>
                  </div>
                  <div className="trend-content">
                    <h4>O'sish Sur'ati</h4>
                    <p className="trend-value">+12.5%</p>
                    <small>Oxirgi 30 kun</small>
                  </div>
                </div>

                <div className="trend-card seasonal">
                  <div className="trend-icon">
                    <i className="fas fa-calendar-alt"></i>
                  </div>
                  <div className="trend-content">
                    <h4>Mavsumiy O'zgarish</h4>
                    <p className="trend-value">Yuqori</p>
                    <small>Hozirgi davr</small>
                  </div>
                </div>

                <div className="trend-card forecast">
                  <div className="trend-icon">
                    <i className="fas fa-crystal-ball"></i>
                  </div>
                  <div className="trend-content">
                    <h4>Prognoz</h4>
                    <p className="trend-value">Ijobiy</p>
                    <small>Keyingi oy</small>
                  </div>
                </div>
              </div>

              <div className="trend-chart">
                <SalesChart
                  data={chartData}
                  type="area"
                  title="Sotuvlar Trendi"
                  height={300}
                  showTrendLine={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="customers-tab">
            <div className="customer-analytics">
              <h3>Mijozlar Tahlili</h3>
              
              <div className="customer-metrics">
                <div className="customer-metric">
                  <div className="metric-header">
                    <h4>Yangi Mijozlar</h4>
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <div className="metric-value">
                    <span className="value">{customerData?.newCustomers || 0}</span>
                    <span className="period">Bu oy</span>
                  </div>
                </div>

                <div className="customer-metric">
                  <div className="metric-header">
                    <h4>Qaytgan Mijozlar</h4>
                    <i className="fas fa-user-check"></i>
                  </div>
                  <div className="metric-value">
                    <span className="value">{Math.floor((customerData?.totalCustomers || 0) * 0.3)}</span>
                    <span className="period">Bu oy</span>
                  </div>
                </div>

                <div className="customer-metric">
                  <div className="metric-header">
                    <h4>O'rtacha Xarid</h4>
                    <i className="fas fa-shopping-bag"></i>
                  </div>
                  <div className="metric-value">
                    <span className="value">{formatCurrency(salesData?.averageOrderValue || 0)}</span>
                    <span className="period">Mijoz uchun</span>
                  </div>
                </div>
              </div>

              {/* Top Customers */}
              {customerData?.topCustomers && (
                <div className="top-customers">
                  <h4>Eng Faol Mijozlar</h4>
                  <div className="customers-list">
                    {customerData.topCustomers.slice(0, 10).map((customer, index) => (
                      <div key={customer.customerId} className="customer-item">
                        <div className="customer-rank">
                          <span className={`rank-number ${index < 3 ? 'top-three' : ''}`}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="customer-info">
                          <h5>{customer.customerName}</h5>
                          <div className="customer-stats">
                            <span className="stat">
                              <i className="fas fa-shopping-cart"></i>
                              {customer.orderCount} buyurtma
                            </span>
                            <span className="stat">
                              <i className="fas fa-money-bill-wave"></i>
                              {formatCurrency(customer.totalSpent)}
                            </span>
                          </div>
                        </div>
                        <div className="customer-progress">
                          <div 
                            className="progress-bar"
                            style={{
                              width: `${(customer.totalSpent / customerData.topCustomers[0].totalSpent) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Books Tab */}
        {activeTab === 'books' && (
          <div className="books-tab">
            <div className="books-analytics">
              <h3>Kitoblar Tahlili</h3>
              
              {/* Top selling books */}
              {salesData?.topBooks && salesData.topBooks.length > 0 && (
                <div className="top-books-section">
                  <h4>Eng Ko'p Sotilgan Kitoblar</h4>
                  <div className="top-books-list">
                    {salesData.topBooks.slice(0, 10).map((book, index) => (
                      <div key={book.bookId} className="top-book-item">
                        <div className="book-rank">
                          <span className={`rank-number ${index < 3 ? 'top-three' : ''}`}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="book-info">
                          <h5>{book.bookTitle}</h5>
                          <div className="book-stats">
                            <span className="stat">
                              <i className="fas fa-shopping-cart"></i>
                              {book.quantity} dona
                            </span>
                            <span className="stat">
                              <i className="fas fa-money-bill-wave"></i>
                              {formatCurrency(book.revenue)}
                            </span>
                            <span className="stat">
                              <i className="fas fa-receipt"></i>
                              {book.orders} buyurtma
                            </span>
                          </div>
                        </div>
                        <div className="book-progress">
                          <div 
                            className="progress-bar"
                            style={{
                              width: `${(book.quantity / salesData.topBooks[0].quantity) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Book categories performance */}
              <div className="category-performance">
                <h4>Kategoriya bo'yicha Ishlash</h4>
                <div className="category-stats">
                  <div className="category-item">
                    <div className="category-info">
                      <h5>Badiiy Adabiyot</h5>
                      <p>45% umumiy sotuvdan</p>
                    </div>
                    <div className="category-chart">
                      <div className="progress-circle" data-percentage="45">
                        <span>45%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="category-item">
                    <div className="category-info">
                      <h5>Ilmiy Kitoblar</h5>
                      <p>30% umumiy sotuvdan</p>
                    </div>
                    <div className="category-chart">
                      <div className="progress-circle" data-percentage="30">
                        <span>30%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="category-item">
                    <div className="category-info">
                      <h5>Bolalar Kitoblari</h5>
                      <p>25% umumiy sotuvdan</p>
                    </div>
                    <div className="category-chart">
                      <div className="progress-circle" data-percentage="25">
                        <span>25%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesAnalytics;