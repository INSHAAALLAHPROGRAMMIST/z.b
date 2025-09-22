import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import auditService, { AUDIT_SEVERITY } from '../../../../services/AuditService';
import authService, { PERMISSIONS, ROLES } from '../../../../services/AuthService';
import ProtectedRoute from './ProtectedRoute';

const SecurityDashboard = () => {
  const [securityMetrics, setSecurityMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    recentLogins: 0,
    failedLogins: 0,
    criticalEvents: 0,
    securityAlerts: 0
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadSecurityData();
  }, [timeRange]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSecurityMetrics(),
        loadRecentEvents(),
        loadSecurityAlerts(),
        loadUserActivity()
      ]);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityMetrics = async () => {
    try {
      // Get user statistics
      const usersSnapshot = await getDocs(collection(db, 'adminUsers'));
      const users = usersSnapshot.docs.map(doc => doc.data());
      
      const totalUsers = users.length;
      const activeUsers = users.filter(user => user.isActive).length;

      // Get recent login statistics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(endDate.getHours() - (timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720));

      const auditLogs = await auditService.getAuditLogs({
        startDate,
        endDate,
        limit: 1000
      });

      const recentLogins = auditLogs.filter(log => log.eventType === 'LOGIN').length;
      const failedLogins = auditLogs.filter(log => log.eventType === 'LOGIN_FAILED').length;
      const criticalEvents = auditLogs.filter(log => log.severity === AUDIT_SEVERITY.CRITICAL).length;
      const securityAlerts = auditLogs.filter(log => 
        log.eventType.includes('SECURITY') || 
        log.eventType.includes('PERMISSION_DENIED') ||
        log.severity === AUDIT_SEVERITY.CRITICAL
      ).length;

      setSecurityMetrics({
        totalUsers,
        activeUsers,
        recentLogins,
        failedLogins,
        criticalEvents,
        securityAlerts
      });
    } catch (error) {
      console.error('Error loading security metrics:', error);
    }
  };

  const loadRecentEvents = async () => {
    try {
      const events = await auditService.getAuditLogs({
        limit: 10
      });
      setRecentEvents(events);
    } catch (error) {
      console.error('Error loading recent events:', error);
    }
  };

  const loadSecurityAlerts = async () => {
    try {
      const alerts = await auditService.getAuditLogs({
        severity: AUDIT_SEVERITY.CRITICAL,
        limit: 5
      });
      setSecurityAlerts(alerts);
    } catch (error) {
      console.error('Error loading security alerts:', error);
    }
  };

  const loadUserActivity = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      const activityQuery = query(
        collection(db, 'auditLogs'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(activityQuery);
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      }));

      // Group by user
      const userActivityMap = {};
      activities.forEach(activity => {
        const userKey = activity.userEmail || activity.userId;
        if (!userActivityMap[userKey]) {
          userActivityMap[userKey] = {
            userEmail: activity.userEmail,
            userId: activity.userId,
            userRole: activity.userRole,
            eventCount: 0,
            lastActivity: activity.timestamp,
            events: []
          };
        }
        userActivityMap[userKey].eventCount++;
        userActivityMap[userKey].events.push(activity);
        if (activity.timestamp > userActivityMap[userKey].lastActivity) {
          userActivityMap[userKey].lastActivity = activity.timestamp;
        }
      });

      const sortedActivity = Object.values(userActivityMap)
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      setUserActivity(sortedActivity);
    } catch (error) {
      console.error('Error loading user activity:', error);
    }
  };

  const getMetricColor = (metric, value) => {
    switch (metric) {
      case 'failedLogins':
        return value > 10 ? 'text-red-600' : value > 5 ? 'text-yellow-600' : 'text-green-600';
      case 'criticalEvents':
        return value > 0 ? 'text-red-600' : 'text-green-600';
      case 'securityAlerts':
        return value > 5 ? 'text-red-600' : value > 2 ? 'text-yellow-600' : 'text-green-600';
      default:
        return 'text-blue-600';
    }
  };

  const getEventIcon = (eventType) => {
    if (eventType.includes('LOGIN')) return '🔐';
    if (eventType.includes('SECURITY')) return '🛡️';
    if (eventType.includes('PERMISSION')) return '🚫';
    if (eventType.includes('USER')) return '👤';
    return '📝';
  };

  const formatEventType = (eventType) => {
    return eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_AUDIT_LOGS}>
      <div className="security-dashboard">
        <div className="security-dashboard-header">
          <h2>Security Dashboard</h2>
          <p>Monitor system security, user activity, and audit events</p>
          
          <div className="time-range-selector">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-range-select"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Security Metrics */}
        <div className="security-metrics">
          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <h4>Total Users</h4>
              <span className="metric-number">{securityMetrics.totalUsers}</span>
              <span className="metric-label">Registered admins</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">✅</div>
            <div className="metric-content">
              <h4>Active Users</h4>
              <span className="metric-number">{securityMetrics.activeUsers}</span>
              <span className="metric-label">Currently active</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🔐</div>
            <div className="metric-content">
              <h4>Recent Logins</h4>
              <span className="metric-number">{securityMetrics.recentLogins}</span>
              <span className="metric-label">Successful logins</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">❌</div>
            <div className="metric-content">
              <h4>Failed Logins</h4>
              <span className={`metric-number ${getMetricColor('failedLogins', securityMetrics.failedLogins)}`}>
                {securityMetrics.failedLogins}
              </span>
              <span className="metric-label">Login attempts</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🚨</div>
            <div className="metric-content">
              <h4>Critical Events</h4>
              <span className={`metric-number ${getMetricColor('criticalEvents', securityMetrics.criticalEvents)}`}>
                {securityMetrics.criticalEvents}
              </span>
              <span className="metric-label">High priority</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🛡️</div>
            <div className="metric-content">
              <h4>Security Alerts</h4>
              <span className={`metric-number ${getMetricColor('securityAlerts', securityMetrics.securityAlerts)}`}>
                {securityMetrics.securityAlerts}
              </span>
              <span className="metric-label">Requires attention</span>
            </div>
          </div>
        </div>

        <div className="security-content">
          {/* Security Alerts */}
          <div className="security-section">
            <h3>🚨 Critical Security Alerts</h3>
            <div className="alerts-list">
              {securityAlerts.length > 0 ? (
                securityAlerts.map(alert => (
                  <div key={alert.id} className="alert-item critical">
                    <div className="alert-icon">{getEventIcon(alert.eventType)}</div>
                    <div className="alert-content">
                      <div className="alert-title">{formatEventType(alert.eventType)}</div>
                      <div className="alert-details">
                        <span className="alert-user">{alert.userEmail}</span>
                        <span className="alert-time">{alert.timestamp.toLocaleString()}</span>
                      </div>
                      {alert.details.action && (
                        <div className="alert-description">Action: {alert.details.action}</div>
                      )}
                    </div>
                    <div className="alert-severity">
                      <span className="severity-badge critical">{alert.severity}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-alerts">
                  <div className="no-alerts-icon">✅</div>
                  <p>No critical security alerts</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Events */}
          <div className="security-section">
            <h3>📋 Recent Security Events</h3>
            <div className="events-list">
              {recentEvents.map(event => (
                <div key={event.id} className="event-item">
                  <div className="event-icon">{getEventIcon(event.eventType)}</div>
                  <div className="event-content">
                    <div className="event-title">{formatEventType(event.eventType)}</div>
                    <div className="event-details">
                      <span className="event-user">{event.userEmail}</span>
                      <span className="event-time">{event.timestamp.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="event-severity">
                    <span className={`severity-badge ${event.severity.toLowerCase()}`}>
                      {event.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Activity */}
          <div className="security-section">
            <h3>👥 Most Active Users</h3>
            <div className="user-activity-list">
              {userActivity.map((user, index) => (
                <div key={user.userId} className="user-activity-item">
                  <div className="user-rank">#{index + 1}</div>
                  <div className="user-info">
                    <div className="user-email">{user.userEmail}</div>
                    <div className="user-role">{user.userRole}</div>
                  </div>
                  <div className="user-stats">
                    <div className="stat-item">
                      <span className="stat-label">Events:</span>
                      <span className="stat-value">{user.eventCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Last Activity:</span>
                      <span className="stat-value">{user.lastActivity.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="security-actions">
          <h3>🔧 Quick Security Actions</h3>
          <div className="action-buttons">
            <button className="action-btn primary">
              <span className="btn-icon">📊</span>
              View Full Audit Log
            </button>
            <button className="action-btn secondary">
              <span className="btn-icon">👥</span>
              Manage User Roles
            </button>
            <button className="action-btn secondary">
              <span className="btn-icon">🔒</span>
              Security Settings
            </button>
            <button className="action-btn danger">
              <span className="btn-icon">🚨</span>
              Emergency Lockdown
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SecurityDashboard;