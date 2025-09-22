import React, { useState } from 'react';
import NotificationCenter from './NotificationCenter';
import TelegramIntegration from './TelegramIntegration';
import MessageTemplates from './MessageTemplates';

const CommunicationCenter = () => {
  const [activeTab, setActiveTab] = useState('notifications');

  const tabs = [
    {
      key: 'notifications',
      label: 'Bildirishnomalar',
      icon: 'fas fa-bell',
      component: NotificationCenter
    },
    {
      key: 'telegram',
      label: 'Telegram Bot',
      icon: 'fab fa-telegram',
      component: TelegramIntegration
    },
    {
      key: 'templates',
      label: 'Xabar Shablonlari',
      icon: 'fas fa-comments',
      component: MessageTemplates
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.key === activeTab)?.component || NotificationCenter;

  return (
    <div className="communication-center">
      {/* Header */}
      <div className="communication-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-comments"></i>
            Aloqa va Bildirishnomalar Markazi
          </h1>
          <p>Barcha aloqa kanallari va bildirishnomalar boshqaruvi</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="communication-tabs">
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
      <div className="communication-content">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default CommunicationCenter;