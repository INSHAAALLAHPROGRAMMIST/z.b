import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { SecurityProvider } from './SecurityContext';
import { ChatProvider } from './ChatContext';
import authService from '../services/AuthService';
import auditService from '../services/AuditService';
import messagingNotificationService from '../services/MessagingNotificationService';
import messagingFallbackService from '../services/MessagingFallbackService';

// Global state structure
const initialState = {
  // App state
  isInitialized: false,
  isLoading: false,
  error: null,
  
  // Theme and UI
  theme: 'light',
  sidebarCollapsed: false,
  notifications: [],
  
  // Dashboard data
  dashboardStats: null,
  recentActivity: [],
  
  // System status
  systemHealth: {
    database: 'unknown',
    messaging: 'unknown',
    notifications: 'unknown',
    storage: 'unknown'
  },
  
  // Feature flags
  featureFlags: {
    messaging: true,
    realTimeNotifications: true,
    advancedAnalytics: true,
    auditLogging: true,
    performanceMonitoring: true
  },
  
  // Performance metrics
  performance: {
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    bundleSize: 0
  }
};

// Action types
const ActionTypes = {
  SET_INITIALIZED: 'SET_INITIALIZED',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_THEME: 'SET_THEME',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  UPDATE_DASHBOARD_STATS: 'UPDATE_DASHBOARD_STATS',
  UPDATE_RECENT_ACTIVITY: 'UPDATE_RECENT_ACTIVITY',
  UPDATE_SYSTEM_HEALTH: 'UPDATE_SYSTEM_HEALTH',
  UPDATE_FEATURE_FLAG: 'UPDATE_FEATURE_FLAG',
  UPDATE_PERFORMANCE: 'UPDATE_PERFORMANCE',
  RESET_STATE: 'RESET_STATE'
};

// Reducer function
const globalStateReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_INITIALIZED:
      return { ...state, isInitialized: action.payload };
    
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ActionTypes.SET_THEME:
      return { ...state, theme: action.payload };
    
    case ActionTypes.TOGGLE_SIDEBAR:
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    case ActionTypes.UPDATE_DASHBOARD_STATS:
      return { ...state, dashboardStats: action.payload };
    
    case ActionTypes.UPDATE_RECENT_ACTIVITY:
      return { ...state, recentActivity: action.payload };
    
    case ActionTypes.UPDATE_SYSTEM_HEALTH:
      return {
        ...state,
        systemHealth: { ...state.systemHealth, ...action.payload }
      };
    
    case ActionTypes.UPDATE_FEATURE_FLAG:
      return {
        ...state,
        featureFlags: {
          ...state.featureFlags,
          [action.payload.flag]: action.payload.enabled
        }
      };
    
    case ActionTypes.UPDATE_PERFORMANCE:
      return {
        ...state,
        performance: { ...state.performance, ...action.payload }
      };
    
    case ActionTypes.RESET_STATE:
      return { ...initialState };
    
    default:
      return state;
  }
};

// Context
const GlobalStateContext = createContext();

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};

