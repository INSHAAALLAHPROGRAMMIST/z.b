import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ userRole }) => {
  const navigate = useNavigate();

  const quickActions = [
    {
      id: 'add-book',
      title: 'Yangi Kitob Qo\'shish',
      description: 'Katalogga yangi kitob qo\'shish',
      icon: 'fas fa-plus-circle',
      color: 'primary',
      action: () => navigate('/admin/books?action=add'),
      permission: ['admin', 'superadmin']
    },
    {
      id: 'pending-orders',
      title: 'Kutilayotgan Buyurtmalar',
      description: 'Tasdiqlanmagan buyurtmalarni ko\'rish',
      icon: 'fas fa-clock',
      color: 'warning',
      action: () => navigate('/admin/orders?status=pending'),
      permission: ['admin', 'superadmin']
    },
    {
      id: 'low-stock',
      title: 'Kam Qolgan Kitoblar',
      description: 'Stock tugayotgan kitoblarni ko\'rish',
      icon: 'fas fa-exclamation-triangle',
      color: 'danger',
      action: () => navigate('/admin/inventory?filter=low_stock'),
      permission: ['admin', 'superadmin']
    },
    {
      id: 'customer-messages',
      title: 'Mijoz Xabarlari',
      description: 'Yangi mijoz xabarlarini ko\'rish',
      icon: 'fas fa-comments',
      color: 'info',
      action: () => navigate('/admin/messages'),
      permission: ['admin', 'superadmin']
    },
    {
      id: 'sales-report',
      title: 'Sotuvlar Hisoboti',
      description: 'Bugungi sotuvlar hisobotini ko\'rish',
      icon: 'fas fa-chart-line',
      color: 'success',
      action: () => navigate('/admin/analytics?view=sales'),
      permission: ['admin', 'superadmin']
    },
    {
      id: 'system-settings',
      title: 'Tizim Sozlamalari',
      description: 'Admin panel sozlamalarini boshqarish',
      icon: 'fas fa-cog',
      color: 'secondary',
      action: () => navigate('/admin/settings'),
      permission: ['superadmin']
    }
  ];

  const filteredActions = quickActions.filter(action => 
    action.permission.includes(userRole)
  );

  return (
    <div className="quick-actions">
      <h2>Tezkor Amallar</h2>
      <div className="actions-grid">
        {filteredActions.map(action => (
          <div 
            key={action.id}
            className={`action-card ${action.color}`}
            onClick={action.action}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                action.action();
              }
            }}
          >
            <div className="action-icon">
              <i className={action.icon}></i>
            </div>
            <div className="action-content">
              <h3>{action.title}</h3>
              <p>{action.description}</p>
            </div>
            <div className="action-arrow">
              <i className="fas fa-chevron-right"></i>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;