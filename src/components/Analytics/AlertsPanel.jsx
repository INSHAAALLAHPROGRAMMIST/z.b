import React, { useState } from 'react';
import './AlertsPanel.css';

/**
 * Alerts Panel Component
 * Displays system alerts and notifications with action buttons
 */
const AlertsPanel = ({ alerts = [] }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [expandedAlert, setExpandedAlert] = useState(null);

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.title));

  // Group alerts by type
  const alertsByType = visibleAlerts.reduce((acc, alert) => {
    if (!acc[alert.type]) {
      acc[alert.type] = [];
    }
    acc[alert.type].push(alert);
    return acc;
  }, {});

  const handleDismissAlert = (alertTitle) => {
    setDismissedAlerts(prev => new Set([...prev, alertTitle]));
  };

  const handleToggleExpand = (alertTitle) => {
    setExpandedAlert(expandedAlert === alertTitle ? null : alertTitle);
  };

  const handleAlertAction = (alert) => {
    // Handle different alert actions
    switch (alert.action) {
      case 'view_inventory':
        // Navigate to inventory page
        console.log('Navigate to inventory');
        break;
      case 'view_sales':
        // Navigate to sales page
        console.log('Navigate to sales');
        break;
      case 'view_orders':
        // Navigate to orders page
        console.log('Navigate to orders');
        break;
      case 'check_system':
        // Navigate to system health page
        console.log('Navigate to system health');
        break;
      default:
        console.log('No action defined for this alert');
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📢';
    }
  };

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case 'critical':
        return 'Kritik';
      case 'warning':
        return 'Ogohlantirish';
      case 'info':
        return 'Ma\'lumot';
      case 'success':
        return 'Muvaffaqiyat';
      case 'error':
        return 'Xato';
      default:
        return 'Bildirishnoma';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'inventory':
        return '📦';
      case 'sales':
        return '💰';
      case 'orders':
        return '📋';
      case 'system':
        return '⚡';
      case 'users':
        return '👥';
      default:
        return '📊';
    }
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <div className="header-content">
          <h3>Tizim Ogohlantirishlari</h3>
          <div className="alerts-summary">
            {Object.entries(alertsByType).map(([type, typeAlerts]) => (
              <span key={type} className={`alert-count ${type}`}>
                {getAlertIcon(type)} {typeAlerts.length}
              </span>
            ))}
          </div>
        </div>
        
        {visibleAlerts.length > 3 && (
          <div className="alerts-actions">
            <button 
              className="dismiss-all-btn"
              onClick={() => setDismissedAlerts(new Set(alerts.map(a => a.title)))}
            >
              Barchasini yashirish
            </button>
          </div>
        )}
      </div>

      <div className="alerts-list">
        {visibleAlerts.slice(0, 5).map((alert, index) => (
          <div 
            key={`${alert.title}-${index}`} 
            className={`alert-item ${alert.type} ${alert.category}`}
          >
            <div className="alert-main">
              <div className="alert-indicator">
                <span className="alert-type-icon">{getAlertIcon(alert.type)}</span>
                <span className="alert-category-icon">{getCategoryIcon(alert.category)}</span>
              </div>
              
              <div className="alert-content">
                <div className="alert-header-row">
                  <h4 className="alert-title">{alert.title}</h4>
                  <div className="alert-meta">
                    <span className="alert-type-label">{getAlertTypeLabel(alert.type)}</span>
                    <span className="alert-category-label">{alert.category}</span>
                  </div>
                </div>
                
                <p className="alert-message">{alert.message}</p>
                
                {alert.data && expandedAlert === alert.title && (
                  <div className="alert-details">
                    <h5>Tafsilotlar:</h5>
                    {alert.category === 'inventory' && Array.isArray(alert.data) && (
                      <div className="inventory-details">
                        {alert.data.slice(0, 3).map((book, idx) => (
                          <div key={idx} className="inventory-item">
                            <span className="book-title">{book.title}</span>
                            <span className="book-stock">Stok: {book.stock || book.currentStock}</span>
                          </div>
                        ))}
                        {alert.data.length > 3 && (
                          <div className="more-items">
                            +{alert.data.length - 3} ta ko'proq kitob
                          </div>
                        )}
                      </div>
                    )}
                    
                    {alert.category === 'sales' && alert.data && (
                      <div className="sales-details">
                        <div className="detail-item">
                          <span>O'sish sur'ati:</span>
                          <span>{alert.data.growth?.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                    
                    {alert.category === 'orders' && alert.data && (
                      <div className="orders-details">
                        <div className="detail-item">
                          <span>Kutilayotgan buyurtmalar:</span>
                          <span>{alert.data.pendingCount}</span>
                        </div>
                      </div>
                    )}
                    
                    {alert.category === 'system' && alert.data && (
                      <div className="system-details">
                        <div className="detail-item">
                          <span>Javob vaqti:</span>
                          <span>{alert.data.databaseResponseTime}ms</span>
                        </div>
                        <div className="detail-item">
                          <span>Tizim holati:</span>
                          <span>{alert.data.systemHealth}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="alert-actions">
                {alert.data && (
                  <button 
                    className="expand-btn"
                    onClick={() => handleToggleExpand(alert.title)}
                    title={expandedAlert === alert.title ? "Yashirish" : "Tafsilotlarni ko'rish"}
                  >
                    {expandedAlert === alert.title ? '▲' : '▼'}
                  </button>
                )}
                
                {alert.action && (
                  <button 
                    className="action-btn"
                    onClick={() => handleAlertAction(alert)}
                    title="Harakatni bajarish"
                  >
                    👁️
                  </button>
                )}
                
                <button 
                  className="dismiss-btn"
                  onClick={() => handleDismissAlert(alert.title)}
                  title="Ogohlantirishni yashirish"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {visibleAlerts.length > 5 && (
          <div className="more-alerts">
            <p>+{visibleAlerts.length - 5} ta ko'proq ogohlantirish</p>
            <button className="view-all-btn">
              Barchasini ko'rish
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;