// Analytics hook - easy tracking functions
// Barcha componentlarda ishlatish uchun

import { trackEvent, trackSearch, trackBookView, trackPurchase } from '../components/Analytics/GoogleAnalytics';

export const useAnalytics = () => {
  // Button click tracking
  const trackButtonClick = (buttonName, location) => {
    trackEvent('button_click', {
      button_name: buttonName,
      page_location: location,
      category: 'ui_interaction'
    });
  };

  // Form submission tracking
  const trackFormSubmit = (formName, success = true) => {
    trackEvent('form_submit', {
      form_name: formName,
      success: success,
      category: 'form_interaction'
    });
  };

  // Download tracking
  const trackDownload = (fileName, fileType) => {
    trackEvent('file_download', {
      file_name: fileName,
      file_type: fileType,
      category: 'download'
    });
  };

  // Error tracking
  const trackError = (errorType, errorMessage, page) => {
    trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      page: page,
      category: 'error'
    });
  };

  // User engagement tracking
  const trackEngagement = (action, details) => {
    trackEvent('engagement', {
      action: action,
      details: details,
      category: 'user_engagement'
    });
  };

  // Scroll depth tracking
  const trackScrollDepth = (depth) => {
    trackEvent('scroll_depth', {
      depth: depth,
      category: 'engagement'
    });
  };

  // Time on page tracking
  const trackTimeOnPage = (timeSpent, pageName) => {
    trackEvent('time_on_page', {
      time_spent: timeSpent,
      page_name: pageName,
      category: 'engagement'
    });
  };

  return {
    trackButtonClick,
    trackFormSubmit,
    trackDownload,
    trackError,
    trackEngagement,
    trackScrollDepth,
    trackTimeOnPage,
    trackSearch,
    trackBookView,
    trackPurchase
  };
};