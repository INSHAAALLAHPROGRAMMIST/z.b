/**
 * Cloudinary Upload Function for Production
 * Handles secure image uploads to Cloudinary
 */

import { v2 as cloudinary } from 'cloudinary';
import { getCloudinaryConfig, validateCloudinaryConfig } from '../../config/cloudinary.production.js';

const config = getCloudinaryConfig('production');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudName,
  api_key: config.apiKey,
  api_secret: config.apiSecret,
  secure: config.cdn.secure
});

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': process.env.VITE_SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Validate configuration
    validateCloudinaryConfig(config);

    // Parse request body
    const body = JSON.parse(event.body);
    const { file, options = {}, uploadType = 'books' } = body;

    if (!file) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file provided' })
      };
    }

    // Validate file
    const validation = validateFile(file, uploadType);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: validation.error })
      };
    }

    // Get upload options based on type
    const uploadOptions = getUploadOptions(uploadType, options);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file, uploadOptions);

    // Generate optimized URLs
    const optimizedUrls = generateOptimizedUrls(result.public_id, uploadType);

    const response = {
      success: true,
      data: {
        publicId: result.public_id,
        url: result.secure_url,
        optimizedUrls,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Upload failed',
        message: error.message 
      })
    };
  }
};

// Validate uploaded file
function validateFile(file, uploadType) {
  // Check if file is base64 encoded
  if (!file.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid file format' };
  }

  // Extract file info
  const [header, data] = file.split(',');
  const mimeType = header.match(/data:image\/(\w+);base64/)?.[1];

  if (!mimeType) {
    return { valid: false, error: 'Invalid image format' };
  }

  // Check allowed formats
  if (!config.security.allowedFormats.includes(mimeType)) {
    return { 
      valid: false, 
      error: `Format ${mimeType} not allowed. Allowed: ${config.security.allowedFormats.join(', ')}` 
    };
  }

  // Check file size (approximate)
  const sizeInBytes = (data.length * 3) / 4;
  if (sizeInBytes > config.security.maxFileSize) {
    return { 
      valid: false, 
      error: `File too large. Max size: ${config.security.maxFileSize / 1024 / 1024}MB` 
    };
  }

  return { valid: true };
}

// Get upload options based on type
function getUploadOptions(uploadType, customOptions = {}) {
  const baseOptions = {
    resource_type: 'image',
    access_mode: config.security.accessMode,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    ...customOptions
  };

  switch (uploadType) {
    case 'books':
      return {
        ...baseOptions,
        folder: config.security.folders.books,
        upload_preset: config.uploadPresets.books,
        transformation: [
          {
            width: config.security.maxImageWidth,
            height: config.security.maxImageHeight,
            crop: 'limit',
            quality: 'auto:good',
            format: 'auto'
          }
        ],
        tags: ['book', 'product', 'auto-upload']
      };

    case 'profiles':
      return {
        ...baseOptions,
        folder: config.security.folders.profiles,
        upload_preset: config.uploadPresets.profiles,
        transformation: [
          {
            width: 400,
            height: 400,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto:good',
            format: 'auto'
          }
        ],
        tags: ['profile', 'user', 'auto-upload']
      };

    case 'thumbnails':
      return {
        ...baseOptions,
        folder: config.security.folders.temp,
        upload_preset: config.uploadPresets.thumbnails,
        transformation: [
          {
            width: 200,
            height: 300,
            crop: 'fill',
            quality: 'auto:low',
            format: 'auto'
          }
        ],
        tags: ['thumbnail', 'temp', 'auto-upload']
      };

    default:
      return {
        ...baseOptions,
        folder: config.security.folders.temp,
        tags: ['misc', 'auto-upload']
      };
  }
}

// Generate optimized URLs for different use cases
function generateOptimizedUrls(publicId, uploadType) {
  const baseUrl = `https://res.cloudinary.com/${config.cloudName}/image/upload`;
  
  const urls = {};

  switch (uploadType) {
    case 'books':
      urls.thumbnail = `${baseUrl}/w_150,h_200,c_fill,q_auto:good,f_auto/${publicId}`;
      urls.medium = `${baseUrl}/w_400,h_600,c_fit,q_auto:good,f_auto/${publicId}`;
      urls.large = `${baseUrl}/w_800,h_1200,c_fit,q_auto:good,f_auto/${publicId}`;
      urls.webp = `${baseUrl}/w_400,h_600,c_fit,q_auto:good,f_webp/${publicId}`;
      break;

    case 'profiles':
      urls.small = `${baseUrl}/w_50,h_50,c_fill,g_face,r_max,q_auto:good,f_auto/${publicId}`;
      urls.medium = `${baseUrl}/w_100,h_100,c_fill,g_face,r_max,q_auto:good,f_auto/${publicId}`;
      urls.large = `${baseUrl}/w_200,h_200,c_fill,g_face,r_max,q_auto:good,f_auto/${publicId}`;
      break;

    default:
      urls.optimized = `${baseUrl}/q_auto:good,f_auto/${publicId}`;
      break;
  }

  return urls;
}

// Delete image function (separate endpoint)
export const deleteHandler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.VITE_SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { publicId } = JSON.parse(event.body);

    if (!publicId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Public ID required' })
      };
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        result: result.result,
        publicId
      })
    };

  } catch (error) {
    console.error('Cloudinary delete error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Delete failed',
        message: error.message 
      })
    };
  }
};