import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnalyticsDashboard from '../AnalyticsDashboard';
import analyticsService from '../../services/AnalyticsService';

// Mock the analytics service
vi.mock('../../services/AnalyticsService', () => ({
  default: {
    getDashboardAnalytics: vi.fn(),
    exportToCSV: vi.fn()
  }
}));

// Mock the sub-dashboard components
vi.mock('../analytics/SalesReportingDashboard', () => ({
  default: ({ data }) => <div data-testid="sales-dashboard">Sales Dashboard: {data ? 'loaded' : 'no data'}</div>
}));

vi.mock('../analytics/InventoryAnalyticsDashboard', () => ({
  default: ({ data }) => <div data-testid="inventory-dashboard">Inventory Dashboard: {data ? 'loaded' : 'no data'}</div>
}));

vi.mock('../analytics/UserBehaviorDashboard', () => ({
  default: ({ data }) => <div data-testid="user-dashboard">User Dashboard: {data ? 'loaded' : 'no data'}</div>
}));

vi.mock('../analytics/PerformanceMonitoringDashboard', () => ({
  default: ({ data }) => <div data-testid="performance-dashboard">Performance Dashboard: {data ? 'loaded' : 'no data'}</div>
}));

vi.mock('../analytics/AlertsPanel', () => ({
  default: ({ alerts }) => <div data-testid="alerts-panel">Alerts: {alerts?.length || 0}</div>
}));

// Mock CSS import
vi.mock('../AnalyticsDashboard.css', () => ({}));

