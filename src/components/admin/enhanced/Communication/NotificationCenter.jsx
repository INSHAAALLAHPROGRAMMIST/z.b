import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read, system, order, inventory, customer
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    unread: 0,
    system: 0,
    order: 0,
    inventory: 0,
    customer: 0
  });

  useEffect(() => {
    // Subscribe to notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      setNotifications(notificationsData);
      calculateNotificationStats(notificationsData);
      setLoading(false);
    }, (error) => {
      console.error('Notifications subscription error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const calculateNotificationStats = (notifications) => {
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      system: notifications.filter(n => n.type === 'system').length,
      order: notifications.filter(n => n.type === 'order').length,
      inventory: notifications.filter(n => n.type === 'inventory').length,
      customer: notifications.filter(n => n.type === 'customer').length
    };
    setNotificationStats(stats);
  };

  const getFilteredNotifications = () => {
    let filtered = [...notifications];

    // Apply type filter
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'read':
        filtered = filtered.filter(n => n.read);
        break;
      case 'system':
      case 'order':
      case 'inventory':
      case 'customer':
        filtered = filtered.filter(n => n.type === filter);
        break;
      default:
        // all - no filtering
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAsUnread = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: false,
        readAt: null
      });
    } catch (error) {
      console.error('Error marking notification as unread:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const promises = unreadNotifications.map(n => 
        updateDoc(doc(db, 'notifications', n.id), {
          read: true,
          readAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        deleted: true,
        deletedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const bulkMarkAsRead = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      const promises = Array.from(selectedNotifications).map(id => 
        updateDoc(doc(db, 'notifications', id), {
          read: true,
          readAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Error bulk marking as read:', error);
    }
  };

  const bulkDelete = async () => {
    if (selectedNotifications.size === 0) return;

    if (window.confirm(`${selectedNotifications.size} ta bildirishnomani o'chirmoqchimisiz?`)) {
      try {
        const promises = Array.from(selectedNotifications).map(id => 
          updateDoc(doc(db, 'notifications', id), {
            deleted: true,
            deletedAt: serverTimestamp()
          })
        );
        await Promise.all(promises);
        setSelectedNotifications(new Set());
      } catch (error) {
        console.error('Error bulk deleting:', error);
      }
    }
  };

  const handleNotificationSelect = (notificationId, isSelected) => {
    const newSelected = new Set(selectedNotifications);
    if (isSelected) {
      newSelected.add(notificationId);
    } else {
      newSelected.delete(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    const filteredNotifications = getFilteredNotifications();
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const getNotificationIcon = (type, priority) => {
    const baseIcons = {
      system: 'fas fa-cog',
      order: 'fas fa-shopping-cart',
      inventory: 'fas fa-boxes',
      customer: 'fas fa-user',
      payment: 'fas fa-credit-card',
      security: 'fas fa-shield-alt'
    };

    if (priority === 'high' || priority === 'critical') {
      return 'fas fa-exclamation-triangle';
    }

    return baseIcons[type] || 'fas fa-bell';
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'critical') return '#dc2626';
    if (priority === 'high') return '#ef4444';
    if (priority === 'medium') return '#f59e0b';
    
    const typeColors = {
      system: '#6366f1',
      order: '#10b981',
      inventory: '#f59e0b',
      customer: '#3b82f6',
      payment: '#8b5cf6',
      security: '#ef4444'
    };

    return typeColors[type] || '#6b7280';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: 'Past',
      medium: 'O\'rtacha',
      high: 'Yuqori',
      critical: 'Kritik'
    };
    return labels[priority] || 'O\'rtacha';
  };

  const getTypeLabel = (type) => {
    const labels = {
      system: 'Tizim',
      order: 'Buyurtma',
      inventory: 'Inventar',
      customer: 'Mijoz',
      payment: 'To\'lov',
      security: 'Xavfsizlik'
    };
    return labels[type] || 'Umumiy';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Hozir';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} daqiqa oldin`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} soat oldin`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} kun oldin`;
    
    return date.toLocaleDateString('uz-UZ');
  };

  // Test notification creation
  const createTestNotification = async () => {
    const testTypes = ['system', 'order', 'inventory', 'customer'];
    const testPriorities = ['low', 'medium', 'high'];
    const randomType = testTypes[Math.floor(Math.random() * testTypes.length)];
    const randomPriority = testPriorities[Math.floor(Math.random() * testPriorities.length)];

    try {
      await addDoc(collection(db, 'notifications'), {
        title: `Test ${getTypeLabel(randomType)} Bildirishnoma`,
        message: `Bu test bildirishnomasi - ${randomPriority} darajali`,
        type: randomType,
        priority: randomPriority,
        read: false,
        createdAt: serverTimestamp(),
        userId: 'admin',
        metadata: {
          source: 'test',
          testData: true
        }
      });
    } catch (error) {
      console.error('Error creating test notification:', error);
    }
  };

  if (loading) {
    return (
      <div className="notification-center-loading">
        <div className="loading-spinner"></div>
        <p>Bildirishnomalar yuklanmoqda...</p>
      </div>
    );
  }

  const filteredNotifications = getFilteredNotifications();
  const selectedCount = selectedNotifications.size;

  return (
    <div className="notification-center">
      {/* Header */}
      <div className="notification-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-bell"></i>
            Bildirishnomalar Markazi
          </h2>
          <p>Barcha tizim bildirishnomalari va xabarlar</p>
        </div>
        
        <div className="header-actions">
          <button
            className="test-btn"
            onClick={createTestNotification}
          >
            <i className="fas fa-plus"></i>
            Test Bildirishnoma
          </button>
          <button
            className="mark-all-read-btn"
            onClick={markAllAsRead}
            disabled={notificationStats.unread === 0}
          >
            <i className="fas fa-check-double"></i>
            Barchasini O'qilgan
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="notification-stats">
        <div className="stat-card total">
          <div className="stat-icon">
            <i className="fas fa-bell"></i>
          </div>
          <div className="stat-content">
            <h3>{notificationStats.total}</h3>
            <p>Jami</p>
          </div>
        </div>

        <div className="stat-card unread">
          <div className="stat-icon">
            <i className="fas fa-envelope"></i>
          </div>
          <div className="stat-content">
            <h3>{notificationStats.unread}</h3>
            <p>O'qilmagan</p>
          </div>
        </div>

        <div className="stat-card system">
          <div className="stat-icon">
            <i className="fas fa-cog"></i>
          </div>
          <div className="stat-content">
            <h3>{notificationStats.system}</h3>
            <p>Tizim</p>
          </div>
        </div>

        <div className="stat-card order">
          <div className="stat-icon">
            <i className="fas fa-shopping-cart"></i>
          </div>
          <div className="stat-content">
            <h3>{notificationStats.order}</h3>
            <p>Buyurtma</p>
          </div>
        </div>

        <div className="stat-card inventory">
          <div className="stat-icon">
            <i className="fas fa-boxes"></i>
          </div>
          <div className="stat-content">
            <h3>{notificationStats.inventory}</h3>
            <p>Inventar</p>
          </div>
        </div>

        <div className="stat-card customer">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <h3>{notificationStats.customer}</h3>
            <p>Mijoz</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="notification-filters">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Barchasi ({notificationStats.total})
          </button>
          <button
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            O'qilmagan ({notificationStats.unread})
          </button>
          <button
            className={`filter-btn ${filter === 'system' ? 'active' : ''}`}
            onClick={() => setFilter('system')}
          >
            Tizim ({notificationStats.system})
          </button>
          <button
            className={`filter-btn ${filter === 'order' ? 'active' : ''}`}
            onClick={() => setFilter('order')}
          >
            Buyurtma ({notificationStats.order})
          </button>
          <button
            className={`filter-btn ${filter === 'inventory' ? 'active' : ''}`}
            onClick={() => setFilter('inventory')}
          >
            Inventar ({notificationStats.inventory})
          </button>
          <button
            className={`filter-btn ${filter === 'customer' ? 'active' : ''}`}
            onClick={() => setFilter('customer')}
          >
            Mijoz ({notificationStats.customer})
          </button>
        </div>

        <div className="search-section">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Bildirishnomalar ichida qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="bulk-actions">
          <div className="bulk-info">
            <span>{selectedCount} ta bildirishnoma tanlangan</span>
          </div>
          <div className="bulk-buttons">
            <button
              className="bulk-read-btn"
              onClick={bulkMarkAsRead}
            >
              <i className="fas fa-check"></i>
              O'qilgan deb belgilash
            </button>
            <button
              className="bulk-delete-btn"
              onClick={bulkDelete}
            >
              <i className="fas fa-trash"></i>
              O'chirish
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="no-notifications">
            <i className="fas fa-bell-slash"></i>
            <h3>Bildirishnomalar yo'q</h3>
            <p>Tanlangan filtrlar bo'yicha bildirishnomalar topilmadi</p>
          </div>
        ) : (
          <>
            <div className="list-header">
              <div className="select-all">
                <input
                  type="checkbox"
                  checked={selectedCount === filteredNotifications.length && filteredNotifications.length > 0}
                  onChange={handleSelectAll}
                />
                <span>Barchasini tanlash</span>
              </div>
              <div className="list-count">
                {filteredNotifications.length} ta bildirishnoma
              </div>
            </div>

            <div className="notifications-container">
              {filteredNotifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''} ${notification.priority}`}
                >
                  <div className="notification-select">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={(e) => handleNotificationSelect(notification.id, e.target.checked)}
                    />
                  </div>

                  <div className="notification-icon">
                    <i 
                      className={getNotificationIcon(notification.type, notification.priority)}
                      style={{ color: getNotificationColor(notification.type, notification.priority) }}
                    ></i>
                  </div>

                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">{notification.title}</h4>
                      <div className="notification-meta">
                        <span className={`priority-badge ${notification.priority}`}>
                          {getPriorityLabel(notification.priority)}
                        </span>
                        <span className={`type-badge ${notification.type}`}>
                          {getTypeLabel(notification.type)}
                        </span>
                        <span className="time-ago">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="notification-message">{notification.message}</p>
                    
                    {notification.metadata && (
                      <div className="notification-metadata">
                        {notification.metadata.orderId && (
                          <span className="metadata-item">
                            <i className="fas fa-shopping-cart"></i>
                            Buyurtma: {notification.metadata.orderId}
                          </span>
                        )}
                        {notification.metadata.customerId && (
                          <span className="metadata-item">
                            <i className="fas fa-user"></i>
                            Mijoz: {notification.metadata.customerId}
                          </span>
                        )}
                        {notification.metadata.bookId && (
                          <span className="metadata-item">
                            <i className="fas fa-book"></i>
                            Kitob: {notification.metadata.bookTitle || notification.metadata.bookId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="notification-actions">
                    {!notification.read ? (
                      <button
                        className="action-btn read-btn"
                        onClick={() => markAsRead(notification.id)}
                        title="O'qilgan deb belgilash"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                    ) : (
                      <button
                        className="action-btn unread-btn"
                        onClick={() => markAsUnread(notification.id)}
                        title="O'qilmagan deb belgilash"
                      >
                        <i className="fas fa-envelope"></i>
                      </button>
                    )}
                    
                    <button
                      className="action-btn delete-btn"
                      onClick={() => deleteNotification(notification.id)}
                      title="O'chirish"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Load More */}
      {filteredNotifications.length >= 50 && (
        <div className="load-more">
          <button className="load-more-btn">
            Ko'proq yuklash
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;