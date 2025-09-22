import React, { useState } from 'react';
import OrdersTable from './OrdersTable';
import OrderDetails from './OrderDetails';
import CustomerCommunication from './CustomerCommunication';

const OrderManagement = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: '',
    paymentStatus: 'all'
  });

  const handleOrderSelect = (order, action = 'view') => {
    setSelectedOrder(order);
    
    if (action === 'view') {
      setShowOrderDetails(true);
    } else if (action === 'edit') {
      setShowOrderDetails(true);
    } else if (action === 'communicate') {
      setShowCommunication(true);
    }
  };

  const handleStatusUpdate = (orderId, newStatus, notes) => {
    console.log('Status updated:', { orderId, newStatus, notes });
    // The OrdersTable will automatically update via real-time listeners
    
    // Show success toast
    const event = new CustomEvent('showToast', {
      detail: { 
        message: `Buyurtma holati "${getStatusLabel(newStatus)}" ga o'zgartirildi`, 
        type: 'success' 
      }
    });
    window.dispatchEvent(event);
  };

  const handleBulkAction = (action, orderIds) => {
    console.log('Bulk action:', { action, orderIds });
    
    // TODO: Implement bulk actions
    switch (action) {
      case 'confirm':
        // Bulk confirm orders
        break;
      case 'ship':
        // Bulk ship orders
        break;
      case 'cancel':
        // Bulk cancel orders
        break;
      default:
        break;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Kutilmoqda',
      confirmed: 'Tasdiqlangan',
      shipping: 'Yetkazilmoqda',
      completed: 'Tugallangan',
      cancelled: 'Bekor qilingan'
    };
    return labels[status] || status;
  };

  const closeModals = () => {
    setShowOrderDetails(false);
    setShowCommunication(false);
    setSelectedOrder(null);
  };

  return (
    <div className="order-management">
      <div className="order-management-header">
        <div className="header-content">
          <h1>Buyurtmalar Boshqaruvi</h1>
          <p>Barcha buyurtmalarni boshqaring va mijozlar bilan aloqa qiling</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="action-btn secondary"
            onClick={() => window.location.reload()}
          >
            <i className="fas fa-sync-alt"></i>
            Yangilash
          </button>
          
          <button 
            className="action-btn primary"
            onClick={() => {
              // TODO: Export orders functionality
              console.log('Export orders');
            }}
          >
            <i className="fas fa-download"></i>
            Export
          </button>
        </div>
      </div>

      <div className="order-management-content">
        <OrdersTable
          filters={filters}
          onOrderSelect={handleOrderSelect}
          onBulkAction={handleBulkAction}
          sortBy={{ field: 'createdAt', direction: 'desc' }}
          pageSize={20}
        />
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={closeModals}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Customer Communication Modal */}
      {showCommunication && selectedOrder && (
        <div className="communication-overlay">
          <CustomerCommunication
            order={selectedOrder}
            onClose={closeModals}
          />
        </div>
      )}
    </div>
  );
};

export default OrderManagement;