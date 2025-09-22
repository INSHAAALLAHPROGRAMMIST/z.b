import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';
import notificationService from '../../../../services/NotificationService';

const OrderStatusManager = ({ 
  order, 
  onStatusUpdate = null, 
  onClose = null,
  showNotifications = true 
}) => {
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(order?.status || 'pending');
  const [notes, setNotes] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  const statusWorkflow = [
    {
      value: 'pending',
      label: 'Kutilmoqda',
      color: 'warning',
      icon: 'fas fa-clock',
      description: 'Yangi buyurtma, tasdiqlanishi kutilmoqda',
      nextStates: ['confirmed', 'cancelled']
    },
    {
      value: 'confirmed',
      label: 'Tasdiqlangan',
      color: 'info',
      icon: 'fas fa-check-circle',
      description: 'Buyurtma tasdiqlangan, tayyorlanmoqda',
      nextStates: ['shipping', 'cancelled']
    },
    {
      value: 'shipping',
      label: 'Yetkazilmoqda',
      color: 'primary',
      icon: 'fas fa-shipping-fast',
      description: 'Buyurtma yetkazib berish jarayonida',
      nextStates: ['completed', 'cancelled']
    },
    {
      value: 'completed',
      label: 'Tugallangan',
      color: 'success',
      icon: 'fas fa-check-double',
      description: 'Buyurtma muvaffaqiyatli tugallangan',
      nextStates: []
    },
    {
      value: 'cancelled',
      label: 'Bekor qilingan',
      color: 'danger',
      icon: 'fas fa-times-circle',
      description: 'Buyurtma bekor qilingan',
      nextStates: []
    }
  ];

  const getCurrentStatus = () => {
    return statusWorkflow.find(status => status.value === order?.status) || statusWorkflow[0];
  };

  const getStatusConfig = (statusValue) => {
    return statusWorkflow.find(status => status.value === statusValue) || statusWorkflow[0];
  };

  const getAvailableNextStates = () => {
    const currentStatus = getCurrentStatus();
    return statusWorkflow.filter(status => 
      currentStatus.nextStates.includes(status.value)
    );
  };

  const handleStatusUpdate = async () => {
    if (!order || selectedStatus === order.status) return;

    setUpdating(true);
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, order.id);
      
      const updateData = {
        status: selectedStatus,
        updatedAt: serverTimestamp(),
        [`${selectedStatus}At`]: serverTimestamp() // e.g., confirmedAt, shippedAt
      };

      // Add notes if provided
      if (notes.trim()) {
        updateData.statusNotes = notes.trim();
      }

      await updateDoc(orderRef, updateData);

      // Send notification if enabled
      if (notifyCustomer && showNotifications) {
        await sendCustomerNotification(order, selectedStatus, notes);
      }

      // Call callback
      onStatusUpdate && onStatusUpdate(order.id, selectedStatus, notes);

      // Show success message
      showToast('Buyurtma holati muvaffaqiyatli yangilandi', 'success');

      // Close modal
      onClose && onClose();

    } catch (error) {
      console.error('Status update error:', error);
      showToast('Holatni yangilashda xato yuz berdi', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const sendCustomerNotification = async (order, newStatus, notes) => {
    try {
      const result = await notificationService.sendOrderStatusNotification(
        order, 
        newStatus, 
        notes
      );

      if (result.success) {
        console.log('Notification sent successfully');
        showToast('Mijozga xabar yuborildi', 'success');
      } else {
        console.warn('Notification failed:', result.error);
        showToast('Xabar yuborishda muammo yuz berdi', 'warning');
      }
      
    } catch (error) {
      console.error('Notification sending error:', error);
      showToast('Xabar yuborishda xato yuz berdi', 'error');
    }
  };

  const showToast = (message, type) => {
    // Simple toast implementation
    const event = new CustomEvent('showToast', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  };

  const getStatusTimeline = () => {
    const timeline = [];
    const currentStatus = order?.status;
    
    statusWorkflow.forEach(status => {
      const isCompleted = getStatusOrder(status.value) <= getStatusOrder(currentStatus);
      const isCurrent = status.value === currentStatus;
      
      timeline.push({
        ...status,
        isCompleted,
        isCurrent,
        timestamp: order?.[`${status.value}At`]
      });
    });

    return timeline;
  };

  const getStatusOrder = (status) => {
    const order = {
      'pending': 1,
      'confirmed': 2,
      'shipping': 3,
      'completed': 4,
      'cancelled': 0 // Special case
    };
    return order[status] || 0;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!order) {
    return (
      <div className="order-status-manager error">
        <p>Buyurtma ma'lumotlari topilmadi</p>
      </div>
    );
  }

  const currentStatus = getCurrentStatus();
  const availableStates = getAvailableNextStates();

  return (
    <div className="order-status-manager">
      <div className="status-manager-header">
        <h3>Buyurtma Holatini Boshqarish</h3>
        <div className="order-info">
          <span className="order-id">#{order.id.substring(0, 8)}</span>
          <span className="customer-name">{order.customerName}</span>
        </div>
      </div>

      {/* Current Status */}
      <div className="current-status-section">
        <h4>Hozirgi Holat</h4>
        <div className={`current-status-card ${currentStatus.color}`}>
          <div className="status-icon">
            <i className={currentStatus.icon}></i>
          </div>
          <div className="status-info">
            <div className="status-label">{currentStatus.label}</div>
            <div className="status-description">{currentStatus.description}</div>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="status-timeline-section">
        <h4>Buyurtma Tarixi</h4>
        <div className="status-timeline">
          {getStatusTimeline().map((status, index) => (
            <div 
              key={status.value}
              className={`timeline-item ${status.isCompleted ? 'completed' : ''} ${status.isCurrent ? 'current' : ''}`}
            >
              <div className={`timeline-icon ${status.color}`}>
                <i className={status.icon}></i>
              </div>
              <div className="timeline-content">
                <div className="timeline-label">{status.label}</div>
                {status.timestamp && (
                  <div className="timeline-timestamp">
                    {formatTimestamp(status.timestamp)}
                  </div>
                )}
              </div>
              {index < getStatusTimeline().length - 1 && (
                <div className={`timeline-connector ${status.isCompleted ? 'completed' : ''}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Update Form */}
      {availableStates.length > 0 && (
        <div className="status-update-section">
          <h4>Holatni Yangilash</h4>
          
          <div className="status-options">
            {availableStates.map(status => (
              <label 
                key={status.value}
                className={`status-option ${selectedStatus === status.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="status"
                  value={status.value}
                  checked={selectedStatus === status.value}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                />
                <div className={`option-card ${status.color}`}>
                  <div className="option-icon">
                    <i className={status.icon}></i>
                  </div>
                  <div className="option-info">
                    <div className="option-label">{status.label}</div>
                    <div className="option-description">{status.description}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="notes-section">
            <label htmlFor="status-notes">Izoh (ixtiyoriy):</label>
            <textarea
              id="status-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Holat o'zgarishi haqida qo'shimcha ma'lumot..."
              rows={3}
              className="notes-textarea"
            />
          </div>

          {showNotifications && (
            <div className="notification-section">
              <label className="notification-checkbox">
                <input
                  type="checkbox"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                />
                <span>Mijozga xabar yuborish</span>
              </label>
            </div>
          )}

          <div className="action-buttons">
            <button
              onClick={onClose}
              className="cancel-btn"
              disabled={updating}
            >
              Bekor qilish
            </button>
            <button
              onClick={handleStatusUpdate}
              className="update-btn"
              disabled={updating || selectedStatus === order.status}
            >
              {updating ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Yangilanmoqda...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Holatni Yangilash
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {availableStates.length === 0 && (
        <div className="no-actions-section">
          <div className="no-actions-message">
            <i className="fas fa-info-circle"></i>
            <p>Bu buyurtma uchun boshqa holatlar mavjud emas</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatusManager;