/**
 * Cloudinary Production Configuration
 * Optimized settings for production environment
 */

export const cloudinaryProductionConfig = {
  // Basic configuration
  cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.VITE_CLOUDINARY_API_KEY,
  apiSecret: process.env.VITE_CLOUDINARY_API_SECRET,
  
  // Upload presets for different use cases
  uploadPresets: {
    books: process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'zamon_books_preset',
    profiles: 'zamon_profiles_preset',
    thumbnails: 'zamon_thumbnails_preset'
  },
  
  // Optimization settings
  optimization: {
    // Automatic format selection (WebP, AVIF when supported)
    format: 'auto',
    
    // Quality optimization
    quality: 'auto:good',
    
    // Compression settings
    flags: ['progressive', 'immutable_cache'],
    
    // Responsive breakpoints
    responsive: {
      breakpoints: [320, 640, 768, 1024, 1280, 1536],
      maxImages: 20,
      bytesStep: 20000,
      minWidth: 200,
      maxWidth: 1000
    }
  },
  
  // Transformation presets
  transformations: {
    thumbnail: {
      width: 150,
      height: 200,
      crop: 'fill',
      gravity: 'center',
      quality: 'auto:good',
      format: 'auto'
    },
    
    medium: {
      width: 400,
      height: 600,
      crop: 'fit',
      quality: 'auto:good',
      format: 'auto'
    },
    
    large: {
      width: 800,
      height: 1200,
      crop: 'fit',
      quality: 'auto:good',
      format: 'auto'
    },
    
    profile: {
      width: 200,
      height: 200,
      crop: 'fill',
      gravity: 'face',
      radius: 'max',
      quality: 'auto:good',
      format: 'auto'
    }
  },
  
  // Security settings
  security: {
    // Signed uploads for sensitive operations
    signedUploads: true,
    
    // Upload restrictions
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    maxFileSize: 10485760, // 10MB
    maxImageWidth: 2000,
    maxImageHeight: 2000,
    
    // Access control
    accessMode: 'public',
    resourceType: 'image',
    
    // Folder structure
    folders: {
      books: 'production/books',
      profiles: 'production/profiles',
      temp: 'production/temp'
    }
  },
  
  // CDN settings
  cdn: {
    // Use secure URLs
    secure: true,
    
    // CDN subdomain
    cdnSubdomain: true,
    
    // Private CDN (if available)
    privateCdn: false,
    
    // Caching
    cacheControl: 'public, max-age=31536000, immutable'
  },
  
  // Analytics and monitoring
  analytics: {
    // Enable usage analytics
    analytics: true,
    
    // Track transformations
    trackTransformations: true,
    
    // Monitor performance
    performanceMonitoring: true
  }
};

// Environment-specific overrides
export const getCloudinaryConfig = (environment = 'production') => {
  const baseConfig = { ...cloudinaryProductionConfig };
  
  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        security: {
          ...baseConfig.security,
          folders: {
            books: 'development/books',
            profiles: 'development/profiles',
            temp: 'development/temp'
          }
        },
        optimization: {
          ...baseConfig.optimization,
          quality: 'auto:low' // Faster loading in dev
        }
      };
      
    case 'staging':
      return {
        ...baseConfig,
        security: {
          ...baseConfig.security,
          folders: {
            books: 'staging/books',
            profiles: 'staging/profiles',
            temp: 'staging/temp'
          }
        }
      };
      
    default:
      return baseConfig;
  }
};

// Validation function
export const validateCloudinaryConfig = (config) => {
  const required = ['cloudName', 'apiKey', 'apiSecret'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Cloudinary configuration: ${missing.join(', ')}`);
  }
  
  return true;
};