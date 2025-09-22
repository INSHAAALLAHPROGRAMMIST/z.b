// Build optimization utilities
// Bu faylda build warnings va errorlarni tuzatish uchun utility'lar

// Console warnings'ni production'da o'chirish
export const safeConsole = {
  log: (...args) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (import.meta.env.DEV) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    // Error'lar har doim ko'rsatiladi
    console.error(...args);
  }
};

// Unused imports'ni tekshirish
export const checkUnusedImports = () => {
  if (import.meta.env.DEV) {
    // Development'da unused imports haqida ogohlantirish
    console.warn('Check for unused imports in production build');
  }
};

// Environment variables validation
export const validateEnvVars = () => {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_APP_ID'
  ];

  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    return false;
  }
  
  return true;
};

// Build performance monitoring
export const buildPerformance = {
  start: (label) => {
    if (import.meta.env.DEV) {
      console.time(label);
    }
  },
  
  end: (label) => {
    if (import.meta.env.DEV) {
      console.timeEnd(label);
    }
  }
};

// Lazy loading helper
export const createLazyComponent = (importFn, fallback = null) => {
  const LazyComponent = React.lazy(importFn);
  
  return (props) => (
    <React.Suspense fallback={fallback || <div>Loading...</div>}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};