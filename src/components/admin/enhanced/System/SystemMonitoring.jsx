import React, { useState } from 'react';
import SystemHealth from './SystemHealth';
import ErrorLogs from './ErrorLogs';
import PerformanceMonitor from './PerformanceMonitor';

const SystemMonitoring = () => {
  const [activeTab, setActiveTab] = useState('health');

  const tabs = [
    {
      key: 'health',
      label: 'Tizim Sog\'ligi',
      icon: 'fas fa-heartbeat',
      component: SystemHealth
    },
    {
      key: 'errors',
      label: 'Error Logs',
      icon: 'fas fa-bug',
      component: ErrorLogs
    },
    {
      key: 'performance',
      label: 'Performance',
      icon: 'fas fa-tachometer-alt',
      component: PerformanceMonitor
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.key === activeTab)?.component || SystemHealth;

  return (
    <div className="system-monitoring">
      {/* Header */}
      <div className="monitoring-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-desktop"></i>
            Tizim Monitoring
          </h1>
          <p>System health, performance va error monitoring</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="monitoring-tabs">
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
      <div className="monitoring-content">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default SystemMonitoring;