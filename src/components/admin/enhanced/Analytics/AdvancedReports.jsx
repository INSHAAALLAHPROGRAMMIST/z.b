import React, { useState } from 'react';
import RevenueMetrics from './RevenueMetrics';
import SalesAnalytics from './SalesAnalytics';

const AdvancedReports = () => {
  const [activeTab, setActiveTab] = useState('revenue');

  const tabs = [
    {
      key: 'revenue',
      label: 'Revenue Metrics',
      icon: 'fas fa-dollar-sign',
      component: RevenueMetrics
    },
    {
      key: 'sales',
      label: 'Sales Analytics',
      icon: 'fas fa-chart-bar',
      component: SalesAnalytics
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.key === activeTab)?.component || RevenueMetrics;

  return (
    <div className="advanced-reports">
      {/* Header */}
      <div className="reports-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-chart-line"></i>
            Advanced Analytics
          </h1>
          <p>Batafsil sales analytics va revenue metrics</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="reports-tabs">
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
      <div className="reports-content">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default AdvancedReports;