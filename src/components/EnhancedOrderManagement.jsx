/**
 * Enhanced Order Management Component
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4
 */

import React, { useState, useEffect, useCallback } from 'react';
import { OrderStatus, PaymentStatus, ShippingMethod } from '../models/OrderModel';
import EnhancedOrderService from '../services/EnhancedOrderService';
import { toast } from '../utils/toastUtils';
import { formatDate, formatCurrency } from '../utils/formatUtils';
import '../styles/admin/enhanced-orders.css';

const EnhancedOrderManagement = () => {
  // State management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalOrders, setTotalOrders] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Selected order for details/editing
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [showShippingUpdate, setShowShippingUpdate] = useState(false);
  const [showPaymentUpdate, setShowPaymentUpdate] = useState(false);
  
  // Form states
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: '',
    notes: ''
  });
  
  const [shippingUpdateForm, setShippingUpdateForm] = useState({
    method: '',
    trackingNumber: '',
    carrier: '',
    estimatedDelivery: '',
    instructions: ''
  });
  
  const [paymentUpdateForm, setPaymentUpdateForm] = useState({
    status: '',
    transactionId: '',
    amount: ''
  });
  
  // Analytics data
  const [analytics, setAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Load orders with filters
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const options = {
        limitCount: itemsPerPage,
        orderByField: 'timestamps.createdAt',
        orderDirection: 'desc'
      };

      // Apply filters
      if (statusFilter) {
        options.status = statusFilter;
      }
      
      if (paymentFilter) {
        options.paymentStatus = paymentFilter;
      }
      
      if (dateRange.start || dateRange.end) {
        options.dateRange = dateRange;
      }

      let result;
      if (searchQuery.trim()) {
        result = await EnhancedOrderService.searchOrders(searchQuery, options);
      } else {
        result = await EnhancedOrderService.getOrders(options);
      }

      setOrders(result.documents);
      setTotalOrders(result.total || result.documents.length);
      setHasMore(result.hasMore || false);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError(err.message);
      toast.error(`Buyurtmalarni yuklashda xato: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, paymentFilter, dateRange, itemsPerPage]);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      const result = await EnhancedOrderService.getOrderAnalytics(dateRange);
      setAnalytics(result.data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      toast.error(`Analitika yuklashda xato: ${err.message}`);
    }
  }, [dateRange]);

  // Initial load
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Load analytics when requested
  useEffect(() => {
    if (showAnalytics) {
      loadAnalytics();
    }
  }, [showAnalytics, loadAnalytics]);

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Handle filter changes
  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePaymentFilter = (e) => {
    setPaymentFilter(e.target.value);
    setCurrentPage(1);
  };

  // Handle date range changes
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value ? new Date(value) : null
    }));
    setCurrentPage(1);
  };

  // Order details handlers
  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetails(false);
  };

  // Status update handlers
  const openStatusUpdate = (order) => {
    setSelectedOrder(order);
    setStatusUpdateForm({
      status: order.status,
      notes: ''
    });
    setShowStatusUpdate(true);
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    
    if (!selectedOrder) return;
    
    try {
      await EnhancedOrderService.updateOrderStatus(
        selectedOrder.id,
        statusUpdateForm.status,
        statusUpdateForm.notes
      );
      
      toast.success('Buyurtma holati yangilandi');
      setShowStatusUpdate(false);
      loadOrders(); // Refresh orders list
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(`Holat yangilashda xato: ${err.message}`);
    }
  };

  // Shipping update handlers
  const openShippingUpdate = (order) => {
    setSelectedOrder(order);
    setShippingUpdateForm({
      method: order.shipping.method,
      trackingNumber: order.shipping.trackingNumber || '',
      carrier: order.shipping.carrier || '',
      estimatedDelivery: order.shipping.estimatedDelivery ? 
        order.shipping.estimatedDelivery.toISOString().split('T')[0] : '',
      instructions: order.shipping.instructions || ''
    });
    setShowShippingUpdate(true);
  };

  const handleShippingUpdate = async (e) => {
    e.preventDefault();
    
    if (!selectedOrder) return;
    
    try {
      const shippingData = {
        ...shippingUpdateForm,
        estimatedDelivery: shippingUpdateForm.estimatedDelivery ? 
          new Date(shippingUpdateForm.estimatedDelivery) : null
      };
      
      await EnhancedOrderService.updateShippingInfo(selectedOrder.id, shippingData);
      
      toast.success('Yetkazib berish ma\'lumotlari yangilandi');
      setShowShippingUpdate(false);
      loadOrders(); // Refresh orders list
    } catch (err) {
      console.error('Error updating shipping:', err);
      toast.error(`Yetkazib berish ma\'lumotlarini yangilashda xato: ${err.message}`);
    }
  };

  // Payment update handlers
  const openPaymentUpdate = (order) => {
    setSelectedOrder(order);
    setPaymentUpdateForm({
      status: order.payment.status,
      transactionId: order.payment.transactionId || '',
      amount: order.payment.amount || order.totalAmount
    });
    setShowPaymentUpdate(true);
  };

  const handlePaymentUpdate = async (e) => {
    e.preventDefault();
    
    if (!selectedOrder) return;
    
    try {
      await EnhancedOrderService.updatePaymentStatus(
        selectedOrder.id,
        paymentUpdateForm.status,
        paymentUpdateForm.transactionId,
        parseFloat(paymentUpdateForm.amount)
      );
      
      toast.success('To\'lov holati yangilandi');
      setShowPaymentUpdate(false);
      loadOrders(); // Refresh orders list
    } catch (err) {
      console.error('Error updating payment:', err);
      toast.error(`To\'lov holatini yangilashda xato: ${err.message}`);
    }
  };

  // Cancel order
  const handleCancelOrder = async (order, reason = '') => {
    if (!confirm('Buyurtmani bekor qilishni xohlaysizmi?')) return;
    
    try {
      await EnhancedOrderService.cancelOrder(order.id, reason);
      toast.success('Buyurtma bekor qilindi');
      loadOrders(); // Refresh orders list
    } catch (err) {
      console.error('Error cancelling order:', err);
      toast.error(`Buyurtmani bekor qilishda xato: ${err.message}`);
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const classes = {
      [OrderStatus.PENDING]: 'status-pending',
      [OrderStatus.CONFIRMED]: 'status-confirmed',
      [OrderStatus.PROCESSING]: 'status-processing',
      [OrderStatus.SHIPPED]: 'status-shipped',
      [OrderStatus.DELIVERED]: 'status-delivered',
      [OrderStatus.CANCELLED]: 'status-cancelled',
      [OrderStatus.REFUNDED]: 'status-refunded'
    };
    return classes[status] || 'status-pending';
  };

  // Get payment status badge class
  const getPaymentBadgeClass = (status) => {
    const classes = {
      [PaymentStatus.PENDING]: 'payment-pending',
      [PaymentStatus.PAID]: 'payment-paid',
      [PaymentStatus.FAILED]: 'payment-failed',
      [PaymentStatus.REFUNDED]: 'payment-refunded',
      [PaymentStatus.PARTIAL]: 'payment-partial'
    };
    return classes[status] || 'payment-pending';
  };

  if (loading && orders.length === 0) {
    return <div className="loading-spinner">Yuklanmoqda...</div>;
  }

  if (error && orders.length === 0) {
    return <div className="error-message">Xato: {error}</div>;
  }

  return (
    <div className="enhanced-order-management">
      <div className="page-header">
        <h1>Buyurtmalar boshqaruvi</h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <i className="fas fa-chart-bar"></i>
            Analitika
          </button>
          <button 
            className="btn btn-primary"
            onClick={loadOrders}
            disabled={loading}
          >
            <i className="fas fa-refresh"></i>
            Yangilash
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="analytics-panel">
          <h3>Buyurtmalar analitikasi</h3>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>Jami buyurtmalar</h4>
              <div className="analytics-value">{analytics.totalOrders}</div>
            </div>
            <div className="analytics-card">
              <h4>Jami daromad</h4>
              <div className="analytics-value">{formatCurrency(analytics.totalRevenue)}</div>
            </div>
            <div className="analytics-card">
              <h4>O'rtacha buyurtma qiymati</h4>
              <div className="analytics-value">{formatCurrency(analytics.averageOrderValue)}</div>
            </div>
            <div className="analytics-card">
              <h4>Kutilayotgan buyurtmalar</h4>
              <div className="analytics-value">{analytics.statusBreakdown.pending || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-panel">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Buyurtma raqami, mijoz nomi yoki telefon..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select value={statusFilter} onChange={handleStatusFilter}>
            <option value="">Barcha holatlar</option>
            <option value={OrderStatus.PENDING}>Kutilmoqda</option>
            <option value={OrderStatus.CONFIRMED}>Tasdiqlangan</option>
            <option value={OrderStatus.PROCESSING}>Jarayonda</option>
            <option value={OrderStatus.SHIPPED}>Yuborilgan</option>
            <option value={OrderStatus.DELIVERED}>Yetkazilgan</option>
            <option value={OrderStatus.CANCELLED}>Bekor qilingan</option>
          </select>
        </div>
        
        <div className="filter-group">
          <select value={paymentFilter} onChange={handlePaymentFilter}>
            <option value="">Barcha to'lovlar</option>
            <option value={PaymentStatus.PENDING}>Kutilmoqda</option>
            <option value={PaymentStatus.PAID}>To'langan</option>
            <option value={PaymentStatus.FAILED}>Muvaffaqiyatsiz</option>
            <option value={PaymentStatus.REFUNDED}>Qaytarilgan</option>
          </select>
        </div>
        
        <div className="filter-group">
          <input
            type="date"
            value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
            placeholder="Boshlanish sanasi"
          />
        </div>
        
        <div className="filter-group">
          <input
            type="date"
            value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            placeholder="Tugash sanasi"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Buyurtma raqami</th>
              <th>Sana</th>
              <th>Mijoz</th>
              <th>Mahsulotlar</th>
              <th>Jami summa</th>
              <th>Holat</th>
              <th>To'lov</th>
              <th>Yetkazib berish</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>
                  <span className="order-number">{order.orderNumber}</span>
                </td>
                <td>{formatDate(order.timestamps.createdAt)}</td>
                <td>
                  <div className="customer-info">
                    <div className="customer-name">{order.customer.name}</div>
                    <div className="customer-contact">{order.customer.phone}</div>
                  </div>
                </td>
                <td>
                  <span className="items-count">{order.items.length} ta mahsulot</span>
                </td>
                <td>
                  <span className="total-amount">{formatCurrency(order.totalAmount)}</span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                    {order.getStatusText()}
                  </span>
                </td>
                <td>
                  <span className={`payment-badge ${getPaymentBadgeClass(order.payment.status)}`}>
                    {order.getPaymentStatusText()}
                  </span>
                </td>
                <td>
                  <div className="shipping-info">
                    <div>{order.shipping.method}</div>
                    {order.shipping.trackingNumber && (
                      <div className="tracking-number">#{order.shipping.trackingNumber}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => openOrderDetails(order)}
                      title="Ko'rish"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => openStatusUpdate(order)}
                      title="Holatni yangilash"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => openShippingUpdate(order)}
                      title="Yetkazib berishni boshqarish"
                    >
                      <i className="fas fa-truck"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => openPaymentUpdate(order)}
                      title="To'lovni boshqarish"
                    >
                      <i className="fas fa-credit-card"></i>
                    </button>
                    {order.canBeCancelled() && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleCancelOrder(order)}
                        title="Bekor qilish"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {orders.length === 0 && !loading && (
          <div className="no-orders">
            <i className="fas fa-inbox"></i>
            <p>Buyurtmalar topilmadi</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination-container">
        <div className="pagination-info">
          Jami: {totalOrders} ta buyurtma
        </div>
        <div className="pagination-controls">
          <select 
            value={itemsPerPage} 
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span>tadan ko'rsatish</span>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="modal-overlay" onClick={closeOrderDetails}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buyurtma tafsilotlari - {selectedOrder.orderNumber}</h3>
              <button className="close-btn" onClick={closeOrderDetails}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="order-details-grid">
                <div className="details-section">
                  <h4>Mijoz ma'lumotlari</h4>
                  <p><strong>Ism:</strong> {selectedOrder.customer.name}</p>
                  <p><strong>Telefon:</strong> {selectedOrder.customer.phone}</p>
                  <p><strong>Email:</strong> {selectedOrder.customer.email}</p>
                  <p><strong>Manzil:</strong> {selectedOrder.customer.address.street}, {selectedOrder.customer.address.city}</p>
                </div>
                
                <div className="details-section">
                  <h4>Buyurtma ma'lumotlari</h4>
                  <p><strong>Holat:</strong> {selectedOrder.getStatusText()}</p>
                  <p><strong>Yaratilgan:</strong> {formatDate(selectedOrder.timestamps.createdAt)}</p>
                  <p><strong>Yangilangan:</strong> {formatDate(selectedOrder.timestamps.updatedAt)}</p>
                  <p><strong>Jami summa:</strong> {formatCurrency(selectedOrder.totalAmount)}</p>
                </div>
                
                <div className="details-section">
                  <h4>To'lov ma'lumotlari</h4>
                  <p><strong>Usul:</strong> {selectedOrder.payment.method}</p>
                  <p><strong>Holat:</strong> {selectedOrder.getPaymentStatusText()}</p>
                  {selectedOrder.payment.transactionId && (
                    <p><strong>Tranzaksiya ID:</strong> {selectedOrder.payment.transactionId}</p>
                  )}
                </div>
                
                <div className="details-section">
                  <h4>Yetkazib berish</h4>
                  <p><strong>Usul:</strong> {selectedOrder.shipping.method}</p>
                  {selectedOrder.shipping.trackingNumber && (
                    <p><strong>Kuzatuv raqami:</strong> {selectedOrder.shipping.trackingNumber}</p>
                  )}
                  {selectedOrder.shipping.estimatedDelivery && (
                    <p><strong>Taxminiy yetkazish:</strong> {formatDate(selectedOrder.shipping.estimatedDelivery)}</p>
                  )}
                </div>
              </div>
              
              <div className="order-items">
                <h4>Buyurtma mahsulotlari</h4>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th>Miqdor</th>
                      <th>Narx</th>
                      <th>Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.bookTitle}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusUpdate && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowStatusUpdate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buyurtma holatini yangilash</h3>
              <button className="close-btn" onClick={() => setShowStatusUpdate(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleStatusUpdate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Yangi holat:</label>
                  <select
                    value={statusUpdateForm.status}
                    onChange={(e) => setStatusUpdateForm(prev => ({ ...prev, status: e.target.value }))}
                    required
                  >
                    <option value={OrderStatus.PENDING}>Kutilmoqda</option>
                    <option value={OrderStatus.CONFIRMED}>Tasdiqlangan</option>
                    <option value={OrderStatus.PROCESSING}>Jarayonda</option>
                    <option value={OrderStatus.SHIPPED}>Yuborilgan</option>
                    <option value={OrderStatus.DELIVERED}>Yetkazilgan</option>
                    <option value={OrderStatus.CANCELLED}>Bekor qilingan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Izoh (ixtiyoriy):</label>
                  <textarea
                    value={statusUpdateForm.notes}
                    onChange={(e) => setStatusUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Holat o'zgarishi haqida izoh..."
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStatusUpdate(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-primary">
                  Yangilash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipping Update Modal */}
      {showShippingUpdate && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowShippingUpdate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yetkazib berish ma'lumotlarini yangilash</h3>
              <button className="close-btn" onClick={() => setShowShippingUpdate(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleShippingUpdate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Yetkazib berish usuli:</label>
                  <select
                    value={shippingUpdateForm.method}
                    onChange={(e) => setShippingUpdateForm(prev => ({ ...prev, method: e.target.value }))}
                  >
                    <option value={ShippingMethod.PICKUP}>Olib ketish</option>
                    <option value={ShippingMethod.DELIVERY}>Yetkazib berish</option>
                    <option value={ShippingMethod.COURIER}>Kuryer</option>
                    <option value={ShippingMethod.POST}>Pochta</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Kuzatuv raqami:</label>
                  <input
                    type="text"
                    value={shippingUpdateForm.trackingNumber}
                    onChange={(e) => setShippingUpdateForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                    placeholder="Kuzatuv raqamini kiriting..."
                  />
                </div>
                <div className="form-group">
                  <label>Tashuvchi:</label>
                  <input
                    type="text"
                    value={shippingUpdateForm.carrier}
                    onChange={(e) => setShippingUpdateForm(prev => ({ ...prev, carrier: e.target.value }))}
                    placeholder="Tashuvchi kompaniya nomi..."
                  />
                </div>
                <div className="form-group">
                  <label>Taxminiy yetkazish sanasi:</label>
                  <input
                    type="date"
                    value={shippingUpdateForm.estimatedDelivery}
                    onChange={(e) => setShippingUpdateForm(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Qo'shimcha ko'rsatmalar:</label>
                  <textarea
                    value={shippingUpdateForm.instructions}
                    onChange={(e) => setShippingUpdateForm(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Yetkazib berish bo'yicha ko'rsatmalar..."
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowShippingUpdate(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-primary">
                  Yangilash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Update Modal */}
      {showPaymentUpdate && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowPaymentUpdate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>To'lov ma'lumotlarini yangilash</h3>
              <button className="close-btn" onClick={() => setShowPaymentUpdate(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handlePaymentUpdate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>To'lov holati:</label>
                  <select
                    value={paymentUpdateForm.status}
                    onChange={(e) => setPaymentUpdateForm(prev => ({ ...prev, status: e.target.value }))}
                    required
                  >
                    <option value={PaymentStatus.PENDING}>Kutilmoqda</option>
                    <option value={PaymentStatus.PAID}>To'langan</option>
                    <option value={PaymentStatus.FAILED}>Muvaffaqiyatsiz</option>
                    <option value={PaymentStatus.REFUNDED}>Qaytarilgan</option>
                    <option value={PaymentStatus.PARTIAL}>Qisman to'langan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tranzaksiya ID:</label>
                  <input
                    type="text"
                    value={paymentUpdateForm.transactionId}
                    onChange={(e) => setPaymentUpdateForm(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="Tranzaksiya identifikatori..."
                  />
                </div>
                <div className="form-group">
                  <label>To'lov miqdori:</label>
                  <input
                    type="number"
                    value={paymentUpdateForm.amount}
                    onChange={(e) => setPaymentUpdateForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="To'lov miqdori..."
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentUpdate(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-primary">
                  Yangilash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedOrderManagement;