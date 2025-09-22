import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import authService from './AuthService';
import auditService from './AuditService';

// Message status constants
export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
  ORDER_UPDATE: 'order_update',
  STOCK_ALERT: 'stock_alert'
};

// Conversation types
export const CONVERSATION_TYPES = {
  CUSTOMER_SUPPORT: 'customer_support',
  ORDER_INQUIRY: 'order_inquiry',
  GENERAL: 'general',
  SYSTEM: 'system'
};

class MessagingService {
  constructor() {
    this.conversationsCollection = 'conversations';
    this.messagesCollection = 'messages';
    this.userStatusCollection = 'userStatus';
    this.listeners = new Map();
  }

  // Create a new conversation
  async createConversation(participantIds, type = CONVERSATION_TYPES.GENERAL, metadata = {}) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      const conversationData = {
        participants: participantIds,
        type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.user.uid,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: participantIds.reduce((acc, id) => {
          acc[id] = 0;
          return acc;
        }, {}),
        isActive: true,
        metadata: {
          ...metadata,
          customerInfo: metadata.customerInfo || null,
          orderInfo: metadata.orderInfo || null,
          priority: metadata.priority || 'normal'
        }
      };

      const conversationRef = await addDoc(collection(db, this.conversationsCollection), conversationData);
      
      // Log conversation creation
      await auditService.logEvent('CONVERSATION_CREATED', {
        conversationId: conversationRef.id,
        participants: participantIds,
        type
      });

      return {
        id: conversationRef.id,
        ...conversationData
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(conversationId, content, type = MESSAGE_TYPES.TEXT, attachments = []) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      // Get conversation to validate participation
      const conversationDoc = await getDoc(doc(db, this.conversationsCollection, conversationId));
      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      const conversation = conversationDoc.data();
      if (!conversation.participants.includes(currentUser.user.uid)) {
        throw new Error('User not authorized to send messages in this conversation');
      }

      const messageData = {
        conversationId,
        senderId: currentUser.user.uid,
        senderEmail: currentUser.user.email,
        senderRole: currentUser.role,
        content,
        type,
        attachments,
        status: MESSAGE_STATUS.SENT,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        readBy: {
          [currentUser.user.uid]: serverTimestamp()
        },
        editedAt: null,
        isDeleted: false,
        reactions: {},
        metadata: {
          userAgent: navigator.userAgent,
          ipAddress: await this.getClientIP()
        }
      };

      // Add message to messages collection
      const messageRef = await addDoc(collection(db, this.messagesCollection), messageData);

      // Update conversation with last message info
      await updateDoc(doc(db, this.conversationsCollection, conversationId), {
        lastMessage: {
          id: messageRef.id,
          content: content.substring(0, 100), // Preview
          senderId: currentUser.user.uid,
          senderEmail: currentUser.user.email,
          type,
          createdAt: serverTimestamp()
        },
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Increment unread count for other participants
        ...conversation.participants.reduce((acc, participantId) => {
          if (participantId !== currentUser.user.uid) {
            acc[`unreadCount.${participantId}`] = increment(1);
          }
          return acc;
        }, {})
      });

      // Log message sending
      await auditService.logEvent('MESSAGE_SENT', {
        conversationId,
        messageId: messageRef.id,
        messageType: type,
        recipientCount: conversation.participants.length - 1
      });

      return {
        id: messageRef.id,
        ...messageData
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get conversations for current user
  async getConversations(filters = {}) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      let conversationsQuery = query(
        collection(db, this.conversationsCollection),
        where('participants', 'array-contains', currentUser.user.uid),
        orderBy('updatedAt', 'desc')
      );

      // Apply filters
      if (filters.type) {
        conversationsQuery = query(conversationsQuery, where('type', '==', filters.type));
      }

      if (filters.isActive !== undefined) {
        conversationsQuery = query(conversationsQuery, where('isActive', '==', filters.isActive));
      }

      if (filters.limit) {
        conversationsQuery = query(conversationsQuery, limit(filters.limit));
      }

      const snapshot = await getDocs(conversationsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastMessageAt: doc.data().lastMessageAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  // Get messages for a conversation
  async getMessages(conversationId, options = {}) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      // Verify user has access to conversation
      const conversationDoc = await getDoc(doc(db, this.conversationsCollection, conversationId));
      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      const conversation = conversationDoc.data();
      if (!conversation.participants.includes(currentUser.user.uid)) {
        throw new Error('User not authorized to view messages in this conversation');
      }

      let messagesQuery = query(
        collection(db, this.messagesCollection),
        where('conversationId', '==', conversationId),
        where('isDeleted', '==', false),
        orderBy('createdAt', options.ascending ? 'asc' : 'desc')
      );

      if (options.limit) {
        messagesQuery = query(messagesQuery, limit(options.limit));
      }

      const snapshot = await getDocs(messagesQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        editedAt: doc.data().editedAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId, messageIds = []) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      const batch = [];
      const timestamp = serverTimestamp();

      // If no specific message IDs provided, mark all unread messages as read
      if (messageIds.length === 0) {
        const unreadMessages = await getDocs(query(
          collection(db, this.messagesCollection),
          where('conversationId', '==', conversationId),
          where(`readBy.${currentUser.user.uid}`, '==', null)
        ));

        messageIds = unreadMessages.docs.map(doc => doc.id);
      }

      // Update read status for each message
      for (const messageId of messageIds) {
        const messageRef = doc(db, this.messagesCollection, messageId);
        batch.push(updateDoc(messageRef, {
          [`readBy.${currentUser.user.uid}`]: timestamp,
          status: MESSAGE_STATUS.READ
        }));
      }

      // Reset unread count for current user in conversation
      const conversationRef = doc(db, this.conversationsCollection, conversationId);
      batch.push(updateDoc(conversationRef, {
        [`unreadCount.${currentUser.user.uid}`]: 0
      }));

      await Promise.all(batch);

      return { success: true, markedCount: messageIds.length };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Set up real-time listener for conversations
  listenToConversations(callback, filters = {}) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      let conversationsQuery = query(
        collection(db, this.conversationsCollection),
        where('participants', 'array-contains', currentUser.user.uid),
        orderBy('updatedAt', 'desc')
      );

      if (filters.limit) {
        conversationsQuery = query(conversationsQuery, limit(filters.limit));
      }

      const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
        const conversations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          lastMessageAt: doc.data().lastMessageAt?.toDate()
        }));

