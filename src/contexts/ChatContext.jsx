import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import messagingService from '../services/MessagingService';
import authService from '../services/AuthService';

const ChatContext = createContext();

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [userStatus, setUserStatus] = useState({ isOnline: false, lastSeen: null });
  
  const listenersRef = useRef(new Map());
  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    initializeChat();
    return () => cleanup();
  }, []);

  // Set up heartbeat to maintain connection
  useEffect(() => {
    if (connectionStatus === 'connected') {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }
    
    return () => stopHeartbeat();
  }, [connectionStatus]);

  const initializeChat = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        setConnectionStatus('unauthenticated');
        return;
      }

      setConnectionStatus('connecting');
      
      // Load initial data
      await loadConversations();
      
      // Set up real-time listeners
      setupConversationListener();
      
      // Update user online status
      await updateUserOnlineStatus(true);
      
      setConnectionStatus('connected');
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing chat:', error);
      setConnectionStatus('error');
    }
  };

  const loadConversations = async () => {
    try {
      const userConversations = await messagingService.getConversations({
        limit: 20
      });
      
      setConversations(userConversations);
      calculateUnreadCount(userConversations);
      
      // Auto-select first conversation if none is active
      if (!activeConversation && userConversations.length > 0) {
        setActiveConversation(userConversations[0]);
        loadMessages(userConversations[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
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
        calculateUnreadCount(newConversations);
        setConnectionStatus('connected');
      });
      
      listenersRef.current.set('conversations', unsubscribe);
    } catch (error) {
      console.error('Error setting up conversation listener:', error);
      setConnectionStatus('error');
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      // Clean up existing message listener
      const existingListener = listenersRef.current.get('messages');
      if (existingListener) {
        existingListener();
        listenersRef.current.delete('messages');
      }
      
      // Set up new message listener
      const unsubscribe = messagingService.listenToMessages(conversationId, (newMessages, error) => {
        if (error) {
          console.error('Error listening to messages:', error);
          setConnectionStatus('error');
          return;
        }
        
        setMessages(newMessages);
        setConnectionStatus('connected');
        
        // Auto-mark messages as read if conversation is active
        if (activeConversation?.id === conversationId) {
          markMessagesAsRead(conversationId);
        }
      });
      
      listenersRef.current.set('messages', unsubscribe);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const calculateUnreadCount = (conversationList) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser.user) return;
    
    const totalUnread = conversationList.reduce((total, conv) => {
      return total + (conv.unreadCount?.[currentUser.user.uid] || 0);
    }, 0);
    
    setUnreadCount(totalUnread);
  };

  const selectConversation = async (conversation) => {
    setActiveConversation(conversation);
    await loadMessages(conversation.id);
  };

  const sendMessage = async (content, type = 'text', attachments = []) => {
    if (!activeConversation) {
      throw new Error('No active conversation');
    }
    
    try {
      const message = await messagingService.sendMessage(
        activeConversation.id,
        content,
        type,
        attachments
      );
      
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const createConversation = async (participantIds, type, metadata = {}) => {
    try {
      const conversation = await messagingService.createConversation(
        participantIds,
        type,
        metadata
      );
      
      setConversations(prev => [conversation, ...prev]);
      setActiveConversation(conversation);
      await loadMessages(conversation.id);
      
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      await messagingService.markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const updateUserOnlineStatus = async (isOnline) => {
    try {
      const status = await messagingService.updateUserStatus(isOnline);
      setUserStatus(status);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const startHeartbeat = () => {
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        await updateUserOnlineStatus(true);
      } catch (error) {
        console.error('Heartbeat failed:', error);
        setConnectionStatus('error');
      }
    }, 30000); // Every 30 seconds
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const reconnect = async () => {
    cleanup();
    await initializeChat();
  };

  const cleanup = () => {
    // Clean up all listeners
    listenersRef.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    listenersRef.current.clear();
    
    // Stop heartbeat
    stopHeartbeat();
    
    // Update user offline status
    updateUserOnlineStatus(false).catch(console.error);
    
    // Clean up messaging service
    messagingService.cleanup();
  };

  // Search functionality
  const searchMessages = async (query, conversationId = null) => {
    try {
      return await messagingService.searchMessages(query, conversationId);
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  };

  // Get conversation statistics
  const getConversationStats = async (conversationId) => {
    try {
      return await messagingService.getConversationStats(conversationId);
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return null;
    }
  };

  // Delete message
  const deleteMessage = async (messageId, hard = false) => {
    try {
      return await messagingService.deleteMessage(messageId, hard);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  // Get user status
  const getUserStatus = async (userId) => {
    try {
      return await messagingService.getUserStatus(userId);
    } catch (error) {
      console.error('Error getting user status:', error);
      return { isOnline: false, lastSeen: null };
    }
  };

  const value = {
    // State
    isInitialized,
    conversations,
    activeConversation,
    messages,
    unreadCount,
    connectionStatus,
    userStatus,
    
    // Actions
    selectConversation,
    sendMessage,
    createConversation,
    markMessagesAsRead,
    updateUserOnlineStatus,
    reconnect,
    searchMessages,
    getConversationStats,
    deleteMessage,
    getUserStatus,
    
    // Utilities
    isConnected: connectionStatus === 'connected',
    hasUnreadMessages: unreadCount > 0
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook for using chat in components
export const useChat = () => {
  const context = useChatContext();
  
  const sendTextMessage = async (text) => {
    return await context.sendMessage(text, 'text');
  };
  
  const sendImageMessage = async (imageUrl, caption = '') => {
    return await context.sendMessage(caption, 'image', [{ type: 'image', url: imageUrl }]);
  };
  
  const sendFileMessage = async (fileUrl, fileName, caption = '') => {
    return await context.sendMessage(caption, 'file', [{ type: 'file', url: fileUrl, name: fileName }]);
  };
  
  return {
    ...context,
    sendTextMessage,
    sendImageMessage,
    sendFileMessage
  };
};

export default ChatContext;