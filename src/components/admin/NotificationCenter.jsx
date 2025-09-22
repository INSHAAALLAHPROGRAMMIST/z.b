// NotificationCenter Component - Admin notification management
// Requirements: 2.1, 2.2, 2.3, 2.4

import React, { useState, useEffect, useCallback } from 'react';
import notificationService from '../../services/NotificationService';
import { 
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITIES, 
  NOTIFICATION_CATEGORIES 
} from '../../models/NotificationModel';
import AdminButton from './AdminButton';
import AdminModal from './AdminModal';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    priority: '',
    read: '',
    userId: ''
  });
  const [pagination, setPagination] = useState({
    hasMore: false,
    lastDoc: null,
    loading: false
  });

  // Load notifications
  const loadNotifications = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPagination(prev => ({ ...prev, lastDoc: null }));
      } else {
        setPagination(prev => ({ ...prev, loading: true }));
      }

      const options = {
        limitCount: 20,
        startAfterDoc: reset ? null : pagination.lastDoc,
        ...filters
      };

      // For admin, we need to get all notifications, not user-specific
      // This would require a different method or admin privileges
      const result = await notificationService.getAllNotifications(options);
      
      if (reset) {
        setNotifications(result.notifications);
      } else {
        setNotifications(prev => [...prev, ...result.notifications]);
      }

      setPagination({
        hasMore: result.hasMore,
        lastDoc: result.lastDoc,
        loading: false
      });

      setError(null);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setPagination(prev => ({ ...prev, loading: false }));
    }
  }, [filters, pagination.lastDoc]);

  // Load notification statistics
  const loadStats = useCallback(async () => {
    try {
      const stats = await notificationService.getNotificationStats();
      setStats(stats);
    } catch (err) {
      console.error('Error loading notification stats:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadNotifications(true);
    loadStats();
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadNotifications(true);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle notification actions
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, readAt: new Date() }
            : n
        )
      );
      loadStats(); // Refresh stats
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err.message);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!confirm('Bu bildirishnomani o\'chirishni xohlaysizmi?')) return;

    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      loadStats(); // Refresh stats
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err.message);
    }
  };

  // Create new notification
  const handleCreateNotification = async (notificationData) => {
    try {
      await notificationService.createNotification(notificationData);
      setShowCreateModal(false);
      loadNotifications(true);
      loadStats();
    } catch (err) {
      console.error('Error creating notification:', err);
      setError(err.message);
    }
  };

  // Bulk operations
  const handleBulkMarkAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      // This would need a bulk operation method in the service
      for (const id of unreadIds) {
        await notificationService.markAsRead(id);
      }
      loadNotifications(true);
      loadStats();
    } catch (err) {
      console.error('Error bulk marking as read:', err);
      setError(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm('Barcha bildirishnomalarni o\'chirishni xohlaysizmi?')) return;

    try {
      // This would need a bulk delete method for admin
      const selectedIds = notifications.map(n => n.id);
      for (const id of selectedIds) {
        await notificationService.deleteNotification(id);
      }
      loadNotifications(true);
      loadStats();
    } catch (err) {
      console.error('Error bulk deleting notifications:', err);
      setError(err.message);
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('uz-UZ');
  };

  // Get priority badge class
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

  // Get type icon
  const getTypeIcon = (type) => {
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

  if (loading && notifications.length === 0) {
    return (
      <div className="notification-center">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Bildirishnomalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-center">
      <div className="notification-center-header">
        <h2>
          <i className="fas fa-bell"></i>
          Bildirishnomalar Markazi
        </h2>
        
        {/* Statistics */}
        {stats && (
          <div className="notification-stats">
            <div className="stat-item">
              <span className="stat-label">Jami:</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">O'qilmagan:</span>
              <span className="stat-value unread">{stats.unread}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">O'qilgan:</span>
              <span className="stat-value read">{stats.read}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="notification-actions">
        <AdminButton
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          icon="fas fa-plus"
        >
          Yangi Bildirishnoma
        </AdminButton>
        
        <AdminButton
          onClick={handleBulkMarkAsRead}
          variant="secondary"
          icon="fas fa-check-double"
          disabled={notifications.filter(n => !n.read).length === 0}
        >
          Barchasini O'qilgan Deb Belgilash
        </AdminButton>
        
        <AdminButton
          onClick={handleBulkDelete}
          variant="danger"
          icon="fas fa-trash"
          disabled={notifications.length === 0}
        >
          Barchasini O'chirish
        </AdminButton>
        
        <AdminButton
          onClick={() => loadNotifications(true)}
          variant="secondary"
          icon="fas fa-sync-alt"
          loading={loading}
        >
          Yangilash
        </AdminButton>
      </div>

      {/* Filters */}
      <div className="notification-filters">
        <div className="filter-group">
          <label>Turi:</label>
          <select 
            value={filters.type} 
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="">Barchasi</option>
            <option value={NOTIFICATION_TYPES.ORDER}>Buyurtmalar</option>
            <option value={NOTIFICATION_TYPES.WISHLIST}>Sevimlilar</option>
            <option value={NOTIFICATION_TYPES.LOW_STOCK}>Stok Ogohlantirish</option>
            <option value={NOTIFICATION_TYPES.SYSTEM}>Tizim</option>
            <option value={NOTIFICATION_TYPES.PROMOTION}>Aksiya</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Muhimlik:</label>
          <select 
            value={filters.priority} 
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">Barchasi</option>
            <option value={NOTIFICATION_PRIORITIES.URGENT}>Shoshilinch</option>
            <option value={NOTIFICATION_PRIORITIES.HIGH}>Yuqori</option>
            <option value={NOTIFICATION_PRIORITIES.MEDIUM}>O'rta</option>
            <option value={NOTIFICATION_PRIORITIES.LOW}>Past</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Holat:</label>
          <select 
            value={filters.read} 
            onChange={(e) => handleFilterChange('read', e.target.value)}
          >
            <option value="">Barchasi</option>
            <option value="false">O'qilmagan</option>
            <option value="true">O'qilgan</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Foydalanuvchi ID:</label>
          <input
            type="text"
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            placeholder="Foydalanuvchi ID"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* Notifications List */}
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-bell-slash"></i>
            <p>Bildirishnomalar topilmadi</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
            >
              <div className="notification-icon">
                <i className={getTypeIcon(notification.type)}></i>
              </div>
              
              <div className="notification-content">
                <div className="notification-header">
                  <h4>{notification.title}</h4>
                  <div className="notification-meta">
                    <span className={`priority-badge ${getPriorityClass(notification.priority)}`}>
                      {notification.priority}
                    </span>
                    <span className="notification-type">
                      {notification.type}
                    </span>
                    <span className="notification-date">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                </div>
                
                <p className="notification-message">{notification.message}</p>
                
                {notification.data && Object.keys(notification.data).length > 0 && (
                  <div className="notification-data">
                    <strong>Ma'lumotlar:</strong>
                    <pre>{JSON.stringify(notification.data, null, 2)}</pre>
                  </div>
                )}
                
                <div className="notification-actions-row">
                  {!notification.read && (
                    <AdminButton
                      onClick={() => handleMarkAsRead(notification.id)}
                      variant="secondary"
                      size="small"
                      icon="fas fa-check"
                    >
                      O'qilgan
                    </AdminButton>
                  )}
                  
                  <AdminButton
                    onClick={() => setSelectedNotification(notification)}
                    variant="secondary"
                    size="small"
                    icon="fas fa-eye"
                  >
                    Ko'rish
                  </AdminButton>
                  
                  <AdminButton
                    onClick={() => handleDeleteNotification(notification.id)}
                    variant="danger"
                    size="small"
                    icon="fas fa-trash"
                  >
                    O'chirish
                  </AdminButton>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {pagination.hasMore && (
        <div className="load-more-section">
          <AdminButton
            onClick={() => loadNotifications(false)}
            variant="secondary"
            loading={pagination.loading}
            icon="fas fa-chevron-down"
          >
            Ko'proq Yuklash
          </AdminButton>
        </div>
      )}

      {/* Create Notification Modal */}
      {showCreateModal && (
        <CreateNotificationModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateNotification}
        />
      )}

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onMarkAsRead={handleMarkAsRead}
          onDelete={handleDeleteNotification}
        />
      )}
    </div>
  );
};

