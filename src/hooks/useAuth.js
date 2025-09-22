import { useState, useEffect } from 'react';
import authService from '../services/AuthService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let unsubscribe;

    const initAuth = async () => {
      try {
        // Initialize auth service
        await authService.init();
        
        // Set up auth state listener
        unsubscribe = authService.onAuthStateChanged((user) => {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser.user);
          setRole(currentUser.role);
          setPermissions(currentUser.permissions);
          setLoading(false);
          setInitialized(true);
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const hasPermission = (permission) => {
    return authService.hasPermission(permission);
  };

  const hasAnyPermission = (permissionList) => {
    return authService.hasAnyPermission(permissionList);
  };

  const hasAllPermissions = (permissionList) => {
    return authService.hasAllPermissions(permissionList);
  };

  const hasRole = (requiredRole) => {
    return authService.hasRole(requiredRole);
  };

  const hasRoleLevel = (minimumRole) => {
    return authService.hasRoleLevel(minimumRole);
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return {
    user,
    role,
    permissions,
    loading,
    initialized,
    isAuthenticated: !!user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasRoleLevel,
    signOut
  };
};

export default useAuth;