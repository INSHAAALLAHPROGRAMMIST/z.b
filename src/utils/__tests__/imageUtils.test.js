// Image Utils Test Suite
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageValidation, ImagePresets, ImageUpload, ImageUrl, ImageProcessing } from '../imageUtils.js';

// Mock CloudinaryService
vi.mock('../../services/CloudinaryService.js', () => ({
  default: {
    uploadImage: vi.fn(),
    uploadMultipleImages: vi.fn(),
    deleteImage: vi.fn(),
    getOptimizedUrl: vi.fn(),
    generateSEOImageData: vi.fn()
  }
}));

describe('ImageValidation', () => {
  let mockFile;

  beforeEach(() => {
    mockFile = new File(['test content'], 'test-image.jpg', {
      type: 'image/jpeg',
      size: 102400
    });
  });

  describe('isValidImage', () => {
    it('should return true for valid image types', () => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      
      validTypes.forEach(type => {
        const file = new File(['test'], 'test.jpg', { type });
        expect(ImageValidation.isValidImage(file)).toBe(true);
      });
    });

    it('should return false for invalid file types', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(ImageValidation.isValidImage(invalidFile)).toBe(false);
    });

    it('should return false for null file', () => {
      expect(ImageValidation.isValidImage(null)).toBe(false);
    });
  });

  describe('isValidSize', () => {
    it('should return true for files within size limit', () => {
      expect(ImageValidation.isValidSize(mockFile, 10)).toBe(true);
    });

    it('should return false for files exceeding size limit', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
        size: 11 * 1024 * 1024
      });
      expect(ImageValidation.isValidSize(largeFile, 10)).toBe(false);
    });

    it('should use default 10MB limit', () => {
      expect(ImageValidation.isValidSize(mockFile)).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(ImageValidation.formatFileSize(0)).toBe('0 Bytes');
      expect(ImageValidation.formatFileSize(1024)).toBe('1 KB');
      expect(ImageValidation.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(ImageValidation.formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files successfully', () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg', size: 1024 }),
        new File(['test2'], 'test2.png', { type: 'image/png', size: 2048 })
      ];

      const result = ImageValidation.validateFiles(files);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid files', () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg', size: 1024 }),
        new File(['test2'], 'test2.txt', { type: 'text/plain', size: 1024 })
      ];

      const result = ImageValidation.validateFiles(files);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].errors).toContain('Noto\'g\'ri fayl turi');
    });

    it('should enforce maximum file count', () => {
      const files = Array(15).fill().map((_, i) => 
        new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
      );

      const result = ImageValidation.validateFiles(files, { maxFiles: 10 });

      expect(result.errors).toContain('Maksimal 10 ta fayl tanlash mumkin');
    });
  });
});

describe('ImagePresets', () => {
  it('should have book cover presets', () => {
    expect(ImagePresets.bookCover).toBeDefined();
    expect(ImagePresets.bookCover.thumbnail).toEqual({
      width: 150,
      height: 225,
      crop: 'fill',
      quality: 'auto'
    });
  });

  it('should have author photo presets', () => {
    expect(ImagePresets.authorPhoto).toBeDefined();
    expect(ImagePresets.authorPhoto.thumbnail).toEqual({
      width: 100,
      height: 100,
      crop: 'fill',
      gravity: 'face',
      radius: 'max'
    });
  });

  it('should have banner presets', () => {
    expect(ImagePresets.banner).toBeDefined();
    expect(ImagePresets.banner.desktop).toEqual({
      width: 1200,
      height: 400,
      crop: 'fill',
      quality: 'auto'
    });
  });

  it('should have gallery presets', () => {
    expect(ImagePresets.gallery).toBeDefined();
    expect(ImagePresets.gallery.medium).toEqual({
      width: 400,
      height: 400,
      crop: 'fit',
      quality: 'auto'
    });
  });
});

describe('ImageUpload', () => {
  let mockFile;
  let mockCloudinaryService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFile = new File(['test content'], 'test-image.jpg', {
      type: 'image/jpeg',
      size: 102400
    });
    
    // Get the mocked service
    const { default: CloudinaryService } = await import('../../services/CloudinaryService.js');
    mockCloudinaryService = CloudinaryService;
  });

  describe('uploadSingle', () => {
    it('should upload single image successfully', async () => {
      const mockResult = {
        success: true,
        data: {
          publicId: 'test-image',
          url: 'https://test.com/image.jpg'
        }
      };

      mockCloudinaryService.uploadImage.mockResolvedValue(mockResult);

      const result = await ImageUpload.uploadSingle(mockFile);

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.originalName).toBe('test-image.jpg');
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          folder: 'zamon-books',
          tags: ['auto-upload']
        })
      );
    });

    it('should apply preset transformations', async () => {
      const mockResult = { success: true, data: {} };
      mockCloudinaryService.uploadImage.mockResolvedValue(mockResult);

      await ImageUpload.uploadSingle(mockFile, {
        preset: { category: 'bookCover', size: 'medium' }
      });

      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          transformation: ImagePresets.bookCover.medium
        })
      );
    });
  });

  describe('uploadBatch', () => {
    it('should upload multiple images', async () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ];

      const mockResult = {
        success: true,
        results: [
          { success: true, data: { publicId: 'test1' } },
          { success: true, data: { publicId: 'test2' } }
        ]
      };

      mockCloudinaryService.uploadMultipleImages.mockResolvedValue(mockResult);

      const result = await ImageUpload.uploadBatch(files);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].metadata).toBeDefined();
    });
  });

  describe('replaceImage', () => {
    it('should replace image successfully', async () => {
      const mockUploadResult = { success: true, data: { publicId: 'new-image' } };
      mockCloudinaryService.uploadImage.mockResolvedValue(mockUploadResult);
      mockCloudinaryService.deleteImage.mockResolvedValue({ success: true });

      const result = await ImageUpload.replaceImage('old-image', mockFile);

      expect(result.success).toBe(true);
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalled();
      expect(mockCloudinaryService.deleteImage).toHaveBeenCalledWith('old-image');
    });
  });
});

