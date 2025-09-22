import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';

const RecentActivity = ({ dateRange, userRole }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribes = [];

    const setupActivityListeners = () => {
      try {
        // Recent orders
        const ordersQuery = query(
          collection(db, COLLECTIONS.ORDERS),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
          const orderActivities = snapshot.docs.map(doc => {
            const order = { id: doc.id, ...doc.data() };
            return {
              id: `order-${order.id}`,
              type: 'order',
              title: 'Yangi buyurtma',
              description: `${order.customerName} - ${order.bookTitle}`,
              amount: order.totalAmount,
              status: order.status,
              timestamp: order.createdAt?.toDate() || new Date(),
              icon: 'fas fa-shopping-bag',
              color: getOrderStatusColor(order.status)
            };
          });

          updateActivities('orders', orderActivities);
        }, (error) => {
          console.error('Recent orders error:', error);
          setError('Faoliyat ma\'lumotlarini yuklashda xato');
        });

        unsubscribes.push(unsubscribeOrders);

        // Recent users (if accessible)
        const usersQuery = query(
          collection(db, COLLECTIONS.USERS),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
          const userActivities = snapshot.docs.map(doc => {
            const user = { id: doc.id, ...doc.data() };
            return {
              id: `user-${user.id}`,
              type: 'user',
              title: 'Yangi foydalanuvchi',
              description: `${user.fullName} ro'yxatdan o'tdi`,
              timestamp: user.createdAt?.toDate() || new Date(),
              icon: 'fas fa-user-plus',
              color: 'success'
            };
          });

          updateActivities('users', userActivities);
        }, (error) => {
          console.error('Recent users error:', error);
          // Don't show error for users, it's not critical
        });

        unsubscribes.push(unsubscribeUsers);

        setLoading(false);

      } catch (error) {
        console.error('Setup activity listeners error:', error);
        setError('Faoliyat ma\'lumotlarini sozlashda xato');
        setLoading(false);
      }
    };

    const activitiesMap = new Map();

    const updateActivities = (type, newActivities) => {
      activitiesMap.set(type, newActivities);
      
      // Combine all activities and sort by timestamp
      const allActivities = Array.from(activitiesMap.values())
        .flat()
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 15); // Keep only latest 15 activities

      setActivities(allActivities);
    };

    setupActivityListeners();

    return () => {
      unsubscribes.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [dateRange]);

  const getOrderStatusColor = (status) => {
    const statusColors = {
      'pending': 'warning',
      'confirmed': 'info',
      'shipping': 'primary',
      'completed': 'success',
      'cancelled': 'danger'
    };
    return statusColors[status] || 'secondary';
  };

  const getStatusText = (status) => {
    const statusTexts = {
      'pending': 'Kutilmoqda',
      'confirmed': 'Tasdiqlangan',
      'shipping': 'Yetkazilmoqda',
      'completed': 'Tugallangan',
      'cancelled': 'Bekor qilingan'
    };
    return statusTexts[status] || status;
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Hozir';
    if (diffInMinutes < 60) return `${diffInMinutes} daqiqa oldin`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} soat oldin`;
    return `${Math.floor(diffInMinutes / 1440)} kun oldin`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '';
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="recent-activity loading">
        <h2>So'nggi Faoliyat</h2>
        <div className="activity-list">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="activity-item loading">
              <div className="activity-skeleton"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recent-activity error">
        <h2>So'nggi Faoliyat</h2>
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-activity">
      <h2>So'nggi Faoliyat</h2>
      <div className="activity-list">
        {activities.length === 0 ? (
          <div className="no-activity">
            <i className="fas fa-inbox"></i>
            <p>Hozircha faoliyat yo'q</p>
          </div>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className={`activity-item ${activity.type}`}>
              <div className={`activity-icon ${activity.color}`}>
                <i className={activity.icon}></i>
              </div>
              <div className="activity-content">
                <div className="activity-header">
                  <h4>{activity.title}</h4>
                  <span className="activity-time">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
                <p className="activity-description">
                  {activity.description}
                </p>
                {activity.amount && (
                  <div className="activity-amount">
                    {formatCurrency(activity.amount)}
                  </div>
                )}
                {activity.status && (
                  <div className={`activity-status ${activity.color}`}>
                    {getStatusText(activity.status)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {activities.length > 0 && (
        <div className="activity-footer">
          <button className="view-all-btn">
            Barchasini ko'rish
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;