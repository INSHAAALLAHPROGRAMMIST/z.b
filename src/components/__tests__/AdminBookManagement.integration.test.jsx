import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import AdminBookManagement from '../AdminBookManagement';
import { BooksAdmin, AuthorsAdmin, GenresAdmin } from '../../utils/firebaseAdmin';

// Mock dependencies
vi.mock('../../utils/firebaseAdmin', () => ({
  BooksAdmin: {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn()
  },
  AuthorsAdmin: {
    listDocuments: vi.fn()
  },
  GenresAdmin: {
    listDocuments: vi.fn()
  }
}));

vi.mock('../../services/CloudinaryService', () => ({
  default: vi.fn().mockImplementation(() => ({
    uploadImage: vi.fn().mockResolvedValue({
      secure_url: 'https://cloudinary.com/test-upload.jpg',
      public_id: 'books/test-upload'
    }),
    deleteImage: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('../../utils/toastUtils', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  },
  toastMessages: {
    error: vi.fn(),
    uploadError: vi.fn()
  }
}));

// Mock EnhancedBookForm
vi.mock('../admin/EnhancedBookForm', () => ({
  default: function MockEnhancedBookForm({ initialData, onSubmit, onCancel, authors, genres, loading }) {
    return (
      <div data-testid="enhanced-book-form">
        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            title: 'Test Book',
            description: 'Test Description',
            price: '25000',
            author: 'author1',
            genres: ['genre1'],
            publishedYear: '2023',
            isbn: '978-0-123456-78-9',
            pages: '200',
            language: 'uz',
            isFeatured: false,
            isNewArrival: true,
            images: [{ file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }) }]
          });
        }}>
          <input data-testid="form-title" defaultValue={initialData.title} />
          <button type="submit" disabled={loading}>
            {loading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
          <button type="button" onClick={onCancel}>
            Bekor qilish
          </button>
        </form>
      </div>
    );
  }
}));

const mockBooks = [
  {
    $id: 'book1',
    title: 'Test Book 1',
    description: 'Test Description 1',
    price: 25000,
    author: { $id: 'author1', name: 'Test Author 1' },
    genres: [{ $id: 'genre1', name: 'Fiction' }],
    publishedYear: 2023,
    imageUrl: 'https://test-image.jpg',
    slug: 'test-book-1'
  },
  {
    $id: 'book2',
    title: 'Test Book 2',
    description: 'Test Description 2',
    price: 30000,
    author: { $id: 'author2', name: 'Test Author 2' },
    genres: [{ $id: 'genre2', name: 'Non-Fiction' }],
    publishedYear: 2022,
    imageUrl: 'https://test-image-2.jpg',
    slug: 'test-book-2'
  }
];

const mockAuthors = [
  { $id: 'author1', name: 'Test Author 1' },
  { $id: 'author2', name: 'Test Author 2' }
];

const mockGenres = [
  { $id: 'genre1', name: 'Fiction' },
  { $id: 'genre2', name: 'Non-Fiction' }
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AdminBookManagement />
    </BrowserRouter>
  );
};

describe('AdminBookManagement Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    BooksAdmin.listDocuments.mockResolvedValue({
      documents: mockBooks,
      total: mockBooks.length
    });
    
    AuthorsAdmin.listDocuments.mockResolvedValue({
      documents: mockAuthors
    });
    
    GenresAdmin.listDocuments.mockResolvedValue({
      documents: mockGenres
    });
  });

  describe('Component Initialization', () => {
    test('should load and display books on mount', async () => {
      renderComponent();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Check if books are displayed
      expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      expect(screen.getByText('Test Book 2')).toBeInTheDocument();
      expect(screen.getByText('Test Author 1')).toBeInTheDocument();
      expect(screen.getByText('Test Author 2')).toBeInTheDocument();
    });

    test('should load authors and genres for filters', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(AuthorsAdmin.listDocuments).toHaveBeenCalled();
        expect(GenresAdmin.listDocuments).toHaveBeenCalled();
      });
    });
  });

  describe('Book Creation Workflow', () => {
    test('should open enhanced book form for adding new book', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Click add book button
      const addButton = screen.getByText('Yangi kitob');
      fireEvent.click(addButton);
      
      // Check if enhanced form is displayed
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-book-form')).toBeInTheDocument();
        expect(screen.getByText('Yangi kitob qo\'shish')).toBeInTheDocument();
      });
    });

    test('should create new book with image upload', async () => {
      BooksAdmin.createDocument.mockResolvedValue({ $id: 'new-book-id' });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Open add form
      fireEvent.click(screen.getByText('Yangi kitob'));
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-book-form')).toBeInTheDocument();
      });
      
      // Submit form
      const submitButton = screen.getByText('Saqlash');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Wait for form submission
      await waitFor(() => {
        expect(BooksAdmin.createDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Book',
            description: 'Test Description',
            price: 25000,
            author: 'author1',
            genres: ['genre1']
          })
        );
      });
    });

    test('should handle form cancellation', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Open add form
      fireEvent.click(screen.getByText('Yangi kitob'));
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-book-form')).toBeInTheDocument();
      });
      
      // Cancel form
      fireEvent.click(screen.getByText('Bekor qilish'));
      
      // Form should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('enhanced-book-form')).not.toBeInTheDocument();
      });
    });
  });

  describe('Book Editing Workflow', () => {
    test('should open enhanced book form for editing existing book', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Click edit button for first book
      const editButtons = screen.getAllByTitle('Tahrirlash');
      fireEvent.click(editButtons[0]);
      
      // Check if enhanced form is displayed with existing data
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-book-form')).toBeInTheDocument();
        expect(screen.getByText('Kitobni tahrirlash')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Book 1')).toBeInTheDocument();
      });
    });

    test('should update existing book with new data', async () => {
      BooksAdmin.updateDocument.mockResolvedValue(true);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Open edit form
      const editButtons = screen.getAllByTitle('Tahrirlash');
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-book-form')).toBeInTheDocument();
      });
      
      // Submit form
      const submitButton = screen.getByText('Saqlash');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Wait for form submission
      await waitFor(() => {
        expect(BooksAdmin.updateDocument).toHaveBeenCalledWith(
          'book1',
          expect.objectContaining({
            title: 'Test Book',
            description: 'Test Description'
          })
        );
      });
    });
  });

  describe('Book Deletion Workflow', () => {
    test('should open delete confirmation modal', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Click delete button for first book
      const deleteButtons = screen.getAllByTitle('O\'chirish');
      fireEvent.click(deleteButtons[0]);
      
      // Check if delete confirmation is displayed
      await waitFor(() => {
        expect(screen.getByText('Kitobni o\'chirish')).toBeInTheDocument();
        expect(screen.getByText(/Test Book 1.*kitobini o'chirmoqchimisiz/)).toBeInTheDocument();
      });
    });

    test('should delete book and associated image', async () => {
      BooksAdmin.deleteDocument.mockResolvedValue(true);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Open delete confirmation
      const deleteButtons = screen.getAllByTitle('O\'chirish');
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Kitobni o\'chirish')).toBeInTheDocument();
      });
      
      // Confirm deletion
      const confirmButton = screen.getByText('O\'chirish');
      await act(async () => {
        fireEvent.click(confirmButton);
      });
      
      // Should delete book
      await waitFor(() => {
        expect(BooksAdmin.deleteDocument).toHaveBeenCalledWith('book1');
      });
    });
  });

  describe('Search and Filter Integration', () => {
    test('should filter books by search term', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Enter search term
      const searchInput = screen.getByPlaceholderText('Kitob nomini qidirish...');
      fireEvent.change(searchInput, { target: { value: 'Test Book 1' } });
      
      // Should call API with search filter
      await waitFor(() => {
        expect(BooksAdmin.listDocuments).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Test Book 1'
          })
        );
      });
    });

    test('should filter books by author', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Select author filter
      const authorSelect = screen.getByDisplayValue('Barcha mualliflar');
      fireEvent.change(authorSelect, { target: { value: 'author1' } });
      
      // Should call API with author filter
      await waitFor(() => {
        expect(BooksAdmin.listDocuments).toHaveBeenCalledWith(
          expect.objectContaining({
            authorId: 'author1'
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle book creation errors', async () => {
      BooksAdmin.createDocument.mockRejectedValue(new Error('Creation failed'));
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Open add form and submit
      fireEvent.click(screen.getByText('Yangi kitob'));
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-book-form')).toBeInTheDocument();
      });
      
      const submitButton = screen.getByText('Saqlash');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(BooksAdmin.createDocument).toHaveBeenCalled();
        // Form should remain open on error
        expect(screen.getByTestId('enhanced-book-form')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('should show loading state during form submission', async () => {
      // Make the create operation slow
      BooksAdmin.createDocument.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ $id: 'new-book' }), 100))
      );
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.queryByText('Kitoblar yuklanmoqda...')).not.toBeInTheDocument();
      });
      
      // Open add form
      fireEvent.click(screen.getByText('Yangi kitob'));
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-book-form')).toBeInTheDocument();
      });
      
      // Submit form
      const submitButton = screen.getByText('Saqlash');
      fireEvent.click(submitButton);
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Saqlanmoqda...')).toBeInTheDocument();
      });
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Saqlanmoqda...')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });
  });
});