// Create Notification Modal Component
const CreateNotificationModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    userId: '',
    type: NOTIFICATION_TYPES.SYSTEM,
    title: '',
    message: '',
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    category: '',
    actionUrl: '',
    actionText: '',
    expiresAt: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const notificationData = {
        ...formData,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null
      };
      
      await onSubmit(notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <AdminModal
      title="Yangi Bildirishnoma Yaratish"
      onClose={onClose}
      size="large"
    >
      <form onSubmit={handleSubmit} className="create-notification-form">
        <div className="form-row">
          <div className="form-group">
            <label>Foydalanuvchi ID *</label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => handleChange('userId', e.target.value)}
              required
              placeholder="Foydalanuvchi ID kiriting"
            />
          </div>
          
          <div className="form-group">
            <label>Turi *</label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              required
            >
              <option value={NOTIFICATION_TYPES.ORDER}>Buyurtma</option>
              <option value={NOTIFICATION_TYPES.WISHLIST}>Sevimlilar</option>
              <option value={NOTIFICATION_TYPES.LOW_STOCK}>Stok Ogohlantirish</option>
              <option value={NOTIFICATION_TYPES.SYSTEM}>Tizim</option>
              <option value={NOTIFICATION_TYPES.PROMOTION}>Aksiya</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Sarlavha *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            placeholder="Bildirishnoma sarlavhasi"
          />
        </div>

        <div className="form-group">
          <label>Xabar *</label>
          <textarea
            value={formData.message}
            onChange={(e) => handleChange('message', e.target.value)}
            required
            rows="4"
            placeholder="Bildirishnoma matni"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Muhimlik</label>
            <select
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <option value={NOTIFICATION_PRIORITIES.LOW}>Past</option>
              <option value={NOTIFICATION_PRIORITIES.MEDIUM}>O'rta</option>
              <option value={NOTIFICATION_PRIORITIES.HIGH}>Yuqori</option>
              <option value={NOTIFICATION_PRIORITIES.URGENT}>Shoshilinch</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Kategoriya</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Kategoriya (ixtiyoriy)"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Harakat URL</label>
            <input
              type="url"
              value={formData.actionUrl}
              onChange={(e) => handleChange('actionUrl', e.target.value)}
              placeholder="https://example.com/action"
            />
          </div>
          
          <div className="form-group">
            <label>Harakat Matni</label>
            <input
              type="text"
              value={formData.actionText}
              onChange={(e) => handleChange('actionText', e.target.value)}
              placeholder="Ko'rish, Xarid qilish, va h.k."
            />
          </div>
        </div>

        <div className="form-group">
          <label>Amal qilish muddati</label>
          <input
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => handleChange('expiresAt', e.target.value)}
          />
        </div>

        <div className="form-actions">
          <AdminButton
            type="button"
            onClick={onClose}
            variant="secondary"
          >
            Bekor qilish
          </AdminButton>
          
          <AdminButton
            type="submit"
            variant="primary"
            loading={loading}
            icon="fas fa-paper-plane"
          >
            Yuborish
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
};

