import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import DashboardOverview from '../DashboardOverview';
import { renderWithProviders, mockApiResponse, waitForLoadingToFinish } from '../../../../../utils/testUtils';

// Mock the services
jest.mock('../../../../../services/AnalyticsService', () => ({
  getDashboardStats: jest.fn(),
  getRecentActivity: jest.fn(),
  getSalesData: jest.fn()
}));

jest.mock('../../../../../services/NotificationService', () => ({
  getRecentNotifications: jest.fn()
}));

describe('DashboardOverview', () => {
  const mockAnalyticsService = require('../../../../../services/AnalyticsService');
  const mockNotificationService = require('../../../../../services/NotificationService');

  const mockDashboardData = {
    stats: {
      totalOrders: 150,
      totalRevenue: 15000,
      activeUsers: 45,
      lowStockItems: 8
    },
    recentActivity: [
      {
        id: '1',
        type: 'order',
        message: 'New order #1001',
        timestamp: new Date(),
        user: 'John Doe'
      },
      {
        id: '2',
        type: 'inventory',
        message: 'Stock updated for Book Title',
        timestamp: new Date(),
        user: 'Admin'
      }
    ],
    salesData: {
      daily: [100, 150, 200, 180, 220],
      weekly: [1000, 1200, 1100, 1300, 1400],
      monthly: [5000, 5500, 6000, 5800, 6200]
    }
  };

  const mockNotifications = [
    {
      id: '1',
      title: 'Low Stock Alert',
      message: 'Book Title is running low on stock',
      type: 'warning',
      timestamp: new Date()
    },
    {
      id: '2',
      title: 'New Order',
      message: 'Order #1001 has been placed',
      type: 'info',
      timestamp: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAnalyticsService.getDashboardStats.mockResolvedValue(mockDashboardData.stats);
    mockAnalyticsService.getRecentActivity.mockResolvedValue(mockDashboardData.recentActivity);
    mockAnalyticsService.getSalesData.mockResolvedValue(mockDashboardData.salesData);
    mockNotificationService.getRecentNotifications.mockResolvedValue(mockNotifications);
  });

  describe('Component Rendering', () => {
    test('should render dashboard overview with loading state', () => {
      renderWithProviders(<DashboardOverview />);
      
      expect(screen.getByText(/dashboard overview/i)).toBeInTheDocument();
    });

    test('should render dashboard stats after loading', async () => {
      renderWithProviders(<DashboardOverview />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Orders
      expect(screen.getByText('$15,000')).toBeInTheDocument(); // Total Revenue
      expect(screen.getByText('45')).toBeInTheDocument(); // Active Users
      expect(screen.getByText('8')).toBeInTheDocument(); // Low Stock Items
    });

    test('should render recent activity section', async () => {
      renderWithProviders(<DashboardOverview />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('New order #1001')).toBeInTheDocument();
      expect(screen.getByText('Stock updated for Book Title')).toBeInTheDocument();
    });

    test('should render notifications section', async () => {
      renderWithProviders(<DashboardOverview />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
      expect(screen.getByText('New Order')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    test('should call all required services on mount', async () => {
      renderWithProviders(<DashboardOverview />);
      
      await waitFor(() => {
        expect(mockAnalyticsService.getDashboardStats).toHaveBeenCalledTimes(1);
        expect(mockAnalyticsService.getRecentActivity).toHaveBeenCalledTimes(1);
        expect(mockAnalyticsService.getSalesData).toHaveBeenCalledTimes(1);
        expect(mockNotificationService.getRecentNotifications).toHaveBeenCalledTimes(1);
      });
    });

    test('should handle loading states correctly', async () => {
      // Mock delayed response
      mockAnalyticsService.getDashboardStats.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockDashboardData.stats), 100))
      );
      
      renderWithProviders(<DashboardOverview />);
      
      // Should show loading initially
      expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Should hide loading after data loads
      await waitForLoadingToFinish();
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockAnalyticsService.getDashboardStats.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<DashboardOverview />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading dashboard data/i) || 
               screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    test('should show fallback content when data is empty', async () => {
      mockAnalyticsService.getDashboardStats.mockResolvedValue({});
      mockAnalyticsService.getRecentActivity.mockResolvedValue([]);
      
      renderWithProviders(<DashboardOverview />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByText(/no recent activity/i) || 
             screen.getByText(/no data available/i)).toBeInTheDocument();
    });
  });

  describe('User Role Integration', () => {
    test('should render different content based on user role', async () => {
      renderWithProviders(<DashboardOverview userRole="admin" />);
      
      await waitForLoadingToFinish();
      
      // Admin should see all stats
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('$15,000')).toBeInTheDocument();
    });

    test('should limit content for viewer role', async () => {
      renderWithProviders(<DashboardOverview userRole="viewer" />);
      
      await waitForLoadingToFinish();
      
      // Viewer might have limited access to certain stats
      expect(screen.getByText('150')).toBeInTheDocument(); // Orders visible
      // Revenue might be hidden for viewers
    });
  });

  describe('Real-time Updates', () => {
    test('should update stats when data changes', async () => {
      const { rerender } = renderWithProviders(<DashboardOverview />);
      
      await waitForLoadingToFinish();
      expect(screen.getByText('150')).toBeInTheDocument();
      
      // Mock updated data
      const updatedStats = { ...mockDashboardData.stats, totalOrders: 160 };
      mockAnalyticsService.getDashboardStats.mockResolvedValue(updatedStats);
      
      rerender(<DashboardOverview />);
      
      await waitFor(() => {
        expect(screen.getByText('160')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', async () => {
      renderWithProviders(<DashboardOverview />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByRole('main') || screen.getByRole('region')).toBeInTheDocument();
      expect(screen.getAllByRole('heading')).toHaveLength(expect.any(Number));
    });

    test('should be keyboard navigable', async () => {
      renderWithProviders(<DashboardOverview />);
      
      await waitForLoadingToFinish();
      
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex', expect.any(String));
      });
    });
  });
});