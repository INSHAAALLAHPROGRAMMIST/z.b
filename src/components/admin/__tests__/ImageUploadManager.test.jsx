import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ImageUploadManager from '../ImageUploadManager';
import cloudinaryService from '../../../services/CloudinaryService';
import { toastMessages } from '../../../utils/toastUtils';

// Mock dependencies
vi.mock('../../../services/CloudinaryService');
vi.mock('../../../utils/toastUtils', () => ({
  toastMessages: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

// Mock File and FileList
global.File = class MockFile {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.size = options.size || 1024;
    this.type = options.type || 'image/jpeg';
    this.lastModified = Date.now();
  }
};

global.FileList = class MockFileList extends Array {
  item(index) {
    return this[index];
  }
};

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock canvas and image
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0
}));

global.HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(['mock-blob'], { type: 'image/jpeg' }));
});

describe('ImageUploadManager', () => {
  const mockOnImagesChange = vi.fn();
  
  const defaultProps = {
    onImagesChange: mockOnImagesChange,
    maxImages: 5,
    allowCrop: true,
    allowMultiple: true,
    folder: 'test-folder'
  };

  const mockUploadResult = {
    success: true,
    data: {
      publicId: 'test-public-id',
      url: 'https://res.cloudinary.com/test/image/upload/test-public-id.jpg',
      width: 800,
      height: 600,
      format: 'jpg',
      bytes: 102400,
      createdAt: '2024-01-01T00:00:00Z'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cloudinaryService.uploadImage.mockResolvedValue(mockUploadResult);
    cloudinaryService.deleteImage.mockResolvedValue({ success: true });
    cloudinaryService.getOptimizedUrl.mockReturnValue('https://optimized-url.jpg');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders upload zone correctly', () => {
      render(<ImageUploadManager {...defaultProps} />);
      
      expect(screen.getByText(/Rasmlarni bu yerga sudrab olib keling/)).toBeInTheDocument();
      expect(screen.getByText(/JPEG, PNG, WebP formatida/)).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <ImageUploadManager {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('image-upload-manager', 'custom-class');
    });

    it('renders disabled state correctly', () => {
      render(<ImageUploadManager {...defaultProps} disabled={true} />);
      
      const uploadZone = screen.getByText(/Rasmlarni bu yerga sudrab olib keling/).closest('.upload-zone');
      expect(uploadZone).toHaveClass('disabled');
    });

    it('renders with initial images', () => {
      const initialImages = [
        {
          id: 'img1',
          publicId: 'test-id-1',
          url: 'https://test-url-1.jpg',
          fileName: 'test1.jpg',
          bytes: 1024,
          width: 400,
          height: 300,
          isMain: true
        }
      ];

      render(<ImageUploadManager {...defaultProps} initialImages={initialImages} />);
      
      expect(screen.getByText('Yuklangan rasmlar (1/5)')).toBeInTheDocument();
      expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      expect(screen.getByText('Asosiy')).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('handles file selection via input', async () => {
      const user = userEvent.setup();
      render(<ImageUploadManager {...defaultProps} />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg', size: 1024 });
      const input = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      
      await act(async () => {
        await user.upload(input, file);
      });

      await waitFor(() => {
        expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
          file,
          expect.objectContaining({
            folder: 'test-folder',
            tags: ['book-image', 'admin-upload']
          })
        );
      });

      expect(mockOnImagesChange).toHaveBeenCalled();
    });

    it('handles drag and drop', async () => {
      render(<ImageUploadManager {...defaultProps} />);
      
      const uploadZone = screen.getByText(/Rasmlarni bu yerga sudrab olib keling/).closest('.upload-zone');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg', size: 1024 });
      
      // Simulate drag enter
      fireEvent.dragEnter(uploadZone, {
        dataTransfer: { files: [file] }
      });
      
      expect(uploadZone).toHaveClass('drag-active');
      
      // Simulate drop
      await act(async () => {
        fireEvent.drop(uploadZone, {
          dataTransfer: { files: [file] }
        });
      });

      await waitFor(() => {
        expect(cloudinaryService.uploadImage).toHaveBeenCalled();
      });
    });

    it('validates file types', async () => {
      const user = userEvent.setup();
      render(<ImageUploadManager {...defaultProps} />);
      
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      
      await act(async () => {
        await user.upload(input, invalidFile);
      });

      expect(toastMessages.error).toHaveBeenCalledWith(
        expect.stringContaining('Faqat JPEG, PNG va WebP formatdagi rasmlar')
      );
      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    it('validates file size', async () => {
      const user = userEvent.setup();
      render(<ImageUploadManager {...defaultProps} />);
      
      const largeFile = new File(['test'], 'large.jpg', { 
        type: 'image/jpeg', 
        size: 11 * 1024 * 1024 // 11MB
      });
      const input = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      
      await act(async () => {
        await user.upload(input, largeFile);
      });

      expect(toastMessages.error).toHaveBeenCalledWith(
        expect.stringContaining('10MB dan oshmasligi kerak')
      );
      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    it('respects maxImages limit', async () => {
      const user = userEvent.setup();
      const initialImages = Array.from({ length: 5 }, (_, i) => ({
        id: `img${i}`,
        publicId: `test-id-${i}`,
        fileName: `test${i}.jpg`,
        isMain: i === 0
      }));

      render(<ImageUploadManager {...defaultProps} initialImages={initialImages} />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      
      await act(async () => {
        await user.upload(input, file);
      });

      expect(toastMessages.error).toHaveBeenCalledWith(
        expect.stringContaining('Maksimal 5 ta rasm yuklash mumkin')
      );
      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    it('handles single image mode', async () => {
      const user = userEvent.setup();
      const initialImages = [{
        id: 'img1',
        publicId: 'test-id-1',
        fileName: 'test1.jpg',
        isMain: true
      }];

      render(
        <ImageUploadManager 
          {...defaultProps} 
          allowMultiple={false}
          initialImages={initialImages}
        />
      );
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      
      await act(async () => {
        await user.upload(input, file);
      });

      expect(toastMessages.error).toHaveBeenCalledWith(
        expect.stringContaining('Faqat bitta rasm yuklash mumkin')
      );
    });

    it('shows upload progress', async () => {
      const user = userEvent.setup();
      let progressCallback;
      
      cloudinaryService.uploadImage.mockImplementation((file, options) => {
        progressCallback = options.onProgress;
        return new Promise(resolve => {
          setTimeout(() => {
            if (progressCallback) progressCallback(50);
            setTimeout(() => {
              if (progressCallback) progressCallback(100);
              resolve(mockUploadResult);
            }, 100);
          }, 100);
        });
      });

      render(<ImageUploadManager {...defaultProps} />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      
      await act(async () => {
        await user.upload(input, file);
      });

      // Should show uploading state
      expect(screen.getByText('Rasmlar yuklanmoqda...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Rasmlar yuklanmoqda...')).not.toBeInTheDocument();
      });
    });

    it('handles upload errors', async () => {
      const user = userEvent.setup();
      cloudinaryService.uploadImage.mockRejectedValue(new Error('Upload failed'));

      render(<ImageUploadManager {...defaultProps} />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      
      await act(async () => {
        await user.upload(input, file);
      });

      await waitFor(() => {
        expect(toastMessages.error).toHaveBeenCalledWith(
          expect.stringContaining('yuklashda xato')
        );
      });
    });
  });

  describe('Image Management', () => {
    const testImages = [
      {
        id: 'img1',
        publicId: 'test-id-1',
        url: 'https://test-url-1.jpg',
        fileName: 'test1.jpg',
        bytes: 1024,
        width: 400,
        height: 300,
        isMain: true
      },
      {
        id: 'img2',
        publicId: 'test-id-2',
        url: 'https://test-url-2.jpg',
        fileName: 'test2.jpg',
        bytes: 2048,
        width: 500,
        height: 400,
        isMain: false
      }
    ];

    it('removes images correctly', async () => {
      const user = userEvent.setup();
      render(<ImageUploadManager {...defaultProps} initialImages={testImages} />);
      
      const imageItem = screen.getByText('test2.jpg').closest('.image-item');
      
      // Hover to show overlay
      await user.hover(imageItem);
      
      const removeButton = imageItem.querySelector('.remove-btn');
      await user.click(removeButton);

      await waitFor(() => {
        expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('test-id-2');
      });

      expect(mockOnImagesChange).toHaveBeenCalled();
      expect(toastMessages.success).toHaveBeenCalledWith(
        expect.stringContaining('muvaffaqiyatli o\'chirildi')
      );
    });

    it('sets main image correctly', async () => {
      const user = userEvent.setup();
      render(<ImageUploadManager {...defaultProps} initialImages={testImages} />);
      
      const imageItem = screen.getByText('test2.jpg').closest('.image-item');
      
      // Hover to show overlay
      await user.hover(imageItem);
      
      const mainButton = imageItem.querySelector('.main-btn');
      await user.click(mainButton);

      expect(mockOnImagesChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'img1', isMain: false }),
          expect.objectContaining({ id: 'img2', isMain: true })
        ])
      );
    });

    it('handles main image removal correctly', async () => {
      const user = userEvent.setup();
      render(<ImageUploadManager {...defaultProps} initialImages={testImages} />);
      
      const mainImageItem = screen.getByText('test1.jpg').closest('.image-item');
      
      // Hover to show overlay
      await user.hover(mainImageItem);
      
      const removeButton = mainImageItem.querySelector('.remove-btn');
      await user.click(removeButton);

      await waitFor(() => {
        expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('test-id-1');
      });

      // Should make the remaining image main
      expect(mockOnImagesChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'img2', isMain: true })
        ])
      );
    });

    it('handles image removal errors', async () => {
      const user = userEvent.setup();
      cloudinaryService.deleteImage.mockRejectedValue(new Error('Delete failed'));

      render(<ImageUploadManager {...defaultProps} initialImages={testImages} />);
      
      const imageItem = screen.getByText('test1.jpg').closest('.image-item');
      
      // Hover to show overlay
      await user.hover(imageItem);
      
      const removeButton = imageItem.querySelector('.remove-btn');
      await user.click(removeButton);

      await waitFor(() => {
        expect(toastMessages.error).toHaveBeenCalledWith(
          expect.stringContaining('o\'chirishda xato')
        );
      });
    });
  });

  describe('Crop Functionality', () => {
    const testImage = {
      id: 'img1',
      publicId: 'test-id-1',
      url: 'https://test-url-1.jpg',
      fileName: 'test1.jpg',
      bytes: 1024,
      width: 400,
      height: 300,
      isMain: true
    };

    it('opens crop modal when crop button is clicked', async () => {
      const user = userEvent.setup();
      render(<ImageUploadManager {...defaultProps} initialImages={[testImage]} />);
      
      const imageItem = screen.getByText('test1.jpg').closest('.image-item');
      
      // Hover to show overlay
      await user.hover(imageItem);
      
      const cropButton = imageItem.querySelector('.crop-btn');
      await user.click(cropButton);

      expect(screen.getByText('Rasmni tahrirlash')).toBeInTheDocument();
    });

    it('does not show crop button when allowCrop is false', () => {
      render(
        <ImageUploadManager 
          {...defaultProps} 
          allowCrop={false}
          initialImages={[testImage]} 
        />
      );
      
      const imageItem = screen.getByText('test1.jpg').closest('.image-item');
      const cropButton = imageItem.querySelector('.crop-btn');
      
      expect(cropButton).toBeNull();
    });

    it('disables crop functionality when disabled', async () => {
      const user = userEvent.setup();
      render(
        <ImageUploadManager 
          {...defaultProps} 
          disabled={true}
          initialImages={[testImage]} 
        />
      );
      
      const imageItem = screen.getByText('test1.jpg').closest('.image-item');
      
      // Hover to show overlay
      await user.hover(imageItem);
      
      const cropButton = imageItem.querySelector('.crop-btn');
      expect(cropButton).toBeDisabled();
    });
  });

  describe('Multiple Images', () => {
    it('handles multiple file upload', async () => {
      const user = userEvent.setup();
      render(<ImageUploadManager {...defaultProps} />);
      
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ];
      
      const input = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      
      await act(async () => {
        await user.upload(input, files);
      });

      expect(cloudinaryService.uploadImage).toHaveBeenCalledTimes(2);
      expect(toastMessages.success).toHaveBeenCalledWith(
        expect.stringContaining('2 ta rasm muvaffaqiyatli yuklandi')
      );
    });

    it('handles partial upload failures', async () => {
      const user = userEvent.setup();
      cloudinaryService.uploadImage
        .mockResolvedValueOnce(mockUploadResult)
        .mockRejectedValueOnce(new Error('Upload failed'));

      render(<ImageUploadManager {...defaultProps} />);
      
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ];
      
      const input = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      
      await act(async () => {
        await user.upload(input, files);
      });

      await waitFor(() => {
        expect(toastMessages.success).toHaveBeenCalledWith(
          expect.stringContaining('1 ta rasm muvaffaqiyatli yuklandi')
        );
        expect(toastMessages.error).toHaveBeenCalledWith(
          expect.stringContaining('test2.jpg yuklashda xato')
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ImageUploadManager {...defaultProps} />);
      
      const fileInput = screen.getByRole('button', { name: /tanlash uchun bosing/ }).querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const testImage = {
        id: 'img1',
        publicId: 'test-id-1',
        fileName: 'test1.jpg',
        isMain: true
      };

      render(<ImageUploadManager {...defaultProps} initialImages={[testImage]} />);
      
      const removeButton = screen.getByTitle('Rasmni o\'chirish');
      
      // Should be focusable
      await user.tab();
      expect(removeButton).toHaveFocus();
    });
  });

  describe('Props Validation', () => {
    it('uses default props correctly', () => {
      render(<ImageUploadManager onImagesChange={mockOnImagesChange} />);
      
      expect(screen.getByText(/maksimal 5 ta/)).toBeInTheDocument();
    });

    it('respects custom maxImages', () => {
      render(<ImageUploadManager {...defaultProps} maxImages={3} />);
      
      expect(screen.getByText(/maksimal 3 ta/)).toBeInTheDocument();
    });

    it('handles missing onImagesChange gracefully', () => {
      expect(() => {
        render(<ImageUploadManager />);
      }).not.toThrow();
    });
  });
});