/**
 * Comprehensive input validation and sanitization service
 * Provides security-focused validation for all form inputs
 */

import DOMPurify from 'dompurify';

class ValidationService {
  // Email validation with security checks
  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    // Sanitize email
    const sanitizedEmail = this.sanitizeInput(email.toLowerCase().trim());
    
    // Check length
    if (sanitizedEmail.length > 254) {
      return { isValid: false, error: 'Email is too long' };
    }

    // Email regex pattern (more restrictive)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(sanitizedEmail)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitizedEmail)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true, value: sanitizedEmail };
  }

  // Phone number validation
  static validatePhone(phone) {
    if (!phone) {
      return { isValid: true, value: '' }; // Phone is optional
    }

    if (typeof phone !== 'string') {
      return { isValid: false, error: 'Invalid phone format' };
    }

    const sanitizedPhone = this.sanitizeInput(phone.trim());
    
    // Check length
    if (sanitizedPhone.length > 20) {
      return { isValid: false, error: 'Phone number is too long' };
    }

    // Phone regex pattern (international format)
    const phoneRegex = /^\+?[0-9\-\s\(\)]{7,20}$/;
    
    if (!phoneRegex.test(sanitizedPhone)) {
      return { isValid: false, error: 'Invalid phone format' };
    }

    return { isValid: true, value: sanitizedPhone };
  }

  // Name validation with XSS protection
  static validateName(name, fieldName = 'Name') {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: `${fieldName} is required` };
    }

    const sanitizedName = this.sanitizeInput(name.trim());
    
    // Check length
    if (sanitizedName.length < 1) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    
    if (sanitizedName.length > 100) {
      return { isValid: false, error: `${fieldName} is too long` };
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitizedName)) {
      return { isValid: false, error: `${fieldName} contains invalid characters` };
    }

    // Name should only contain letters, spaces, hyphens, and apostrophes
    // Extended to support more Unicode characters for international names
    const nameRegex = /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0400-\u04FF\u4e00-\u9fff\u0600-\u06ff\s\-'\.]+$/;
    if (!nameRegex.test(sanitizedName)) {
      return { isValid: false, error: `${fieldName} contains invalid characters` };
    }

    return { isValid: true, value: sanitizedName };
  }

  // Text validation with length limits and XSS protection
  static validateText(text, fieldName, minLength = 0, maxLength = 1000) {
    if (!text && minLength > 0) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    if (!text) {
      return { isValid: true, value: '' };
    }

    if (typeof text !== 'string') {
      return { isValid: false, error: `${fieldName} must be text` };
    }

    const sanitizedText = this.sanitizeInput(text.trim());
    
    if (sanitizedText.length < minLength) {
      return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
    }
    
    if (sanitizedText.length > maxLength) {
      return { isValid: false, error: `${fieldName} must be less than ${maxLength} characters` };
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitizedText)) {
      return { isValid: false, error: `${fieldName} contains invalid content` };
    }

    return { isValid: true, value: sanitizedText };
  }

  // Price validation
  static validatePrice(price, fieldName = 'Price') {
    if (price === null || price === undefined || price === '') {
      return { isValid: false, error: `${fieldName} is required` };
    }

    const numPrice = Number(price);
    
    if (isNaN(numPrice)) {
      return { isValid: false, error: `${fieldName} must be a number` };
    }

    if (numPrice < 0) {
      return { isValid: false, error: `${fieldName} cannot be negative` };
    }

    if (numPrice > 1000000) {
      return { isValid: false, error: `${fieldName} is too high` };
    }

    // Check for reasonable decimal places
    if (numPrice.toString().includes('.') && numPrice.toString().split('.')[1].length > 2) {
      return { isValid: false, error: `${fieldName} can have at most 2 decimal places` };
    }

    return { isValid: true, value: numPrice };
  }

  // URL validation (specifically for Cloudinary URLs)
  static validateImageUrl(url, fieldName = 'Image URL') {
    if (!url) {
      return { isValid: true, value: '' }; // Image URLs are optional
    }

    if (typeof url !== 'string') {
      return { isValid: false, error: `${fieldName} must be a string` };
    }

    const sanitizedUrl = url.trim();
    
    // Check length
    if (sanitizedUrl.length > 2000) {
      return { isValid: false, error: `${fieldName} is too long` };
    }

    // Validate Cloudinary URL format
    const cloudinaryRegex = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/.*$/;
    
    if (!cloudinaryRegex.test(sanitizedUrl)) {
      return { isValid: false, error: `${fieldName} must be a valid Cloudinary URL` };
    }

    return { isValid: true, value: sanitizedUrl };
  }

  // File validation for uploads
  static validateFile(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
      fieldName = 'File'
    } = options;

    if (!file) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return { isValid: false, error: `${fieldName} must be less than ${maxSizeMB}MB` };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: `${fieldName} must be one of: ${allowedTypes.join(', ')}` };
    }

    // Check file name for suspicious patterns
    if (this.containsSuspiciousPatterns(file.name)) {
      return { isValid: false, error: `${fieldName} name contains invalid characters` };
    }

    return { isValid: true, value: file };
  }

  // Sanitize input to prevent XSS
  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Use DOMPurify to sanitize HTML content
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  }

  // Check for suspicious patterns that might indicate attacks
  static containsSuspiciousPatterns(input) {
    if (typeof input !== 'string') {
      return false;
    }

    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i,
      /expression\s*\(/i,
      /url\s*\(/i,
      /import\s*\(/i,
      /@import/i,
      /\beval\s*\(/i,
      /\bexec\s*\(/i,
      /\bsystem\s*\(/i,
      /\.\.\//,
      /\.\.\\/,
      /\0/,
      /%00/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
      /\bselect\s+.*\bfrom\b/i,
      /\bunion\s+.*\bselect\b/i,
      /\binsert\s+into\b/i,
      /\bdelete\s+from\b/i,
      /\bdrop\s+table\b/i,
      /\bupdate\s+.*\bset\b/i,
      /document\.cookie/i,
      /window\.location/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  // Validate order data
  static validateOrderData(orderData) {
    const errors = {};

    // Validate customer info
    if (orderData.customer) {
      const nameValidation = this.validateName(orderData.customer.name, 'Customer name');
      if (!nameValidation.isValid) {
        errors.customerName = nameValidation.error;
      }

      const emailValidation = this.validateEmail(orderData.customer.email);
      if (!emailValidation.isValid) {
        errors.customerEmail = emailValidation.error;
      }

      if (orderData.customer.phone) {
        const phoneValidation = this.validatePhone(orderData.customer.phone);
        if (!phoneValidation.isValid) {
          errors.customerPhone = phoneValidation.error;
        }
      }
    }

    // Validate items
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      errors.items = 'Order must contain at least one item';
    } else {
      orderData.items.forEach((item, index) => {
        if (!item.bookId || typeof item.bookId !== 'string') {
          errors[`item${index}BookId`] = 'Invalid book ID';
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
          errors[`item${index}Quantity`] = 'Invalid quantity';
        }
        if (!item.price || typeof item.price !== 'number' || item.price < 0) {
          errors[`item${index}Price`] = 'Invalid price';
        }
      });
    }

    // Validate total amount
    const totalValidation = this.validatePrice(orderData.totalAmount, 'Total amount');
    if (!totalValidation.isValid) {
      errors.totalAmount = totalValidation.error;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData: this.sanitizeOrderData(orderData)
    };
  }

  // Sanitize order data
  static sanitizeOrderData(orderData) {
    const sanitized = { ...orderData };

    if (sanitized.customer) {
      sanitized.customer = {
        ...sanitized.customer,
        name: this.sanitizeInput(sanitized.customer.name || ''),
        email: this.sanitizeInput(sanitized.customer.email || '').toLowerCase(),
        phone: this.sanitizeInput(sanitized.customer.phone || '')
      };

      if (sanitized.customer.address) {
        sanitized.customer.address = {
          ...sanitized.customer.address,
          street: this.sanitizeInput(sanitized.customer.address.street || ''),
          city: this.sanitizeInput(sanitized.customer.address.city || ''),
          region: this.sanitizeInput(sanitized.customer.address.region || ''),
          postalCode: this.sanitizeInput(sanitized.customer.address.postalCode || '')
        };
      }
    }

    return sanitized;
  }

  // Rate limiting check (to be used with external rate limiting service)
  static checkRateLimit(identifier, action, limit = 10, windowMs = 60000) {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    
    // Get stored data from localStorage (in production, use Redis or similar)
    const stored = localStorage.getItem(`rateLimit:${key}`);
    let data = stored ? JSON.parse(stored) : { count: 0, resetTime: now + windowMs };

    // Reset if window has passed
    if (now > data.resetTime) {
      data = { count: 0, resetTime: now + windowMs };
    }

    // Check if limit exceeded
    if (data.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime
      };
    }

    // Increment count
    data.count++;
    localStorage.setItem(`rateLimit:${key}`, JSON.stringify(data));

    return {
      allowed: true,
      remaining: limit - data.count,
      resetTime: data.resetTime
    };
  }
}

export default ValidationService;