import React, { useCallback, useEffect, useState } from 'react';
import errorHandlingService from '../services/ErrorHandlingService';

/**
 * Custom hook for error handling in React components
 * Provides error handling, retry mechanisms, and error state management
 */
export const useErrorHandler = (context = 'component') => {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Handle error with centralized error handling service
   * @param {Error} error - Error to handle
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Processed error information
   */
  const handleError = useCallback((error, metadata = {}) => {
    const processedError = errorHandlingService.handleError(
      error, 
      context, 
      { ...metadata, retryCount }
    );
    
    setError(processedError);
    return processedError;
  }, [context, retryCount]);

  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  /**
   * Retry operation with error handling
   * @param {Function} operation - Operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Operation result
   */
  const retryOperation = useCallback(async (operation, options = {}) => {
    setIsRetrying(true);
    
    try {
      const result = await errorHandlingService.retryOperation(operation, {
        ...options,
        onRetry: (attempt) => {
          setRetryCount(attempt);
          if (options.onRetry) {
            options.onRetry(attempt);
          }
        }
      });
      
      clearError();
      return result;
    } catch (error) {
      handleError(error, { operation: 'retry' });
      throw error;
    } finally {
      setIsRetrying(false);
    }
  }, [handleError, clearError]);

  /**
   * Async operation wrapper with error handling
   * @param {Function} operation - Async operation
   * @param {Object} metadata - Additional metadata
   * @returns {Promise} Operation result
   */
  const executeWithErrorHandling = useCallback(async (operation, metadata = {}) => {
    try {
      clearError();
      const result = await operation();
      return result;
    } catch (error) {
      handleError(error, metadata);
      throw error;
    }
  }, [handleError, clearError]);

  /**
   * Safe async operation that doesn't throw
   * @param {Function} operation - Async operation
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Result with success/error flags
   */
  const safeExecute = useCallback(async (operation, metadata = {}) => {
    try {
      clearError();
      const result = await operation();
      return { success: true, data: result, error: null };
    } catch (error) {
      const processedError = handleError(error, metadata);
      return { success: false, data: null, error: processedError };
    }
  }, [handleError, clearError]);

  /**
   * Create error boundary for component
   * @param {Function} fallback - Fallback component function
   * @returns {Function} Error boundary wrapper
   */
  const createErrorBoundary = useCallback((fallback) => {
    return (Component) => {
      return function ErrorBoundaryWrapper(props) {
        if (error) {
          return fallback ? fallback(error, clearError) : null;
        }
        return React.createElement(Component, props);
      };
    };
  }, [error, clearError]);

  return {
    // Error state
    error,
    isRetrying,
    retryCount,
    hasError: !!error,
    
    // Error handling methods
    handleError,
    clearError,
    retryOperation,
    executeWithErrorHandling,
    safeExecute,
    createErrorBoundary,
    
    // Utility methods
    isNetworkError: error?.category === 'network',
    isValidationError: error?.category === 'validation',
    isAuthError: error?.category === 'authentication',
    canRetry: error?.shouldRetry || false,
    
    // Error display helpers
    errorMessage: error?.userMessage || null,
    errorCategory: error?.category || null,
    errorSeverity: error?.severity || null
  };
};

/**
 * Hook for handling form errors specifically
 * @param {string} formName - Name of the form for context
 * @returns {Object} Form error handling utilities
 */
export const useFormErrorHandler = (formName = 'form') => {
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const { handleError, clearError } = useErrorHandler(`form_${formName}`);

  /**
   * Set error for specific field
   * @param {string} fieldName - Field name
   * @param {string} errorMessage - Error message
   */
  const setFieldError = useCallback((fieldName, errorMessage) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));
  }, []);

  /**
   * Clear error for specific field
   * @param {string} fieldName - Field name
   */
  const clearFieldError = useCallback((fieldName) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  /**
   * Clear all field errors
   */
  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  /**
   * Handle form submission with error handling
   * @param {Function} submitHandler - Form submit handler
   * @returns {Function} Enhanced submit handler
   */
  const handleFormSubmit = useCallback((submitHandler) => {
    return async (formData) => {
      try {
        clearAllFieldErrors();
        setFormError(null);
        
        const result = await submitHandler(formData);
        return result;
      } catch (error) {
        // Handle validation errors
        if (error.name === 'ValidationError' && error.details) {
          error.details.forEach(detail => {
            setFieldError(detail.field, detail.message);
          });
        } else {
          const processedError = handleError(error, { formData });
          setFormError(processedError.userMessage);
        }
        throw error;
      }
    };
  }, [handleError, setFieldError, clearAllFieldErrors]);

  /**
   * Validate field with error handling
   * @param {string} fieldName - Field name
   * @param {*} value - Field value
   * @param {Function} validator - Validation function
   * @returns {boolean} Is valid
   */
  const validateField = useCallback((fieldName, value, validator) => {
    try {
      clearFieldError(fieldName);
      const isValid = validator(value);
      return isValid;
    } catch (error) {
      setFieldError(fieldName, error.message);
      return false;
    }
  }, [setFieldError, clearFieldError]);

  return {
    // Field errors
    fieldErrors,
    formError,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
    hasFormError: !!formError,
    
    // Field error methods
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    getFieldError: (fieldName) => fieldErrors[fieldName] || null,
    hasFieldError: (fieldName) => !!fieldErrors[fieldName],
    
    // Form handling
    handleFormSubmit,
    validateField,
    
    // Clear all errors
    clearAllErrors: () => {
      clearAllFieldErrors();
      setFormError(null);
      clearError();
    }
  };
};

/**
 * Hook for handling async operations with loading states
 * @param {string} operationName - Name of the operation
 * @returns {Object} Async operation utilities
 */
export const useAsyncOperation = (operationName = 'operation') => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const { handleError, clearError, error } = useErrorHandler(`async_${operationName}`);

  /**
   * Execute async operation with loading state
   * @param {Function} operation - Async operation
   * @param {Object} options - Operation options
   * @returns {Promise} Operation result
   */
  const execute = useCallback(async (operation, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      clearDataOnStart = true,
      metadata = {} 
    } = options;

    setIsLoading(true);
    if (clearDataOnStart) {
      setData(null);
    }
    clearError();

    try {
      const result = await operation();
      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const processedError = handleError(error, metadata);
      
      if (onError) {
        onError(processedError);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError]);

  /**
   * Reset operation state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setData(null);
    clearError();
  }, [clearError]);

  return {
    // State
    isLoading,
    data,
    error,
    hasError: !!error,
    hasData: !!data,
    
    // Methods
    execute,
    reset,
    
    // Utilities
    isSuccess: !isLoading && !error && data !== null,
    isEmpty: !isLoading && !error && data === null
  };
};

export default useErrorHandler;