import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Admin role hierarchy
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  VIEWER: 'viewer'
};

// Permission levels for different operations
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_REPORTS: 'export_reports',
  VIEW_ORDERS: 'view_orders',
  EDIT_ORDERS: 'edit_orders',
  DELETE_ORDERS: 'delete_orders',
  BULK_ORDER_OPERATIONS: 'bulk_order_operations',
  VIEW_CUSTOMERS: 'view_customers',
  EDIT_CUSTOMERS: 'edit_customers',
  DELETE_CUSTOMERS: 'delete_customers',
  VIEW_CUSTOMER_DETAILS: 'view_customer_details',
  VIEW_INVENTORY: 'view_inventory',
  EDIT_INVENTORY: 'edit_inventory',
  BULK_INVENTORY_OPERATIONS: 'bulk_inventory_operations',
  VIEW_STOCK_REPORTS: 'view_stock_reports',
  VIEW_SYSTEM_HEALTH: 'view_system_health',
  VIEW_ERROR_LOGS: 'view_error_logs',
  MANAGE_NOTIFICATIONS: 'manage_notifications',
  SEND_MESSAGES: 'send_messages',
  MANAGE_TEMPLATES: 'manage_templates',
  VIEW_COMMUNICATION_HISTORY: 'view_communication_history',
  MANAGE_SEO: 'manage_seo',
  BULK_CONTENT_OPERATIONS: 'bulk_content_operations',
  MANAGE_USERS: 'manage_users',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_ROLES: 'manage_roles'
};

// Role-based permission mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.EDIT_ORDERS,
    PERMISSIONS.BULK_ORDER_OPERATIONS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.EDIT_CUSTOMERS,
    PERMISSIONS.VIEW_CUSTOMER_DETAILS,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.EDIT_INVENTORY,
    PERMISSIONS.BULK_INVENTORY_OPERATIONS,
    PERMISSIONS.VIEW_STOCK_REPORTS,
    PERMISSIONS.VIEW_SYSTEM_HEALTH,
    PERMISSIONS.VIEW_ERROR_LOGS,
    PERMISSIONS.MANAGE_NOTIFICATIONS,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.VIEW_COMMUNICATION_HISTORY,
    PERMISSIONS.MANAGE_SEO,
    PERMISSIONS.BULK_CONTENT_OPERATIONS,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.EDIT_ORDERS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.VIEW_CUSTOMER_DETAILS,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.EDIT_INVENTORY,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.VIEW_COMMUNICATION_HISTORY,
    PERMISSIONS.MANAGE_SEO
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_COMMUNICATION_HISTORY
  ]
};

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.userPermissions = [];
    this.authStateListeners = [];
  }

  init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = user;
          await this.loadUserRole();
        } else {
          this.currentUser = null;
          this.userRole = null;
          this.userPermissions = [];
        }
        
        this.authStateListeners.forEach(listener => listener(user));
        resolve(user);
      });
    });
  }

  async loadUserRole() {
    if (!this.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'adminUsers', this.currentUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        this.userRole = userData.role || ROLES.VIEWER;
        this.userPermissions = ROLE_PERMISSIONS[this.userRole] || [];
      } else {
        await this.createUserDocument(ROLES.VIEWER);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      this.userRole = ROLES.VIEWER;
      this.userPermissions = ROLE_PERMISSIONS[ROLES.VIEWER];
    }
  }

  async createUserDocument(role = ROLES.VIEWER) {
    if (!this.currentUser) return;

    const userData = {
      uid: this.currentUser.uid,
      email: this.currentUser.email,
      role: role,
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true
    };

    try {
      await setDoc(doc(db, 'adminUsers', this.currentUser.uid), userData);
      this.userRole = role;
      this.userPermissions = ROLE_PERMISSIONS[role];
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }

  hasPermission(permission) {
    return this.userPermissions.includes(permission);
  }

  hasAnyPermission(permissions) {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissions) {
    return permissions.every(permission => this.hasPermission(permission));
  }

  hasRole(role) {
    return this.userRole === role;
  }

  hasRoleLevel(minimumRole) {
    const roleHierarchy = {
      [ROLES.VIEWER]: 1,
      [ROLES.MODERATOR]: 2,
      [ROLES.ADMIN]: 3,
      [ROLES.SUPER_ADMIN]: 4
    };

    const userLevel = roleHierarchy[this.userRole] || 0;
    const requiredLevel = roleHierarchy[minimumRole] || 0;

    return userLevel >= requiredLevel;
  }

  getCurrentUser() {
    return {
      user: this.currentUser,
      role: this.userRole,
      permissions: this.userPermissions
    };
  }

  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  async signOut() {
    try {
      await auth.signOut();
      this.currentUser = null;
      this.userRole = null;
      this.userPermissions = [];
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;