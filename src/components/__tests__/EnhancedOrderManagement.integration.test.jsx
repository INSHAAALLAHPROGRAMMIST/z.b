/**
 * Enhanced Order Management Integration Tests
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnhancedOrderManagement from '../EnhancedOrderManagement';
import EnhancedOrderService from '../../services/EnhancedOrderService';
import { OrderModel, OrderStatus, PaymentStatus } from '../../models/OrderModel';
import { toast } from '../../utils/toastUtils';

// Mock dependencies
vi.mock('../../services/EnhancedOrderService');
vi.mock('../../utils/toastUtils');
vi.mock('../../utils/formatUtils', () => ({
  formatDate: vi.fn((date) => date ? new Date(date).toLocaleDateString() : 'N/A'),
  formatCurrency: vi.fn((amount) => `${amount?.toLocaleString() || 0} so'm`),
  formatRelativeTime: vi.fn(() => '2 hours ago')
}));

describe('EnhancedOrderManagement Integration', () => {
  const mockOrders = [
    new OrderModel({
      id: 'order1',
      orderNumber: 'ORD-20240115-123456',
      userId: 'user1',
      status: OrderStatus.PENDING,
      totalAmount: 150000,
      customer: {
        name: 'John Doe',
        phone: '+998901234567',
        email: 'john@example.com'
      },
      payment: {
        status: PaymentStatus.PENDING,
        method: 'cash'
      },
      shipping: {
        method: 'delivery',
        trackingNumber: null
      },
      items: [
        {
          bookId: 'book1',
          bookTitle: 'Test Book 1',
          quantity: 2,
          unitPrice: 75000,
          totalPrice: 150000
        }
      ],
      timestamps: {
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z')
      }
    }),
    new OrderModel({
      id: 'order2',
      orderNumber: 'ORD-20240115-789012',
      userId: 'user2',
      status: OrderStatus.SHIPPED,
      totalAmount: 85000,
      customer: {
        name: 'Jane Smith',
        phone: '+998907654321',
        email: 'jane@example.com'
      },
      payment: {
        status: PaymentStatus.PAID,
        method: 'card'
      },
      shipping: {
        method: 'courier',
        trackingNumber: 'TRK123456'
      },
      items: [
        {
          bookId: 'book2',
          bookTitle: 'Test Book 2',
          quantity: 1,
          unitPrice: 85000,
          totalPrice: 85000
        }
      ],
      timestamps: {
        createdAt: new Date('2024-01-14T15:30:00Z'),
        updatedAt: new Date('2024-01-15T09:00:00Z')
      }
    })
  ];

  const mockAnalytics = {
    totalOrders: 2,
    totalRevenue: 235000,
    averageOrderValue: 117500,
    statusBreakdown: {
      [OrderStatus.PENDING]: 1,
      [OrderStatus.SHIPPED]: 1
    },
    paymentBreakdown: {
      [PaymentStatus.PENDING]: 1,
      [PaymentStatus.PAID]: 1
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service methods
    EnhancedOrderService.getOrders.mockResolvedValue({
      documents: mockOrders,
      total: mockOrders.length,
      hasMore: false
    });
    
    EnhancedOrderService.getOrderAnalytics.mockResolvedValue({
      success: true,
      data: mockAnalytics
    });
    
    EnhancedOrderService.searchOrders.mockResolvedValue({
      documents: [],
      total: 0
    });
    
    EnhancedOrderService.updateOrderStatus.mockResolvedValue(mockOrders[0]);
    EnhancedOrderService.updateShippingInfo.mockResolvedValue(mockOrders[0]);
    EnhancedOrderService.updatePaymentStatus.mockResolvedValue(mockOrders[0]);
    EnhancedOrderService.cancelOrder.mockResolvedValue(mockOrders[0]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render order management interface', async () => {
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('Buyurtmalar boshqaruvi')).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/Buyurtma raqami, mijoz nomi yoki telefon/)).toBeInTheDocument();
      expect(screen.getByText('Analitika')).toBeInTheDocument();
      expect(screen.getByText('Yangilash')).toBeInTheDocument();
    });

    it('should display orders table with data', async () => {
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('ORD-20240115-123456')).toBeInTheDocument();
        expect(screen.getByText('ORD-20240115-789012')).toBeInTheDocument();
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('150000 so\'m')).toBeInTheDocument();
      expect(screen.getByText('85000 so\'m')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      EnhancedOrderService.getOrders.mockImplementation(() => new Promise(() => {}));
      
      render(<EnhancedOrderManagement />);

      expect(screen.getByText('Yuklanmoqda...')).toBeInTheDocument();
    });

    it('should show error state when loading fails', async () => {
      const errorMessage = 'Failed to load orders';
      EnhancedOrderService.getOrders.mockRejectedValue(new Error(errorMessage));

      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText(`Xato: ${errorMessage}`)).toBeInTheDocument();
      });
    });
  });

  describe('Analytics Panel', () => {
    it('should toggle analytics panel', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('Analitika')).toBeInTheDocument();
      });

      const analyticsButton = screen.getByText('Analitika');
      await user.click(analyticsButton);

      await waitFor(() => {
        expect(screen.getByText('Buyurtmalar analitikasi')).toBeInTheDocument();
        expect(screen.getByText('Jami buyurtmalar')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('235000 so\'m')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter orders by status', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Barcha holatlar')).toBeInTheDocument();
      });

      const statusFilter = screen.getByDisplayValue('Barcha holatlar');
      await user.selectOptions(statusFilter, OrderStatus.PENDING);

      await waitFor(() => {
        expect(EnhancedOrderService.getOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            status: OrderStatus.PENDING
          })
        );
      });
    });

    it('should search orders by query', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Buyurtma raqami, mijoz nomi yoki telefon/)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Buyurtma raqami, mijoz nomi yoki telefon/);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(EnhancedOrderService.searchOrders).toHaveBeenCalledWith('John', expect.any(Object));
      });
    });

    it('should filter by date range', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getAllByDisplayValue('')).toHaveLength(2); // Two date inputs
      });

      const dateInputs = screen.getAllByDisplayValue('');
      const startDateInput = dateInputs[0];
      
      await user.type(startDateInput, '2024-01-01');

      await waitFor(() => {
        expect(EnhancedOrderService.getOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            dateRange: expect.objectContaining({
              start: expect.any(Date)
            })
          })
        );
      });
    });
  });

  describe('Order Details Modal', () => {
    it('should open order details modal', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('Ko\'rish');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Buyurtma tafsilotlari - ORD-20240115-123456/)).toBeInTheDocument();
        expect(screen.getByText('Mijoz ma\'lumotlari')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('should close order details modal', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('Ko\'rish');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Buyurtma tafsilotlari/)).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /×/ });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Buyurtma tafsilotlari/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Update Modal', () => {
    it('should open and submit status update', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Holatni yangilash');
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Buyurtma holatini yangilash')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('pending');
      await user.selectOptions(statusSelect, OrderStatus.CONFIRMED);

      const notesTextarea = screen.getByPlaceholderText(/Holat o'zgarishi haqida izoh/);
      await user.type(notesTextarea, 'Order confirmed by admin');

      const submitButton = screen.getByText('Yangilash');
      await user.click(submitButton);

      await waitFor(() => {
        expect(EnhancedOrderService.updateOrderStatus).toHaveBeenCalledWith(
          'order1',
          OrderStatus.CONFIRMED,
          'Order confirmed by admin'
        );
        expect(toast.success).toHaveBeenCalledWith('Buyurtma holati yangilandi');
      });
    });
  });

  describe('Shipping Update Modal', () => {
    it('should open and submit shipping update', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const shippingButtons = screen.getAllByTitle('Yetkazib berishni boshqarish');
      await user.click(shippingButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Yetkazib berish ma\'lumotlarini yangilash')).toBeInTheDocument();
      });

      const trackingInput = screen.getByPlaceholderText(/Kuzatuv raqamini kiriting/);
      await user.type(trackingInput, 'TRK789012');

      const carrierInput = screen.getByPlaceholderText(/Tashuvchi kompaniya nomi/);
      await user.type(carrierInput, 'Express Delivery');

      const submitButton = screen.getByText('Yangilash');
      await user.click(submitButton);

      await waitFor(() => {
        expect(EnhancedOrderService.updateShippingInfo).toHaveBeenCalledWith(
          'order1',
          expect.objectContaining({
            trackingNumber: 'TRK789012',
            carrier: 'Express Delivery'
          })
        );
        expect(toast.success).toHaveBeenCalledWith('Yetkazib berish ma\'lumotlari yangilandi');
      });
    });
  });

  describe('Payment Update Modal', () => {
    it('should open and submit payment update', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const paymentButtons = screen.getAllByTitle('To\'lovni boshqarish');
      await user.click(paymentButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('To\'lov ma\'lumotlarini yangilash')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('pending');
      await user.selectOptions(statusSelect, PaymentStatus.PAID);

      const transactionInput = screen.getByPlaceholderText(/Tranzaksiya identifikatori/);
      await user.type(transactionInput, 'TXN123456');

      const submitButton = screen.getByText('Yangilash');
      await user.click(submitButton);

      await waitFor(() => {
        expect(EnhancedOrderService.updatePaymentStatus).toHaveBeenCalledWith(
          'order1',
          PaymentStatus.PAID,
          'TXN123456',
          150000
        );
        expect(toast.success).toHaveBeenCalledWith('To\'lov holati yangilandi');
      });
    });
  });

  describe('Order Cancellation', () => {
    it('should cancel order with confirmation', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const cancelButtons = screen.getAllByTitle('Bekor qilish');
      await user.click(cancelButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Buyurtmani bekor qilishni xohlaysizmi?');

      await waitFor(() => {
        expect(EnhancedOrderService.cancelOrder).toHaveBeenCalledWith('order1', '');
        expect(toast.success).toHaveBeenCalledWith('Buyurtma bekor qilindi');
      });

      confirmSpy.mockRestore();
    });

    it('should not cancel order if not confirmed', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm to return false
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const cancelButtons = screen.getAllByTitle('Bekor qilish');
      await user.click(cancelButtons[0]);

      expect(confirmSpy).toHaveBeenCalled();
      expect(EnhancedOrderService.cancelOrder).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle status update errors', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Status update failed';
      
      EnhancedOrderService.updateOrderStatus.mockRejectedValue(new Error(errorMessage));
      
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Holatni yangilash');
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Buyurtma holatini yangilash')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Yangilash');
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(`Holat yangilashda xato: ${errorMessage}`);
      });
    });

    it('should handle shipping update errors', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Shipping update failed';
      
      EnhancedOrderService.updateShippingInfo.mockRejectedValue(new Error(errorMessage));
      
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const shippingButtons = screen.getAllByTitle('Yetkazib berishni boshqarish');
      await user.click(shippingButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Yetkazib berish ma\'lumotlarini yangilash')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Yangilash');
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(`Yetkazib berish ma'lumotlarini yangilashda xato: ${errorMessage}`);
      });
    });
  });

  describe('Pagination', () => {
    it('should change items per page', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('20')).toBeInTheDocument();
      });

      const itemsPerPageSelect = screen.getByDisplayValue('20');
      await user.selectOptions(itemsPerPageSelect, '50');

      await waitFor(() => {
        expect(EnhancedOrderService.getOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            limitCount: 50
          })
        );
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh orders when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('Yangilash')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Yangilash');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(EnhancedOrderService.getOrders).toHaveBeenCalledTimes(2); // Initial load + refresh
      });
    });
  });

  describe('No Orders State', () => {
    it('should show no orders message when list is empty', async () => {
      EnhancedOrderService.getOrders.mockResolvedValue({
        documents: [],
        total: 0,
        hasMore: false
      });

      render(<EnhancedOrderManagement />);

      await waitFor(() => {
        expect(screen.getByText('Buyurtmalar topilmadi')).toBeInTheDocument();
      });
    });
  });
});