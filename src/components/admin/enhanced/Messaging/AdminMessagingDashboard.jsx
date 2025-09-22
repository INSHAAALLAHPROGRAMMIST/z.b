import React, { useState, useEffect, useRef } from 'react';
import messagingService, { MESSAGE_TYPES, CONVERSATION_TYPES } from '../../../../services/MessagingService';
import { PERMISSIONS } from '../../../../services/AuthService';
import ProtectedRoute from '../Security/ProtectedRoute';

const AdminMessagingDashboard = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [conversationStats, setConversationStats] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    initializeDashboard();
    return () => cleanup();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeConversation) {
      loadConversationStats();
    }
  }, [activeConversation]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');
      
      await loadConversations();
      await loadMessageTemplates();
      
      setupConversationListener();
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error initializing messaging dashboard:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const allConversations = await messagingService.getConversations({
        limit: 50
      });
      
      setConversations(allConversations);
      
      // Auto-select first conversation
      if (allConversations.length > 0 && !activeConversation) {
        selectConversation(allConversations[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessageTemplates = async () => {
    // Mock templates - in real app, load from database
    const mockTemplates = [
      {
        id: '1',
        name: 'Welcome Message',
        content: 'Hello! Thank you for contacting us. How can we help you today?',
        category: 'greeting'
      },
      {
        id: '2',
        name: 'Order Status',
        content: 'Thank you for your inquiry about your order. Let me check the status for you.',
        category: 'order'
      },
      {
        id: '3',
        name: 'Technical Support',
        content: 'I understand you\'re experiencing technical difficulties. Let me help you resolve this issue.',
        category: 'support'
      },
      {
        id: '4',
        name: 'Closing Message',
        content: 'Thank you for contacting us. Is there anything else I can help you with today?',
        category: 'closing'
      }
    ];
    
    setTemplates(mockTemplates);
  };

  const setupConversationListener = () => {
    try {
      const unsubscribe = messagingService.listenToConversations((newConversations, error) => {
        if (error) {
          console.error('Error listening to conversations:', error);
          setConnectionStatus('error');
          return;
        }
        
        setConversations(newConversations);
        setConnectionStatus('connected');
      });
      
      listenersRef.current.set('conversations', unsubscribe);
    } catch (error) {
      console.error('Error setting up conversation listener:', error);
    }
  };

  const selectConversation = async (conversation) => {
    try {
      setActiveConversation(conversation);
      setMessages([]);
      setSelectedMessages(new Set());
      
      // Clean up existing message listener
      const existingListener = listenersRef.current.get('messages');
      if (existingListener) {
        existingListener();
      }
      
      // Set up new message listener
      const unsubscribe = messagingService.listenToMessages(conversation.id, (newMessages, error) => {
        if (error) {
          console.error('Error listening to messages:', error);
          return;
        }
        
        setMessages(newMessages);
        
        // Mark messages as read
        markMessagesAsRead(conversation.id);
      });
      
      listenersRef.current.set('messages', unsubscribe);
    } catch (error) {
      console.error('Error selecting conversation:', error);
    }
  };

  const loadConversationStats = async () => {
    if (!activeConversation) return;
    
    try {
      const stats = await messagingService.getConversationStats(activeConversation.id);
      setConversationStats(stats);
    } catch (error) {
      console.error('Error loading conversation stats:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    try {
      await messagingService.sendMessage(
        activeConversation.id,
        messageText,
        MESSAGE_TYPES.TEXT
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const sendTemplate = async (template) => {
    if (!activeConversation || sending) return;
    
    setSending(true);
    setShowTemplates(false);
    
    try {
      await messagingService.sendMessage(
        activeConversation.id,
        template.content,
        MESSAGE_TYPES.TEXT
      );
    } catch (error) {
      console.error('Error sending template message:', error);
    } finally {
      setSending(false);
    }
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      await messagingService.markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cleanup = () => {
    listenersRef.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    listenersRef.current.clear();
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.metadata?.customerInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.metadata?.customerInfo?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || conv.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  const getConversationPreview = (conversation) => {
    if (conversation.lastMessage) {
      return conversation.lastMessage.content.substring(0, 50) + 
        (conversation.lastMessage.content.length > 50 ? '...' : '');
    }
    return 'No messages yet';
  };

  const getUnreadCount = (conversation) => {
    // This would come from the conversation data
    return conversation.unreadCount?.admin || 0;
  };

  const getCustomerInfo = (conversation) => {
    return conversation.metadata?.customerInfo || {
      name: 'Unknown Customer',
      email: 'unknown@example.com'
    };
  };

  if (loading) {
    return (
      <div className="messaging-loading">
        <div className="loading-spinner"></div>
        <p>Loading messaging dashboard...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.SEND_MESSAGES}>
      <div className="admin-messaging-dashboard">
        <div className="messaging-header">
          <h2>Customer Messages</h2>
          <div className={`connection-status ${connectionStatus}`}>
            <span className={`status-dot ${connectionStatus}`}></span>
            <span className="status-text">
              {connectionStatus === 'connected' && 'Connected'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'error' && 'Connection Error'}
            </span>
          </div>
        </div>

        <div className="messaging-content">
          {/* Conversations Sidebar */}
          <div className="conversations-sidebar">
            <div className="sidebar-header">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="filter-controls">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Conversations</option>
                  <option value={CONVERSATION_TYPES.CUSTOMER_SUPPORT}>Support</option>
                  <option value={CONVERSATION_TYPES.ORDER_INQUIRY}>Orders</option>
                  <option value={CONVERSATION_TYPES.GENERAL}>General</option>
                </select>
              </div>
            </div>

            <div className="conversations-list">
              {filteredConversations.map(conversation => {
                const customerInfo = getCustomerInfo(conversation);
                const unreadCount = getUnreadCount(conversation);
                
                return (
                  <div
                    key={conversation.id}
                    className={`conversation-item ${activeConversation?.id === conversation.id ? 'active' : ''}`}
                    onClick={() => selectConversation(conversation)}
                  >
                    <div className="conversation-avatar">
                      {customerInfo.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="conversation-content">
                      <div className="conversation-header">
                        <h4 className="customer-name">{customerInfo.name}</h4>
                        <span className="conversation-time">
                          {formatMessageTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      
                      <div className="conversation-preview">
                        <p className="last-message">
                          {getConversationPreview(conversation)}
                        </p>
                        
                        {unreadCount > 0 && (
                          <span className="unread-badge">{unreadCount}</span>
                        )}
                      </div>
                      
                      <div className="conversation-meta">
                        <span className={`conversation-type ${conversation.type}`}>
                          {conversation.type.replace('_', ' ')}
                        </span>
                        
                        {conversation.metadata?.priority === 'high' && (
                          <span className="priority-badge high">High Priority</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredConversations.length === 0 && (
                <div className="no-conversations">
                  <p>No conversations found</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="chat-area">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="customer-info">
                    <div className="customer-avatar">
                      {getCustomerInfo(activeConversation).name.charAt(0).toUpperCase()}
                    </div>
                    <div className="customer-details">
                      <h3>{getCustomerInfo(activeConversation).name}</h3>
                      <p>{getCustomerInfo(activeConversation).email}</p>
                      {activeConversation.metadata?.orderInfo && (
                        <span className="order-info">
                          Order #{activeConversation.metadata.orderInfo.id}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="chat-actions">
                    <button
                      className="template-button"
                      onClick={() => setShowTemplates(!showTemplates)}
                    >
                      Templates
                    </button>
                    
                    {conversationStats && (
                      <div className="conversation-stats">
                        <span>Messages: {conversationStats.totalMessages}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="messages-container">
                  {messages.map(message => {
                    const isOwnMessage = message.senderRole === 'admin' || message.senderRole === 'super_admin';
                    
                    return (
                      <div
                        key={message.id}
                        className={`message ${isOwnMessage ? 'own' : 'other'} ${message.type}`}
                      >
                        <div className="message-content">
                          <div className="message-text">{message.content}</div>
                          <div className="message-meta">
                            <span className="message-sender">
                              {isOwnMessage ? 'You' : getCustomerInfo(activeConversation).name}
                            </span>
                            <span className="message-time">
                              {formatMessageTime(message.createdAt)}
                            </span>
                            {isOwnMessage && (
                              <span className={`message-status ${message.status}`}>
                                {message.status === 'sent' && '✓'}
                                {message.status === 'delivered' && '✓✓'}
                                {message.status === 'read' && '✓✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="message-input-container">
                  {showTemplates && (
                    <div className="templates-dropdown">
                      <h4>Quick Templates</h4>
                      {templates.map(template => (
                        <div
                          key={template.id}
                          className="template-item"
                          onClick={() => sendTemplate(template)}
                        >
                          <div className="template-name">{template.name}</div>
                          <div className="template-preview">{template.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="input-area">
                    <textarea
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      rows={3}
                      disabled={sending || connectionStatus !== 'connected'}
                    />
                    
                    <div className="input-actions">
                      <button
                        className="send-button"
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending || connectionStatus !== 'connected'}
                      >
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-conversation-selected">
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <h3>Select a conversation</h3>
                  <p>Choose a conversation from the sidebar to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminMessagingDashboard;