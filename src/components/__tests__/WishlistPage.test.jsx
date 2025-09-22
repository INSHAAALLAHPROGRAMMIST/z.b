import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import WishlistPage from '../WishlistPage';
import useEnhancedCart from '../../hooks/useEnhancedCart';
import useFirebaseAuth from '../../hooks/useFirebaseAuth';
import firebaseService from '../../services/FirebaseService';
import { toastMessages } from '../../utils/toastUtils';

// Mock dependencies
vi.mock('../../hooks/useEnhancedCart');
vi.mock('../../hooks/useFirebaseAuth');
vi.mock('../../services/FirebaseService');
vi.mock('../../utils/toastUtils');
vi.mock('../ResponsiveImage', () => ({
  default: ({ src, alt, style }) => (
    <img src={src} alt={alt} style={style} data-testid="responsive-image" />
  )
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props}>{children}</a>
    )
  };
});

const WishlistPageWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('WishlistPage', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com'
  };

  const mockWishlistItems = [
    {
      id: 'wish-1',
      bookId: 'book-1',
      userId: 'test-user-123',
      createdAt: { toDate: () => new Date('2024-01-01') },
      bookData: {
        title: 'Test Book 1',
        authorName: 'Test Author 1',
        price: 50000,
        isAvailable: true,
        images: { main: 'image1.jpg' }
      }
    },
    {
      id: 'wish-2',
      bookId: 'book-2',
      userId: 'test-user-123',
      createdAt: { toDate: () => new Date('2024-01-02') },
      bookData: {
        title: 'Test Book 2',
        authorName: 'Test Author 2',
        price: 75000,
        isAvailable: false,
        images: { main: 'image2.jpg' }
      }
    }
  ];

  const mockEnhancedCart = {
    wishlistItems: mockWishlistItems,
    loading: false,
    error: null,
    isOnline: true,
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    isInWishlist: vi.fn(),
    wishlistTotal: 125000
  };

  const mockAuth = {
    user: mockUser,
    isAuthenticated: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useEnhancedCart.mockReturnValue(mockEnhancedCart);
    useFirebaseAuth.mockReturnValue(mockAuth);
    firebaseService.addToCart = vi.fn();
    toastMessages.success = vi.fn();
    toastMessages.error = vi.fn();
    toastMessages.loginRequired = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authentication', () => {
    it('should show login prompt when user is not authenticated', () => {
      useFirebaseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false
      });

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      expect(screen.getByText('Sevimlilar ro\'yxati')).toBeInTheDocument();
      expect(screen.getByText('Sevimlilar ro\'yxatini ko\'rish uchun tizimga kiring')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /kirish/i })).toBeInTheDocument();
    });

    it('should show wishlist content when user is authenticated', () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      expect(screen.getByText('Test Book 2')).toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('should show loading spinner when wishlist is loading', () => {
      useEnhancedCart.mockReturnValue({
        ...mockEnhancedCart,
        loading: true
      });

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      expect(screen.getByText('Sevimlilar yuklanmoqda...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show error message when there is an error', () => {
      useEnhancedCart.mockReturnValue({
        ...mockEnhancedCart,
        error: 'Failed to load wishlist'
      });

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      expect(screen.getByText('Xato: Failed to load wishlist')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /qayta yuklash/i })).toBeInTheDocument();
    });
  });

  describe('empty wishlist', () => {
    it('should show empty state when wishlist is empty', () => {
      useEnhancedCart.mockReturnValue({
        ...mockEnhancedCart,
        wishlistItems: []
      });

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      expect(screen.getByText('Sevimlilar ro\'yxatingiz bo\'sh.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /kitoblarni ko'rish/i })).toBeInTheDocument();
    });
  });

  describe('wishlist items display', () => {
    it('should display wishlist items correctly', () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      // Check if books are displayed
      expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      expect(screen.getByText('Test Author 1')).toBeInTheDocument();
      expect(screen.getByText('50,000 so\'m')).toBeInTheDocument();

      expect(screen.getByText('Test Book 2')).toBeInTheDocument();
      expect(screen.getByText('Test Author 2')).toBeInTheDocument();
      expect(screen.getByText('75,000 so\'m')).toBeInTheDocument();

      // Check availability status
      expect(screen.getByText('Mavjud')).toBeInTheDocument();
      expect(screen.getByText('Mavjud emas')).toBeInTheDocument();
    });

    it('should display wishlist statistics', () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      expect(screen.getByText('Jami kitoblar:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Mavjud:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('125,000 so\'m')).toBeInTheDocument();
    });

    it('should show offline indicator when offline', () => {
      useEnhancedCart.mockReturnValue({
        ...mockEnhancedCart,
        isOnline: false
      });

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      expect(screen.getByText('Offline rejimda ishlayapti')).toBeInTheDocument();
    });
  });

  describe('item selection', () => {
    it('should allow selecting individual items', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstItemCheckbox = checkboxes[1]; // Skip "select all" checkbox

      fireEvent.click(firstItemCheckbox);

      await waitFor(() => {
        expect(firstItemCheckbox).toBeChecked();
      });
    });

    it('should allow selecting all items', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const selectAllCheckbox = screen.getByLabelText(/barchasini tanlash/i);
      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        expect(selectAllCheckbox).toBeChecked();
      });
    });

    it('should show bulk actions when items are selected', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const selectAllCheckbox = screen.getByLabelText(/barchasini tanlash/i);
      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /savatga qo'shish/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /o'chirish/i })).toBeInTheDocument();
      });
    });
  });

  describe('sorting and filtering', () => {
    it('should allow sorting by different criteria', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const sortSelect = screen.getByDisplayValue('Eng yangi');
      fireEvent.change(sortSelect, { target: { value: 'name' } });

      await waitFor(() => {
        expect(sortSelect.value).toBe('name');
      });
    });

    it('should allow filtering by availability', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const filterSelect = screen.getByDisplayValue('Barchasi');
      fireEvent.change(filterSelect, { target: { value: 'available' } });

      await waitFor(() => {
        expect(filterSelect.value).toBe('available');
      });
    });
  });

  describe('item actions', () => {
    it('should add item to cart when "Savatga" button is clicked', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const addToCartButtons = screen.getAllByRole('button', { name: /savatga/i });
      const firstAddButton = addToCartButtons[0];

      fireEvent.click(firstAddButton);

      await waitFor(() => {
        expect(firebaseService.addToCart).toHaveBeenCalledWith(
          mockUser.uid,
          'book-1',
          1
        );
        expect(toastMessages.success).toHaveBeenCalledWith('Kitob savatga qo\'shildi');
      });
    });

    it('should remove item from wishlist when "O\'chirish" button is clicked', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const removeButtons = screen.getAllByRole('button', { name: /o'chirish/i });
      const firstRemoveButton = removeButtons[0];

      fireEvent.click(firstRemoveButton);

      await waitFor(() => {
        expect(mockEnhancedCart.removeFromWishlist).toHaveBeenCalledWith('book-1');
      });
    });

    it('should not show "Savatga" button for unavailable items', () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const addToCartButtons = screen.getAllByRole('button', { name: /savatga/i });
      
      // Should only have one "Savatga" button (for available item) plus bulk action button
      expect(addToCartButtons).toHaveLength(2);
    });
  });

  describe('bulk operations', () => {
    it('should bulk add selected items to cart', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      // Select all items
      const selectAllCheckbox = screen.getByLabelText(/barchasini tanlash/i);
      fireEvent.click(selectAllCheckbox);

      // Click bulk add to cart
      const bulkAddButton = screen.getByRole('button', { name: /savatga qo'shish/i });
      fireEvent.click(bulkAddButton);

      await waitFor(() => {
        // Should only add available items (book-1)
        expect(firebaseService.addToCart).toHaveBeenCalledWith(
          mockUser.uid,
          'book-1',
          1
        );
        expect(firebaseService.addToCart).toHaveBeenCalledTimes(1);
        expect(toastMessages.success).toHaveBeenCalledWith('1 ta kitob savatga qo\'shildi');
      });
    });

    it('should bulk remove selected items from wishlist', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      // Select all items
      const selectAllCheckbox = screen.getByLabelText(/barchasini tanlash/i);
      fireEvent.click(selectAllCheckbox);

      // Click bulk remove
      const bulkRemoveButton = screen.getByRole('button', { name: /o'chirish/i });
      fireEvent.click(bulkRemoveButton);

      await waitFor(() => {
        expect(mockEnhancedCart.removeFromWishlist).toHaveBeenCalledWith('book-1');
        expect(mockEnhancedCart.removeFromWishlist).toHaveBeenCalledWith('book-2');
        expect(toastMessages.success).toHaveBeenCalledWith('2 ta kitob sevimlilardan o\'chirildi');
      });
    });

    it('should show error when no items are selected for bulk operations', async () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      // Try to perform bulk action without selecting items
      const selectAllCheckbox = screen.getByLabelText(/barchasini tanlash/i);
      fireEvent.click(selectAllCheckbox); // Select all
      fireEvent.click(selectAllCheckbox); // Deselect all

      // No bulk action buttons should be visible
      expect(screen.queryByRole('button', { name: /savatga qo'shish/i })).not.toBeInTheDocument();
    });
  });

  describe('authentication handling', () => {
    it('should redirect to auth page when unauthenticated user tries to add to cart', async () => {
      useFirebaseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false
      });

      // Mock authenticated state for initial render
      useFirebaseAuth.mockReturnValueOnce(mockAuth);

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      // Change to unauthenticated state
      useFirebaseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false
      });

      const addToCartButton = screen.getAllByRole('button', { name: /savatga/i })[0];
      fireEvent.click(addToCartButton);

      await waitFor(() => {
        expect(toastMessages.loginRequired).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/auth');
      });
    });
  });

  describe('error handling', () => {
    it('should handle add to cart errors', async () => {
      firebaseService.addToCart.mockRejectedValue(new Error('Add to cart failed'));

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const addToCartButton = screen.getAllByRole('button', { name: /savatga/i })[0];
      fireEvent.click(addToCartButton);

      await waitFor(() => {
        expect(toastMessages.error).toHaveBeenCalledWith('Add to cart failed');
      });
    });

    it('should handle bulk operations errors', async () => {
      mockEnhancedCart.removeFromWishlist.mockRejectedValue(new Error('Remove failed'));

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      // Select all and try to remove
      const selectAllCheckbox = screen.getByLabelText(/barchasini tanlash/i);
      fireEvent.click(selectAllCheckbox);

      const bulkRemoveButton = screen.getByRole('button', { name: /o'chirish/i });
      fireEvent.click(bulkRemoveButton);

      await waitFor(() => {
        expect(toastMessages.error).toHaveBeenCalledWith('Sevimlilardan o\'chirishda xato yuz berdi');
      });
    });
  });

  describe('responsive behavior', () => {
    it('should display responsive images', () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      const images = screen.getAllByTestId('responsive-image');
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveAttribute('src', 'image1.jpg');
      expect(images[0]).toHaveAttribute('alt', 'Test Book 1');
    });

    it('should handle missing book data gracefully', () => {
      const itemsWithMissingData = [
        {
          id: 'wish-3',
          bookId: 'book-3',
          userId: 'test-user-123',
          createdAt: { toDate: () => new Date('2024-01-03') },
          bookData: null
        }
      ];

      useEnhancedCart.mockReturnValue({
        ...mockEnhancedCart,
        wishlistItems: itemsWithMissingData
      });

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      expect(screen.getByText('Kitob topilmadi')).toBeInTheDocument();
      expect(screen.getByText('Noma\'lum muallif')).toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('should format creation dates correctly', () => {
      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      // Check if dates are displayed (format may vary based on locale)
      expect(screen.getByText(/01\.01\.2024|1\/1\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/02\.01\.2024|1\/2\/2024/)).toBeInTheDocument();
    });

    it('should handle date objects without toDate method', () => {
      const itemsWithDirectDate = [
        {
          id: 'wish-4',
          bookId: 'book-4',
          userId: 'test-user-123',
          createdAt: new Date('2024-01-04'),
          bookData: {
            title: 'Test Book 4',
            authorName: 'Test Author 4',
            price: 30000,
            isAvailable: true,
            images: { main: 'image4.jpg' }
          }
        }
      ];

      useEnhancedCart.mockReturnValue({
        ...mockEnhancedCart,
        wishlistItems: itemsWithDirectDate
      });

      render(<WishlistPageWrapper><WishlistPage /></WishlistPageWrapper>);

      expect(screen.getByText(/04\.01\.2024|1\/4\/2024/)).toBeInTheDocument();
    });
  });
});