// Provider component
export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalStateReducer, initialState);

  // Initialize application
  useEffect(() => {
    initializeApplication();
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin_theme');
    if (savedTheme && savedTheme !== state.theme) {
      dispatch({ type: ActionTypes.SET_THEME, payload: savedTheme });
    }
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('admin_theme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('admin_sidebar_collapsed');
    if (savedSidebarState !== null) {
      const isCollapsed = JSON.parse(savedSidebarState);
      if (isCollapsed !== state.sidebarCollapsed) {
        dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
      }
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', JSON.stringify(state.sidebarCollapsed));
  }, [state.sidebarCollapsed]);

  // Initialize application services
  const initializeApplication = async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      // Initialize authentication
      await authService.init();
      
      // Initialize messaging notifications
      await messagingNotificationService.initialize();
      
      // Initialize messaging fallback service
      messagingFallbackService.initialize?.();
      
      // Check system health
      await checkSystemHealth();
      
      // Load initial dashboard data
      await loadInitialData();
      
      // Set up performance monitoring
      setupPerformanceMonitoring();
      
      dispatch({ type: ActionTypes.SET_INITIALIZED, payload: true });
      
      // Log application initialization
      await auditService.logEvent('APPLICATION_INITIALIZED', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
    } catch (error) {
      console.error('Error initializing application:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };

  // Check system health
  const checkSystemHealth = async () => {
    const healthChecks = {
      database: 'checking',
      messaging: 'checking',
      notifications: 'checking',
      storage: 'checking'
    };
    
    dispatch({ type: ActionTypes.UPDATE_SYSTEM_HEALTH, payload: healthChecks });
    
    try {
      // Check database connectivity
      try {
        await authService.getCurrentUser();
        healthChecks.database = 'healthy';
      } catch (error) {
        healthChecks.database = 'error';
      }
      
      // Check messaging service
      try {
        const messagingStatus = messagingFallbackService.getServiceStatus();
        healthChecks.messaging = messagingStatus.isOnline ? 'healthy' : 'warning';
      } catch (error) {
        healthChecks.messaging = 'error';
      }
      
      // Check notifications
      try {
        healthChecks.notifications = 'healthy'; // Assume healthy for now
      } catch (error) {
        healthChecks.notifications = 'error';
      }
      
      // Check storage
      try {
        localStorage.setItem('health_check', 'test');
        localStorage.removeItem('health_check');
        healthChecks.storage = 'healthy';
      } catch (error) {
        healthChecks.storage = 'error';
      }
      
      dispatch({ type: ActionTypes.UPDATE_SYSTEM_HEALTH, payload: healthChecks });
      
    } catch (error) {
      console.error('Error checking system health:', error);
    }
  };

  // Load initial dashboard data
  const loadInitialData = async () => {
    try {
      // This would load from your analytics service
      const mockStats = {
        totalOrders: 150,
        totalRevenue: 15000,
        activeUsers: 45,
        lowStockItems: 8
      };
      
      dispatch({ type: ActionTypes.UPDATE_DASHBOARD_STATS, payload: mockStats });
      
      const mockActivity = [
        {
          id: '1',
          type: 'order',
          message: 'New order #1001',
          timestamp: new Date(),
          user: 'John Doe'
        }
      ];
      
      dispatch({ type: ActionTypes.UPDATE_RECENT_ACTIVITY, payload: mockActivity });
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // Setup performance monitoring
  const setupPerformanceMonitoring = () => {
    // Monitor page load time
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      dispatch({
        type: ActionTypes.UPDATE_PERFORMANCE,
        payload: { loadTime }
      });
    }
    
    // Monitor memory usage
    if (performance.memory) {
      const memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      dispatch({
        type: ActionTypes.UPDATE_PERFORMANCE,
        payload: { memoryUsage }
      });
    }
    
    // Set up periodic performance monitoring
    setInterval(() => {
      if (performance.memory) {
        const memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        dispatch({
          type: ActionTypes.UPDATE_PERFORMANCE,
          payload: { memoryUsage }
        });
      }
    }, 30000); // Every 30 seconds
  };

  // Action creators
  const actions = {
    setTheme: (theme) => {
      dispatch({ type: ActionTypes.SET_THEME, payload: theme });
    },
    
    toggleSidebar: () => {
      dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
    },
    
    addNotification: (notification) => {
      const notificationWithId = {
        ...notification,
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
      dispatch({ type: ActionTypes.ADD_NOTIFICATION, payload: notificationWithId });
      
      // Auto-remove notification after delay
      if (notification.autoRemove !== false) {
        setTimeout(() => {
          actions.removeNotification(notificationWithId.id);
        }, notification.duration || 5000);
      }
    },
    
    removeNotification: (id) => {
      dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
    },
    
    updateFeatureFlag: (flag, enabled) => {
      dispatch({ type: ActionTypes.UPDATE_FEATURE_FLAG, payload: { flag, enabled } });
      localStorage.setItem(`feature_flag_${flag}`, JSON.stringify(enabled));
    },
    
    refreshSystemHealth: () => {
      checkSystemHealth();
    },
    
    refreshDashboardData: () => {
      loadInitialData();
    },
    
    resetState: () => {
      dispatch({ type: ActionTypes.RESET_STATE });
    }
  };

  const value = {
    state,
    actions,
    // Computed values
    isHealthy: Object.values(state.systemHealth).every(status => status === 'healthy'),
    hasErrors: Object.values(state.systemHealth).some(status => status === 'error'),
    unreadNotifications: state.notifications.filter(n => !n.read).length
  };

  return (
    <GlobalStateContext.Provider value={value}>
      <SecurityProvider>
        <ChatProvider>
          {children}
        </ChatProvider>
      </SecurityProvider>
    </GlobalStateContext.Provider>
  );
};

// Higher-order component for connecting components to global state
export const withGlobalState = (Component) => {
  return (props) => {
    const globalState = useGlobalState();
    return <Component {...props} globalState={globalState} />;
  };
};

// Hooks for specific state slices
export const useTheme = () => {
  const { state, actions } = useGlobalState();
  return {
    theme: state.theme,
    setTheme: actions.setTheme,
    isDark: state.theme === 'dark'
  };
};

export const useNotifications = () => {
  const { state, actions } = useGlobalState();
  return {
    notifications: state.notifications,
    addNotification: actions.addNotification,
    removeNotification: actions.removeNotification,
    unreadCount: state.notifications.filter(n => !n.read).length
  };
};

export const useSystemHealth = () => {
  const { state, actions } = useGlobalState();
  return {
    systemHealth: state.systemHealth,
    refreshSystemHealth: actions.refreshSystemHealth,
    isHealthy: Object.values(state.systemHealth).every(status => status === 'healthy'),
    hasErrors: Object.values(state.systemHealth).some(status => status === 'error')
  };
};

export const useFeatureFlags = () => {
  const { state, actions } = useGlobalState();
  return {
    featureFlags: state.featureFlags,
    updateFeatureFlag: actions.updateFeatureFlag,
    isFeatureEnabled: (flag) => state.featureFlags[flag] || false
  };
};

export const usePerformance = () => {
  const { state } = useGlobalState();
  return {
    performance: state.performance,
    isPerformanceGood: state.performance.memoryUsage < 100 && state.performance.loadTime < 3000
  };
};

export default GlobalStateContext;