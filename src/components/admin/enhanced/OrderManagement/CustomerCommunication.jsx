import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';
import notificationService from '../../../../services/NotificationService';
import { createTelegramLinkProps } from '../../../../utils/telegramUtils';

const CustomerCommunication = ({ order, customer, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [showCommunicationHistory, setShowCommunicationHistory] = useState(false);
  const [quickMessageChannel, setQuickMessageChannel] = useState('all');
  const [showQuickMessageModal, setShowQuickMessageModal] = useState(false);

  // Message templates
  const messageTemplates = [
    {
      id: 'order_confirmed',
      title: 'Buyurtma tasdiqlandi',
      type: 'success',
      content: `Hurmatli ${order?.customerName || '[Mijoz ismi]'},

Sizning buyurtmangiz (#${order?.id?.substring(0, 8)}) muvaffaqiyatli tasdiqlandi.

Kitob: ${order?.bookTitle || '[Kitob nomi]'}
Miqdor: ${order?.quantity || 1} dona
Summa: ${order?.totalAmount ? new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS' }).format(order.totalAmount) : '[Summa]'}

Buyurtmangiz tez orada tayyorlanadi va sizga yetkazib beriladi.

Hurmat bilan,
Zamon Books jamoasi`
    },
    {
      id: 'order_shipping',
      title: 'Buyurtma yetkazishga yuborildi',
      type: 'info',
      content: `Hurmatli ${order?.customerName || '[Mijoz ismi]'},

Sizning buyurtmangiz (#${order?.id?.substring(0, 8)}) yetkazib berish uchun yuborildi.

Buyurtmangiz yaqin kunlarda sizga yetkazib beriladi. Qo'shimcha savollar bo'lsa, biz bilan bog'laning.

Hurmat bilan,
Zamon Books jamoasi`
    },
    {
      id: 'order_completed',
      title: 'Buyurtma tugallandi',
      type: 'success',
      content: `Hurmatli ${order?.customerName || '[Mijoz ismi]'},

Sizning buyurtmangiz (#${order?.id?.substring(0, 8)}) muvaffaqiyatli tugallandi.

Xizmatimizdan foydalanganingiz uchun rahmat! Fikr-mulohazalaringizni kutamiz.

Hurmat bilan,
Zamon Books jamoasi`
    },
    {
      id: 'order_cancelled',
      title: 'Buyurtma bekor qilindi',
      type: 'warning',
      content: `Hurmatli ${order?.customerName || '[Mijoz ismi]'},

Afsuski, sizning buyurtmangiz (#${order?.id?.substring(0, 8)}) bekor qilindi.

Sabab: [Bekor qilish sababi]

Agar savollaringiz bo'lsa, biz bilan bog'laning.

Hurmat bilan,
Zamon Books jamoasi`
    },
    {
      id: 'payment_reminder',
      title: 'To\'lov eslatmasi',
      type: 'warning',
      content: `Hurmatli ${order?.customerName || '[Mijoz ismi]'},

Sizning buyurtmangiz (#${order?.id?.substring(0, 8)}) uchun to'lov kutilmoqda.

To'lov qilish uchun biz bilan bog'laning yoki ko'rsatilgan usullardan foydalaning.

Hurmat bilan,
Zamon Books jamoasi`
    }
  ];

  // Load communication history
  useEffect(() => {
    if (!order?.id) return;

    const messagesQuery = query(
      collection(db, 'communications'),
      where('orderId', '==', order.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setMessages(messagesData);
      setLoading(false);
    }, (error) => {
      console.error('Messages loading error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [order?.id]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !order?.id) return;

    setSending(true);
    try {
      const messageData = {
        orderId: order.id,
        customerId: order.userId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        telegramUsername: order.telegramUsername,
        
        message: newMessage.trim(),
        messageType,
        sender: 'admin',
        senderName: 'Admin', // TODO: Get actual admin name
        
        // Delivery channels
        channels: {
          email: !!order.customerEmail,
          sms: !!order.customerPhone,
          telegram: !!order.telegramUsername,
          inApp: true
        },
        
        // Delivery status
        deliveryStatus: {
          email: 'pending',
          sms: 'pending', 
          telegram: 'pending',
          inApp: 'delivered'
        },
        
        createdAt: serverTimestamp(),
        isRead: false
      };

      await addDoc(collection(db, 'communications'), messageData);

      // Send actual notifications
      await sendNotifications(messageData);

      setNewMessage('');
      
      // Show success toast
      showToast('Xabar muvaffaqiyatli yuborildi', 'success');

    } catch (error) {
      console.error('Message sending error:', error);
      showToast('Xabar yuborishda xato yuz berdi', 'error');
    } finally {
      setSending(false);
    }
  };

  // Send notifications through various channels
  const sendNotifications = async (messageData) => {
    try {
      // Use the enhanced NotificationService for better integration
      const result = await notificationService.sendOrderStatusNotification(
        order,
        'custom_message',
        messageData.message
      );

      if (result.success) {
        console.log('Notification sent successfully via NotificationService');
      } else {
        console.warn('Notification failed:', result.error);
        // Fallback to individual channel sending
        await sendIndividualNotifications(messageData);
      }

    } catch (error) {
      console.error('Notification sending error:', error);
      // Fallback to individual channel sending
      await sendIndividualNotifications(messageData);
    }
  };

  const sendIndividualNotifications = async (messageData) => {
    try {
      // Email notification
      if (messageData.channels.email && order.customerEmail) {
        await sendEmailNotification(messageData);
      }

      // SMS notification
      if (messageData.channels.sms && order.customerPhone) {
        await sendSMSNotification(messageData);
      }

      // Telegram notification
      if (messageData.channels.telegram && (order.telegramUsername || order.customerTelegram)) {
        await sendTelegramNotification(messageData);
      }

    } catch (error) {
      console.error('Individual notification sending error:', error);
    }
  };

  const sendEmailNotification = async (messageData) => {
    try {
      // Enhanced email notification with better formatting
      const emailData = {
        to: order.customerEmail,
        subject: `Zamon Books - Buyurtma #${order.id.substring(0, 8)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Zamon Books</h2>
            <p>Hurmatli ${order.customerName},</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${messageData.message.replace(/\n/g, '<br>')}
            </div>
            <p>Buyurtma raqami: <strong>#${order.id.substring(0, 8)}</strong></p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Hurmat bilan,<br>
              Zamon Books jamoasi
            </p>
          </div>
        `,
        text: messageData.message
      };
      
      console.log('Sending enhanced email:', emailData);
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      
    } catch (error) {
      console.error('Email sending error:', error);
    }
  };

  const sendSMSNotification = async (messageData) => {
    try {
      const smsText = `Zamon Books: ${messageData.message}\n\nBuyurtma: #${order.id.substring(0, 8)}`;
      
      console.log('Sending SMS:', {
        to: order.customerPhone,
        message: smsText
      });
      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      
    } catch (error) {
      console.error('SMS sending error:', error);
    }
  };

  const sendTelegramNotification = async (messageData) => {
    try {
      const telegramUsername = order.telegramUsername || order.customerTelegram;
      
      // Use NotificationService for Telegram
      await notificationService.sendTelegramMessage(
        telegramUsername, // This would need to be converted to chat ID
        `📢 *Zamon Books*\n\n${messageData.message}\n\n📋 Buyurtma: #${order.id.substring(0, 8)}`
      );
      
    } catch (error) {
      console.error('Telegram sending error:', error);
    }
  };

  const showToast = (message, type) => {
    const event = new CustomEvent('showToast', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  };

  // Handle quick message functionality
  const handleQuickMessage = (channel) => {
    setQuickMessageChannel(channel);
    setShowQuickMessageModal(true);
  };

  // Handle direct Telegram messaging
  const handleDirectTelegramMessage = async () => {
    const telegramUsername = order.telegramUsername || order.customerTelegram;
    if (!telegramUsername) {
      showToast('Telegram username topilmadi', 'error');
      return;
    }

    try {
      // Create a quick message for Telegram
      const quickMessage = `Salom ${order.customerName}! 

Sizning buyurtmangiz (#${order.id.substring(0, 8)}) haqida xabar bermoqchiman.

Agar savollaringiz bo'lsa, javob yozing.

Hurmat bilan,
Zamon Books`;

      // Send via NotificationService
      const result = await notificationService.sendTelegramMessage(
        telegramUsername,
        quickMessage
      );

      if (result && result.ok) {
        showToast('Telegram xabari yuborildi', 'success');
        
        // Log the communication
        await logCommunication({
          channel: 'telegram',
          message: quickMessage,
          recipient: telegramUsername,
          success: true
        });
      } else {
        throw new Error('Telegram xabar yuborishda xato');
      }

    } catch (error) {
      console.error('Direct Telegram message error:', error);
      showToast('Telegram xabar yuborishda xato yuz berdi', 'error');
      
      // Log failed communication
      await logCommunication({
        channel: 'telegram',
        message: 'Direct message attempt',
        recipient: telegramUsername,
        success: false,
        error: error.message
      });
    }
  };

  // Send quick message to specific channel
  const sendQuickMessage = async (message, channel) => {
    if (!message.trim()) return;

    setSending(true);
    try {
      const messageData = {
        orderId: order.id,
        customerId: order.userId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        telegramUsername: order.telegramUsername || order.customerTelegram,
        
        message: message.trim(),
        messageType: 'info',
        sender: 'admin',
        senderName: 'Admin',
        
        // Set channels based on selection
        channels: {
          email: channel === 'all' || channel === 'email' ? !!order.customerEmail : false,
          sms: channel === 'all' || channel === 'sms' ? !!order.customerPhone : false,
          telegram: channel === 'all' || channel === 'telegram' ? !!(order.telegramUsername || order.customerTelegram) : false,
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

      // Send notifications
      await sendNotifications(messageData);

      showToast('Xabar muvaffaqiyatli yuborildi', 'success');
      setShowQuickMessageModal(false);

    } catch (error) {
      console.error('Quick message sending error:', error);
      showToast('Xabar yuborishda xato yuz berdi', 'error');
    } finally {
      setSending(false);
    }
  };

  // Log communication for history tracking
  const logCommunication = async (communicationData) => {
    try {
      await addDoc(collection(db, 'communication_history'), {
        orderId: order.id,
        customerId: order.userId,
        customerName: order.customerName,
        ...communicationData,
        timestamp: serverTimestamp(),
        adminId: 'current_admin', // TODO: Get actual admin ID
        adminName: 'Admin'
      });
    } catch (error) {
      console.error('Error logging communication:', error);
    }
  };

  const useTemplate = (template) => {
    setNewMessage(template.content);
    setMessageType(template.type);
  };

  const formatTime = (date) => {
    return new Intl.DateTimeFormat('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const getMessageTypeIcon = (type) => {
    const icons = {
      info: 'fas fa-info-circle',
      success: 'fas fa-check-circle',
      warning: 'fas fa-exclamation-triangle',
      error: 'fas fa-times-circle'
    };
    return icons[type] || icons.info;
  };

  if (!order) {
    return (
      <div className="customer-communication error">
        <p>Buyurtma ma'lumotlari topilmadi</p>
      </div>
    );
  }

  return (
    <div className="customer-communication">
      <div className="communication-header">
        <div className="header-info">
          <h3>Mijoz bilan Aloqa</h3>
          <div className="customer-info">
            <span className="customer-name">{order.customerName}</span>
            <span className="order-id">#{order.id.substring(0, 8)}</span>
          </div>
        </div>
        <button onClick={onClose} className="close-btn">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="communication-content">
        {/* Enhanced Customer Contact Info */}
        <div className="contact-info">
          <h4>Aloqa Ma'lumotlari</h4>
          <div className="contact-methods">
            {order.customerEmail && (
              <div className="contact-method">
                <i className="fas fa-envelope"></i>
                <span>{order.customerEmail}</span>
                <div className="contact-actions">
                  <a 
                    href={`mailto:${order.customerEmail}?subject=Zamon Books - Buyurtma #${order.id.substring(0, 8)}`}
                    className="contact-btn email"
                    title="Email yuborish"
                  >
                    <i className="fas fa-envelope"></i>
                  </a>
                  <button 
                    className="contact-btn quick-message"
                    onClick={() => handleQuickMessage('email')}
                    title="Tezkor xabar"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            )}
            {order.customerPhone && (
              <div className="contact-method">
                <i className="fas fa-phone"></i>
                <span>{order.customerPhone}</span>
                <div className="contact-actions">
                  <a 
                    href={`tel:${order.customerPhone}`}
                    className="contact-btn phone"
                    title="Qo'ng'iroq qilish"
                  >
                    <i className="fas fa-phone-alt"></i>
                  </a>
                  <a 
                    href={`sms:${order.customerPhone}?body=Zamon Books: `}
                    className="contact-btn sms"
                    title="SMS yuborish"
                  >
                    <i className="fas fa-sms"></i>
                  </a>
                  <button 
                    className="contact-btn quick-message"
                    onClick={() => handleQuickMessage('sms')}
                    title="Tezkor xabar"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            )}
            {(order.telegramUsername || order.customerTelegram) && (
              <div className="contact-method">
                <i className="fab fa-telegram"></i>
                <span>@{order.telegramUsername || order.customerTelegram}</span>
                <div className="contact-actions">
                  <a 
                    {...createTelegramLinkProps(order.telegramUsername || order.customerTelegram)}
                    className="contact-btn telegram"
                    title="Telegram'da ochish"
                  >
                    <i className="fab fa-telegram"></i>
                  </a>
                  <button 
                    className="contact-btn direct-telegram"
                    onClick={() => handleDirectTelegramMessage()}
                    title="To'g'ridan-to'g'ri xabar"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                  <button 
                    className="contact-btn quick-message"
                    onClick={() => handleQuickMessage('telegram')}
                    title="Tezkor xabar"
                  >
                    <i className="fas fa-bolt"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="quick-actions">
            <button 
              className="quick-action-btn primary"
              onClick={() => handleQuickMessage('all')}
            >
              <i className="fas fa-broadcast-tower"></i>
              Barcha kanallarga xabar
            </button>
            <button 
              className="quick-action-btn secondary"
              onClick={() => setShowCommunicationHistory(true)}
            >
              <i className="fas fa-history"></i>
              Aloqa tarixi
            </button>
          </div>
        </div>

        {/* Message History */}
        <div className="message-history">
          <h4>Xabarlar Tarixi</h4>
          <div className="messages-container">
            {loading ? (
              <div className="messages-loading">
                <div className="loading-spinner">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Xabarlar yuklanmoqda...</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="no-messages">
                <i className="fas fa-comments"></i>
                <p>Hozircha xabarlar yo'q</p>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map(message => (
                  <div key={message.id} className={`message-item ${message.sender}`}>
                    <div className="message-header">
                      <div className="sender-info">
                        <i className={getMessageTypeIcon(message.messageType)}></i>
                        <span className="sender-name">
                          {message.sender === 'admin' ? 'Admin' : message.customerName}
                        </span>
                      </div>
                      <span className="message-time">{formatTime(message.createdAt)}</span>
                    </div>
                    <div className="message-content">
                      {message.message}
                    </div>
                    <div className="delivery-status">
                      {message.channels?.email && (
                        <span className={`delivery-badge ${message.deliveryStatus?.email || 'pending'}`}>
                          <i className="fas fa-envelope"></i>
                          Email
                        </span>
                      )}
                      {message.channels?.telegram && (
                        <span className={`delivery-badge ${message.deliveryStatus?.telegram || 'pending'}`}>
                          <i className="fab fa-telegram"></i>
                          Telegram
                        </span>
                      )}
                      {message.channels?.sms && (
                        <span className={`delivery-badge ${message.deliveryStatus?.sms || 'pending'}`}>
                          <i className="fas fa-sms"></i>
                          SMS
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Templates */}
        <div className="message-templates">
          <h4>Xabar Shablonlari</h4>
          <div className="templates-grid">
            {messageTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => useTemplate(template)}
                className={`template-btn ${template.type}`}
              >
                <i className={getMessageTypeIcon(template.type)}></i>
                <span>{template.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* New Message Form */}
        <div className="new-message-form">
          <h4>Yangi Xabar Yuborish</h4>
          
          <div className="message-type-selector">
            <label>Xabar turi:</label>
            <select 
              value={messageType} 
              onChange={(e) => setMessageType(e.target.value)}
              className="type-select"
            >
              <option value="info">Ma'lumot</option>
              <option value="success">Muvaffaqiyat</option>
              <option value="warning">Ogohlantirish</option>
              <option value="error">Xato</option>
            </select>
          </div>

          <div className="message-input-container">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Xabar matnini kiriting..."
              rows={6}
              className="message-textarea"
            />
            <div className="message-actions">
              <div className="delivery-options">
                <label className="delivery-option">
                  <input type="checkbox" defaultChecked disabled={!order.customerEmail} />
                  <span>Email</span>
                </label>
                <label className="delivery-option">
                  <input type="checkbox" defaultChecked disabled={!order.telegramUsername} />
                  <span>Telegram</span>
                </label>
                <label className="delivery-option">
                  <input type="checkbox" defaultChecked disabled={!order.customerPhone} />
                  <span>SMS</span>
                </label>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
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
      </div>

      {/* Quick Message Modal */}
      {showQuickMessageModal && (
        <div className="quick-message-modal">
          <div className="modal-overlay" onClick={() => setShowQuickMessageModal(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <i className="fas fa-bolt"></i>
                Tezkor Xabar Yuborish
              </h3>
              <button 
                onClick={() => setShowQuickMessageModal(false)}
                className="close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="channel-info">
                <p>
                  <strong>Kanal:</strong> 
                  {quickMessageChannel === 'all' && ' Barcha mavjud kanallar'}
                  {quickMessageChannel === 'email' && ' Email'}
                  {quickMessageChannel === 'sms' && ' SMS'}
                  {quickMessageChannel === 'telegram' && ' Telegram'}
                </p>
                <p><strong>Mijoz:</strong> {order.customerName}</p>
              </div>

              <QuickMessageForm 
                onSend={(message) => sendQuickMessage(message, quickMessageChannel)}
                onCancel={() => setShowQuickMessageModal(false)}
                sending={sending}
                templates={messageTemplates}
              />
            </div>
          </div>
        </div>
      )}

      {/* Communication History Modal */}
      {showCommunicationHistory && (
        <div className="communication-history-modal">
          <div className="modal-overlay" onClick={() => setShowCommunicationHistory(false)}></div>
          <div className="modal-content large">
            <div className="modal-header">
              <h3>
                <i className="fas fa-history"></i>
                Aloqa Tarixi
              </h3>
              <button 
                onClick={() => setShowCommunicationHistory(false)}
                className="close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <CommunicationHistory 
                customerId={order.userId}
                customerName={order.customerName}
                orderId={order.id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Quick Message Form Component
const QuickMessageForm = ({ onSend, onCancel, sending, templates }) => {
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const handleTemplateSelect = (template) => {
    setMessage(template.content);
    setSelectedTemplate(template.id);
  };

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <div className="quick-message-form">
      {/* Template Selection */}
      <div className="template-selection">
        <label>Shablon tanlash (ixtiyoriy):</label>
        <div className="template-buttons">
          {templates.slice(0, 3).map(template => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className={`template-btn ${template.type} ${selectedTemplate === template.id ? 'selected' : ''}`}
            >
              <i className={getMessageTypeIcon(template.type)}></i>
              {template.title}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="message-input">
        <label>Xabar matni:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Xabar matnini kiriting..."
          rows={6}
          className="message-textarea"
        />
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button 
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={sending}
        >
          <i className="fas fa-times"></i>
          Bekor qilish
        </button>
        <button 
          onClick={handleSend}
          className="btn btn-primary"
          disabled={!message.trim() || sending}
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
  );
};

// Communication History Component
const CommunicationHistory = ({ customerId, customerName, orderId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, email, sms, telegram

  useEffect(() => {
    loadCommunicationHistory();
  }, [customerId, filter]);

  const loadCommunicationHistory = async () => {
    setLoading(true);
    try {
      let historyQuery = query(
        collection(db, 'communication_history'),
        where('customerId', '==', customerId),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
        const historyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));

        // Apply filter
        const filteredHistory = filter === 'all' 
          ? historyData 
          : historyData.filter(item => item.channel === filter);

        setHistory(filteredHistory);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading communication history:', error);
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Intl.DateTimeFormat('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  const getChannelIcon = (channel) => {
    const icons = {
      email: 'fas fa-envelope',
      sms: 'fas fa-sms',
      telegram: 'fab fa-telegram',
      phone: 'fas fa-phone'
    };
    return icons[channel] || 'fas fa-comment';
  };

  return (
    <div className="communication-history">
      {/* Filter */}
      <div className="history-filter">
        <label>Kanal bo'yicha filtrlash:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Barcha kanallar</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="telegram">Telegram</option>
          <option value="phone">Telefon</option>
        </select>
      </div>

      {/* History List */}
      <div className="history-list">
        {loading ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Tarix yuklanmoqda...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="empty-history">
            <i className="fas fa-history"></i>
            <p>Aloqa tarixi topilmadi</p>
          </div>
        ) : (
          history.map(item => (
            <div key={item.id} className={`history-item ${item.success ? 'success' : 'failed'}`}>
              <div className="history-header">
                <div className="channel-info">
                  <i className={getChannelIcon(item.channel)}></i>
                  <span className="channel-name">{item.channel.toUpperCase()}</span>
                  <span className="recipient">{item.recipient}</span>
                </div>
                <div className="timestamp">
                  {formatTimestamp(item.timestamp)}
                </div>
              </div>
              
              <div className="history-content">
                <p>{item.message}</p>
              </div>
              
              <div className="history-footer">
                <div className="admin-info">
                  <i className="fas fa-user"></i>
                  {item.adminName}
                </div>
                <div className={`status ${item.success ? 'success' : 'failed'}`}>
                  <i className={`fas ${item.success ? 'fa-check' : 'fa-times'}`}></i>
                  {item.success ? 'Yuborildi' : 'Xato'}
                </div>
              </div>
              
              {item.error && (
                <div className="error-details">
                  <i className="fas fa-exclamation-triangle"></i>
                  {item.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Helper function for message type icons
const getMessageTypeIcon = (type) => {
  const icons = {
    info: 'fas fa-info-circle',
    success: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-triangle',
    error: 'fas fa-times-circle'
  };
  return icons[type] || icons.info;
};

export default CustomerCommunication;