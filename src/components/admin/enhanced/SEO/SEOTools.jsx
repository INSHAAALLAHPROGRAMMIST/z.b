import React, { useState } from 'react';
import SEOAnalyzer from './SEOAnalyzer';
import BulkContentManager from './BulkContentManager';
import SEOMonitoring from './SEOMonitoring';

const SEOTools = () => {
  const [activeTab, setActiveTab] = useState('analyzer');

  const tabs = [
    {
      key: 'analyzer',
      label: 'SEO Analyzer',
      icon: 'fas fa-search',
      component: SEOAnalyzer
    },
    {
      key: 'bulk',
      label: 'Bulk Content',
      icon: 'fas fa-edit',
      component: BulkContentManager
    },
    {
      key: 'monitoring',
      label: 'SEO Monitoring',
      icon: 'fas fa-chart-line',
      component: SEOMonitoring
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.key === activeTab)?.component || SEOAnalyzer;

  return (
    <div className="seo-tools">
      {/* Header */}
      <div className="seo-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-chart-line"></i>
            SEO va Content Management
          </h1>
          <p>SEO optimization va content management tools</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="seo-tabs">
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
      <div className="seo-content">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default SEOTools;