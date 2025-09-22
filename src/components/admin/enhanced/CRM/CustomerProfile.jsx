import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';
import { createTelegramLinkProps } from '../../../../utils/telegramUtils';
import notificationService from '../../../../services/NotificationService';

const CustomerProfile = ({ customerId, onClose, onCustomerUpdate }) => {
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [books, setBooks] = useState([]);
  const [communicationHistory, setCommunicationHistory] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    lastOrderDate: null,
    favoriteGenres: [],
    favoriteAuthors: [],
    orderFrequency: 'low',
    customerLifetimeValue: 0,
    loyaltyPoints: 0,
    riskScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingNotes, setEditingNotes] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [customerTags, setCustomerTags] = useState([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load customer basic info
      const customerDoc = await getDoc(doc(db, COLLECTIONS.USERS, customerId));
      if (!customerDoc.exists()) {
        throw new Error('Mijoz topilmadi');
      }

      const customerData = {
        id: customerDoc.id,
        ...customerDoc.data(),
        createdAt: customerDoc.data().createdAt?.toDate() || new Date(),
        lastLogin: customerDoc.data().lastLogin?.toDate() || null,
        lastActivity: customerDoc.data().lastActivity?.toDate() || null
      };

      setCustomer(customerData);
      setInternalNotes(customerData.internalNotes || '');
      setCustomerTags(customerData.tags || []);

      // Load customer orders
      const ordersQuery = query(
        collection(db, COLLECTIONS.ORDERS),
        where('userId', '==', customerId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      setOrders(ordersData);

      // Load books data for analytics
      const bookIds = [...new Set(ordersData.map(order => order.bookId).filter(Boolean))];
      const booksData = [];
      
      for (const bookId of bookIds) {
        try {
          const bookDoc = await getDoc(doc(db, COLLECTIONS.BOOKS, bookId));
          if (bookDoc.exists()) {
            booksData.push({
              id: bookDoc.id,
              ...bookDoc.data()
            });
          }
        } catch (error) {
          console.warn(`Error loading book ${bookId}:`, error);
        }
      }
      
      setBooks(booksData);

      // Load communication history
      const commQuery = query(
        collection(db, 'communications'),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const commSnapshot = await getDocs(commQuery);
      const commData = commSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      setCommunicationHistory(commData);

      // Calculate enhanced analytics
      const analyticsData = calculateEnhancedCustomerAnalytics(ordersData, booksData, customerData, commData);
      setAnalytics(analyticsData);

    } catch (err) {
      console.error('Customer data loading error:', err);
      setError(err.message || 'Ma\'lumotlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  };

  const calculateEnhancedCustomerAnalytics = (orders, books, customerData, communications) => {
    const completedOrders = orders.filter(order => order.status === 'completed');
    const totalSpent = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? totalSpent / completedOrders.length : 0;
    
    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;
    
    // Calculate order frequency and customer lifetime
    const daysSinceFirstOrder = customerData.createdAt ? 
      (new Date() - customerData.createdAt) / (1000 * 60 * 60 * 24) : 0;
    const orderFrequency = daysSinceFirstOrder > 0 ? 
      (completedOrders.length / daysSinceFirstOrder) * 30 : 0; // Orders per month

    let frequencyLabel = 'low';
    if (orderFrequency > 2) frequencyLabel = 'high';
    else if (orderFrequency > 0.5) frequencyLabel = 'medium';

    // Calculate favorite genres from actual book data
    const genreCount = {};
    const authorCount = {};
    
    completedOrders.forEach(order => {
      const book = books.find(b => b.id === order.bookId);
      if (book) {
        // Count genres
        if (book.genre) {
          genreCount[book.genre] = (genreCount[book.genre] || 0) + 1;
        }
        // Count authors
        if (book.author) {
          authorCount[book.author] = (authorCount[book.author] || 0) + 1;
        }
      }
    });

    const favoriteGenres = Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    const favoriteAuthors = Object.entries(authorCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([author]) => author);

    // Calculate Customer Lifetime Value (CLV)
    const monthsActive = Math.max(1, daysSinceFirstOrder / 30);
    const monthlySpending = totalSpent / monthsActive;
    const customerLifetimeValue = monthlySpending * 12; // Projected annual value

    // Calculate loyalty points (simple system)
    const loyaltyPoints = Math.floor(totalSpent / 10000); // 1 point per 10,000 so'm

    // Calculate risk score (0-100, higher = more risk of churn)
    let riskScore = 0;
    const daysSinceLastOrder = lastOrderDate ? 
      (new Date() - lastOrderDate) / (1000 * 60 * 60 * 24) : 999;
    
    if (daysSinceLastOrder > 90) riskScore += 40;
    else if (daysSinceLastOrder > 60) riskScore += 25;
    else if (daysSinceLastOrder > 30) riskScore += 10;
    
    if (orderFrequency < 0.2) riskScore += 30;
    else if (orderFrequency < 0.5) riskScore += 15;
    
    if (averageOrderValue < 50000) riskScore += 20;
    else if (averageOrderValue < 100000) riskScore += 10;
    
    if (communications.length === 0) riskScore += 10;

    riskScore = Math.min(100, riskScore);

    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      totalSpent,
      averageOrderValue,
      lastOrderDate,
      favoriteGenres,
      favoriteAuthors,
      orderFrequency: frequencyLabel,
      customerLifetime: daysSinceFirstOrder,
      customerLifetimeValue,
      loyaltyPoints,
      riskScore,
      monthlySpending,
      communicationCount: communications.length
    };
  };

  const getCustomerSegment = () => {
    // Enhanced customer segmentation logic based on multiple factors
    const { totalSpent, completedOrders, orderFrequency, customerLifetime, riskScore } = analytics;
    
    // VIP Customers: High spending, frequent orders, low risk
    if (totalSpent > 2000000 && completedOrders > 10 && riskScore < 30) {
      return { 
        label: 'VIP', 
        color: 'warning', 
        icon: 'fas fa-crown',
        description: 'Eng qimmatli mijoz - maxsus e\'tibor talab qiladi'
      };
    }
    
    // Regular Customers: Consistent spending and orders
    if (totalSpent > 500000 && completedOrders > 5 && orderFrequency !== 'low') {
      return { 
        label: 'Doimiy', 
        color: 'success', 
        icon: 'fas fa-user-check',
        description: 'Doimiy mijoz - ishonchli va barqaror'
      };
    }
    
    // Active Customers: Recent activity, good frequency
    if (completedOrders > 3 && orderFrequency !== 'low' && riskScore < 50) {
      return { 
        label: 'Faol', 
        color: 'primary', 
        icon: 'fas fa-user-friends',
        description: 'Faol mijoz - yaxshi potensial'
      };
    }
    
    // At Risk Customers: High risk score, declining activity
    if (riskScore > 70 || (customerLifetime > 90 && completedOrders < 2)) {
      return { 
        label: 'Xavfda', 
        color: 'danger', 
        icon: 'fas fa-exclamation-triangle',
        description: 'Yo\'qotish xavfi - darhol e\'tibor kerak'
      };
    }
    
    // New Customers: Recently registered, few orders
    if (customerLifetime < 30 || completedOrders < 2) {
      return { 
        label: 'Yangi', 
        color: 'info', 
        icon: 'fas fa-user-plus',
        description: 'Yangi mijoz - rivojlantirish kerak'
      };
    }
    
    // Inactive Customers: Long time since last order
    if (riskScore > 50) {
      return { 
        label: 'Nofaol', 
        color: 'secondary', 
        icon: 'fas fa-user-clock',
        description: 'Nofaol mijoz - qaytarish strategiyasi kerak'
      };
    }
    
    // Default: Regular customer
    return { 
      label: 'Oddiy', 
      color: 'secondary', 
      icon: 'fas fa-user',
      description: 'Oddiy mijoz'
    };
  };

  // Save customer notes and tags
  const saveCustomerNotes = async () => {
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, customerId), {
        internalNotes: internalNotes.trim(),
        tags: customerTags,
        updatedAt: serverTimestamp()
      });
      
      setEditingNotes(false);
      showToast('Izohlar saqlandi', 'success');
      
      // Update local state
      setCustomer(prev => ({
        ...prev,
        internalNotes: internalNotes.trim(),
        tags: customerTags
      }));
      
      onCustomerUpdate && onCustomerUpdate();
      
    } catch (error) {
      console.error('Error saving notes:', error);
      showToast('Izohlarni saqlashda xato', 'error');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !customerTags.includes(newTag.trim())) {
      setCustomerTags([...customerTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setCustomerTags(customerTags.filter(tag => tag !== tagToRemove));
  };

  const sendDirectMessage = async () => {
    try {
      const result = await notificationService.sendOrderStatusNotification(
        {
          id: 'direct_message',
          customerInfo: customer,
          totalAmount: 0,
          items: []
        },
        'custom_message',
        `Salom ${customer.fullName}! Admin sifatida sizga xabar yubormoqchiman.`
      );

      if (result.success) {
        showToast('Xabar yuborildi', 'success');
      } else {
        showToast('Xabar yuborishda muammo', 'warning');
      }
    } catch (error) {
      console.error('Direct message error:', error);
      showToast('Xabar yuborishda xato', 'error');
    }
  };

  const showToast = (message, type) => {
    const event = new CustomEvent('showToast', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getOrderStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Kutilmoqda', color: 'warning' },
      confirmed: { label: 'Tasdiqlangan', color: 'info' },
      shipping: { label: 'Yetkazilmoqda', color: 'primary' },
      completed: { label: 'Tugallangan', color: 'success' },
      cancelled: { label: 'Bekor qilingan', color: 'danger' }
    };

    const config = statusConfig[status] || { label: status, color: 'secondary' };
    
    return (
      <span className={`status-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const tabs = [
    { id: 'overview', label: 'Umumiy', icon: 'fas fa-user' },
    { id: 'orders', label: 'Buyurtmalar', icon: 'fas fa-shopping-bag' },
    { id: 'analytics', label: 'Tahlil', icon: 'fas fa-chart-bar' },
    { id: 'communication', label: 'Aloqa', icon: 'fas fa-comments' }
  ];

  if (loading) {
    return (
      <div className="customer-profile-overlay">
        <div className="customer-profile-modal">
          <div className="profile-loading">
            <div className="loading-spinner">
              <i className="fas fa-spinner fa-spin"></i>
              <span>Mijoz ma'lumotlari yuklanmoqda...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-profile-overlay">
        <div className="customer-profile-modal">
          <div className="profile-error">
            <i className="fas fa-exclamation-triangle"></i>
            <h3>Xato yuz berdi</h3>
            <p>{error}</p>
            <button onClick={onClose} className="close-btn">
              Yopish
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const segment = getCustomerSegment();

  return (
    <div className="customer-profile-overlay">
      <div className="customer-profile-modal">
        <div className="profile-header">
          <div className="customer-avatar-section">
            <div className="customer-avatar">
              <i className="fas fa-user"></i>
            </div>
            <div className="customer-basic-info">
              <h2>{customer.fullName || 'N/A'}</h2>
              <div className="customer-meta">
                <span className={`customer-segment ${segment.color}`}>
                  <i className={segment.icon}></i>
                  {segment.label}
                </span>
                <span className="customer-id">ID: {customer.id.substring(0, 8)}</span>
              </div>
            </div>
          </div>
          
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="profile-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="profile-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="overview-grid">
                <div className="info-section">
                  <h3>Shaxsiy Ma'lumotlar</h3>
                  <div className="info-items">
                    <div className="info-item">
                      <label>To'liq ism:</label>
                      <span>{customer.fullName || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Email:</label>
                      <span>{customer.email || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Telefon:</label>
                      <span>{customer.phone || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Telegram:</label>
                      <span>{customer.telegramUsername ? `@${customer.telegramUsername}` : 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Manzil:</label>
                      <span>{customer.address || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Ro'yxatdan o'tgan:</label>
                      <span>{formatDate(customer.createdAt)}</span>
                    </div>
                    <div className="info-item">
                      <label>Oxirgi kirish:</label>
                      <span>{formatDate(customer.lastLogin)}</span>
                    </div>
                  </div>
                </div>

                <div className="stats-section">
                  <h3>Tezkor Statistika</h3>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon orders">
                        <i className="fas fa-shopping-bag"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analytics.totalOrders}</div>
                        <div className="stat-label">Jami Buyurtmalar</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon revenue">
                        <i className="fas fa-money-bill-wave"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{formatCurrency(analytics.totalSpent)}</div>
                        <div className="stat-label">Jami Xarajat</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon average">
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{formatCurrency(analytics.averageOrderValue)}</div>
                        <div className="stat-label">O'rtacha Buyurtma</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon frequency">
                        <i className="fas fa-clock"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analytics.orderFrequency}</div>
                        <div className="stat-label">Faollik Darajasi</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="orders-tab">
              <div className="orders-header">
                <h3>Buyurtmalar Tarixi</h3>
                <span className="orders-count">{orders.length} ta buyurtma</span>
              </div>
              
              <div className="orders-list">
                {orders.length === 0 ? (
                  <div className="no-orders">
                    <i className="fas fa-shopping-bag"></i>
                    <p>Hozircha buyurtmalar yo'q</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="order-item">
                      <div className="order-header">
                        <div className="order-id">#{order.id.substring(0, 8)}</div>
                        {getOrderStatusBadge(order.status)}
                        <div className="order-date">{formatDate(order.createdAt)}</div>
                      </div>
                      <div className="order-content">
                        <div className="order-book">
                          <strong>{order.bookTitle || 'N/A'}</strong>
                          <span>Miqdor: {order.quantity || 1}</span>
                        </div>
                        <div className="order-amount">
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-tab">
              <div className="analytics-grid">
                {/* Customer Segmentation */}
                <div className="analytics-section">
                  <h3>Mijoz Segmentatsiyasi</h3>
                  <div className="segment-card">
                    <div className={`segment-icon ${segment.color}`}>
                      <i className={segment.icon}></i>
                    </div>
                    <div className="segment-info">
                      <div className="segment-label">{segment.label}</div>
                      <div className="segment-description">{segment.description}</div>
                    </div>
                  </div>
                </div>

                {/* Advanced Analytics */}
                <div className="analytics-section">
                  <h3>Batafsil Tahlil</h3>
                  <div className="analytics-items">
                    <div className="analytics-item">
                      <label>Faollik darajasi:</label>
                      <span className={`frequency-badge ${analytics.orderFrequency}`}>
                        {analytics.orderFrequency === 'high' ? 'Yuqori' : 
                         analytics.orderFrequency === 'medium' ? 'O\'rtacha' : 'Past'}
                      </span>
                    </div>
                    <div className="analytics-item">
                      <label>Mijoz bo'lgan vaqt:</label>
                      <span>{Math.floor(analytics.customerLifetime)} kun</span>
                    </div>
                    <div className="analytics-item">
                      <label>Oxirgi buyurtma:</label>
                      <span>{analytics.lastOrderDate ? formatDate(analytics.lastOrderDate) : 'N/A'}</span>
                    </div>
                    <div className="analytics-item">
                      <label>Oylik xarajat:</label>
                      <span>{formatCurrency(analytics.monthlySpending)}</span>
                    </div>
                    <div className="analytics-item">
                      <label>CLV (Yillik):</label>
                      <span>{formatCurrency(analytics.customerLifetimeValue)}</span>
                    </div>
                    <div className="analytics-item">
                      <label>Sadoqat ballari:</label>
                      <span className="loyalty-points">
                        <i className="fas fa-star"></i>
                        {analytics.loyaltyPoints}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="analytics-section">
                  <h3>Risk Baholash</h3>
                  <div className="risk-assessment">
                    <div className="risk-score">
                      <div className={`risk-circle ${analytics.riskScore > 70 ? 'high' : analytics.riskScore > 40 ? 'medium' : 'low'}`}>
                        <span className="risk-value">{analytics.riskScore}</span>
                        <span className="risk-label">Risk</span>
                      </div>
                    </div>
                    <div className="risk-info">
                      <div className="risk-level">
                        {analytics.riskScore > 70 ? 'Yuqori Risk' : 
                         analytics.riskScore > 40 ? 'O\'rtacha Risk' : 'Past Risk'}
                      </div>
                      <div className="risk-description">
                        {analytics.riskScore > 70 ? 'Mijozni yo\'qotish xavfi yuqori - darhol harakat kerak' :
                         analytics.riskScore > 40 ? 'Ehtiyot bo\'ling - mijozni saqlash strategiyasi kerak' :
                         'Mijoz barqaror - davom eting'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="analytics-section">
                  <h3>Afzalliklar va Qiziqishlar</h3>
                  <div className="preferences-items">
                    <div className="preference-item">
                      <label>Sevimli janrlar:</label>
                      <div className="preference-tags">
                        {analytics.favoriteGenres.length > 0 ? 
                          analytics.favoriteGenres.map(genre => (
                            <span key={genre} className="preference-tag genre">{genre}</span>
                          )) : 
                          <span className="no-data">Ma'lumot yo'q</span>
                        }
                      </div>
                    </div>
                    <div className="preference-item">
                      <label>Sevimli mualliflar:</label>
                      <div className="preference-tags">
                        {analytics.favoriteAuthors.length > 0 ? 
                          analytics.favoriteAuthors.map(author => (
                            <span key={author} className="preference-tag author">{author}</span>
                          )) : 
                          <span className="no-data">Ma'lumot yo'q</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Statistics */}
                <div className="analytics-section">
                  <h3>Buyurtma Statistikasi</h3>
                  <div className="order-stats">
                    <div className="stat-row">
                      <span className="stat-label">Jami buyurtmalar:</span>
                      <span className="stat-value">{analytics.totalOrders}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Tugallangan:</span>
                      <span className="stat-value success">{analytics.completedOrders}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Bekor qilingan:</span>
                      <span className="stat-value danger">{analytics.cancelledOrders}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Muvaffaqiyat darajasi:</span>
                      <span className="stat-value">
                        {analytics.totalOrders > 0 ? 
                          Math.round((analytics.completedOrders / analytics.totalOrders) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Communication Stats */}
                <div className="analytics-section">
                  <h3>Aloqa Statistikasi</h3>
                  <div className="communication-stats">
                    <div className="stat-row">
                      <span className="stat-label">Aloqa soni:</span>
                      <span className="stat-value">{analytics.communicationCount}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Javob berish darajasi:</span>
                      <span className="stat-value">
                        {analytics.communicationCount > 0 ? 'Faol' : 'Nofaol'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="communication-tab">
              {/* Contact Methods */}
              <div className="communication-section">
                <h3>Aloqa Imkoniyatlari</h3>
                <div className="contact-methods">
                  {customer.email && (
                    <a 
                      href={`mailto:${customer.email}?subject=Zamon Books - Mijoz aloqasi`}
                      className="contact-method email"
                    >
                      <i className="fas fa-envelope"></i>
                      <span>Email yuborish</span>
                      <div className="contact-info">{customer.email}</div>
                    </a>
                  )}
                  
                  {customer.phone && (
                    <a 
                      href={`tel:${customer.phone}`}
                      className="contact-method phone"
                    >
                      <i className="fas fa-phone"></i>
                      <span>Qo'ng'iroq qilish</span>
                      <div className="contact-info">{customer.phone}</div>
                    </a>
                  )}
                  
                  {customer.telegramUsername && (
                    <a 
                      {...createTelegramLinkProps(customer.telegramUsername)}
                      className="contact-method telegram"
                    >
                      <i className="fab fa-telegram"></i>
                      <span>Telegram'da yozish</span>
                      <div className="contact-info">@{customer.telegramUsername}</div>
                    </a>
                  )}

                  <button 
                    onClick={sendDirectMessage}
                    className="contact-method direct-message"
                  >
                    <i className="fas fa-paper-plane"></i>
                    <span>To'g'ridan-to'g'ri xabar</span>
                    <div className="contact-info">Tizim orqali yuborish</div>
                  </button>
                </div>
              </div>

              {/* Communication History */}
              <div className="communication-section">
                <h3>Aloqa Tarixi</h3>
                <div className="communication-history">
                  {communicationHistory.length === 0 ? (
                    <div className="no-communication">
                      <i className="fas fa-comments"></i>
                      <p>Hozircha aloqa tarixi yo'q</p>
                    </div>
                  ) : (
                    <div className="communication-list">
                      {communicationHistory.slice(0, 5).map(comm => (
                        <div key={comm.id} className="communication-item">
                          <div className="comm-header">
                            <div className="comm-type">
                              <i className={`fas ${comm.messageType === 'success' ? 'fa-check-circle' : 
                                                  comm.messageType === 'warning' ? 'fa-exclamation-triangle' :
                                                  comm.messageType === 'error' ? 'fa-times-circle' : 'fa-info-circle'}`}></i>
                              <span>{comm.sender === 'admin' ? 'Admin' : 'Mijoz'}</span>
                            </div>
                            <div className="comm-date">
                              {formatDate(comm.createdAt)}
                            </div>
                          </div>
                          <div className="comm-content">
                            {comm.message.length > 100 ? 
                              `${comm.message.substring(0, 100)}...` : 
                              comm.message
                            }
                          </div>
                        </div>
                      ))}
                      {communicationHistory.length > 5 && (
                        <div className="more-communications">
                          <span>Va yana {communicationHistory.length - 5} ta xabar...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              <div className="communication-section">
                <h3>Ichki Izohlar</h3>
                <div className="internal-notes">
                  {editingNotes ? (
                    <div className="notes-editor">
                      <textarea
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        placeholder="Mijoz haqida ichki izohlar..."
                        rows={4}
                        className="notes-textarea"
                      />
                      <div className="notes-actions">
                        <button 
                          onClick={() => {
                            setEditingNotes(false);
                            setInternalNotes(customer.internalNotes || '');
                          }}
                          className="btn btn-secondary"
                        >
                          <i className="fas fa-times"></i>
                          Bekor qilish
                        </button>
                        <button 
                          onClick={saveCustomerNotes}
                          className="btn btn-primary"
                        >
                          <i className="fas fa-save"></i>
                          Saqlash
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="notes-display">
                      <div className="notes-content">
                        {internalNotes || 'Hozircha izohlar yo\'q'}
                      </div>
                      <button 
                        onClick={() => setEditingNotes(true)}
                        className="edit-notes-btn"
                      >
                        <i className="fas fa-edit"></i>
                        Tahrirlash
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Tags */}
              <div className="communication-section">
                <h3>Mijoz Teglari</h3>
                <div className="customer-tags">
                  <div className="tags-display">
                    {customerTags.map(tag => (
                      <span key={tag} className="customer-tag">
                        {tag}
                        <button 
                          onClick={() => removeTag(tag)}
                          className="remove-tag"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    ))}
                    {customerTags.length === 0 && (
                      <span className="no-tags">Teglar yo'q</span>
                    )}
                  </div>
                  <div className="add-tag">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Yangi teg qo'shish..."
                      className="tag-input"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <button 
                      onClick={addTag}
                      className="add-tag-btn"
                      disabled={!newTag.trim()}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;