        callback(conversations);
      }, (error) => {
        console.error('Error listening to conversations:', error);
        callback([], error);
      });

      this.listeners.set('conversations', unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up conversations listener:', error);
      throw error;
    }
  }

  // Set up real-time listener for messages in a conversation
  listenToMessages(conversationId, callback, options = {}) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      let messagesQuery = query(
        collection(db, this.messagesCollection),
        where('conversationId', '==', conversationId),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'asc')
      );

      if (options.limit) {
        messagesQuery = query(messagesQuery, limit(options.limit));
      }

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          editedAt: doc.data().editedAt?.toDate()
        }));

        callback(messages);
      }, (error) => {
        console.error('Error listening to messages:', error);
        callback([], error);
      });

      this.listeners.set(`messages-${conversationId}`, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      throw error;
    }
  }

  // Update user online status
  async updateUserStatus(isOnline = true, lastSeen = null) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      const statusData = {
        userId: currentUser.user.uid,
        userEmail: currentUser.user.email,
        isOnline,
        lastSeen: lastSeen || serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, this.userStatusCollection, currentUser.user.uid), statusData);
      
      return statusData;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  // Get user online status
  async getUserStatus(userId) {
    try {
      const statusDoc = await getDoc(doc(db, this.userStatusCollection, userId));
      
      if (!statusDoc.exists()) {
        return {
          userId,
          isOnline: false,
          lastSeen: null
        };
      }

      const data = statusDoc.data();
      return {
        ...data,
        lastSeen: data.lastSeen?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error getting user status:', error);
      return {
        userId,
        isOnline: false,
        lastSeen: null
      };
    }
  }

  // Search messages
  async searchMessages(query, conversationId = null) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      // Note: Firestore doesn't support full-text search natively
      // This is a simplified implementation
      let messagesQuery = collection(db, this.messagesCollection);
      
      if (conversationId) {
        messagesQuery = query(messagesQuery, where('conversationId', '==', conversationId));
      }

      messagesQuery = query(
        messagesQuery,
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(messagesQuery);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Client-side filtering (in production, use a search service like Algolia)
      const filteredMessages = messages.filter(message => 
        message.content.toLowerCase().includes(query.toLowerCase())
      );

      return filteredMessages;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  // Delete a message
  async deleteMessage(messageId, hard = false) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      const messageRef = doc(db, this.messagesCollection, messageId);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const message = messageDoc.data();
      
      // Only sender or admin can delete messages
      if (message.senderId !== currentUser.user.uid && !authService.hasRoleLevel('admin')) {
        throw new Error('Not authorized to delete this message');
      }

      if (hard) {
        await deleteDoc(messageRef);
      } else {
        await updateDoc(messageRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          deletedBy: currentUser.user.uid
        });
      }

      // Log message deletion
      await auditService.logEvent('MESSAGE_DELETED', {
        messageId,
        conversationId: message.conversationId,
        hardDelete: hard
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Get client IP address
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  // Cleanup listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();
  }

  // Get conversation statistics
  async getConversationStats(conversationId) {
    try {
      const messagesSnapshot = await getDocs(query(
        collection(db, this.messagesCollection),
        where('conversationId', '==', conversationId),
        where('isDeleted', '==', false)
      ));

      const messages = messagesSnapshot.docs.map(doc => doc.data());
      
      const stats = {
        totalMessages: messages.length,
        messagesByType: {},
        messagesBySender: {},
        averageResponseTime: 0,
        firstMessageAt: null,
        lastMessageAt: null
      };

      messages.forEach(message => {
        // Count by type
        stats.messagesByType[message.type] = (stats.messagesByType[message.type] || 0) + 1;
        
        // Count by sender
        stats.messagesBySender[message.senderEmail] = (stats.messagesBySender[message.senderEmail] || 0) + 1;
        
        // Track timestamps
        const messageTime = message.createdAt?.toDate();
        if (messageTime) {
          if (!stats.firstMessageAt || messageTime < stats.firstMessageAt) {
            stats.firstMessageAt = messageTime;
          }
          if (!stats.lastMessageAt || messageTime > stats.lastMessageAt) {
            stats.lastMessageAt = messageTime;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const messagingService = new MessagingService();

export default messagingService;