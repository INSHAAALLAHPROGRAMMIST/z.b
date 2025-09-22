// User Profile Manager Component
// Comprehensive profile management with image upload and activity tracking

import React, { useState, useRef, useEffect } from 'react';
import useEnhancedAuth from '../hooks/useEnhancedAuth';

const UserProfileManager = () => {
  const {
    user,
    userProfile,
    loading,
    error,
    updateProfile,
    updatePassword,
    getUserActivityHistory,
    getUserLoginStats,
    refreshProfile,
    isProfileComplete,
    getProfileCompletionPercentage,
    getMissingProfileFields,
    clearError
  } = useEnhancedAuth();

  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [activityHistory, setActivityHistory] = useState([]);
  const [loginStats, setLoginStats] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const fileInputRef = useRef(null);

  // Initialize form data when profile loads
  useEffect(() => {
    if (userProfile && !editMode) {
      setFormData({
        displayName: userProfile.displayName || '',
        fullName: userProfile.fullName || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        telegramUsername: userProfile.telegramUsername || '',
        preferences: userProfile.preferences || {}
      });
      setImagePreview(userProfile.profileImage?.url || null);
    }
  }, [userProfile, editMode]);

  // Load activity history and stats when tab changes
  useEffect(() => {
    if (activeTab === 'activity' && user) {
      loadActivityData();
    }
  }, [activeTab, user]);

  const loadActivityData = async () => {
    try {
      const [activityResult, statsResult] = await Promise.all([
        getUserActivityHistory({ limitCount: 20 }),
        getUserLoginStats()
      ]);

      if (activityResult.success) {
        setActivityHistory(activityResult.activities);
      }

      if (statsResult.success) {
        setLoginStats(statsResult.stats);
      }
    } catch (err) {
      console.error('Error loading activity data:', err);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle nested preference changes
  const handlePreferenceChange = (category, key, value) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [category]: {
          ...prev.preferences[category],
          [key]: value
        }
      }
    }));
  };

  // Handle profile image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        setValidationErrors(prev => ({
          ...prev,
          profileImage: 'Faqat JPEG, PNG va WebP formatdagi rasmlar qabul qilinadi'
        }));
        return;
      }

      if (file.size > maxSize) {
        setValidationErrors(prev => ({
          ...prev,
          profileImage: 'Rasm hajmi 5MB dan oshmasligi kerak'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        profileImage: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Clear any previous error
      setValidationErrors(prev => ({
        ...prev,
        profileImage: null
      }));
    }
  };

  // Remove selected image
  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      profileImage: null
    }));
    setImagePreview(userProfile?.profileImage?.url || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors = {};

    if (!formData.displayName?.trim()) {
      errors.displayName = 'Ism kiritish majburiy';
    }

    if (!formData.fullName?.trim()) {
      errors.fullName = 'To\'liq ism kiritish majburiy';
    }

    if (formData.phone && !/^\+998[0-9]{9}$/.test(formData.phone)) {
      errors.phone = 'Telefon raqami noto\'g\'ri formatda! Masalan: +998901234567';
    }

    if (!formData.address?.trim()) {
      errors.address = 'Manzil kiritish majburiy';
    }

    if (formData.telegramUsername && formData.telegramUsername.length < 3) {
      errors.telegramUsername = 'Telegram username kamida 3 ta belgidan iborat bo\'lishi kerak';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await updateProfile(formData);
      setEditMode(false);
      await refreshProfile();
    } catch (err) {
      console.error('Profile update error:', err);
    }
  };

  // Handle password update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    clearError();

    // Validate passwords
    const errors = {};
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Joriy parol kiritish majburiy';
    }
    if (!passwordData.newPassword) {
      errors.newPassword = 'Yangi parol kiritish majburiy';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Yangi parol kamida 8 ta belgidan iborat bo\'lishi kerak';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Parollar mos kelmaydi';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await updatePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setValidationErrors({});
    } catch (err) {
      console.error('Password update error:', err);
    }
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setEditMode(false);
    setFormData({
      displayName: userProfile.displayName || '',
      fullName: userProfile.fullName || '',
      phone: userProfile.phone || '',
      address: userProfile.address || '',
      telegramUsername: userProfile.telegramUsername || '',
      preferences: userProfile.preferences || {}
    });
    setImagePreview(userProfile?.profileImage?.url || null);
    setValidationErrors({});
    clearError();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Noma\'lum';
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get activity type display name
  const getActivityTypeName = (type) => {
    const types = {
      'registration': 'Ro\'yxatdan o\'tish',
      'login': 'Tizimga kirish',
      'logout': 'Tizimdan chiqish',
      'profile_update': 'Profil yangilash',
      'password_change': 'Parol o\'zgartirish',
      'password_reset_request': 'Parol tiklash so\'rovi'
    };
    return types[type] || type;
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Tizimga kirish kerak</h2>
        <p>Profilni ko'rish uchun tizimga kirishingiz kerak.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{
      padding: '20px',
      marginTop: '15px',
      marginBottom: '50px',
      maxWidth: '800px'
    }}>
      <div className="profile-manager glassmorphism-card" style={{
        padding: '30px',
        borderRadius: '15px'
      }}>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <i className="fas fa-user-circle" style={{ marginRight: '15px', color: 'var(--primary-color)' }}></i>
          Foydalanuvchi Profili
        </h1>

        {/* Profile Completion Progress */}
        {!isProfileComplete() && (
          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px',
            border: '1px solid rgba(255, 193, 7, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <i className="fas fa-info-circle" style={{ color: '#ffc107', marginRight: '10px' }}></i>
              <span style={{ fontWeight: 'bold' }}>Profil to'ldirilganligi: {getProfileCompletionPercentage()}%</span>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              height: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#ffc107',
                height: '100%',
                width: `${getProfileCompletionPercentage()}%`,
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            {getMissingProfileFields().length > 0 && (
              <p style={{ fontSize: '0.9rem', marginTop: '10px', opacity: '0.9' }}>
                Quyidagi maydonlarni to'ldiring: {getMissingProfileFields().join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation" style={{
          display: 'flex',
          marginBottom: '30px',
          borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {[
            { key: 'profile', label: 'Profil', icon: 'fas fa-user' },
            { key: 'security', label: 'Xavfsizlik', icon: 'fas fa-shield-alt' },
            { key: 'activity', label: 'Faollik', icon: 'fas fa-history' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="glassmorphism-button"
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === tab.key 
                  ? 'rgba(106, 138, 255, 0.3)' 
                  : 'rgba(106, 138, 255, 0.1)',
                border: activeTab === tab.key 
                  ? '2px solid rgba(106, 138, 255, 0.5)' 
                  : '1px solid rgba(106, 138, 255, 0.2)',
                fontSize: '0.9rem'
              }}
            >
              <i className={tab.icon} style={{ marginRight: '8px' }}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="profile-tab">
            {!editMode ? (
              // Profile Display Mode
              <div className="profile-display">
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: '30px'
                }}>
                  {/* Profile Image */}
                  <div style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginBottom: '20px',
                    border: '3px solid rgba(106, 138, 255, 0.3)'
                  }}>
                    {userProfile?.profileImage?.url ? (
                      <img 
                        src={userProfile.profileImage.url} 
                        alt="Profile"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(106, 138, 255, 0.1)',
                        fontSize: '4rem',
                        color: 'rgba(106, 138, 255, 0.7)'
                      }}>
                        <i className="fas fa-user"></i>
                      </div>
                    )}
                  </div>

                  <h2 style={{ marginBottom: '10px' }}>
                    {userProfile?.displayName || user.email}
                  </h2>
                  <p style={{ opacity: '0.8', fontSize: '1.1rem' }}>
                    {user.email}
                  </p>
                </div>

                {/* Profile Information Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  <div className="info-card glassmorphism-card" style={{ padding: '20px' }}>
                    <h3 style={{ marginBottom: '15px', color: 'var(--primary-color)' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '10px' }}></i>
                      Shaxsiy Ma'lumotlar
                    </h3>
                    <div className="info-item" style={{ marginBottom: '10px' }}>
                      <strong>To'liq ism:</strong> {userProfile?.fullName || 'Kiritilmagan'}
                    </div>
                    <div className="info-item" style={{ marginBottom: '10px' }}>
                      <strong>Telefon:</strong> {userProfile?.phone || 'Kiritilmagan'}
                    </div>
                    <div className="info-item" style={{ marginBottom: '10px' }}>
                      <strong>Manzil:</strong> {userProfile?.address || 'Kiritilmagan'}
                    </div>
                    <div className="info-item">
                      <strong>Telegram:</strong> {userProfile?.telegramUsername || 'Kiritilmagan'}
                    </div>
                  </div>

                  <div className="info-card glassmorphism-card" style={{ padding: '20px' }}>
                    <h3 style={{ marginBottom: '15px', color: 'var(--primary-color)' }}>
                      <i className="fas fa-chart-line" style={{ marginRight: '10px' }}></i>
                      Statistika
                    </h3>
                    <div className="info-item" style={{ marginBottom: '10px' }}>
                      <strong>A'zo bo'lgan sana:</strong> {formatDate(userProfile?.memberSince)}
                    </div>
                    <div className="info-item" style={{ marginBottom: '10px' }}>
                      <strong>Oxirgi kirish:</strong> {formatDate(userProfile?.lastActive)}
                    </div>
                    <div className="info-item" style={{ marginBottom: '10px' }}>
                      <strong>Jami kirishlar:</strong> {userProfile?.loginCount || 0}
                    </div>
                    <div className="info-item">
                      <strong>Jami buyurtmalar:</strong> {userProfile?.totalOrders || 0}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => setEditMode(true)}
                    className="glassmorphism-button"
                    style={{
                      padding: '12px 30px',
                      backgroundColor: 'rgba(106, 138, 255, 0.2)',
                      fontSize: '1.1rem'
                    }}
                  >
                    <i className="fas fa-edit" style={{ marginRight: '10px' }}></i>
                    Profilni Tahrirlash
                  </button>
                </div>
              </div>
            ) : (
              // Profile Edit Mode
              <div className="profile-edit">
                <form onSubmit={handleProfileUpdate}>
                  {/* Profile Image Upload */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '30px'
                  }}>
                    <div style={{
                      position: 'relative',
                      display: 'inline-block',
                      marginBottom: '15px'
                    }}>
                      {imagePreview ? (
                        <div style={{ position: 'relative' }}>
                          <img 
                            src={imagePreview} 
                            alt="Profile Preview"
                            style={{
                              width: '150px',
                              height: '150px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '3px solid rgba(106, 138, 255, 0.3)'
                            }}
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: 'rgba(239, 68, 68, 0.8)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '35px',
                              height: '35px',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            border: '2px dashed rgba(106, 138, 255, 0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            backgroundColor: 'rgba(106, 138, 255, 0.1)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <i className="fas fa-camera" style={{ fontSize: '2.5rem', marginBottom: '10px', opacity: 0.7 }}></i>
                          <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Rasm tanlang</span>
                        </div>
                      )}
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    
                    {validationErrors.profileImage && (
                      <p style={{ color: '#ff5252', fontSize: '0.9rem', margin: '10px 0' }}>
                        {validationErrors.profileImage}
                      </p>
                    )}
                  </div>

                  {/* Form Fields */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px',
                    marginBottom: '30px'
                  }}>
                    <div>
                      <div className="glassmorphism-input">
                        <i className="fas fa-user"></i>
                        <input
                          type="text"
                          name="displayName"
                          placeholder="Ism (ko'rsatiladigan)"
                          value={formData.displayName || ''}
                          onChange={handleInputChange}
                          disabled={loading}
                        />
                      </div>
                      {validationErrors.displayName && (
                        <p className="error-message">{validationErrors.displayName}</p>
                      )}
                    </div>

                    <div>
                      <div className="glassmorphism-input">
                        <i className="fas fa-id-card"></i>
                        <input
                          type="text"
                          name="fullName"
                          placeholder="To'liq ism familiya"
                          value={formData.fullName || ''}
                          onChange={handleInputChange}
                          disabled={loading}
                        />
                      </div>
                      {validationErrors.fullName && (
                        <p className="error-message">{validationErrors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <div className="glassmorphism-input">
                        <i className="fas fa-phone"></i>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Telefon raqami (+998901234567)"
                          value={formData.phone || ''}
                          onChange={handleInputChange}
                          disabled={loading}
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="error-message">{validationErrors.phone}</p>
                      )}
                    </div>

                    <div>
                      <div className="glassmorphism-input">
                        <i className="fab fa-telegram"></i>
                        <input
                          type="text"
                          name="telegramUsername"
                          placeholder="Telegram username"
                          value={formData.telegramUsername || ''}
                          onChange={handleInputChange}
                          disabled={loading}
                        />
                      </div>
                      {validationErrors.telegramUsername && (
                        <p className="error-message">{validationErrors.telegramUsername}</p>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <div className="glassmorphism-input" style={{ alignItems: 'flex-start' }}>
                      <i className="fas fa-map-marker-alt" style={{ marginTop: '8px' }}></i>
                      <textarea
                        name="address"
                        placeholder="Manzilingiz"
                        value={formData.address || ''}
                        onChange={handleInputChange}
                        disabled={loading}
                        rows="3"
                        style={{
                          resize: 'vertical',
                          minHeight: '80px'
                        }}
                      />
                    </div>
                    {validationErrors.address && (
                      <p className="error-message">{validationErrors.address}</p>
                    )}
                  </div>

                  {/* Preferences */}
                  <div className="preferences-section" style={{ marginBottom: '30px' }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
                      <i className="fas fa-cog" style={{ marginRight: '10px' }}></i>
                      Sozlamalar
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '20px'
                    }}>
                      <div className="glassmorphism-card" style={{ padding: '15px' }}>
                        <h4 style={{ marginBottom: '15px' }}>Bildirishnomalar</h4>
                        
                        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.preferences?.notifications?.email || false}
                            onChange={(e) => handlePreferenceChange('notifications', 'email', e.target.checked)}
                            style={{ marginRight: '10px' }}
                          />
                          <i className="fas fa-envelope" style={{ marginRight: '8px', width: '16px' }}></i>
                          Email bildirishnomalar
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.preferences?.notifications?.telegram || false}
                            onChange={(e) => handlePreferenceChange('notifications', 'telegram', e.target.checked)}
                            style={{ marginRight: '10px' }}
                          />
                          <i className="fab fa-telegram" style={{ marginRight: '8px', width: '16px' }}></i>
                          Telegram bildirishnomalar
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.preferences?.notifications?.orderUpdates || false}
                            onChange={(e) => handlePreferenceChange('notifications', 'orderUpdates', e.target.checked)}
                            style={{ marginRight: '10px' }}
                          />
                          <i className="fas fa-shopping-cart" style={{ marginRight: '8px', width: '16px' }}></i>
                          Buyurtma yangiliklari
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.preferences?.notifications?.promotions || false}
                            onChange={(e) => handlePreferenceChange('notifications', 'promotions', e.target.checked)}
                            style={{ marginRight: '10px' }}
                          />
                          <i className="fas fa-tag" style={{ marginRight: '8px', width: '16px' }}></i>
                          Aksiya va chegirmalar
                        </label>
                      </div>

                      <div className="glassmorphism-card" style={{ padding: '15px' }}>
                        <h4 style={{ marginBottom: '15px' }}>Interfeys</h4>
                        
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '8px' }}>Til:</label>
                          <select
                            value={formData.preferences?.language || 'uz'}
                            onChange={(e) => handlePreferenceChange('', 'language', e.target.value)}
                            className="glassmorphism-input"
                            style={{ width: '100%', padding: '10px' }}
                          >
                            <option value="uz">O'zbekcha</option>
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px' }}>Mavzu:</label>
                          <select
                            value={formData.preferences?.theme || 'dark'}
                            onChange={(e) => handlePreferenceChange('', 'theme', e.target.value)}
                            className="glassmorphism-input"
                            style={{ width: '100%', padding: '10px' }}
                          >
                            <option value="dark">Qorong'u</option>
                            <option value="light">Yorug'</option>
                            <option value="auto">Avtomatik</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <p className="error-message" style={{
                      color: '#ff5252',
                      textAlign: 'center',
                      padding: '10px',
                      backgroundColor: 'rgba(255, 82, 82, 0.1)',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      marginBottom: '20px'
                    }}>{error}</p>
                  )}

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      type="submit"
                      className="glassmorphism-button"
                      disabled={loading}
                      style={{
                        padding: '12px 30px',
                        backgroundColor: 'rgba(34, 197, 94, 0.2)',
                        fontSize: '1.1rem'
                      }}
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                          Saqlanmoqda...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save" style={{ marginRight: '10px' }}></i>
                          Saqlash
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="glassmorphism-button"
                      style={{
                        padding: '12px 30px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        fontSize: '1.1rem'
                      }}
                    >
                      <i className="fas fa-times" style={{ marginRight: '10px' }}></i>
                      Bekor qilish
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="security-tab">
            <h2 style={{ marginBottom: '30px', textAlign: 'center' }}>
              <i className="fas fa-shield-alt" style={{ marginRight: '15px', color: 'var(--primary-color)' }}></i>
              Xavfsizlik Sozlamalari
            </h2>

            {/* Password Change Form */}
            <div className="glassmorphism-card" style={{ padding: '30px', marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
                <i className="fas fa-key" style={{ marginRight: '10px' }}></i>
                Parolni O'zgartirish
              </h3>

              <form onSubmit={handlePasswordUpdate}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  <div>
                    <div className="glassmorphism-input password-input">
                      <i className="fas fa-lock"></i>
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        placeholder="Joriy parol"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          currentPassword: e.target.value
                        }))}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPasswords(prev => ({
                          ...prev,
                          current: !prev.current
                        }))}
                        disabled={loading}
                      >
                        <i className={showPasswords.current ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                      </button>
                    </div>
                    {validationErrors.currentPassword && (
                      <p className="error-message">{validationErrors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <div className="glassmorphism-input password-input">
                      <i className="fas fa-key"></i>
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        placeholder="Yangi parol (kamida 8 ta belgi)"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          newPassword: e.target.value
                        }))}
                        disabled={loading}
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPasswords(prev => ({
                          ...prev,
                          new: !prev.new
                        }))}
                        disabled={loading}
                      >
                        <i className={showPasswords.new ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                      </button>
                    </div>
                    {validationErrors.newPassword && (
                      <p className="error-message">{validationErrors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <div className="glassmorphism-input password-input">
                      <i className="fas fa-check"></i>
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        placeholder="Yangi parolni tasdiqlang"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          confirmPassword: e.target.value
                        }))}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPasswords(prev => ({
                          ...prev,
                          confirm: !prev.confirm
                        }))}
                        disabled={loading}
                      >
                        <i className={showPasswords.confirm ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                      </button>
                    </div>
                    {validationErrors.confirmPassword && (
                      <p className="error-message">{validationErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <p className="error-message" style={{
                    color: '#ff5252',
                    textAlign: 'center',
                    padding: '10px',
                    backgroundColor: 'rgba(255, 82, 82, 0.1)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    marginBottom: '20px'
                  }}>{error}</p>
                )}

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="submit"
                    className="glassmorphism-button"
                    disabled={loading}
                    style={{
                      padding: '12px 30px',
                      backgroundColor: 'rgba(106, 138, 255, 0.2)',
                      fontSize: '1.1rem'
                    }}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                        Yangilanmoqda...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key" style={{ marginRight: '10px' }}></i>
                        Parolni O'zgartirish
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Security Information */}
            <div className="glassmorphism-card" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--primary-color)' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '10px' }}></i>
                Xavfsizlik Ma'lumotlari
              </h3>
              
              <div style={{ display: 'grid', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px' }}>
                  <i className={user.emailVerified ? "fas fa-check-circle" : "fas fa-exclamation-triangle"} 
                     style={{ 
                       color: user.emailVerified ? '#22c55e' : '#f59e0b', 
                       marginRight: '10px', 
                       fontSize: '1.2rem' 
                     }}></i>
                  <div>
                    <strong>Email tasdiqlash:</strong> {user.emailVerified ? 'Tasdiqlangan' : 'Tasdiqlanmagan'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: 'rgba(106, 138, 255, 0.1)', borderRadius: '8px' }}>
                  <i className="fas fa-calendar-alt" style={{ color: '#6a8aff', marginRight: '10px', fontSize: '1.2rem' }}></i>
                  <div>
                    <strong>Hisob yaratilgan:</strong> {formatDate(userProfile?.memberSince)}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: 'rgba(106, 138, 255, 0.1)', borderRadius: '8px' }}>
                  <i className="fas fa-sign-in-alt" style={{ color: '#6a8aff', marginRight: '10px', fontSize: '1.2rem' }}></i>
                  <div>
                    <strong>Oxirgi kirish:</strong> {formatDate(userProfile?.lastActive)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="activity-tab">
            <h2 style={{ marginBottom: '30px', textAlign: 'center' }}>
              <i className="fas fa-history" style={{ marginRight: '15px', color: 'var(--primary-color)' }}></i>
              Faollik Tarixi
            </h2>

            {/* Login Statistics */}
            {loginStats && (
              <div className="glassmorphism-card" style={{ padding: '20px', marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
                  <i className="fas fa-chart-bar" style={{ marginRight: '10px' }}></i>
                  Kirish Statistikasi
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px'
                }}>
                  <div style={{ textAlign: 'center', padding: '15px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
                      {loginStats.totalLogins}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>Jami kirishlar</div>
                  </div>
                  
                  <div style={{ textAlign: 'center', padding: '15px', backgroundColor: 'rgba(106, 138, 255, 0.1)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#6a8aff' }}>
                      {formatDate(loginStats.lastLoginAt)}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>Oxirgi kirish</div>
                  </div>
                  
                  <div style={{ textAlign: 'center', padding: '15px', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffc107' }}>
                      {formatDate(loginStats.memberSince)}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>A'zo bo'lgan sana</div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity History */}
            <div className="glassmorphism-card" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
                <i className="fas fa-list" style={{ marginRight: '10px' }}></i>
                So'nggi Faolliklar
              </h3>
              
              {activityHistory.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {activityHistory.map((activity, index) => (
                    <div key={activity.id || index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px',
                      borderLeft: '4px solid var(--primary-color)'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(106, 138, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '15px'
                      }}>
                        <i className={
                          activity.activityType === 'login' ? 'fas fa-sign-in-alt' :
                          activity.activityType === 'logout' ? 'fas fa-sign-out-alt' :
                          activity.activityType === 'registration' ? 'fas fa-user-plus' :
                          activity.activityType === 'profile_update' ? 'fas fa-user-edit' :
                          activity.activityType === 'password_change' ? 'fas fa-key' :
                          'fas fa-circle'
                        } style={{ color: '#6a8aff' }}></i>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          {getActivityTypeName(activity.activityType)}
                        </div>
                        <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                          {formatDate(activity.timestamp)}
                        </div>
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div style={{ fontSize: '0.8rem', opacity: '0.6', marginTop: '5px' }}>
                            {activity.metadata.method && `Usul: ${activity.metadata.method}`}
                            {activity.metadata.hasProfileImage && ' • Profil rasmi yuklandi'}
                            {activity.metadata.hasNewImage && ' • Yangi rasm yuklandi'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', opacity: '0.7' }}>
                  <i className="fas fa-history" style={{ fontSize: '3rem', marginBottom: '15px' }}></i>
                  <p>Hozircha faollik tarixi yo'q</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileManager;