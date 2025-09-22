import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';

const ErrorLogs = () => {
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, critical, error, warning, info
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('today'); // today, week, month, all
  const [errorStats, setErrorStats] = useState({
    total: 0,
    critical: 0,
    error: 0,
    warning: 0,
    info: 0
  });

  useEffect(() => {
    // Subscribe to error logs
    const logsQuery = query(
      collection(db, 'errorLogs'),
      orderBy('timestamp', 'desc'),
      limit(500)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      setErrorLogs(logs);
      calculateErrorStats(logs);
      setLoading(false);
    }, (error) => {
      console.error('Error logs subscription error:', error);
      setLoading(false);
    });

    // Set up global error handler
    setupGlobalErrorHandler();

    return () => {
      unsubscribe();
      removeGlobalErrorHandler();
    };
  }, []);

  const setupGlobalErrorHandler = () => {
    // Handle JavaScript errors
    window.addEventListener('error', handleGlobalError);
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Handle React errors (would need error boundary in real implementation)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('React')) {
        logError('React Error', args.join(' '), 'error', {
          component: 'React',
          stack: new Error().stack
        });
      }
      originalConsoleError.apply(console, args);
    };
  };

  const removeGlobalErrorHandler = () => {
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };

  const handleGlobalError = (event) => {
    logError(
      event.message || 'JavaScript Error',
      event.error?.stack || event.message,
      'error',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    );
  };

  const handleUnhandledRejection = (event) => {
    logError(
      'Unhandled Promise Rejection',
      event.reason?.toString() || 'Unknown promise rejection',
      'error',
      {
        reason: event.reason,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    );
  };

  const logError = async (title, message, severity = 'error', metadata = {}) => {
    try {
      await addDoc(collection(db, 'errorLogs'), {
        title,
        message,
        severity,
        metadata,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: 'admin', // In real app, get from auth context
        resolved: false
      });
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  };

  const calculateErrorStats = (logs) => {
    const stats = {
      total: logs.length,
      critical: logs.filter(log => log.severity === 'critical').length,
      error: logs.filter(log => log.severity === 'error').length,
      warning: logs.filter(log => log.severity === 'warning').length,
      info: logs.filter(log => log.severity === 'info').length
    };
    setErrorStats(stats);
  };

  const getFilteredLogs = () => {
    let filtered = [...errorLogs];

    // Apply severity filter
    if (filter !== 'all') {
      filtered = filtered.filter(log => log.severity === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.title.toLowerCase().includes(query) ||
        log.message.toLowerCase().includes(query) ||
        log.metadata?.component?.toLowerCase().includes(query)
      );
    }

    // Apply date range filter
    const now = new Date();
    switch (dateRange) {
      case 'today':
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        filtered = filtered.filter(log => log.timestamp >= todayStart);
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        filtered = filtered.filter(log => log.timestamp >= weekStart);
        break;
      case 'month':
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - 1);
        filtered = filtered.filter(log => log.timestamp >= monthStart);
        break;
      default:
        // all - no date filtering
        break;
    }

    return filtered;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return 'fas fa-skull-crossbones';
      case 'error': return 'fas fa-times-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-question-circle';
    }
  };

  const markAsResolved = async (logId) => {
    try {
      // In real implementation, update the document in Firebase
      setErrorLogs(prev => prev.map(log => 
        log.id === logId ? { ...log, resolved: true } : log
      ));
    } catch (error) {
      console.error('Failed to mark as resolved:', error);
    }
  };

  const clearAllLogs = async () => {
    if (window.confirm('Barcha error loglarni o\'chirmoqchimisiz?')) {
      try {
        // In real implementation, delete all documents
        setErrorLogs([]);
        setErrorStats({ total: 0, critical: 0, error: 0, warning: 0, info: 0 });
      } catch (error) {
        console.error('Failed to clear logs:', error);
      }
    }
  };

  const exportLogs = () => {
    const filteredLogs = getFilteredLogs();
    const csvContent = [
      'Timestamp,Severity,Title,Message,Component,URL,Resolved',
      ...filteredLogs.map(log => 
        `"${log.timestamp.toISOString()}","${log.severity}","${log.title}","${log.message}","${log.metadata?.component || ''}","${log.url}","${log.resolved}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Test error logging
  const testErrorLogging = () => {
    logError('Test Error', 'Bu test error xabari', 'warning', {
      component: 'ErrorLogs',
      testData: true
    });
  };

  if (loading) {
    return (
      <div className="error-logs-loading">
        <div className="loading-spinner"></div>
        <p>Error loglar yuklanmoqda...</p>
      </div>
    );
  }

  const filteredLogs = getFilteredLogs();

  return (
    <div className="error-logs">
      {/* Header */}
      <div className="logs-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-bug"></i>
            Error Logs va Monitoring
          </h2>
          <p>Tizim xatolari va monitoring ma'lumotlari</p>
        </div>
        
        <div className="header-actions">
          <button className="test-btn" onClick={testErrorLogging}>
            <i className="fas fa-flask"></i>
            Test Error
          </button>
          <button className="export-btn" onClick={exportLogs}>
            <i className="fas fa-download"></i>
            Export
          </button>
          <button className="clear-btn" onClick={clearAllLogs}>
            <i className="fas fa-trash"></i>
            Tozalash
          </button>
        </div>
      </div>

      {/* Error Statistics */}
      <div className="error-statistics">
        <div className="stat-card total">
          <div className="stat-icon">
            <i className="fas fa-list"></i>
          </div>
          <div className="stat-content">
            <h3>{errorStats.total}</h3>
            <p>Jami Loglar</p>
          </div>
        </div>

        <div className="stat-card critical">
          <div className="stat-icon">
            <i className="fas fa-skull-crossbones"></i>
          </div>
          <div className="stat-content">
            <h3>{errorStats.critical}</h3>
            <p>Kritik Xatolar</p>
          </div>
        </div>

        <div className="stat-card error">
          <div className="stat-icon">
            <i className="fas fa-times-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{errorStats.error}</h3>
            <p>Xatolar</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="stat-content">
            <h3>{errorStats.warning}</h3>
            <p>Ogohlantirishlar</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <i className="fas fa-info-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{errorStats.info}</h3>
            <p>Ma'lumotlar</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="logs-filters">
        <div className="filter-group">
          <label>Darajasi:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Barchasi</option>
            <option value="critical">Kritik</option>
            <option value="error">Xato</option>
            <option value="warning">Ogohlantirish</option>
            <option value="info">Ma'lumot</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Vaqt oralig'i:</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="today">Bugun</option>
            <option value="week">Bu hafta</option>
            <option value="month">Bu oy</option>
            <option value="all">Barchasi</option>
          </select>
        </div>

        <div className="search-group">
          <input
            type="text"
            placeholder="Qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="fas fa-search"></i>
        </div>
      </div>

      {/* Error Logs List */}
      <div className="logs-list">
        {filteredLogs.length === 0 ? (
          <div className="no-logs">
            <i className="fas fa-check-circle"></i>
            <h3>Loglar yo'q</h3>
            <p>Tanlangan filtrlar bo'yicha loglar topilmadi</p>
          </div>
        ) : (
          <div className="logs-table">
            <div className="table-header">
              <span>Vaqt</span>
              <span>Daraja</span>
              <span>Sarlavha</span>
              <span>Xabar</span>
              <span>Komponent</span>
              <span>Amallar</span>
            </div>
            
            {filteredLogs.map(log => (
              <div key={log.id} className={`log-row ${log.severity} ${log.resolved ? 'resolved' : ''}`}>
                <div className="log-timestamp">
                  {log.timestamp.toLocaleString('uz-UZ')}
                </div>
                
                <div className="log-severity">
                  <i 
                    className={getSeverityIcon(log.severity)}
                    style={{ color: getSeverityColor(log.severity) }}
                  ></i>
                  <span style={{ color: getSeverityColor(log.severity) }}>
                    {log.severity.toUpperCase()}
                  </span>
                </div>
                
                <div className="log-title">
                  {log.title}
                </div>
                
                <div className="log-message">
                  <div className="message-preview">
                    {log.message.length > 100 ? 
                      `${log.message.substring(0, 100)}...` : 
                      log.message
                    }
                  </div>
                  {log.message.length > 100 && (
                    <button 
                      className="expand-btn"
                      onClick={() => {
                        // Toggle full message display
                        const element = document.getElementById(`full-message-${log.id}`);
                        if (element) {
                          element.style.display = element.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                    >
                      <i className="fas fa-expand"></i>
                    </button>
                  )}
                  <div id={`full-message-${log.id}`} className="full-message" style={{ display: 'none' }}>
                    {log.message}
                  </div>
                </div>
                
                <div className="log-component">
                  {log.metadata?.component || 'Unknown'}
                </div>
                
                <div className="log-actions">
                  {!log.resolved && (
                    <button
                      className="resolve-btn"
                      onClick={() => markAsResolved(log.id)}
                      title="Hal qilindi deb belgilash"
                    >
                      <i className="fas fa-check"></i>
                    </button>
                  )}
                  <button
                    className="details-btn"
                    onClick={() => {
                      // Show detailed modal
                      alert(`Batafsil ma'lumot:\n\nURL: ${log.url}\nUser Agent: ${log.userAgent}\nMetadata: ${JSON.stringify(log.metadata, null, 2)}`);
                    }}
                    title="Batafsil ma'lumot"
                  >
                    <i className="fas fa-info"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredLogs.length > 50 && (
        <div className="logs-pagination">
          <p>Faqat birinchi 50 ta log ko'rsatilgan</p>
          <button className="load-more-btn">
            Ko'proq yuklash
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorLogs;