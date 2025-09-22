// UserNotifications Component - Display notifications for regular users
// Requirements: 2.1, 2.2, 2.3, 2.4

import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebaseConfig';
import notificationService from '../services/NotificationService';
import { 
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITIES 
} from '../models/NotificationModel';
import './UserNotifications.css';

const UserNotifications = ({ 
  showDropdown = false, 
  onClose = null,
  maxItems = 10,
  showMarkAllRead = true 
}) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Get current user
  const getCurrentUserId = () => {
    return auth.currentUser?.uid || localStorage.getItem('firebaseGuestId');
  };

  // Load notifications
  const loadNotifications = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await notificationService.getUserNotifications(userId, {
        limitCount: showAll ? 50 : maxItems
      });
      
      setNotifications(result.notifications);
      setError(null);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showAll, maxItems]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      const count = await notificationService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;

    // Subscribe to notifications
    const unsubscribeNotifications = notificationService.subscribeToUserNotifications(
      userId,
      (data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
        setLoading(false);
      },
      { unreadOnly: false, limit: showAll ? 50 : maxItems }
    );

    // Subscribe to unread count
    const unsubscribeUnreadCount = notificationService.subscribeToUnreadCount(
      userId,
      setUnreadCount
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeUnreadCount();
    };
  }, [showAll, maxItems]);

  // Initial load
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Handle notification actions
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Real-time listener will update the state
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await notificationService.markAllAsRead(userId);
      // Real-time listener will update the state
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      // Real-time listener will update the state
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err.message);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }

    // Close dropdown if callback provided
    if (onClose) {
      onClose();
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hozir';
    if (diffMins < 60) return `${diffMins} daqiqa oldin`;
    if (diffHours < 24) return `${diffHours} soat oldin`;
    if (diffDays < 7) return `${diffDays} kun oldin`;
    
    return d.toLocaleDateString('uz-UZ');
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.ORDER:
        return 'fas fa-shopping-bag';
      case NOTIFICATION_TYPES.WISHLIST:
        return 'fas fa-heart';
      case NOTIFICATION_TYPES.LOW_STOCK:
        return 'fas fa-exclamation-triangle';
      case NOTIFICATION_TYPES.SYSTEM:
        return 'fas fa-cog';
      case NOTIFICATION_TYPES.PROMOTION:
        return 'fas fa-tag';
      default:
        return 'fas fa-bell';
    }
  };

  // Get priority class
  const getPriorityClass = (priority) => {
    switch (priority) {
      case NOTIFICATION_PRIORITIES.URGENT:
        return 'priority-urgent';
      case NOTIFICATION_PRIORITIES.HIGH:
        return 'priority-high';
      case NOTIFICATION_PRIORITIES.MEDIUM:
        return 'priority-medium';
      case NOTIFICATION_PRIORITIES.LOW:
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  };

  if (!showDropdown) {
    // Return notification bell with count
    return (
      <div className="notification-bell">
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </div>
    );
  }

  return (
    <div className="user-notifications">
      <div className="notifications-header">
        <h3>
          <i className="fas fa-bell"></i>
          Bildirishnomalar
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </h3>
        
        <div className="header-actions">
          {showMarkAllRead && unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="mark-all-read-btn"
              title="Barchasini o'qilgan deb belgilash"
            >
              <i className="fas fa-check-double"></i>
            </button>
          )}
          
          {onClose && (
            <button
              onClick={onClose}
              className="close-btn"
              title="Yopish"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <div className="notifications-content">
        {loading ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Yuklanmoqda...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-bell-slash"></i>
            <p>Bildirishnomalar yo'q</p>
          </div>
        ) : (
          <>
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''} ${getPriorityClass(notification.priority)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    <i className={getNotificationIcon(notification.type)}></i>
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4>{notification.title}</h4>
                      <span className="notification-time">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    
                    <p className="notification-message">
                      {notification.message}
                    </p>
                    
                    {notification.actionText && (
                      <div className="notification-action">
                        <span className="action-text">
                          <i className="fas fa-arrow-right"></i>
                          {notification.actionText}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="notification-actions">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="action-btn mark-read-btn"
                        title="O'qilgan deb belgilash"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="action-btn delete-btn"
                      title="O'chirish"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {notifications.length >= maxItems && !showAll && (
              <div className="show-all-section">
                <button
                  onClick={() => setShowAll(true)}
                  className="show-all-btn"
                >
                  Barchasini ko'rish
                  <i className="fas fa-chevron-down"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Notification Bell Component for Header
export const NotificationBell = ({ onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const userId = auth.currentUser?.uid || localStorage.getItem('firebaseGuestId');
    if (!userId) return;

    const unsubscribe = notificationService.subscribeToUnreadCount(
      userId,
      setUnreadCount
    );

    return unsubscribe;
  }, []);

  return (
    <button className="notification-bell-btn" onClick={onClick}>
      <i className="fas fa-bell"></i>
      {unreadCount > 0 && (
        <span className="notification-count">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Notification Dropdown Component
export const NotificationDropdown = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="notification-dropdown">
      <div className="dropdown-overlay" onClick={onClose}></div>
      <div className="dropdown-content">
        <UserNotifications
          showDropdown={true}
          onClose={onClose}
          maxItems={10}
          showMarkAllRead={true}
        />
      </div>
    </div>
  );
};

export default UserNotifications;