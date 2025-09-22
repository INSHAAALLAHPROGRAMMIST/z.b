import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Mock all external services
const mockFirebaseService = {
  // User management
  createUser: vi.fn(),
  getUserById: vi.fn(),
  updateUser: vi.fn(),
  
  // Book management
  getBooks: vi.fn(),
  getBookById: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  searchBooks: vi.fn(),
  
  // Cart management
  getCartItems: vi.fn(),
  addToCart: vi.fn(),
  updateCartQuantity: vi.fn(),
  removeFromCart: vi.fn(),
  clearCart: vi.fn(),
  
  // Order management
  createOrder: vi.fn(),
  getOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
  
  // Wishlist management
  getWishlistItems: vi.fn(),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
  
  // Analytics
  trackEvent: vi.fn(),
  incrementBookViews: vi.fn()
};

const mockCloudinaryService = {
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
  optimizeImage: vi.fn(),
  generateThumbnail: vi.fn()
};

const mockTelegramService = {
  sendOrderNotification: vi.fn(),
  sendLowStockAlert: vi.fn(),
  sendAdminNotification: vi.fn(),
  sendCustomerNotification: vi.fn()
};

const mockOptimizedFirebaseService = {
  ...mockFirebaseService,
  invalidateCache: vi.fn(),
  getCacheStats: vi.fn()
};

// Mock services
vi.mock('../../services/FirebaseService', () => ({
  default: mockFirebaseService
}));

vi.mock('../../services/OptimizedFirebaseService', () => ({
  default: mockOptimizedFirebaseService
}));

vi.mock('../../services/CloudinaryService', () => ({
  default: mockCloudinaryService
}));

vi.mock('../../services/TelegramService', () => ({
  default: mockTelegramService
}));

// Mock auth
vi.mock('../../firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-id', email: 'test@example.com' },
    onAuthStateChanged: vi.fn()
  }
}));

// Import components after mocks
import HomePage from '../../pages/HomePage';
import AdminBookManagement from '../../components/AdminBookManagement';
import CartPage from '../../components/CartPage';
import AuthForm from '../../components/AuthForm';

const mockUser = {
  $id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  isAdmin: false
};

const mockAdminUser = {
  $id: 'admin-user-id',
  email: 'admin@example.com',
  name: 'Admin User',
  isAdmin: true
};

const mockBooks = [
  {
    $id: 'book-1',
    title: 'Test Book 1',
    author: 'Test Author 1',
    authorName: 'Test Author 1',
    genre: 'Fiction',
    price: 25000,
    imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/book1.jpg',
    description: 'A great test book',
    isAvailable: true,
    stock: 10,
    stockStatus: 'in_stock'
  },
  {
    $id: 'book-2',
    title: 'Test Book 2',
    author: 'Test Author 2',
    authorName: 'Test Author 2',
    genre: 'Non-Fiction',
    price: 30000,
    imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/book2.jpg',
    description: 'Another great test book',
    isAvailable: true,
    stock: 5,
    stockStatus: 'low_stock'
  }
];

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Full System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockFirebaseService.getBooks.mockResolvedValue({
      documents: mockBooks,
      total: mockBooks.length
    });
    
    mockFirebaseService.getCartItems.mockResolvedValue({
      documents: []
    });
    
    mockFirebaseService.getWishlistItems.mockResolvedValue({
      documents: []
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Complete User Journey - Registration to Order', () => {
    it('should handle complete user registration and book purchase flow', async () => {
      const user = userEvent.setup();
      
      // Step 1: User Registration
      mockFirebaseService.createUser.mockResolvedValue({
        id: 'new-user-id',
        ...mockUser
      });
      
      renderWithRouter(<AuthForm />);
      
      // Fill registration form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register|sign up/i });
      
      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockFirebaseService.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'newuser@example.com'
          })
        );
      });
      
      // Step 2: Browse Books
      renderWithRouter(<HomePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
        expect(screen.getByText('Test Book 2')).toBeInTheDocument();
      });
      
      // Step 3: Add to Cart
      mockFirebaseService.addToCart.mockResolvedValue({
        id: 'cart-item-1',
        bookId: 'book-1',
        quantity: 1,
        userId: 'new-user-id'
      });
      
      const addToCartButtons = screen.getAllByText(/savatga/i);
      await user.click(addToCartButtons[0]);
      
      await waitFor(() => {
        expect(mockFirebaseService.addToCart).toHaveBeenCalledWith(
          'new-user-id',
          'book-1',
          1
        );
      });
      
      // Step 4: View Cart and Checkout
      const cartItems = [
        {
          id: 'cart-item-1',
          bookId: 'book-1',
          quantity: 1,
          userId: 'new-user-id',
          book: mockBooks[0]
        }
      ];
      
      mockFirebaseService.getCartItems.mockResolvedValue({
        documents: cartItems
      });
      
      mockFirebaseService.createOrder.mockResolvedValue({
        id: 'order-1',
        userId: 'new-user-id',
        items: cartItems,
        total: 25000,
        status: 'pending'
      });
      
      renderWithRouter(<CartPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });
      
      // Proceed to checkout
      const checkoutButton = screen.getByText(/checkout|buyurtma berish/i);
      await user.click(checkoutButton);
      
      await waitFor(() => {
        expect(mockFirebaseService.createOrder).toHaveBeenCalled();
        expect(mockTelegramService.sendOrderNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'order-1',
            userId: 'new-user-id'
          })
        );
      });
    });

    it('should handle wishlist functionality with notifications', async () => {
      const user = userEvent.setup();
      
      mockFirebaseService.addToWishlist.mockResolvedValue({
        id: 'wishlist-item-1',
        bookId: 'book-1',
        userId: 'test-user-id'
      });
      
      renderWithRouter(<HomePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });
      
      // Add to wishlist
      const wishlistButtons = screen.getAllByLabelText(/sevimlilarga/i);
      await user.click(wishlistButtons[0]);
      
      await waitFor(() => {
        expect(mockFirebaseService.addToWishlist).toHaveBeenCalledWith(
          'test-user-id',
          'book-1'
        );
      });
    });
  });

  describe('Admin Panel Integration', () => {
    it('should handle complete admin workflow with image upload and notifications', async () => {
      const user = userEvent.setup();
      
      // Mock admin user
      mockFirebaseService.getUserById.mockResolvedValue(mockAdminUser);
      
      // Mock image upload
      mockCloudinaryService.uploadImage.mockResolvedValue({
        public_id: 'new-book-image',
        secure_url: 'https://res.cloudinary.com/test/image/upload/v1/new-book.jpg'
      });
      
      // Mock book creation
      mockFirebaseService.createBook.mockResolvedValue({
        id: 'new-book-id',
        title: 'New Admin Book',
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/new-book.jpg'
      });
      
      renderWithRouter(<AdminBookManagement />);
      
      await waitFor(() => {
        expect(screen.getByText(/kitob qo'shish/i)).toBeInTheDocument();
      });
      
      // Click add book
      const addBookButton = screen.getByText(/kitob qo'shish/i);
      await user.click(addBookButton);
      
      // Fill book form
      const titleInput = screen.getByLabelText(/kitob nomi/i);
      const authorInput = screen.getByLabelText(/muallif/i);
      const priceInput = screen.getByLabelText(/narx/i);
      
      await user.type(titleInput, 'New Admin Book');
      await user.type(authorInput, 'Admin Author');
      await user.type(priceInput, '35000');
      
      // Mock file upload
      const fileInput = screen.getByLabelText(/rasm/i);
      const file = new File(['test'], 'test-book.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);
      
      // Submit form
      const submitButton = screen.getByText(/saqlash/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCloudinaryService.uploadImage).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            folder: 'books'
          })
        );
        
        expect(mockFirebaseService.createBook).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Admin Book',
            author: 'Admin Author',
            price: 35000
          })
        );
        
        expect(mockTelegramService.sendAdminNotification).toHaveBeenCalledWith(
          expect.stringContaining('New book added')
        );
      });
    });

    it('should handle low stock alerts and notifications', async () => {
      // Mock low stock book
      const lowStockBook = {
        ...mockBooks[1],
        stock: 2,
        stockStatus: 'low_stock'
      };
      
      mockFirebaseService.updateBook.mockResolvedValue(lowStockBook);
      
      renderWithRouter(<AdminBookManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Book 2')).toBeInTheDocument();
      });
      
      // Simulate stock update that triggers low stock alert
      await mockFirebaseService.updateBook('book-2', { stock: 2 });
      
      await waitFor(() => {
        expect(mockTelegramService.sendLowStockAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Book 2',
            stock: 2
          })
        );
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Firebase service errors gracefully', async () => {
      mockFirebaseService.getBooks.mockRejectedValue(new Error('Firebase connection failed'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderWithRouter(<HomePage />);
      
      await waitFor(() => {
        expect(screen.getByText(/xato/i)).toBeInTheDocument();
        expect(screen.getByText('Qayta yuklash')).toBeInTheDocument();
      });
      
      // Test retry functionality
      mockFirebaseService.getBooks.mockResolvedValue({
        documents: mockBooks,
        total: mockBooks.length
      });
      
      const retryButton = screen.getByText('Qayta yuklash');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle Cloudinary upload errors with fallback', async () => {
      const user = userEvent.setup();
      
      mockCloudinaryService.uploadImage.mockRejectedValue(new Error('Upload failed'));
      
      renderWithRouter(<AdminBookManagement />);
      
      const addBookButton = screen.getByText(/kitob qo'shish/i);
      await user.click(addBookButton);
      
      const fileInput = screen.getByLabelText(/rasm/i);
      const file = new File(['test'], 'test-book.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText(/rasm yuklashda xato/i)).toBeInTheDocument();
      });
    });

    it('should handle Telegram notification failures gracefully', async () => {
      mockTelegramService.sendOrderNotification.mockRejectedValue(
        new Error('Telegram API error')
      );
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create order should still succeed even if notification fails
      mockFirebaseService.createOrder.mockResolvedValue({
        id: 'order-1',
        userId: 'test-user-id',
        status: 'pending'
      });
      
      renderWithRouter(<CartPage />);
      
      // Simulate order creation
      await mockFirebaseService.createOrder({
        userId: 'test-user-id',
        items: []
      });
      
      // Order should be created despite notification failure
      expect(mockFirebaseService.createOrder).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Telegram'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Caching Integration', () => {
    it('should use optimized services with caching', async () => {
      mockOptimizedFirebaseService.getBooks.mockResolvedValue({
        documents: mockBooks,
        total: mockBooks.length
      });
      
      renderWithRouter(<HomePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });
      
      // Should use optimized service
      expect(mockOptimizedFirebaseService.getBooks).toHaveBeenCalled();
      
      // Should invalidate cache on updates
      await mockOptimizedFirebaseService.createBook({
        title: 'New Book'
      });
      
      expect(mockOptimizedFirebaseService.invalidateCache).toHaveBeenCalledWith('books');
    });

    it('should handle concurrent operations efficiently', async () => {
      const user = userEvent.setup();
      
      // Mock multiple concurrent operations
      const promises = [
        mockFirebaseService.addToCart('user-1', 'book-1', 1),
        mockFirebaseService.addToCart('user-1', 'book-2', 1),
        mockFirebaseService.addToWishlist('user-1', 'book-1'),
        mockFirebaseService.incrementBookViews('book-1')
      ];
      
      renderWithRouter(<HomePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });
      
      // Simulate concurrent user actions
      const addToCartButtons = screen.getAllByText(/savatga/i);
      const wishlistButtons = screen.getAllByLabelText(/sevimlilarga/i);
      
      // Perform actions concurrently
      await Promise.all([
        user.click(addToCartButtons[0]),
        user.click(addToCartButtons[1]),
        user.click(wishlistButtons[0])
      ]);
      
      // All operations should complete successfully
      await Promise.all(promises);
    });
  });

  describe('Analytics and Tracking Integration', () => {
    it('should track user interactions and analytics', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<HomePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });
      
      // Click on book (should track view)
      const bookLink = screen.getAllByRole('link')[0];
      await user.click(bookLink);
      
      expect(mockFirebaseService.incrementBookViews).toHaveBeenCalledWith('book-1');
      
      // Add to cart (should track event)
      const addToCartButton = screen.getAllByText(/savatga/i)[0];
      await user.click(addToCartButton);
      
      expect(mockFirebaseService.trackEvent).toHaveBeenCalledWith(
        'add_to_cart',
        expect.objectContaining({
          bookId: 'book-1'
        })
      );
    });
  });

  describe('Search and Filter Integration', () => {
    it('should handle search with all service integrations', async () => {
      const user = userEvent.setup();
      
      const searchResults = [mockBooks[0]];
      mockFirebaseService.searchBooks.mockResolvedValue({
        documents: searchResults
      });
      
      renderWithRouter(<HomePage />);
      
      // Find search input
      const searchInput = screen.getByPlaceholderText(/qidirish/i);
      
      await user.type(searchInput, 'Test Book 1');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockFirebaseService.searchBooks).toHaveBeenCalledWith(
          'Test Book 1',
          expect.any(Object)
        );
      });
      
      // Should track search event
      expect(mockFirebaseService.trackEvent).toHaveBeenCalledWith(
        'search',
        expect.objectContaining({
          query: 'Test Book 1'
        })
      );
    });
  });
});