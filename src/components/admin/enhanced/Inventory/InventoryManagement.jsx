import React, { useState } from 'react';
import StockOverview from './StockOverview';
import StockAlerts from './StockAlerts';
import BulkStockUpdate from './BulkStockUpdate';
import InventoryReports from './InventoryReports';

const InventoryManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      key: 'overview',
      label: 'Stock Ko\'rinishi',
      icon: 'fas fa-chart-pie',
      component: StockOverview
    },
    {
      key: 'alerts',
      label: 'Ogohlantirishlar',
      icon: 'fas fa-bell',
      component: StockAlerts
    },
    {
      key: 'bulk',
      label: 'Bulk Yangilash',
      icon: 'fas fa-edit',
      component: BulkStockUpdate
    },
    {
      key: 'reports',
      label: 'Hisobotlar',
      icon: 'fas fa-chart-line',
      component: InventoryReports
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.key === activeTab)?.component || StockOverview;

  return (
    <div className="inventory-management">
      {/* Header */}
      <div className="inventory-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-boxes"></i>
            Inventory Boshqaruvi
          </h1>
          <p>Stock monitoring, alerts va inventory analytics</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="inventory-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={tab.icon}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="inventory-content">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default InventoryManagement;