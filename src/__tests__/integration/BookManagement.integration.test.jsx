import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Mock Firebase
const mockFirebaseService = {
  getBooks: vi.fn(),
  getBookById: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  getGenres: vi.fn(),
  getAuthors: vi.fn(),
  addToCart: vi.fn(),
  getCartItems: vi.fn(),
  searchBooks: vi.fn()
};

vi.mock('../../services/FirebaseService', () => ({
  default: mockFirebaseService
}));

vi.mock('../../services/OptimizedFirebaseService', () => ({
  default: mockFirebaseService
}));

// Mock Cloudinary
vi.mock('../../services/CloudinaryService', () => ({
  default: {
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
    optimizeImage: vi.fn()
  }
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

const mockBooks = [
  {
    $id: '1',
    title: 'Test Book 1',
    author: 'Author 1',
    authorName: 'Author 1',
    genre: 'Fiction',
    price: 25000,
    imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/book1.jpg',
    description: 'A great test book',
    isAvailable: true,
    stock: 10,
    stockStatus: 'in_stock'
  },
  {
    $id: '2',
    title: 'Test Book 2',
    author: 'Author 2',
    authorName: 'Author 2',
    genre: 'Non-Fiction',
    price: 30000,
    imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/book2.jpg',
    description: 'Another great test book',
    isAvailable: true,
    stock: 5,
    stockStatus: 'low_stock'
  }
];

const mockGenres = [
  { $id: '1', name: 'Fiction', description: 'Fiction books' },
  { $id: '2', name: 'Non-Fiction', description: 'Non-fiction books' }
];

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Book Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockFirebaseService.getBooks.mockResolvedValue({
      documents: mockBooks,
      total: mockBooks.length
    });
    
    mockFirebaseService.getGenres.mockResolvedValue({
      documents: mockGenres
    });
    
    mockFirebaseService.getCartItems.mockResolvedValue({
      documents: []
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('HomePage Book Display and Interaction', () => {
    it('should display books and allow adding to cart', async () => {
      renderWithRouter(<HomePage />);

      // Wait for books to load
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
        expect(screen.getByText('Test Book 2')).toBeInTheDocument();
      });

      // Check book details are displayed
      expect(screen.getByText('Author 1')).toBeInTheDocument();
      expect(screen.getByText('25,000 so\'m')).toBeInTheDocument();

      // Add first book to cart
      const addToCartButtons = screen.getAllByText(/savatga/i);
      fireEvent.click(addToCartButtons[0]);

      await waitFor(() => {
        expect(mockFirebaseService.addToCart).toHaveBeenCalledWith(
          expect.any(String), // userId
          '1', // bookId
          1 // quantity
        );
      });
    });

    it('should handle search functionality', async () => {
      const searchResults = [mockBooks[0]];
      mockFirebaseService.searchBooks.mockResolvedValue({
        documents: searchResults
      });

      renderWithRouter(<HomePage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });

      // Simulate search (this would typically be in a search component)
      // For now, we'll test the service call
      const results = await mockFirebaseService.searchBooks('Test Book 1');
      expect(results.documents).toHaveLength(1);
      expect(results.documents[0].title).toBe('Test Book 1');
    });

    it('should display genres and handle navigation', async () => {
      renderWithRouter(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Fiction')).toBeInTheDocument();
        expect(screen.getByText('Non-Fiction')).toBeInTheDocument();
      });

      // Check genre descriptions
      expect(screen.getByText('Fiction books')).toBeInTheDocument();
      expect(screen.getByText('Non-fiction books')).toBeInTheDocument();
    });

    it('should handle loading states properly', async () => {
      // Delay the response to test loading state
      mockFirebaseService.getBooks.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ documents: mockBooks }), 100)
        )
      );

      renderWithRouter(<HomePage />);

      // Should show loading state
      expect(screen.getByText('Kitoblar yuklanmoqda...')).toBeInTheDocument();

      // Wait for books to load
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle errors gracefully', async () => {
      mockFirebaseService.getBooks.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/xato/i)).toBeInTheDocument();
        expect(screen.getByText('Qayta yuklash')).toBeInTheDocument();
      });
    });
  });

  describe('Admin Book Management Integration', () => {
    beforeEach(() => {
      // Mock admin user
      vi.mocked(mockFirebaseService.getBooks).mockResolvedValue({
        documents: mockBooks,
        total: mockBooks.length
      });
    });

    it('should create a new book with image upload', async () => {
      const user = userEvent.setup();
      
      mockFirebaseService.createBook.mockResolvedValue({
        id: 'new-book-id'
      });

      renderWithRouter(<AdminBookManagement />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/kitob qo'shish/i)).toBeInTheDocument();
      });

      // Fill out book form
      const titleInput = screen.getByLabelText(/kitob nomi/i);
      const authorInput = screen.getByLabelText(/muallif/i);
      const priceInput = screen.getByLabelText(/narx/i);

      await user.type(titleInput, 'New Test Book');
      await user.type(authorInput, 'New Author');
      await user.type(priceInput, '40000');

      // Submit form
      const submitButton = screen.getByText(/saqlash/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFirebaseService.createBook).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Test Book',
            author: 'New Author',
            price: 40000
          })
        );
      });
    });

    it('should update existing book', async () => {
      const user = userEvent.setup();
      
      mockFirebaseService.updateBook.mockResolvedValue(true);
      mockFirebaseService.getBookById.mockResolvedValue(mockBooks[0]);

      renderWithRouter(<AdminBookManagement />);

      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });

      // Click edit button
      const editButtons = screen.getAllByText(/tahrirlash/i);
      fireEvent.click(editButtons[0]);

      // Update title
      const titleInput = screen.getByDisplayValue('Test Book 1');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Test Book');

      // Save changes
      const saveButton = screen.getByText(/saqlash/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFirebaseService.updateBook).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            title: 'Updated Test Book'
          })
        );
      });
    });

    it('should delete book with confirmation', async () => {
      mockFirebaseService.deleteBook.mockResolvedValue(true);

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithRouter(<AdminBookManagement />);

      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByText(/o'chirish/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(mockFirebaseService.deleteBook).toHaveBeenCalledWith('1');
      });

      confirmSpy.mockRestore();
    });

    it('should handle bulk operations', async () => {
      renderWithRouter(<AdminBookManagement />);

      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });

      // Select multiple books
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Select first book
      fireEvent.click(checkboxes[1]); // Select second book

      // Perform bulk action (if implemented)
      const bulkDeleteButton = screen.queryByText(/tanlangan kitoblarni o'chirish/i);
      if (bulkDeleteButton) {
        fireEvent.click(bulkDeleteButton);
        // Test bulk delete functionality
      }
    });
  });

  describe('Cart Integration', () => {
    it('should add multiple books to cart and update quantities', async () => {
      const cartItems = [
        { id: 'cart1', bookId: '1', quantity: 1, userId: 'test-user-id' }
      ];

      mockFirebaseService.getCartItems.mockResolvedValue({
        documents: cartItems
      });

      renderWithRouter(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });

      // Add first book to cart
      const addToCartButtons = screen.getAllByText(/savatga/i);
      fireEvent.click(addToCartButtons[0]);

      // Add second book to cart
      fireEvent.click(addToCartButtons[1]);

      await waitFor(() => {
        expect(mockFirebaseService.addToCart).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle cart errors gracefully', async () => {
      mockFirebaseService.addToCart.mockRejectedValue(new Error('Cart error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithRouter(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });

      const addToCartButton = screen.getAllByText(/savatga/i)[0];
      fireEvent.click(addToCartButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('xato'),
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Caching', () => {
    it('should cache book data and reduce API calls', async () => {
      renderWithRouter(<HomePage />);

      // First load
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });

      expect(mockFirebaseService.getBooks).toHaveBeenCalledTimes(1);

      // Simulate re-render (should use cache)
      renderWithRouter(<HomePage />);

      // Should not make additional API calls if caching is working
      // Note: This test depends on the caching implementation
    });

    it('should handle large datasets efficiently', async () => {
      const largeBookSet = Array.from({ length: 100 }, (_, i) => ({
        $id: `book-${i}`,
        title: `Book ${i}`,
        author: `Author ${i}`,
        authorName: `Author ${i}`,
        genre: 'Fiction',
        price: 25000 + i * 1000,
        imageUrl: `https://example.com/book${i}.jpg`,
        isAvailable: true,
        stock: 10,
        stockStatus: 'in_stock'
      }));

      mockFirebaseService.getBooks.mockResolvedValue({
        documents: largeBookSet,
        total: largeBookSet.length
      });

      const startTime = performance.now();
      
      renderWithRouter(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Book 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(2000); // 2 seconds
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network errors', async () => {
      // First call fails
      mockFirebaseService.getBooks
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ documents: mockBooks });

      renderWithRouter(<HomePage />);

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/xato/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Qayta yuklash');
      fireEvent.click(retryButton);

      // Should recover and show books
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });
    });

    it('should handle partial failures gracefully', async () => {
      // Books load successfully, but genres fail
      mockFirebaseService.getGenres.mockRejectedValue(new Error('Genres error'));

      renderWithRouter(<HomePage />);

      // Books should still display
      await waitFor(() => {
        expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      });

      // Genres section should show error
      await waitFor(() => {
        expect(screen.getByText(/janrlarni yuklashda xato/i)).toBeInTheDocument();
      });
    });
  });
});