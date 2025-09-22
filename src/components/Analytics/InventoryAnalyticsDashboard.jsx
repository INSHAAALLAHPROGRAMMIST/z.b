import React, { useState, useMemo } from 'react';
import telegramService from '../../services/TelegramService';
import './InventoryAnalyticsDashboard.css';

/**
 * Inventory Analytics Dashboard Component
 * Displays inventory analytics and low stock reporting with Telegram alerts
 */
const InventoryAnalyticsDashboard = ({ data, dateRange }) => {
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'lowstock', 'distribution'
  const [sortBy, setSortBy] = useState('stock'); // 'stock', 'title', 'price'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const [sendingAlerts, setSendingAlerts] = useState(false);

  // Memoized sorted low stock books
  const sortedLowStockBooks = useMemo(() => {
    if (!data?.lowStockBooks) return [];
    
    const sorted = [...data.lowStockBooks].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'stock':
        default:
          aValue = a.stock || 0;
          bValue = b.stock || 0;
          break;
      }
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });
    
    return sorted;
  }, [data?.lowStockBooks, sortBy, sortOrder]);

  // Handle sending Telegram alerts for low stock books
  const handleSendLowStockAlerts = async () => {
    if (!data?.lowStockBooks || data.lowStockBooks.length === 0) {
      alert('Kam stokli kitoblar yo\'q');
      return;
    }

    setSendingAlerts(true);
    
    try {
      const criticalBooks = data.lowStockBooks.filter(book => book.stock <= 2);
      const alertPromises = criticalBooks.slice(0, 5).map(book => 
        telegramService.notifyLowStock(book)
      );
      
      const results = await Promise.all(alertPromises);
      const successCount = results.filter(result => result.success).length;
      
      if (successCount > 0) {
        alert(`${successCount} ta kitob uchun Telegram orqali ogohlantirish yuborildi`);
      } else {
        alert('Telegram orqali ogohlantirish yuborishda xato yuz berdi');
      }
    } catch (error) {
      console.error('Error sending low stock alerts:', error);
      alert('Ogohlantirishlarni yuborishda xato yuz berdi');
    } finally {
      setSendingAlerts(false);
    }
  };

  if (!data) {
    return (
      <div className="inventory-dashboard">
        <div className="no-data">
          <p>Inventar ma'lumotlari mavjud emas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-dashboard">
      {/* Inventory Overview Cards */}
      <div className="inventory-overview">
        <div className="overview-card total-books">
          <div className="card-header">
            <h3>Jami Kitoblar</h3>
            <span className="card-icon">📚</span>
          </div>
          <div className="card-value">{data.totalBooks || 0}</div>
          <div className="card-subtitle">
            Barcha kitoblar soni
          </div>
        </div>

        <div className="overview-card available-books">
          <div className="card-header">
            <h3>Mavjud Kitoblar</h3>
            <span className="card-icon">✅</span>
          </div>
          <div className="card-value">{data.availableBooks || 0}</div>
          <div className="card-subtitle">
            Sotuvga tayyor kitoblar
          </div>
        </div>

        <div className="overview-card out-of-stock">
          <div className="card-header">
            <h3>Tugagan Kitoblar</h3>
            <span className="card-icon">❌</span>
          </div>
          <div className="card-value">{data.outOfStockBooks || 0}</div>
          <div className="card-subtitle">
            Stoki tugagan kitoblar
          </div>
        </div>

        <div className="overview-card low-stock">
          <div className="card-header">
            <h3>Kam Stokli Kitoblar</h3>
            <span className="card-icon">⚠️</span>
          </div>
          <div className="card-value critical">{data.lowStockCount || 0}</div>
          <div className="card-subtitle">
            Diqqat talab qiladi
          </div>
        </div>

        <div className="overview-card inventory-value">
          <div className="card-header">
            <h3>Inventar Qiymati</h3>
            <span className="card-icon">💰</span>
          </div>
          <div className="card-value">
            {(data.totalInventoryValue || 0).toLocaleString()} so'm
          </div>
          <div className="card-subtitle">
            Jami inventar qiymati
          </div>
        </div>

        <div className="overview-card health-score">
          <div className="card-header">
            <h3>Inventar Salomatligi</h3>
            <span className="card-icon">📊</span>
          </div>
          <div className={`card-value ${data.healthScore >= 80 ? 'good' : data.healthScore >= 60 ? 'fair' : 'poor'}`}>
            {data.healthScore || 0}%
          </div>
          <div className="card-subtitle">
            Umumiy holat ko'rsatkichi
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
              className={viewMode === 'lowstock' ? 'active' : ''}
              onClick={() => setViewMode('lowstock')}
            >
              ⚠️ Kam Stok
            </button>
            <button 
              className={viewMode === 'distribution' ? 'active' : ''}
              onClick={() => setViewMode('distribution')}
            >
              📈 Taqsimot
            </button>
          </div>
        </div>

        {viewMode === 'lowstock' && (
          <div className="alert-actions">
            <button 
              className="alert-button"
              onClick={handleSendLowStockAlerts}
              disabled={sendingAlerts || !data.lowStockBooks?.length}
            >
              {sendingAlerts ? '📤 Yuborilmoqda...' : '📢 Telegram Ogohlantirish'}
            </button>
          </div>
        )}
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="overview-content">
          {/* Stock Levels Chart */}
          <div className="stock-levels-chart">
            <div className="chart-header">
              <h3>Stok Darajalari Taqsimoti</h3>
              <div className="chart-legend">
                <span className="legend-item high">
                  <span className="legend-color"></span>
                  Yuqori (20+)
                </span>
                <span className="legend-item medium">
                  <span className="legend-color"></span>
                  O'rtacha (6-20)
                </span>
                <span className="legend-item low">
                  <span className="legend-color"></span>
                  Kam (1-5)
                </span>
                <span className="legend-item out">
                  <span className="legend-color"></span>
                  Tugagan (0)
                </span>
              </div>
            </div>
            
            <div className="stock-bars">
              <div className="stock-bar-item">
                <div className="bar-container">
                  <div 
                    className="stock-bar high"
                    style={{ 
                      height: `${data.stockLevels ? (data.stockLevels.high / data.totalBooks) * 100 : 0}%`,
                      minHeight: '4px'
                    }}
                  ></div>
                </div>
                <div className="bar-label">Yuqori</div>
                <div className="bar-value">{data.stockLevels?.high || 0}</div>
              </div>
              
              <div className="stock-bar-item">
                <div className="bar-container">
                  <div 
                    className="stock-bar medium"
                    style={{ 
                      height: `${data.stockLevels ? (data.stockLevels.medium / data.totalBooks) * 100 : 0}%`,
                      minHeight: '4px'
                    }}
                  ></div>
                </div>
                <div className="bar-label">O'rtacha</div>
                <div className="bar-value">{data.stockLevels?.medium || 0}</div>
              </div>
              
              <div className="stock-bar-item">
                <div className="bar-container">
                  <div 
                    className="stock-bar low"
                    style={{ 
                      height: `${data.stockLevels ? (data.stockLevels.low / data.totalBooks) * 100 : 0}%`,
                      minHeight: '4px'
                    }}
                  ></div>
                </div>
                <div className="bar-label">Kam</div>
                <div className="bar-value">{data.stockLevels?.low || 0}</div>
              </div>
              
              <div className="stock-bar-item">
                <div className="bar-container">
                  <div 
                    className="stock-bar out"
                    style={{ 
                      height: `${data.stockLevels ? (data.stockLevels.out / data.totalBooks) * 100 : 0}%`,
                      minHeight: '4px'
                    }}
                  ></div>
                </div>
                <div className="bar-label">Tugagan</div>
                <div className="bar-value">{data.stockLevels?.out || 0}</div>
              </div>
            </div>
          </div>

          {/* Genre Distribution */}
          <div className="genre-distribution">
            <div className="section-header">
              <h3>Janr Bo'yicha Taqsimot</h3>
              <span className="section-subtitle">
                Kitoblarning janr bo'yicha taqsimoti
              </span>
            </div>
            
            <div className="genre-list">
              {data.genreDistribution && Object.keys(data.genreDistribution).length > 0 ? (
                Object.entries(data.genreDistribution)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 8)
                  .map(([genre, count]) => (
                    <div key={genre} className="genre-item">
                      <div className="genre-info">
                        <span className="genre-name">{genre}</span>
                        <span className="genre-count">{count} kitob</span>
                      </div>
                      <div className="genre-bar">
                        <div 
                          className="genre-fill"
                          style={{ 
                            width: `${(count / Math.max(...Object.values(data.genreDistribution))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="no-genre-data">
                  <p>Janr ma'lumotlari yo'q</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Mode */}
      {viewMode === 'lowstock' && (
        <div className="lowstock-content">
          <div className="lowstock-header">
            <div className="header-info">
              <h3>Kam Stokli Kitoblar</h3>
              <span className="subtitle">
                {data.lowStockCount || 0} ta kitobning stoki kam
              </span>
            </div>
            
            <div className="sort-controls">
              <label>Saralash:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="stock">Stok miqdori</option>
                <option value="title">Kitob nomi</option>
                <option value="price">Narx</option>
              </select>
              <button 
                className="sort-order-btn"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <div className="lowstock-list">
            {sortedLowStockBooks.length > 0 ? (
              sortedLowStockBooks.map((book, index) => (
                <div key={book.id || index} className={`lowstock-item ${book.stock === 0 ? 'out-of-stock' : book.stock <= 2 ? 'critical' : 'warning'}`}>
                  <div className="book-info">
                    <div className="book-title">{book.title || 'Noma\'lum kitob'}</div>
                    <div className="book-author">{book.authorName || 'Noma\'lum muallif'}</div>
                  </div>
                  
                  <div className="stock-info">
                    <div className="current-stock">
                      <span className="stock-label">Joriy stok:</span>
                      <span className={`stock-value ${book.stock === 0 ? 'zero' : book.stock <= 2 ? 'critical' : 'low'}`}>
                        {book.stock || 0}
                      </span>
                    </div>
                    <div className="threshold-info">
                      <span className="threshold-label">Chegara:</span>
                      <span className="threshold-value">{book.threshold || 5}</span>
                    </div>
                  </div>
                  
                  <div className="book-price">
                    {(book.price || 0).toLocaleString()} so'm
                  </div>
                  
                  <div className="urgency-indicator">
                    {book.stock === 0 ? (
                      <span className="urgency-badge out">Tugagan</span>
                    ) : book.stock <= 2 ? (
                      <span className="urgency-badge critical">Kritik</span>
                    ) : (
                      <span className="urgency-badge warning">Kam</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-lowstock-data">
                <div className="no-data-icon">✅</div>
                <h4>Ajoyib! Kam stokli kitoblar yo'q</h4>
                <p>Barcha kitoblar yetarli miqdorda mavjud</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Distribution Mode */}
      {viewMode === 'distribution' && (
        <div className="distribution-content">
          <div className="distribution-grid">
            {/* Stock Distribution Pie Chart */}
            <div className="distribution-chart">
              <div className="chart-header">
                <h3>Stok Taqsimoti</h3>
              </div>
              
              <div className="pie-chart-container">
                <div className="pie-chart">
                  {/* This would be a proper pie chart in a real implementation */}
                  <div className="pie-segment high" style={{ '--percentage': data.stockLevels ? (data.stockLevels.high / data.totalBooks) * 100 : 0 }}></div>
                  <div className="pie-segment medium" style={{ '--percentage': data.stockLevels ? (data.stockLevels.medium / data.totalBooks) * 100 : 0 }}></div>
                  <div className="pie-segment low" style={{ '--percentage': data.stockLevels ? (data.stockLevels.low / data.totalBooks) * 100 : 0 }}></div>
                  <div className="pie-segment out" style={{ '--percentage': data.stockLevels ? (data.stockLevels.out / data.totalBooks) * 100 : 0 }}></div>
                </div>
                
                <div className="pie-legend">
                  <div className="legend-item">
                    <span className="legend-dot high"></span>
                    <span>Yuqori: {data.stockLevels?.high || 0}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot medium"></span>
                    <span>O'rtacha: {data.stockLevels?.medium || 0}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot low"></span>
                    <span>Kam: {data.stockLevels?.low || 0}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot out"></span>
                    <span>Tugagan: {data.stockLevels?.out || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Health Metrics */}
            <div className="health-metrics">
              <div className="chart-header">
                <h3>Inventar Salomatligi</h3>
              </div>
              
              <div className="health-score-display">
                <div className={`health-circle ${data.healthScore >= 80 ? 'good' : data.healthScore >= 60 ? 'fair' : 'poor'}`}>
                  <span className="health-percentage">{data.healthScore || 0}%</span>
                </div>
                
                <div className="health-details">
                  <div className="health-item">
                    <span className="health-label">Mavjudlik darajasi:</span>
                    <span className="health-value">
                      {data.totalBooks > 0 ? Math.round((data.availableBooks / data.totalBooks) * 100) : 0}%
                    </span>
                  </div>
                  <div className="health-item">
                    <span className="health-label">Stok yetarliligi:</span>
                    <span className="health-value">
                      {data.totalBooks > 0 ? Math.round(((data.totalBooks - data.lowStockCount) / data.totalBooks) * 100) : 0}%
                    </span>
                  </div>
                  <div className="health-item">
                    <span className="health-label">Inventar aylanishi:</span>
                    <span className="health-value">Yaxshi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryAnalyticsDashboard;