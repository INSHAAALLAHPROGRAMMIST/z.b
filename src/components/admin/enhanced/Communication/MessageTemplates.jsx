import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';

const MessageTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'general',
    subject: '',
    message: '',
    variables: [],
    isActive: true,
    description: ''
  });

  // Communication history
  const [communicationHistory, setCommunicationHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all'); // all, email, sms, telegram, phone

  const templateCategories = [
    { value: 'general', label: 'Umumiy' },
    { value: 'order', label: 'Buyurtma' },
    { value: 'customer', label: 'Mijoz' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'support', label: 'Qo\'llab-quvvatlash' },
    { value: 'notification', label: 'Bildirishnoma' }
  ];

  const defaultTemplates = [
    {
      name: 'Buyurtma Tasdiqlash',
      category: 'order',
      subject: 'Buyurtmangiz tasdiqlandi - #{orderId}',
      message: 'Hurmatli {customerName},\n\nSizning #{orderId} raqamli buyurtmangiz muvaffaqiyatli tasdiqlandi.\n\nBuyurtma tafsilotlari:\n- Kitob: {bookTitle}\n- Miqdor: {quantity}\n- Summa: {amount} so\'m\n\nYetkazib berish manzili: {address}\nTaxminiy yetkazib berish vaqti: {deliveryTime}\n\nRahmat!',
      variables: ['customerName', 'orderId', 'bookTitle', 'quantity', 'amount', 'address', 'deliveryTime'],
      description: 'Mijoz buyurtmasini tasdiqlash uchun'
    },
    {
      name: 'Buyurtma Yetkazildi',
      category: 'order',
      subject: 'Buyurtmangiz yetkazildi - #{orderId}',
      message: 'Hurmatli {customerName},\n\nSizning #{orderId} raqamli buyurtmangiz muvaffaqiyatli yetkazildi.\n\nAgar biror savol yoki muammo bo\'lsa, biz bilan bog\'laning.\n\nXaridingiz uchun rahmat!',
      variables: ['customerName', 'orderId'],
      description: 'Buyurtma yetkazilgani haqida xabar'
    },
    {
      name: 'Kam Stock Ogohlantiruvi',
      category: 'notification',
      subject: 'Stock tugayapti - {bookTitle}',
      message: 'Diqqat!\n\n{bookTitle} kitobi stock tugayapti.\n\nHozirgi stock: {currentStock}\nMinimum stock: {minStock}\n\nTezda to\'ldiring!',
      variables: ['bookTitle', 'currentStock', 'minStock'],
      description: 'Stock tugaganda admin uchun ogohlantirish'
    },
    {
      name: 'Yangi Mijoz Xush Kelibsiz',
      category: 'customer',
      subject: 'Xush kelibsiz - {siteName}',
      message: 'Hurmatli {customerName},\n\n{siteName} ga xush kelibsiz!\n\nSiz endi bizning doimiy mijozimiz bo\'ldingiz. Sizga eng yaxshi kitoblar va xizmatlarni taklif qilishdan mamnunmiz.\n\nBirinchi xaridingizda 10% chegirma olish uchun {discountCode} promokodidan foydalaning.\n\nXaridlar uchun: {siteUrl}\n\nRahmat!',
      variables: ['customerName', 'siteName', 'discountCode', 'siteUrl'],
      description: 'Yangi ro\'yxatdan o\'tgan mijoz uchun'
    },
    {
      name: 'Tug\'ilgan Kun Tabrigi',
      category: 'marketing',
      subject: 'Tug\'ilgan kuningiz muborak - {customerName}!',
      message: 'Hurmatli {customerName},\n\nTug\'ilgan kuningiz muborak bo\'lsin! 🎉\n\nSizga maxsus sovg\'a sifatida {discountPercent}% chegirma taqdim etamiz.\n\nPromokod: {birthdayCode}\nAmal qilish muddati: {expiryDate}\n\nEng yaxshi tilaklar bilan!',
      variables: ['customerName', 'discountPercent', 'birthdayCode', 'expiryDate'],
      description: 'Mijoz tug\'ilgan kuni uchun tabrik'
    }
  ];

  useEffect(() => {
    loadTemplates();
    loadCommunicationHistory();
  }, []);

  const loadTemplates = async () => {
    try {
      const templatesQuery = query(
        collection(db, 'messageTemplates'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(templatesQuery);
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      // If no templates exist, create default ones
      if (templatesData.length === 0) {
        await createDefaultTemplates();
      } else {
        setTemplates(templatesData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading templates:', error);
      setLoading(false);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      const promises = defaultTemplates.map(template => 
        addDoc(collection(db, 'messageTemplates'), {
          ...template,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: 'system'
        })
      );

      await Promise.all(promises);
      await loadTemplates(); // Reload after creating defaults
    } catch (error) {
      console.error('Error creating default templates:', error);
    }
  };

  const loadCommunicationHistory = async () => {
    try {
      const historyQuery = query(
        collection(db, 'communicationHistory'),
        orderBy('sentAt', 'desc')
      );
      
      const snapshot = await getDocs(historyQuery);
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate() || new Date()
      }));
      
      setCommunicationHistory(historyData);
    } catch (error) {
      console.error('Error loading communication history:', error);
    }
  };

  const getFilteredTemplates = () => {
    let filtered = [...templates];

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(template => template.category === filterCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.message.toLowerCase().includes(query) ||
        template.subject.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getFilteredHistory = () => {
    let filtered = [...communicationHistory];

    // Apply channel filter
    if (historyFilter !== 'all') {
      filtered = filtered.filter(item => item.channel === historyFilter);
    }

    return filtered;
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.message.trim()) {
      alert('Iltimos, shablon nomi va xabar matnini kiriting');
      return;
    }

    try {
      await addDoc(collection(db, 'messageTemplates'), {
        ...templateForm,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'admin'
      });

      setShowCreateModal(false);
      resetForm();
      await loadTemplates();
      alert('Shablon muvaffaqiyatli yaratildi!');
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Shablon yaratishda xato yuz berdi');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !templateForm.name.trim() || !templateForm.message.trim()) {
      alert('Iltimos, shablon nomi va xabar matnini kiriting');
      return;
    }

    try {
      await updateDoc(doc(db, 'messageTemplates', editingTemplate.id), {
        ...templateForm,
        updatedAt: serverTimestamp()
      });

      setEditingTemplate(null);
      resetForm();
      await loadTemplates();
      alert('Shablon muvaffaqiyatli yangilandi!');
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Shablon yangilashda xato yuz berdi');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Bu shablonni o\'chirmoqchimisiz?')) {
      try {
        await deleteDoc(doc(db, 'messageTemplates', templateId));
        await loadTemplates();
        alert('Shablon o\'chirildi!');
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Shablon o\'chirishda xato yuz berdi');
      }
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      category: template.category,
      subject: template.subject || '',
      message: template.message,
      variables: template.variables || [],
      isActive: template.isActive,
      description: template.description || ''
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      category: 'general',
      subject: '',
      message: '',
      variables: [],
      isActive: true,
      description: ''
    });
  };

  const extractVariables = (text) => {
    const matches = text.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const handleMessageChange = (message) => {
    const variables = extractVariables(message);
    setTemplateForm({
      ...templateForm,
      message,
      variables
    });
  };

  const getCategoryLabel = (category) => {
    const cat = templateCategories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const getChannelIcon = (channel) => {
    const icons = {
      email: 'fas fa-envelope',
      sms: 'fas fa-sms',
      telegram: 'fab fa-telegram',
      phone: 'fas fa-phone',
      whatsapp: 'fab fa-whatsapp'
    };
    return icons[channel] || 'fas fa-comment';
  };

  const getChannelLabel = (channel) => {
    const labels = {
      email: 'Email',
      sms: 'SMS',
      telegram: 'Telegram',
      phone: 'Telefon',
      whatsapp: 'WhatsApp'
    };
    return labels[channel] || channel;
  };

  if (loading) {
    return (
      <div className="templates-loading">
        <div className="loading-spinner"></div>
        <p>Shablonlar yuklanmoqda...</p>
      </div>
    );
  }

  const filteredTemplates = getFilteredTemplates();
  const filteredHistory = getFilteredHistory();

  return (
    <div className="message-templates">
      {/* Header */}
      <div className="templates-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-comments"></i>
            Xabar Shablonlari va Aloqa Tarixi
          </h2>
          <p>Tez xabar yuborish uchun shablonlar va aloqa tarixi</p>
        </div>
        
        <div className="header-actions">
          <button
            className="create-btn"
            onClick={() => {
              resetForm();
              setEditingTemplate(null);
              setShowCreateModal(true);
            }}
          >
            <i className="fas fa-plus"></i>
            Yangi Shablon
          </button>
        </div>
      </div>

      {/* Templates Section */}
      <div className="templates-section">
        <div className="section-header">
          <h3>Xabar Shablonlari ({filteredTemplates.length})</h3>
          
          <div className="templates-filters">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Shablonlar ichida qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="category-filter"
            >
              <option value="all">Barcha kategoriyalar</option>
              {templateCategories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="templates-grid">
          {filteredTemplates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <div className="template-info">
                  <h4>{template.name}</h4>
                  <span className={`category-badge ${template.category}`}>
                    {getCategoryLabel(template.category)}
                  </span>
                </div>
                <div className="template-actions">
                  <button
                    className="edit-btn"
                    onClick={() => handleEditTemplate(template)}
                    title="Tahrirlash"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteTemplate(template.id)}
                    title="O'chirish"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              {template.subject && (
                <div className="template-subject">
                  <strong>Mavzu:</strong> {template.subject}
                </div>
              )}

              <div className="template-preview">
                <pre>{template.message.substring(0, 200)}{template.message.length > 200 ? '...' : ''}</pre>
              </div>

              {template.variables && template.variables.length > 0 && (
                <div className="template-variables">
                  <strong>O'zgaruvchilar:</strong>
                  <div className="variables-list">
                    {template.variables.map(variable => (
                      <span key={variable} className="variable-tag">
                        {'{' + variable + '}'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="template-footer">
                <span className="template-date">
                  {template.createdAt.toLocaleDateString('uz-UZ')}
                </span>
                <span className={`status-badge ${template.isActive ? 'active' : 'inactive'}`}>
                  {template.isActive ? 'Faol' : 'Nofaol'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="no-templates">
            <i className="fas fa-comments"></i>
            <h4>Shablonlar topilmadi</h4>
            <p>Tanlangan filtrlar bo'yicha shablonlar yo'q</p>
          </div>
        )}
      </div>

      {/* Communication History Section */}
      <div className="history-section">
        <div className="section-header">
          <h3>Aloqa Tarixi ({filteredHistory.length})</h3>
          
          <div className="history-filters">
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="channel-filter"
            >
              <option value="all">Barcha kanallar</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="telegram">Telegram</option>
              <option value="phone">Telefon</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>

        <div className="history-list">
          {filteredHistory.length === 0 ? (
            <div className="no-history">
              <i className="fas fa-history"></i>
              <h4>Aloqa tarixi yo'q</h4>
              <p>Hali hech qanday xabar yuborilmagan</p>
            </div>
          ) : (
            filteredHistory.map(item => (
              <div key={item.id} className="history-item">
                <div className="history-icon">
                  <i className={getChannelIcon(item.channel)}></i>
                </div>
                
                <div className="history-content">
                  <div className="history-header">
                    <h4>{item.subject || 'Mavzusiz xabar'}</h4>
                    <div className="history-meta">
                      <span className={`channel-badge ${item.channel}`}>
                        {getChannelLabel(item.channel)}
                      </span>
                      <span className="history-date">
                        {item.sentAt.toLocaleString('uz-UZ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="history-details">
                    <p><strong>Qabul qiluvchi:</strong> {item.recipient}</p>
                    <p><strong>Shablon:</strong> {item.templateName || 'Shablonsiz'}</p>
                    {item.message && (
                      <div className="message-preview">
                        <strong>Xabar:</strong>
                        <p>{item.message.substring(0, 150)}{item.message.length > 150 ? '...' : ''}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="history-status">
                    <span className={`status-badge ${item.status}`}>
                      {item.status === 'sent' ? 'Yuborildi' :
                       item.status === 'delivered' ? 'Yetkazildi' :
                       item.status === 'failed' ? 'Xato' :
                       item.status === 'pending' ? 'Kutilmoqda' : item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Template Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="template-modal">
            <div className="modal-header">
              <h3>
                {editingTemplate ? 'Shablonni Tahrirlash' : 'Yangi Shablon Yaratish'}
              </h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Shablon nomi:</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Shablon nomini kiriting"
                  />
                </div>

                <div className="form-group">
                  <label>Kategoriya:</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  >
                    {templateCategories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Mavzu (ixtiyoriy):</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Email mavzusi yoki SMS sarlavhasi"
                />
              </div>

              <div className="form-group">
                <label>Tavsif (ixtiyoriy):</label>
                <input
                  type="text"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Shablon haqida qisqacha ma'lumot"
                />
              </div>

              <div className="form-group">
                <label>Xabar matni:</label>
                <textarea
                  value={templateForm.message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  placeholder="Xabar matnini kiriting. O'zgaruvchilar uchun {variableName} formatini ishlating"
                  rows="8"
                />
                <small>
                  O'zgaruvchilar uchun {'{variableName}'} formatini ishlating. 
                  Masalan: {'{customerName}'}, {'{orderId}'}, {'{amount}'}
                </small>
              </div>

              {templateForm.variables.length > 0 && (
                <div className="form-group">
                  <label>Aniqlangan o'zgaruvchilar:</label>
                  <div className="variables-preview">
                    {templateForm.variables.map(variable => (
                      <span key={variable} className="variable-tag">
                        {'{' + variable + '}'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={templateForm.isActive}
                    onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                  />
                  Shablon faol
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                Bekor qilish
              </button>
              <button
                className="save-btn"
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
              >
                {editingTemplate ? 'Yangilash' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageTemplates;