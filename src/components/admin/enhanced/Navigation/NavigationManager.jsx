import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalState, useTheme, useNotifications } from '../../../../contexts/GlobalStateManager';
import { useAuth } from '../../../../hooks/useAuth';
import { PERMISSIONS } from '../../../../services/AuthService';

const NavigationManager = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, actions } = useGlobalState();
  const { theme, setTheme } = useTheme();
  const { notifications, unreadCount } = useNotifications();
  const { user, role, hasPermission, signOut } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Navigation items with permissions
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      path: '/admin',
      permission: PERMISSIONS.VIEW_DASHBOARD
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📈',
      path: '/admin/analytics',
      permission: PERMISSIONS.VIEW_ANALYTICS,
      children: [
        {
          id: 'sales',
          label: 'Sales Analytics',
          path: '/admin/analytics/sales',
          permission: PERMISSIONS.VIEW_ANALYTICS
        },
        {
          id: 'revenue',
          label: 'Revenue Reports',
          path: '/admin/analytics/revenue',
          permission: PERMISSIONS.EXPORT_REPORTS
        }
      ]
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: '📦',
      path: '/admin/orders',
      permission: PERMISSIONS.VIEW_ORDERS
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: '👥',
      path: '/admin/customers',
      permission: PERMISSIONS.VIEW_CUSTOMERS
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: '📋',
      path: '/admin/inventory',
      permission: PERMISSIONS.VIEW_INVENTORY
    },
    {
      id: 'messaging',
      label: 'Messages',
      icon: '💬',
      path: '/admin/messaging',
      permission: PERMISSIONS.SEND_MESSAGES,
      badge: 'unread_messages'
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: '📢',
      path: '/admin/communication',
      permission: PERMISSIONS.MANAGE_NOTIFICATIONS
    },
    {
      id: 'system',
      label: 'System',
      icon: '⚙️',
      path: '/admin/system',
      permission: PERMISSIONS.VIEW_SYSTEM_HEALTH
    },
    {
      id: 'seo',
      label: 'SEO Tools',
      icon: '🔍',
      path: '/admin/seo',
      permission: PERMISSIONS.MANAGE_SEO
    },
    {
      id: 'security',
      label: 'Security',
      icon: '🛡️',
      path: '/admin/security',
      permission: PERMISSIONS.VIEW_AUDIT_LOGS,
      children: [
        {
          id: 'roles',
          label: 'User Roles',
          path: '/admin/security/roles',
          permission: PERMISSIONS.MANAGE_ROLES
        },
        {
          id: 'audit',
          label: 'Audit Logs',
          path: '/admin/security/audit',
          permission: PERMISSIONS.VIEW_AUDIT_LOGS
        }
      ]
    }
  ];

  // Filter navigation items based on permissions
  const filteredNavigationItems = navigationItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }).map(item => ({
    ...item,
    children: item.children?.filter(child => 
      !child.permission || hasPermission(child.permission)
    )
  }));

  // Get current page info
  const getCurrentPageInfo = () => {
    const currentPath = location.pathname;
    
    for (const item of filteredNavigationItems) {
      if (item.path === currentPath) {
        return { title: item.label, icon: item.icon };
      }
      
      if (item.children) {
        for (const child of item.children) {
          if (child.path === currentPath) {
            return { title: `${item.label} - ${child.label}`, icon: item.icon };
          }
        }
      }
    }
    
    return { title: 'Admin Dashboard', icon: '📊' };
  };

  const currentPageInfo = getCurrentPageInfo();

  // Handle search
  const handleSearch = (query) => {
    if (!query.trim()) return;
    
    // Simple search implementation - in production, this would be more sophisticated
    const searchResults = filteredNavigationItems.filter(item =>
      item.label.toLowerCase().includes(query.toLowerCase())
    );
    
    if (searchResults.length > 0) {
      navigate(searchResults[0].path);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get badge count for navigation items
  const getBadgeCount = (badgeType) => {
    switch (badgeType) {
      case 'unread_messages':
        // This would come from messaging context
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className="navigation-manager">
      {/* Top Navigation Bar */}
      <div className="top-nav">
        <div className="nav-left">
          <button
            className="sidebar-toggle"
            onClick={actions.toggleSidebar}
            title={state.sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {state.sidebarCollapsed ? '☰' : '✕'}
          </button>
          
          <div className="page-info">
            <span className="page-icon">{currentPageInfo.icon}</span>
            <h1 className="page-title">{currentPageInfo.title}</h1>
          </div>
        </div>
        
        <div className="nav-center">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search dashboard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery);
                }
              }}
              className="search-input"
            />
            <button
              className="search-button"
              onClick={() => handleSearch(searchQuery)}
            >
              🔍
            </button>
          </div>
        </div>
        
        <div className="nav-right">
          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          {/* Notifications */}
          <div className="notifications-container">
            <button
              className="notifications-button"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
            
            {showNotifications && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  <span className="notifications-count">{unreadCount} unread</span>
                </div>
                
                <div className="notifications-list">
                  {notifications.slice(0, 5).map(notification => (
                    <div key={notification.id} className="notification-item">
                      <div className="notification-content">
                        <h4>{notification.title}</h4>
                        <p>{notification.message}</p>
                        <span className="notification-time">
                          {notification.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {notifications.length === 0 && (
                    <div className="no-notifications">
                      <p>No notifications</p>
                    </div>
                  )}
                </div>
                
                {notifications.length > 5 && (
                  <div className="notifications-footer">
                    <button onClick={() => navigate('/admin/notifications')}>
                      View All Notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="user-menu-container">
            <button
              className="user-menu-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="user-name">
                {user?.email?.split('@')[0] || 'Admin'}
              </span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showUserMenu && (
              <div className="user-menu-dropdown">
                <div className="user-info">
                  <div className="user-avatar large">
                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="user-details">
                    <div className="user-email">{user?.email}</div>
                    <div className="user-role">{role}</div>
                  </div>
                </div>
                
                <div className="menu-divider"></div>
                
                <div className="menu-items">
                  <button className="menu-item" onClick={() => navigate('/admin/profile')}>
                    <span className="menu-icon">👤</span>
                    Profile Settings
                  </button>
                  
                  <button className="menu-item" onClick={() => navigate('/admin/preferences')}>
                    <span className="menu-icon">⚙️</span>
                    Preferences
                  </button>
                  
                  <button className="menu-item" onClick={() => navigate('/admin/help')}>
                    <span className="menu-icon">❓</span>
                    Help & Support
                  </button>
                </div>
                
                <div className="menu-divider"></div>
                
                <button className="menu-item logout" onClick={handleLogout}>
                  <span className="menu-icon">🚪</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Sidebar Navigation */}
      <div className={`sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">📚</span>
            {!state.sidebarCollapsed && (
              <span className="logo-text">BookStore Admin</span>
            )}
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {filteredNavigationItems.map(item => (
            <div key={item.id} className="nav-item-container">
              <button
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                title={state.sidebarCollapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!state.sidebarCollapsed && (
                  <>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && getBadgeCount(item.badge) > 0 && (
                      <span className="nav-badge">
                        {getBadgeCount(item.badge)}
                      </span>
                    )}
                  </>
                )}
              </button>
              
              {/* Sub-navigation */}
              {item.children && !state.sidebarCollapsed && (
                <div className="sub-nav">
                  {item.children.map(child => (
                    <button
                      key={child.id}
                      className={`sub-nav-item ${location.pathname === child.path ? 'active' : ''}`}
                      onClick={() => navigate(child.path)}
                    >
                      <span className="sub-nav-label">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        
        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {!state.sidebarCollapsed && (
            <div className="system-status">
              <div className="status-item">
                <span className={`status-dot ${state.isHealthy ? 'healthy' : 'error'}`}></span>
                <span className="status-text">
                  {state.isHealthy ? 'All Systems Operational' : 'System Issues Detected'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Navigation Overlay */}
      {!state.sidebarCollapsed && (
        <div 
          className="mobile-overlay"
          onClick={actions.toggleSidebar}
        ></div>
      )}
      
      <style jsx>{`
        .navigation-manager {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
        }
        
        .top-nav {
          height: 64px;
          background: var(--nav-bg, #ffffff);
          border-bottom: 1px solid var(--border-color, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .nav-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .sidebar-toggle {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .sidebar-toggle:hover {
          background: var(--hover-bg, #f3f4f6);
        }
        
        .page-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .page-icon {
          font-size: 20px;
        }
        
        .page-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: var(--text-color, #111827);
        }
        
        .search-container {
          display: flex;
          align-items: center;
          background: var(--search-bg, #f9fafb);
          border: 1px solid var(--border-color, #d1d5db);
          border-radius: 8px;
          padding: 0;
          min-width: 300px;
        }
        
        .search-input {
          border: none;
          background: none;
          padding: 8px 12px;
          flex: 1;
          outline: none;
          font-size: 14px;
        }
        
        .search-button {
          background: none;
          border: none;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 16px;
        }
        
        .nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .theme-toggle {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .theme-toggle:hover {
          background: var(--hover-bg, #f3f4f6);
        }
        
        .notifications-container {
          position: relative;
        }
        
        .notifications-button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          position: relative;
          transition: background-color 0.2s;
        }
        
        .notifications-button:hover {
          background: var(--hover-bg, #f3f4f6);
        }
        
        .notification-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #ef4444;
          color: white;
          border-radius: 10px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
        }
        
        .notifications-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          width: 320px;
          max-height: 400px;
          overflow: hidden;
          z-index: 1001;
        }
        
        .sidebar {
          position: fixed;
          top: 64px;
          left: 0;
          bottom: 0;
          width: 280px;
          background: var(--sidebar-bg, #ffffff);
          border-right: 1px solid var(--border-color, #e5e7eb);
          transition: transform 0.3s ease;
          overflow-y: auto;
          z-index: 999;
        }
        
        .sidebar.collapsed {
          width: 64px;
        }
        
        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .logo-icon {
          font-size: 24px;
        }
        
        .logo-text {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-color, #111827);
        }
        
        .sidebar-nav {
          padding: 16px 0;
        }
        
        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s;
          color: var(--text-color, #374151);
          font-size: 14px;
        }
        
        .nav-item:hover {
          background: var(--hover-bg, #f3f4f6);
        }
        
        .nav-item.active {
          background: var(--active-bg, #eff6ff);
          color: var(--primary-color, #3b82f6);
          border-right: 3px solid var(--primary-color, #3b82f6);
        }
        
        .nav-icon {
          font-size: 18px;
          min-width: 18px;
        }
        
        .nav-label {
          flex: 1;
        }
        
        .nav-badge {
          background: #ef4444;
          color: white;
          border-radius: 10px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
        }
        
        .sub-nav {
          padding-left: 54px;
        }
        
        .sub-nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          padding: 8px 24px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s;
          color: var(--text-secondary, #6b7280);
          font-size: 13px;
        }
        
        .sub-nav-item:hover {
          background: var(--hover-bg, #f3f4f6);
        }
        
        .sub-nav-item.active {
          background: var(--active-bg, #eff6ff);
          color: var(--primary-color, #3b82f6);
        }
        
        .sidebar-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px 24px;
          border-top: 1px solid var(--border-color, #e5e7eb);
          background: var(--sidebar-bg, #ffffff);
        }
        
        .system-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .status-dot.healthy {
          background: #10b981;
        }
        
        .status-dot.error {
          background: #ef4444;
        }
        
        .status-text {
          font-size: 12px;
          color: var(--text-secondary, #6b7280);
        }
        
        .mobile-overlay {
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 998;
          display: none;
        }
        
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          
          .sidebar:not(.collapsed) {
            transform: translateX(0);
          }
          
          .mobile-overlay {
            display: block;
          }
          
          .search-container {
            min-width: 200px;
          }
          
          .nav-center {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default NavigationManager;