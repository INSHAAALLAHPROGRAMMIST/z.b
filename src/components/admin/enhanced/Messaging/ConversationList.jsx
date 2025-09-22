import React, { useState, useEffect } from 'react';
import { CONVERSATION_TYPES } from '../../../../services/MessagingService';

const ConversationList = ({ 
  conversations, 
  activeConversation, 
  onSelectConversation,
  searchQuery,
  filterType,
  loading = false 
}) => {
  const [sortBy, setSortBy] = useState('lastMessage'); // lastMessage, created, unread
  const [sortOrder, setSortOrder] = useState('desc');

  const getCustomerInfo = (conversation) => {
    return conversation.metadata?.customerInfo || {
      name: 'Unknown Customer',
      email: 'unknown@example.com'
    };
  };

  const getUnreadCount = (conversation) => {
    const currentUser = 'admin'; // This should come from auth context
    return conversation.unreadCount?.[currentUser] || 0;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = (now - time) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return time.toLocaleDateString([], { weekday: 'short' });
    } else {
      return time.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getConversationPreview = (conversation) => {
    if (conversation.lastMessage) {
      const content = conversation.lastMessage.content;
      return content.length > 60 ? content.substring(0, 60) + '...' : content;
    }
    return 'No messages yet';
  };

  const getConversationTypeIcon = (type) => {
    switch (type) {
      case CONVERSATION_TYPES.CUSTOMER_SUPPORT:
        return '🎧';
      case CONVERSATION_TYPES.ORDER_INQUIRY:
        return '📦';
      case CONVERSATION_TYPES.GENERAL:
        return '💬';
      case CONVERSATION_TYPES.SYSTEM:
        return '⚙️';
      default:
        return '💬';
    }
  };

  const getConversationTypeColor = (type) => {
    switch (type) {
      case CONVERSATION_TYPES.CUSTOMER_SUPPORT:
        return 'support';
      case CONVERSATION_TYPES.ORDER_INQUIRY:
        return 'order';
      case CONVERSATION_TYPES.GENERAL:
        return 'general';
      case CONVERSATION_TYPES.SYSTEM:
        return 'system';
      default:
        return 'general';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'lastMessage':
        aValue = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(0);
        bValue = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(0);
        break;
      case 'created':
        aValue = a.createdAt ? new Date(a.createdAt) : new Date(0);
        bValue = b.createdAt ? new Date(b.createdAt) : new Date(0);
        break;
      case 'unread':
        aValue = getUnreadCount(a);
        bValue = getUnreadCount(b);
        break;
      case 'customer':
        aValue = getCustomerInfo(a).name.toLowerCase();
        bValue = getCustomerInfo(b).name.toLowerCase();
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <div className="conversation-list-loading">
        <div className="loading-skeleton">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-conversation">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <div className="sort-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="lastMessage">Last Message</option>
            <option value="created">Created Date</option>
            <option value="unread">Unread Count</option>
            <option value="customer">Customer Name</option>
          </select>
          
          <button
            className={`sort-order ${sortOrder}`}
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
        
        <div className="conversation-count">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="conversations-container">
        {sortedConversations.map(conversation => {
          const customerInfo = getCustomerInfo(conversation);
          const unreadCount = getUnreadCount(conversation);
          const isActive = activeConversation?.id === conversation.id;
          const priority = conversation.metadata?.priority;
          
          return (
            <div
              key={conversation.id}
              className={`conversation-item ${isActive ? 'active' : ''} ${unreadCount > 0 ? 'unread' : ''}`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="conversation-avatar">
                <div className="avatar-circle">
                  {customerInfo.name.charAt(0).toUpperCase()}
                </div>
                
                {unreadCount > 0 && (
                  <div className="unread-indicator">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              
              <div className="conversation-content">
                <div className="conversation-header">
                  <div className="customer-name">
                    {customerInfo.name}
                    {priority && (
                      <span className={`priority-indicator ${getPriorityColor(priority)}`}>
                        {priority === 'high' && '🔴'}
                        {priority === 'medium' && '🟡'}
                        {priority === 'low' && '🟢'}
                      </span>
                    )}
                  </div>
                  
                  <div className="conversation-time">
                    {formatTime(conversation.lastMessageAt)}
                  </div>
                </div>
                
                <div className="conversation-preview">
                  <div className="last-message">
                    {conversation.lastMessage?.senderId !== 'admin' && (
                      <span className="message-sender">
                        {conversation.lastMessage?.senderEmail?.split('@')[0] || 'Customer'}: 
                      </span>
                    )}
                    {getConversationPreview(conversation)}
                  </div>
                </div>
                
                <div className="conversation-meta">
                  <div className="conversation-type">
                    <span className={`type-badge ${getConversationTypeColor(conversation.type)}`}>
                      {getConversationTypeIcon(conversation.type)}
                      {conversation.type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {conversation.metadata?.orderInfo && (
                    <div className="order-info">
                      <span className="order-badge">
                        Order #{conversation.metadata.orderInfo.id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="conversation-actions">
                {!conversation.isActive && (
                  <button
                    className="archive-indicator"
                    title="Archived conversation"
                  >
                    📁
                  </button>
                )}
                
                {conversation.metadata?.isUrgent && (
                  <button
                    className="urgent-indicator"
                    title="Urgent conversation"
                  >
                    ⚡
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {sortedConversations.length === 0 && (
          <div className="no-conversations">
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h4>No conversations found</h4>
              <p>
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'New conversations will appear here'
                }
              </p>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .conversation-list {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .conversation-list-header {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
        }
        
        .sort-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .sort-select {
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 12px;
          background: white;
        }
        
        .sort-order {
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 14px;
        }
        
        .sort-order:hover {
          background: #f3f4f6;
        }
        
        .conversation-count {
          font-size: 12px;
          color: #6b7280;
        }
        
        .conversations-container {
          flex: 1;
          overflow-y: auto;
        }
        
        .conversation-item {
          display: flex;
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: background-color 0.2s;
          position: relative;
        }
        
        .conversation-item:hover {
          background: #f9fafb;
        }
        
        .conversation-item.active {
          background: #eff6ff;
          border-right: 3px solid #3b82f6;
        }
        
        .conversation-item.unread {
          background: #fefce8;
        }
        
        .conversation-item.unread.active {
          background: #dbeafe;
        }
        
        .conversation-avatar {
          position: relative;
          margin-right: 12px;
        }
        
        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        }
        
        .unread-indicator {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 10px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
        }
        
        .conversation-content {
          flex: 1;
          min-width: 0;
        }
        
        .conversation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        
        .customer-name {
          font-weight: 600;
          color: #111827;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .priority-indicator {
          font-size: 12px;
        }
        
        .conversation-time {
          font-size: 11px;
          color: #6b7280;
        }
        
        .conversation-preview {
          margin-bottom: 6px;
        }
        
        .last-message {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .message-sender {
          font-weight: 500;
          color: #374151;
        }
        
        .conversation-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        
        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .type-badge.support {
          background: #dbeafe;
          color: #1d4ed8;
        }
        
        .type-badge.order {
          background: #dcfce7;
          color: #166534;
        }
        
        .type-badge.general {
          background: #f3f4f6;
          color: #374151;
        }
        
        .type-badge.system {
          background: #fef3c7;
          color: #92400e;
        }
        
        .order-badge {
          background: #f0f9ff;
          color: #0369a1;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 500;
        }
        
        .conversation-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-left: 8px;
        }
        
        .archive-indicator,
        .urgent-indicator {
          background: none;
          border: none;
          font-size: 14px;
          cursor: pointer;
          opacity: 0.6;
        }
        
        .archive-indicator:hover,
        .urgent-indicator:hover {
          opacity: 1;
        }
        
        .no-conversations {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          padding: 20px;
        }
        
        .empty-state {
          text-align: center;
        }
        
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .empty-state h4 {
          margin: 0 0 8px 0;
          color: #374151;
        }
        
        .empty-state p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }
        
        .conversation-list-loading {
          padding: 16px;
        }
        
        .skeleton-conversation {
          display: flex;
          align-items: center;
          padding: 12px 0;
          gap: 12px;
        }
        
        .skeleton-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #f3f4f6;
          animation: pulse 2s infinite;
        }
        
        .skeleton-content {
          flex: 1;
        }
        
        .skeleton-line {
          height: 12px;
          background: #f3f4f6;
          border-radius: 4px;
          margin-bottom: 8px;
          animation: pulse 2s infinite;
        }
        
        .skeleton-line.short {
          width: 60%;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @media (max-width: 768px) {
          .conversation-item {
            padding: 10px 12px;
          }
          
          .avatar-circle {
            width: 36px;
            height: 36px;
            font-size: 14px;
          }
          
          .customer-name {
            font-size: 13px;
          }
          
          .last-message {
            font-size: 12px;
          }
          
          .conversation-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default ConversationList;