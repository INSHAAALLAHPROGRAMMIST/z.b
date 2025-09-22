// NotificationCenter Component Tests
// Requirements: 2.1, 2.2, 2.3, 2.4

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationCenter from '../NotificationCenter';
import notificationService from '../../../services/NotificationService';
import { 
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITIES 
} from '../../../models/NotificationModel';

// Mock the notification service
vi.mock('../../../services/NotificationService', () => ({
  default: {
    getAllNotifications: vi.fn(),
    getNotificationStats: vi.fn(),
    markAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    createNotification: vi.fn()
  }
}));

// Mock AdminButton and AdminModal components
vi.mock('../AdminButton', () => ({
  default: ({ children, onClick, loading, disabled, icon, variant }) => (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      className={`admin-btn ${variant}`}
      data-testid="admin-button"
    >
      {icon && <i className={icon}></i>}
      {loading ? 'Loading...' : children}
    </button>
  )
}));

vi.mock('../AdminModal', () => ({
  default: ({ children, title, onClose }) => (
    <div data-testid="admin-modal">
      <div className="modal-header">
        <h3>{title}</h3>
        <button onClick={onClose} data-testid="modal-close">×</button>
      </div>
      <div className="modal-content">{children}</div>
    </div>
  )
}));

describe('NotificationCenter', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      userId: 'user-123',
      type: NOTIFICATION_TYPES.ORDER,
      title: 'Yangi buyurtma',
      message: 'Yangi buyurtma #001 yaratildi',
      read: false,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      data: { orderId: 'order-123' }
    },
    {
      id: 'notif-2',
      userId: 'user-456',
      type: NOTIFICATION_TYPES.WISHLIST,
      title: 'Sevimli kitob mavjud',
      message: 'Sevimli kitobingiz endi mavjud',
      read: true,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      createdAt: new Date('2024-01-14T15:30:00Z'),
      data: { bookId: 'book-456' }
    }
  ];

  const mockStats = {
    total: 2,
    read: 1,
    unread: 1,
    byType: {
      [NOTIFICATION_TYPES.ORDER]: 1,
      [NOTIFICATION_TYPES.WISHLIST]: 1
    },
    byPriority: {
      [NOTIFICATION_PRIORITIES.HIGH]: 1,
      [NOTIFICATION_PRIORITIES.MEDIUM]: 1
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    notificationService.getAllNotifications.mockResolvedValue({
      notifications: mockNotifications,
      hasMore: false,
      lastDoc: null
    });
    
    notificationService.getNotificationStats.mockResolvedValue(mockStats);
    notificationService.markAsRead.mockResolvedValue({ success: true });
    notificationService.deleteNotification.mockResolvedValue({ success: true });
    notificationService.createNotification.mockResolvedValue({ id: 'new-notif' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render notification center with header and stats', async () => {
    render(<NotificationCenter />);

    // Check header
    expect(screen.getByText('Bildirishnomalar Markazi')).toBeInTheDocument();

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('Jami:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('O\'qilmagan:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('O\'qilgan:')).toBeInTheDocument();
    });
  });

  it('should display notifications list', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Yangi buyurtma')).toBeInTheDocument();
      expect(screen.getByText('Yangi buyurtma #001 yaratildi')).toBeInTheDocument();
      expect(screen.getByText('Sevimli kitob mavjud')).toBeInTheDocument();
      expect(screen.getByText('Sevimli kitobingiz endi mavjud')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    render(<NotificationCenter />);

    expect(screen.getByText('Bildirishnomalar yuklanmoqda...')).toBeInTheDocument();
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // spinner
  });

  it('should handle mark as read action', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Yangi buyurtma')).toBeInTheDocument();
    });

    // Find and click mark as read button for unread notification
    const markReadButtons = screen.getAllByText('O\'qilgan');
    fireEvent.click(markReadButtons[0]);

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1');
    });
  });

  it('should handle delete notification action', async () => {
    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Yangi buyurtma')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByText('O\'chirish');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Bu bildirishnomani o\'chirishni xohlaysizmi?');
      expect(notificationService.deleteNotification).toHaveBeenCalledWith('notif-1');
    });
  });

  it('should open create notification modal', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Yangi Bildirishnoma')).toBeInTheDocument();
    });

    // Click create notification button
    const createButton = screen.getByText('Yangi Bildirishnoma');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('admin-modal')).toBeInTheDocument();
      expect(screen.getByText('Yangi Bildirishnoma Yaratish')).toBeInTheDocument();
    });
  });

  it('should filter notifications by type', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Yangi buyurtma')).toBeInTheDocument();
    });

    // Find type filter dropdown
    const typeFilter = screen.getByDisplayValue('Barchasi');
    fireEvent.change(typeFilter, { target: { value: NOTIFICATION_TYPES.ORDER } });

    await waitFor(() => {
      expect(notificationService.getAllNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NOTIFICATION_TYPES.ORDER
        })
      );
    });
  });

  it('should filter notifications by priority', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Yangi buyurtma')).toBeInTheDocument();
    });

    // Find priority filter dropdown
    const priorityFilters = screen.getAllByDisplayValue('Barchasi');
    const priorityFilter = priorityFilters[1]; // Second "Barchasi" is for priority
    fireEvent.change(priorityFilter, { target: { value: NOTIFICATION_PRIORITIES.HIGH } });

    await waitFor(() => {
      expect(notificationService.getAllNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: NOTIFICATION_PRIORITIES.HIGH
        })
      );
    });
  });

  it('should handle bulk mark all as read', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Barchasini O\'qilgan Deb Belgilash')).toBeInTheDocument();
    });

    // Click bulk mark as read button
    const bulkMarkReadButton = screen.getByText('Barchasini O\'qilgan Deb Belgilash');
    fireEvent.click(bulkMarkReadButton);

    await waitFor(() => {
      // Should call markAsRead for unread notifications
      expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1');
    });
  });

  it('should handle bulk delete all', async () => {
    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Barchasini O\'chirish')).toBeInTheDocument();
    });

    // Click bulk delete button
    const bulkDeleteButton = screen.getByText('Barchasini O\'chirish');
    fireEvent.click(bulkDeleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Barcha bildirishnomalarni o\'chirishni xohlaysizmi?');
      expect(notificationService.deleteNotification).toHaveBeenCalledTimes(2);
    });
  });

  it('should refresh notifications', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Yangilash')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Yangilash');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(notificationService.getAllNotifications).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('should display empty state when no notifications', async () => {
    notificationService.getAllNotifications.mockResolvedValue({
      notifications: [],
      hasMore: false,
      lastDoc: null
    });

    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Bildirishnomalar topilmadi')).toBeInTheDocument();
    });
  });

  it('should display error message on error', async () => {
    const errorMessage = 'Database connection failed';
    notificationService.getAllNotifications.mockRejectedValue(new Error(errorMessage));

    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should show notification details modal', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Yangi buyurtma')).toBeInTheDocument();
    });

    // Click view button
    const viewButtons = screen.getAllByText('Ko\'rish');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Bildirishnoma Tafsilotlari')).toBeInTheDocument();
    });
  });

  it('should handle create notification form submission', async () => {
    render(<NotificationCenter />);

    // Open create modal
    await waitFor(() => {
      const createButton = screen.getByText('Yangi Bildirishnoma');
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('admin-modal')).toBeInTheDocument();
    });

    // Fill form (simplified - in real test would fill all required fields)
    const userIdInput = screen.getByPlaceholderText('Foydalanuvchi ID kiriting');
    const titleInput = screen.getByPlaceholderText('Bildirishnoma sarlavhasi');
    const messageInput = screen.getByPlaceholderText('Bildirishnoma matni');

    fireEvent.change(userIdInput, { target: { value: 'user-123' } });
    fireEvent.change(titleInput, { target: { value: 'Test Notification' } });
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    // Submit form
    const submitButton = screen.getByText('Yuborish');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          title: 'Test Notification',
          message: 'Test message'
        })
      );
    });
  });

  it('should display correct priority badges', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });
  });

  it('should display correct notification types', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('order')).toBeInTheDocument();
      expect(screen.getByText('wishlist')).toBeInTheDocument();
    });
  });

  it('should format dates correctly', async () => {
    render(<NotificationCenter />);

    await waitFor(() => {
      // Check if dates are displayed (format may vary based on locale)
      const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });
});