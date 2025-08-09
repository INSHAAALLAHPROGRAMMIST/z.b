// PWA hooks - service worker, offline status, install

import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Check if PWA is installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = window.navigator.standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkInstalled();

    // Register service worker
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          setRegistration(reg);
          console.log('Service Worker registered');

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          });

        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    registerSW();

    // Online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateApp = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return {
    isOnline,
    isInstalled,
    updateAvailable,
    updateApp,
    registration
  };
};

export const useOfflineStorage = () => {
  const [offlineData, setOfflineData] = useState({
    cart: [],
    searches: [],
    bookmarks: []
  });

  useEffect(() => {
    // Load offline data from localStorage
    const loadOfflineData = () => {
      try {
        const stored = localStorage.getItem('zamon-books-offline');
        if (stored) {
          setOfflineData(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load offline data:', error);
      }
    };

    loadOfflineData();
  }, []);

  const saveOfflineData = (data) => {
    try {
      const newData = { ...offlineData, ...data };
      setOfflineData(newData);
      localStorage.setItem('zamon-books-offline', JSON.stringify(newData));
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  };

  const addToOfflineCart = (item) => {
    const newCart = [...offlineData.cart, item];
    saveOfflineData({ cart: newCart });
  };

  const addOfflineSearch = (query) => {
    const newSearches = [...offlineData.searches, {
      query,
      timestamp: Date.now()
    }];
    saveOfflineData({ searches: newSearches });
  };

  const syncOfflineData = async () => {
    // Sync with server when online
    if (navigator.onLine && offlineData.cart.length > 0) {
      try {
        // Sync cart data
        console.log('Syncing offline cart data...');
        // Implementation depends on your API
        
        // Clear offline data after successful sync
        saveOfflineData({ cart: [] });
      } catch (error) {
        console.error('Failed to sync offline data:', error);
      }
    }
  };

  return {
    offlineData,
    addToOfflineCart,
    addOfflineSearch,
    syncOfflineData
  };
};