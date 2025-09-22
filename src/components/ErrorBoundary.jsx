import React from 'react';
import errorHandlingService from '../services/ErrorHandlingService';
import './ErrorBoundary.css';

/**
 * React Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    let processedError;
    
    try {
      // Handle the error using our error handling service
      processedError = errorHandlingService.handleError(
        error,
        this.props.context || 'react_component',
        {
          componentStack: errorInfo.componentStack,
          errorBoundary: this.constructor.name,
          props: this.props.errorMetadata || {}
        }
      );
    } catch (handlingError) {
      // Fallback if error handling service fails
      console.error('Error in error handling service:', handlingError);
      processedError = {
        id: `fallback_${Date.now()}`,
        userMessage: 'Kutilmagan xatolik yuz berdi'
      };
    }

    this.setState({
      error,
      errorInfo,
      errorId: processedError.id
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo, processedError);
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError);
      }
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReportError = () => {
    if (this.state.errorId) {
      // In a real app, this could open a support ticket or feedback form
      const errorDetails = {
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      console.log('Error reported:', errorDetails);
      
      // Show success message
      alert('Xatolik haqida ma\'lumot yuborildi. Tez orada hal qilinadi.');
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry
        );
      }

      // Default fallback UI
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 22h20L12 2zm0 15h-2v-2h2v2zm0-4h-2V9h2v4z"
                  fill="currentColor"
                />
              </svg>
            </div>
            
            <h2 className="error-boundary__title">
              Kutilmagan xatolik yuz berdi
            </h2>
            
            <p className="error-boundary__message">
              Sahifani yuklashda muammo yuz berdi. Iltimos, qayta urinib ko'ring.
            </p>

            {this.state.errorId && (
              <p className="error-boundary__error-id">
                Xatolik ID: {this.state.errorId}
              </p>
            )}

            <div className="error-boundary__actions">
              <button
                type="button"
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleRetry}
              >
                Qayta urinish
              </button>
              
              <button
                type="button"
                className="error-boundary__button error-boundary__button--secondary"
                onClick={() => window.location.reload()}
              >
                Sahifani yangilash
              </button>
              
              <button
                type="button"
                className="error-boundary__button error-boundary__button--tertiary"
                onClick={this.handleReportError}
              >
                Xatolik haqida xabar berish
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary__details">
                <summary>Texnik ma'lumotlar (faqat development)</summary>
                <pre className="error-boundary__stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook for handling errors in functional components
 */
export const useErrorHandler = (context = 'component') => {
  const handleError = React.useCallback((error, metadata = {}) => {
    return errorHandlingService.handleError(error, context, metadata);
  }, [context]);

  const retryOperation = React.useCallback((operation, options = {}) => {
    return errorHandlingService.retryOperation(operation, options);
  }, []);

  return { handleError, retryOperation };
};

export default ErrorBoundary;