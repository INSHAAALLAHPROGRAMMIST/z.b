import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import analyticsService from '../../services/AnalyticsService';
import { getDocs, query, collection, where, orderBy, limit } from 'firebase/firestore';
import telegramService from '../../services/TelegramService';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  query: vi.fn(),
  collection: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirestore: vi.fn(),
  initializeApp: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() }))
  }
}));

// Mock Firebase config
vi.mock('../../firebaseConfig', () => ({
  db: {},
  COLLECTIONS: {
    BOOKS: 'books',
    ORDERS: 'orders',
    USERS: 'users'
  }
}));

// Mock Telegram service
vi.mock('../../services/TelegramService', () => ({
  default: {
    isConfigured: vi.fn(() => true),
    notifyLowStock: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDashboardAnalytics', () => {
    it('should return comprehensive analytics data', async () => {
      // Mock the individual methods instead of mocking Firestore directly
      vi.spyOn(analyticsService, 'getSalesAnalytics').mockResolvedValue({
        totalRevenue: 1000,
        totalOrders: 10,
        averageOrderValue: 100
      });
      
      vi.spyOn(analyticsService, 'getInventoryAnalytics').mockResolvedValue({
        totalBooks: 50,
        availableBooks: 45,
        lowStockBooks: []
      });
      
      vi.spyOn(analyticsService, 'getUserAnalytics').mockResolvedValue({
        totalUsers: 100,
        activeUsers: 80
      });
      
      vi.spyOn(analyticsService, 'getPerformanceMetrics').mockResolvedValue({
        systemHealth: 'good'
      });
      
      vi.spyOn(analyticsService, 'getTrendsAnalytics').mockResolvedValue({
        revenueGrowth: 10
      });

      const result = await analyticsService.getDashboardAnalytics();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('overview');
      expect(result.data).toHaveProperty('sales');
      expect(result.data).toHaveProperty('inventory');
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('performance');
      expect(result.data).toHaveProperty('trends');
      expect(result.data).toHaveProperty('alerts');
    });

    it('should handle errors gracefully', async () => {
      getDocs.mockRejectedValue(new Error('Database error'));

      await expect(analyticsService.getDashboardAnalytics()).rejects.toThrow('Dashboard analitikasini olishda xato');
    });
  });

  describe('getSalesAnalytics', () => {
    it('should calculate sales metrics correctly', async () => {
      const mockSnapshot = {
        forEach: vi.fn((callback) => {
          [
            {
              data: () => ({
                totalAmount: 500,
                status: 'completed',
                createdAt: { toDate: () => new Date('2024-01-01') },
                items: [{ bookId: '1', title: 'Book 1', quantity: 2, price: 250 }],
                userId: 'user1',
                customer: { name: 'Customer 1', email: 'customer1@test.com' }
              })
            },
            {
              data: () => ({
                totalAmount: 300,
                status: 'pending',
                createdAt: { toDate: () => new Date('2024-01-02') },
                items: [{ bookId: '2', title: 'Book 2', quantity: 1, price: 300 }],
                userId: 'user2',
                customer: { name: 'Customer 2', email: 'customer2@test.com' }
              })
            }
          ].forEach(callback);
        })
      };

      getDocs.mockResolvedValue(mockSnapshot);

      const result = await analyticsService.getSalesAnalytics();

      expect(result.totalRevenue).toBe(800);
      expect(result.totalOrders).toBe(2);
      expect(result.completedOrders).toBe(1);
      expect(result.pendingOrders).toBe(1);
      expect(result.averageOrderValue).toBe(400);
      expect(result.topBooks).toHaveLength(2);
      expect(result.topCustomers).toHaveLength(2);
    });
  });

  describe('getInventoryAnalytics', () => {
    it('should analyze inventory correctly', async () => {
      const mockSnapshot = {
        forEach: vi.fn((callback) => {
          [
            { id: '1', data: () => ({ title: 'Book 1', price: 100, isAvailable: true, inventory: { stock: 25, lowStockThreshold: 5 } }) },
            { id: '2', data: () => ({ title: 'Book 2', price: 200, isAvailable: true, stock: 3, inventory: { lowStockThreshold: 5 } }) },
            { id: '3', data: () => ({ title: 'Book 3', price: 150, isAvailable: false, stock: 0, inventory: { lowStockThreshold: 5 } }) }
          ].forEach(callback);
        })
      };

      getDocs.mockResolvedValue(mockSnapshot);

      const result = await analyticsService.getInventoryAnalytics();

      expect(result.totalBooks).toBe(3);
      expect(result.availableBooks).toBe(2);
      expect(result.outOfStockBooks).toBe(1);
      expect(result.lowStockBooks).toHaveLength(1); // Only Book 2 has low stock (2 <= 5)
      expect(result.totalInventoryValue).toBe(3100); // (25*100) + (3*200) + (0*150)
      expect(result.healthScore).toBeGreaterThan(0);
    });
  });

  describe('getUserAnalytics', () => {
    it('should analyze user behavior correctly', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const mockSnapshot = {
        forEach: vi.fn((callback) => {
          [
            { 
              data: () => ({ 
                isActive: true, 
                isAdmin: false, 
                isVerified: true, 
                createdAt: { toDate: () => new Date('2024-01-01') },
                lastLoginAt: { toDate: () => oneDayAgo }
              }) 
            },
            { 
              data: () => ({ 
                isActive: true, 
                isAdmin: true, 
                isVerified: false, 
                createdAt: { toDate: () => new Date('2024-01-02') },
                lastLoginAt: { toDate: () => oneWeekAgo }
              }) 
            },
            { 
              data: () => ({ 
                isActive: false, 
                isAdmin: false, 
                isVerified: true, 
                createdAt: { toDate: () => new Date('2024-01-03') }
              }) 
            }
          ].forEach(callback);
        })
      };

      getDocs.mockResolvedValue(mockSnapshot);

      const result = await analyticsService.getUserAnalytics();

      expect(result.totalUsers).toBe(3);
      expect(result.activeUsers).toBe(2);
      expect(result.adminUsers).toBe(1);
      expect(result.verifiedUsers).toBe(2);
      expect(result.userActivity.daily).toBe(1);
      expect(result.userActivity.weekly).toBe(1);
      expect(result.userActivity.inactive).toBe(1);
    });
  });

  describe('generateAlerts', () => {
    it('should generate low stock alerts', async () => {
      const mockAnalytics = {
        inventory: {
          lowStockBooks: [
            { id: '1', title: 'Book 1', stock: 1, threshold: 5 },
            { id: '2', title: 'Book 2', stock: 2, threshold: 5 }
          ]
        },
        trends: { revenueGrowth: 5 },
        performance: { systemHealth: 'good' },
        sales: { pendingOrders: 5 }
      };

      const alerts = await analyticsService.generateAlerts(mockAnalytics);

      expect(alerts).toHaveLength(1); // Only critical alert for books with stock <= 2
      expect(alerts[0].type).toBe('critical');
      expect(alerts[0].category).toBe('inventory');
    });

    it('should generate revenue decline alerts', async () => {
      const mockAnalytics = {
        inventory: { lowStockBooks: [] },
        trends: { revenueGrowth: -15 },
        performance: { systemHealth: 'good' },
        sales: { pendingOrders: 5 }
      };

      const alerts = await analyticsService.generateAlerts(mockAnalytics);

      expect(alerts.some(alert => alert.category === 'sales' && alert.type === 'warning')).toBe(true);
    });

    it('should generate system health alerts', async () => {
      const mockAnalytics = {
        inventory: { lowStockBooks: [] },
        trends: { revenueGrowth: 5 },
        performance: { systemHealth: 'poor', databaseResponseTime: 5000 },
        sales: { pendingOrders: 5 }
      };

      const alerts = await analyticsService.generateAlerts(mockAnalytics);

      expect(alerts.some(alert => alert.category === 'system' && alert.type === 'critical')).toBe(true);
    });

    it('should send Telegram notifications for critical stock', async () => {
      const mockAnalytics = {
        inventory: {
          lowStockBooks: [
            { id: '1', title: 'Book 1', stock: 1, threshold: 5 }
          ]
        },
        trends: { revenueGrowth: 5 },
        performance: { systemHealth: 'good' },
        sales: { pendingOrders: 5 }
      };

      await analyticsService.generateAlerts(mockAnalytics);

      expect(telegramService.notifyLowStock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Book 1', stock: 1 })
      );
    });
  });

  describe('exportToCSV', () => {
    it('should export sales data to CSV format', () => {
      const mockAnalytics = {
        sales: {
          salesChartData: [
            { date: '2024-01-01', revenue: 500, orders: 2 },
            { date: '2024-01-02', revenue: 300, orders: 1 }
          ]
        }
      };

      const csv = analyticsService.exportToCSV(mockAnalytics, 'sales');

      expect(csv).toContain('Date,Revenue,Orders,Average Order Value');
      expect(csv).toContain('2024-01-01,500,2,250');
      expect(csv).toContain('2024-01-02,300,1,300');
    });

    it('should export inventory data to CSV format', () => {
      const mockAnalytics = {
        inventory: {
          lowStockBooks: [
            { title: 'Book 1', authorName: 'Author 1', stock: 2, threshold: 5 },
            { title: 'Book 2', authorName: 'Author 2', stock: 0, threshold: 5 }
          ]
        }
      };

      const csv = analyticsService.exportToCSV(mockAnalytics, 'inventory');

      expect(csv).toContain('Book Title,Author,Stock,Threshold,Status');
      expect(csv).toContain('"Book 1","Author 1",2,5,Low Stock');
      expect(csv).toContain('"Book 2","Author 2",0,5,Out of Stock');
    });
  });

  describe('calculateGrowthRate', () => {
    it('should calculate positive growth rate', () => {
      const growthRate = analyticsService.calculateGrowthRate(100, 150);
      expect(growthRate).toBe(50);
    });

    it('should calculate negative growth rate', () => {
      const growthRate = analyticsService.calculateGrowthRate(150, 100);
      expect(growthRate).toBeCloseTo(-33.33, 2);
    });

    it('should handle zero old value', () => {
      const growthRate = analyticsService.calculateGrowthRate(0, 100);
      expect(growthRate).toBe(100);
    });

    it('should handle zero new value', () => {
      const growthRate = analyticsService.calculateGrowthRate(100, 0);
      expect(growthRate).toBe(-100);
    });
  });

  describe('calculateConversionRate', () => {
    it('should calculate conversion rate correctly', () => {
      const conversionRate = analyticsService.calculateConversionRate(1000, 50);
      expect(conversionRate).toBe(5);
    });

    it('should handle zero users', () => {
      const conversionRate = analyticsService.calculateConversionRate(0, 50);
      expect(conversionRate).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const conversionRate = analyticsService.calculateConversionRate(333, 10);
      expect(conversionRate).toBe(3);
    });
  });
});