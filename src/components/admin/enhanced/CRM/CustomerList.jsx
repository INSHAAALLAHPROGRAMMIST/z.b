import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, startAfter, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';
import CustomerProfile from './CustomerProfile';
import notificationService from '../../../../services/NotificationService';

const CustomerList = ({ onCustomerSelect }) => {
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]); // For advanced filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [spendingFilter, setSpendingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [customerStats, setCustomerStats] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // grid or table
  const pageSize = 20;

  // Enhanced customer type filters
  const customerTypes = [
    { value: 'all', label: 'Barcha mijozlar', icon: 'fas fa-users' },
    { value: 'new', label: 'Yangi mijozlar', icon: 'fas fa-user-plus' },
    { value: 'regular', label: 'Doimiy mijozlar', icon: 'fas fa-user-check' },
    { value: 'vip', label: 'VIP mijozlar', icon: 'fas fa-crown' },
    { value: 'at_risk', label: 'Xavfda', icon: 'fas fa-exclamation-triangle' },
    { value: 'inactive', label: 'Nofaol mijozlar', icon: 'fas fa-user-clock' }
  ];

  // Activity filters
  const activityFilters = [
    { value: 'all', label: 'Barcha' },
    { value: 'last_7_days', label: 'Oxirgi 7 kun' },
    { value: 'last_30_days', label: 'Oxirgi 30 kun' },
    { value: 'last_90_days', label: 'Oxirgi 90 kun' },
    { value: 'inactive_30', label: '30+ kun nofaol' },
    { value: 'inactive_90', label: '90+ kun nofaol' }
  ];

  // Spending filters
  const spendingFilters = [
    { value: 'all', label: 'Barcha' },
    { value: 'high_spender', label: 'Ko\'p xarajat (1M+)' },
    { value: 'medium_spender', label: 'O\'rtacha xarajat (500K-1M)' },
    { value: 'low_spender', label: 'Kam xarajat (100K-500K)' },
    { value: 'minimal_spender', label: 'Minimal xarajat (<100K)' },
    { value: 'no_purchases', label: 'Xarid qilmagan' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'createdAt', label: 'Ro\'yxatdan o\'tgan sana' },
    { value: 'fullName', label: 'Ism bo\'yicha' },
    { value: 'lastLogin', label: 'Oxirgi kirish' },
    { value: 'totalSpent', label: 'Jami xarajat' },
    { value: 'totalOrders', label: 'Buyurtmalar soni' }
  ];

  // Build Firestore query
  const buildQuery = useMemo(() => {
    let q = collection(db, COLLECTIONS.USERS);
    const constraints = [];

    // Add filters based on customer type
    if (filterType !== 'all') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      switch (filterType) {
        case 'new':
          constraints.push(where('createdAt', '>=', thirtyDaysAgo));
          break;
        case 'active':
          constraints.push(where('lastLogin', '>=', thirtyDaysAgo));
          break;
        case 'inactive':
          constraints.push(where('lastLogin', '<', thirtyDaysAgo));
          break;
        // VIP filtering would need additional logic based on spending
      }
    }

    // Add constraints
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    // Add sorting
    q = query(q, orderBy(sortBy, sortDirection));

    // Add pagination
    if (lastDoc && currentPage > 1) {
      q = query(q, startAfter(lastDoc));
    }

    q = query(q, limit(pageSize));

    return q;
  }, [filterType, sortBy, sortDirection, lastDoc, currentPage]);

  // Load all customers for advanced filtering
  useEffect(() => {
    const loadAllCustomers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load all customers with their order data for accurate filtering
        const customersQuery = query(
          collection(db, COLLECTIONS.USERS),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(customersQuery, async (snapshot) => {
          const customersData = await Promise.all(
            snapshot.docs.map(async (customerDoc) => {
              const customerData = {
                id: customerDoc.id,
                ...customerDoc.data(),
                createdAt: customerDoc.data().createdAt?.toDate() || new Date(),
                lastLogin: customerDoc.data().lastLogin?.toDate() || null,
                lastActivity: customerDoc.data().lastActivity?.toDate() || null
              };

              // Load customer orders for analytics
              try {
                const ordersQuery = query(
                  collection(db, COLLECTIONS.ORDERS),
                  where('userId', '==', customerData.id)
                );
                const ordersSnapshot = await getDocs(ordersQuery);
                const orders = ordersSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  createdAt: doc.data().createdAt?.toDate() || new Date()
                }));

                // Calculate customer analytics
                const completedOrders = orders.filter(order => order.status === 'completed');
                const totalSpent = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
                const lastOrderDate = orders.length > 0 ? 
                  Math.max(...orders.map(o => o.createdAt.getTime())) : null;

                customerData.analytics = {
                  totalOrders: orders.length,
                  completedOrders: completedOrders.length,
                  totalSpent,
                  averageOrderValue: completedOrders.length > 0 ? totalSpent / completedOrders.length : 0,
                  lastOrderDate: lastOrderDate ? new Date(lastOrderDate) : null,
                  daysSinceLastOrder: lastOrderDate ? 
                    (new Date() - new Date(lastOrderDate)) / (1000 * 60 * 60 * 24) : null
                };

                // Calculate customer segment
                customerData.segment = calculateCustomerSegment(customerData);

              } catch (orderError) {
                console.warn(`Error loading orders for customer ${customerData.id}:`, orderError);
                customerData.analytics = {
                  totalOrders: 0,
                  completedOrders: 0,
                  totalSpent: 0,
                  averageOrderValue: 0,
                  lastOrderDate: null,
                  daysSinceLastOrder: null
                };
                customerData.segment = { label: 'Yangi', color: 'info', icon: 'fas fa-user-plus' };
              }

              return customerData;
            })
          );

          setAllCustomers(customersData);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error('Customers loading error:', err);
        setError('Mijozlarni yuklashda xato yuz berdi');
        setLoading(false);
      }
    };

    loadAllCustomers();
  }, []);

  // Calculate customer segment
  const calculateCustomerSegment = (customer) => {
    const { analytics } = customer;
    if (!analytics) return { label: 'Yangi', color: 'info', icon: 'fas fa-user-plus' };

    const { totalSpent, completedOrders, daysSinceLastOrder } = analytics;
    const daysSinceRegistration = customer.createdAt ? 
      (new Date() - customer.createdAt) / (1000 * 60 * 60 * 24) : 0;

    // VIP: High spending, frequent orders
    if (totalSpent > 2000000 && completedOrders > 10) {
      return { label: 'VIP', color: 'warning', icon: 'fas fa-crown' };
    }
    
    // Regular: Consistent spending and orders
    if (totalSpent > 500000 && completedOrders > 5) {
      return { label: 'Doimiy', color: 'success', icon: 'fas fa-user-check' };
    }
    
    // At Risk: Long time since last order
    if (daysSinceLastOrder && daysSinceLastOrder > 90 && completedOrders > 0) {
      return { label: 'Xavfda', color: 'danger', icon: 'fas fa-exclamation-triangle' };
    }
    
    // Inactive: No recent activity
    if (daysSinceLastOrder && daysSinceLastOrder > 180) {
      return { label: 'Nofaol', color: 'secondary', icon: 'fas fa-user-clock' };
    }
    
    // New: Recently registered
    if (daysSinceRegistration < 30) {
      return { label: 'Yangi', color: 'info', icon: 'fas fa-user-plus' };
    }
    
    return { label: 'Faol', color: 'primary', icon: 'fas fa-user-friends' };
  };

  // Advanced filtering logic
  const filteredCustomers = useMemo(() => {
    let filtered = [...allCustomers];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.fullName?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query) ||
        customer.telegramUsername?.toLowerCase().includes(query) ||
        customer.id.toLowerCase().includes(query) ||
        customer.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        customer.internalNotes?.toLowerCase().includes(query)
      );
    }

    // Customer type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(customer => {
        const segment = customer.segment?.label?.toLowerCase();
        switch (filterType) {
          case 'new':
            return segment === 'yangi';
          case 'regular':
            return segment === 'doimiy';
          case 'vip':
            return segment === 'vip';
          case 'at_risk':
            return segment === 'xavfda';
          case 'inactive':
            return segment === 'nofaol';
          default:
            return true;
        }
      });
    }

    // Activity filter
    if (activityFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(customer => {
        const lastActivity = customer.lastActivity || customer.lastLogin || customer.analytics?.lastOrderDate;
        if (!lastActivity) return activityFilter.includes('inactive');

        const daysSinceActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);
        
        switch (activityFilter) {
          case 'last_7_days':
            return daysSinceActivity <= 7;
          case 'last_30_days':
            return daysSinceActivity <= 30;
          case 'last_90_days':
            return daysSinceActivity <= 90;
          case 'inactive_30':
            return daysSinceActivity > 30;
          case 'inactive_90':
            return daysSinceActivity > 90;
          default:
            return true;
        }
      });
    }

    // Spending filter
    if (spendingFilter !== 'all') {
      filtered = filtered.filter(customer => {
        const totalSpent = customer.analytics?.totalSpent || 0;
        
        switch (spendingFilter) {
          case 'high_spender':
            return totalSpent >= 1000000;
          case 'medium_spender':
            return totalSpent >= 500000 && totalSpent < 1000000;
          case 'low_spender':
            return totalSpent >= 100000 && totalSpent < 500000;
          case 'minimal_spender':
            return totalSpent > 0 && totalSpent < 100000;
          case 'no_purchases':
            return totalSpent === 0;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'fullName':
          aValue = a.fullName || '';
          bValue = b.fullName || '';
          break;
        case 'totalSpent':
          aValue = a.analytics?.totalSpent || 0;
          bValue = b.analytics?.totalSpent || 0;
          break;
        case 'totalOrders':
          aValue = a.analytics?.totalOrders || 0;
          bValue = b.analytics?.totalOrders || 0;
          break;
        case 'lastLogin':
          aValue = a.lastLogin || new Date(0);
          bValue = b.lastLogin || new Date(0);
          break;
        default:
          aValue = a.createdAt || new Date(0);
          bValue = b.createdAt || new Date(0);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [allCustomers, searchQuery, filterType, activityFilter, spendingFilter, sortBy, sortDirection]);

  // Calculate statistics
  const customerStatistics = useMemo(() => {
    const stats = {
      total: allCustomers.length,
      new: 0,
      regular: 0,
      vip: 0,
      atRisk: 0,
      inactive: 0,
      totalSpent: 0,
      averageSpent: 0
    };

    allCustomers.forEach(customer => {
      const segment = customer.segment?.label?.toLowerCase();
      const spent = customer.analytics?.totalSpent || 0;
      
      stats.totalSpent += spent;
      
      switch (segment) {
        case 'yangi':
          stats.new++;
          break;
        case 'doimiy':
          stats.regular++;
          break;
        case 'vip':
          stats.vip++;
          break;
        case 'xavfda':
          stats.atRisk++;
          break;
        case 'nofaol':
          stats.inactive++;
          break;
      }
    });

    stats.averageSpent = stats.total > 0 ? stats.totalSpent / stats.total : 0;

    return stats;
  }, [allCustomers]);

  // Calculate customer segment
  const getCustomerSegment = (customer) => {
    // This would normally be calculated from order data
    // For now, using mock logic
    const daysSinceRegistration = customer.createdAt ? 
      (new Date() - customer.createdAt) / (1000 * 60 * 60 * 24) : 0;
    
    if (daysSinceRegistration < 7) {
      return { label: 'Yangi', color: 'info', icon: 'fas fa-user-plus' };
    } else if (daysSinceRegistration > 90) {
      return { label: 'Doimiy', color: 'success', icon: 'fas fa-user-check' };
    } else {
      return { label: 'Faol', color: 'primary', icon: 'fas fa-user-friends' };
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setShowProfile(true);
    onCustomerSelect && onCustomerSelect(customer);
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setActivityFilter('all');
    setSpendingFilter('all');
  };

  // Handle bulk selection
  const handleBulkSelect = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const selectAllCustomers = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  // Bulk actions
  const handleBulkMessage = async () => {
    try {
      const customers = filteredCustomers.filter(c => selectedCustomers.includes(c.id));
      
      for (const customer of customers) {
        await notificationService.sendOrderStatusNotification(
          {
            id: 'bulk_message',
            customerInfo: customer,
            totalAmount: 0,
            items: []
          },
          'custom_message',
          'Zamon Books jamoasidan salom! Sizga maxsus taklif bor.'
        );
      }

      showToast(`${customers.length} ta mijozga xabar yuborildi`, 'success');
      setSelectedCustomers([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk message error:', error);
      showToast('Xabar yuborishda xato', 'error');
    }
  };

  const handleBulkTag = async (tag) => {
    try {
      const updatePromises = selectedCustomers.map(customerId => 
        updateDoc(doc(db, COLLECTIONS.USERS, customerId), {
          tags: [...(allCustomers.find(c => c.id === customerId)?.tags || []), tag],
          updatedAt: serverTimestamp()
        })
      );

      await Promise.all(updatePromises);
      showToast(`${selectedCustomers.length} ta mijozga teg qo'shildi`, 'success');
      setSelectedCustomers([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk tag error:', error);
      showToast('Teg qo\'shishda xato', 'error');
    }
  };

  // Send direct message to customer
  const sendDirectMessage = async (customer) => {
    try {
      const result = await notificationService.sendOrderStatusNotification(
        {
          id: 'direct_message',
          customerInfo: customer,
          totalAmount: 0,
          items: []
        },
        'custom_message',
        `Salom ${customer.fullName}! Zamon Books jamoasidan sizga maxsus xabar.`
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  if (loading && customers.length === 0) {
    return (
      <div className="customer-list-loading">
        <div className="loading-header">
          <div className="header-skeleton"></div>
          <div className="controls-skeleton"></div>
        </div>
        <div className="list-skeleton">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="customer-skeleton">
              <div className="avatar-skeleton"></div>
              <div className="info-skeleton">
                <div className="name-skeleton"></div>
                <div className="details-skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-list-error">
        <div className="error-content">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Xato yuz berdi</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Qayta yuklash
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-list">
      <div className="customer-list-header">
        <div className="header-info">
          <h2>Mijozlar Ro'yxati</h2>
          <p>Barcha mijozlarni boshqaring va ular bilan aloqa qiling</p>
        </div>
        
        <div className="header-stats">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{customerStatistics.total}</div>
                <div className="stat-label">Jami mijozlar</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon vip">
                <i className="fas fa-crown"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{customerStatistics.vip}</div>
                <div className="stat-label">VIP mijozlar</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon revenue">
                <i className="fas fa-money-bill-wave"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(customerStatistics.totalSpent)}</div>
                <div className="stat-label">Jami daromad</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon risk">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{customerStatistics.atRisk}</div>
                <div className="stat-label">Xavfda</div>
              </div>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid ko'rinish"
            >
              <i className="fas fa-th"></i>
            </button>
            <button 
              className={`view-toggle ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Jadval ko'rinish"
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="customer-filters">
        <div className="filters-row">
          <div className="search-section">
            <div className="search-input-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Mijoz qidirish (ism, email, telefon, teglar, izohlar)..."
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
              />
              {searchQuery && (
                <button onClick={clearSearch} className="clear-search">
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-group">
              <label>Turi:</label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                {customerTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Faollik:</label>
              <select 
                value={activityFilter} 
                onChange={(e) => setActivityFilter(e.target.value)}
                className="filter-select"
              >
                {activityFilters.map(filter => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Xarajat:</label>
              <select 
                value={spendingFilter} 
                onChange={(e) => setSpendingFilter(e.target.value)}
                className="filter-select"
              >
                {spendingFilters.map(filter => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sort-section">
            <div className="sort-group">
              <label>Saralash:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="sort-direction-btn"
                title={sortDirection === 'asc' ? 'O\'sish tartibida' : 'Kamayish tartibida'}
              >
                <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
              </button>
            </div>
          </div>

          <div className="actions-section">
            <button 
              onClick={clearAllFilters}
              className="clear-filters-btn"
              title="Barcha filtrlarni tozalash"
            >
              <i className="fas fa-eraser"></i>
              Tozalash
            </button>
          </div>
        </div>

        <div className="results-info">
          <div className="results-count">
            <span>{filteredCustomers.length} ta mijoz ko'rsatilmoqda</span>
            {(searchQuery || filterType !== 'all' || activityFilter !== 'all' || spendingFilter !== 'all') && (
              <span className="filtered-indicator">
                ({allCustomers.length} dan filtrlangan)
              </span>
            )}
          </div>

          {selectedCustomers.length > 0 && (
            <div className="bulk-actions">
              <span className="selected-count">{selectedCustomers.length} ta tanlangan</span>
              <button 
                onClick={handleBulkMessage}
                className="bulk-action-btn message"
              >
                <i className="fas fa-envelope"></i>
                Xabar yuborish
              </button>
              <button 
                onClick={() => handleBulkTag('VIP')}
                className="bulk-action-btn tag"
              >
                <i className="fas fa-tag"></i>
                Teg qo'shish
              </button>
              <button 
                onClick={() => setSelectedCustomers([])}
                className="bulk-action-btn clear"
              >
                <i className="fas fa-times"></i>
                Bekor qilish
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="customers-container">
        {filteredCustomers.length === 0 && !loading ? (
          <div className="empty-state">
            <i className="fas fa-users"></i>
            <h3>Mijozlar topilmadi</h3>
            <p>Hozircha bu filtrlar bo'yicha mijozlar yo'q</p>
            {(searchQuery || filterType !== 'all' || activityFilter !== 'all' || spendingFilter !== 'all') && (
              <button onClick={clearAllFilters} className="clear-filters-btn">
                <i className="fas fa-eraser"></i>
                Filtrlarni tozalash
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Bulk selection header */}
            {filteredCustomers.length > 0 && (
              <div className="bulk-selection-header">
                <label className="bulk-select-all">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === filteredCustomers.length}
                    onChange={selectAllCustomers}
                  />
                  <span>Barchasini tanlash</span>
                </label>
                <span className="total-count">{filteredCustomers.length} ta mijoz</span>
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="customers-grid">
                {filteredCustomers.map(customer => {
                  const segment = customer.segment;
                  const analytics = customer.analytics || {};
                  
                  return (
                    <div 
                      key={customer.id}
                      className={`customer-card ${selectedCustomers.includes(customer.id) ? 'selected' : ''}`}
                    >
                      <div className="card-header">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => handleBulkSelect(customer.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="customer-avatar">
                          <i className="fas fa-user"></i>
                        </div>
                      </div>
                      
                      <div className="customer-info" onClick={() => handleCustomerSelect(customer)}>
                        <div className="customer-header">
                          <h3>{customer.fullName || 'N/A'}</h3>
                          <span className={`customer-segment ${segment?.color || 'secondary'}`}>
                            <i className={segment?.icon || 'fas fa-user'}></i>
                            {segment?.label || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="customer-details">
                          {customer.email && (
                            <div className="detail-item">
                              <i className="fas fa-envelope"></i>
                              <span>{customer.email}</span>
                            </div>
                          )}
                          
                          {customer.phone && (
                            <div className="detail-item">
                              <i className="fas fa-phone"></i>
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          
                          {customer.telegramUsername && (
                            <div className="detail-item">
                              <i className="fab fa-telegram"></i>
                              <span>@{customer.telegramUsername}</span>
                            </div>
                          )}
                        </div>

                        <div className="customer-analytics">
                          <div className="analytics-item">
                            <span className="analytics-label">Buyurtmalar:</span>
                            <span className="analytics-value">{analytics.totalOrders || 0}</span>
                          </div>
                          <div className="analytics-item">
                            <span className="analytics-label">Xarajat:</span>
                            <span className="analytics-value">{formatCurrency(analytics.totalSpent || 0)}</span>
                          </div>
                        </div>

                        {customer.tags && customer.tags.length > 0 && (
                          <div className="customer-tags">
                            {customer.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="customer-tag">{tag}</span>
                            ))}
                            {customer.tags.length > 3 && (
                              <span className="more-tags">+{customer.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                        
                        <div className="customer-meta">
                          <div className="meta-item">
                            <span className="meta-label">Ro'yxatdan:</span>
                            <span className="meta-value">{formatDate(customer.createdAt)}</span>
                          </div>
                          
                          {analytics.lastOrderDate && (
                            <div className="meta-item">
                              <span className="meta-label">Oxirgi buyurtma:</span>
                              <span className="meta-value">{formatDate(analytics.lastOrderDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="customer-actions">
                        <button 
                          className="action-btn view" 
                          title="Profilni ko'rish"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCustomerSelect(customer);
                          }}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="action-btn message" 
                          title="Xabar yuborish"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendDirectMessage(customer);
                          }}
                        >
                          <i className="fas fa-envelope"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="customers-table">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.length === filteredCustomers.length}
                          onChange={selectAllCustomers}
                        />
                      </th>
                      <th>Mijoz</th>
                      <th>Segment</th>
                      <th>Aloqa</th>
                      <th>Buyurtmalar</th>
                      <th>Xarajat</th>
                      <th>Oxirgi faollik</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map(customer => {
                      const segment = customer.segment;
                      const analytics = customer.analytics || {};
                      
                      return (
                        <tr 
                          key={customer.id}
                          className={selectedCustomers.includes(customer.id) ? 'selected' : ''}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedCustomers.includes(customer.id)}
                              onChange={() => handleBulkSelect(customer.id)}
                            />
                          </td>
                          <td>
                            <div className="table-customer-info">
                              <div className="customer-avatar small">
                                <i className="fas fa-user"></i>
                              </div>
                              <div className="customer-details">
                                <div className="customer-name">{customer.fullName || 'N/A'}</div>
                                <div className="customer-id">#{customer.id.substring(0, 8)}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`customer-segment small ${segment?.color || 'secondary'}`}>
                              <i className={segment?.icon || 'fas fa-user'}></i>
                              {segment?.label || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div className="contact-info">
                              {customer.email && <div><i className="fas fa-envelope"></i> {customer.email}</div>}
                              {customer.phone && <div><i className="fas fa-phone"></i> {customer.phone}</div>}
                              {customer.telegramUsername && <div><i className="fab fa-telegram"></i> @{customer.telegramUsername}</div>}
                            </div>
                          </td>
                          <td>{analytics.totalOrders || 0}</td>
                          <td>{formatCurrency(analytics.totalSpent || 0)}</td>
                          <td>{formatDate(analytics.lastOrderDate || customer.lastLogin)}</td>
                          <td>
                            <div className="table-actions">
                              <button 
                                className="action-btn view small" 
                                title="Profilni ko'rish"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button 
                                className="action-btn message small" 
                                title="Xabar yuborish"
                                onClick={() => sendDirectMessage(customer)}
                              >
                                <i className="fas fa-envelope"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Customer Profile Modal */}
      {showProfile && selectedCustomer && (
        <CustomerProfile
          customerId={selectedCustomer.id}
          onClose={() => {
            setShowProfile(false);
            setSelectedCustomer(null);
          }}
        />
      )}
    </div>
  );
};

export default CustomerList;