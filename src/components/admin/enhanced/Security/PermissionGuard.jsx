import React from 'react';
import authService from '../../../../services/AuthService';

const PermissionGuard = ({ 
  children, 
  permission, 
  permissions = [], 
  role,
  requireAll = false,
  fallback = null,
  showFallback = true 
}) => {
  // Check single permission
  if (permission && !authService.hasPermission(permission)) {
    return showFallback ? (fallback || <UnauthorizedMessage permission={permission} />) : null;
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? authService.hasAllPermissions(permissions)
      : authService.hasAnyPermission(permissions);

    if (!hasAccess) {
      return showFallback ? (fallback || <UnauthorizedMessage permissions={permissions} requireAll={requireAll} />) : null;
    }
  }

  // Check role
  if (role && !authService.hasRoleLevel(role)) {
    return showFallback ? (fallback || <UnauthorizedMessage role={role} />) : null;
  }

  return children;
};

const UnauthorizedMessage = ({ permission, permissions, role, requireAll }) => (
  <div className="unauthorized-message">
    <div className="unauthorized-content">
      <div className="unauthorized-icon">🔒</div>
      <h4>Access Restricted</h4>
      <p>
        {permission && `Required permission: ${permission}`}
        {permissions && `Required permissions: ${permissions.join(', ')} (${requireAll ? 'all' : 'any'})`}
        {role && `Required role: ${role} or higher`}
      </p>
    </div>
  </div>
);

// Conditional rendering based on permissions
export const IfPermission = ({ permission, children, fallback = null }) => (
  <PermissionGuard permission={permission} fallback={fallback} showFallback={!!fallback}>
    {children}
  </PermissionGuard>
);

// Conditional rendering based on multiple permissions
export const IfPermissions = ({ permissions, requireAll = false, children, fallback = null }) => (
  <PermissionGuard permissions={permissions} requireAll={requireAll} fallback={fallback} showFallback={!!fallback}>
    {children}
  </PermissionGuard>
);

// Conditional rendering based on role
export const IfRole = ({ role, children, fallback = null }) => (
  <PermissionGuard role={role} fallback={fallback} showFallback={!!fallback}>
    {children}
  </PermissionGuard>
);

// Button with permission check
export const PermissionButton = ({ 
  permission, 
  permissions = [], 
  role,
  requireAll = false,
  children, 
  onClick,
  className = '',
  disabled = false,
  ...props 
}) => {
  const hasAccess = () => {
    if (permission && !authService.hasPermission(permission)) return false;
    if (role && !authService.hasRoleLevel(role)) return false;
    if (permissions.length > 0) {
      return requireAll 
        ? authService.hasAllPermissions(permissions)
        : authService.hasAnyPermission(permissions);
    }
    return true;
  };

  if (!hasAccess()) {
    return null; // Don't render button if no access
  }

  return (
    <button
      onClick={onClick}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Link with permission check
export const PermissionLink = ({ 
  permission, 
  permissions = [], 
  role,
  requireAll = false,
  children, 
  to,
  className = '',
  ...props 
}) => {
  const hasAccess = () => {
    if (permission && !authService.hasPermission(permission)) return false;
    if (role && !authService.hasRoleLevel(role)) return false;
    if (permissions.length > 0) {
      return requireAll 
        ? authService.hasAllPermissions(permissions)
        : authService.hasAnyPermission(permissions);
    }
    return true;
  };

  if (!hasAccess()) {
    return null; // Don't render link if no access
  }

  return (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  );
};

// Menu item with permission check
export const PermissionMenuItem = ({ 
  permission, 
  permissions = [], 
  role,
  requireAll = false,
  children, 
  onClick,
  className = '',
  ...props 
}) => {
  const hasAccess = () => {
    if (permission && !authService.hasPermission(permission)) return false;
    if (role && !authService.hasRoleLevel(role)) return false;
    if (permissions.length > 0) {
      return requireAll 
        ? authService.hasAllPermissions(permissions)
        : authService.hasAnyPermission(permissions);
    }
    return true;
  };

  if (!hasAccess()) {
    return null; // Don't render menu item if no access
  }

  return (
    <div onClick={onClick} className={`menu-item ${className}`} {...props}>
      {children}
    </div>
  );
};

export default PermissionGuard;