// NotificationPreferences Component - User notification settings
// Requirements: 2.1, 2.2, 2.3, 2.4

import React, { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import notificationService from '../services/NotificationService';
import './NotificationPreferences.css';

const NotificationPreferences = ({ onClose = null }) => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setError('Foydalanuvchi tizimga kirmagan');
        setLoading(false);
        return;
      }

      try {
        const userPrefs = await notificationService.getUserPreferences(userId);
        setPreferences(userPrefs);
        setError(null);
      } catch (err) {
        console.error('Error loading preferences:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Handle preference change
  const handlePreferenceChange = (category, key, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  // Handle category toggle (enable/disable all in category)
  const handleCategoryToggle = (category, enabled) => {
    setPreferences(prev => {
      const categoryPrefs = { ...prev[category] };
      Object.keys(categoryPrefs).forEach(key => {
        categoryPrefs[key] = enabled;
      });
      
      return {
        ...prev,
        [category]: categoryPrefs
      };
    });
  };

  // Save preferences
  const handleSave = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError('Foydalanuvchi tizimga kirmagan');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      await notificationService.updateUserPreferences(userId, preferences);
      setSuccessMessage('Sozlamalar muvaffaqiyatli saqlandi');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    if (confirm('Sozlamalarni standart holatga qaytarishni xohlaysizmi?')) {
      const defaultPrefs = notificationService.getDefaultPreferences();
      setPreferences(defaultPrefs);
    }
  };

  if (loading) {
    return (
      <div className="notification-preferences">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Sozlamalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="notification-preferences">
        <div className="error-state">
          <i className="fas fa-exclamation-circle"></i>
          <p>Sozlamalarni yuklashda xato yuz berdi</p>
          {error && <p className="error-details">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="notification-preferences">
      <div className="preferences-header">
        <h2>
          <i className="fas fa-cog"></i>
          Bildirishnoma Sozlamalari
        </h2>
        
        {onClose && (
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <i className="fas fa-check-circle"></i>
          {successMessage}
        </div>
      )}

      <div className="preferences-content">
        {/* Order Notifications */}
        <div className="preference-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-shopping-bag"></i>
              Buyurtma Bildirish nomalari
            </h3>
            <div className="section-toggle">
              <label className="toggle-all">
                <input
                  type="checkbox"
                  checked={Object.values(preferences.orders).every(v => v)}
                  onChange={(e) => handleCategoryToggle('orders', e.target.checked)}
                />
                <span>Barchasini yoqish/o'chirish</span>
              </label>
            </div>
          </div>
          
          <div className="preference-items">
            <div className="preference-item">
              <div className="item-info">
                <h4>Buyurtma yaratildi</h4>
                <p>Yangi buyurtma yaratilganda bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.orders.created}
                  onChange={(e) => handlePreferenceChange('orders', 'created', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Buyurtma tasdiqlandi</h4>
                <p>Buyurtma tasdiqlanganda bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.orders.confirmed}
                  onChange={(e) => handlePreferenceChange('orders', 'confirmed', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Buyurtma jo'natildi</h4>
                <p>Buyurtma jo'natilganda bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.orders.shipped}
                  onChange={(e) => handlePreferenceChange('orders', 'shipped', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Buyurtma yetkazildi</h4>
                <p>Buyurtma yetkazilganda bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.orders.delivered}
                  onChange={(e) => handlePreferenceChange('orders', 'delivered', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Buyurtma bekor qilindi</h4>
                <p>Buyurtma bekor qilinganda bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.orders.cancelled}
                  onChange={(e) => handlePreferenceChange('orders', 'cancelled', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Wishlist Notifications */}
        <div className="preference-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-heart"></i>
              Sevimlilar Bildirish nomalari
            </h3>
            <div className="section-toggle">
              <label className="toggle-all">
                <input
                  type="checkbox"
                  checked={Object.values(preferences.wishlist).every(v => v)}
                  onChange={(e) => handleCategoryToggle('wishlist', e.target.checked)}
                />
                <span>Barchasini yoqish/o'chirish</span>
              </label>
            </div>
          </div>
          
          <div className="preference-items">
            <div className="preference-item">
              <div className="item-info">
                <h4>Kitob mavjud bo'ldi</h4>
                <p>Sevimlilar ro'yxatidagi kitob mavjud bo'lganda bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.wishlist.available}
                  onChange={(e) => handlePreferenceChange('wishlist', 'available', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Narx tushdi</h4>
                <p>Sevimlilar ro'yxatidagi kitob narxi tushganda bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.wishlist.priceDrops}
                  onChange={(e) => handlePreferenceChange('wishlist', 'priceDrops', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Promotion Notifications */}
        <div className="preference-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-tag"></i>
              Aksiya va Takliflar
            </h3>
            <div className="section-toggle">
              <label className="toggle-all">
                <input
                  type="checkbox"
                  checked={Object.values(preferences.promotions).every(v => v)}
                  onChange={(e) => handleCategoryToggle('promotions', e.target.checked)}
                />
                <span>Barchasini yoqish/o'chirish</span>
              </label>
            </div>
          </div>
          
          <div className="preference-items">
            <div className="preference-item">
              <div className="item-info">
                <h4>Yangi kitoblar</h4>
                <p>Yangi kitoblar qo'shilganda bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.promotions.newBooks}
                  onChange={(e) => handlePreferenceChange('promotions', 'newBooks', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Chegirmalar</h4>
                <p>Maxsus chegirmalar haqida bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.promotions.discounts}
                  onChange={(e) => handlePreferenceChange('promotions', 'discounts', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Tadbirlar</h4>
                <p>Maxsus tadbirlar haqida bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.promotions.events}
                  onChange={(e) => handlePreferenceChange('promotions', 'events', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* System Notifications */}
        <div className="preference-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-cog"></i>
              Tizim Bildirish nomalari
            </h3>
            <div className="section-toggle">
              <label className="toggle-all">
                <input
                  type="checkbox"
                  checked={Object.values(preferences.system).every(v => v)}
                  onChange={(e) => handleCategoryToggle('system', e.target.checked)}
                />
                <span>Barchasini yoqish/o'chirish</span>
              </label>
            </div>
          </div>
          
          <div className="preference-items">
            <div className="preference-item">
              <div className="item-info">
                <h4>Texnik ishlar</h4>
                <p>Tizimda texnik ishlar olib borilganda bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.system.maintenance}
                  onChange={(e) => handlePreferenceChange('system', 'maintenance', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Yangilanishlar</h4>
                <p>Tizim yangilanishlari haqida bildirishnoma olish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.system.updates}
                  onChange={(e) => handlePreferenceChange('system', 'updates', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="preference-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-paper-plane"></i>
              Bildirishnoma Kanallari
            </h3>
          </div>
          
          <div className="preference-items">
            <div className="preference-item">
              <div className="item-info">
                <h4>Saytda bildirishnoma</h4>
                <p>Sayt ichida bildirishnomalarni ko'rsatish</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.channels.inApp}
                  onChange={(e) => handlePreferenceChange('channels', 'inApp', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Email bildirishnoma</h4>
                <p>Email orqali bildirishnoma olish (kelgusida)</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.channels.email}
                  onChange={(e) => handlePreferenceChange('channels', 'email', e.target.checked)}
                  disabled
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="item-info">
                <h4>Telegram bildirishnoma</h4>
                <p>Telegram orqali bildirishnoma olish (kelgusida)</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={preferences.channels.telegram}
                  onChange={(e) => handlePreferenceChange('channels', 'telegram', e.target.checked)}
                  disabled
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="preferences-actions">
        <button
          onClick={handleReset}
          className="reset-btn"
          disabled={saving}
        >
          <i className="fas fa-undo"></i>
          Standart holatga qaytarish
        </button>
        
        <button
          onClick={handleSave}
          className="save-btn"
          disabled={saving}
        >
          {saving ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Saqlanmoqda...
            </>
          ) : (
            <>
              <i className="fas fa-save"></i>
              Saqlash
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferences;