/**
 * Secure File Upload Service
 * Provides comprehensive security validation for file uploads to Cloudinary
 */

class SecureFileUploadService {
  // File type configurations
  static FILE_TYPES = {
    image: {
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/webp',
        'image/gif'
      ],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      maxSize: 10 * 1024 * 1024, // 10MB
      maxDimensions: { width: 4000, height: 4000 }
    },
    document: {
      allowedMimeTypes: [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      allowedExtensions: ['.pdf', '.txt', '.doc', '.docx'],
      maxSize: 5 * 1024 * 1024, // 5MB
      maxDimensions: null
    }
  };

  // Malicious file signatures (magic bytes)
  static MALICIOUS_SIGNATURES = [
    // Executable files
    [0x4D, 0x5A], // PE executable
    [0x7F, 0x45, 0x4C, 0x46], // ELF executable
    [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O executable
    [0xFE, 0xED, 0xFA, 0xCE], // Mach-O executable (reverse)
    
    // Script files that might be disguised
    [0x3C, 0x3F, 0x70, 0x68, 0x70], // <?php
    [0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], // <script
    
    // Archive files (potential zip bombs)
    [0x50, 0x4B, 0x03, 0x04], // ZIP
    [0x52, 0x61, 0x72, 0x21], // RAR
  ];

  // Validate file before upload
  static async validateFile(file, fileType = 'image', options = {}) {
    const config = { ...this.FILE_TYPES[fileType], ...options };
    const errors = [];

    try {
      // Basic file validation
      const basicValidation = this.validateBasicProperties(file, config);
      if (!basicValidation.isValid) {
        errors.push(...basicValidation.errors);
      }

      // MIME type validation
      const mimeValidation = this.validateMimeType(file, config);
      if (!mimeValidation.isValid) {
        errors.push(...mimeValidation.errors);
      }

      // File extension validation
      const extensionValidation = this.validateFileExtension(file, config);
      if (!extensionValidation.isValid) {
        errors.push(...extensionValidation.errors);
      }

      // File signature validation (magic bytes)
      const signatureValidation = await this.validateFileSignature(file, config);
      if (!signatureValidation.isValid) {
        errors.push(...signatureValidation.errors);
      }

      // Malicious content detection
      const maliciousValidation = await this.detectMaliciousContent(file);
      if (!maliciousValidation.isValid) {
        errors.push(...maliciousValidation.errors);
      }

      // Image-specific validation
      if (fileType === 'image') {
        const imageValidation = await this.validateImageFile(file, config);
        if (!imageValidation.isValid) {
          errors.push(...imageValidation.errors);
        }
      }

      // File name validation
      const nameValidation = this.validateFileName(file.name);
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedFileName: this.sanitizeFileName(file.name),
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      };

    } catch (error) {
      console.error('File validation error:', error);
      return {
        isValid: false,
        errors: ['File validation failed due to an internal error'],
        sanitizedFileName: null,
        fileInfo: null
      };
    }
  }

  // Validate basic file properties
  static validateBasicProperties(file, config) {
    const errors = [];

    // Check if file exists
    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size === 0) {
      errors.push('File is empty');
    } else if (file.size > config.maxSize) {
      const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
      errors.push(`File size exceeds ${maxSizeMB}MB limit`);
    }

