/**
 * Secure File Upload Service Tests
 * Tests for file upload security validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import SecureFileUploadService from '../SecureFileUploadService';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock FileReader
global.FileReader = class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.result = null;
  }

  readAsArrayBuffer(blob) {
    // Simulate reading file bytes
    setTimeout(() => {
      if (blob.name && blob.name.includes('malicious')) {
        // Simulate malicious file signature
        this.result = new ArrayBuffer(20);
        const view = new Uint8Array(this.result);
        view[0] = 0x4D; // PE executable signature
        view[1] = 0x5A;
      } else {
        // Simulate normal image file signature (JPEG)
        this.result = new ArrayBuffer(20);
        const view = new Uint8Array(this.result);
        view[0] = 0xFF; // JPEG signature
        view[1] = 0xD8;
        view[2] = 0xFF;
      }
      
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
};

// Mock Image constructor
global.Image = class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.naturalWidth = 800;
    this.naturalHeight = 600;
  }

  set src(value) {
    setTimeout(() => {
      if (value.includes('invalid')) {
        if (this.onerror) this.onerror();
      } else {
        if (this.onload) this.onload();
      }
    }, 10);
  }
};

describe('SecureFileUploadService', () => {
  describe('Basic File Validation', () => {
    it('should validate correct image files', async () => {
      const validFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const result = await SecureFileUploadService.validateFile(validFile, 'image');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedFileName).toContain('test');
      expect(result.sanitizedFileName).toContain('.jpg');
    });

    it('should reject files that are too large', async () => {
      const largeFile = {
        name: 'large.jpg',
        type: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB (exceeds 10MB limit)
        lastModified: Date.now(),
        slice: () => new Blob()
      };

      const result = await SecureFileUploadService.validateFile(largeFile, 'image');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('10MB'))).toBe(true);
    });

    it('should reject empty files', async () => {
      const emptyFile = new File([''], 'empty.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const result = await SecureFileUploadService.validateFile(emptyFile, 'image');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('empty'))).toBe(true);
    });

    it('should reject files without proper extensions', async () => {
      const noExtFile = new File(['test'], 'noextension', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const result = await SecureFileUploadService.validateFile(noExtFile, 'image');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('extension'))).toBe(true);
    });
  });

  describe('MIME Type Validation', () => {
    it('should accept allowed MIME types', async () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      
      for (const mimeType of allowedTypes) {
        const file = new File(['test'], `test.${mimeType.split('/')[1]}`, {
          type: mimeType,
          lastModified: Date.now()
        });

        const validation = SecureFileUploadService.validateMimeType(file, {
          allowedMimeTypes: allowedTypes
        });
        
        expect(validation.isValid).toBe(true);
      }
    });

    it('should reject disallowed MIME types', async () => {
      const file = new File(['test'], 'test.exe', {
        type: 'application/exe',
        lastModified: Date.now()
      });

      const validation = SecureFileUploadService.validateMimeType(file, {
        allowedMimeTypes: ['image/jpeg', 'image/png']
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('not allowed');
    });

    it('should reject files without MIME type', async () => {
      const file = new File(['test'], 'test.jpg', {
        type: '',
        lastModified: Date.now()
      });

      const validation = SecureFileUploadService.validateMimeType(file, {
        allowedMimeTypes: ['image/jpeg']
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('cannot be determined');
    });
  });

  describe('File Extension Validation', () => {
    it('should accept allowed extensions', () => {
      const allowedExtensions = ['.jpg', '.png', '.webp'];
      
      allowedExtensions.forEach(ext => {
        const file = new File(['test'], `test${ext}`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        const validation = SecureFileUploadService.validateFileExtension(file, {
          allowedExtensions
        });
        
        expect(validation.isValid).toBe(true);
      });
    });

    it('should reject disallowed extensions', () => {
      const file = new File(['test'], 'test.exe', {
        type: 'application/exe',
        lastModified: Date.now()
      });

      const validation = SecureFileUploadService.validateFileExtension(file, {
        allowedExtensions: ['.jpg', '.png']
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('not allowed');
    });
  });

  describe('File Signature Validation', () => {
    it('should validate JPEG signatures', () => {
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const isValid = SecureFileUploadService.validateImageSignature(jpegBytes, 'image/jpeg');
      expect(isValid).toBe(true);
    });

    it('should validate PNG signatures', () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const isValid = SecureFileUploadService.validateImageSignature(pngBytes, 'image/png');
      expect(isValid).toBe(true);
    });

    it('should validate GIF signatures', () => {
      const gif87Bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
      const gif89Bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      
      expect(SecureFileUploadService.validateImageSignature(gif87Bytes, 'image/gif')).toBe(true);
      expect(SecureFileUploadService.validateImageSignature(gif89Bytes, 'image/gif')).toBe(true);
    });

    it('should reject mismatched signatures', () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
      const isValid = SecureFileUploadService.validateImageSignature(pngBytes, 'image/jpeg');
      expect(isValid).toBe(false);
    });
  });

  describe('Malicious Content Detection', () => {
    it('should detect malicious file signatures', async () => {
      const maliciousFile = new File(['test'], 'malicious.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // Mock the file to have malicious signature
      maliciousFile.slice = () => new Blob(['test'], { type: 'image/jpeg' });
      maliciousFile.name = 'malicious.jpg'; // This triggers malicious signature in mock

      const result = await SecureFileUploadService.detectMaliciousContent(maliciousFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('malicious'))).toBe(true);
    });

    it('should detect script content in files', () => {
      const scriptContent = '<script>alert("xss")</script>';
      const hasScript = SecureFileUploadService.containsScriptContent(scriptContent);
      expect(hasScript).toBe(true);
    });

    it('should detect various script patterns', () => {
      const scriptPatterns = [
        'javascript:void(0)',
        'onload="alert(1)"',
        'eval(malicious)',
        '<iframe src="evil.com">',
        '<object data="malicious.swf">',
        '<embed src="evil.swf">'
      ];

      scriptPatterns.forEach(pattern => {
        const hasScript = SecureFileUploadService.containsScriptContent(pattern);
        expect(hasScript).toBe(true);
      });
    });

    it('should not flag normal content', () => {
      const normalContent = 'This is normal image content with some metadata';
      const hasScript = SecureFileUploadService.containsScriptContent(normalContent);
      expect(hasScript).toBe(false);
    });
  });

  describe('Image Validation', () => {
    it('should validate image dimensions', async () => {
      const imageFile = new File(['test'], 'test.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const result = await SecureFileUploadService.validateImageFile(imageFile, {
        maxDimensions: { width: 1000, height: 1000 }
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject oversized images', async () => {
      // Mock image with large dimensions
      const originalImage = global.Image;
      global.Image = class MockLargeImage extends originalImage {
        constructor() {
          super();
          this.naturalWidth = 5000;
          this.naturalHeight = 5000;
        }
      };

      const imageFile = new File(['test'], 'large.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const result = await SecureFileUploadService.validateImageFile(imageFile, {
        maxDimensions: { width: 4000, height: 4000 }
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('width'))).toBe(true);

      // Restore original Image
      global.Image = originalImage;
    });

    it('should detect suspicious aspect ratios', async () => {
      // Mock image with suspicious aspect ratio
      const originalImage = global.Image;
      global.Image = class MockSuspiciousImage extends originalImage {
        constructor() {
          super();
          this.naturalWidth = 10000;
          this.naturalHeight = 1; // Very wide image
        }
      };

      const imageFile = new File(['test'], 'suspicious.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const result = await SecureFileUploadService.validateImageFile(imageFile, {
        maxDimensions: { width: 20000, height: 20000 }
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('suspicious aspect ratio'))).toBe(true);

      // Restore original Image
      global.Image = originalImage;
    });
  });

  describe('File Name Validation', () => {
    it('should validate normal file names', () => {
      const validNames = [
        'image.jpg',
        'my_photo.png',
        'document-v2.pdf',
        'file123.webp'
      ];

      validNames.forEach(name => {
        const result = SecureFileUploadService.validateFileName(name);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject dangerous file names', () => {
      const dangerousNames = [
        'file<script>.jpg',
        'image"malicious.png',
        'file|pipe.jpg',
        'image?.png',
        'file*.jpg'
      ];

      dangerousNames.forEach(name => {
        const result = SecureFileUploadService.validateFileName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('invalid characters');
      });
    });

    it('should reject reserved names', () => {
      const reservedNames = [
        'CON.jpg',
        'PRN.png',
        'AUX.gif',
        'COM1.webp',
        'LPT1.jpg'
      ];

      reservedNames.forEach(name => {
        const result = SecureFileUploadService.validateFileName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('reserved');
      });
    });

    it('should reject overly long file names', () => {
      const longName = 'a'.repeat(300) + '.jpg';
      const result = SecureFileUploadService.validateFileName(longName);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('too long');
    });
  });

  describe('File Name Sanitization', () => {
    it('should sanitize dangerous characters', () => {
      const dangerousName = 'file<script>alert(1)</script>.jpg';
      const sanitized = SecureFileUploadService.sanitizeFileName(dangerousName);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).toContain('.jpg');
    });

    it('should replace spaces with underscores', () => {
      const nameWithSpaces = 'my photo file.jpg';
      const sanitized = SecureFileUploadService.sanitizeFileName(nameWithSpaces);
      
      expect(sanitized).toContain('my_photo_file');
      expect(sanitized).not.toContain(' ');
    });

    it('should remove multiple dots', () => {
      const nameWithDots = 'file...with...dots.jpg';
      const sanitized = SecureFileUploadService.sanitizeFileName(nameWithDots);
      
      expect(sanitized).toMatch(/file_with_dots_\d+\.jpg/);
    });

    it('should add timestamp for uniqueness', async () => {
      const fileName = 'test.jpg';
      const sanitized1 = SecureFileUploadService.sanitizeFileName(fileName);
      
      // Wait a small amount to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const sanitized2 = SecureFileUploadService.sanitizeFileName(fileName);
      
      expect(sanitized1).not.toBe(sanitized2);
      expect(sanitized1).toMatch(/test_\d+\.jpg/);
      expect(sanitized2).toMatch(/test_\d+\.jpg/);
    });

    it('should truncate overly long names', () => {
      const longName = 'a'.repeat(150) + '.jpg';
      const sanitized = SecureFileUploadService.sanitizeFileName(longName);
      
      expect(sanitized.length).toBeLessThan(120); // Should be truncated
      expect(sanitized).toMatch(/\.jpg$/); // Should still have extension
    });
  });

  describe('Cloudinary Integration', () => {
    it('should generate secure upload parameters', () => {
      const file = new File(['test'], 'test image.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const params = SecureFileUploadService.generateSecureUploadParams(file, {
        folder: 'books',
        uploadPreset: 'book_images'
      });

      expect(params.public_id).toContain('books/');
      expect(params.public_id).toContain('test_image');
      expect(params.upload_preset).toBe('book_images');
      expect(params.flags).toBe('sanitize');
      expect(params.context.original_filename).toBe('test image.jpg');
      expect(params.context.security_validated).toBe('true');
    });

    it('should validate Cloudinary response', () => {
      const validResponse = {
        public_id: 'books/test_image_123456',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v123456/books/test_image_123456.jpg',
        resource_type: 'image',
        format: 'jpg'
      };

      const result = SecureFileUploadService.validateCloudinaryResponse(validResponse);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid Cloudinary response', () => {
      const invalidResponse = {
        public_id: 'test',
        secure_url: 'https://evil.com/malicious.jpg', // Wrong domain
        resource_type: 'image'
        // Missing format
      };

      const result = SecureFileUploadService.validateCloudinaryResponse(invalidResponse);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect suspicious transformations', () => {
      const suspiciousResponse = {
        public_id: 'test',
        secure_url: 'https://res.cloudinary.com/demo/image/fetch/https://evil.com/malicious.jpg',
        resource_type: 'image',
        format: 'jpg'
      };

      const result = SecureFileUploadService.validateCloudinaryResponse(suspiciousResponse);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Suspicious transformation'))).toBe(true);
    });
  });

  describe('Bytes Matching', () => {
    it('should match byte signatures correctly', () => {
      const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const jpegSignature = [0xFF, 0xD8, 0xFF];
      
      const matches = SecureFileUploadService.bytesMatch(bytes, jpegSignature);
      expect(matches).toBe(true);
    });

    it('should not match incorrect signatures', () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
      const jpegSignature = [0xFF, 0xD8, 0xFF];
      
      const matches = SecureFileUploadService.bytesMatch(bytes, jpegSignature);
      expect(matches).toBe(false);
    });

    it('should handle insufficient bytes', () => {
      const bytes = new Uint8Array([0xFF, 0xD8]);
      const jpegSignature = [0xFF, 0xD8, 0xFF];
      
      const matches = SecureFileUploadService.bytesMatch(bytes, jpegSignature);
      expect(matches).toBe(false);
    });
  });
});