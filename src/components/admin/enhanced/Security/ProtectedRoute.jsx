import React from 'react';
import { Navigate } from 'react-router-dom';
import authService, { PERMISSIONS, ROLES } from '../../../../services/AuthService';

const ProtectedRoute = ({ 
  children, 
  requiredPermission, 
  requiredPermissions = [], 
  requiredRole,
  requireAll = false,
  fallbackComponent = null 
}) => {
  const { user, role, permissions } = authService.getCurrentUser();

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check role requirement
  if (requiredRole && !authService.hasRoleLevel(requiredRole)) {
    return fallbackComponent || (
      <div className="access-denied">
        <div className="access-denied-content">
          <h3>Access Denied</h3>
          <p>You don't have sufficient privileges to access this section.</p>
          <p>Required role: {requiredRole}</p>
          <p>Your role: {role}</p>
        </div>
      </div>
    );
  }

  // Check single permission requirement
  if (requiredPermission && !authService.hasPermission(requiredPermission)) {
    return fallbackComponent || (
      <div className="access-denied">
        <div className="access-denied-content">
          <h3>Access Denied</h3>
          <p>You don't have permission to access this section.</p>
          <p>Required permission: {requiredPermission}</p>
        </div>
      </div>
    );
  }

  // Check multiple permissions requirement
  if (requiredPermissions.length > 0) {
    const hasAccess = requireAll 
      ? authService.hasAllPermissions(requiredPermissions)
      : authService.hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return fallbackComponent || (
        <div className="access-denied">
          <div className="access-denied-content">
            <h3>Access Denied</h3>
            <p>You don't have the required permissions to access this section.</p>
            <p>Required permissions: {requiredPermissions.join(', ')}</p>
            <p>Check type: {requireAll ? 'All permissions required' : 'Any permission required'}</p>
          </div>
        </div>
      );
    }
  }

  return children;
};

// Higher-order component for protecting components
export const withPermission = (Component, requiredPermission) => {
  return (props) => (
    <ProtectedRoute requiredPermission={requiredPermission}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Higher-order component for protecting components with multiple permissions
export const withPermissions = (Component, requiredPermissions, requireAll = false) => {
  return (props) => (
    <ProtectedRoute requiredPermissions={requiredPermissions} requireAll={requireAll}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Higher-order component for protecting components with role
export const withRole = (Component, requiredRole) => {
  return (props) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

export default ProtectedRoute;