// Notification Detail Modal Component
const NotificationDetailModal = ({ notification, onClose, onMarkAsRead, onDelete }) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('uz-UZ');
  };

  return (
    <AdminModal
      title="Bildirishnoma Tafsilotlari"
      onClose={onClose}
      size="large"
    >
      <div className="notification-detail">
        <div className="detail-section">
          <h3>Asosiy Ma'lumotlar</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>ID:</label>
              <span>{notification.id}</span>
            </div>
            <div className="detail-item">
              <label>Foydalanuvchi ID:</label>
              <span>{notification.userId}</span>
            </div>
            <div className="detail-item">
              <label>Turi:</label>
              <span>{notification.type}</span>
            </div>
            <div className="detail-item">
              <label>Muhimlik:</label>
              <span>{notification.priority}</span>
            </div>
            <div className="detail-item">
              <label>Kategoriya:</label>
              <span>{notification.category || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Manba:</label>
              <span>{notification.source || 'system'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Kontent</h3>
          <div className="detail-item">
            <label>Sarlavha:</label>
            <p>{notification.title}</p>
          </div>
          <div className="detail-item">
            <label>Xabar:</label>
            <p>{notification.message}</p>
          </div>
        </div>

        {notification.data && Object.keys(notification.data).length > 0 && (
          <div className="detail-section">
            <h3>Qo'shimcha Ma'lumotlar</h3>
            <pre className="data-preview">
              {JSON.stringify(notification.data, null, 2)}
            </pre>
          </div>
        )}

        <div className="detail-section">
          <h3>Vaqt Ma'lumotlari</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Yaratilgan:</label>
              <span>{formatDate(notification.createdAt)}</span>
            </div>
            <div className="detail-item">
              <label>O'qilgan:</label>
              <span>{notification.readAt ? formatDate(notification.readAt) : 'O\'qilmagan'}</span>
            </div>
            <div className="detail-item">
              <label>Amal qilish muddati:</label>
              <span>{notification.expiresAt ? formatDate(notification.expiresAt) : 'Cheksiz'}</span>
            </div>
          </div>
        </div>

        {(notification.actionUrl || notification.actionText) && (
          <div className="detail-section">
            <h3>Harakat</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>URL:</label>
                <span>{notification.actionUrl || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Matn:</label>
                <span>{notification.actionText || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          {!notification.read && (
            <AdminButton
              onClick={() => {
                onMarkAsRead(notification.id);
                onClose();
              }}
              variant="primary"
              icon="fas fa-check"
            >
              O'qilgan Deb Belgilash
            </AdminButton>
          )}
          
          <AdminButton
            onClick={() => {
              if (confirm('Bu bildirishnomani o\'chirishni xohlaysizmi?')) {
                onDelete(notification.id);
                onClose();
              }
            }}
            variant="danger"
            icon="fas fa-trash"
          >
            O'chirish
          </AdminButton>
          
          <AdminButton
            onClick={onClose}
            variant="secondary"
          >
            Yopish
          </AdminButton>
        </div>
      </div>
    </AdminModal>
  );
};

export default NotificationCenter;