describe('AnalyticsDashboard', () => {
  const mockAnalyticsData = {
    overview: {
      totalRevenue: 50000,
      totalOrders: 100,
      totalBooks: 50,
      totalUsers: 200,
      averageOrderValue: 500,
      conversionRate: 2.5,
      growthRate: 15
    },
    sales: {
      totalRevenue: 50000,
      totalOrders: 100,
      averageOrderValue: 500,
      completedOrders: 80,
      pendingOrders: 15,
      cancelledOrders: 5
    },
    inventory: {
      totalBooks: 50,
      availableBooks: 45,
      outOfStockBooks: 5,
      lowStockCount: 8,
      healthScore: 85
    },
    users: {
      totalUsers: 200,
      activeUsers: 150,
      engagementRate: 75,
      newUsersToday: 5
    },
    performance: {
      systemHealth: 'good',
      databaseResponseTime: 250,
      uptime: '99.9%'
    },
    trends: {
      revenueGrowth: 15,
      ordersGrowth: 12,
      avgOrderValueGrowth: 3
    },
    alerts: [
      {
        type: 'warning',
        category: 'inventory',
        title: 'Low Stock Alert',
        message: '5 books are running low on stock'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService.getDashboardAnalytics.mockResolvedValue({
      success: true,
      data: mockAnalyticsData,
      generatedAt: new Date().toISOString()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    analyticsService.getDashboardAnalytics.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<AnalyticsDashboard />);
    
    expect(screen.getByText('Analitika ma\'lumotlari yuklanmoqda...')).toBeInTheDocument();
  });

  it('should render error state when analytics loading fails', async () => {
    analyticsService.getDashboardAnalytics.mockRejectedValue(new Error('Network error'));
    
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Xato yuz berdi')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should render dashboard with analytics data', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Analitika Dashboard')).toBeInTheDocument();
    });

    // Check if overview metrics are displayed
    expect(screen.getByText('50,000 so\'m')).toBeInTheDocument(); // Total revenue
    expect(screen.getByText('100')).toBeInTheDocument(); // Total orders
    expect(screen.getByText('50')).toBeInTheDocument(); // Total books
    expect(screen.getByText('200')).toBeInTheDocument(); // Total users
  });

  it('should display alerts panel when alerts exist', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('alerts-panel')).toBeInTheDocument();
      expect(screen.getByText('Alerts: 1')).toBeInTheDocument();
    });
  });

  it('should switch between different dashboard tabs', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Analitika Dashboard')).toBeInTheDocument();
    });

    // Initially should show overview
    expect(screen.getByText(/Jami Daromad/)).toBeInTheDocument();

    // Click on sales tab
    fireEvent.click(screen.getByText('Sotuv hisoboti'));
    expect(screen.getByTestId('sales-dashboard')).toBeInTheDocument();

    // Click on inventory tab
    fireEvent.click(screen.getByText('Inventar analitikasi'));
    expect(screen.getByTestId('inventory-dashboard')).toBeInTheDocument();

    // Click on users tab
    fireEvent.click(screen.getByText('Foydalanuvchilar'));
    expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();

    // Click on performance tab
    fireEvent.click(screen.getByText('Tizim holati'));
    expect(screen.getByTestId('performance-dashboard')).toBeInTheDocument();
  });

  it('should handle date range changes', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Analitika Dashboard')).toBeInTheDocument();
    });

    const startDateInput = screen.getByDisplayValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const endDateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);

    // Change start date
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    
    // Change end date
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

    // Should trigger new analytics call
    await waitFor(() => {
      expect(analyticsService.getDashboardAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      );
    });
  });

  it('should handle manual refresh', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Analitika Dashboard')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('↻ Yangilash');
    fireEvent.click(refreshButton);

    // Should call analytics service again
    await waitFor(() => {
      expect(analyticsService.getDashboardAnalytics).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle CSV export', async () => {
    const mockCSVData = 'Date,Revenue,Orders\n2024-01-01,1000,5';
    analyticsService.exportToCSV.mockReturnValue(mockCSVData);
    
    // Mock URL.createObjectURL and related methods
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement and appendChild
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    const mockCreateElement = vi.fn(() => mockLink);
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    
    document.createElement = mockCreateElement;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Analitika Dashboard')).toBeInTheDocument();
    });

    // Hover over export button to show dropdown
    const exportButton = screen.getByText('📥 Eksport');
    fireEvent.mouseEnter(exportButton.parentElement);

    // Click on "Barcha ma'lumotlar" export option
    const exportAllButton = screen.getByText('Barcha ma\'lumotlar');
    fireEvent.click(exportAllButton);

    expect(analyticsService.exportToCSV).toHaveBeenCalledWith(mockAnalyticsData, 'all');
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('should show refreshing indicator during refresh', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Analitika Dashboard')).toBeInTheDocument();
    });

    // Mock a slow refresh
    analyticsService.getDashboardAnalytics.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        data: mockAnalyticsData,
        generatedAt: new Date().toISOString()
      }), 100))
    );

    const refreshButton = screen.getByText('↻ Yangilash');
    fireEvent.click(refreshButton);

    // Should show refreshing state
    expect(screen.getByText('🔄 Yangilash')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('↻ Yangilash')).toBeInTheDocument();
    });
  });

  it('should auto-refresh every 5 minutes', async () => {
    vi.useFakeTimers();
    
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Analitika Dashboard')).toBeInTheDocument();
    });

    // Clear the initial call
    analyticsService.getDashboardAnalytics.mockClear();

    // Fast-forward 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    await waitFor(() => {
      expect(analyticsService.getDashboardAnalytics).toHaveBeenCalledTimes(1);
    });

    vi.useRealTimers();
  });

  it('should display last updated time', async () => {
    const mockDate = new Date('2024-01-01T12:00:00Z');
    analyticsService.getDashboardAnalytics.mockResolvedValue({
      success: true,
      data: mockAnalyticsData,
      generatedAt: mockDate.toISOString()
    });

    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Oxirgi yangilanish:/)).toBeInTheDocument();
    });
  });

  it('should handle retry after error', async () => {
    analyticsService.getDashboardAnalytics.mockRejectedValueOnce(new Error('Network error'));
    
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Mock successful retry
    analyticsService.getDashboardAnalytics.mockResolvedValue({
      success: true,
      data: mockAnalyticsData,
      generatedAt: new Date().toISOString()
    });

    const retryButton = screen.getByText('Qayta urinish');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Analitika Dashboard')).toBeInTheDocument();
    });
  });
});