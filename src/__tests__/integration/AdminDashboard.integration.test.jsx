import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../../components/AdminDashboard';
import { renderWithProviders, mockUserWithPermissions, waitForLoadingToFinish } from '../../utils/testUtils';
import { PERMISSIONS } from '../../services/AuthService';

// Mock all services
jest.mock('../../services/AuthService');
jest.mock('../../services/AnalyticsService');
jest.mock('../../services/InventoryService');
jest.mock('../../services/NotificationService');
jest.mock('../../services/AuditService');

describe('Admin Dashboard Integration', () => {
  const mockAuthService = require('../../services/AuthService').default;
  const mockAnalyticsService = require('../../services/AnalyticsService');
  const mockInventoryService = require('../../services/InventoryService');
  const mockNotificationService = require('../../services/NotificationService');
  const mockAuditService = require('../../services/AuditService').default;

  const setupMocks = () => {
    // Auth service mocks
    mockAuthService.getCurrentUser.mockReturnValue(
      mockUserWithPermissions([
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.VIEW_ORDERS,
        PERMISSIONS.VIEW_INVENTORY,
        PERMISSIONS.VIEW_CUSTOMERS
      ])
    );
    mockAuthService.hasPermission.mockReturnValue(true);
    mockAuthService.hasRoleLevel.mockReturnValue(true);

    // Analytics service mocks
    mockAnalyticsService.getDashboardStats.mockResolvedValue({
      totalOrders: 150,
      totalRevenue: 15000,
      activeUsers: 45,
      lowStockItems: 8
    });
    mockAnalyticsService.getRecentActivity.mockResolvedValue([]);
    mockAnalyticsService.getSalesData.mockResolvedValue({
      daily: [100, 150, 200],
      weekly: [1000, 1200, 1100],
      monthly: [5000, 5500, 6000]
    });

    // Inventory service mocks
    mockInventoryService.getInventoryStats.mockResolvedValue({
      totalItems: 500,
      lowStockItems: 8,
      outOfStockItems: 2
    });

    // Notification service mocks
    mockNotificationService.getRecentNotifications.mockResolvedValue([]);

    // Audit service mocks
    mockAuditService.getAuditLogs.mockResolvedValue([]);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('Dashboard Navigation', () => {
    test('should navigate between different sections', async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitForLoadingToFinish();

      // Should start on dashboard overview
      expect(screen.getByText(/dashboard overview/i)).toBeInTheDocument();

      // Navigate to analytics
      const analyticsLink = screen.getByText(/analytics/i);
      fireEvent.click(analyticsLink);

      await waitFor(() => {
        expect(screen.getByText(/sales analytics/i) || 
               screen.getByText(/advanced reports/i)).toBeInTheDocument();
      });

      // Navigate to inventory
      const inventoryLink = screen.getByText(/inventory/i);
      fireEvent.click(inventoryLink);

      await waitFor(() => {
        expect(screen.getByText(/inventory management/i)).toBeInTheDocument();
      });
    });

    test('should handle protected routes correctly', async () => {
      // Mock user without certain permissions
      mockAuthService.getCurrentUser.mockReturnValue(
        mockUserWithPermissions([PERMISSIONS.VIEW_DASHBOARD])
      );
      mockAuthService.hasPermission.mockImplementation(
        (permission) => permission === PERMISSIONS.VIEW_DASHBOARD
      );

      renderWithProviders(
        <MemoryRouter initialEntries={['/admin/security']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/access denied/i) || 
               screen.getByText(/insufficient privileges/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Flow Integration', () => {
    test('should load and display data from multiple services', async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitForLoadingToFinish();

      // Verify data from analytics service
      expect(screen.getByText('150')).toBeInTheDocument(); // Total orders
      expect(screen.getByText('$15,000')).toBeInTheDocument(); // Revenue

      // Verify services were called
      expect(mockAnalyticsService.getDashboardStats).toHaveBeenCalled();
      expect(mockInventoryService.getInventoryStats).toHaveBeenCalled();
    });

    test('should handle service errors gracefully', async () => {
      mockAnalyticsService.getDashboardStats.mockRejectedValue(
        new Error('Service unavailable')
      );

      renderWithProviders(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i) || 
               screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    test('should handle order management workflow', async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={['/admin/orders']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitForLoadingToFinish();

      // Should display orders table
      expect(screen.getByText(/orders/i)).toBeInTheDocument();

      // Test order filtering
      const filterSelect = screen.getByRole('combobox', { name: /filter/i });
      if (filterSelect) {
        fireEvent.change(filterSelect, { target: { value: 'pending' } });
        
        await waitFor(() => {
          // Should filter orders by status
          expect(mockAnalyticsService.getOrdersByStatus).toHaveBeenCalledWith('pending');
        });
      }
    });

    test('should handle inventory management workflow', async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={['/admin/inventory']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitForLoadingToFinish();

      // Should display inventory management
      expect(screen.getByText(/inventory/i)).toBeInTheDocument();

      // Test stock update
      const updateButton = screen.getByRole('button', { name: /update stock/i });
      if (updateButton) {
        fireEvent.click(updateButton);
        
        await waitFor(() => {
          expect(screen.getByText(/stock update/i) || 
                 screen.getByRole('dialog')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Real-time Features', () => {
    test('should update notifications in real-time', async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitForLoadingToFinish();

      // Simulate new notification
      const newNotification = {
        id: 'new-1',
        title: 'New Order Alert',
        message: 'Order #1002 has been placed',
        type: 'info',
        timestamp: new Date()
      };

      mockNotificationService.getRecentNotifications.mockResolvedValue([newNotification]);

      // Trigger notification update (this would normally be done via WebSocket or polling)
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      if (refreshButton) {
        fireEvent.click(refreshButton);

        await waitFor(() => {
          expect(screen.getByText('New Order Alert')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Performance', () => {
    test('should lazy load components', async () => {
      const { container } = renderWithProviders(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      // Should show loading state initially
      expect(screen.getByText(/loading/i) || 
             container.querySelector('.loading-spinner')).toBeInTheDocument();

      await waitForLoadingToFinish();

      // Should load content after lazy loading
      expect(screen.getByText(/dashboard overview/i)).toBeInTheDocument();
    });

    test('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeOrderList = Array.from({ length: 1000 }, (_, i) => ({
        id: `order-${i}`,
        customerName: `Customer ${i}`,
        total: Math.random() * 1000,
        status: 'pending'
      }));

      mockAnalyticsService.getOrders.mockResolvedValue(largeOrderList);

      renderWithProviders(
        <MemoryRouter initialEntries={['/admin/orders']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitForLoadingToFinish();

      // Should implement pagination or virtualization
      const orderRows = screen.getAllByRole('row');
      expect(orderRows.length).toBeLessThan(100); // Should not render all 1000 rows
    });
  });

  describe('Accessibility', () => {
    test('should be fully accessible', async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitForLoadingToFinish();

      // Check for proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // Check for proper navigation
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Check for proper form labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });

    test('should support keyboard navigation', async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitForLoadingToFinish();

      // All interactive elements should be focusable
      const buttons = screen.getAllByRole('button');
      const links = screen.getAllByRole('link');
      
      [...buttons, ...links].forEach(element => {
        expect(element).toHaveAttribute('tabIndex', expect.any(String));
      });
    });
  });
});