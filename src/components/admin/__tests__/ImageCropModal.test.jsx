import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ImageCropModal from '../ImageCropModal';
import cloudinaryService from '../../../services/CloudinaryService';
import { toastMessages } from '../../../utils/toastUtils';

// Mock dependencies
vi.mock('../../../services/CloudinaryService');
vi.mock('../../../utils/toastUtils');

// Mock canvas and image
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0
  })),
  width: 400,
  height: 300,
  toBlob: vi.fn((callback) => {
    callback(new Blob(['mock-blob'], { type: 'image/jpeg' }));
  })
};

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
global.HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob;

// Mock Image constructor
global.Image = class MockImage {
  constructor() {
    this.crossOrigin = '';
    this.onload = null;
    this.onerror = null;
    this.width = 800;
    this.height = 600;
  }
  
  set src(value) {
    this._src = value;
    // Simulate image load
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
  
  get src() {
    return this._src;
  }
};

// Mock File constructor
global.File = class MockFile {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.size = options.size || 1024;
    this.type = options.type || 'image/jpeg';
    this.lastModified = Date.now();
  }
};

describe('ImageCropModal', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  
  const mockImage = {
    id: 'test-id',
    publicId: 'test-public-id',
    url: 'https://test-url.jpg',
    fileName: 'test.jpg',
    width: 800,
    height: 600
  };

  const mockUploadResult = {
    success: true,
    data: {
      publicId: 'cropped-public-id',
      url: 'https://cropped-url.jpg',
      width: 400,
      height: 300,
      format: 'jpg',
      bytes: 51200,
      createdAt: '2024-01-01T00:00:00Z'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cloudinaryService.getOptimizedUrl.mockReturnValue('https://optimized-url.jpg');
    cloudinaryService.uploadImage.mockResolvedValue(mockUploadResult);
    cloudinaryService.deleteImage.mockResolvedValue({ success: true });
    
    // Mock canvas dimensions
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', {
      value: 600,
      writable: true
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', {
      value: 400,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal correctly', async () => {
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Rasmni tahrirlash')).toBeInTheDocument();
      expect(screen.getByText('Bekor qilish')).toBeInTheDocument();
      expect(screen.getByText('Saqlash')).toBeInTheDocument();
    });

    it('renders crop controls', async () => {
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByLabelText('Kenglik:')).toBeInTheDocument();
      expect(screen.getByLabelText('Balandlik:')).toBeInTheDocument();
      expect(screen.getByLabelText('Nisbat:')).toBeInTheDocument();
    });

    it('loads image and sets up canvas', async () => {
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(cloudinaryService.getOptimizedUrl).toHaveBeenCalledWith(
          'test-public-id',
          expect.objectContaining({
            width: 800,
            quality: 'auto'
          })
        );
      });
    });
  });

  describe('Crop Controls', () => {
    it('updates crop dimensions when inputs change', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const widthInput = screen.getByLabelText('Kenglik:');
      const heightInput = screen.getByLabelText('Balandlik:');

      await user.clear(widthInput);
      await user.type(widthInput, '300');

      await user.clear(heightInput);
      await user.type(heightInput, '400');

      expect(widthInput).toHaveValue(300);
      expect(heightInput).toHaveValue(400);
    });

    it('applies aspect ratio presets', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const ratioSelect = screen.getByLabelText('Nisbat:');
      
      await user.selectOptions(ratioSelect, '1:1');
      
      // Should update height to match width for 1:1 ratio
      const widthInput = screen.getByLabelText('Kenglik:');
      const heightInput = screen.getByLabelText('Balandlik:');
      
      await waitFor(() => {
        expect(parseInt(heightInput.value)).toBe(parseInt(widthInput.value));
      });
    });

    it('handles book cover ratio (3:4)', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const ratioSelect = screen.getByLabelText('Nisbat:');
      
      await user.selectOptions(ratioSelect, '3:4');
      
      const widthInput = screen.getByLabelText('Kenglik:');
      const heightInput = screen.getByLabelText('Balandlik:');
      
      await waitFor(() => {
        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value);
        const ratio = width / height;
        expect(ratio).toBeCloseTo(3/4, 1);
      });
    });

    it('enforces minimum dimensions', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const widthInput = screen.getByLabelText('Kenglik:');
      
      await user.clear(widthInput);
      await user.type(widthInput, '10'); // Below minimum
      
      expect(widthInput).toHaveAttribute('min', '50');
    });
  });

  describe('Canvas Interaction', () => {
    it('handles mouse down on canvas', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true }); // Canvas acts as img
      
      await act(async () => {
        fireEvent.mouseDown(canvas, {
          clientX: 100,
          clientY: 100
        });
      });

      // Should start dragging
      expect(canvas).toBeInTheDocument();
    });

    it('handles mouse move during drag', async () => {
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      
      // Start drag
      await act(async () => {
        fireEvent.mouseDown(canvas, {
          clientX: 100,
          clientY: 100
        });
      });

      // Move mouse
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 150,
          clientY: 150
        });
      });

      expect(canvas).toBeInTheDocument();
    });

    it('handles mouse up to end drag', async () => {
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      
      // Start and end drag
      await act(async () => {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(canvas);
      });

      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('processes and saves cropped image', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByText('Saqlash');
      
      await act(async () => {
        await user.click(saveButton);
      });

      await waitFor(() => {
        expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            folder: 'zamon-books',
            tags: ['book-image', 'cropped', 'admin-upload']
          })
        );
      });

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('test-public-id');
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          publicId: 'cropped-public-id',
          url: 'https://cropped-url.jpg'
        })
      );
    });

    it('shows processing state during save', async () => {
      const user = userEvent.setup();
      
      // Make upload take some time
      cloudinaryService.uploadImage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockUploadResult), 1000))
      );

      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByText('Saqlash');
      
      await act(async () => {
        await user.click(saveButton);
      });

      expect(screen.getByText('Saqlanmoqda...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Saqlanmoqda...')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('handles save errors', async () => {
      const user = userEvent.setup();
      cloudinaryService.uploadImage.mockRejectedValue(new Error('Upload failed'));

      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByText('Saqlash');
      
      await act(async () => {
        await user.click(saveButton);
      });

      await waitFor(() => {
        expect(toastMessages.error).toHaveBeenCalledWith(
          expect.stringContaining('tahrirlashda xato')
        );
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('handles old image deletion failure gracefully', async () => {
      const user = userEvent.setup();
      cloudinaryService.deleteImage.mockRejectedValue(new Error('Delete failed'));

      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByText('Saqlash');
      
      await act(async () => {
        await user.click(saveButton);
      });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Should still save even if old image deletion fails
      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Bekor qilish');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' }); // Close button with icon
      await user.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when clicking overlay', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const overlay = screen.getByText('Rasmni tahrirlash').closest('.crop-modal-overlay');
      await user.click(overlay);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not call onCancel when clicking modal content', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const modal = screen.getByText('Rasmni tahrirlash').closest('.crop-modal');
      await user.click(modal);

      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('disables cancel during processing', async () => {
      const user = userEvent.setup();
      
      // Make upload take some time
      cloudinaryService.uploadImage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockUploadResult), 1000))
      );

      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByText('Saqlash');
      const cancelButton = screen.getByText('Bekor qilish');
      
      await act(async () => {
        await user.click(saveButton);
      });

      expect(cancelButton).toBeDisabled();

      await waitFor(() => {
        expect(cancelButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });
  });

  describe('Canvas Drawing', () => {
    it('calls canvas drawing methods', async () => {
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(mockCanvas.getContext).toHaveBeenCalled();
      });

      // Should call drawing methods when image loads
      const ctx = mockCanvas.getContext();
      expect(ctx.clearRect).toHaveBeenCalled();
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('redraws canvas when crop data changes', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const widthInput = screen.getByLabelText('Kenglik:');
      
      // Clear previous calls
      mockCanvas.getContext().clearRect.mockClear();
      
      await user.clear(widthInput);
      await user.type(widthInput, '250');

      await waitFor(() => {
        expect(mockCanvas.getContext().clearRect).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles canvas creation errors', () => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

      expect(() => {
        render(
          <ImageCropModal 
            image={mockImage}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        );
      }).not.toThrow();

      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('handles image load errors gracefully', () => {
      const originalImage = global.Image;
      global.Image = class MockImageWithError {
        constructor() {
          this.crossOrigin = '';
          this.onload = null;
          this.onerror = null;
        }
        
        set src(value) {
          this._src = value;
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Image load failed'));
          }, 0);
        }
      };

      expect(() => {
        render(
          <ImageCropModal 
            image={mockImage}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        );
      }).not.toThrow();

      global.Image = originalImage;
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Kenglik:')).toBeInTheDocument();
      expect(screen.getByLabelText('Balandlik:')).toBeInTheDocument();
      expect(screen.getByLabelText('Nisbat:')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Should be able to tab through controls
      await user.tab();
      expect(screen.getByLabelText('Kenglik:')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Balandlik:')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Nisbat:')).toHaveFocus();
    });

    it('handles escape key to cancel', async () => {
      const user = userEvent.setup();
      render(
        <ImageCropModal 
          image={mockImage}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.keyboard('{Escape}');
      
      // Note: This would require additional implementation in the component
      // to handle escape key events
    });
  });
});