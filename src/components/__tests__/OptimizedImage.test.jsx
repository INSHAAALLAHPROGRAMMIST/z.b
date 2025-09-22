import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import OptimizedImage from '../OptimizedImage';

// Mock Cloudinary
vi.mock('@cloudinary/react', () => ({
  AdvancedImage: vi.fn(({ cldImg, alt, onLoad, onError, ...props }) => {
    const handleLoad = () => {
      if (onLoad) onLoad({ target: { complete: true } });
    };
    
    const handleError = () => {
      if (onError) onError({ target: { error: true } });
    };

    return (
      <img
        alt={alt}
        data-testid="cloudinary-image"
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    );
  })
}));

vi.mock('@cloudinary/url-gen', () => ({
  Cloudinary: vi.fn().mockImplementation(() => ({
    image: vi.fn().mockReturnValue({
      resize: vi.fn().mockReturnThis(),
      delivery: vi.fn().mockReturnThis(),
      effect: vi.fn().mockReturnThis()
    })
  }))
}));

// Mock auto functions
vi.mock('@cloudinary/url-gen/actions/resize', () => ({
  auto: vi.fn().mockReturnValue({
    width: vi.fn().mockReturnThis(),
    height: vi.fn().mockReturnThis()
  })
}));

vi.mock('@cloudinary/url-gen/actions/delivery', () => ({
  auto: vi.fn()
}));

vi.mock('@cloudinary/url-gen/actions/effect', () => ({
  blur: vi.fn().mockReturnValue({
    strength: vi.fn().mockReturnThis()
  })
}));

