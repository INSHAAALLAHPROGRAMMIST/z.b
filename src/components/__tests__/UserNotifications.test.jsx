// UserNotifications Component Tests
// Requirements: 2.1, 2.2, 2.3, 2.4

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserNotifications, { NotificationBell, NotificationDropdown } from '../UserNotifications';
import notificationService from '../../services/NotificationService';
import { auth } from '../../firebaseConfig';
import { 
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITIES 
} from '../../models/NotificationModel';

// Mock the notification service
vi.mock('../../services/NotificationService', () => ({
  default: {
    getUserNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    markAllAsRead: vi.fn(),
    subscribeToUserNotifications: vi.fn(),
    subscribeToUnreadCount: vi.fn()
  }
}));

// Mock Firebase auth
vi.mock('../../firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('UserNotifications', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      userId: 'test-user-id',
      type: NOTIFICATION_TYPES.ORDER,
      title: 'Buyurtma tasdiqlandi',
      message: 'Buyurtmangiz #001 tasdiqlandi',
      read: false,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      actionUrl: '/orders/001',
      actionText: 'Buyurtmani ko\'rish',
      data: { orderId: 'order-001' }
    },
    {
      id: 'notif-2',
      userId: 'test-user-id',
      type: NOTIFICATION_TYPES.WISHLIST,
      title: 'Sevimli kitob mavjud',
      message: 'Sevimli kitobingiz endi mavjud',
      read: true,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      createdAt: new Date('2024-01-14T15:30:00Z'),
      actionUrl: '/book/123',
      actionText: 'Xarid qilish',
      data: { bookId: 'book-123' }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth current user
    auth.currentUser = { uid: 'test-user-id' };
    
    // Mock service methods
    notificationService.getUserNotifications.mockResolvedValue({
      notifications: mockNotifications,
      unreadCount: 1
    });
    
    notificationService.getUnreadCount.mockResolvedValue(1);
    notificationService.markAsRead.mockResolvedValue({ success: true });
    notificationService.deleteNotification.mockResolvedValue({ success: true });
    notificationService.markAllAsRead.mockResolvedValue({ success: true, count: 1 });
    
    // Mock real-time listeners
    notificationService.subscribeToUserNotifications.mockReturnValue(() => {});
    notificationService.subscribeToUnreadCount.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('NotificationBell', () => {
    it('should render notification bell with unread count', async () => {
      render(<NotificationBell onClick={() => {}} />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // unread count
      });
    });

    it('should not show count when no unread notifications', async () => {
      notificationService.subscribeToUnreadCount.mockImplementation((userId, callback) => {
        callback(0);
        return () => {};
      });

      render(<NotificationBell onClick={() => {}} />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(screen.queryByText('1')).not.toBeInTheDocument();
      });
    });

    it('should show 99+ for counts over 99', async () => {
      notificationService.subscribeToUnreadCount.mockImplementation((userId, callback) => {
        callback(150);
        return () => {};
      });

      render(<NotificationBell onClick={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });

    it('should call onClick when clicked', () => {
      const mockOnClick = vi.fn();
      render(<NotificationBell onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('UserNotifications with dropdown', () => {
    it('should render notifications dropdown with header', async () => {
      render(<UserNotifications showDropdown={true} />);

      expect(screen.getByText('Bildirishnomalar')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // unread badge
      });
    });

    it('should display notifications list', async () => {
      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: mockNotifications,
          unreadCount: 1
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        expect(screen.getByText('Buyurtma tasdiqlandi')).toBeInTheDocument();
        expect(screen.getByText('Buyurtmangiz #001 tasdiqlandi')).toBeInTheDocument();
        expect(screen.getByText('Sevimli kitob mavjud')).toBeInTheDocument();
        expect(screen.getByText('Sevimli kitobingiz endi mavjud')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<UserNotifications showDropdown={true} />);

      expect(screen.getByText('Yuklanmoqda...')).toBeInTheDocument();
    });

    it('should show empty state when no notifications', async () => {
      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: [],
          unreadCount: 0
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        expect(screen.getByText('Bildirishnomalar yo\'q')).toBeInTheDocument();
      });
    });

    it('should handle mark as read action', async () => {
      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: mockNotifications,
          unreadCount: 1
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        expect(screen.getByText('Buyurtma tasdiqlandi')).toBeInTheDocument();
      });

      // Find mark as read button for unread notification
      const markReadButtons = screen.getAllByTitle('O\'qilgan deb belgilash');
      fireEvent.click(markReadButtons[0]);

      await waitFor(() => {
        expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1');
      });
    });

    it('should handle delete notification action', async () => {
      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: mockNotifications,
          unreadCount: 1
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        expect(screen.getByText('Buyurtma tasdiqlandi')).toBeInTheDocument();
      });

      // Find delete button
      const deleteButtons = screen.getAllByTitle('O\'chirish');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(notificationService.deleteNotification).toHaveBeenCalledWith('notif-1');
      });
    });

    it('should handle mark all as read action', async () => {
      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: mockNotifications,
          unreadCount: 1
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} showMarkAllRead={true} />);

      await waitFor(() => {
        expect(screen.getByTitle('Barchasini o\'qilgan deb belgilash')).toBeInTheDocument();
      });

      // Click mark all as read button
      const markAllReadButton = screen.getByTitle('Barchasini o\'qilgan deb belgilash');
      fireEvent.click(markAllReadButton);

      await waitFor(() => {
        expect(notificationService.markAllAsRead).toHaveBeenCalledWith('test-user-id');
      });
    });

    it('should navigate to action URL when notification is clicked', async () => {
      // Mock window.location
      delete window.location;
      window.location = { href: '' };

      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: mockNotifications,
          unreadCount: 1
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        expect(screen.getByText('Buyurtma tasdiqlandi')).toBeInTheDocument();
      });

      // Click on notification
      const notification = screen.getByText('Buyurtma tasdiqlandi').closest('.notification-item');
      fireEvent.click(notification);

      await waitFor(() => {
        expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1');
        expect(window.location.href).toBe('/orders/001');
      });
    });

    it('should call onClose when close button is clicked', () => {
      const mockOnClose = vi.fn();
      
      render(<UserNotifications showDropdown={true} onClose={mockOnClose} />);

      const closeButton = screen.getByTitle('Yopish');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show "Show All" button when there are more notifications', async () => {
      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: new Array(10).fill(mockNotifications[0]).map((notif, index) => ({
            ...notif,
            id: `notif-${index}`
          })),
          unreadCount: 5
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} maxItems={10} />);

      await waitFor(() => {
        expect(screen.getByText('Barchasini ko\'rish')).toBeInTheDocument();
      });
    });

    it('should format relative dates correctly', async () => {
      const recentNotification = {
        ...mockNotifications[0],
        createdAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      };

      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: [recentNotification],
          unreadCount: 1
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        expect(screen.getByText('5 daqiqa oldin')).toBeInTheDocument();
      });
    });

    it('should display correct notification icons based on type', async () => {
      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: mockNotifications,
          unreadCount: 1
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        // Check for order and wishlist icons
        const icons = screen.getAllByRole('img', { hidden: true });
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it('should apply correct CSS classes for unread notifications', async () => {
      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          notifications: mockNotifications,
          unreadCount: 1
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        const unreadNotification = screen.getByText('Buyurtma tasdiqlandi').closest('.notification-item');
        expect(unreadNotification).toHaveClass('unread');
        
        const readNotification = screen.getByText('Sevimli kitob mavjud').closest('.notification-item');
        expect(readNotification).not.toHaveClass('unread');
      });
    });

    it('should handle error state', async () => {
      notificationService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callback({
          error: 'Network error'
        });
        return () => {};
      });

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('NotificationDropdown', () => {
    it('should render dropdown when open', () => {
      const mockOnClose = vi.fn();
      
      render(<NotificationDropdown isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('notification-dropdown') || screen.getByClassName('notification-dropdown')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      const mockOnClose = vi.fn();
      
      render(<NotificationDropdown isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });

    it('should call onClose when overlay is clicked', () => {
      const mockOnClose = vi.fn();
      
      render(<NotificationDropdown isOpen={true} onClose={mockOnClose} />);

      const overlay = screen.getByClassName('dropdown-overlay') || document.querySelector('.dropdown-overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Guest user handling', () => {
    it('should handle guest user with localStorage ID', async () => {
      auth.currentUser = null;
      localStorageMock.getItem.mockReturnValue('guest_123');

      render(<UserNotifications showDropdown={true} />);

      await waitFor(() => {
        expect(notificationService.subscribeToUserNotifications).toHaveBeenCalledWith(
          'guest_123',
          expect.any(Function),
          expect.any(Object)
        );
      });
    });

    it('should not load notifications when no user ID available', async () => {
      auth.currentUser = null;
      localStorageMock.getItem.mockReturnValue(null);

      render(<UserNotifications showDropdown={true} />);

      // Should not call service methods
      expect(notificationService.subscribeToUserNotifications).not.toHaveBeenCalled();
    });
  });
});