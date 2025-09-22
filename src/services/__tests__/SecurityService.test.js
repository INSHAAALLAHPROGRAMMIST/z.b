/**
 * Security Service Tests
 * Comprehensive tests for security functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SecurityService from '../SecurityService';
import ValidationService from '../ValidationService';
import RateLimitingService from '../RateLimitingService';

// Mock Firebase
vi.mock('../firebaseConfig', () => ({
  auth: {
    currentUser: null
  }
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updatePassword: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn()
  }
}));

describe('SecurityService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Password Strength Validation', () => {
    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        '12345678',
        'aaaaaaaa'
      ];

      weakPasswords.forEach(password => {
        const result = SecurityService.checkPasswordStrength(password);
        expect(result.isStrong).toBe(false);
        expect(result.feedback.length).toBeGreaterThan(0);
      });
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'MyStr0ng!Pass',
        'C0mpl3x@P4ssw0rd',
        'S3cur3#P4ssw0rd!'
      ];

      strongPasswords.forEach(password => {
        const result = SecurityService.checkPasswordStrength(password);
        expect(result.isStrong).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(5);
      });
    });

    it('should detect common patterns', () => {
      const result = SecurityService.checkPasswordStrength('password123');
      expect(result.isStrong).toBe(false);
      expect(result.feedback.some(f => f.includes('common'))).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should create secure session', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com'
      };

      const session = await SecurityService.createSecureSession(mockUser);
      
      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe(mockUser.uid);
      expect(session.email).toBe(mockUser.email);
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should validate active session', () => {
      const sessionData = {
        sessionId: 'test-session',
        userId: 'test-uid',
        email: 'test@example.com',
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        userAgent: navigator.userAgent,
        lastActivity: Date.now()
      };

      localStorage.setItem('secure_session', JSON.stringify(sessionData));

      const validation = SecurityService.validateSession();
      expect(validation.isValid).toBe(true);
      expect(validation.session.sessionId).toBe('test-session');
    });

    it('should reject expired session', () => {
      const sessionData = {
        sessionId: 'test-session',
        userId: 'test-uid',
        email: 'test@example.com',
        createdAt: Date.now() - 25 * 60 * 60 * 1000,
        expiresAt: Date.now() - 1000, // Expired
        userAgent: navigator.userAgent,
        lastActivity: Date.now() - 25 * 60 * 60 * 1000
      };

      localStorage.setItem('secure_session', JSON.stringify(sessionData));

      const validation = SecurityService.validateSession();
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Session expired');
    });

    it('should detect session hijacking attempt', () => {
      const sessionData = {
        sessionId: 'test-session',
        userId: 'test-uid',
        email: 'test@example.com',
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        userAgent: 'Different User Agent',
        lastActivity: Date.now()
      };

      localStorage.setItem('secure_session', JSON.stringify(sessionData));

      const validation = SecurityService.validateSession();
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Session security violation');
    });
  });

  describe('Registration Validation', () => {
    it('should validate registration data', () => {
      const validData = {
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890'
      };

      const result = SecurityService.validateRegistrationData(validData);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.email).toBe('test@example.com');
      expect(result.sanitizedData.name).toBe('Test User');
    });

    it('should reject invalid registration data', () => {
      const invalidData = {
        email: 'invalid-email',
        name: '',
        phone: 'invalid-phone'
      };

      const result = SecurityService.validateRegistrationData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Permission System', () => {
    it('should check admin permissions', async () => {
      const adminUser = { isAdmin: true };
      const regularUser = { isAdmin: false };

      expect(await SecurityService.checkPermission(adminUser, 'admin')).toBe(true);
      expect(await SecurityService.checkPermission(regularUser, 'admin')).toBe(false);
    });

    it('should allow read access to all users', async () => {
      const user = { isAdmin: false };
      expect(await SecurityService.checkPermission(user, 'read_books')).toBe(true);
    });

    it('should restrict write access to admins only', async () => {
      const adminUser = { isAdmin: true };
      const regularUser = { isAdmin: false };

      expect(await SecurityService.checkPermission(adminUser, 'write_books')).toBe(true);
      expect(await SecurityService.checkPermission(regularUser, 'write_books')).toBe(false);
    });
  });

  describe('Security Logging', () => {
    it('should log security events', () => {
      SecurityService.logSecurityEvent('test_event', { test: 'data' });

      const logs = SecurityService.getSecurityLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].type).toBe('test_event');
      expect(logs[0].data.test).toBe('data');
    });

    it('should limit log storage', () => {
      // Add more than 100 logs
      for (let i = 0; i < 105; i++) {
        SecurityService.logSecurityEvent('test_event', { index: i });
      }

      const logs = JSON.parse(localStorage.getItem('security_logs'));
      expect(logs.length).toBe(100);
    });

    it('should clear old logs', () => {
      // Add logs with old timestamps
      const oldLogs = [
        {
          type: 'old_event',
          timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          data: {}
        },
        {
          type: 'recent_event',
          timestamp: new Date().toISOString(),
          data: {}
        }
      ];

      localStorage.setItem('security_logs', JSON.stringify(oldLogs));

      const removedCount = SecurityService.clearOldLogs(30);
      expect(removedCount).toBe(1);

      const remainingLogs = SecurityService.getSecurityLogs();
      expect(remainingLogs.length).toBe(1);
      expect(remainingLogs[0].type).toBe('recent_event');
    });
  });

  describe('Secure Error Messages', () => {
    it('should return secure error messages', () => {
      const testCases = [
        { code: 'auth/user-not-found', expected: 'Invalid email or password' },
        { code: 'auth/wrong-password', expected: 'Invalid email or password' },
        { code: 'auth/email-already-in-use', expected: 'Email is already registered' },
        { code: 'unknown-error', expected: 'An error occurred. Please try again.' }
      ];

      testCases.forEach(({ code, expected }) => {
        const error = { code };
        const message = SecurityService.getSecureErrorMessage(error);
        expect(message).toBe(expected);
      });
    });
  });

  describe('Secure ID Generation', () => {
    it('should generate unique secure IDs', () => {
      const id1 = SecurityService.generateSecureId();
      const id2 = SecurityService.generateSecureId();

      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(64); // 32 bytes * 2 hex chars
      expect(/^[a-f0-9]+$/.test(id1)).toBe(true);
    });
  });
});

describe('ValidationService', () => {
  describe('Email Validation', () => {
    it('should validate correct emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      validEmails.forEach(email => {
        const result = ValidationService.validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(email.toLowerCase());
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'a'.repeat(250) + '@domain.com' // Too long
      ];

      invalidEmails.forEach(email => {
        const result = ValidationService.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        'SELECT * FROM users'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = ValidationService.sanitizeInput(input);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
      });
    });

    it('should detect suspicious patterns', () => {
      const suspiciousInputs = [
        '<script>alert(1)</script>',
        'javascript:void(0)',
        'SELECT * FROM users',
        '../../../etc/passwd',
        'eval(malicious_code)'
      ];

      suspiciousInputs.forEach(input => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(input);
        expect(isSuspicious).toBe(true);
      });
    });
  });

  describe('File Validation', () => {
    it('should validate file properties', () => {
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = ValidationService.validateFile(validFile);
      expect(result.isValid).toBe(true);
    });

    it('should reject oversized files', () => {
      const largeContent = new Array(6 * 1024 * 1024).fill('a').join(''); // 6MB
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = ValidationService.validateFile(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('5MB');
    });

    it('should reject invalid file types', () => {
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/exe' });
      const result = ValidationService.validateFile(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be one of');
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
          }
        ],
        totalAmount: 59.98
      };

      const result = ValidationService.validateOrderData(validOrder);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.customer.name).toBe('John Doe');
    });

    it('should reject invalid order data', () => {
      const invalidOrder = {
        customer: {
          name: '',
          email: 'invalid-email'
        },
        items: [],
        totalAmount: -10
      };

      const result = ValidationService.validateOrderData(invalidOrder);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });
});

describe('RateLimitingService', () => {
  beforeEach(() => {
    RateLimitingService.clearAllLimits();
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const identifier = 'test-user';
      const action = 'login';

      const result = RateLimitingService.checkLimit(identifier, action);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5); // Default login limit is 5
    });

    it('should block requests exceeding limit', () => {
      const identifier = 'test-user';
      const action = 'login';

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        RateLimitingService.recordAction(identifier, action);
      }

      const result = RateLimitingService.checkLimit(identifier, action);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset limits after time window', () => {
      const identifier = 'test-user';
      const action = 'login';

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        RateLimitingService.recordAction(identifier, action);
      }

      // Manually set expired time
      const key = `${identifier}:${action}`;
      const stored = RateLimitingService.getStoredData(key);
      stored.resetTime = Date.now() - 1000; // Expired
      RateLimitingService.setStoredData(key, stored);

      const result = RateLimitingService.checkLimit(identifier, action);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect high request volume', () => {
      const identifier = 'suspicious-user';

      // Simulate high activity
      for (let i = 0; i < 15; i++) {
        RateLimitingService.recordAction(identifier, `action_${i}`);
      }

      const analysis = RateLimitingService.detectSuspiciousActivity(identifier);
      expect(analysis.isSuspicious).toBe(true);
      expect(analysis.patterns).toContain('high_action_variety');
    });

    it('should detect brute force attempts', () => {
      const identifier = 'brute-force-user';

      // Simulate failed login attempts
      for (let i = 0; i < 6; i++) {
        RateLimitingService.recordAction(identifier, 'login');
      }

      const analysis = RateLimitingService.detectSuspiciousActivity(identifier);
      expect(analysis.isSuspicious).toBe(true);
      expect(analysis.patterns).toContain('brute_force_login');
    });
  });

  describe('User Blocking', () => {
    it('should block suspicious users', () => {
      const identifier = 'blocked-user';

      RateLimitingService.blockUser(identifier, 60000); // 1 minute

      const blockStatus = RateLimitingService.isUserBlocked(identifier);
      expect(blockStatus.blocked).toBe(true);
      expect(blockStatus.remainingMs).toBeGreaterThan(0);
    });

    it('should unblock users after duration', () => {
      const identifier = 'temp-blocked-user';

      RateLimitingService.blockUser(identifier, 100); // 100ms

      // Wait for block to expire
      setTimeout(() => {
        const blockStatus = RateLimitingService.isUserBlocked(identifier);
        expect(blockStatus.blocked).toBe(false);
      }, 150);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old rate limit data', () => {
      const identifier = 'cleanup-user';

      // Add some rate limit data
      RateLimitingService.recordAction(identifier, 'test');

      // Manually set old timestamp
      const key = `${identifier}:test`;
      const stored = RateLimitingService.getStoredData(key);
      stored.resetTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      RateLimitingService.setStoredData(key, stored);

      const cleanedCount = RateLimitingService.cleanup();
      expect(cleanedCount).toBeGreaterThan(0);
    });
  });
});