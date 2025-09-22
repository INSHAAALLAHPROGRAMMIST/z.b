import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import InteractiveStatsCard from './InteractiveStatsCard';
import { useNavigate } from 'react-router-dom';

const RealTimeStats = ({ dateRange, refreshInterval, userRole }) => {
  const navigate = useNavigate();
  const { analytics, loading, error } = useAnalytics({
    enableRealTime: true,
    refreshInterval,
    dateRange
  });

  // Extract stats from analytics
  const stats = {
    todayOrders: analytics.orders.todayOrdersCount || 0,
    todayRevenue: analytics.orders.totalRevenue || 0,
    activeUsers: analytics.customers.totalCustomers || 0,
    lowStockItems: analytics.inventory.lowStockCount || 0,
    pendingOrders: analytics.orders.pendingOrdersCount || 0,
    systemHealth: 'healthy' // TODO: Implement system health check
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="real-time-stats">
      <h2>Bugungi Statistika</h2>
      <div className="stats-grid">
        <InteractiveStatsCard
          title="Bugungi Buyurtmalar"
          value={stats.todayOrders}
          icon="fas fa-shopping-bag"
          color="primary"
          loading={loading}
          error={error}
          onClick={() => navigate('/admin/orders?filter=today')}
          badge={stats.pendingOrders > 0 ? {
            text: `${stats.pendingOrders} kutilmoqda`,
            type: 'warning'
          } : null}
          trend={{
            direction: 'up',
            value: '+12%',
            period: 'bu oy'
          }}
        />

        <InteractiveStatsCard
          title="Bugungi Daromad"
          value={stats.todayRevenue}
          icon="fas fa-money-bill-wave"
          color="success"
          loading={loading}
          error={error}
          onClick={() => navigate('/admin/analytics?view=revenue')}
          formatter={formatCurrency}
          trend={{
            direction: 'up',
            value: '+8%',
            period: 'bu oy'
          }}
        />

        <InteractiveStatsCard
          title="Faol Foydalanuvchilar"
          value={stats.activeUsers}
          icon="fas fa-users"
          color="purple"
          loading={loading}
          error={error}
          onClick={() => navigate('/admin/users?filter=active')}
          subtitle="So'nggi 30 kun"
          trend={{
            direction: 'up',
            value: '+15%',
            period: 'bu oy'
          }}
        />

        <InteractiveStatsCard
          title="Kam Qolgan Kitoblar"
          value={stats.lowStockItems}
          icon="fas fa-boxes"
          color={stats.lowStockItems > 0 ? 'warning' : 'info'}
          loading={loading}
          error={error}
          onClick={() => navigate('/admin/inventory?filter=low_stock')}
          badge={stats.lowStockItems > 0 ? {
            text: 'Diqqat talab!',
            type: 'warning'
          } : null}
        />
      </div>

      <div className="system-health">
        <div className={`health-indicator ${stats.systemHealth}`}>
          <i className={`fas ${stats.systemHealth === 'healthy' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
          <span>
            Tizim holati: {stats.systemHealth === 'healthy' ? 'Sog\'lom' : 'Diqqat talab'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RealTimeStats;