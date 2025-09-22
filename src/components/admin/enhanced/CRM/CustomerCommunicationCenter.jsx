import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, addDoc, serverTimestamp, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';
import CustomerCommunication from '../OrderManagement/CustomerCommunication';
import notificationService from '../../../../services/NotificationService';

const CustomerCommunicationCenter = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Load conversations and customers
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load conversations
        const conversationsQuery = query(
          collection(db, 'communications'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );

        const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
          const messagesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          }));

          // Group messages by customer/order
          const conversationsMap = new Map();
          
          messagesData.forEach(message => {
            const key = message.customerId || message.orderId;
            if (!conversationsMap.has(key)) {
              conversationsMap.set(key, {
                id: key,
                customerId: message.customerId,
                customerName: message.customerName,
                customerEmail: message.customerEmail,
                customerPhone: message.customerPhone,
                telegramUsername: message.telegramUsername,
                orderId: message.orderId,
                messages: [],
                lastMessage: null,
                unreadCount: 0,
                lastActivity: message.createdAt
              });
            }
            
            const conversation = conversationsMap.get(key);
            conversation.messages.push(message);
            
            if (!conversation.lastMessage || message.createdAt > conversation.lastMessage.createdAt) {
              conversation.lastMessage = message;
              conversation.lastActivity = message.createdAt;
            }
            
            if (!message.isRead && message.sender !== 'admin') {
              conversation.unreadCount++;
            }
          });

          const conversationsArray = Array.from(conversationsMap.values())
            .sort((a, b) => b.lastActivity - a.lastActivity);

          setConversations(conversationsArray);
          setLoading(false);
        });

        // Load customers for new message
        const customersQuery = query(
          collection(db, COLLECTIONS.USERS),
          orderBy('fullName', 'asc'),
          limit(100)
        );

        const customersSnapshot = await getDocs(customersQuery);
        const customersData = customersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setCustomers(customersData);

        return () => unsubscribe();
      } catch (err) {
        console.error('Data loading error:', err);
        setError('Ma\'lumotlarni yuklashda xato');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load message templates
  useEffect(() => {
    const templates = [
      {
        id: 'greeting',
        title: 'Salom',
        category: 'greeting',
        content: 'Salom! Sizga qanday yordam bera olaman?'
      },
      {
        id: 'order_inquiry',
        title: 'Buyurtma haqida',
        category: 'order',
        content: 'Sizning buyurtmangiz haqida ma\'lumot bermoqchiman. Qo\'shimcha savollaringiz bo\'lsa, so\'rang.'
      },
      {
        id: 'book_recommendation',
        title: 'Kitob tavsiyasi',
        category: 'support',
        content: 'Sizga mos kitoblar tavsiya qilishim mumkin. Qanday janrni afzal ko\'rasiz?'
      },
      {
        id: 'thank_you',
        title: 'Rahmat',
        category: 'closing',
        content: 'Bizni tanlaganingiz uchun rahmat! Yana savollaringiz bo\'lsa, murojaat qiling.'
      },
      {
        id: 'follow_up',
        title: 'Kuzatuv',
        category: 'support',
        content: 'Oldingi xabarimga javob kutmoqdaman. Qo\'shimcha yordam kerakmi?'
      }
    ];

    setMessageTemplates(templates);
  }, []);

  // Filter conversations
  const filteredConversations = conversations.filter(conversation => {
    // Status filter
    if (filterStatus === 'unread' && conversation.unreadCount === 0) return false;
    if (filterStatus === 'read' && conversation.unreadCount > 0) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        conversation.customerName?.toLowerCase().includes(query) ||
        conversation.customerEmail?.toLowerCase().includes(query) ||
        conversation.lastMessage?.message?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const formatTime = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Hozir';
    if (diffInMinutes < 60) return `${diffInMinutes} daqiqa oldin`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} soat oldin`;
    
    return new Intl.DateTimeFormat('uz-UZ', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getMessagePreview = (message) => {
    if (!message) return 'Xabar yo\'q';
    return message.message.length > 50 ? 
      message.message.substring(0, 50) + '...' : 
      message.message;
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleNewMessage = () => {
    setShowNewMessage(true);
    setSelectedCustomer(null);
    setNewMessage('');
    setCustomerSearchQuery('');
  };

  // Send message to selected conversation
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const messageData = {
        orderId: selectedConversation.orderId,
        customerId: selectedConversation.customerId,
        customerName: selectedConversation.customerName,
        customerEmail: selectedConversation.customerEmail,
        customerPhone: selectedConversation.customerPhone,
        telegramUsername: selectedConversation.telegramUsername,
        
        message: newMessage.trim(),
        messageType: 'info',
        sender: 'admin',
        senderName: 'Admin',
        
        channels: {
          email: !!selectedConversation.customerEmail,
          sms: !!selectedConversation.customerPhone,
          telegram: !!selectedConversation.telegramUsername,
          inApp: true
        },
        
        deliveryStatus: {
          email: 'pending',
          sms: 'pending', 
          telegram: 'pending',
          inApp: 'delivered'
        },
        
        createdAt: serverTimestamp(),
        isRead: false
      };

      // Save to database
      await addDoc(collection(db, 'communications'), messageData);

      // Send via notification service
      await notificationService.sendOrderStatusNotification(
        {
          id: selectedConversation.orderId || 'direct_message',
          customerInfo: {
            fullName: selectedConversation.customerName,
            email: selectedConversation.customerEmail,
            phone: selectedConversation.customerPhone,
            telegramUsername: selectedConversation.telegramUsername
          },
          totalAmount: 0,
          items: []
        },
        'custom_message',
        newMessage.trim()
      );

      setNewMessage('');
      showToast('Xabar yuborildi', 'success');

    } catch (error) {
      console.error('Message sending error:', error);
      showToast('Xabar yuborishda xato', 'error');
    } finally {
      setSending(false);
    }
  };

  // Send new message to customer
  const sendNewMessageToCustomer = async () => {
    if (!newMessage.trim() || !selectedCustomer) return;

    setSending(true);
    try {
      const messageData = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        customerEmail: selectedCustomer.email,
        customerPhone: selectedCustomer.phone,
        telegramUsername: selectedCustomer.telegramUsername,
        
        message: newMessage.trim(),
        messageType: 'info',
        sender: 'admin',
        senderName: 'Admin',
        
        channels: {
          email: !!selectedCustomer.email,
          sms: !!selectedCustomer.phone,
          telegram: !!selectedCustomer.telegramUsername,
          inApp: true
        },
        
        deliveryStatus: {
          email: 'pending',
          sms: 'pending', 
          telegram: 'pending',
          inApp: 'delivered'
        },
        
        createdAt: serverTimestamp(),
        isRead: false
      };

      // Save to database
      await addDoc(collection(db, 'communications'), messageData);

      // Send via notification service
      await notificationService.sendOrderStatusNotification(
        {
          id: 'new_message',
          customerInfo: selectedCustomer,
          totalAmount: 0,
          items: []
        },
        'custom_message',
        newMessage.trim()
      );

      setShowNewMessage(false);
      setNewMessage('');
      setSelectedCustomer(null);
      showToast('Xabar yuborildi', 'success');

    } catch (error) {
      console.error('New message sending error:', error);
      showToast('Xabar yuborishda xato', 'error');
    } finally {
      setSending(false);
    }
  };

  // Use template
  const useTemplate = (template) => {
    setNewMessage(template.content);
    setShowTemplates(false);
  };

  // Mark conversation as read
  const markAsRead = async (conversation) => {
    try {
      const unreadMessages = conversation.messages.filter(m => !m.isRead && m.sender !== 'admin');
      
      for (const message of unreadMessages) {
        await updateDoc(doc(db, 'communications', message.id), {
          isRead: true,
          readAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  // Filter customers for new message
  const filteredCustomers = customers.filter(customer => {
    if (!customerSearchQuery.trim()) return true;
    
    const query = customerSearchQuery.toLowerCase();
    return (
      customer.fullName?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.telegramUsername?.toLowerCase().includes(query)
    );
  });

  const showToast = (message, type) => {
    const event = new CustomEvent('showToast', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  };

  const statusFilters = [
    { value: 'all', label: 'Barcha suhbatlar', icon: 'fas fa-comments' },
    { value: 'unread', label: 'O\'qilmagan', icon: 'fas fa-envelope' },
    { value: 'read', label: 'O\'qilgan', icon: 'fas fa-envelope-open' }
  ];

  if (loading) {
    return (
      <div className="communication-center-loading">
        <div className="loading-content">
          <i className="fas fa-spinner fa-spin"></i>
          <span>Suhbatlar yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="communication-center-error">
        <div className="error-content">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Xato yuz berdi</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Qayta yuklash
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-communication-center">
      <div className="communication-header">
        <div className="header-info">
          <h2>Mijozlar bilan Aloqa Markazi</h2>
          <p>Barcha mijozlar bilan suhbatlarni boshqaring</p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={handleNewMessage}
            className="new-message-btn"
          >
            <i className="fas fa-plus"></i>
            Yangi Xabar
          </button>
        </div>
      </div>

      <div className="communication-content">
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <div className="search-section">
              <div className="search-input-container">
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  placeholder="Suhbat qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="clear-search"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="filter-tabs">
              {statusFilters.map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setFilterStatus(filter.value)}
                  className={`filter-tab ${filterStatus === filter.value ? 'active' : ''}`}
                >
                  <i className={filter.icon}></i>
                  <span>{filter.label}</span>
                  {filter.value === 'unread' && (
                    <span className="unread-count">
                      {conversations.filter(c => c.unreadCount > 0).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="conversations-list">
            {filteredConversations.length === 0 ? (
              <div className="no-conversations">
                <i className="fas fa-comments"></i>
                <p>Suhbatlar topilmadi</p>
              </div>
            ) : (
              filteredConversations.map(conversation => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationSelect(conversation)}
                  className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''} ${conversation.unreadCount > 0 ? 'unread' : ''}`}
                >
                  <div className="conversation-avatar">
                    <i className="fas fa-user"></i>
                    {conversation.unreadCount > 0 && (
                      <span className="unread-badge">{conversation.unreadCount}</span>
                    )}
                  </div>
                  
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <h4>{conversation.customerName || 'N/A'}</h4>
                      <span className="conversation-time">
                        {formatTime(conversation.lastActivity)}
                      </span>
                    </div>
                    
                    <div className="conversation-preview">
                      <span className="message-preview">
                        {getMessagePreview(conversation.lastMessage)}
                      </span>
                      {conversation.orderId && (
                        <span className="order-badge">
                          #{conversation.orderId.substring(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="conversation-main">
          {selectedConversation ? (
            <div className="conversation-details">
              <div className="conversation-details-header">
                <div className="customer-info">
                  <div className="customer-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="customer-details">
                    <h3>{selectedConversation.customerName || 'N/A'}</h3>
                    <span>{selectedConversation.customerEmail || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="conversation-actions">
                  <button className="action-btn" title="Profil ko'rish">
                    <i className="fas fa-user"></i>
                  </button>
                  <button className="action-btn" title="Buyurtmalar">
                    <i className="fas fa-shopping-bag"></i>
                  </button>
                </div>
              </div>

              <div className="messages-container">
                <div className="messages-list">
                  {selectedConversation.messages
                    .sort((a, b) => a.createdAt - b.createdAt)
                    .map(message => (
                      <div 
                        key={message.id}
                        className={`message-item ${message.sender === 'admin' ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">
                          <div className="message-text">{message.message}</div>
                          <div className="message-time">
                            {formatTime(message.createdAt)}
                          </div>
                        </div>
                        
                        {message.deliveryStatus && (
                          <div className="delivery-status">
                            {Object.entries(message.deliveryStatus).map(([channel, status]) => (
                              <span key={channel} className={`delivery-badge ${status}`}>
                                <i className={
                                  channel === 'email' ? 'fas fa-envelope' :
                                  channel === 'telegram' ? 'fab fa-telegram' :
                                  channel === 'sms' ? 'fas fa-sms' : 'fas fa-check'
                                }></i>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="message-input-section">
                <div className="input-header">
                  <div className="quick-responses">
                    {messageTemplates.slice(0, 3).map(template => (
                      <button 
                        key={template.id}
                        onClick={() => useTemplate(template)}
                        className="quick-response-btn"
                      >
                        {template.title}
                      </button>
                    ))}
                    <button 
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="templates-btn"
                    >
                      <i className="fas fa-list"></i>
                      Shablonlar
                    </button>
                  </div>
                </div>

                {showTemplates && (
                  <div className="templates-dropdown">
                    <div className="templates-grid">
                      {messageTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => useTemplate(template)}
                          className="template-item"
                        >
                          <div className="template-title">{template.title}</div>
                          <div className="template-preview">
                            {template.content.substring(0, 50)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="message-input-container">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Xabar yozing..."
                    className="message-input"
                    rows={3}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <div className="input-actions">
                    <button 
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="template-toggle-btn"
                      title="Shablonlar"
                    >
                      <i className="fas fa-list"></i>
                    </button>
                    <button 
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="send-btn"
                    >
                      {sending ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-paper-plane"></i>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-conversation-selected">
              <i className="fas fa-comments"></i>
              <h3>Suhbat tanlanmagan</h3>
              <p>Suhbatni boshlash uchun chap tarafdan mijozni tanlang</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced New Message Modal */}
      {showNewMessage && (
        <div className="new-message-overlay">
          <div className="new-message-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-plus"></i>
                Yangi Xabar Yuborish
              </h3>
              <button 
                onClick={() => setShowNewMessage(false)}
                className="close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-content">
              <div className="customer-selection">
                <label>Mijoz tanlang:</label>
                <div className="customer-search-container">
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Mijoz qidirish (ism, email, telefon)..."
                    className="customer-search-input"
                  />
                  <i className="fas fa-search search-icon"></i>
                </div>

                {customerSearchQuery && (
                  <div className="customers-dropdown">
                    {filteredCustomers.length === 0 ? (
                      <div className="no-customers">
                        <i className="fas fa-user-slash"></i>
                        <span>Mijozlar topilmadi</span>
                      </div>
                    ) : (
                      <div className="customers-list">
                        {filteredCustomers.slice(0, 10).map(customer => (
                          <div
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerSearchQuery(customer.fullName || customer.email);
                            }}
                            className={`customer-option ${selectedCustomer?.id === customer.id ? 'selected' : ''}`}
                          >
                            <div className="customer-avatar small">
                              <i className="fas fa-user"></i>
                            </div>
                            <div className="customer-info">
                              <div className="customer-name">{customer.fullName || 'N/A'}</div>
                              <div className="customer-contact">
                                {customer.email && <span><i className="fas fa-envelope"></i> {customer.email}</span>}
                                {customer.phone && <span><i className="fas fa-phone"></i> {customer.phone}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="selected-customer">
                    <div className="customer-card">
                      <div className="customer-avatar">
                        <i className="fas fa-user"></i>
                      </div>
                      <div className="customer-details">
                        <h4>{selectedCustomer.fullName || 'N/A'}</h4>
                        <div className="contact-methods">
                          {selectedCustomer.email && (
                            <span className="contact-method">
                              <i className="fas fa-envelope"></i>
                              {selectedCustomer.email}
                            </span>
                          )}
                          {selectedCustomer.phone && (
                            <span className="contact-method">
                              <i className="fas fa-phone"></i>
                              {selectedCustomer.phone}
                            </span>
                          )}
                          {selectedCustomer.telegramUsername && (
                            <span className="contact-method">
                              <i className="fab fa-telegram"></i>
                              @{selectedCustomer.telegramUsername}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearchQuery('');
                        }}
                        className="remove-customer"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="message-compose">
                <div className="compose-header">
                  <label>Xabar matni:</label>
                  <button 
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="templates-toggle"
                  >
                    <i className="fas fa-list"></i>
                    Shablonlar
                  </button>
                </div>

                {showTemplates && (
                  <div className="templates-section">
                    <div className="templates-grid">
                      {messageTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => useTemplate(template)}
                          className="template-card"
                        >
                          <div className="template-header">
                            <span className="template-title">{template.title}</span>
                            <span className="template-category">{template.category}</span>
                          </div>
                          <div className="template-preview">
                            {template.content.substring(0, 80)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Xabar matnini kiriting..."
                  rows={6}
                  className="compose-textarea"
                />

                <div className="message-info">
                  <span className="char-count">{newMessage.length} belgi</span>
                  {selectedCustomer && (
                    <div className="delivery-channels">
                      <span>Yuboriladi:</span>
                      {selectedCustomer.email && <i className="fas fa-envelope" title="Email"></i>}
                      {selectedCustomer.phone && <i className="fas fa-sms" title="SMS"></i>}
                      {selectedCustomer.telegramUsername && <i className="fab fa-telegram" title="Telegram"></i>}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={() => setShowNewMessage(false)}
                className="cancel-btn"
                disabled={sending}
              >
                <i className="fas fa-times"></i>
                Bekor qilish
              </button>
              <button 
                onClick={sendNewMessageToCustomer}
                disabled={!selectedCustomer || !newMessage.trim() || sending}
                className="send-btn"
              >
                {sending ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Yuborilmoqda...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Yuborish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCommunicationCenter;