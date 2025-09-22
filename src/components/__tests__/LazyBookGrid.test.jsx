import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LazyBookGrid from '../LazyBookGrid';

// Mock OptimizedImage
vi.mock('../OptimizedImage', () => ({
  default: vi.fn(({ src, alt, onLoad, onError, ...props }) => (
    <img
      src={src}
      alt={alt}
      data-testid="optimized-image"
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  ))
}));

// Mock firebaseService
vi.mock('../../services/FirebaseService', () => ({
  default: {
    incrementBookViews: vi.fn()
  }
}));

const mockBooks = [
  {
    $id: '1',
    title: 'Test Book 1',
    author: 'Author 1',
    genre: 'Fiction',
    price: 25000,
    imageUrl: 'https://example.com/book1.jpg'
  },
  {
    $id: '2',
    title: 'Test Book 2',
    author: 'Author 2',
    genre: 'Non-Fiction',
    price: 30000,
    imageUrl: 'https://example.com/book2.jpg'
  },
  {
    $id: '3',
    title: 'Test Book 3',
    author: 'Author 3',
    genre: 'Science',
    price: 35000,
    imageUrl: 'https://example.com/book3.jpg'
  }
];

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('LazyBookGrid', () => {
  const mockAddToCart = vi.fn();
  const mockAddToWishlist = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render books in grid layout', () => {
      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      expect(screen.getByText('Test Book 2')).toBeInTheDocument();
      expect(screen.getByText('Test Book 3')).toBeInTheDocument();
    });

    it('should render loading skeleton when loading', () => {
      renderWithRouter(
        <LazyBookGrid
          books={[]}
          loading={true}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const skeletons = screen.getAllByTestId('book-skeleton');
      expect(skeletons).toHaveLength(12); // Default itemsPerPage
    });

    it('should render empty state when no books', () => {
      renderWithRouter(
        <LazyBookGrid
          books={[]}
          loading={false}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const bookGrid = screen.getByTestId('book-grid');
      expect(bookGrid).toBeEmptyDOMElement();
    });
  });

  describe('Book Card Interactions', () => {
    it('should call onAddToCart when add to cart button is clicked', async () => {
      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const addToCartButtons = screen.getAllByText('Savatga');
      fireEvent.click(addToCartButtons[0]);

      expect(mockAddToCart).toHaveBeenCalledWith(mockBooks[0]);
    });

    it('should call onAddToWishlist when wishlist button is clicked', async () => {
      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const wishlistButtons = screen.getAllByLabelText(/sevimlilarga qo'shish/i);
      fireEvent.click(wishlistButtons[0]);

      expect(mockAddToWishlist).toHaveBeenCalledWith(mockBooks[0]);
    });

    it('should prevent event propagation on button clicks', async () => {
      const mockLinkClick = vi.fn();
      
      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      // Mock the link click
      const bookLinks = screen.getAllByRole('link');
      bookLinks[0].addEventListener('click', mockLinkClick);

      const addToCartButton = screen.getAllByText('Savatga')[0];
      fireEvent.click(addToCartButton);

      expect(mockAddToCart).toHaveBeenCalled();
      expect(mockLinkClick).not.toHaveBeenCalled();
    });
  });

  describe('SEO-friendly URLs', () => {
    it('should generate slug-based URLs for books', () => {
      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const bookLinks = screen.getAllByRole('link');
      expect(bookLinks[0]).toHaveAttribute('href', '/kitob/test-book-1');
      expect(bookLinks[1]).toHaveAttribute('href', '/kitob/test-book-2');
    });

    it('should handle special characters in titles for slugs', () => {
      const booksWithSpecialChars = [
        {
          $id: '1',
          title: 'Test Book: Special & Characters!',
          author: 'Author 1',
          genre: 'Fiction',
          price: 25000,
          imageUrl: 'https://example.com/book1.jpg'
        }
      ];

      renderWithRouter(
        <LazyBookGrid
          books={booksWithSpecialChars}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const bookLink = screen.getByRole('link');
      expect(bookLink).toHaveAttribute('href', '/kitob/test-book-special-characters');
    });
  });

  describe('Image Optimization', () => {
    it('should use OptimizedImage component', () => {
      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const optimizedImages = screen.getAllByTestId('optimized-image');
      expect(optimizedImages).toHaveLength(mockBooks.length);
    });

    it('should set eager loading for first 6 images', () => {
      const manyBooks = Array.from({ length: 10 }, (_, i) => ({
        $id: `${i + 1}`,
        title: `Book ${i + 1}`,
        author: `Author ${i + 1}`,
        genre: 'Fiction',
        price: 25000,
        imageUrl: `https://example.com/book${i + 1}.jpg`
      }));

      renderWithRouter(
        <LazyBookGrid
          books={manyBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const images = screen.getAllByTestId('optimized-image');
      
      // First 6 should not have lazy prop (eager loading)
      expect(images[0]).not.toHaveAttribute('lazy', 'true');
      expect(images[5]).not.toHaveAttribute('lazy', 'true');
      
      // 7th and beyond should have lazy loading
      expect(images[6]).toHaveAttribute('lazy', 'true');
    });
  });

  describe('Virtualization and Infinite Scroll', () => {
    it('should show load more trigger when virtualization is enabled', () => {
      const manyBooks = Array.from({ length: 50 }, (_, i) => ({
        $id: `${i + 1}`,
        title: `Book ${i + 1}`,
        author: `Author ${i + 1}`,
        genre: 'Fiction',
        price: 25000,
        imageUrl: `https://example.com/book${i + 1}.jpg`
      }));

      renderWithRouter(
        <LazyBookGrid
          books={manyBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
          enableVirtualization={true}
          itemsPerPage={12}
        />
      );

      // Should only show first 12 books initially
      expect(screen.getByText('Book 1')).toBeInTheDocument();
      expect(screen.getByText('Book 12')).toBeInTheDocument();
      expect(screen.queryByText('Book 13')).not.toBeInTheDocument();

      // Should show load more trigger
      expect(screen.getByTestId('load-more-trigger')).toBeInTheDocument();
    });

    it('should load more items when scrolling to trigger', async () => {
      const manyBooks = Array.from({ length: 50 }, (_, i) => ({
        $id: `${i + 1}`,
        title: `Book ${i + 1}`,
        author: `Author ${i + 1}`,
        genre: 'Fiction',
        price: 25000,
        imageUrl: `https://example.com/book${i + 1}.jpg`
      }));

      // Mock IntersectionObserver
      const mockObserve = vi.fn();
      const mockDisconnect = vi.fn();
      let intersectionCallback;

      global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
        intersectionCallback = callback;
        return {
          observe: mockObserve,
          disconnect: mockDisconnect
        };
      });

      renderWithRouter(
        <LazyBookGrid
          books={manyBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
          enableVirtualization={true}
          itemsPerPage={12}
        />
      );

      // Simulate intersection
      intersectionCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        expect(screen.getByText('Book 13')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Error Handling', () => {
    it('should handle add to cart errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAddToCart.mockRejectedValue(new Error('Cart error'));

      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const addToCartButton = screen.getAllByText('Savatga')[0];
      fireEvent.click(addToCartButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error adding to cart:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('should handle add to wishlist errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAddToWishlist.mockRejectedValue(new Error('Wishlist error'));

      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const wishlistButton = screen.getAllByLabelText(/sevimlilarga qo'shish/i)[0];
      fireEvent.click(wishlistButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error adding to wishlist:', expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const addToCartButtons = screen.getAllByLabelText(/savatga qo'shish/i);
      const wishlistButtons = screen.getAllByLabelText(/sevimlilarga qo'shish/i);

      expect(addToCartButtons).toHaveLength(mockBooks.length);
      expect(wishlistButtons).toHaveLength(mockBooks.length);
    });

    it('should have proper link text for screen readers', () => {
      renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
        />
      );

      const bookLinks = screen.getAllByRole('link');
      bookLinks.forEach((link, index) => {
        expect(link).toHaveAttribute('href', expect.stringContaining('/kitob/'));
      });
    });
  });

  describe('Performance', () => {
    it('should cleanup intersection observer on unmount', () => {
      const mockDisconnect = vi.fn();
      
      global.IntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: mockDisconnect
      }));

      const { unmount } = renderWithRouter(
        <LazyBookGrid
          books={mockBooks}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
          enableVirtualization={true}
        />
      );

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should render skeleton with correct count', () => {
      renderWithRouter(
        <LazyBookGrid
          books={[]}
          loading={true}
          onAddToCart={mockAddToCart}
          onAddToWishlist={mockAddToWishlist}
          itemsPerPage={8}
        />
      );

      const skeletons = screen.getAllByTestId('book-skeleton');
      expect(skeletons).toHaveLength(8);
    });
  });
});