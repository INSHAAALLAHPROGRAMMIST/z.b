import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/AuthService';

const SecurityContext = createContext();

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let unsubscribe;

    const initSecurity = async () => {
      try {
        await authService.init();
        
        unsubscribe = authService.onAuthStateChanged((user) => {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser.user);
          setRole(currentUser.role);
          setPermissions(currentUser.permissions);
          setLoading(false);
          setInitialized(true);
        });
      } catch (error) {
        console.error('Error initializing security context:', error);
        setLoading(false);
        setInitialized(true);
      }
    };

    initSecurity();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    user,
    role,
    permissions,
    loading,
    initialized,
    isAuthenticated: !!user,
    hasPermission: (permission) => authService.hasPermission(permission),
    hasAnyPermission: (permissionList) => authService.hasAnyPermission(permissionList),
    hasAllPermissions: (permissionList) => authService.hasAllPermissions(permissionList),
    hasRole: (requiredRole) => authService.hasRole(requiredRole),
    hasRoleLevel: (minimumRole) => authService.hasRoleLevel(minimumRole),
    signOut: () => authService.signOut()
  };

  if (loading) {
    return (
      <div className="security-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing security...</p>
        </div>
      </div>
    );
  }

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export default SecurityContext;