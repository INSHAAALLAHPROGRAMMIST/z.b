import React from 'react';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { PERMISSIONS, ROLES } from '../../../../../services/AuthService';
import { renderWithProviders, mockUserWithPermissions, mockUserWithRole } from '../../../../../utils/testUtils';

// Mock the auth service
jest.mock('../../../../../services/AuthService', () => ({
  ...jest.requireActual('../../../../../services/AuthService'),
  default: {
    getCurrentUser: jest.fn(),
    hasPermission: jest.fn(),
    hasRoleLevel: jest.fn(),
    hasAnyPermission: jest.fn(),
    hasAllPermissions: jest.fn()
  }
}));

const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  const mockAuthService = require('../../../../../services/AuthService').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Check', () => {
    test('should redirect to login when user is not authenticated', () => {
      mockAuthService.getCurrentUser.mockReturnValue({ user: null });
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should render children when user is authenticated', () => {
      mockAuthService.getCurrentUser.mockReturnValue(mockUserWithPermissions());
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Permission-based Access Control', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockReturnValue(mockUserWithPermissions());
    });

    test('should render children when user has required permission', () => {
      mockAuthService.hasPermission.mockReturnValue(true);
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_DASHBOARD}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('should show access denied when user lacks required permission', () => {
      mockAuthService.hasPermission.mockReturnValue(false);
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_USERS}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should handle multiple permissions with requireAll=true', () => {
      mockAuthService.hasAllPermissions.mockReturnValue(true);
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute 
            requiredPermissions={[PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.EDIT_ORDERS]}
            requireAll={true}
          >
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('should handle multiple permissions with requireAll=false', () => {
      mockAuthService.hasAnyPermission.mockReturnValue(true);
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute 
            requiredPermissions={[PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.EDIT_ORDERS]}
            requireAll={false}
          >
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Role-based Access Control', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockReturnValue(mockUserWithRole());
    });

    test('should render children when user has required role level', () => {
      mockAuthService.hasRoleLevel.mockReturnValue(true);
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute requiredRole={ROLES.ADMIN}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('should show access denied when user lacks required role level', () => {
      mockAuthService.hasRoleLevel.mockReturnValue(false);
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute requiredRole={ROLES.SUPER_ADMIN}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Custom Fallback Component', () => {
    test('should render custom fallback when access is denied', () => {
      mockAuthService.getCurrentUser.mockReturnValue(mockUserWithPermissions());
      mockAuthService.hasPermission.mockReturnValue(false);
      
      const CustomFallback = () => <div>Custom Access Denied</div>;
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute 
            requiredPermission={PERMISSIONS.MANAGE_USERS}
            fallbackComponent={<CustomFallback />}
          >
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Custom Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });
  });

  describe('Higher-order Components', () => {
    test('withPermission HOC should work correctly', () => {
      const { withPermission } = require('../ProtectedRoute');
      mockAuthService.getCurrentUser.mockReturnValue(mockUserWithPermissions());
      mockAuthService.hasPermission.mockReturnValue(true);
      
      const ProtectedComponent = withPermission(TestComponent, PERMISSIONS.VIEW_DASHBOARD);
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedComponent />
        </MemoryRouter>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('withRole HOC should work correctly', () => {
      const { withRole } = require('../ProtectedRoute');
      mockAuthService.getCurrentUser.mockReturnValue(mockUserWithRole());
      mockAuthService.hasRoleLevel.mockReturnValue(true);
      
      const ProtectedComponent = withRole(TestComponent, ROLES.ADMIN);
      
      renderWithProviders(
        <MemoryRouter>
          <ProtectedComponent />
        </MemoryRouter>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});