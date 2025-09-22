import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

const RevenueMetrics = () => {
  const { analytics, loading, error } = useAnalytics();
  const [timeRange, setTimeRange] = useState('month'); // week, month, quarter, year
  const [selectedMetric, setSelectedMetric] = useState('revenue'); // revenue, profit, customers, performance
  const [targets, setTargets] = useState({
    monthlyRevenue: 50000000, // 50M UZS
    monthlyOrders: 500,
    customerRetention: 80, // 80%
    profitMargin: 25 // 25%
  });

  // Calculate revenue metrics
  const calculateRevenueMetrics = () => {
    if (!analytics.sales.totalRevenue) return null;

    const currentRevenue = analytics.sales.totalRevenue;
    const currentOrders = analytics.orders.completedOrdersCount;
    const averageOrderValue = currentOrders > 0 ? currentRevenue / currentOrders : 0;
    
    // Mock previous period data (in real app, this would come from analytics service)
    const previousRevenue = currentRevenue * 0.85; // 15% growth simulation
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    // Calculate profit margin (mock data - in real app, would need cost data)
    const estimatedCosts = currentRevenue * 0.75; // 75% costs, 25% profit
    const profit = currentRevenue - estimatedCosts;
    const profitMargin = currentRevenue > 0 ? (profit / currentRevenue) * 100 : 0;

    return {
      currentRevenue,
      previousRevenue,
      revenueGrowth,
      profit,
      profitMargin,
      averageOrderValue,
      currentOrders
    };
  };

  // Calculate customer metrics
  const calculateCustomerMetrics = () => {
    const totalCustomers = analytics.customers.totalCustomers || 0;
    const newCustomers = Math.floor(totalCustomers * 0.15); // Mock 15% new customers
    const returningCustomers = totalCustomers - newCustomers;
    const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
    
    // Customer acquisition cost (mock)
    const marketingSpend = 5000000; // 5M UZS mock marketing spend
    const acquisitionCost = newCustomers > 0 ? marketingSpend / newCustomers : 0;
    
    // Customer lifetime value (mock)
    const avgOrdersPerCustomer = 3.5;
    const avgOrderValue = calculateRevenueMetrics()?.averageOrderValue || 0;
    const customerLifetimeValue = avgOrdersPerCustomer * avgOrderValue;

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      retentionRate,
      acquisitionCost,
      customerLifetimeValue
    };
  };

  // Calculate performance KPIs
  const calculatePerformanceKPIs = () => {
    const metrics = calculateRevenueMetrics();
    const customerMetrics = calculateCustomerMetrics();
    
    if (!metrics) return null;

    const kpis = [
      {
        name: 'Oylik Daromad',
        current: metrics.currentRevenue,
        target: targets.monthlyRevenue,
        unit: 'UZS',
        type: 'currency'
      },
      {
        name: 'Oylik Buyurtmalar',
        current: metrics.currentOrders,
        target: targets.monthlyOrders,
        unit: 'ta',
        type: 'number'
      },
      {
        name: 'Mijoz Saqlanishi',
        current: customerMetrics.retentionRate,
        target: targets.customerRetention,
        unit: '%',
        type: 'percentage'
      },
      {
        name: 'Foyda Marjasi',
        current: metrics.profitMargin,
        target: targets.profitMargin,
        unit: '%',
        type: 'percentage'
      }
    ];

    return kpis.map(kpi => ({
      ...kpi,
      achievement: kpi.target > 0 ? (kpi.current / kpi.target) * 100 : 0,
      status: kpi.current >= kpi.target ? 'success' : 
              kpi.current >= kpi.target * 0.8 ? 'warning' : 'danger'
    }));
  };

  // Generate chart data for revenue trends
  const getRevenueChartData = () => {
    // Mock data for demonstration
    const labels = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun'];
    const revenueData = [35000000, 42000000, 38000000, 45000000, 52000000, 48000000];
    const profitData = revenueData.map(revenue => revenue * 0.25);

    return {
      labels,
      datasets: [
        {
          label: 'Daromad',
          data: revenueData,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Foyda',
          data: profitData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  // Generate customer acquisition chart data
  const getCustomerChartData = () => {
    const labels = ['Yangi', 'Qaytgan', 'VIP'];
    const customerMetrics = calculateCustomerMetrics();
    const vipCustomers = Math.floor(customerMetrics.totalCustomers * 0.1); // 10% VIP

    return {
      labels,
      datasets: [
        {
          data: [customerMetrics.newCustomers, customerMetrics.returningCustomers, vipCustomers],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)'
          ],
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(245, 158, 11)'
          ],
          borderWidth: 2
        }
      ]
    };
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

  if (loading) {
    return (
      <div className="revenue-metrics-loading">
        <div className="loading-spinner"></div>
        <p>Revenue ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-metrics-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Xato yuz berdi</h3>
        <p>{error}</p>
        <button 
          className="retry-btn"
          onClick={() => window.location.reload()}
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  const revenueMetrics = calculateRevenueMetrics();
  const customerMetrics = calculateCustomerMetrics();
  const performanceKPIs = calculatePerformanceKPIs();

  if (!revenueMetrics) {
    return (
      <div className="no-revenue-data">
        <i className="fas fa-chart-line"></i>
        <h3>Ma'lumotlar yo'q</h3>
        <p>Revenue ma'lumotlari hali mavjud emas</p>
      </div>
    );
  }

  return (
    <div className="revenue-metrics">
      {/* Header */}
      <div className="revenue-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-dollar-sign"></i>
            Revenue va Performance Metrics
          </h2>
          <p>Moliyaviy ko'rsatkichlar va performance tahlili</p>
        </div>
        
        <div className="header-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="week">Bu hafta</option>
            <option value="month">Bu oy</option>
            <option value="quarter">Bu chorak</option>
            <option value="year">Bu yil</option>
          </select>
          
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="metric-select"
          >
            <option value="revenue">Revenue</option>
            <option value="profit">Foyda</option>
            <option value="customers">Mijozlar</option>
            <option value="performance">Performance</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="key-metrics">
        <div className="metric-card revenue">
          <div className="metric-icon">
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <div className="metric-content">
            <h3>{formatCurrency(revenueMetrics.currentRevenue)}</h3>
            <p>Jami Daromad</p>
            <div className={`metric-change ${revenueMetrics.revenueGrowth >= 0 ? 'positive' : 'negative'}`}>
              <i className={`fas fa-arrow-${revenueMetrics.revenueGrowth >= 0 ? 'up' : 'down'}`}></i>
              <span>{Math.abs(revenueMetrics.revenueGrowth).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="metric-card profit">
          <div className="metric-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="metric-content">
            <h3>{formatCurrency(revenueMetrics.profit)}</h3>
            <p>Sof Foyda</p>
            <div className="metric-detail">
              <span>{revenueMetrics.profitMargin.toFixed(1)}% margin</span>
            </div>
          </div>
        </div>

        <div className="metric-card orders">
          <div className="metric-icon">
            <i className="fas fa-shopping-cart"></i>
          </div>
          <div className="metric-content">
            <h3>{formatCurrency(revenueMetrics.averageOrderValue)}</h3>
            <p>O'rtacha Buyurtma</p>
            <div className="metric-detail">
              <span>{formatNumber(revenueMetrics.currentOrders)} buyurtma</span>
            </div>
          </div>
        </div>

        <div className="metric-card customers">
          <div className="metric-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="metric-content">
            <h3>{customerMetrics.retentionRate.toFixed(1)}%</h3>
            <p>Mijoz Saqlanishi</p>
            <div className="metric-detail">
              <span>{formatNumber(customerMetrics.totalCustomers)} mijoz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance KPIs */}
      <div className="performance-kpis">
        <div className="kpis-header">
          <h3>Performance KPI Dashboard</h3>
          <p>Maqsadlar va hozirgi natijalar</p>
        </div>
        
        <div className="kpis-grid">
          {performanceKPIs.map((kpi, index) => (
            <div key={index} className={`kpi-card ${kpi.status}`}>
              <div className="kpi-header">
                <h4>{kpi.name}</h4>
                <div className={`kpi-status ${kpi.status}`}>
                  {kpi.status === 'success' && <i className="fas fa-check-circle"></i>}
                  {kpi.status === 'warning' && <i className="fas fa-exclamation-triangle"></i>}
                  {kpi.status === 'danger' && <i className="fas fa-times-circle"></i>}
                </div>
              </div>
              
              <div className="kpi-values">
                <div className="current-value">
                  <span className="label">Hozirgi:</span>
                  <span className="value">
                    {kpi.type === 'currency' ? formatCurrency(kpi.current) :
                     kpi.type === 'percentage' ? `${kpi.current.toFixed(1)}%` :
                     formatNumber(kpi.current)}
                  </span>
                </div>
                <div className="target-value">
                  <span className="label">Maqsad:</span>
                  <span className="value">
                    {kpi.type === 'currency' ? formatCurrency(kpi.target) :
                     kpi.type === 'percentage' ? `${kpi.target}%` :
                     formatNumber(kpi.target)}
                  </span>
                </div>
              </div>
              
              <div className="kpi-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${Math.min(kpi.achievement, 100)}%`,
                      backgroundColor: kpi.status === 'success' ? '#10b981' :
                                     kpi.status === 'warning' ? '#f59e0b' : '#ef4444'
                    }}
                  ></div>
                </div>
                <span className="achievement-text">
                  {kpi.achievement.toFixed(1)}% bajarildi
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container revenue-chart">
          <div className="chart-header">
            <h3>Revenue va Foyda Trendi</h3>
            <p>Oylik daromad va foyda dinamikasi</p>
          </div>
          <div className="chart-content">
            <Line 
              data={getRevenueChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value);
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="chart-container customer-chart">
          <div className="chart-header">
            <h3>Mijozlar Taqsimoti</h3>
            <p>Mijozlar kategoriyasi bo'yicha</p>
          </div>
          <div className="chart-content">
            <Doughnut 
              data={getCustomerChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        return `${context.label}: ${context.parsed} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Customer Metrics Detail */}
      <div className="customer-metrics-detail">
        <div className="metrics-header">
          <h3>Mijozlar Analytics</h3>
          <p>Mijoz acquisition va retention ko'rsatkichlari</p>
        </div>
        
        <div className="customer-stats">
          <div className="stat-item">
            <div className="stat-icon">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="stat-content">
              <h4>{formatNumber(customerMetrics.newCustomers)}</h4>
              <p>Yangi Mijozlar</p>
              <small>Bu oyda qo'shilgan</small>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <div className="stat-content">
              <h4>{formatNumber(customerMetrics.returningCustomers)}</h4>
              <p>Qaytgan Mijozlar</p>
              <small>{customerMetrics.retentionRate.toFixed(1)}% retention</small>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="stat-content">
              <h4>{formatCurrency(customerMetrics.acquisitionCost)}</h4>
              <p>Acquisition Cost</p>
              <small>Har bir yangi mijoz uchun</small>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <i className="fas fa-gem"></i>
            </div>
            <div className="stat-content">
              <h4>{formatCurrency(customerMetrics.customerLifetimeValue)}</h4>
              <p>Lifetime Value</p>
              <small>O'rtacha mijoz qiymati</small>
            </div>
          </div>
        </div>
      </div>

      {/* Targets Configuration */}
      <div className="targets-config">
        <div className="config-header">
          <h3>Maqsadlar Sozlamalari</h3>
          <p>KPI maqsadlarini o'zgartiring</p>
        </div>
        
        <div className="targets-form">
          <div className="target-input">
            <label>Oylik Daromad Maqsadi (UZS):</label>
            <input
              type="number"
              value={targets.monthlyRevenue}
              onChange={(e) => setTargets(prev => ({ ...prev, monthlyRevenue: parseInt(e.target.value) }))}
            />
          </div>
          
          <div className="target-input">
            <label>Oylik Buyurtmalar Maqsadi:</label>
            <input
              type="number"
              value={targets.monthlyOrders}
              onChange={(e) => setTargets(prev => ({ ...prev, monthlyOrders: parseInt(e.target.value) }))}
            />
          </div>
          
          <div className="target-input">
            <label>Mijoz Saqlanish Maqsadi (%):</label>
            <input
              type="number"
              value={targets.customerRetention}
              onChange={(e) => setTargets(prev => ({ ...prev, customerRetention: parseInt(e.target.value) }))}
            />
          </div>
          
          <div className="target-input">
            <label>Foyda Marjasi Maqsadi (%):</label>
            <input
              type="number"
              value={targets.profitMargin}
              onChange={(e) => setTargets(prev => ({ ...prev, profitMargin: parseInt(e.target.value) }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueMetrics;