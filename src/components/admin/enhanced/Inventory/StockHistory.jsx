import React, { useState, useEffect } from 'react';
import inventoryService from '../../../../services/InventoryService';

const StockHistory = ({ bookId, bookTitle, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, increase, decrease, set
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadStockHistory();
  }, [bookId, limit]);

  const loadStockHistory = async () => {
    try {
      setLoading(true);
      const result = await inventoryService.getStockHistory(bookId, limit);
      
      if (result.success) {
        setHistory(result.data || []);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Load stock history error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredHistory = () => {
    if (filter === 'all') return history;

    return history.filter(entry => {
      const oldStock = entry.oldStock || 0;
      const newStock = entry.newStock || 0;

      switch (filter) {
        case 'increase':
          return newStock > oldStock;
        case 'decrease':
          return newStock < oldStock;
        case 'set':
          return entry.reason?.toLowerCase().includes('set') || 
                 entry.reason?.toLowerCase().includes('o\'rnatish');
        default:
          return true;
      }
    });
  };

  const getChangeType = (oldStock, newStock) => {
    if (newStock > oldStock) return 'increase';
    if (newStock < oldStock) return 'decrease';
    return 'no-change';
  };

  const getChangeIcon = (changeType) => {
    switch (changeType) {
      case 'increase':
        return <i className="fas fa-arrow-up text-success"></i>;
      case 'decrease':
        return <i className="fas fa-arrow-down text-danger"></i>;
      default:
        return <i className="fas fa-equals text-muted"></i>;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredHistory = getFilteredHistory();

  return (
    <div className="stock-history-modal">
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <div className="header-info">
              <h3>
                <i className="fas fa-history"></i>
                Stock Tarixi
              </h3>
              <p>{bookTitle}</p>
            </div>
            <button className="close-btn" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Controls */}
          <div className="history-controls">
            <div className="filter-controls">
              <label>Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Barcha o'zgarishlar</option>
                <option value="increase">Oshirilgan</option>
                <option value="decrease">Kamaytirilgan</option>
                <option value="set">O'rnatilgan</option>
              </select>
            </div>

            <div className="limit-controls">
              <label>Ko'rsatish:</label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
              >
                <option value="25">25 ta</option>
                <option value="50">50 ta</option>
                <option value="100">100 ta</option>
                <option value="200">200 ta</option>
              </select>
            </div>

            <div className="history-stats">
              <span>Jami: {history.length} ta yozuv</span>
              <span>Ko'rsatilgan: {filteredHistory.length} ta</span>
            </div>
          </div>

          {/* Content */}
          <div className="modal-body">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Stock tarixi yuklanmoqda...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle"></i>
                <h4>Xato yuz berdi</h4>
                <p>{error}</p>
                <button className="retry-btn" onClick={loadStockHistory}>
                  Qayta urinish
                </button>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-history"></i>
                <h4>Stock tarixi yo'q</h4>
                <p>Bu kitob uchun hali stock o'zgarishlari qayd etilmagan.</p>
              </div>
            ) : (
              <div className="history-list">
                {filteredHistory.map((entry, index) => {
                  const changeType = getChangeType(entry.oldStock, entry.newStock);
                  const stockDiff = (entry.newStock || 0) - (entry.oldStock || 0);

                  return (
                    <div key={index} className={`history-entry ${changeType}`}>
                      <div className="entry-icon">
                        {getChangeIcon(changeType)}
                      </div>

                      <div className="entry-content">
                        <div className="entry-header">
                          <div className="stock-change">
                            <span className="old-stock">{entry.oldStock || 0}</span>
                            <i className="fas fa-arrow-right"></i>
                            <span className="new-stock">{entry.newStock || 0}</span>
                            <span className={`stock-diff ${changeType}`}>
                              ({stockDiff > 0 ? '+' : ''}{stockDiff})
                            </span>
                          </div>
                          <div className="entry-date">
                            {formatDate(entry.createdAt)}
                          </div>
                        </div>

                        <div className="entry-details">
                          {entry.reason && (
                            <div className="entry-reason">
                              <i className="fas fa-comment"></i>
                              <span>{entry.reason}</span>
                            </div>
                          )}
                          
                          {entry.adminId && (
                            <div className="entry-admin">
                              <i className="fas fa-user"></i>
                              <span>Admin: {entry.adminId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="entry-meta">
                        <div className="change-indicator">
                          {changeType === 'increase' && (
                            <span className="increase-badge">+{stockDiff}</span>
                          )}
                          {changeType === 'decrease' && (
                            <span className="decrease-badge">{stockDiff}</span>
                          )}
                          {changeType === 'no-change' && (
                            <span className="no-change-badge">0</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <div className="footer-info">
              <p>Stock o'zgarishlari avtomatik ravishda saqlanadi</p>
            </div>
            <div className="footer-actions">
              <button className="close-footer-btn" onClick={onClose}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockHistory;