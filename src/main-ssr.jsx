// SSR Hydration Entry Point
// Server'dan kelgan HTML'ni interactive qiladi

import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

// Server'dan kelgan initial data
const initialData = window.__INITIAL_DATA__ || {};
const initialPath = window.__INITIAL_PATH__ || '/';

// Performance monitoring
const startTime = performance.now();

// Hydration - server HTML'ni interactive qilish
const container = document.getElementById('root');

if (container.hasChildNodes()) {
  // Server-rendered content mavjud - hydrate qilish
  hydrateRoot(
    container,
    <BrowserRouter>
      <App initialData={initialData} />
    </BrowserRouter>
  );
  
  // Hydration performance tracking
  const hydrationTime = performance.now() - startTime;
  console.log(`Hydration completed in ${hydrationTime.toFixed(2)}ms`);
  
  // Analytics ga yuborish
  if (window.gtag) {
    window.gtag('event', 'hydration_time', {
      value: Math.round(hydrationTime),
      custom_parameter: initialPath
    });
  }
} else {
  // Server-rendered content yo'q - client-side rendering
  console.warn('No server-rendered content found, falling back to CSR');
  
  const { createRoot } = require('react-dom/client');
  const root = createRoot(container);
  
  root.render(
    <BrowserRouter>
      <App initialData={initialData} />
    </BrowserRouter>
  );
}

// Service Worker registration
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New Service Worker available
            console.log('New Service Worker available');
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

// Performance monitoring
if (import.meta.env.DEV) {
  // Development'da performance metrics
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    
    console.log('Performance Metrics:', {
      'Page Load Time': `${loadTime.toFixed(2)}ms`,
      'DOM Content Loaded': `${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`,
      'First Paint': navigation.loadEventStart - navigation.fetchStart,
      'Hydration Time': `${hydrationTime}ms`
    });
  });
}

// Error boundary for hydration errors
window.addEventListener('error', (event) => {
  if (event.error && event.error.message.includes('hydrat')) {
    console.error('Hydration error detected:', event.error);
    
    // Analytics ga yuborish
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: 'Hydration error: ' + event.error.message,
        fatal: false
      });
    }
  }
});

// Cleanup initial data to free memory
setTimeout(() => {
  delete window.__INITIAL_DATA__;
  delete window.__INITIAL_PATH__;
}, 5000);