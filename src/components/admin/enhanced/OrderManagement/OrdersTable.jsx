import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, startAfter, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';

const OrdersTable = ({ 
  filters = {}, 
  sortBy = { field: 'createdAt', direction: 'desc' },
  onOrderSelect = null,
  onBulkAction = null,
  pageSize = 20
}) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
  const [dateFilter, setDateFilter] = useState(filters.dateRange || 'all');
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(filters.paymentStatus || 'all');

  // Status options
  const statusOptions = [
    { value: 'all', label: 'Barcha holatlar', count: 0 },
    { value: 'pending', label: 'Kutilmoqda', count: 0, color: 'warning' },
    { value: 'confirmed', label: 'Tasdiqlangan', count: 0, color: 'info' },
    { value: 'shipping', label: 'Yetkazilmoqda', count: 0, color: 'primary' },
    { value: 'completed', label: 'Tugallangan', count: 0, color: 'success' },
    { value: 'cancelled', label: 'Bekor qilingan', count: 0, color: 'danger' }
  ];

  const dateOptions = [
    { value: 'all', label: 'Barcha vaqt' },
    { value: 'today', label: 'Bugun' },
    { value: 'week', label: 'Bu hafta' },
    { value: 'month', label: 'Bu oy' },
    { value: 'custom', label: 'Boshqa muddat' }
  ];

  // Build Firestore query based on filters
  const buildQuery = useMemo(() => {
    let q = collection(db, COLLECTIONS.ORDERS);
    const constraints = [];

    // Status filter
    if (statusFilter !== 'all') {
      constraints.push(where('status', '==', statusFilter));
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          constraints.push(where('createdAt', '>=', startDate));
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          constraints.push(where('createdAt', '>=', startDate));
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          constraints.push(where('createdAt', '>=', startDate));
          break;
      }
    }

    // Payment status filter
    if (paymentStatusFilter !== 'all') {
      constraints.push(where('paymentStatus', '==', paymentStatusFilter));
    }

    // Add constraints to query
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    // Add sorting
    q = query(q, orderBy(sortBy.field, sortBy.direction));

    // Add pagination
    if (lastDoc && currentPage > 1) {
      q = query(q, startAfter(lastDoc));
    }

    q = query(q, limit(pageSize));

    return q;
  }, [statusFilter, dateFilter, paymentStatusFilter, sortBy, lastDoc, currentPage, pageSize]);

  // Load orders with real-time updates
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(buildQuery, (snapshot) => {
      try {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        }));

        // Filter by search query (client-side for now)
        const filteredOrders = searchQuery 
          ? ordersData.filter(order => 
              order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              order.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              order.bookTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              order.id.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : ordersData;

        setOrders(filteredOrders);
        setHasMore(snapshot.docs.length === pageSize);
        
        if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Orders loading error:', err);
        setError('Buyurtmalarni yuklashda xato yuz berdi');
        setLoading(false);
      }
    }, (err) => {
      console.error('Orders subscription error:', err);
      setError('Real-time yangilanishda xato');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [buildQuery, searchQuery]);

  // Handle order selection
  const handleOrderSelect = (orderId, isSelected) => {
    const newSelected = new Set(selectedOrders);
    if (isSelected) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(opt => opt.value === status);
    if (!statusConfig) return null;

    return (
      <span className={`status-badge ${statusConfig.color || 'secondary'}`}>
        {statusConfig.label}
      </span>
    );
  };

  // Handle bulk actions
  const handleBulkAction = (action) => {
    if (selectedOrders.size === 0) return;
    
    const selectedOrdersArray = Array.from(selectedOrders);
    onBulkAction && onBulkAction(action, selectedOrdersArray);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="orders-table-loading">
        <div className="table-skeleton">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-table-error">
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
    <div className="orders-table-container">
      {/* Filters */}
      <div className="orders-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>Holat:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Sana:</label>
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
            >
              {dateOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Qidiruv:</label>
            <div className="search-input-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Mijoz, email, kitob yoki ID bo'yicha qidiring..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="clear-search"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedOrders.size > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">
              {selectedOrders.size} ta buyurtma tanlangan
            </span>
            <div className="bulk-buttons">
              <button 
                onClick={() => handleBulkAction('confirm')}
                className="bulk-btn confirm"
              >
                <i className="fas fa-check"></i>
                Tasdiqlash
              </button>
              <button 
                onClick={() => handleBulkAction('ship')}
                className="bulk-btn ship"
              >
                <i className="fas fa-shipping-fast"></i>
                Yetkazishga yuborish
              </button>
              <button 
                onClick={() => handleBulkAction('cancel')}
                className="bulk-btn cancel"
              >
                <i className="fas fa-times"></i>
                Bekor qilish
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={selectedOrders.size === orders.length && orders.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>Buyurtma ID</th>
              <th>Mijoz</th>
              <th>Kitob</th>
              <th>Miqdor</th>
              <th>Summa</th>
              <th>Holat</th>
              <th>Sana</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr 
                key={order.id}
                className={`order-row ${selectedOrders.has(order.id) ? 'selected' : ''}`}
              >
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.id)}
                    onChange={(e) => handleOrderSelect(order.id, e.target.checked)}
                  />
                </td>
                <td className="order-id">
                  <code>#{order.id.substring(0, 8)}</code>
                </td>
                <td className="customer-info">
                  <div className="customer-details">
                    <div className="customer-name">{order.customerName || 'N/A'}</div>
                    <div className="customer-email">{order.customerEmail || 'N/A'}</div>
                  </div>
                </td>
                <td className="book-info">
                  <div className="book-title">{order.bookTitle || 'N/A'}</div>
                </td>
                <td className="quantity">
                  {order.quantity || 1}
                </td>
                <td className="amount">
                  {formatCurrency(order.totalAmount)}
                </td>
                <td className="status">
                  {getStatusBadge(order.status)}
                </td>
                <td className="date">
                  {formatDate(order.createdAt)}
                </td>
                <td className="actions">
                  <div className="action-buttons">
                    <button
                      onClick={() => onOrderSelect && onOrderSelect(order)}
                      className="action-btn view"
                      title="Ko'rish"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      onClick={() => onOrderSelect && onOrderSelect(order, 'edit')}
                      className="action-btn edit"
                      title="Tahrirlash"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && !loading && (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <h3>Buyurtmalar topilmadi</h3>
            <p>Hozircha bu filtrlar bo'yicha buyurtmalar yo'q</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {hasMore && (
        <div className="table-pagination">
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={loading}
            className="load-more-btn"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Yuklanmoqda...
              </>
            ) : (
              <>
                <i className="fas fa-chevron-down"></i>
                Ko'proq yuklash
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;