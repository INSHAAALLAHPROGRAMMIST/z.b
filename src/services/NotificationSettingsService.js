/**
 * NotificationSettingsService - Service for managing notification settings
 * Handles loading and saving notification preferences
 */

import { db, COLLECTIONS } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';

class NotificationSettingsService {
  constructor() {
    this.settingsDocId = 'notification_settings';
  }

  /**
   * Get notification settings
   * @returns {Promise<Object>} Notification settings
   */
  async getSettings() {
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, this.settingsDocId);
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        return {
          id: settingsSnap.id,
          ...settingsSnap.data()
        };
      } else {
        // Return default settings
        return this.getDefaultSettings();
      }
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Save notification settings
   * @param {Object} settings - Settings to save
   * @returns {Promise<Object>} Saved settings
   */
  async saveSettings(settings) {
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, this.settingsDocId);
      const settingsData = {
        ...settings,
        updatedAt: new Date()
      };

      await setDoc(settingsRef, settingsData, { merge: true });
      
      return {
        id: this.settingsDocId,
        ...settingsData
      };
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw new Error(`Bildirishnoma sozlamalarini saqlashda xato: ${error.message}`);
    }
  }

  /**
   * Update specific notification setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<Object>} Updated settings
   */
  async updateSetting(key, value) {
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, this.settingsDocId);
      const updateData = {
        [key]: value,
        updatedAt: new Date()
      };

      await updateDoc(settingsRef, updateData);
      
      // Return updated settings
      return await this.getSettings();
    } catch (error) {
      console.error('Error updating notification setting:', error);
      throw new Error(`Bildirishnoma sozlamasini yangilashda xato: ${error.message}`);
    }
  }

  /**
   * Get default notification settings
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    return {
      enableTelegram: true,
      notifyOnNewOrder: true,
      notifyOnStatusChange: true,
      notifyOnLowStock: true,
      telegramBotToken: '',
      telegramChatId: '',
      lowStockThreshold: 5,
      notificationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Add notification to history
   * @param {Object} notification - Notification entry
   * @returns {Promise<void>}
   */
  async addToHistory(notification) {
    try {
      const settings = await this.getSettings();
      const history = settings.notificationHistory || [];
      
      // Add new notification to beginning of array
      history.unshift({
        id: Date.now().toString(),
        timestamp: new Date(),
        ...notification
      });

      // Keep only last 100 notifications
      const trimmedHistory = history.slice(0, 100);

      await this.updateSetting('notificationHistory', trimmedHistory);
    } catch (error) {
      console.error('Error adding notification to history:', error);
      // Don't throw error - history is not critical
    }
  }

  /**
   * Get notification history
   * @param {number} limit - Number of entries to return
   * @returns {Promise<Array>} Notification history
   */
  async getHistory(limit = 50) {
    try {
      const settings = await this.getSettings();
      const history = settings.notificationHistory || [];
      
      return history.slice(0, limit);
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Clear notification history
   * @returns {Promise<void>}
   */
  async clearHistory() {
    try {
      await this.updateSetting('notificationHistory', []);
    } catch (error) {
      console.error('Error clearing notification history:', error);
      throw new Error(`Bildirishnoma tarixini tozalashda xato: ${error.message}`);
    }
  }

  /**
   * Test notification settings
   * @returns {Promise<Object>} Test result
   */
  async testSettings() {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enableTelegram) {
        return {
          success: false,
          error: 'Telegram bildirishnomalari o\'chirilgan'
        };
      }

      if (!settings.telegramBotToken || !settings.telegramChatId) {
        return {
          success: false,
          error: 'Telegram bot token yoki chat ID kiritilmagan'
        };
      }

      // Import TelegramService dynamically to avoid circular dependencies
      const TelegramService = (await import('./TelegramService.js')).default;
      
      // Test connection
      const testResult = await TelegramService.testConnection();
      
      if (testResult.success) {
        // Add test to history
        await this.addToHistory({
          type: 'connection_test',
          success: true,
          message: 'Telegram ulanish testi muvaffaqiyatli'
        });
      }

      return testResult;
    } catch (error) {
      console.error('Error testing notification settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get notification statistics
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>} Notification statistics
   */
  async getStatistics(startDate, endDate) {
    try {
      const history = await this.getHistory();
      
      // Filter by date range if provided
      let filteredHistory = history;
      if (startDate && endDate) {
        filteredHistory = history.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          return entryDate >= startDate && entryDate <= endDate;
        });
      }

      // Calculate statistics
      const stats = {
        total: filteredHistory.length,
        successful: filteredHistory.filter(entry => entry.success).length,
        failed: filteredHistory.filter(entry => !entry.success).length,
        byType: {},
        period: {
          start: startDate,
          end: endDate
        }
      };

      // Group by type
      filteredHistory.forEach(entry => {
        const type = entry.type || 'unknown';
        if (!stats.byType[type]) {
          stats.byType[type] = { total: 0, successful: 0, failed: 0 };
        }
        stats.byType[type].total++;
        if (entry.success) {
          stats.byType[type].successful++;
        } else {
          stats.byType[type].failed++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification statistics:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        byType: {},
        error: error.message
      };
    }
  }
}

// Create and export singleton instance
const notificationSettingsService = new NotificationSettingsService();
export default notificationSettingsService;