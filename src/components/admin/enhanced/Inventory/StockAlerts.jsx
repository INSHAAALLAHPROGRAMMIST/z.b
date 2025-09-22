import React, { useState } from 'react';
import { useStockAlerts } from '../../../../hooks/useInventory';
import { STOCK_STATUS, getStockStatusColor, getStockStatusText } from '../../../../utils/inventoryUtils';
import StockHistory from './StockHistory';

const StockAlerts = () => {
  const { alerts, loading, error, updateStock, setAlertLevel } = useStockAlerts();
  const [filter, setFilter] = useState('all'); // all, critical, low, out_of_stock
  const [sortBy, setSortBy] = useState('stock'); // stock, title, updated
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(null);

  const getFilteredAlerts = () => {
    let filtered = [...alerts];

    // Apply filter
    switch (filter) {
      case 'critical':
        filtered = filtered.filter(book => book.stock === 0);
        break;
      case 'low':
        filtered = filtered.filter(book => book.stock > 0 && book.stockStatus === STOCK_STATUS.LOW_STOCK);
        break;
      case 'out_of_stock':
        filtered = filtered.filter(book => book.stock === 0);
        break;
      default:
        // all - no additional filtering
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'stock':
        filtered.sort((a, b) => (a.stock || 0) - (b.stock || 0));
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title, 'uz'));
        break;
      case 'updated':
        filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
      default:
        break;
    }

    return filtered;
  };

  const handleStockUpdate = async (bookId, newStock) => {
    const result = await updateStock(bookId, newStock, 'Quick update from alerts');
    if (!result.success) {
      alert(`Stock yangilashda xato: ${result.error}`);
    }
  };

  const handleSetAlertLevel = async (bookId, minStockLevel) => {
    const result = await setAlertLevel(bookId, minStockLevel);
    if (!result.success) {
      alert(`Alert level sozlashda xato: ${result.error}`);
    }
  };

  const getAlertPriority = (book) => {
    if (book.stock === 0) return 'critical';
    if (book.stock <= (book.minStockLevel || 5) / 2) return 'high';
    return 'medium';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="stock-alerts-loading">
        <div className="loading-spinner"></div>
        <p>Stock ogohlantirishlari yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-alerts-error">
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

  const filteredAlerts = getFilteredAlerts();
  const criticalCount = alerts.filter(book => book.stock === 0).length;
  const lowStockCount = alerts.filter(book => book.stock > 0).length;

  return (
    <div className="stock-alerts">
      {/* Header */}
      <div className="alerts-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-bell"></i>
            Stock Ogohlantirishlari
          </h2>
          <p>Kam qolgan va tugagan kitoblar ro'yxati</p>
        </div>
        
        <div className="header-stats">
          <div className="stat-badge critical">
            <i className="fas fa-times-circle"></i>
            <span>{criticalCount} tugagan</span>
          </div>
          <div className="stat-badge warning">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{lowStockCount} kam qolgan</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="alerts-controls">
        <div className="filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Barchasi ({alerts.length})
          </button>
          <button
            className={`filter-btn ${filter === 'critical' ? 'active' : ''}`}
            onClick={() => setFilter('critical')}
          >
            Kritik ({criticalCount})
          </button>
          <button
            className={`filter-btn ${filter === 'low' ? 'active' : ''}`}
            onClick={() => setFilter('low')}
          >
            Kam qolgan ({lowStockCount})
          </button>
        </div>

        <div className="sort-controls">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="stock">Stock bo'yicha</option>
            <option value="title">Nom bo'yicha</option>
            <option value="updated">Yangilanish bo'yicha</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="no-alerts">
          <i className="fas fa-check-circle"></i>
          <h3>Ogohlantirishlar yo'q</h3>
          <p>Barcha kitoblar stock holati yaxshi!</p>
        </div>
      ) : (
        <div className="alerts-list">
          {filteredAlerts.map(book => {
            const priority = getAlertPriority(book);
            const stockValue = (book.stock || 0) * (book.price || 0);
            
            return (
              <div key={book.id} className={`alert-card ${priority}`}>
                <div className="alert-priority">
                  <div className={`priority-indicator ${priority}`}>
                    {priority === 'critical' && <i className="fas fa-times-circle"></i>}
                    {priority === 'high' && <i className="fas fa-exclamation-triangle"></i>}
                    {priority === 'medium' && <i className="fas fa-exclamation"></i>}
                  </div>
                </div>

                <div className="book-image">
                  {book.imageUrl ? (
                    <img src={book.imageUrl} alt={book.title} />
                  ) : (
                    <div className="no-image">
                      <i className="fas fa-book"></i>
                    </div>
                  )}
                </div>

                <div className="book-details">
                  <h4 className="book-title">{book.title}</h4>
                  <p className="book-author">{book.author}</p>
                  <p className="book-price">{formatCurrency(book.price || 0)}</p>
                  
                  <div className="stock-info">
                    <div className="current-stock">
                      <span className="label">Hozirgi stock:</span>
                      <span className={`stock-value ${book.stock === 0 ? 'zero' : 'low'}`}>
                        {book.stock || 0}
                      </span>
                    </div>
                    <div className="min-stock">
                      <span className="label">Minimum:</span>
                      <span className="min-value">{book.minStockLevel || 5}</span>
                    </div>
                    <div className="stock-value-amount">
                      <span className="label">Qiymat:</span>
                      <span className="value-amount">{formatCurrency(stockValue)}</span>
                    </div>
                  </div>

                  <div className="last-updated">
                    <i className="fas fa-clock"></i>
                    Oxirgi yangilanish: {new Date(book.updatedAt).toLocaleString('uz-UZ')}
                  </div>
                </div>

                <div className="alert-actions">
                  <div className="quick-stock-update">
                    <label>Tezkor yangilash:</label>
                    <div className="stock-buttons">
                      <button
                        className="stock-btn"
                        onClick={() => handleStockUpdate(book.id, (book.stock || 0) + 1)}
                      >
                        +1
                      </button>
                      <button
                        className="stock-btn"
                        onClick={() => handleStockUpdate(book.id, (book.stock || 0) + 5)}
                      >
                        +5
                      </button>
                      <button
                        className="stock-btn"
                        onClick={() => handleStockUpdate(book.id, (book.stock || 0) + 10)}
                      >
                        +10
                      </button>
                    </div>
                  </div>

                  <div className="alert-settings">
                    <button
                      className="settings-btn"
                      onClick={() => setShowSettings(showSettings === book.id ? null : book.id)}
                    >
                      <i className="fas fa-cog"></i>
                      Sozlamalar
                    </button>
                  </div>

                  {showSettings === book.id && (
                    <div className="settings-panel">
                      <div className="setting-item">
                        <label>Minimum stock level:</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          defaultValue={book.minStockLevel || 5}
                          onBlur={(e) => {
                            const newLevel = parseInt(e.target.value);
                            if (newLevel > 0) {
                              handleSetAlertLevel(book.id, newLevel);
                            }
                          }}
                        />
                      </div>
                      <div className="setting-actions">
                        <button
                          className="view-history-btn"
                          onClick={() => setShowHistory({ id: book.id, title: book.title })}
                        >
                          <i className="fas fa-history"></i>
                          Tarix
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {filteredAlerts.length > 0 && (
        <div className="alerts-summary">
          <div className="summary-stats">
            <div className="summary-item">
              <span className="label">Jami ogohlantirishlar:</span>
              <span className="value">{filteredAlerts.length}</span>
            </div>
            <div className="summary-item">
              <span className="label">Jami qiymat:</span>
              <span className="value">
                {formatCurrency(
                  filteredAlerts.reduce((sum, book) => 
                    sum + ((book.stock || 0) * (book.price || 0)), 0
                  )
                )}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">O'rtacha stock:</span>
              <span className="value">
                {Math.round(
                  filteredAlerts.reduce((sum, book) => sum + (book.stock || 0), 0) / 
                  filteredAlerts.length
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showHistory && (
        <StockHistory
          bookId={showHistory.id}
          bookTitle={showHistory.title}
          onClose={() => setShowHistory(null)}
        />
      )}
    </div>
  );
};

export default StockAlerts;