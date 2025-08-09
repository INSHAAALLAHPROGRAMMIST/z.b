// Google Analytics 4 Component
// Real-time traffic va user behavior tracking

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Google Analytics script yuklab olish
export const loadGoogleAnalytics = () => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

  // Script allaqachon yuklangan bo'lsa, qayta yuklamaslik
  if (window.gtag) return;

  // Google Analytics script qo'shish
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);

  // gtag funksiyasini yaratish
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  // Google Analytics konfiguratsiya
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: true
  });
};

// Sahifa o'zgarishini tracking qilish
export const trackPageView = (path, title) => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title,
    page_location: window.location.href
  });
};

// Custom event tracking
export const trackEvent = (eventName, parameters = {}) => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', eventName, {
    event_category: parameters.category || 'engagement',
    event_label: parameters.label,
    value: parameters.value,
    ...parameters
  });
};

// E-commerce tracking
export const trackPurchase = (transactionId, items, value) => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    value: value,
    currency: 'UZS',
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      quantity: item.quantity,
      price: item.price
    }))
  });
};

// Search tracking
export const trackSearch = (searchTerm, resultsCount) => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
    category: 'search'
  });
};

// Book view tracking
export const trackBookView = (bookId, bookTitle, author) => {
  trackEvent('view_item', {
    item_id: bookId,
    item_name: bookTitle,
    item_category: 'book',
    author: author,
    category: 'book_interaction'
  });
};

// Main component
const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Google Analytics yuklab olish
    loadGoogleAnalytics();
  }, []);

  useEffect(() => {
    // Har sahifa o'zgarishida tracking
    if (GA_MEASUREMENT_ID) {
      trackPageView(location.pathname + location.search, document.title);
    }
  }, [location]);

  return null; // Bu component hech narsa render qilmaydi
};

export default GoogleAnalytics;