    // Check if file is too old (potential security risk)
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    if (file.lastModified && file.lastModified < oneYearAgo) {
      console.warn('File is very old, potential security risk');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate MIME type
  static validateMimeType(file, config) {
    const errors = [];

    if (!file.type) {
      errors.push('File type cannot be determined');
    } else if (!config.allowedMimeTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate file extension
  static validateFileExtension(file, config) {
    const errors = [];
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));

    if (!extension) {
      errors.push('File must have an extension');
    } else if (!config.allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate file signature (magic bytes)
  static async validateFileSignature(file, config) {
    const errors = [];

    try {
      const buffer = await this.readFileBytes(file, 0, 20); // Read first 20 bytes
      const bytes = new Uint8Array(buffer);

      // Check for image signatures if it's an image file
      if (config.allowedMimeTypes.some(type => type.startsWith('image/'))) {
        const isValidImageSignature = this.validateImageSignature(bytes, file.type);
        if (!isValidImageSignature) {
          errors.push('File signature does not match the declared file type');
        }
      }

    } catch (error) {
      console.error('Error reading file signature:', error);
      errors.push('Unable to verify file signature');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate image file signature
  static validateImageSignature(bytes, mimeType) {
    const signatures = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/jpg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]] // RIFF header, WebP has additional checks
    };

    const expectedSignatures = signatures[mimeType];
    if (!expectedSignatures) {
      return true; // Unknown type, skip signature check
    }

    return expectedSignatures.some(signature => 
      signature.every((byte, index) => bytes[index] === byte)
    );
  }

  // Detect malicious content
  static async detectMaliciousContent(file) {
    const errors = [];

    try {
      // Read first 1KB of file to check for malicious signatures
      const buffer = await this.readFileBytes(file, 0, 1024);
      const bytes = new Uint8Array(buffer);

      // Check for malicious file signatures
      for (const signature of this.MALICIOUS_SIGNATURES) {
        if (this.bytesMatch(bytes, signature)) {
          errors.push('File contains potentially malicious content');
          break;
        }
      }

      // Check for embedded scripts in file content
      const textContent = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      if (this.containsScriptContent(textContent)) {
        errors.push('File contains embedded script content');
      }

    } catch (error) {
      console.error('Error detecting malicious content:', error);
      // Don't fail validation for this, just log the error
    }

    return { isValid: errors.length === 0, errors };
  }

  // Check if bytes match a signature
  static bytesMatch(bytes, signature) {
    if (bytes.length < signature.length) {
      return false;
    }

    return signature.every((byte, index) => bytes[index] === byte);
  }

  // Check for script content in text
  static containsScriptContent(text) {
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /function\s*\(/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    return scriptPatterns.some(pattern => pattern.test(text));
  }

  // Validate image-specific properties
  static async validateImageFile(file, config) {
    const errors = [];

    try {
      const imageInfo = await this.getImageInfo(file);
      
      if (config.maxDimensions) {
        if (imageInfo.width > config.maxDimensions.width) {
          errors.push(`Image width ${imageInfo.width}px exceeds maximum ${config.maxDimensions.width}px`);
        }
        if (imageInfo.height > config.maxDimensions.height) {
          errors.push(`Image height ${imageInfo.height}px exceeds maximum ${config.maxDimensions.height}px`);
        }
      }

      // Check for suspicious aspect ratios (potential exploits)
      const aspectRatio = imageInfo.width / imageInfo.height;
      if (aspectRatio > 100 || aspectRatio < 0.01) {
        errors.push('Image has suspicious aspect ratio');
      }

    } catch (error) {
      console.error('Error validating image:', error);
      errors.push('Unable to validate image properties');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Get image information
  static getImageInfo(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Unable to load image'));
      };

      img.src = url;
    });
  }

  // Validate file name
  static validateFileName(fileName) {
    const errors = [];

    // Check file name length
    if (fileName.length > 255) {
      errors.push('File name is too long');
    }

    // Check for dangerous characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      errors.push('File name contains invalid characters');
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(fileName)) {
      errors.push('File name is reserved');
    }

    // Check for hidden files or system files
    if (fileName.startsWith('.') && fileName !== '.htaccess') {
      console.warn('Hidden file detected:', fileName);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Sanitize file name
  static sanitizeFileName(fileName) {
    // Remove dangerous characters
    let sanitized = fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
    
    // Replace spaces with underscores
    sanitized = sanitized.replace(/\s+/g, '_');
    
    // Remove multiple dots (except the extension)
    const lastDotIndex = sanitized.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const name = sanitized.substring(0, lastDotIndex).replace(/\.+/g, '_');
      const extension = sanitized.substring(lastDotIndex);
      sanitized = name + extension;
    }
    
    // Ensure it's not too long
    if (sanitized.length > 100) {
      const extension = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, sanitized.lastIndexOf('.'));
      sanitized = name.substring(0, 100 - extension.length) + extension;
    }
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now();
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot > 0) {
      const name = sanitized.substring(0, lastDot);
      const extension = sanitized.substring(lastDot);
      sanitized = `${name}_${timestamp}${extension}`;
    } else {
      sanitized = `${sanitized}_${timestamp}`;
    }
    
    return sanitized;
  }

  // Read file bytes
  static readFileBytes(file, start = 0, length = file.size) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const blob = file.slice(start, start + length);

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      
      reader.readAsArrayBuffer(blob);
    });
  }

  // Generate secure upload parameters for Cloudinary
  static generateSecureUploadParams(file, options = {}) {
    const sanitizedFileName = this.sanitizeFileName(file.name);
    const timestamp = Math.round(Date.now() / 1000);
    
    return {
      public_id: `${options.folder || 'uploads'}/${sanitizedFileName.replace(/\.[^/.]+$/, '')}_${timestamp}`,
      timestamp,
      upload_preset: options.uploadPreset || 'secure_upload',
      resource_type: 'auto',
      format: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
      flags: 'sanitize', // Cloudinary sanitization
      allowed_formats: options.allowedFormats || ['jpg', 'jpeg', 'png', 'webp'],
      max_bytes: options.maxBytes || 10485760, // 10MB
      context: {
        original_filename: file.name,
        upload_source: 'web_app',
        security_validated: 'true'
      }
    };
  }

  // Validate Cloudinary response
  static validateCloudinaryResponse(response) {
    const errors = [];

    if (!response) {
      errors.push('No response from Cloudinary');
      return { isValid: false, errors };
    }

    // Check required fields
    const requiredFields = ['public_id', 'secure_url', 'resource_type', 'format'];
    for (const field of requiredFields) {
      if (!response[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate URL format
    if (response.secure_url && !response.secure_url.startsWith('https://res.cloudinary.com/')) {
      errors.push('Invalid Cloudinary URL format');
    }

    // Check for suspicious transformations
    if (response.secure_url && response.secure_url.includes('fetch')) {
      errors.push('Suspicious transformation detected');
    }

    return { isValid: errors.length === 0, errors };
  }
}

export default SecureFileUploadService;