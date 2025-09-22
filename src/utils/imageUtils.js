// Image Utilities for Cloudinary Integration
// Rasm bilan ishlash uchun yordamchi funksiyalar

import cloudinaryService from '../services/CloudinaryService.js';

/**
 * Image file validation utilities
 */
export const ImageValidation = {
  /**
   * Check if file is a valid image
   * @param {File} file - File to validate
   * @returns {boolean} True if valid image
   */
  isValidImage(file) {
    if (!file) return false;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    return validTypes.includes(file.type);
  },

  /**
   * Check if file size is within limits
   * @param {File} file - File to check
   * @param {number} maxSizeMB - Maximum size in MB (default: 10)
   * @returns {boolean} True if within limits
   */
  isValidSize(file, maxSizeMB = 10) {
    if (!file) return false;
    
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  },

  /**
   * Get file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size string
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Validate multiple files
   * @param {FileList|Array} files - Files to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateFiles(files, options = {}) {
    const { maxFiles = 10, maxSizeMB = 10 } = options;
    const fileArray = Array.from(files);
    
    const results = {
      valid: [],
      invalid: [],
      errors: []
    };

    if (fileArray.length > maxFiles) {
      results.errors.push(`Maksimal ${maxFiles} ta fayl tanlash mumkin`);
      return results;
    }

    fileArray.forEach((file, index) => {
      const fileResult = { file, index, errors: [] };

      if (!this.isValidImage(file)) {
        fileResult.errors.push('Noto\'g\'ri fayl turi');
      }

      if (!this.isValidSize(file, maxSizeMB)) {
        fileResult.errors.push(`Fayl hajmi ${maxSizeMB}MB dan oshmasligi kerak`);
      }

      if (fileResult.errors.length === 0) {
        results.valid.push(fileResult);
      } else {
        results.invalid.push(fileResult);
      }
    });

    return results;
  }
};

/**
 * Image transformation presets for different use cases
 */
export const ImagePresets = {
  /**
   * Book cover presets
   */
  bookCover: {
    thumbnail: { width: 150, height: 225, crop: 'fill', quality: 'auto' },
    small: { width: 200, height: 300, crop: 'fill', quality: 'auto' },
    medium: { width: 300, height: 450, crop: 'fill', quality: 'auto' },
    large: { width: 400, height: 600, crop: 'fill', quality: 'auto' },
    hero: { width: 600, height: 900, crop: 'fill', quality: 'auto' }
  },

  /**
   * Author photo presets
   */
  authorPhoto: {
    thumbnail: { width: 100, height: 100, crop: 'fill', gravity: 'face', radius: 'max' },
    small: { width: 150, height: 150, crop: 'fill', gravity: 'face', radius: 10 },
    medium: { width: 200, height: 200, crop: 'fill', gravity: 'face' },
    large: { width: 300, height: 300, crop: 'fill', gravity: 'face' }
  },

  /**
   * Banner/hero image presets
   */
  banner: {
    mobile: { width: 480, height: 240, crop: 'fill', quality: 'auto' },
    tablet: { width: 768, height: 384, crop: 'fill', quality: 'auto' },
    desktop: { width: 1200, height: 400, crop: 'fill', quality: 'auto' },
    large: { width: 1920, height: 640, crop: 'fill', quality: 'auto' }
  },

  /**
   * Gallery image presets
   */
  gallery: {
    thumbnail: { width: 200, height: 200, crop: 'fill', quality: 'auto' },
    medium: { width: 400, height: 400, crop: 'fit', quality: 'auto' },
    large: { width: 800, height: 800, crop: 'fit', quality: 'auto' },
    fullscreen: { width: 1200, height: 1200, crop: 'fit', quality: 'auto' }
  }
};

/**
 * Image upload utilities
 */
export const ImageUpload = {
  /**
   * Upload single image with progress tracking
   * @param {File} file - Image file to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadSingle(file, options = {}) {
    const {
      folder = 'zamon-books',
      tags = [],
      onProgress = null,
      preset = null
    } = options;

    try {
      // Apply preset transformations if specified
      let transformation = {};
      if (preset && ImagePresets[preset.category] && ImagePresets[preset.category][preset.size]) {
        transformation = ImagePresets[preset.category][preset.size];
      }

      const uploadOptions = {
        folder,
        tags: [...tags, 'auto-upload'],
        transformation,
        onProgress
      };

      const result = await cloudinaryService.uploadImage(file, uploadOptions);
      
      return {
        ...result,
        metadata: {
          originalName: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  /**
   * Upload multiple images with batch processing
   * @param {FileList|Array} files - Image files to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Batch upload result
   */
  async uploadBatch(files, options = {}) {
    const {
      folder = 'zamon-books',
      tags = [],
      onProgress = null,
      onSingleComplete = null,
      concurrent = 3
    } = options;

    try {
      const uploadOptions = {
        folder,
        tags: [...tags, 'batch-upload'],
        concurrent,
        onProgress,
        onSingleComplete
      };

      const result = await cloudinaryService.uploadMultipleImages(files, uploadOptions);
      
      // Add metadata to successful uploads
      result.results = result.results.map((uploadResult, index) => ({
        ...uploadResult,
        metadata: {
          originalName: files[index]?.name,
          size: files[index]?.size,
          type: files[index]?.type,
          uploadedAt: new Date().toISOString()
        }
      }));

      return result;

    } catch (error) {
      console.error('Error uploading batch:', error);
      throw error;
    }
  },

  /**
   * Replace existing image
   * @param {string} oldPublicId - Public ID of image to replace
   * @param {File} newFile - New image file
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Replace result
   */
  async replaceImage(oldPublicId, newFile, options = {}) {
    try {
      // Upload new image first
      const uploadResult = await this.uploadSingle(newFile, options);
      
      if (uploadResult.success) {
        // Delete old image
        try {
          await cloudinaryService.deleteImage(oldPublicId);
        } catch (deleteError) {
          console.warn('Failed to delete old image:', deleteError);
          // Don't fail the whole operation if delete fails
        }
      }

      return uploadResult;

    } catch (error) {
      console.error('Error replacing image:', error);
      throw error;
    }
  }
};

/**
 * Image URL utilities
 */
export const ImageUrl = {
  /**
   * Generate responsive image URLs
   * @param {string} publicId - Public ID of the image
   * @param {string} category - Image category (bookCover, authorPhoto, etc.)
   * @returns {Object} Responsive URLs
   */
  getResponsiveUrls(publicId, category = 'bookCover') {
    if (!publicId || !ImagePresets[category]) {
      return {};
    }

    const urls = {};
    const presets = ImagePresets[category];

    Object.entries(presets).forEach(([size, transformation]) => {
      urls[size] = cloudinaryService.getOptimizedUrl(publicId, transformation);
    });

    return urls;
  },

  /**
   * Generate SEO-optimized image data
   * @param {string} publicId - Public ID of the image
   * @param {Object} seoData - SEO data
   * @returns {Object} SEO image data
   */
  getSEOImageData(publicId, seoData = {}) {
    const {
      alt = '',
      title = '',
      category = 'bookCover',
      size = 'medium'
    } = seoData;

    const preset = ImagePresets[category]?.[size] || ImagePresets.bookCover.medium;
    
    return cloudinaryService.generateSEOImageData(publicId, {
      alt,
      title,
      ...preset
    });
  },

  /**
   * Get image URL with fallback
   * @param {string} publicId - Public ID of the image
   * @param {Object} options - URL options
   * @returns {string} Image URL with fallback
   */
  getUrlWithFallback(publicId, options = {}) {
    const {
      fallback = '/images/placeholder-book.jpg',
      transformation = {}
    } = options;

    if (!publicId) {
      return fallback;
    }

    try {
      return cloudinaryService.getOptimizedUrl(publicId, transformation);
    } catch (error) {
      console.warn('Error generating image URL:', error);
      return fallback;
    }
  }
};

/**
 * Image processing utilities
 */
export const ImageProcessing = {
  /**
   * Create image preview from file
   * @param {File} file - Image file
   * @returns {Promise<string>} Data URL for preview
   */
  createPreview(file) {
    return new Promise((resolve, reject) => {
      if (!file || !ImageValidation.isValidImage(file)) {
        reject(new Error('Invalid image file'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  },

  /**
   * Resize image on client side (basic canvas-based resizing)
   * @param {File} file - Image file to resize
   * @param {Object} options - Resize options
   * @returns {Promise<Blob>} Resized image blob
   */
  async resizeImage(file, options = {}) {
    const {
      maxWidth = 800,
      maxHeight = 600,
      quality = 0.8,
      format = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and resize image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(resolve, format, quality);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Create object URL for the image
      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * Extract dominant colors from image
   * @param {File|string} source - Image file or URL
   * @returns {Promise<Array>} Array of dominant colors
   */
  async extractColors(source) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const colors = this.analyzeColors(imageData.data);
          resolve(colors);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      if (typeof source === 'string') {
        img.crossOrigin = 'anonymous';
        img.src = source;
      } else {
        img.src = URL.createObjectURL(source);
      }
    });
  },

  /**
   * Analyze colors from image data
   * @param {Uint8ClampedArray} data - Image pixel data
   * @returns {Array} Dominant colors
   */
  analyzeColors(data) {
    const colorMap = new Map();
    
    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];
      
      // Skip transparent pixels
      if (alpha < 128) continue;
      
      // Group similar colors
      const colorKey = `${Math.floor(r / 32) * 32},${Math.floor(g / 32) * 32},${Math.floor(b / 32) * 32}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }
    
    // Sort by frequency and return top colors
    return Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return { r, g, b, hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}` };
      });
  }
};

// Default export with all utilities
export default {
  ImageValidation,
  ImagePresets,
  ImageUpload,
  ImageUrl,
  ImageProcessing
};