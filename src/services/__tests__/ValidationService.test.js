/**
 * Validation Service Tests
 * Tests for input validation and sanitization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ValidationService from '../ValidationService';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input, options) => {
      // Simple mock that removes script tags
      if (typeof input === 'string') {
        return input.replace(/<script.*?<\/script>/gi, '');
      }
      return input;
    })
  }
}));

describe('ValidationService', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
        'email@123.123.123.123', // IP address
        'user@domain-name.com'
      ];

      validEmails.forEach(email => {
        const result = ValidationService.validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(email.toLowerCase());
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'missing.domain@.com',
        'two@@domain.com',
        'user@domain',
        'user..name@domain.com',
        '.user@domain.com',
        'user@domain..com',
        'user@domain.com.',
        'a'.repeat(250) + '@domain.com', // Too long
        'user@domain.c' // TLD too short
      ];

      invalidEmails.forEach(email => {
        const result = ValidationService.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should handle edge cases', () => {
      // Empty email
      const emptyResult = ValidationService.validateEmail('');
      expect(emptyResult.isValid).toBe(false);

      // Null email
      const nullResult = ValidationService.validateEmail(null);
      expect(nullResult.isValid).toBe(false);

      // Non-string email
      const numberResult = ValidationService.validateEmail(123);
      expect(numberResult.isValid).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    it('should validate correct phone formats', () => {
      const validPhones = [
        '+1234567890',
        '(123) 456-7890',
        '123-456-7890',
        '123 456 7890',
        '+44 20 7946 0958',
        '+998901234567'
      ];

      validPhones.forEach(phone => {
        const result = ValidationService.validatePhone(phone);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(phone);
      });
    });

    it('should reject invalid phone formats', () => {
      const invalidPhones = [
        '123', // Too short
        'abc123def', // Contains letters
        '+' + '1'.repeat(25), // Too long
        '123-456-789a' // Contains invalid characters
      ];

      invalidPhones.forEach(phone => {
        const result = ValidationService.validatePhone(phone);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should allow empty phone (optional field)', () => {
      const result = ValidationService.validatePhone('');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('');
    });
  });

  describe('Name Validation', () => {
    it('should validate correct names', () => {
      const validNames = [
        'John Doe',
        'María García',
        "O'Connor",
        'Jean-Pierre'
        // Note: Some Unicode names might not pass the current regex
      ];

      validNames.forEach(name => {
        const result = ValidationService.validateName(name);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(name);
      });
    });

    it('should reject invalid names', () => {
      const invalidNames = [
        '', // Empty
        'A'.repeat(101), // Too long
        'John123', // Contains numbers
        'John@Doe', // Contains special characters
        '<script>alert(1)</script>' // XSS attempt
      ];

      invalidNames.forEach(name => {
        const result = ValidationService.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Text Validation', () => {
    it('should validate text with length constraints', () => {
      const result = ValidationService.validateText('Valid text', 'Description', 5, 50);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('Valid text');
    });

    it('should reject text that is too short', () => {
      const result = ValidationService.validateText('Hi', 'Description', 5, 50);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 5 characters');
    });

    it('should reject text that is too long', () => {
      const longText = 'A'.repeat(51);
      const result = ValidationService.validateText(longText, 'Description', 0, 50);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than 50 characters');
    });

    it('should allow empty text when not required', () => {
      const result = ValidationService.validateText('', 'Description', 0, 50);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('');
    });
  });

  describe('Price Validation', () => {
    it('should validate correct prices', () => {
      const validPrices = [0, 10, 99.99, 1000, '25.50'];

      validPrices.forEach(price => {
        const result = ValidationService.validatePrice(price);
        expect(result.isValid).toBe(true);
        expect(typeof result.value).toBe('number');
      });
    });

    it('should reject invalid prices', () => {
      const invalidPrices = [
        -10, // Negative
        'abc', // Not a number
        1000001, // Too high
        99.999 // Too many decimal places
      ];

      invalidPrices.forEach(price => {
        const result = ValidationService.validatePrice(price);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should require price when not provided', () => {
      const emptyResults = [
        ValidationService.validatePrice(null),
        ValidationService.validatePrice(undefined),
        ValidationService.validatePrice('')
      ];

      emptyResults.forEach(result => {
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('required');
      });
    });
  });

  describe('Image URL Validation', () => {
    it('should validate Cloudinary URLs', () => {
      const validUrls = [
        'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        'https://res.cloudinary.com/my-cloud/image/upload/v1234567890/folder/image.png',
        'https://res.cloudinary.com/test/video/upload/sample.mp4'
      ];

      validUrls.forEach(url => {
        const result = ValidationService.validateImageUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(url);
      });
    });

    it('should reject non-Cloudinary URLs', () => {
      const invalidUrls = [
        'https://example.com/image.jpg',
        'http://res.cloudinary.com/demo/image.jpg', // Not HTTPS
        'https://cloudinary.com/image.jpg', // Wrong domain
        'ftp://res.cloudinary.com/demo/image.jpg' // Wrong protocol
      ];

      invalidUrls.forEach(url => {
        const result = ValidationService.validateImageUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Cloudinary URL');
      });
    });

    it('should allow empty URL (optional)', () => {
      const result = ValidationService.validateImageUrl('');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('');
    });
  });

  describe('File Validation', () => {
    it('should validate correct files', () => {
      const validFile = new File(['test content'], 'test.jpg', { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const result = ValidationService.validateFile(validFile);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(validFile);
    });

    it('should reject oversized files', () => {
      // Create a mock file that appears large
      const largeFile = {
        name: 'large.jpg',
        type: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
        lastModified: Date.now()
      };

      const result = ValidationService.validateFile(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('5MB');
    });

    it('should reject invalid file types', () => {
      const invalidFile = new File(['test'], 'test.exe', { 
        type: 'application/exe',
        lastModified: Date.now()
      });

      const result = ValidationService.validateFile(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be one of');
    });

    it('should reject empty files', () => {
      const emptyFile = new File([''], 'empty.jpg', { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      // Override the size property to be 0
      Object.defineProperty(emptyFile, 'size', { value: 0 });

      const result = ValidationService.validateFile(emptyFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML content', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = ValidationService.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
    });

    it('should handle non-string input', () => {
      const numberInput = 123;
      const sanitized = ValidationService.sanitizeInput(numberInput);
      expect(sanitized).toBe(123);
    });
  });

  describe('Suspicious Pattern Detection', () => {
    it('should detect script injection attempts', () => {
      const suspiciousInputs = [
        '<script>alert(1)</script>',
        'javascript:void(0)',
        'onload="alert(1)"',
        'eval(malicious_code)',
        'document.cookie'
      ];

      suspiciousInputs.forEach(input => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(input);
        expect(isSuspicious).toBe(true);
      });
    });

    it('should detect SQL injection attempts', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        'SELECT * FROM users',
        'UNION SELECT password FROM users',
        'INSERT INTO users VALUES',
        'DELETE FROM users WHERE'
      ];

      sqlInjections.forEach(input => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(input);
        expect(isSuspicious).toBe(true);
      });
    });

    it('should detect path traversal attempts', () => {
      const pathTraversals = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '%2e%2e%2f',
        '\0'
      ];

      pathTraversals.forEach(input => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(input);
        expect(isSuspicious).toBe(true);
      });
    });

    it('should not flag normal content', () => {
      const normalInputs = [
        'Hello World',
        'This is a normal description',
        'Contact us at info@example.com',
        'Price: $29.99'
      ];

      normalInputs.forEach(input => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(input);
        expect(isSuspicious).toBe(false);
      });
    });
  });

  describe('Order Data Validation', () => {
    it('should validate complete order data', () => {
      const validOrder = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        },
        items: [
          {
            bookId: 'book-123',
            quantity: 2,
            price: 29.99
          },
          {
            bookId: 'book-456',
            quantity: 1,
            price: 19.99
          }
        ],
        totalAmount: 79.97
      };

      const result = ValidationService.validateOrderData(validOrder);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.customer.name).toBe('John Doe');
      expect(result.sanitizedData.customer.email).toBe('john@example.com');
    });

    it('should reject order with invalid customer data', () => {
      const invalidOrder = {
        customer: {
          name: '', // Empty name
          email: 'invalid-email', // Invalid email
          phone: 'abc123' // Invalid phone
        },
        items: [
          {
            bookId: 'book-123',
            quantity: 1,
            price: 29.99
          }
        ],
        totalAmount: 29.99
      };

      const result = ValidationService.validateOrderData(invalidOrder);
      expect(result.isValid).toBe(false);
      expect(result.errors.customerName).toBeDefined();
      expect(result.errors.customerEmail).toBeDefined();
      expect(result.errors.customerPhone).toBeDefined();
    });

    it('should reject order with no items', () => {
      const orderWithoutItems = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        items: [],
        totalAmount: 0
      };

      const result = ValidationService.validateOrderData(orderWithoutItems);
      expect(result.isValid).toBe(false);
      expect(result.errors.items).toContain('at least one item');
    });

    it('should reject order with invalid items', () => {
      const orderWithInvalidItems = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        items: [
          {
            bookId: '', // Invalid book ID
            quantity: 0, // Invalid quantity
            price: -10 // Invalid price
          }
        ],
        totalAmount: 29.99
      };

      const result = ValidationService.validateOrderData(orderWithInvalidItems);
      expect(result.isValid).toBe(false);
      expect(result.errors.item0BookId).toBeDefined();
      expect(result.errors.item0Quantity).toBeDefined();
      expect(result.errors.item0Price).toBeDefined();
    });

    it('should reject order with invalid total amount', () => {
      const orderWithInvalidTotal = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        items: [
          {
            bookId: 'book-123',
            quantity: 1,
            price: 29.99
          }
        ],
        totalAmount: -10 // Invalid total
      };

      const result = ValidationService.validateOrderData(orderWithInvalidTotal);
      expect(result.isValid).toBe(false);
      expect(result.errors.totalAmount).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should allow requests within limit', () => {
      const result = ValidationService.checkRateLimit('test-user', 'test-action', 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should block requests exceeding limit', () => {
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        ValidationService.checkRateLimit('test-user', 'test-action', 5, 60000);
      }

      const result = ValidationService.checkRateLimit('test-user', 'test-action', 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after time window', () => {
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        ValidationService.checkRateLimit('test-user', 'test-action', 5, 60000);
      }

      // Manually expire the window
      const key = 'test-user:test-action';
      const stored = JSON.parse(localStorage.getItem(`rateLimit:${key}`));
      stored.resetTime = Date.now() - 1000;
      localStorage.setItem(`rateLimit:${key}`, JSON.stringify(stored));

      const result = ValidationService.checkRateLimit('test-user', 'test-action', 5, 60000);
      expect(result.allowed).toBe(true);
    });
  });
});