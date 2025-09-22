// CloudinaryService Test Suite
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Create a mock CloudinaryService class for testing
class MockCloudinaryService {
  constructor() {
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    this.apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    this.apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;
    
    this.uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
    this.deleteUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`;
    this.baseDeliveryUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload`;
    
    this.validateConfig();
  }

  validateConfig() {
    if (!this.cloudName) {
      throw new Error('VITE_CLOUDINARY_CLOUD_NAME environment variable is required');
    }
    if (!this.uploadPreset) {
      throw new Error('VITE_CLOUDINARY_UPLOAD_PRESET environment variable is required');
    }
  }

  validateFile(file) {
    if (!file) {
      throw new Error('Fayl tanlanmagan');
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Faqat JPEG, PNG, WebP va GIF formatdagi rasmlar qabul qilinadi');
    }
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Fayl hajmi 10MB dan oshmasligi kerak');
    }
    
    if (file.name.length > 100) {
      throw new Error('Fayl nomi 100 belgidan oshmasligi kerak');
    }
  }

  async uploadImage(file, options = {}) {
    this.validateFile(file);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      if (options.onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            options.onProgress(percentComplete);
          }
        });
      }
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            data: {
              publicId: response.public_id,
              url: response.secure_url,
              width: response.width,
              height: response.height,
              format: response.format,
              bytes: response.bytes,
              createdAt: response.created_at,
              folder: response.folder,
              tags: response.tags || []
            }
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });
      
      xhr.open('POST', this.uploadUrl);
      xhr.timeout = 60000;
      xhr.send(new FormData());
    });
  }

  async uploadMultipleImages(files, options = {}) {
    const fileArray = Array.from(files);
    const results = [];
    const errors = [];
    
    for (let i = 0; i < fileArray.length; i++) {
      try {
        const result = await this.uploadImage(fileArray[i], options);
        results.push(result);
      } catch (error) {
        errors.push({ index: i, fileName: fileArray[i].name, error });
      }
    }
    
    return {
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: fileArray.length,
        successful: results.length,
        failed: errors.length
      }
    };
  }

  async deleteImage(publicId) {
    if (!publicId) {
      throw new Error('Public ID is required for deletion');
    }
    
    const response = await fetch(this.deleteUrl, {
      method: 'POST',
      body: new FormData()
    });
    
    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      result: result.result,
      publicId
    };
  }

  getOptimizedUrl(publicId, transformations = {}) {
    if (!publicId) {
      return `${this.baseDeliveryUrl}/`;
    }
    
    const transformParts = [];
    
    if (transformations.width || transformations.height) {
      const dimensions = [];
      if (transformations.width) dimensions.push(`w_${transformations.width}`);
      if (transformations.height) dimensions.push(`h_${transformations.height}`);
      if (transformations.crop) dimensions.push(`c_${transformations.crop}`);
      transformParts.push(dimensions.join(','));
    }
    
    if (transformations.quality || transformations.format) {
      const qualityFormat = [];
      if (transformations.quality) qualityFormat.push(`q_${transformations.quality}`);
      if (transformations.format) qualityFormat.push(`f_${transformations.format}`);
      transformParts.push(qualityFormat.join(','));
    }
    
    if (transformations.radius) transformParts.push(`r_${transformations.radius}`);
    if (transformations.effect) transformParts.push(`e_${transformations.effect}`);
    if (transformations.background) transformParts.push(`b_${transformations.background}`);
    
    const transformString = transformParts.length > 0 ? transformParts.join('/') + '/' : '';
    return `${this.baseDeliveryUrl}/${transformString}${publicId}`;
  }

  getResponsiveUrls(publicId, options = {}) {
    const breakpoints = options.breakpoints || {
      mobile: 480,
      tablet: 768,
      desktop: 1200,
      large: 1920
    };
    
    const urls = {};
    Object.entries(breakpoints).forEach(([key, width]) => {
      urls[key] = this.getOptimizedUrl(publicId, { width, ...options });
    });
    
    return urls;
  }

  buildTransformationString(transformation) {
    const parts = [];
    Object.entries(transformation).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        parts.push(`${key}_${value}`);
      }
    });
    return parts.join(',');
  }

  async getUsageStats() {
    return {
      cloudName: this.cloudName,
      uploadPreset: this.uploadPreset,
      configured: !!(this.cloudName && this.uploadPreset),
      features: {
        upload: true,
        delete: !!(this.apiKey && this.apiSecret),
        transform: true,
        responsive: true
      }
    };
  }
}

describe('CloudinaryService', () => {
  let service;
  let mockFile;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MockCloudinaryService();
    
    mockFile = new File(['test content'], 'test-image.jpg', {
      type: 'image/jpeg',
      size: 102400
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with correct configuration', () => {
      expect(service.cloudName).toBe('dcn4maral');
      expect(service.uploadPreset).toBe('zamonbooks');
      expect(service.apiKey).toBe('233361884373919');
      expect(service.apiSecret).toBe('m4agJO9sMEyQPe9Bkmk13tn8t-E');
    });

    it('should build correct URLs', () => {
      expect(service.uploadUrl).toBe('https://api.cloudinary.com/v1_1/dcn4maral/image/upload');
      expect(service.deleteUrl).toBe('https://api.cloudinary.com/v1_1/dcn4maral/image/destroy');
      expect(service.baseDeliveryUrl).toBe('https://res.cloudinary.com/dcn4maral/image/upload');
    });

    it('should throw error when cloud name is missing', () => {
      // Mock missing cloud name
      const originalEnv = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME = '';
      
      expect(() => new MockCloudinaryService()).toThrow('VITE_CLOUDINARY_CLOUD_NAME environment variable is required');
      
      // Restore
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME = originalEnv;
    });

    it('should throw error when upload preset is missing', () => {
      // Mock missing upload preset
      const originalEnv = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET = '';
      
      expect(() => new MockCloudinaryService()).toThrow('VITE_CLOUDINARY_UPLOAD_PRESET environment variable is required');
      
      // Restore
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET = originalEnv;
    });
  });

  describe('File Validation', () => {
    it('should validate file successfully', () => {
      expect(() => service.validateFile(mockFile)).not.toThrow();
    });

    it('should throw error for null file', () => {
      expect(() => service.validateFile(null)).toThrow('Fayl tanlanmagan');
    });

    it('should throw error for invalid file type', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(() => service.validateFile(invalidFile)).toThrow('Faqat JPEG, PNG, WebP va GIF formatdagi rasmlar qabul qilinadi');
    });

    it('should throw error for oversized file', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg',
        size: 11 * 1024 * 1024 
      });
      expect(() => service.validateFile(largeFile)).toThrow('Fayl hajmi 10MB dan oshmasligi kerak');
    });

    it('should throw error for long filename', () => {
      const longNameFile = new File(['test'], 'x'.repeat(101) + '.jpg', { type: 'image/jpeg' });
      expect(() => service.validateFile(longNameFile)).toThrow('Fayl nomi 100 belgidan oshmasligi kerak');
    });

    it('should accept valid file types', () => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      
      validTypes.forEach(type => {
        const file = new File(['test'], `test.${type.split('/')[1]}`, { type });
        expect(() => service.validateFile(file)).not.toThrow();
      });
    });
  });

  describe('Single Image Upload', () => {
    it('should upload image successfully', async () => {
      // Mock successful XMLHttpRequest
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn((event, callback) => {
          if (event === 'load') {
            mockXHR.status = 200;
            mockXHR.responseText = JSON.stringify({
              public_id: 'zamon-books/test-image',
              secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/zamon-books/test-image.jpg',
              width: 800,
              height: 600,
              format: 'jpg',
              bytes: 102400,
              created_at: '2024-01-01T00:00:00Z',
              folder: 'zamon-books',
              tags: []
            });
            setTimeout(callback, 0);
          }
        }),
        upload: {
          addEventListener: vi.fn()
        },
        timeout: 0
      };

      global.XMLHttpRequest = vi.fn(() => mockXHR);

      const result = await service.uploadImage(mockFile);

      expect(result.success).toBe(true);
      expect(result.data.publicId).toBe('zamon-books/test-image');
      expect(result.data.url).toContain('https://res.cloudinary.com');
    });

    it('should handle upload progress', async () => {
      const progressCallback = vi.fn();
      
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn((event, callback) => {
          if (event === 'load') {
            mockXHR.status = 200;
            mockXHR.responseText = JSON.stringify({
              public_id: 'test-image',
              secure_url: 'https://test.com/image.jpg',
              width: 800,
              height: 600,
              format: 'jpg',
              bytes: 102400,
              created_at: '2024-01-01T00:00:00Z'
            });
            setTimeout(callback, 0);
          }
        }),
        upload: {
          addEventListener: vi.fn((event, callback) => {
            if (event === 'progress') {
              setTimeout(() => callback({ lengthComputable: true, loaded: 50, total: 100 }), 0);
            }
          })
        },
        timeout: 0
      };

      global.XMLHttpRequest = vi.fn(() => mockXHR);

      await service.uploadImage(mockFile, { onProgress: progressCallback });

      expect(progressCallback).toHaveBeenCalledWith(50);
    });

    it('should handle upload error', async () => {
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(callback, 0);
          }
        }),
        upload: {
          addEventListener: vi.fn()
        },
        timeout: 0
      };

      global.XMLHttpRequest = vi.fn(() => mockXHR);

      await expect(service.uploadImage(mockFile)).rejects.toThrow('Network error during upload');
    });
  });

  describe('Multiple Image Upload', () => {
    it('should upload multiple images successfully', async () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ];

      // Mock successful uploads
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn((event, callback) => {
          if (event === 'load') {
            mockXHR.status = 200;
            mockXHR.responseText = JSON.stringify({
              public_id: 'test-image',
              secure_url: 'https://test.com/image.jpg',
              width: 800,
              height: 600,
              format: 'jpg',
              bytes: 102400,
              created_at: '2024-01-01T00:00:00Z'
            });
            setTimeout(callback, 0);
          }
        }),
        upload: {
          addEventListener: vi.fn()
        },
        timeout: 0
      };

      global.XMLHttpRequest = vi.fn(() => mockXHR);

      const result = await service.uploadMultipleImages(files);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
    });
  });

  describe('Image Deletion', () => {
    it('should delete image successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'ok' })
      });

      const result = await service.deleteImage('test-public-id');

      expect(result.success).toBe(true);
      expect(result.result).toBe('ok');
      expect(result.publicId).toBe('test-public-id');
    });

    it('should throw error when public ID is missing', async () => {
      await expect(service.deleteImage('')).rejects.toThrow('Public ID is required for deletion');
    });
  });

  describe('URL Generation and Optimization', () => {
    it('should generate basic optimized URL', () => {
      const url = service.getOptimizedUrl('test-image');
      expect(url).toBe('https://res.cloudinary.com/dcn4maral/image/upload/test-image');
    });

    it('should generate URL with transformations', () => {
      const url = service.getOptimizedUrl('test-image', {
        width: 300,
        height: 200,
        crop: 'fill',
        quality: 80,
        format: 'webp'
      });

      expect(url).toContain('w_300,h_200,c_fill');
      expect(url).toContain('q_80,f_webp');
    });

    it('should generate responsive URLs', () => {
      const urls = service.getResponsiveUrls('test-image');

      expect(urls.mobile).toContain('w_480');
      expect(urls.tablet).toContain('w_768');
      expect(urls.desktop).toContain('w_1200');
      expect(urls.large).toContain('w_1920');
    });
  });

  describe('Utility Methods', () => {
    it('should build transformation string correctly', () => {
      const transformation = {
        width: 300,
        height: 200,
        crop: 'fill',
        quality: 'auto'
      };

      const result = service.buildTransformationString(transformation);
      expect(result).toBe('width_300,height_200,crop_fill,quality_auto');
    });

    it('should handle empty transformation object', () => {
      const result = service.buildTransformationString({});
      expect(result).toBe('');
    });

    it('should skip undefined values in transformation', () => {
      const transformation = {
        width: 300,
        height: undefined,
        crop: 'fill',
        quality: null
      };

      const result = service.buildTransformationString(transformation);
      expect(result).toBe('width_300,crop_fill');
    });

    it('should get usage statistics', async () => {
      const stats = await service.getUsageStats();

      expect(stats.cloudName).toBe('dcn4maral');
      expect(stats.uploadPreset).toBe('zamonbooks');
      expect(stats.configured).toBe(true);
      expect(stats.features.upload).toBe(true);
      expect(stats.features.delete).toBe(true);
      expect(stats.features.transform).toBe(true);
      expect(stats.features.responsive).toBe(true);
    });
  });
});