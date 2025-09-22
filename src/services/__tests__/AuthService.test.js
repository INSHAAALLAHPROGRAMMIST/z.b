import authService, { ROLES, PERMISSIONS } from '../AuthService';
import { mockFirebase, mockAuthService } from '../../utils/testUtils';

// Mock Firebase
jest.mock('../../firebase/config', () => mockFirebase);

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role Management', () => {
    test('should return correct role hierarchy', () => {
      expect(ROLES.SUPER_ADMIN).toBe('super_admin');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.MODERATOR).toBe('moderator');
      expect(ROLES.VIEWER).toBe('viewer');
    });

    test('should check role level correctly', () => {
      authService.userRole = ROLES.ADMIN;
      
      expect(authService.hasRoleLevel(ROLES.VIEWER)).toBe(true);
      expect(authService.hasRoleLevel(ROLES.MODERATOR)).toBe(true);
      expect(authService.hasRoleLevel(ROLES.ADMIN)).toBe(true);
      expect(authService.hasRoleLevel(ROLES.SUPER_ADMIN)).toBe(false);
    });

    test('should check specific role correctly', () => {
      authService.userRole = ROLES.ADMIN;
      
      expect(authService.hasRole(ROLES.ADMIN)).toBe(true);
      expect(authService.hasRole(ROLES.SUPER_ADMIN)).toBe(false);
      expect(authService.hasRole(ROLES.VIEWER)).toBe(false);
    });
  });

  describe('Permission Management', () => {
    beforeEach(() => {
      authService.userPermissions = [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.EDIT_ORDERS,
        PERMISSIONS.VIEW_CUSTOMERS
      ];
    });

    test('should check single permission correctly', () => {
      expect(authService.hasPermission(PERMISSIONS.VIEW_DASHBOARD)).toBe(true);
      expect(authService.hasPermission(PERMISSIONS.EDIT_ORDERS)).toBe(true);
      expect(authService.hasPermission(PERMISSIONS.DELETE_ORDERS)).toBe(false);
    });

    test('should check any permission correctly', () => {
      const permissions = [PERMISSIONS.DELETE_ORDERS, PERMISSIONS.VIEW_DASHBOARD];
      expect(authService.hasAnyPermission(permissions)).toBe(true);
      
      const noPermissions = [PERMISSIONS.DELETE_ORDERS, PERMISSIONS.MANAGE_USERS];
      expect(authService.hasAnyPermission(noPermissions)).toBe(false);
    });

    test('should check all permissions correctly', () => {
      const permissions = [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.EDIT_ORDERS];
      expect(authService.hasAllPermissions(permissions)).toBe(true);
      
      const mixedPermissions = [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.DELETE_ORDERS];
      expect(authService.hasAllPermissions(mixedPermissions)).toBe(false);
    });
  });

  describe('User Management', () => {
    test('should return current user info', () => {
      const mockUser = { uid: 'test-123', email: 'test@example.com' };
      const mockRole = ROLES.ADMIN;
      const mockPermissions = [PERMISSIONS.VIEW_DASHBOARD];
      
      authService.currentUser = mockUser;
      authService.userRole = mockRole;
      authService.userPermissions = mockPermissions;
      
      const userInfo = authService.getCurrentUser();
      
      expect(userInfo.user).toBe(mockUser);
      expect(userInfo.role).toBe(mockRole);
      expect(userInfo.permissions).toBe(mockPermissions);
    });

    test('should handle auth state listeners', () => {
      const mockCallback = jest.fn();
      
      const unsubscribe = authService.onAuthStateChanged(mockCallback);
      expect(authService.authStateListeners).toContain(mockCallback);
      
      unsubscribe();
      expect(authService.authStateListeners).not.toContain(mockCallback);
    });
  });

  describe('Authentication Flow', () => {
    test('should initialize auth service', async () => {
      const initSpy = jest.spyOn(authService, 'init');
      await authService.init();
      expect(initSpy).toHaveBeenCalled();
    });

    test('should handle sign out', async () => {
      authService.currentUser = { uid: 'test-123' };
      authService.userRole = ROLES.ADMIN;
      authService.userPermissions = [PERMISSIONS.VIEW_DASHBOARD];
      
      await authService.signOut();
      
      expect(authService.currentUser).toBeNull();
      expect(authService.userRole).toBeNull();
      expect(authService.userPermissions).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle permission check with no permissions', () => {
      authService.userPermissions = [];
      
      expect(authService.hasPermission(PERMISSIONS.VIEW_DASHBOARD)).toBe(false);
      expect(authService.hasAnyPermission([PERMISSIONS.VIEW_DASHBOARD])).toBe(false);
      expect(authService.hasAllPermissions([PERMISSIONS.VIEW_DASHBOARD])).toBe(false);
    });

    test('should handle role check with no role', () => {
      authService.userRole = null;
      
      expect(authService.hasRole(ROLES.ADMIN)).toBe(false);
      expect(authService.hasRoleLevel(ROLES.VIEWER)).toBe(false);
    });
  });
});