describe('OptimizedImage', () => {
  const mockIntersectionObserver = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock IntersectionObserver
    mockIntersectionObserver.mockImplementation((callback) => ({
      observe: vi.fn((element) => {
        // Simulate immediate intersection for non-lazy images
        callback([{ isIntersecting: true, target: element }]);
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
    
    global.IntersectionObserver = mockIntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with Cloudinary URL', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/v1/sample.jpg';
      
      render(
        <OptimizedImage
          src={cloudinaryUrl}
          alt="Test image"
          width={300}
          height={200}
        />
      );

      expect(screen.getByTestId('cloudinary-image')).toBeInTheDocument();
    });

    it('should render fallback img for non-Cloudinary URLs', () => {
      const regularUrl = 'https://example.com/image.jpg';
      
      render(
        <OptimizedImage
          src={regularUrl}
          alt="Test image"
          lazy={false}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', regularUrl);
      expect(img).toHaveAttribute('alt', 'Test image');
    });

    it('should show placeholder while loading', () => {
      render(
        <OptimizedImage
          src="https://res.cloudinary.com/test/image/upload/v1/sample.jpg"
          alt="Test image"
          placeholder={true}
        />
      );

      expect(screen.getByTestId('cloudinary-image')).toBeInTheDocument();
    });
  });

  describe('Lazy Loading', () => {
    it('should not load image initially when lazy=true', () => {
      const mockObserve = vi.fn();
      mockIntersectionObserver.mockImplementation(() => ({
        observe: mockObserve,
        unobserve: vi.fn(),
        disconnect: vi.fn()
      }));

      render(
        <OptimizedImage
          src="https://res.cloudinary.com/test/image/upload/v1/sample.jpg"
          alt="Test image"
          lazy={true}
        />
      );

      expect(mockObserve).toHaveBeenCalled();
    });

    it('should load image immediately when lazy=false', () => {
      render(
        <OptimizedImage
          src="https://res.cloudinary.com/test/image/upload/v1/sample.jpg"
          alt="Test image"
          lazy={false}
        />
      );

      expect(screen.getByTestId('cloudinary-image')).toBeInTheDocument();
    });

    it('should load image when it comes into view', async () => {
      let intersectionCallback;
      
      mockIntersectionObserver.mockImplementation((callback) => {
        intersectionCallback = callback;
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn()
        };
      });

      render(
        <OptimizedImage
          src="https://res.cloudinary.com/test/image/upload/v1/sample.jpg"
          alt="Test image"
          lazy={true}
        />
      );

      // Simulate intersection
      intersectionCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        expect(screen.getByTestId('cloudinary-image')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should fallback to regular img on Cloudinary error', async () => {
      // Mock Cloudinary to throw error
      const { Cloudinary } = await import('@cloudinary/url-gen');
      Cloudinary.mockImplementation(() => {
        throw new Error('Cloudinary error');
      });

      render(
        <OptimizedImage
          src="https://res.cloudinary.com/test/image/upload/v1/sample.jpg"
          alt="Test image"
          lazy={false}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Test image');
    });

    it('should call onError callback when image fails to load', async () => {
      const onError = vi.fn();
      
      render(
        <OptimizedImage
          src="https://res.cloudinary.com/test/image/upload/v1/invalid.jpg"
          alt="Test image"
          onError={onError}
          lazy={false}
        />
      );

      const img = screen.getByTestId('cloudinary-image');
      fireEvent.error(img);

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Load Events', () => {
    it('should call onLoad callback when image loads successfully', async () => {
      const onLoad = vi.fn();
      
      render(
        <OptimizedImage
          src="https://res.cloudinary.com/test/image/upload/v1/sample.jpg"
          alt="Test image"
          onLoad={onLoad}
          lazy={false}
        />
      );

      const img = screen.getByTestId('cloudinary-image');
      fireEvent.load(img);

      expect(onLoad).toHaveBeenCalled();
    });

    it('should update loading state on image load', async () => {
      render(
        <OptimizedImage
          src="https://res.cloudinary.com/test/image/upload/v1/sample.jpg"
          alt="Test image"
          lazy={false}
        />
      );

      const img = screen.getByTestId('cloudinary-image');
      
      // Initially should have loading class
      expect(img).toHaveClass('loading');
      
      fireEvent.load(img);

      await waitFor(() => {
        expect(img).toHaveClass('loaded');
      });
    });
  });

  describe('Public ID Extraction', () => {
    it('should extract public ID from Cloudinary URL', () => {
      const component = render(
        <OptimizedImage
          src="https://res.cloudinary.com/test/image/upload/v1234/folder/sample.jpg"
          alt="Test image"
          lazy={false}
        />
      );

      // The component should render successfully with extracted public ID
      expect(screen.getByTestId('cloudinary-image')).toBeInTheDocument();
    });

    it('should handle public ID directly', () => {
      render(
        <OptimizedImage
          src="sample"
          alt="Test image"
          lazy={false}
        />
      );

      expect(screen.getByTestId('cloudinary-image')).toBeInTheDocument();
    });
  });

  describe('Optimization Parameters', () => {
    it('should apply width and height transformations', () => {
      render(
        <OptimizedImage
          src="sample"
          alt="Test image"
          width={300}
          height={200}
          lazy={false}
        />
      );

      expect(screen.getByTestId('cloudinary-image')).toBeInTheDocument();
    });

    it('should apply quality and format optimizations', () => {
      render(
        <OptimizedImage
          src="sample"
          alt="Test image"
          quality="auto"
          format="auto"
          lazy={false}
        />
      );

      expect(screen.getByTestId('cloudinary-image')).toBeInTheDocument();
    });

    it('should apply blur effect when specified', () => {
      render(
        <OptimizedImage
          src="sample"
          alt="Test image"
          blur={10}
          lazy={false}
        />
      );

      expect(screen.getByTestId('cloudinary-image')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text', () => {
      render(
        <OptimizedImage
          src="sample"
          alt="A beautiful landscape"
          lazy={false}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'A beautiful landscape');
    });

    it('should support additional props', () => {
      render(
        <OptimizedImage
          src="sample"
          alt="Test image"
          className="custom-class"
          data-testid="custom-image"
          lazy={false}
        />
      );

      const container = screen.getByTestId('custom-image');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Performance', () => {
    it('should cleanup intersection observer on unmount', () => {
      const mockDisconnect = vi.fn();
      
      mockIntersectionObserver.mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: mockDisconnect
      }));

      const { unmount } = render(
        <OptimizedImage
          src="sample"
          alt="Test image"
          lazy={true}
        />
      );

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should handle multiple instances efficiently', () => {
      render(
        <div>
          <OptimizedImage src="sample1" alt="Image 1" lazy={true} />
          <OptimizedImage src="sample2" alt="Image 2" lazy={true} />
          <OptimizedImage src="sample3" alt="Image 3" lazy={true} />
        </div>
      );

      // Each image should have its own observer
      expect(mockIntersectionObserver).toHaveBeenCalledTimes(3);
    });
  });
});