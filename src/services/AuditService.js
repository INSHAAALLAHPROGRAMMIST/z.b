import { db } from '../firebase/config';
import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import authService from './AuthService';

// Audit event types
export const AUDIT_EVENTS = {
  // Authentication events
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  
  // User management events
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  
  // Order management events
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_DELETED: 'ORDER_DELETED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  BULK_ORDER_UPDATE: 'BULK_ORDER_UPDATE',
  
  // Customer management events
  CUSTOMER_CREATED: 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  CUSTOMER_DELETED: 'CUSTOMER_DELETED',
  CUSTOMER_MERGED: 'CUSTOMER_MERGED',
  
  // Inventory management events
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  STOCK_ADJUSTED: 'STOCK_ADJUSTED',
  BULK_STOCK_UPDATE: 'BULK_STOCK_UPDATE',
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  
  // System events
  SYSTEM_SETTINGS_CHANGED: 'SYSTEM_SETTINGS_CHANGED',
  BACKUP_CREATED: 'BACKUP_CREATED',
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_IMPORT: 'DATA_IMPORT',
  
  // Communication events
  MESSAGE_SENT: 'MESSAGE_SENT',
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  TEMPLATE_CREATED: 'TEMPLATE_CREATED',
  TEMPLATE_UPDATED: 'TEMPLATE_UPDATED',
  
  // Security events
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  SECURITY_BREACH: 'SECURITY_BREACH',
  
  // SEO events
  SEO_SETTINGS_CHANGED: 'SEO_SETTINGS_CHANGED',
  BULK_CONTENT_UPDATE: 'BULK_CONTENT_UPDATE',
  META_DATA_UPDATED: 'META_DATA_UPDATED'
};

// Audit severity levels
export const AUDIT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

class AuditService {
  constructor() {
    this.auditCollection = 'auditLogs';
  }

  // Log an audit event
  async logEvent(eventType, details = {}, severity = AUDIT_SEVERITY.LOW) {
    try {
      const currentUser = authService.getCurrentUser();
      
      const auditLog = {
        eventType,
        severity,
        userId: currentUser.user?.uid || 'anonymous',
        userEmail: currentUser.user?.email || 'unknown',
        userRole: currentUser.role || 'unknown',
        timestamp: Timestamp.now(),
        details,
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId(),
        source: 'admin_dashboard'
      };

      await addDoc(collection(db, this.auditCollection), auditLog);
      
      // If it's a critical event, also log to security logs
      if (severity === AUDIT_SEVERITY.CRITICAL) {
        await this.logSecurityEvent(eventType, details);
      }
      
      return true;
    } catch (error) {
      console.error('Error logging audit event:', error);
      return false;
    }
  }

  // Log user action with automatic context
  async logUserAction(action, resourceType, resourceId, changes = {}, severity = AUDIT_SEVERITY.LOW) {
    const details = {
      action,
      resourceType,
      resourceId,
      changes,
      timestamp: new Date().toISOString()
    };

    return await this.logEvent(`${resourceType.toUpperCase()}_${action.toUpperCase()}`, details, severity);
  }

  // Log data changes with before/after values
  async logDataChange(resourceType, resourceId, beforeData, afterData, action = 'UPDATED') {
    const changes = this.calculateChanges(beforeData, afterData);
    
    const details = {
      resourceType,
      resourceId,
      action,
      changes,
      beforeData: this.sanitizeData(beforeData),
      afterData: this.sanitizeData(afterData),
      changeCount: Object.keys(changes).length
    };

    const severity = this.determineSeverity(resourceType, changes);
    
    return await this.logEvent(AUDIT_EVENTS[`${resourceType.toUpperCase()}_${action}`] || 'DATA_CHANGED', details, severity);
  }

  // Log bulk operations
  async logBulkOperation(operationType, resourceType, affectedIds, details = {}) {
    const auditDetails = {
      operationType,
      resourceType,
      affectedCount: affectedIds.length,
      affectedIds: affectedIds.slice(0, 100), // Limit to first 100 IDs
      totalAffected: affectedIds.length,
      ...details
    };

    const severity = affectedIds.length > 100 ? AUDIT_SEVERITY.HIGH : AUDIT_SEVERITY.MEDIUM;
    
    return await this.logEvent(`BULK_${operationType.toUpperCase()}`, auditDetails, severity);
  }

