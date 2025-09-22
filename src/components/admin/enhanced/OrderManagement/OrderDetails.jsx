import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';
import OrderStatusManager from './OrderStatusManager';
import CustomerCommunication from './CustomerCommunication';
import { createTelegramLinkProps } from '../../../../utils/telegramUtils';

const OrderDetails = ({ order, onClose, onStatusUpdate, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState(order);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [bookDetails, setBookDetails] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);

  useEffect(() => {
    if (order) {
      loadOrderDetails();
    }
  }, [order]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      // Load customer information
      if (order.userId) {
        const customerDoc = await getDoc(doc(db, COLLECTIONS.USERS, order.userId));
        if (customerDoc.exists()) {
          setCustomerInfo(customerDoc.data());
        }
      }

      // Load book details
      if (order.items && order.items.length > 0) {
        const bookPromises = order.items.map(async (item) => {
          const bookDoc = await getDoc(doc(db, COLLECTIONS.BOOKS, item.bookId));
          return {
            ...item,
            bookData: bookDoc.exists() ? bookDoc.data() : null
          };
        });
        const books = await Promise.all(bookPromises);
        setBookDetails(books);
      } else if (order.bookId) {
        // Handle single book orders (legacy format)
        const bookDoc = await getDoc(doc(db, COLLECTIONS.BOOKS, order.bookId));
        setBookDetails([{
          bookId: order.bookId,
          quantity: order.quantity || 1,
          price: order.bookPrice || order.totalAmount,
          bookData: bookDoc.exists() ? bookDoc.data() : null
        }]);
      }

      // Load order history/status changes
      const historyQuery = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('orderId', '==', order.id),
        where('type', '==', 'order_status'),
        orderBy('createdAt', 'desc')
      );
      const historySnapshot = await getDocs(historyQuery);
      const history = historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrderHistory(history);

    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (orderId, newStatus, notes) => {
    // Update local state
    setOrderDetails(prev => ({
      ...prev,
      status: newStatus,
      updatedAt: new Date()
    }));

    // Call parent callback
    onStatusUpdate && onStatusUpdate(orderId, newStatus, notes);
    onRefresh && onRefresh();
    
    // Close status manager
    setShowStatusManager(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Kutilmoqda', color: 'warning', icon: 'fas fa-clock' },
      confirmed: { label: 'Tasdiqlangan', color: 'info', icon: 'fas fa-check-circle' },
      shipping: { label: 'Yetkazilmoqda', color: 'primary', icon: 'fas fa-shipping-fast' },
      completed: { label: 'Tugallangan', color: 'success', icon: 'fas fa-check-double' },
      cancelled: { label: 'Bekor qilingan', color: 'danger', icon: 'fas fa-times-circle' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`status-badge ${config.color}`}>
        <i className={config.icon}></i>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const statusConfig = {
      pending: { label: 'Kutilmoqda', color: 'warning' },
      confirmed: { label: 'Tasdiqlangan', color: 'success' },
      failed: { label: 'Muvaffaqiyatsiz', color: 'danger' },
      refunded: { label: 'Qaytarilgan', color: 'info' }
    };

    const config = statusConfig[paymentStatus] || statusConfig.pending;
    
    return (
      <span className={`payment-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (!order) {
    return (
      <div className="order-details-modal">
        <div className="modal-content">
          <div className="error-state">
            <i className="fas fa-exclamation-triangle"></i>
            <p>Buyurtma ma'lumotlari topilmadi</p>
            <button onClick={onClose} className="btn btn-primary">Yopish</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-details-overlay">
      <div className="order-details-modal large">
        <div className="modal-header">
          <div className="header-info">
            <h2>
              <i className="fas fa-receipt"></i>
              Buyurtma #{orderDetails.orderNumber || orderDetails.id.substring(0, 8).toUpperCase()}
            </h2>
            <div className="header-badges">
              {getStatusBadge(orderDetails.status)}
              {orderDetails.paymentStatus && getPaymentStatusBadge(orderDetails.paymentStatus)}
            </div>
          </div>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <i className="fas fa-info-circle"></i>
            Tafsilotlar
          </button>
          <button 
            className={`tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => setActiveTab('customer')}
          >
            <i className="fas fa-user"></i>
            Mijoz
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="fas fa-history"></i>
            Tarix
          </button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Ma'lumotlar yuklanmoqda...</p>
            </div>
          ) : (
            <>
              {activeTab === 'details' && (
                <div className="details-tab">
                  <div className="details-grid">
                    {/* Order Information */}
                    <div className="detail-section">
                      <h3>
                        <i className="fas fa-shopping-cart"></i>
                        Buyurtma Ma'lumotlari
                      </h3>
                      <div className="detail-items">
                        <div className="detail-item">
                          <label>Buyurtma raqami:</label>
                          <span>#{orderDetails.orderNumber || orderDetails.id.substring(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="detail-item">
                          <label>Holat:</label>
                          {getStatusBadge(orderDetails.status)}
                        </div>
                        <div className="detail-item">
                          <label>Yaratilgan:</label>
                          <span>{formatDate(orderDetails.createdAt)}</span>
                        </div>
                        <div className="detail-item">
                          <label>Yangilangan:</label>
                          <span>{formatDate(orderDetails.updatedAt)}</span>
                        </div>
                        {orderDetails.trackingNumber && (
                          <div className="detail-item">
                            <label>Kuzatuv raqami:</label>
                            <span className="tracking-number">{orderDetails.trackingNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Books Information */}
                    <div className="detail-section">
                      <h3>
                        <i className="fas fa-book"></i>
                        Kitoblar
                      </h3>
                      <div className="books-list">
                        {bookDetails.length > 0 ? bookDetails.map((item, index) => (
                          <div key={index} className="book-item">
                            <div className="book-image">
                              {item.bookData?.imageUrl ? (
                                <img src={item.bookData.imageUrl} alt={item.bookData.title} />
                              ) : (
                                <div className="no-image">
                                  <i className="fas fa-book"></i>
                                </div>
                              )}
                            </div>
                            <div className="book-info">
                              <h4>{item.bookData?.title || orderDetails.bookTitle || 'Kitob nomi topilmadi'}</h4>
                              <p className="book-author">{item.bookData?.author}</p>
                              <div className="book-details">
                                <span className="quantity">Miqdor: {item.quantity}</span>
                                <span className="price">{formatCurrency(item.price)}</span>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="book-item">
                            <div className="book-image">
                              <div className="no-image">
                                <i className="fas fa-book"></i>
                              </div>
                            </div>
                            <div className="book-info">
                              <h4>{orderDetails.bookTitle || 'Kitob nomi topilmadi'}</h4>
                              <div className="book-details">
                                <span className="quantity">Miqdor: {orderDetails.quantity || 1}</span>
                                <span className="price">{formatCurrency(orderDetails.bookPrice || orderDetails.totalAmount)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div className="detail-section">
                      <h3>
                        <i className="fas fa-credit-card"></i>
                        To'lov Ma'lumotlari
                      </h3>
                      <div className="detail-items">
                        <div className="detail-item">
                          <label>Umumiy summa:</label>
                          <span className="total-amount">{formatCurrency(orderDetails.totalAmount)}</span>
                        </div>
                        <div className="detail-item">
                          <label>To'lov usuli:</label>
                          <span>{orderDetails.paymentMethod || 'Naqd pul'}</span>
                        </div>
                        <div className="detail-item">
                          <label>To'lov holati:</label>
                          {getPaymentStatusBadge(orderDetails.paymentStatus || 'pending')}
                        </div>
                        {orderDetails.deliveryFee && (
                          <div className="detail-item">
                            <label>Yetkazib berish:</label>
                            <span>{formatCurrency(orderDetails.deliveryFee)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Information */}
                    <div className="detail-section">
                      <h3>
                        <i className="fas fa-truck"></i>
                        Yetkazib Berish
                      </h3>
                      <div className="detail-items">
                        <div className="detail-item">
                          <label>Manzil:</label>
                          <span>{orderDetails.deliveryAddress || orderDetails.customerAddress || 'Kiritilmagan'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Yetkazib berish usuli:</label>
                          <span>{orderDetails.deliveryMethod || 'Standart'}</span>
                        </div>
                        {orderDetails.estimatedDelivery && (
                          <div className="detail-item">
                            <label>Taxminiy yetkazish:</label>
                            <span>{formatDate(orderDetails.estimatedDelivery)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {(orderDetails.notes || orderDetails.internalNotes || orderDetails.statusNotes) && (
                      <div className="detail-section full-width">
                        <h3>
                          <i className="fas fa-sticky-note"></i>
                          Izohlar
                        </h3>
                        {orderDetails.notes && (
                          <div className="note-item">
                            <label>Mijoz izohi:</label>
                            <p>{orderDetails.notes}</p>
                          </div>
                        )}
                        {orderDetails.internalNotes && (
                          <div className="note-item">
                            <label>Ichki izoh:</label>
                            <p>{orderDetails.internalNotes}</p>
                          </div>
                        )}
                        {orderDetails.statusNotes && (
                          <div className="note-item">
                            <label>Holat izohi:</label>
                            <p>{orderDetails.statusNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'customer' && (
                <div className="customer-tab">
                  <div className="customer-info">
                    <div className="customer-header">
                      <div className="customer-avatar">
                        <i className="fas fa-user"></i>
                      </div>
                      <div className="customer-details">
                        <h3>{customerInfo?.fullName || orderDetails.customerName}</h3>
                        <p className="customer-type">
                          {customerInfo?.customerType || 'Mijoz'}
                        </p>
                      </div>
                    </div>

                    <div className="contact-info">
                      <h4>Aloqa Ma'lumotlari</h4>
                      <div className="contact-items">
                        <div className="contact-item">
                          <i className="fas fa-phone"></i>
                          <span>{customerInfo?.phone || orderDetails.customerPhone}</span>
                          <a href={`tel:${customerInfo?.phone || orderDetails.customerPhone}`} className="contact-btn">
                            <i className="fas fa-phone-alt"></i>
                          </a>
                        </div>
                        
                        {(customerInfo?.email || orderDetails.customerEmail) && (
                          <div className="contact-item">
                            <i className="fas fa-envelope"></i>
                            <span>{customerInfo?.email || orderDetails.customerEmail}</span>
                            <a href={`mailto:${customerInfo?.email || orderDetails.customerEmail}`} className="contact-btn">
                              <i className="fas fa-envelope"></i>
                            </a>
                          </div>
                        )}
                        
                        {(customerInfo?.telegramUsername || orderDetails.customerTelegram || orderDetails.telegramUsername) && (
                          <div className="contact-item">
                            <i className="fab fa-telegram"></i>
                            <span>{customerInfo?.telegramUsername || orderDetails.customerTelegram || orderDetails.telegramUsername}</span>
                            <a 
                              {...createTelegramLinkProps(customerInfo?.telegramUsername || orderDetails.customerTelegram || orderDetails.telegramUsername)}
                              className="contact-btn"
                            >
                              <i className="fab fa-telegram"></i>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {customerInfo && (
                      <div className="customer-stats">
                        <h4>Mijoz Statistikasi</h4>
                        <div className="stats-grid">
                          <div className="stat-item">
                            <div className="stat-value">{customerInfo.totalOrders || 0}</div>
                            <div className="stat-label">Buyurtmalar</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-value">{formatCurrency(customerInfo.totalSpent || 0)}</div>
                            <div className="stat-label">Umumiy xarid</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-value">{formatDate(customerInfo.lastOrderDate)}</div>
                            <div className="stat-label">Oxirgi buyurtma</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="communication-actions">
                      <button 
                        onClick={() => setShowCommunication(true)}
                        className="contact-btn primary"
                      >
                        <i className="fas fa-comments"></i>
                        Aloqa qilish
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="history-tab">
                  <div className="order-timeline">
                    <h3>
                      <i className="fas fa-history"></i>
                      Buyurtma Tarixi
                    </h3>
                    
                    <div className="timeline">
                      {/* Created */}
                      <div className="timeline-item">
                        <div className="timeline-marker created">
                          <i className="fas fa-plus"></i>
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-title">Buyurtma yaratildi</span>
                            <span className="timeline-date">{formatDate(orderDetails.createdAt)}</span>
                          </div>
                          <div className="timeline-description">
                            Mijoz tomonidan yangi buyurtma berildi
                          </div>
                        </div>
                      </div>

                      {/* Status changes from history */}
                      {orderHistory.map((event, index) => (
                        <div key={event.id} className="timeline-item">
                          <div className="timeline-marker">
                            <i className="fas fa-circle"></i>
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-title">
                                Holat o'zgartirildi: {event.status}
                              </span>
                              <span className="timeline-date">
                                {formatDate(event.createdAt)}
                              </span>
                            </div>
                            {event.notes && (
                              <div className="timeline-notes">
                                {event.notes}
                              </div>
                            )}
                            <div className="timeline-meta">
                              {event.success ? (
                                <span className="success-indicator">
                                  <i className="fas fa-check"></i>
                                  Xabar yuborildi
                                </span>
                              ) : (
                                <span className="error-indicator">
                                  <i className="fas fa-exclamation-triangle"></i>
                                  Xabar yuborilmadi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Legacy status timestamps */}
                      {orderDetails.confirmedAt && (
                        <div className="timeline-item">
                          <div className="timeline-marker confirmed">
                            <i className="fas fa-check"></i>
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-title">Buyurtma tasdiqlandi</span>
                              <span className="timeline-date">{formatDate(orderDetails.confirmedAt)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {orderDetails.shippingAt && (
                        <div className="timeline-item">
                          <div className="timeline-marker shipping">
                            <i className="fas fa-shipping-fast"></i>
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-title">Yetkazishga yuborildi</span>
                              <span className="timeline-date">{formatDate(orderDetails.shippingAt)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {orderDetails.completedAt && (
                        <div className="timeline-item">
                          <div className="timeline-marker completed">
                            <i className="fas fa-check-double"></i>
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-title">Buyurtma tugallandi</span>
                              <span className="timeline-date">{formatDate(orderDetails.completedAt)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {orderDetails.cancelledAt && (
                        <div className="timeline-item">
                          <div className="timeline-marker cancelled">
                            <i className="fas fa-times"></i>
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-title">Buyurtma bekor qilindi</span>
                              <span className="timeline-date">{formatDate(orderDetails.cancelledAt)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {orderHistory.length === 0 && !orderDetails.confirmedAt && !orderDetails.shippingAt && !orderDetails.completedAt && !orderDetails.cancelledAt && (
                        <div className="empty-history">
                          <i className="fas fa-history"></i>
                          <p>Hozircha qo'shimcha tarix ma'lumotlari yo'q</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="modal-footer">
          <div className="footer-actions">
            <button 
              onClick={() => setShowCommunication(true)}
              className="btn btn-info"
            >
              <i className="fas fa-comments"></i>
              Aloqa
            </button>
            
            <button 
              onClick={() => setShowStatusManager(true)}
              className="btn btn-primary"
              disabled={orderDetails.status === 'completed' || orderDetails.status === 'cancelled'}
            >
              <i className="fas fa-edit"></i>
              Holatni O'zgartirish
            </button>
            
            <button onClick={onClose} className="btn btn-secondary">
              <i className="fas fa-times"></i>
              Yopish
            </button>
          </div>
        </div>
      </div>

      {/* Status Manager Modal */}
      {showStatusManager && (
        <div className="nested-modal">
          <div className="nested-modal-content">
            <OrderStatusManager
              order={orderDetails}
              onStatusUpdate={handleStatusUpdate}
              onClose={() => setShowStatusManager(false)}
            />
          </div>
        </div>
      )}

      {/* Communication Modal */}
      {showCommunication && (
        <div className="nested-modal">
          <div className="nested-modal-content">
            <CustomerCommunication
              order={orderDetails}
              customer={customerInfo}
              onClose={() => setShowCommunication(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;