import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import errorHandlingService, { ErrorHandlingService } from '../ErrorHandlingService';

describe('ErrorHandlingService', () => {
  let service;

  beforeEach(() => {
    service = new ErrorHandlingService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearErrorLog();
  });

  describe('Error Categorization', () => {
    it('should categorize Firebase authentication errors', () => {
      const error = new Error('Authentication failed');
      error.code = 'auth/user-not-found';
      
      const category = service.categorizeError(error);
      expect(category).toBe('authentication');
    });

    it('should categorize network errors', () => {
      const error = new Error('Network request failed');
      error.name = 'NetworkError';
      
      const category = service.categorizeError(error);
      expect(category).toBe('network');
    });

    it('should categorize Cloudinary errors', () => {
      const error = new Error('Cloudinary upload failed');
      error.message = 'cloudinary upload error';
      
      const category = service.categorizeError(error);
      expect(category).toBe('cloudinary');
    });

    it('should categorize Telegram errors', () => {
      const error = new Error('Telegram API error');
      error.code = 'telegram/api-error';
      
      const category = service.categorizeError(error);
      expect(category).toBe('telegram');
    });

    it('should categorize validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      const category = service.categorizeError(error);
      expect(category).toBe('validation');
    });

    it('should default to system category for unknown errors', () => {
      const error = new Error('Unknown error');
      
      const category = service.categorizeError(error);
      expect(category).toBe('system');
    });
  });

  describe('Error Severity', () => {
    it('should assign critical severity to disabled user auth errors', () => {
      const error = new Error('User disabled');
      error.code = 'auth/user-disabled';
      
      const severity = service.determineSeverity(error, 'authentication');
      expect(severity).toBe('critical');
    });

    it('should assign high severity to Firebase errors', () => {
      const error = new Error('Firebase error');
      
      const severity = service.determineSeverity(error, 'firebase');
      expect(severity).toBe('high');
    });

    it('should assign medium severity to Cloudinary errors', () => {
      const error = new Error('Cloudinary error');
      
      const severity = service.determineSeverity(error, 'cloudinary');
      expect(severity).toBe('medium');
    });

    it('should assign low severity to validation errors', () => {
      const error = new Error('Validation error');
      
      const severity = service.determineSeverity(error, 'validation');
      expect(severity).toBe('low');
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide Uzbek messages for network errors', () => {
      const message = service.getUserFriendlyMessage('network', new Error());
      expect(message).toContain('Internet aloqasini tekshiring');
    });

    it('should provide Uzbek messages for authentication errors', () => {
      const message = service.getUserFriendlyMessage('authentication', new Error());
      expect(message).toContain('Tizimga kirish bilan bog\'liq muammo');
    });

    it('should provide Uzbek messages for validation errors', () => {
      const message = service.getUserFriendlyMessage('validation', new Error());
      expect(message).toContain('Kiritilgan ma\'lumotlarda xatolik');
    });

    it('should provide default message for unknown categories', () => {
      const message = service.getUserFriendlyMessage('unknown', new Error());
      expect(message).toContain('Tizimda vaqtincha muammo');
    });
  });

  describe('Retry Logic', () => {
    it('should not retry validation errors', () => {
      const error = new Error('Validation failed');
      const shouldRetry = service.shouldRetry(error, 'validation');
      expect(shouldRetry).toBe(false);
    });

    it('should not retry authentication errors', () => {
      const error = new Error('Auth failed');
      const shouldRetry = service.shouldRetry(error, 'authentication');
      expect(shouldRetry).toBe(false);
    });

    it('should retry network errors', () => {
      const error = new Error('Network failed');
      const shouldRetry = service.shouldRetry(error, 'network');
      expect(shouldRetry).toBe(true);
    });

    it('should retry Cloudinary errors', () => {
      const error = new Error('Cloudinary failed');
      const shouldRetry = service.shouldRetry(error, 'cloudinary');
      expect(shouldRetry).toBe(true);
    });

    it('should retry Telegram errors', () => {
      const error = new Error('Telegram failed');
      const shouldRetry = service.shouldRetry(error, 'telegram');
      expect(shouldRetry).toBe(true);
    });
  });

  describe('Error Processing', () => {
    it('should process error with all required fields', () => {
      const error = new Error('Test error');
      error.code = 'test/error';
      
      const processed = service.processError(error, 'test_context', { userId: '123' });
      
      expect(processed).toHaveProperty('id');
      expect(processed).toHaveProperty('timestamp');
      expect(processed.context).toBe('test_context');
      expect(processed.category).toBe('system');
      expect(processed.originalError.message).toBe('Test error');
      expect(processed.originalError.code).toBe('test/error');
      expect(processed.metadata.userId).toBe('123');
      expect(processed).toHaveProperty('userMessage');
      expect(processed).toHaveProperty('shouldRetry');
    });

    it('should include retry count in metadata', () => {
      const error = new Error('Test error');
      
      const processed = service.processError(error, 'test', { retryCount: 2 });
      
      expect(processed.retryCount).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle error and return processed error', () => {
      const error = new Error('Test error');
      
      const result = service.handleError(error, 'test_context');
      
      expect(result).toHaveProperty('id');
      expect(result.context).toBe('test_context');
      expect(result.originalError.message).toBe('Test error');
    });

    it('should log error to internal storage', () => {
      const error = new Error('Test error');
      
      service.handleError(error, 'test_context');
      
      const stats = service.getErrorStatistics();
      expect(stats.total).toBe(1);
    });

    it('should notify error listeners', () => {
      const listener = vi.fn();
      service.addErrorListener(listener);
      
      const error = new Error('Test error');
      service.handleError(error, 'test_context');
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          originalError: expect.objectContaining({
            message: 'Test error'
          })
        })
      );
    });
  });

  describe('Retry Operation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await service.retryOperation(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await service.retryOperation(operation, { maxRetries: 2 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const error = new Error('Persistent error');
      error.message = 'network error'; // Make it retryable
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(service.retryOperation(operation, { maxRetries: 2 }))
        .rejects.toThrow();
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Validation error');
      error.name = 'ValidationError';
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(service.retryOperation(operation))
        .rejects.toThrow('Validation error');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await service.retryOperation(operation, { 
        maxRetries: 2, 
        baseDelay: 100,
        backoffMultiplier: 2
      });
      const endTime = Date.now();
      
      // Should have waited at least 100ms + 200ms = 300ms
      expect(endTime - startTime).toBeGreaterThan(250);
    });
  });

  describe('Error Statistics', () => {
    beforeEach(() => {
      // Add some test errors
      service.handleError(new Error('Network error'), 'test1');
      service.handleError(new Error('Validation error'), 'test2');
      
      const authError = new Error('Auth error');
      authError.code = 'auth/invalid-email';
      service.handleError(authError, 'test3');
    });

    it('should return total error count', () => {
      const stats = service.getErrorStatistics();
      expect(stats.total).toBe(3);
    });

    it('should return category breakdown', () => {
      const stats = service.getErrorStatistics();
      expect(stats.categoryBreakdown).toEqual({
        network: 1,
        validation: 1,
        authentication: 1
      });
    });

    it('should return severity breakdown', () => {
      const stats = service.getErrorStatistics();
      expect(stats.severityBreakdown).toHaveProperty('low');
      // Check that severity breakdown exists and has at least one property
      expect(Object.keys(stats.severityBreakdown).length).toBeGreaterThan(0);
    });

    it('should filter by category', () => {
      const stats = service.getErrorStatistics({ category: 'network' });
      expect(stats.total).toBe(1);
      expect(stats.categoryBreakdown.network).toBe(1);
    });

    it('should filter by severity', () => {
      const stats = service.getErrorStatistics({ severity: 'low' });
      expect(stats.total).toBeGreaterThan(0);
    });

    it('should filter by time range', () => {
      const oneHour = 60 * 60 * 1000;
      const stats = service.getErrorStatistics({ timeRange: oneHour });
      expect(stats.total).toBe(3); // All errors are recent
    });

    it('should return recent errors', () => {
      const stats = service.getErrorStatistics();
      expect(stats.recentErrors).toHaveLength(3);
      expect(stats.recentErrors[0]).toHaveProperty('id');
      expect(stats.recentErrors[0]).toHaveProperty('timestamp');
    });
  });

  describe('Error Listeners', () => {
    it('should add and remove error listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      service.addErrorListener(listener1);
      service.addErrorListener(listener2);
      
      service.handleError(new Error('Test'), 'test');
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      service.removeErrorListener(listener1);
      service.handleError(new Error('Test2'), 'test');
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it('should handle listener errors gracefully', () => {
      const badListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();
      
      service.addErrorListener(badListener);
      service.addErrorListener(goodListener);
      
      // Should not throw
      expect(() => {
        service.handleError(new Error('Test'), 'test');
      }).not.toThrow();
      
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Error Log Management', () => {
    it('should limit error log size', () => {
      // Add more than 1000 errors
      for (let i = 0; i < 1100; i++) {
        service.handleError(new Error(`Error ${i}`), 'test');
      }
      
      const stats = service.getErrorStatistics();
      expect(stats.total).toBe(1000); // Should be capped at 1000
    });

    it('should clear error log', () => {
      service.handleError(new Error('Test'), 'test');
      expect(service.getErrorStatistics().total).toBe(1);
      
      service.clearErrorLog();
      expect(service.getErrorStatistics().total).toBe(0);
    });
  });

  describe('Fallback Error Handling', () => {
    it('should create fallback error when error handling fails', () => {
      const originalProcessError = service.processError;
      service.processError = vi.fn().mockImplementation(() => {
        throw new Error('Processing failed');
      });
      
      const result = service.handleError(new Error('Original error'), 'test');
      
      expect(result).toHaveProperty('id');
      expect(result.category).toBe('system');
      expect(result.severity).toBe('high');
      expect(result.metadata.fallback).toBe(true);
      
      // Restore original method
      service.processError = originalProcessError;
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(errorHandlingService).toBeInstanceOf(ErrorHandlingService);
    });

    it('should maintain state across imports', () => {
      errorHandlingService.handleError(new Error('Test'), 'singleton_test');
      
      const stats = errorHandlingService.getErrorStatistics();
      expect(stats.total).toBeGreaterThan(0);
    });
  });
});