import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useErrorHandler, useFormErrorHandler, useAsyncOperation } from '../useErrorHandler';
import errorHandlingService from '../../services/ErrorHandlingService';

// Mock the error handling service
vi.mock('../../services/ErrorHandlingService', () => ({
  default: {
    handleError: vi.fn(),
    retryOperation: vi.fn()
  }
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    errorHandlingService.handleError.mockReturnValue({
      id: 'test-error-id',
      timestamp: '2024-01-01T00:00:00.000Z',
      context: 'component',
      category: 'system',
      severity: 'medium',
      originalError: {
        name: 'Error',
        message: 'Test error'
      },
      userMessage: 'Test user message',
      shouldRetry: true,
      retryCount: 0,
      metadata: {}
    });

    errorHandlingService.retryOperation.mockResolvedValue('success');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Error Handling', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.error).toBeNull();
      expect(result.current.hasError).toBe(false);
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });

    it('should handle error and update state', () => {
      const { result } = renderHook(() => useErrorHandler('test_context'));

      act(() => {
        const error = new Error('Test error');
        result.current.handleError(error, { testData: 'test' });
      });

      expect(errorHandlingService.handleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' }),
        'test_context',
        expect.objectContaining({ testData: 'test', retryCount: 0 })
      );

      expect(result.current.error).toBeTruthy();
      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBe('Test user message');
      expect(result.current.errorCategory).toBe('system');
      expect(result.current.errorSeverity).toBe('medium');
    });

    it('should clear error state', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(result.current.hasError).toBe(true);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.hasError).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Retry Operations', () => {
    it('should execute retry operation successfully', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const operation = vi.fn().mockResolvedValue('success');

      await act(async () => {
        const response = await result.current.retryOperation(operation);
        expect(response).toBe('success');
      });

      expect(errorHandlingService.retryOperation).toHaveBeenCalledWith(
        operation,
        expect.objectContaining({
          onRetry: expect.any(Function)
        })
      );

      expect(result.current.error).toBeNull();
    });

    it('should handle retry operation failure', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const error = new Error('Retry failed');
      errorHandlingService.retryOperation.mockRejectedValue(error);

      const operation = vi.fn().mockRejectedValue(error);

      await act(async () => {
        try {
          await result.current.retryOperation(operation);
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.isRetrying).toBe(false);
    });

    it('should update retry count during retry', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const operation = vi.fn().mockResolvedValue('success');
      const onRetry = vi.fn();

      await act(async () => {
        await result.current.retryOperation(operation, { onRetry });
      });

      // Check that onRetry callback is properly set up
      expect(errorHandlingService.retryOperation).toHaveBeenCalledWith(
        operation,
        expect.objectContaining({
          onRetry: expect.any(Function)
        })
      );
    });
  });

  describe('Execute with Error Handling', () => {
    it('should execute operation successfully', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const operation = vi.fn().mockResolvedValue('success');

      await act(async () => {
        const response = await result.current.executeWithErrorHandling(operation);
        expect(response).toBe('success');
      });

      expect(operation).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should handle operation failure', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);

      await act(async () => {
        try {
          await result.current.executeWithErrorHandling(operation, { testMeta: 'test' });
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(errorHandlingService.handleError).toHaveBeenCalledWith(
        error,
        'component',
        expect.objectContaining({ testMeta: 'test' })
      );

      expect(result.current.hasError).toBe(true);
    });
  });

  describe('Safe Execute', () => {
    it('should return success result for successful operation', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const operation = vi.fn().mockResolvedValue('success');

      let response;
      await act(async () => {
        response = await result.current.safeExecute(operation);
      });

      expect(response).toEqual({
        success: true,
        data: 'success',
        error: null
      });

      expect(result.current.error).toBeNull();
    });

    it('should return error result for failed operation', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);

      let response;
      await act(async () => {
        response = await result.current.safeExecute(operation, { testMeta: 'test' });
      });

      expect(response).toEqual({
        success: false,
        data: null,
        error: expect.objectContaining({
          userMessage: 'Test user message'
        })
      });

      expect(result.current.hasError).toBe(true);
    });
  });

  describe('Error Type Utilities', () => {
    it('should identify network errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      errorHandlingService.handleError.mockReturnValue({
        ...errorHandlingService.handleError(),
        category: 'network'
      });

      act(() => {
        result.current.handleError(new Error('Network error'));
      });

      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isValidationError).toBe(false);
      expect(result.current.isAuthError).toBe(false);
    });

    it('should identify validation errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      errorHandlingService.handleError.mockReturnValue({
        ...errorHandlingService.handleError(),
        category: 'validation'
      });

      act(() => {
        result.current.handleError(new Error('Validation error'));
      });

      expect(result.current.isValidationError).toBe(true);
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isAuthError).toBe(false);
    });

    it('should identify authentication errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      errorHandlingService.handleError.mockReturnValue({
        ...errorHandlingService.handleError(),
        category: 'authentication'
      });

      act(() => {
        result.current.handleError(new Error('Auth error'));
      });

      expect(result.current.isAuthError).toBe(true);
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isValidationError).toBe(false);
    });

    it('should identify retryable errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      errorHandlingService.handleError.mockReturnValue({
        ...errorHandlingService.handleError(),
        shouldRetry: true
      });

      act(() => {
        result.current.handleError(new Error('Retryable error'));
      });

      expect(result.current.canRetry).toBe(true);
    });
  });
});

describe('useFormErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Field Error Management', () => {
    it('should initialize with no errors', () => {
      const { result } = renderHook(() => useFormErrorHandler('test_form'));

      expect(result.current.fieldErrors).toEqual({});
      expect(result.current.formError).toBeNull();
      expect(result.current.hasFieldErrors).toBe(false);
      expect(result.current.hasFormError).toBe(false);
    });

    it('should set and clear field errors', () => {
      const { result } = renderHook(() => useFormErrorHandler('test_form'));

      act(() => {
        result.current.setFieldError('email', 'Invalid email');
      });

      expect(result.current.fieldErrors.email).toBe('Invalid email');
      expect(result.current.hasFieldErrors).toBe(true);
      expect(result.current.hasFieldError('email')).toBe(true);
      expect(result.current.getFieldError('email')).toBe('Invalid email');

      act(() => {
        result.current.clearFieldError('email');
      });

      expect(result.current.fieldErrors.email).toBeUndefined();
      expect(result.current.hasFieldErrors).toBe(false);
      expect(result.current.hasFieldError('email')).toBe(false);
      expect(result.current.getFieldError('email')).toBeNull();
    });

    it('should clear all field errors', () => {
      const { result } = renderHook(() => useFormErrorHandler('test_form'));

      act(() => {
        result.current.setFieldError('email', 'Invalid email');
        result.current.setFieldError('password', 'Too short');
      });

      expect(result.current.hasFieldErrors).toBe(true);

      act(() => {
        result.current.clearAllFieldErrors();
      });

      expect(result.current.fieldErrors).toEqual({});
      expect(result.current.hasFieldErrors).toBe(false);
    });
  });

  describe('Form Submission Handling', () => {
    it('should handle successful form submission', async () => {
      const { result } = renderHook(() => useFormErrorHandler('test_form'));

      const submitHandler = vi.fn().mockResolvedValue('success');
      const enhancedSubmit = result.current.handleFormSubmit(submitHandler);

      let response;
      await act(async () => {
        response = await enhancedSubmit({ email: 'test@test.com' });
      });

      expect(response).toBe('success');
      expect(submitHandler).toHaveBeenCalledWith({ email: 'test@test.com' });
      expect(result.current.hasFieldErrors).toBe(false);
      expect(result.current.hasFormError).toBe(false);
    });

    it('should handle validation errors in form submission', async () => {
      const { result } = renderHook(() => useFormErrorHandler('test_form'));

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ];

      const submitHandler = vi.fn().mockRejectedValue(validationError);
      const enhancedSubmit = result.current.handleFormSubmit(submitHandler);

      await act(async () => {
        try {
          await enhancedSubmit({ email: 'invalid', password: '123' });
        } catch (error) {
          expect(error).toBe(validationError);
        }
      });

      expect(result.current.fieldErrors.email).toBe('Invalid email format');
      expect(result.current.fieldErrors.password).toBe('Password too short');
      expect(result.current.hasFieldErrors).toBe(true);
    });

    it('should handle general form errors', async () => {
      const { result } = renderHook(() => useFormErrorHandler('test_form'));

      errorHandlingService.handleError.mockReturnValue({
        userMessage: 'Form submission failed'
      });

      const submitError = new Error('Network error');
      const submitHandler = vi.fn().mockRejectedValue(submitError);
      const enhancedSubmit = result.current.handleFormSubmit(submitHandler);

      await act(async () => {
        try {
          await enhancedSubmit({ email: 'test@test.com' });
        } catch (error) {
          expect(error).toBe(submitError);
        }
      });

      expect(result.current.formError).toBe('Form submission failed');
      expect(result.current.hasFormError).toBe(true);
    });
  });

  describe('Field Validation', () => {
    it('should validate field successfully', () => {
      const { result } = renderHook(() => useFormErrorHandler('test_form'));

      const validator = vi.fn().mockReturnValue(true);

      let isValid;
      act(() => {
        isValid = result.current.validateField('email', 'test@test.com', validator);
      });

      expect(isValid).toBe(true);
      expect(validator).toHaveBeenCalledWith('test@test.com');
      expect(result.current.hasFieldError('email')).toBe(false);
    });

    it('should handle field validation failure', () => {
      const { result } = renderHook(() => useFormErrorHandler('test_form'));

      const validator = vi.fn().mockImplementation(() => {
        throw new Error('Invalid email format');
      });

      let isValid;
      act(() => {
        isValid = result.current.validateField('email', 'invalid-email', validator);
      });

      expect(isValid).toBe(false);
      expect(result.current.getFieldError('email')).toBe('Invalid email format');
      expect(result.current.hasFieldError('email')).toBe(true);
    });
  });

  describe('Clear All Errors', () => {
    it('should clear all errors including form and field errors', () => {
      const { result } = renderHook(() => useFormErrorHandler('test_form'));

      act(() => {
        result.current.setFieldError('email', 'Invalid email');
        // Simulate form error by triggering handleError
        result.current.handleFormSubmit(() => {
          throw new Error('Form error');
        })({}).catch(() => {});
      });

      act(() => {
        result.current.clearAllErrors();
      });

      expect(result.current.fieldErrors).toEqual({});
      expect(result.current.formError).toBeNull();
      expect(result.current.hasFieldErrors).toBe(false);
      expect(result.current.hasFormError).toBe(false);
    });
  });
});

describe('useAsyncOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Operation Execution', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.hasError).toBe(false);
      expect(result.current.hasData).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should execute operation successfully', async () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      const operation = vi.fn().mockResolvedValue('success data');
      const onSuccess = vi.fn();

      await act(async () => {
        const response = await result.current.execute(operation, { onSuccess });
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe('success data');
      expect(result.current.error).toBeNull();
      expect(result.current.hasData).toBe(true);
      expect(result.current.isSuccess).toBe(true);
      expect(onSuccess).toHaveBeenCalledWith('success data');
    });

    it('should handle operation failure', async () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();

      await act(async () => {
        try {
          await result.current.execute(operation, { onError });
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.hasError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it('should manage loading state correctly', async () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      const operation = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('data'), 100))
      );

      const executePromise = act(async () => {
        return result.current.execute(operation);
      });

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      await executePromise;

      // Should not be loading after completion
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear data on start by default', async () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      // First operation
      await act(async () => {
        await result.current.execute(() => Promise.resolve('first data'));
      });

      expect(result.current.data).toBe('first data');

      // Second operation should clear data initially
      const secondOperation = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('second data'), 50))
      );

      act(() => {
        result.current.execute(secondOperation);
      });

      expect(result.current.data).toBeNull(); // Should be cleared
    });

    it('should not clear data on start when specified', async () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      // First operation
      await act(async () => {
        await result.current.execute(() => Promise.resolve('first data'));
      });

      expect(result.current.data).toBe('first data');

      // Second operation with clearDataOnStart: false
      await act(async () => {
        await result.current.execute(
          () => Promise.resolve('second data'),
          { clearDataOnStart: false }
        );
      });

      expect(result.current.data).toBe('second data');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state', async () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      // Execute operation to set some state
      await act(async () => {
        await result.current.execute(() => Promise.resolve('test data'));
      });

      expect(result.current.data).toBe('test data');

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.hasError).toBe(false);
      expect(result.current.hasData).toBe(false);
    });
  });

  describe('State Utilities', () => {
    it('should correctly identify success state', async () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      await act(async () => {
        await result.current.execute(() => Promise.resolve('success'));
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isEmpty).toBe(false);
    });

    it('should correctly identify empty state', () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      expect(result.current.isEmpty).toBe(true);
      expect(result.current.isSuccess).toBe(false);
    });

    it('should correctly identify error state', async () => {
      const { result } = renderHook(() => useAsyncOperation('test_operation'));

      await act(async () => {
        try {
          await result.current.execute(() => Promise.reject(new Error('Failed')));
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isEmpty).toBe(false);
    });
  });
});