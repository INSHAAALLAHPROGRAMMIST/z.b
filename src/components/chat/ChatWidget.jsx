import React, { useState, useEffect, useRef } from 'react';
import messagingService, { MESSAGE_TYPES, CONVERSATION_TYPES } from '../../services/MessagingService';
import authService from '../../services/AuthService';

const ChatWidget = ({ 
  isOpen = false, 
  onToggle, 
  customerInfo = null,
  orderInfo = null,
  position = 'bottom-right' 
}) => {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initialize chat
  useEffect(() => {
    initializeChat();
    return () => cleanup();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const initializeChat = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Load existing conversations
      await loadConversations();
      
      // Set up real-time listeners
      setupConversationListener();
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error initializing chat:', error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  };

  const loadConversations = async () => {
    try {
      const userConversations = await messagingService.getConversations({
        limit: 10
      });
      
      setConversations(userConversations);
      
      // Auto-select first conversation or create new one
      if (userConversations.length > 0) {
        setActiveConversation(userConversations[0]);
        loadMessages(userConversations[0].id);
      } else {
        await createNewConversation();
      }
      
      // Calculate total unread count
      const totalUnread = userConversations.reduce((total, conv) => {
        const currentUser = authService.getCurrentUser();
        return total + (conv.unreadCount?.[currentUser.user?.uid] || 0);
      }, 0);
      
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      // Create conversation with support team
      const supportTeamId = 'support-team'; // This should be configurable
      const conversation = await messagingService.createConversation(
        [currentUser.user.uid, supportTeamId],
        CONVERSATION_TYPES.CUSTOMER_SUPPORT,
        {
          customerInfo,
          orderInfo,
          priority: orderInfo ? 'high' : 'normal'
        }
      );

      setActiveConversation(conversation);
      setConversations(prev => [conversation, ...prev]);
      
      // Send welcome message
      await sendWelcomeMessage(conversation.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const sendWelcomeMessage = async (conversationId) => {
    const welcomeText = customerInfo 
      ? `Hello ${customerInfo.name}! How can we help you today?`
      : 'Hello! How can we help you today?';
      
    try {
      await messagingService.sendMessage(
        conversationId,
        welcomeText,
        MESSAGE_TYPES.SYSTEM
      );
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setIsLoading(true);
      
      // Set up real-time listener for messages
      messagingService.listenToMessages(conversationId, (newMessages, error) => {
        if (error) {
          console.error('Error listening to messages:', error);
          setConnectionStatus('error');
          return;
        }
        
        setMessages(newMessages);
        setConnectionStatus('connected');
        
        // Mark messages as read
        markMessagesAsRead(conversationId);
      });
      
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupConversationListener = () => {
    messagingService.listenToConversations((newConversations, error) => {
      if (error) {
        console.error('Error listening to conversations:', error);
        setConnectionStatus('error');
        scheduleReconnect();
        return;
      }
      
      setConversations(newConversations);
      
      // Update unread count
      const currentUser = authService.getCurrentUser();
      const totalUnread = newConversations.reduce((total, conv) => {
        return total + (conv.unreadCount?.[currentUser.user?.uid] || 0);
      }, 0);
      
      setUnreadCount(totalUnread);
      setConnectionStatus('connected');
    });
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      await messagingService.markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    try {
      await messagingService.sendMessage(
        activeConversation.id,
        messageText,
        MESSAGE_TYPES.TEXT
      );
      
      // Clear typing indicator
      clearTypingIndicator();
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message text on error
      setNewMessage(messageText);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTyping();
    }
  };

  const handleTyping = () => {
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const clearTypingIndicator = () => {
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      initializeChat();
    }, 5000); // Retry after 5 seconds
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cleanup = () => {
    messagingService.cleanup();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  const getMessageSenderName = (message) => {
    const currentUser = authService.getCurrentUser();
    if (message.senderId === currentUser.user?.uid) {
      return 'You';
    }
    return message.senderEmail?.split('@')[0] || 'Support';
  };

  const isOwnMessage = (message) => {
    const currentUser = authService.getCurrentUser();
    return message.senderId === currentUser.user?.uid;
  };

  if (!isOpen) {
    return (
      <div className={`chat-widget-toggle ${position}`} onClick={onToggle}>
        <div className="chat-toggle-button">
          <span className="chat-icon">💬</span>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-widget ${position}`}>
      <div className="chat-header">
        <div className="chat-title">
          <h4>Customer Support</h4>
          <div className={`connection-status ${connectionStatus}`}>
            {connectionStatus === 'connected' && <span className="status-dot online"></span>}
            {connectionStatus === 'connecting' && <span className="status-dot connecting"></span>}
            {connectionStatus === 'error' && <span className="status-dot offline"></span>}
            <span className="status-text">
              {connectionStatus === 'connected' && 'Online'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'error' && 'Offline'}
            </span>
          </div>
        </div>
        <button className="chat-close" onClick={onToggle}>
          ×
        </button>
      </div>

      <div className="chat-messages">
        {isLoading ? (
          <div className="chat-loading">
            <div className="loading-spinner"></div>
            <p>Loading messages...</p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`message ${isOwnMessage(message) ? 'own' : 'other'} ${message.type}`}
              >
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-meta">
                    <span className="message-sender">
                      {getMessageSenderName(message)}
                    </span>
                    <span className="message-time">
                      {formatMessageTime(message.createdAt)}
                    </span>
                    {isOwnMessage(message) && (
                      <span className={`message-status ${message.status}`}>
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && '✓✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">Support is typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="chat-input">
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            disabled={connectionStatus !== 'connected'}
          />
          <button 
            className="send-button"
            onClick={sendMessage}
            disabled={!newMessage.trim() || connectionStatus !== 'connected'}
          >
            <span className="send-icon">➤</span>
          </button>
        </div>
        
        {connectionStatus === 'error' && (
          <div className="connection-error">
            <span>Connection lost. Trying to reconnect...</span>
            <button onClick={initializeChat} className="retry-button">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;