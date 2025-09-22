import React, { useState } from 'react';
import { useInventory } from '../../../../hooks/useInventory';
import { STOCK_STATUS, getStockStatusColor, getStockStatusText } from '../../../../utils/inventoryUtils';

const StockOverview = () => {
  const { stockData, loading, error } = useInventory();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDisplayBooks = () => {
    if (selectedCategory === 'all') {
      return [
        ...stockData.categories.inStock,
        ...stockData.categories.lowStock,
        ...stockData.categories.outOfStock,
        ...stockData.categories.preOrder,
        ...stockData.categories.discontinued
      ];
    }
    return stockData.categories[selectedCategory] || [];
  };

  const getCategoryStats = () => {
    return [
      {
        key: 'inStock',
        label: 'Mavjud',
        count: stockData.categories.inStock.length,
        color: getStockStatusColor(STOCK_STATUS.IN_STOCK),
        icon: 'fas fa-check-circle'
      },
      {
        key: 'lowStock',
        label: 'Kam qolgan',
        count: stockData.categories.lowStock.length,
        color: getStockStatusColor(STOCK_STATUS.LOW_STOCK),
        icon: 'fas fa-exclamation-triangle'
      },
      {
        key: 'outOfStock',
        label: 'Tugagan',
        count: stockData.categories.outOfStock.length,
        color: getStockStatusColor(STOCK_STATUS.OUT_OF_STOCK),
        icon: 'fas fa-times-circle'
      },
      {
        key: 'preOrder',
        label: 'Pre-order',
        count: stockData.categories.preOrder.length,
        color: getStockStatusColor(STOCK_STATUS.PRE_ORDER),
        icon: 'fas fa-clock'
      },
      {
        key: 'discontinued',
        label: 'To\'xtatilgan',
        count: stockData.categories.discontinued.length,
        color: getStockStatusColor(STOCK_STATUS.DISCONTINUED),
        icon: 'fas fa-ban'
      }
    ];
  };

  if (loading) {
    return (
      <div className="stock-overview-loading">
        <div className="loading-spinner"></div>
        <p>Stock ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-overview-error">
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

  return (
    <div className="stock-overview">
      {/* Header */}
      <div className="stock-overview-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-boxes"></i>
            Stock Ko'rinishi
          </h2>
          <p>Real-time inventory monitoring va stock holati</p>
        </div>
        <div className="last-updated">
          <i className="fas fa-clock"></i>
          Oxirgi yangilanish: {stockData.lastUpdated ? 
            new Date(stockData.lastUpdated).toLocaleString('uz-UZ') : 
            'Noma\'lum'
          }
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stock-statistics">
        <div className="stat-card total-books">
          <div className="stat-icon">
            <i className="fas fa-book"></i>
          </div>
          <div className="stat-content">
            <h3>{stockData.totalBooks}</h3>
            <p>Jami kitoblar</p>
          </div>
        </div>

        <div className="stat-card total-stock">
          <div className="stat-icon">
            <i className="fas fa-cubes"></i>
          </div>
          <div className="stat-content">
            <h3>{stockData.statistics.totalStock}</h3>
            <p>Jami stock</p>
          </div>
        </div>

        <div className="stat-card total-value">
          <div className="stat-icon">
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(stockData.statistics.totalValue)}</h3>
            <p>Jami qiymat</p>
          </div>
        </div>

        <div className="stat-card average-stock">
          <div className="stat-icon">
            <i className="fas fa-chart-bar"></i>
          </div>
          <div className="stat-content">
            <h3>{Math.round(stockData.statistics.averageStock)}</h3>
            <p>O'rtacha stock</p>
          </div>
        </div>
      </div>

      {/* Stock Alerts */}
      {stockData.alerts.length > 0 && (
        <div className="stock-alerts">
          <h3>
            <i className="fas fa-bell"></i>
            Stock Ogohlantirishlari ({stockData.alerts.length})
          </h3>
          <div className="alerts-list">
            {stockData.alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className={`alert-item ${alert.type}`}>
                <div className="alert-icon">
                  <i className={alert.type === 'out_of_stock' ? 'fas fa-times-circle' : 'fas fa-exclamation-triangle'}></i>
                </div>
                <div className="alert-content">
                  <p>{alert.message}</p>
                  <small>Kitob: {alert.book.title}</small>
                </div>
                <div className="alert-stock">
                  <span className="stock-badge" style={{ 
                    backgroundColor: getStockStatusColor(alert.book.stockStatus) 
                  }}>
                    {alert.book.stock || 0}
                  </span>
                </div>
              </div>
            ))}
            {stockData.alerts.length > 5 && (
              <div className="more-alerts">
                <p>Va yana {stockData.alerts.length - 5} ta ogohlantirish...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div className="category-filters">
        <button
          className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <i className="fas fa-list"></i>
          Barchasi ({stockData.totalBooks})
        </button>
        {getCategoryStats().map(category => (
          <button
            key={category.key}
            className={`category-btn ${selectedCategory === category.key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.key)}
            style={{ borderColor: category.color }}
          >
            <i className={category.icon}></i>
            {category.label} ({category.count})
          </button>
        ))}
      </div>

      {/* Stock Status Visualization */}
      <div className="stock-visualization">
        <div className="visualization-header">
          <h3>Stock Holati Diagrammasi</h3>
        </div>
        <div className="stock-chart">
          {getCategoryStats().map(category => {
            const percentage = stockData.totalBooks > 0 ? 
              (category.count / stockData.totalBooks) * 100 : 0;
            
            return (
              <div key={category.key} className="chart-segment">
                <div className="segment-info">
                  <div 
                    className="color-indicator"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="segment-label">{category.label}</span>
                  <span className="segment-count">{category.count}</span>
                  <span className="segment-percentage">({percentage.toFixed(1)}%)</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: category.color 
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Books List */}
      <div className="books-list">
        <div className="list-header">
          <h3>
            {selectedCategory === 'all' ? 'Barcha kitoblar' : 
             getCategoryStats().find(c => c.key === selectedCategory)?.label || 'Kitoblar'}
            ({getDisplayBooks().length})
          </h3>
        </div>
        
        <div className="books-grid">
          {getDisplayBooks().slice(0, 20).map(book => (
            <div key={book.id} className="book-card">
              <div className="book-image">
                {book.imageUrl ? (
                  <img src={book.imageUrl} alt={book.title} />
                ) : (
                  <div className="no-image">
                    <i className="fas fa-book"></i>
                  </div>
                )}
              </div>
              
              <div className="book-info">
                <h4 className="book-title">{book.title}</h4>
                <p className="book-author">{book.author}</p>
                <p className="book-price">{formatCurrency(book.price || 0)}</p>
              </div>
              
              <div className="book-stock">
                <div 
                  className="stock-status"
                  style={{ backgroundColor: getStockStatusColor(book.stockStatus) }}
                >
                  {getStockStatusText(book.stockStatus, book.stock)}
                </div>
                <div className="stock-details">
                  <span>Stock: {book.stock || 0}</span>
                  <span>Min: {book.minStockLevel || 5}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {getDisplayBooks().length > 20 && (
          <div className="load-more">
            <p>Va yana {getDisplayBooks().length - 20} ta kitob...</p>
            <button className="load-more-btn">
              Ko'proq ko'rsatish
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockOverview;