// Cloudinary Integration Service
// Rasm yuklash va boshqarish uchun Cloudinary bilan integratsiya

import errorHandlingService from './ErrorHandlingService';

class CloudinaryService {
  constructor() {
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    this.apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    this.apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;
    
    // Base URLs
    this.uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
    this.deleteUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`;
    this.baseDeliveryUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload`;
    
    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate Cloudinary configuration
   */
  validateConfig() {
    if (!this.cloudName) {
      throw new Error('VITE_CLOUDINARY_CLOUD_NAME environment variable is required');
    }
    if (!this.uploadPreset) {
      throw new Error('VITE_CLOUDINARY_UPLOAD_PRESET environment variable is required');
    }
    if (!this.apiKey) {
      console.warn('VITE_CLOUDINARY_API_KEY not found - some features may be limited');
    }
  }

  /**
   * Upload single image to Cloudinary
   * @param {File} file - Image file to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with URL and metadata
   */
  async uploadImage(file, options = {}) {
    return await errorHandlingService.retryOperation(async () => {
      try {
        // Validate file
        this.validateFile(file);
        
        const {
          folder = 'zamon-books',
          transformation = {},
          tags = [],
          context = {},
          onProgress = null
        } = options;

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', folder);
      
      // Add optional parameters
      if (tags.length > 0) {
        formData.append('tags', tags.join(','));
      }
      
      if (Object.keys(context).length > 0) {
        formData.append('context', Object.entries(context).map(([k, v]) => `${k}=${v}`).join('|'));
      }
      
      // Add transformation if provided
      if (Object.keys(transformation).length > 0) {
        formData.append('transformation', this.buildTransformationString(transformation));
      }

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Progress tracking
        if (onProgress && typeof onProgress === 'function') {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              onProgress(percentComplete);
            }
          });
        }
        
        // Handle response
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
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
            } catch (error) {
              reject(new Error(`Invalid response format: ${error.message}`));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(`Upload failed: ${errorResponse.error?.message || 'Unknown error'}`));
            } catch (error) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timeout'));
        });
        
        // Configure and send request
        xhr.open('POST', this.uploadUrl);
        xhr.timeout = 60000; // 60 seconds timeout
        xhr.send(formData);
      });
      
    } catch (error) {
      const processedError = errorHandlingService.handleError(
        error, 
        'cloudinary_upload', 
        { fileName: file?.name, fileSize: file?.size }
      );
      throw new Error(processedError.userMessage);
    }
    }, { maxRetries: 2, baseDelay: 1000 });
  }

  /**
   * Upload multiple images
   * @param {FileList|Array} files - Array of image files
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultipleImages(files, options = {}) {
    try {
      const fileArray = Array.from(files);
      const {
        concurrent = 3, // Maximum concurrent uploads
        onProgress = null,
        onSingleComplete = null
      } = options;
      
      const results = [];
      const errors = [];
      let completed = 0;
      
      // Process files in batches
      for (let i = 0; i < fileArray.length; i += concurrent) {
        const batch = fileArray.slice(i, i + concurrent);
        
        const batchPromises = batch.map(async (file, index) => {
          try {
            const singleOptions = {
              ...options,
              onProgress: onProgress ? (progress) => {
                onProgress({
                  fileIndex: i + index,
                  fileName: file.name,
                  progress,
                  completed,
                  total: fileArray.length
                });
              } : null
            };
            
            const result = await this.uploadImage(file, singleOptions);
            completed++;
            
            if (onSingleComplete) {
              onSingleComplete({
                fileIndex: i + index,
                fileName: file.name,
                result,
                completed,
                total: fileArray.length
              });
            }
            
            return { index: i + index, result, error: null };
          } catch (error) {
            completed++;
            const errorInfo = { index: i + index, fileName: file.name, error };
            errors.push(errorInfo);
            return errorInfo;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      // Separate successful uploads from errors
      const successful = results.filter(r => r.result && !r.error);
      const failed = results.filter(r => r.error);
      
      return {
        success: failed.length === 0,
        results: successful.map(r => r.result),
        errors: failed,
        summary: {
          total: fileArray.length,
          successful: successful.length,
          failed: failed.length
        }
      };
      
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      throw new Error(`Ko'p rasm yuklashda xato: ${error.message}`);
    }
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Public ID of the image to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteImage(publicId) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required for deletion');
      }
      
      if (!this.apiKey || !this.apiSecret) {
        throw new Error('API credentials required for deletion');
      }
      
      // Generate timestamp and signature for authenticated request
      const timestamp = Math.round(Date.now() / 1000);
      const signature = await this.generateSignature({ public_id: publicId, timestamp });
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', this.apiKey);
      formData.append('signature', signature);
      
      const response = await fetch(this.deleteUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Delete failed: ${errorData.error?.message || response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        result: result.result, // 'ok' if successful
        publicId
      };
      
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error(`Rasm o'chirishda xato: ${error.message}`);
    }
  }

  /**
   * Get optimized image URL with transformations
   * @param {string} publicId - Public ID of the image
   * @param {Object} transformations - Transformation options
   * @returns {string} Optimized image URL
   */
  getOptimizedUrl(publicId, transformations = {}) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }
      
      const {
        width,
        height,
        crop = 'fill',
        quality = 'auto',
        format = 'auto',
        gravity = 'auto',
        radius,
        effect,
        overlay,
        background,
        dpr = 'auto'
      } = transformations;
      
      const transformParts = [];
      
      // Basic transformations
      if (width || height) {
        const dimensions = [];
        if (width) dimensions.push(`w_${width}`);
        if (height) dimensions.push(`h_${height}`);
        if (crop) dimensions.push(`c_${crop}`);
        if (gravity && crop === 'fill') dimensions.push(`g_${gravity}`);
        transformParts.push(dimensions.join(','));
      }
      
      // Quality and format
      const qualityFormat = [];
      if (quality) qualityFormat.push(`q_${quality}`);
      if (format) qualityFormat.push(`f_${format}`);
      if (dpr) qualityFormat.push(`dpr_${dpr}`);
      if (qualityFormat.length > 0) {
        transformParts.push(qualityFormat.join(','));
      }
      
      // Effects and styling
      if (radius) transformParts.push(`r_${radius}`);
      if (effect) transformParts.push(`e_${effect}`);
      if (background) transformParts.push(`b_${background}`);
      if (overlay) transformParts.push(`l_${overlay}`);
      
      // Build URL
      const transformString = transformParts.length > 0 ? transformParts.join('/') + '/' : '';
      return `${this.baseDeliveryUrl}/${transformString}${publicId}`;
      
    } catch (error) {
      console.error('Error generating optimized URL:', error);
      // Return basic URL as fallback
      return `${this.baseDeliveryUrl}/${publicId}`;
    }
  }

  /**
   * Get responsive image URLs for different screen sizes
   * @param {string} publicId - Public ID of the image
   * @param {Object} options - Responsive options
   * @returns {Object} Object with URLs for different breakpoints
   */
  getResponsiveUrls(publicId, options = {}) {
    const {
      breakpoints = {
        mobile: 480,
        tablet: 768,
        desktop: 1200,
        large: 1920
      },
      quality = 'auto',
      format = 'auto'
    } = options;
    
    const urls = {};
    
    Object.entries(breakpoints).forEach(([key, width]) => {
      urls[key] = this.getOptimizedUrl(publicId, {
        width,
        quality,
        format,
        crop: 'fill',
        gravity: 'auto'
      });
    });
    
    return urls;
  }

  /**
   * Generate thumbnail URL for book covers
   * @param {string} publicId - Public ID of the image
   * @param {Object} options - Thumbnail options
   * @returns {string} Thumbnail URL
   */
  getBookThumbnailUrl(publicId, options = {}) {
    const {
      width = 200,
      height = 300,
      quality = 'auto',
      format = 'auto'
    } = options;

    return this.getOptimizedUrl(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'center',
      quality,
      format,
      dpr: 'auto'
    });
  }

  /**
   * Generate book cover URLs for different sizes
   * @param {string} publicId - Public ID of the image
   * @returns {Object} Object with different sized URLs
   */
  getBookCoverUrls(publicId) {
    return {
      thumbnail: this.getBookThumbnailUrl(publicId, { width: 150, height: 225 }),
      small: this.getBookThumbnailUrl(publicId, { width: 200, height: 300 }),
      medium: this.getBookThumbnailUrl(publicId, { width: 300, height: 450 }),
      large: this.getBookThumbnailUrl(publicId, { width: 400, height: 600 }),
      original: this.getOptimizedUrl(publicId, { quality: 'auto', format: 'auto' })
    };
  }

  /**
   * Validate uploaded file
   * @param {File} file - File to validate
   */
  validateFile(file) {
    if (!file) {
      throw new Error('Fayl tanlanmagan');
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Faqat JPEG, PNG, WebP va GIF formatdagi rasmlar qabul qilinadi');
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Fayl hajmi 10MB dan oshmasligi kerak');
    }
    
    // Check file name
    if (file.name.length > 100) {
      throw new Error('Fayl nomi 100 belgidan oshmasligi kerak');
    }
  }

  /**
   * Build transformation string from object
   * @param {Object} transformation - Transformation parameters
   * @returns {string} Transformation string
   */
  buildTransformationString(transformation) {
    const parts = [];
    
    Object.entries(transformation).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        parts.push(`${key}_${value}`);
      }
    });
    
    return parts.join(',');
  }

  /**
   * Generate signature for authenticated requests
   * @param {Object} params - Parameters to sign
   * @returns {Promise<string>} Generated signature
   */
  async generateSignature(params) {
    // This is a simplified version - in production, signature generation
    // should be done on the server side for security
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const stringToSign = sortedParams + this.apiSecret;
    
    // Use Web Crypto API for SHA-1 hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param {string} url - Cloudinary URL
   * @returns {string|null} Public ID or null if not a valid Cloudinary URL
   */
  extractPublicId(url) {
    try {
      if (!url || typeof url !== 'string') {
        return null;
      }

      // Match Cloudinary URL pattern
      const regex = new RegExp(`https://res\\.cloudinary\\.com/${this.cloudName}/image/upload/(?:v\\d+/)?(?:[^/]+/)*([^/]+)(?:\\.[^.]+)?$`);
      const match = url.match(regex);
      
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extracting public ID:', error);
      return null;
    }
  }

  /**
   * Check if URL is a Cloudinary URL
   * @param {string} url - URL to check
   * @returns {boolean} True if it's a Cloudinary URL
   */
  isCloudinaryUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    return url.includes(`res.cloudinary.com/${this.cloudName}`);
  }

  /**
   * Batch delete multiple images
   * @param {Array<string>} publicIds - Array of public IDs to delete
   * @returns {Promise<Object>} Batch deletion result
   */
  async batchDeleteImages(publicIds) {
    try {
      if (!Array.isArray(publicIds) || publicIds.length === 0) {
        throw new Error('Public IDs array is required');
      }

      const results = [];
      const errors = [];

      // Process deletions in parallel with a limit
      const batchSize = 5;
      for (let i = 0; i < publicIds.length; i += batchSize) {
        const batch = publicIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (publicId) => {
          try {
            const result = await this.deleteImage(publicId);
            return { publicId, success: true, result };
          } catch (error) {
            return { publicId, success: false, error: error.message };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
          }
        });
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: publicIds.length,
          successful: results.length,
          failed: errors.length
        }
      };

    } catch (error) {
      console.error('Error in batch delete:', error);
      throw new Error(`Batch rasm o'chirishda xato: ${error.message}`);
    }
  }

  /**
   * Get image metadata and information
   * @param {string} publicId - Public ID of the image
   * @returns {Promise<Object>} Image metadata
   */
  async getImageInfo(publicId) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      // This would typically require admin API access
      // For now, return basic constructed info
      const basicUrl = this.getOptimizedUrl(publicId);
      
      return {
        publicId,
        url: basicUrl,
        thumbnailUrl: this.getBookThumbnailUrl(publicId),
        responsiveUrls: this.getResponsiveUrls(publicId),
        bookCoverUrls: this.getBookCoverUrls(publicId),
        cloudName: this.cloudName,
        isValid: true
      };

    } catch (error) {
      console.error('Error getting image info:', error);
      throw new Error(`Rasm ma'lumotlarini olishda xato: ${error.message}`);
    }
  }

  /**
   * Validate image URL and check if it exists
   * @param {string} url - Image URL to validate
   * @returns {Promise<boolean>} True if image exists and is accessible
   */
  async validateImageUrl(url) {
    try {
      if (!url || !this.isCloudinaryUrl(url)) {
        return false;
      }

      // Try to fetch the image with a HEAD request
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;

    } catch (error) {
      console.error('Error validating image URL:', error);
      return false;
    }
  }

  /**
   * Generate SEO-friendly image URLs with alt text support
   * @param {string} publicId - Public ID of the image
   * @param {Object} seoOptions - SEO options
   * @returns {Object} SEO-optimized image data
   */
  generateSEOImageData(publicId, seoOptions = {}) {
    const {
      alt = '',
      title = '',
      width = 400,
      height = 600,
      quality = 'auto',
      format = 'auto'
    } = seoOptions;

    const optimizedUrl = this.getOptimizedUrl(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'center',
      quality,
      format,
      dpr: 'auto'
    });

    return {
      src: optimizedUrl,
      alt,
      title,
      width,
      height,
      loading: 'lazy',
      decoding: 'async',
      // Generate srcset for responsive images
      srcset: [
        `${this.getOptimizedUrl(publicId, { width: width * 0.5, height: height * 0.5, crop: 'fill', quality, format })} ${width * 0.5}w`,
        `${this.getOptimizedUrl(publicId, { width, height, crop: 'fill', quality, format })} ${width}w`,
        `${this.getOptimizedUrl(publicId, { width: width * 1.5, height: height * 1.5, crop: 'fill', quality, format })} ${width * 1.5}w`,
        `${this.getOptimizedUrl(publicId, { width: width * 2, height: height * 2, crop: 'fill', quality, format })} ${width * 2}w`
      ].join(', '),
      sizes: `(max-width: ${width}px) 100vw, ${width}px`
    };
  }

  /**
   * Get upload statistics and usage info
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats() {
    try {
      // This would typically require admin API access
      // For now, return basic info
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
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw new Error(`Statistika olishda xato: ${error.message}`);
    }
  }
}

// Singleton instance
const cloudinaryService = new CloudinaryService();

export default cloudinaryService;