  // Log security events
  async logSecurityEvent(eventType, details = {}) {
    const securityDetails = {
      ...details,
      securityLevel: 'HIGH',
      requiresReview: true,
      alertSent: false
    };

    return await this.logEvent(eventType, securityDetails, AUDIT_SEVERITY.CRITICAL);
  }

  // Get audit logs with filtering
  async getAuditLogs(filters = {}) {
    try {
      let auditQuery = collection(db, this.auditCollection);
      
      // Apply filters
      if (filters.userId) {
        auditQuery = query(auditQuery, where('userId', '==', filters.userId));
      }
      
      if (filters.eventType) {
        auditQuery = query(auditQuery, where('eventType', '==', filters.eventType));
      }
      
      if (filters.severity) {
        auditQuery = query(auditQuery, where('severity', '==', filters.severity));
      }
      
      if (filters.startDate) {
        auditQuery = query(auditQuery, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
      }
      
      if (filters.endDate) {
        auditQuery = query(auditQuery, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
      }
      
      // Order by timestamp (newest first) and limit results
      auditQuery = query(auditQuery, orderBy('timestamp', 'desc'), limit(filters.limit || 100));
      
      const snapshot = await getDocs(auditQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  // Get audit statistics
  async getAuditStatistics(timeRange = 'week') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'day':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }
      
      const logs = await this.getAuditLogs({
        startDate,
        endDate,
        limit: 1000
      });
      
      const stats = {
        totalEvents: logs.length,
        eventsByType: {},
        eventsBySeverity: {},
        eventsByUser: {},
        eventsByDay: {},
        criticalEvents: logs.filter(log => log.severity === AUDIT_SEVERITY.CRITICAL).length,
        securityEvents: logs.filter(log => log.eventType.includes('SECURITY') || log.eventType.includes('LOGIN')).length
      };
      
      logs.forEach(log => {
        // Count by type
        stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1;
        
        // Count by severity
        stats.eventsBySeverity[log.severity] = (stats.eventsBySeverity[log.severity] || 0) + 1;
        
        // Count by user
        const userKey = log.userEmail || log.userId;
        stats.eventsByUser[userKey] = (stats.eventsByUser[userKey] || 0) + 1;
        
        // Count by day
        const dayKey = log.timestamp.toDateString();
        stats.eventsByDay[dayKey] = (stats.eventsByDay[dayKey] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error calculating audit statistics:', error);
      return null;
    }
  }

  // Calculate changes between before and after data
  calculateChanges(beforeData, afterData) {
    const changes = {};
    
    if (!beforeData || !afterData) return changes;
    
    // Check for changed fields
    Object.keys(afterData).forEach(key => {
      if (beforeData[key] !== afterData[key]) {
        changes[key] = {
          before: beforeData[key],
          after: afterData[key]
        };
      }
    });
    
    // Check for removed fields
    Object.keys(beforeData).forEach(key => {
      if (!(key in afterData)) {
        changes[key] = {
          before: beforeData[key],
          after: null
        };
      }
    });
    
    return changes;
  }

  // Determine severity based on resource type and changes
  determineSeverity(resourceType, changes) {
    const criticalFields = ['role', 'permissions', 'isActive', 'password', 'email'];
    const highImpactResources = ['USER', 'ADMIN', 'SYSTEM'];
    
    // Check for critical field changes
    const hasCriticalChanges = Object.keys(changes).some(field => 
      criticalFields.includes(field.toLowerCase())
    );
    
    if (hasCriticalChanges) {
      return AUDIT_SEVERITY.CRITICAL;
    }
    
    if (highImpactResources.includes(resourceType.toUpperCase())) {
      return AUDIT_SEVERITY.HIGH;
    }
    
    if (Object.keys(changes).length > 5) {
      return AUDIT_SEVERITY.MEDIUM;
    }
    
    return AUDIT_SEVERITY.LOW;
  }

  // Sanitize sensitive data before logging
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'creditCard'];
    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  // Get client IP address
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  // Get or create session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('auditSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('auditSessionId', sessionId);
    }
    return sessionId;
  }
}

// Create singleton instance
const auditService = new AuditService();

export default auditService;