describe('ImageUrl', () => {
  let mockCloudinaryService;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked service
    const { default: CloudinaryService } = await import('../../services/CloudinaryService.js');
    mockCloudinaryService = CloudinaryService;
  });

  describe('getResponsiveUrls', () => {
    it('should generate responsive URLs for book covers', () => {
      mockCloudinaryService.getOptimizedUrl.mockReturnValue('https://test.com/image.jpg');

      const urls = ImageUrl.getResponsiveUrls('test-image', 'bookCover');

      expect(urls.thumbnail).toBeDefined();
      expect(urls.small).toBeDefined();
      expect(urls.medium).toBeDefined();
      expect(urls.large).toBeDefined();
      expect(mockCloudinaryService.getOptimizedUrl).toHaveBeenCalledTimes(5);
    });

    it('should return empty object for invalid inputs', () => {
      const urls = ImageUrl.getResponsiveUrls('', 'invalidCategory');
      expect(urls).toEqual({});
    });
  });

  describe('getSEOImageData', () => {
    it('should generate SEO image data', () => {
      const mockSEOData = {
        src: 'https://test.com/image.jpg',
        alt: 'Test image',
        width: 300,
        height: 450
      };

      mockCloudinaryService.generateSEOImageData.mockReturnValue(mockSEOData);

      const result = ImageUrl.getSEOImageData('test-image', {
        alt: 'Test image',
        category: 'bookCover',
        size: 'medium'
      });

      expect(result).toEqual(mockSEOData);
      expect(mockCloudinaryService.generateSEOImageData).toHaveBeenCalledWith(
        'test-image',
        expect.objectContaining({
          alt: 'Test image',
          width: 300,
          height: 450
        })
      );
    });
  });

  describe('getUrlWithFallback', () => {
    it('should return optimized URL for valid public ID', () => {
      mockCloudinaryService.getOptimizedUrl.mockReturnValue('https://test.com/image.jpg');

      const url = ImageUrl.getUrlWithFallback('test-image');

      expect(url).toBe('https://test.com/image.jpg');
    });

    it('should return fallback for empty public ID', () => {
      const url = ImageUrl.getUrlWithFallback('');

      expect(url).toBe('/images/placeholder-book.jpg');
    });

    it('should return fallback on error', () => {
      mockCloudinaryService.getOptimizedUrl.mockImplementation(() => {
        throw new Error('Test error');
      });

      const url = ImageUrl.getUrlWithFallback('test-image');

      expect(url).toBe('/images/placeholder-book.jpg');
    });
  });
});

describe('ImageProcessing', () => {
  describe('createPreview', () => {
    it('should create preview from valid image file', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,test',
        onload: null,
        onerror: null
      };

      global.FileReader = vi.fn(() => mockFileReader);

      const previewPromise = ImageProcessing.createPreview(mockFile);

      // Simulate successful read
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      const result = await previewPromise;
      expect(result).toBe('data:image/jpeg;base64,test');
    });

    it('should reject for invalid file', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(ImageProcessing.createPreview(invalidFile))
        .rejects.toThrow('Invalid image file');
    });
  });

  describe('analyzeColors', () => {
    it('should analyze colors from image data', () => {
      // Create mock image data (RGBA format)
      const mockData = new Uint8ClampedArray([
        255, 0, 0, 255,    // Red pixel
        255, 0, 0, 255,    // Red pixel
        0, 255, 0, 255,    // Green pixel
        0, 0, 255, 255     // Blue pixel
      ]);

      const colors = ImageProcessing.analyzeColors(mockData);

      expect(colors).toBeInstanceOf(Array);
      expect(colors.length).toBeGreaterThan(0);
      expect(colors[0]).toHaveProperty('r');
      expect(colors[0]).toHaveProperty('g');
      expect(colors[0]).toHaveProperty('b');
      expect(colors[0]).toHaveProperty('hex');
    });
  });
});