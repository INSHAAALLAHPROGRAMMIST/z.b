// Enhanced Authentication Form Component
// Provides comprehensive registration and login with profile completion

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useEnhancedAuth from '../hooks/useEnhancedAuth';

const EnhancedAuthForm = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    fullName: '',
    phone: '',
    address: '',
    telegramUsername: '',
    profileImage: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  
  const {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    clearError
  } = useEnhancedAuth();

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
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email kiritish majburiy';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email format noto\'g\'ri';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Parol kiritish majburiy';
    } else if (!isLogin && formData.password.length < 8) {
      errors.password = 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak';
    }

    if (!isLogin) {
      // Registration-specific validations
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Parol tasdiqlash majburiy';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Parollar mos kelmaydi';
      }

      if (!formData.displayName.trim()) {
        errors.displayName = 'Ism kiritish majburiy';
      }

      if (!formData.fullName.trim()) {
        errors.fullName = 'To\'liq ism kiritish majburiy';
      }

      if (formData.phone && !/^\+998[0-9]{9}$/.test(formData.phone)) {
        errors.phone = 'Telefon raqami noto\'g\'ri formatda! Masalan: +998901234567';
      }

      if (!formData.address.trim()) {
        errors.address = 'Manzil kiritish majburiy';
      }

      if (formData.telegramUsername && formData.telegramUsername.length < 3) {
        errors.telegramUsername = 'Telegram username kamida 3 ta belgidan iborat bo\'lishi kerak';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
      } else {
        const userData = {
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          telegramUsername: formData.telegramUsername,
          profileImage: formData.profileImage,
          preferences: {
            language: 'uz',
            theme: 'dark',
            notifications: {
              email: true,
              telegram: !!formData.telegramUsername,
              orderUpdates: true,
              promotions: false
            }
          }
        };

        await signUp(userData);
      }

      // Success callback
      if (onSuccess) {
        onSuccess();
      }

      // Navigate to home page
      setTimeout(() => {
        navigate('/');
        window.location.reload(); // Refresh to update header state
      }, 500);

    } catch (err) {
      console.error('Authentication error:', err);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!formData.email) {
      setValidationErrors(prev => ({
        ...prev,
        email: 'Parol tiklash uchun email kiriting'
      }));
      return;
    }

    try {
      await resetPassword(formData.email);
      setShowForgotPassword(false);
    } catch (err) {
      console.error('Password reset error:', err);
    }
  };

  // Handle logout (if user is already logged in)
  const handleLogout = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Reset form when switching between login/register
  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      fullName: '',
      phone: '',
      address: '',
      telegramUsername: '',
      profileImage: null
    });
    setImagePreview(null);
    setValidationErrors({});
    clearError();
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // If user is already logged in
  if (user) {
    return (
      <div className="container" style={{
        padding: '20px',
        marginTop: '15px',
        marginBottom: '50px',
        maxWidth: '500px'
      }}>
        <div className="auth-container glassmorphism-card" style={{
          padding: '30px 20px',
          borderRadius: '15px',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            marginBottom: '20px'
          }}>Siz allaqachon tizimga kirgansiz</h2>

          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            {imagePreview || user.photoURL ? (
              <img 
                src={imagePreview || user.photoURL} 
                alt="Profile"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginBottom: '10px'
                }}
              />
            ) : (
              <i className="fas fa-user-circle" style={{
                fontSize: '3rem',
                color: '#22c55e',
                marginBottom: '10px'
              }}></i>
            )}
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              {user.displayName || user.email}
            </p>
            <p style={{ fontSize: '0.9rem', opacity: '0.8' }}>
              {user.email}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button
              onClick={() => navigate('/')}
              className="glassmorphism-button"
              style={{
                padding: '12px',
                backgroundColor: 'rgba(106, 138, 255, 0.2)',
                fontSize: '1rem'
              }}
            >
              <i className="fas fa-home"></i> Bosh sahifaga o'tish
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="glassmorphism-button"
              style={{
                padding: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                fontSize: '1rem'
              }}
            >
              <i className="fas fa-user-edit"></i> Profilni tahrirlash
            </button>

            <button
              onClick={handleLogout}
              className="glassmorphism-button"
              style={{
                padding: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                fontSize: '1rem'
              }}
            >
              <i className="fas fa-sign-out-alt"></i> Boshqa hisob bilan kirish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{
      padding: '20px',
      marginTop: '15px',
      marginBottom: '50px',
      maxWidth: '600px'
    }}>
      <div className="auth-container glassmorphism-card" style={{
        padding: '30px 20px',
        borderRadius: '15px'
      }}>
        <h2 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2rem)',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          {isLogin ? 'Tizimga Kirish' : "Ro'yxatdan O'tish"}
        </h2>

        <form onSubmit={handleSubmit} className="auth-form" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          {/* Profile Image Upload - Only for registration */}
          {!isLogin && (
            <div className="profile-image-section" style={{
              textAlign: 'center',
              marginBottom: '10px'
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
                        width: '120px',
                        height: '120px',
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
                        top: '5px',
                        right: '5px',
                        background: 'rgba(239, 68, 68, 0.8)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
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
                      width: '120px',
                      height: '120px',
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
                    <i className="fas fa-camera" style={{ fontSize: '2rem', marginBottom: '5px', opacity: 0.7 }}></i>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Rasm tanlang</span>
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
              
              <p style={{ fontSize: '0.8rem', opacity: '0.7', margin: '5px 0' }}>
                Profil rasmi (ixtiyoriy)
              </p>
              
              {validationErrors.profileImage && (
                <p style={{ color: '#ff5252', fontSize: '0.8rem', margin: '5px 0' }}>
                  {validationErrors.profileImage}
                </p>
              )}
            </div>
          )}

          {/* Registration Fields */}
          {!isLogin && (
            <>
              <div className="glassmorphism-input">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  name="displayName"
                  placeholder="Ism (ko'rsatiladigan)"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.displayName && (
                <p className="error-message">{validationErrors.displayName}</p>
              )}

              <div className="glassmorphism-input">
                <i className="fas fa-id-card"></i>
                <input
                  type="text"
                  name="fullName"
                  placeholder="To'liq ism familiya"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.fullName && (
                <p className="error-message">{validationErrors.fullName}</p>
              )}

              <div className="glassmorphism-input">
                <i className="fas fa-phone"></i>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Telefon raqami (+998901234567)"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.phone && (
                <p className="error-message">{validationErrors.phone}</p>
              )}

              <div className="glassmorphism-input">
                <i className="fab fa-telegram"></i>
                <input
                  type="text"
                  name="telegramUsername"
                  placeholder="Telegram username (ixtiyoriy)"
                  value={formData.telegramUsername}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.telegramUsername && (
                <p className="error-message">{validationErrors.telegramUsername}</p>
              )}

              <div className="glassmorphism-input" style={{ alignItems: 'flex-start' }}>
                <i className="fas fa-map-marker-alt" style={{ marginTop: '8px' }}></i>
                <textarea
                  name="address"
                  placeholder="Manzilingiz (kitob yetkazib berish uchun)"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={loading}
                  rows="3"
                  style={{
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                />
              </div>
              {validationErrors.address && (
                <p className="error-message">{validationErrors.address}</p>
              )}
            </>
          )}

          {/* Email Field */}
          <div className="glassmorphism-input">
            <i className="fas fa-envelope"></i>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>
          {validationErrors.email && (
            <p className="error-message">{validationErrors.email}</p>
          )}

          {/* Password Field */}
          <div className="glassmorphism-input password-input">
            <i className="fas fa-lock"></i>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder={isLogin ? "Parol" : "Parol (kamida 8 ta belgi)"}
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={loading}
              minLength={isLogin ? undefined : 8}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
            </button>
          </div>
          {validationErrors.password && (
            <p className="error-message">{validationErrors.password}</p>
          )}

          {/* Confirm Password Field - Only for registration */}
          {!isLogin && (
            <>
              <div className="glassmorphism-input password-input">
                <i className="fas fa-lock"></i>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Parolni tasdiqlang"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="error-message">{validationErrors.confirmPassword}</p>
              )}
            </>
          )}

          {/* Error Display */}
          {error && (
            <p className="error-message" style={{
              color: '#ff5252',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: 'rgba(255, 82, 82, 0.1)',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}>{error}</p>
          )}

          {/* Forgot Password Modal */}
          {showForgotPassword && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="glassmorphism-card" style={{
                maxWidth: '400px',
                width: '90%',
                padding: '30px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>
                  <i className="fas fa-key" style={{ marginRight: '10px', color: '#6A8AFF' }}></i>
                  Parolni Tiklash
                </h3>

                <p style={{
                  marginBottom: '20px',
                  lineHeight: '1.5',
                  opacity: '0.9'
                }}>
                  Email manzilingizga parol tiklash xabari yuboriladi.
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    onClick={handleForgotPassword}
                    className="glassmorphism-button"
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'rgba(106, 138, 255, 0.2)'
                    }}
                  >
                    <i className="fas fa-paper-plane"></i> Yuborish
                  </button>
                  
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="glassmorphism-button"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    <i className="fas fa-times"></i> Bekor qilish
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="glassmorphism-button"
            disabled={loading}
            style={{
              padding: '12px',
              width: '100%',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              backgroundColor: loading ? 'rgba(106, 138, 255, 0.05)' : 'rgba(106, 138, 255, 0.2)'
            }}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Yuklanmoqda...
              </>
            ) : (
              <>
                <i className={isLogin ? "fas fa-sign-in-alt" : "fas fa-user-plus"}></i>
                {isLogin ? 'Kirish' : "Ro'yxatdan O'tish"}
              </>
            )}
          </button>

          {/* Forgot Password Button - Only for login */}
          {isLogin && (
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="glassmorphism-button"
              style={{
                padding: '8px 12px',
                width: '100%',
                fontSize: '0.9rem',
                marginTop: '10px',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)'
              }}
            >
              <i className="fas fa-question-circle"></i> Parolni Unutdingizmi?
            </button>
          )}
        </form>

        {/* Toggle between login and register */}
        <p className="toggle-auth" style={{
          textAlign: 'center',
          marginTop: '25px',
          fontSize: '0.95rem'
        }}>
          {isLogin ? "Hisobingiz yo'qmi?" : "Hisobingiz bormi?"}{' '}
          <span
            onClick={switchMode}
            style={{
              color: 'var(--primary-color)',
              fontWeight: 'bold',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? "Ro'yxatdan o'tish" : 'Kirish'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default EnhancedAuthForm;