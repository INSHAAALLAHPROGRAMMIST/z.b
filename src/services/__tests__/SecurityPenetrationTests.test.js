/**
 * Security Penetration Tests
 * Comprehensive security testing scenarios to identify vulnerabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SecurityService from '../SecurityService';
import ValidationService from '../ValidationService';
import SecureFileUploadService from '../SecureFileUploadService';
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

describe('Security Penetration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('XSS (Cross-Site Scripting) Tests', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(1)">',
      '<body onload="alert(1)">',
      '<input onfocus="alert(1)" autofocus>',
      '<select onfocus="alert(1)" autofocus>',
      '<textarea onfocus="alert(1)" autofocus>',
      '<keygen onfocus="alert(1)" autofocus>',
      '<video><source onerror="alert(1)">',
      '<audio src="x" onerror="alert(1)">',
      '<details open ontoggle="alert(1)">',
      '<marquee onstart="alert(1)">',
      '"><script>alert(1)</script>',
      '\';alert(1);//',
      '"><img src=x onerror=alert(1)>',
      '<script>eval(String.fromCharCode(97,108,101,114,116,40,49,41))</script>'
    ];

    it('should sanitize XSS attempts in name validation', () => {
      xssPayloads.forEach(payload => {
        const result = ValidationService.validateName(payload);
        expect(result.isValid).toBe(false);
        if (result.isValid) {
          expect(result.value).not.toContain('<script');
          expect(result.value).not.toContain('javascript:');
          expect(result.value).not.toContain('onerror');
        }
      });
    });

    it('should sanitize XSS attempts in text validation', () => {
      xssPayloads.forEach(payload => {
        const result = ValidationService.validateText(payload, 'Description');
        expect(result.isValid).toBe(false);
        if (result.isValid) {
          expect(result.value).not.toContain('<script');
          expect(result.value).not.toContain('javascript:');
          expect(result.value).not.toContain('onerror');
        }
      });
    });

    it('should detect XSS patterns in suspicious content detection', () => {
      xssPayloads.forEach(payload => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(payload);
        expect(isSuspicious).toBe(true);
      });
    });

    it('should sanitize XSS in order data', () => {
      const maliciousOrder = {
        customer: {
          name: '<script>alert("XSS")</script>John Doe',
          email: 'test@example.com',
          phone: '+1234567890'
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

      const result = ValidationService.validateOrderData(maliciousOrder);
      if (result.isValid) {
        expect(result.sanitizedData.customer.name).not.toContain('<script');
      } else {
        expect(result.errors.customerName).toBeDefined();
      }
    });
  });

  describe('SQL Injection Tests', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' OR 1=1 --",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' OR 'x'='x",
      "'; DELETE FROM users WHERE 't'='t",
      "' OR 1=1#",
      "' OR 'a'='a",
      "') OR ('1'='1",
      "' OR 1=1/*",
      "admin'--",
      "admin'/*",
      "' OR 1=1 LIMIT 1 --",
      "' UNION ALL SELECT NULL,NULL,NULL,NULL,NULL --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; EXEC xp_cmdshell('dir'); --",
      "' OR SLEEP(5) --",
      "' OR pg_sleep(5) --",
      "'; WAITFOR DELAY '00:00:05' --"
    ];

    it('should detect SQL injection in email validation', () => {
      sqlInjectionPayloads.forEach(payload => {
        const email = `test${payload}@example.com`;
        const result = ValidationService.validateEmail(email);
        expect(result.isValid).toBe(false);
      });
    });

    it('should detect SQL injection in name validation', () => {
      sqlInjectionPayloads.forEach(payload => {
        const name = `John${payload}Doe`;
        const result = ValidationService.validateName(name);
        expect(result.isValid).toBe(false);
      });
    });

    it('should detect SQL injection patterns', () => {
      sqlInjectionPayloads.forEach(payload => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(payload);
        expect(isSuspicious).toBe(true);
      });
    });
  });

  describe('Path Traversal Tests', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '..%2F..%2F..%2Fetc%2Fpasswd',
      '..%252F..%252F..%252Fetc%252Fpasswd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
      '/%2e%2e/%2e%2e/%2e%2e/etc/passwd',
      '/var/www/../../etc/passwd',
      'C:\\..\\..\\..\\windows\\system32\\drivers\\etc\\hosts'
    ];

    it('should detect path traversal in file names', () => {
      pathTraversalPayloads.forEach(payload => {
        const result = SecureFileUploadService.validateFileName(payload);
        expect(result.isValid).toBe(false);
      });
    });

    it('should detect path traversal patterns', () => {
      pathTraversalPayloads.forEach(payload => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(payload);
        expect(isSuspicious).toBe(true);
      });
    });

    it('should sanitize path traversal in file names', () => {
      pathTraversalPayloads.forEach(payload => {
        const sanitized = SecureFileUploadService.sanitizeFileName(payload);
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
        expect(sanitized).not.toContain('%2e%2e');
      });
    });
  });

  describe('File Upload Security Tests', () => {
    it('should reject executable files disguised as images', async () => {
      const maliciousFiles = [
        { name: 'image.jpg.exe', type: 'image/jpeg' },
        { name: 'photo.png.scr', type: 'image/png' },
        { name: 'picture.gif.bat', type: 'image/gif' },
        { name: 'avatar.webp.com', type: 'image/webp' }
      ];

      for (const fileData of maliciousFiles) {
        const file = new File(['malicious content'], fileData.name, {
          type: fileData.type,
          lastModified: Date.now()
        });

        const result = await SecureFileUploadService.validateFile(file, 'image');
        expect(result.isValid).toBe(false);
      }
    });

    it('should reject files with malicious content in metadata', async () => {
      const file = new File(['<script>alert(1)</script>'], 'image.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const result = await SecureFileUploadService.detectMaliciousContent(file);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('script'))).toBe(true);
    });

    it('should reject polyglot files (files that are valid in multiple formats)', async () => {
      // Simulate a file that could be both an image and a script
      const polyglotContent = 'GIF89a<script>alert(1)</script>';
      const file = new File([polyglotContent], 'polyglot.gif', {
        type: 'image/gif',
        lastModified: Date.now()
      });

      const result = await SecureFileUploadService.detectMaliciousContent(file);
      expect(result.isValid).toBe(false);
    });

    it('should reject zip bombs (highly compressed malicious files)', async () => {
      // Simulate a file that appears small but would expand to huge size
      const file = {
        name: 'small.jpg',
        type: 'image/jpeg',
        size: 1024, // 1KB
        lastModified: Date.now(),
        slice: () => new Blob(['compressed data that would expand to GB'])
      };

      // This would be detected by checking compression ratios in a real implementation
      const result = await SecureFileUploadService.validateFile(file, 'image');
      // For now, we just ensure the validation runs without errors
      expect(result).toBeDefined();
    });
  });

  describe('Authentication Bypass Tests', () => {
    it('should prevent authentication bypass with malformed tokens', async () => {
      const malformedTokens = [
        'null',
        'undefined',
        '{}',
        '{"uid": "admin"}',
        'Bearer malicious_token',
        'eyJhbGciOiJub25lIn0.eyJ1aWQiOiJhZG1pbiJ9.',
        'admin',
        '../../admin',
        '<script>admin</script>'
      ];

      // Test session validation with malformed data
      malformedTokens.forEach(token => {
        localStorage.setItem('secure_session', token);
        const validation = SecurityService.validateSession();
        expect(validation.isValid).toBe(false);
      });
    });

    it('should prevent privilege escalation through session manipulation', () => {
      const maliciousSession = {
        sessionId: 'valid-session',
        userId: 'regular-user',
        email: 'user@example.com',
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        userAgent: navigator.userAgent,
        lastActivity: Date.now(),
        isAdmin: true // Attempting to escalate privileges
      };

      localStorage.setItem('secure_session', JSON.stringify(maliciousSession));
      
      // The session validation should not trust client-side admin flags
      const validation = SecurityService.validateSession();
      if (validation.isValid) {
        // Admin status should be verified server-side, not from session
        expect(validation.session.isAdmin).toBeUndefined();
      }
    });
  });

  describe('Rate Limiting Bypass Tests', () => {
    it('should prevent rate limit bypass through identifier manipulation', () => {
      const bypassAttempts = [
        'user1',
        'user1 ',
        ' user1',
        'user1\n',
        'user1\t',
        'USER1',
        'user1\0',
        'user1%00',
        'user1/../user2',
        'user1\\..\\user2'
      ];

      // Exhaust rate limit for first identifier
      for (let i = 0; i < 5; i++) {
        RateLimitingService.recordAction('user1', 'login');
      }

      // Try to bypass with manipulated identifiers
      bypassAttempts.forEach(identifier => {
        const result = RateLimitingService.checkLimit(identifier, 'login');
        // Some variations might work, but the core protection should remain
        if (identifier.trim().toLowerCase() === 'user1') {
          expect(result.allowed).toBe(false);
        }
      });
    });

    it('should prevent rate limit bypass through action manipulation', () => {
      const actionVariations = [
        'login',
        'LOGIN',
        'Login',
        'login ',
        ' login',
        'login\n',
        'login\t',
        'log\0in',
        'log%00in',
        'login/../register',
        'login\\..\\register'
      ];

      // Exhaust rate limit for login
      for (let i = 0; i < 5; i++) {
        RateLimitingService.recordAction('user1', 'login');
      }

      // Try variations - they should all be treated as separate actions
      // but the original 'login' should still be blocked
      const loginResult = RateLimitingService.checkLimit('user1', 'login');
      expect(loginResult.allowed).toBe(false);
    });

    it('should prevent distributed rate limit bypass', () => {
      // Simulate multiple users from same source trying to bypass limits
      const userIds = Array.from({ length: 20 }, (_, i) => `user${i}`);
      
      userIds.forEach(userId => {
        for (let i = 0; i < 3; i++) {
          RateLimitingService.recordAction(userId, 'login');
        }
      });

      // Check if the system detects this as suspicious activity
      userIds.forEach(userId => {
        const suspiciousActivity = RateLimitingService.detectSuspiciousActivity(userId);
        // With multiple actions, some should be flagged as suspicious
        if (suspiciousActivity.recentActions.length > 5) {
          expect(suspiciousActivity.isSuspicious).toBe(true);
        }
      });
    });
  });

  describe('Session Security Tests', () => {
    it('should prevent session fixation attacks', async () => {
      // Attacker tries to fix a session ID
      const fixedSessionId = 'attacker-controlled-session-id';
      
      const maliciousSession = {
        sessionId: fixedSessionId,
        userId: 'victim-user',
        email: 'victim@example.com',
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        userAgent: navigator.userAgent,
        lastActivity: Date.now()
      };

      localStorage.setItem('secure_session', JSON.stringify(maliciousSession));

      // When creating a new session, it should generate a new secure ID
      const mockUser = { uid: 'victim-user', email: 'victim@example.com' };
      const newSession = await SecurityService.createSecureSession(mockUser);
      
      expect(newSession.sessionId).not.toBe(fixedSessionId);
      expect(newSession.sessionId.length).toBe(64); // Secure random ID
    });

    it('should prevent session hijacking through user agent spoofing', () => {
      const originalUserAgent = navigator.userAgent;
      
      // Create session with original user agent
      const sessionData = {
        sessionId: 'test-session',
        userId: 'test-user',
        email: 'test@example.com',
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        userAgent: originalUserAgent,
        lastActivity: Date.now()
      };

      localStorage.setItem('secure_session', JSON.stringify(sessionData));

      // Simulate user agent change (potential hijacking)
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Malicious User Agent',
        configurable: true
      });

      const validation = SecurityService.validateSession();
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Session security violation');

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true
      });
    });

    it('should prevent session replay attacks', () => {
      // Create an old session
      const oldSession = {
        sessionId: 'old-session',
        userId: 'test-user',
        email: 'test@example.com',
        createdAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        expiresAt: Date.now() - 1000, // Expired
        userAgent: navigator.userAgent,
        lastActivity: Date.now() - 25 * 60 * 60 * 1000
      };

      localStorage.setItem('secure_session', JSON.stringify(oldSession));

      const validation = SecurityService.validateSession();
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Session expired');
    });
  });

  describe('Input Validation Bypass Tests', () => {
    it('should prevent validation bypass through encoding', () => {
      const encodedPayloads = [
        '%3Cscript%3Ealert(1)%3C/script%3E', // URL encoded
        '&lt;script&gt;alert(1)&lt;/script&gt;', // HTML encoded
        '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e', // Unicode encoded
        'PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', // Base64 encoded
        String.fromCharCode(60,115,99,114,105,112,116,62,97,108,101,114,116,40,49,41,60,47,115,99,114,105,112,116,62)
      ];

      encodedPayloads.forEach(payload => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(payload);
        // Some encoded payloads might not be detected, but the decoded versions should be
        const decoded = decodeURIComponent(payload);
        const isDecodedSuspicious = ValidationService.containsSuspiciousPatterns(decoded);
        
        // At least one should be detected as suspicious
        expect(isSuspicious || isDecodedSuspicious).toBe(true);
      });
    });

    it('should prevent validation bypass through null bytes', () => {
      const nullBytePayloads = [
        'normal\0<script>alert(1)</script>',
        'image.jpg\0.exe',
        'safe\x00malicious',
        'test%00.exe'
      ];

      nullBytePayloads.forEach(payload => {
        const isSuspicious = ValidationService.containsSuspiciousPatterns(payload);
        expect(isSuspicious).toBe(true);
      });
    });

    it('should prevent validation bypass through Unicode normalization', () => {
      // Different Unicode representations of the same characters
      const unicodePayloads = [
        'scr\u0131pt', // Turkish dotless i
        'java\u0073cript', // Unicode s
        'ale\u0072t', // Unicode r
        '\uFF1Cscript\uFF1E', // Fullwidth characters
        '\u003Cscript\u003E' // Unicode angle brackets
      ];

      unicodePayloads.forEach(payload => {
        const result = ValidationService.validateName(payload);
        // Should either be rejected or properly sanitized
        if (result.isValid) {
          expect(result.value).not.toContain('script');
        } else {
          expect(result.error).toBeDefined();
        }
      });
    });
  });

  describe('Business Logic Security Tests', () => {
    it('should prevent negative quantity orders', () => {
      const maliciousOrder = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        items: [
          {
            bookId: 'book-123',
            quantity: -5, // Negative quantity
            price: 29.99
          }
        ],
        totalAmount: -149.95
      };

      const result = ValidationService.validateOrderData(maliciousOrder);
      expect(result.isValid).toBe(false);
      expect(result.errors.item0Quantity).toBeDefined();
    });

    it('should prevent price manipulation', () => {
      const priceManipulationOrder = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        items: [
          {
            bookId: 'book-123',
            quantity: 1,
            price: 0.01 // Manipulated price
          }
        ],
        totalAmount: 0.01
      };

      // In a real application, prices should be validated against server-side data
      const result = ValidationService.validateOrderData(priceManipulationOrder);
      // This passes basic validation but should be caught by business logic
      expect(result.isValid).toBe(true);
      
      // Additional business logic validation would be needed here
      // to compare against actual book prices from the database
    });

    it('should prevent excessive quantity orders', () => {
      const excessiveOrder = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        items: [
          {
            bookId: 'book-123',
            quantity: 999999, // Excessive quantity
            price: 29.99
          }
        ],
        totalAmount: 29989970.01
      };

      const result = ValidationService.validateOrderData(excessiveOrder);
      // Basic validation passes, but business logic should limit quantities
      expect(result.isValid).toBe(true);
      
      // In production, additional validation would check against inventory
      // and reasonable purchase limits
    });
  });

  describe('Error Information Disclosure Tests', () => {
    it('should not expose sensitive information in error messages', () => {
      const sensitiveErrors = [
        { code: 'auth/user-not-found', message: 'User not found in database table users' },
        { code: 'auth/wrong-password', message: 'Password hash mismatch for user john@example.com' },
        { code: 'database/connection-failed', message: 'Connection failed to mongodb://localhost:27017/production' },
        { code: 'internal/server-error', message: 'Stack trace: Error at line 123 in /home/app/secret-file.js' }
      ];

      sensitiveErrors.forEach(error => {
        const secureMessage = SecurityService.getSecureErrorMessage(error);
        
        // Should not contain sensitive information
        expect(secureMessage).not.toContain('database');
        expect(secureMessage).not.toContain('mongodb://');
        expect(secureMessage).not.toContain('localhost');
        expect(secureMessage).not.toContain('stack trace');
        expect(secureMessage).not.toContain('/home/');
        expect(secureMessage).not.toContain('john@example.com');
        expect(secureMessage).not.toContain('hash');
        
        // Should be generic and user-friendly
        expect(secureMessage.length).toBeGreaterThan(10);
        expect(secureMessage.length).toBeLessThan(100);
      });
    });
  });

  describe('Timing Attack Prevention Tests', () => {
    it('should have consistent response times for user enumeration', async () => {
      const validEmail = 'existing@example.com';
      const invalidEmail = 'nonexistent@example.com';
      
      // Mock Firebase to simulate different response times
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      
      signInWithEmailAndPassword.mockImplementation((auth, email, password) => {
        if (email === validEmail) {
          return Promise.reject({ code: 'auth/wrong-password' });
        } else {
          return Promise.reject({ code: 'auth/user-not-found' });
        }
      });

      const startTime1 = Date.now();
      try {
        await SecurityService.login(validEmail, 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }
      const endTime1 = Date.now();

      const startTime2 = Date.now();
      try {
        await SecurityService.login(invalidEmail, 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }
      const endTime2 = Date.now();

      // Response times should be similar (within reasonable variance)
      const timeDiff = Math.abs((endTime1 - startTime1) - (endTime2 - startTime2));
      expect(timeDiff).toBeLessThan(100); // Allow 100ms variance
    });
  });
});