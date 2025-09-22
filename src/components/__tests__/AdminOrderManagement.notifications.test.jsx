import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AdminOrderManagement from '../AdminOrderManagement';
import TelegramIntegration from '../../services/TelegramIntegration';
import { toast } from '../../utils/toastUtils';

// Mock dependencies
vi.mock('../../services/TelegramIntegration');
vi.mock('../../utils/toastUtils');
vi.mock('../../utils/orderService');
vi.mock('../../utils/firebaseAdmin');

describe('AdminOrderManagement - Telegram Notifications', () => {
  const mockOrders = [
    {
      $id: 'order1',
      $createdAt: '2024-01-15T10:00:00Z',
      userName: 'Test User',
      userEmail: 'test@example.com',
      quantity: 2,
      priceAtTimeOfOrder: 100000,
      status: 'pending',
      user: {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '+998901234567'
      },
      book: {
        $id: 'book1',
        title: 'Test Book',
        imageUrl: 'https://example.com/image.jpg',
        price: 50000
      }
    }
  ];

  beforeEach(() => {
    // Mock orderService
    vi.doMock('../../utils/orderService', () => ({
      getAllOrders: vi.fn().mockResolvedValue({
        documents: mockOrders,
        total: 1
      }),
      updateOrderStatus: vi.fn().mockResolvedValue({ success: true })
    }));

    // Mock TelegramIntegration
    TelegramIntegration.handleOrderStatusChange = vi.fn().mockResolvedValue({
      success: true,
      telegramSent: true,
      message: 'Status updated successfully'
    });

    TelegramIntegration.testConnection = vi.fn().mockResolvedValue({
      success: true,
      message: 'Bot connected successfully'
    });

    TelegramIntegration.telegramService = {
      notifyNewOrder: vi.fn().mockResolvedValue({
        success: true
      })
    };

    // Mock toast
    toast.success = vi.fn();
    toast.error = vi.fn();
    toast.warning = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render notification settings panel', async () => {
    render(<AdminOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bildirishnoma sozlamalari')).toBeInTheDocument();
    });

    expect(screen.getByText('Telegram bildirishnomalarini yoqish')).toBeInTheDocument();
    expect(screen.getByText('Yangi buyurtma haqida xabar berish')).toBeInTheDocument();
    expect(screen.getByText('Holat o\'zgarishi haqida xabar berish')).toBeInTheDocument();
    expect(screen.getByText('Stok tugashi haqida xabar berish')).toBeInTheDocument();
  });

  it('should toggle notification settings', async () => {
    render(<AdminOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bildirishnoma sozlamalari')).toBeInTheDocument();
    });

    // Find toggle by the text next to it
    const telegramSetting = screen.getByText('Telegram bildirishnomalarini yoqish').closest('.notification-setting');
    const telegramToggle = telegramSetting.querySelector('input[type="checkbox"]');
    
    // Initially should be checked
    expect(telegramToggle).toBeChecked();

    // Toggle off
    fireEvent.click(telegramToggle);
    expect(telegramToggle).not.toBeChecked();

    // Toggle back on
    fireEvent.click(telegramToggle);
    expect(telegramToggle).toBeChecked();
  });

  it('should disable sub-settings when Telegram is disabled', async () => {
    render(<AdminOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bildirishnoma sozlamalari')).toBeInTheDocument();
    });

    const telegramSetting = screen.getByText('Telegram bildirishnomalarini yoqish').closest('.notification-setting');
    const telegramToggle = telegramSetting.querySelector('input[type="checkbox"]');
    
    const newOrderSetting = screen.getByText('Yangi buyurtma haqida xabar berish').closest('.notification-setting');
    const newOrderToggle = newOrderSetting.querySelector('input[type="checkbox"]');
    
    const statusChangeSetting = screen.getByText('Holat o\'zgarishi haqida xabar berish').closest('.notification-setting');
    const statusChangeToggle = statusChangeSetting.querySelector('input[type="checkbox"]');

    // Disable Telegram
    fireEvent.click(telegramToggle);

    expect(newOrderToggle).toBeDisabled();
    expect(statusChangeToggle).toBeDisabled();
  });

  it('should test Telegram connection', async () => {
    render(<AdminOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Telegram test')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Telegram test');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(TelegramIntegration.testConnection).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Telegram bot ulandi: Bot connected successfully');
    });
  });

  it('should send test notification', async () => {
    render(<AdminOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test xabar yuborish')).toBeInTheDocument();
    });

    const testNotificationButton = screen.getByText('Test xabar yuborish');
    fireEvent.click(testNotificationButton);

    await waitFor(() => {
      expect(TelegramIntegration.telegramService.notifyNewOrder).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Test bildirishnoma yuborildi');
    });
  });

  it('should send notification when order status is updated', async () => {
    render(<AdminOrderManagement />);

    // Wait for orders to load
    await waitFor(() => {
      expect(screen.getByText('#order1')).toBeInTheDocument();
    });

    // Click edit button for first order
    const editButtons = screen.getAllByTitle('Holatni yangilash');
    fireEvent.click(editButtons[0]);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Buyurtma holatini yangilash')).toBeInTheDocument();
    });

    // Change status
    const statusSelect = screen.getByDisplayValue('Kutilmoqda');
    fireEvent.change(statusSelect, { target: { value: 'processing' } });

    // Submit form
    const saveButton = screen.getByText('Saqlash');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(TelegramIntegration.handleOrderStatusChange).toHaveBeenCalledWith('order1', 'processing');
      expect(toast.success).toHaveBeenCalledWith('Buyurtma holati yangilandi va bildirishnoma yuborildi');
    });
  });

  it('should handle notification failure gracefully', async () => {
    // Mock notification failure
    TelegramIntegration.handleOrderStatusChange = vi.fn().mockResolvedValue({
      success: true,
      telegramSent: false,
      message: 'Status updated but notification failed'
    });

    render(<AdminOrderManagement />);

    // Wait for orders to load
    await waitFor(() => {
      expect(screen.getByText('#order1')).toBeInTheDocument();
    });

    // Click edit button for first order
    const editButtons = screen.getAllByTitle('Holatni yangilash');
    fireEvent.click(editButtons[0]);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Buyurtma holatini yangilash')).toBeInTheDocument();
    });

    // Change status
    const statusSelect = screen.getByDisplayValue('Kutilmoqda');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    // Submit form
    const saveButton = screen.getByText('Saqlash');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith('Buyurtma holati yangilandi, lekin bildirishnoma yuborilmadi');
    });
  });

  it('should not send notification when disabled', async () => {
    render(<AdminOrderManagement />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Bildirishnoma sozlamalari')).toBeInTheDocument();
    });

    // Disable notifications
    const telegramSetting = screen.getByText('Telegram bildirishnomalarini yoqish').closest('.notification-setting');
    const telegramToggle = telegramSetting.querySelector('input[type="checkbox"]');
    fireEvent.click(telegramToggle);

    // Wait for orders to load
    await waitFor(() => {
      expect(screen.getByText('#order1')).toBeInTheDocument();
    });

    // Click edit button for first order
    const editButtons = screen.getAllByTitle('Holatni yangilash');
    fireEvent.click(editButtons[0]);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Buyurtma holatini yangilash')).toBeInTheDocument();
    });

    // Change status
    const statusSelect = screen.getByDisplayValue('Kutilmoqda');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    // Submit form
    const saveButton = screen.getByText('Saqlash');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(TelegramIntegration.handleOrderStatusChange).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Buyurtma holati yangilandi');
    });
  });

  it('should open notification history modal', async () => {
    render(<AdminOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bildirishnomalar')).toBeInTheDocument();
    });

    const historyButton = screen.getByText('Bildirishnomalar');
    fireEvent.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText('Bildirishnoma tarixi')).toBeInTheDocument();
      expect(screen.getByText('Hali bildirishnoma tarixi yo\'q')).toBeInTheDocument();
    });
  });

  it('should display notification history after sending notifications', async () => {
    render(<AdminOrderManagement />);

    // Send a test notification first
    await waitFor(() => {
      expect(screen.getByText('Test xabar yuborish')).toBeInTheDocument();
    });

    const testNotificationButton = screen.getByText('Test xabar yuborish');
    fireEvent.click(testNotificationButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Test bildirishnoma yuborildi');
    });

    // Open notification history
    const historyButton = screen.getByText('Bildirishnomalar');
    fireEvent.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText('Bildirishnoma tarixi')).toBeInTheDocument();
      expect(screen.getByText('#TEST')).toBeInTheDocument();
      expect(screen.getByText('Test bildirishnoma yuborildi')).toBeInTheDocument();
    });
  });

  it('should handle Telegram connection test failure', async () => {
    // Mock connection failure
    TelegramIntegration.testConnection = vi.fn().mockResolvedValue({
      success: false,
      error: 'Bot token invalid'
    });

    render(<AdminOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Telegram test')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Telegram test');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Telegram bot ulanmadi: Bot token invalid');
    });
  });

  it('should handle test notification failure', async () => {
    // Mock test notification failure
    TelegramIntegration.telegramService.notifyNewOrder = vi.fn().mockResolvedValue({
      success: false,
      error: 'Network error'
    });

    render(<AdminOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test xabar yuborish')).toBeInTheDocument();
    });

    const testNotificationButton = screen.getByText('Test xabar yuborish');
    fireEvent.click(testNotificationButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Test bildirishnoma yuborilmadi: Network error');
    });
  });
});