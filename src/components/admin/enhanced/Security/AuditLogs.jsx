import React, { useState, useEffect } from 'react';
import auditService, { AUDIT_EVENTS, AUDIT_SEVERITY } from '../../../../services/AuditService';
import { PERMISSIONS } from '../../../../services/AuthService';
import ProtectedRoute from './ProtectedRoute';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [filters, setFilters] = useState({
    eventType: '',
    severity: '',
    userId: '',
    startDate: '',
    endDate: '',
    limit: 100
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    loadAuditLogs();
    loadStatistics();
  }, [filters, timeRange]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const auditLogs = await auditService.getAuditLogs(filters);
      setLogs(auditLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await auditService.getAuditStatistics(timeRange);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading audit statistics:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      eventType: '',
      severity: '',
      userId: '',
      startDate: '',
      endDate: '',
      limit: 100
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case AUDIT_SEVERITY.CRITICAL: return 'bg-red-100 text-red-800 border-red-200';
      case AUDIT_SEVERITY.HIGH: return 'bg-orange-100 text-orange-800 border-orange-200';
      case AUDIT_SEVERITY.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case AUDIT_SEVERITY.LOW: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeIcon = (eventType) => {
    if (eventType.includes('LOGIN')) return '🔐';
    if (eventType.includes('USER')) return '👤';
    if (eventType.includes('ORDER')) return '📦';
    if (eventType.includes('INVENTORY')) return '📊';
    if (eventType.includes('SYSTEM')) return '⚙️';
    if (eventType.includes('SECURITY')) return '🛡️';
    if (eventType.includes('MESSAGE')) return '💬';
    return '📝';
  };

  const formatEventType = (eventType) => {
    return eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Event Type', 'Severity', 'User', 'Details'].join(','),
      ...logs.map(log => [
        log.timestamp.toISOString(),
        log.eventType,
        log.severity,
        log.userEmail || log.userId,
        JSON.stringify(log.details).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_AUDIT_LOGS}>
      <div className="audit-logs">
        <div className="audit-logs-header">
          <h2>Audit Logs</h2>
          <p>System activity monitoring and security audit trail</p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="audit-statistics">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h4>Total Events</h4>
                <span className="stat-number">{statistics.totalEvents}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🚨</div>
              <div className="stat-content">
                <h4>Critical Events</h4>
                <span className="stat-number critical">{statistics.criticalEvents}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🛡️</div>
              <div className="stat-content">
                <h4>Security Events</h4>
                <span className="stat-number">{statistics.securityEvents}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h4>Active Users</h4>
                <span className="stat-number">{Object.keys(statistics.eventsByUser).length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="audit-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                className="filter-select"
              >
                <option value="">All Events</option>
                {Object.values(AUDIT_EVENTS).map(event => (
                  <option key={event} value={event}>
                    {formatEventType(event)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="filter-select"
              >
                <option value="">All Severities</option>
                {Object.values(AUDIT_SEVERITY).map(severity => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="filter-select"
              >
                <option value="day">Last 24 Hours</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>End Date</label>
              <input
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="filter-input"
              />
            </div>
          </div>

          <div className="filter-actions">
            <button onClick={clearFilters} className="btn-clear">
              Clear Filters
            </button>
            <button onClick={exportLogs} className="btn-export">
              Export CSV
            </button>
            <button onClick={loadAuditLogs} className="btn-refresh">
              Refresh
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="audit-logs-table">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Severity</th>
                <th>User</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className={`log-row ${log.severity.toLowerCase()}`}>
                  <td>
                    <div className="timestamp">
                      <div className="date">{log.timestamp.toLocaleDateString()}</div>
                      <div className="time">{log.timestamp.toLocaleTimeString()}</div>
                    </div>
                  </td>
                  <td>
                    <div className="event-info">
                      <span className="event-icon">{getEventTypeIcon(log.eventType)}</span>
                      <span className="event-type">{formatEventType(log.eventType)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`severity-badge ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td>
                    <div className="user-info">
                      <div className="user-email">{log.userEmail || 'Unknown'}</div>
                      <div className="user-role">{log.userRole}</div>
                    </div>
                  </td>
                  <td>
                    <div className="details-preview">
                      {log.details.action && <span className="detail-item">Action: {log.details.action}</span>}
                      {log.details.resourceType && <span className="detail-item">Resource: {log.details.resourceType}</span>}
                      {log.details.changeCount && <span className="detail-item">Changes: {log.details.changeCount}</span>}
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedLog(log);
                        setShowDetails(true);
                      }}
                      className="btn-view-details"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Log Details Modal */}
        {showDetails && selectedLog && (
          <div className="modal-overlay">
            <div className="modal-content audit-details-modal">
              <div className="modal-header">
                <h3>Audit Log Details</h3>
                <button 
                  onClick={() => setShowDetails(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <div className="log-details">
                  <div className="detail-section">
                    <h4>Event Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Event Type:</label>
                        <span>{formatEventType(selectedLog.eventType)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Severity:</label>
                        <span className={`severity-badge ${getSeverityColor(selectedLog.severity)}`}>
                          {selectedLog.severity}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Timestamp:</label>
                        <span>{selectedLog.timestamp.toLocaleString()}</span>
                      </div>
                      <div className="detail-item">
                        <label>Session ID:</label>
                        <span>{selectedLog.sessionId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>User Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>User Email:</label>
                        <span>{selectedLog.userEmail || 'Unknown'}</span>
                      </div>
                      <div className="detail-item">
                        <label>User ID:</label>
                        <span>{selectedLog.userId}</span>
                      </div>
                      <div className="detail-item">
                        <label>Role:</label>
                        <span>{selectedLog.userRole}</span>
                      </div>
                      <div className="detail-item">
                        <label>IP Address:</label>
                        <span>{selectedLog.ipAddress}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Event Details</h4>
                    <pre className="details-json">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>

                  {selectedLog.userAgent && (
                    <div className="detail-section">
                      <h4>Technical Information</h4>
                      <div className="detail-item">
                        <label>User Agent:</label>
                        <span className="user-agent">{selectedLog.userAgent}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {logs.length === 0 && !loading && (
          <div className="no-logs">
            <div className="no-logs-content">
              <div className="no-logs-icon">📋</div>
              <h3>No Audit Logs Found</h3>
              <p>No audit logs match your current filters.</p>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default AuditLogs;