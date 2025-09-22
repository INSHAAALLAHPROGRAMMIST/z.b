import React, { Suspense } from 'react';

const LazyLoader = ({ children, fallback = null }) => {
  const defaultFallback = (
    <div className="lazy-loading">
      <div className="lazy-loading-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p className="loading-text">Loading component...</p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

// Enhanced lazy loader with error boundary
export const LazyLoaderWithError = ({ children, fallback = null, onError = null }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      setError(error);
      if (onError) onError(error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  if (hasError) {
    return (
      <div className="lazy-error">
        <div className="lazy-error-content">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load component</h3>
          <p>There was an error loading this section.</p>
          <button 
            onClick={() => {
              setHasError(false);
              setError(null);
              window.location.reload();
            }}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <LazyLoader fallback={fallback}>
      {children}
    </LazyLoader>
  );
};

// Skeleton loader for specific components
export const SkeletonLoader = ({ type = 'default', count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'table':
        return (
          <div className="skeleton-table">
            <div className="skeleton-header">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-cell header"></div>
              ))}
            </div>
            {[...Array(count)].map((_, i) => (
              <div key={i} className="skeleton-row">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="skeleton-cell"></div>
                ))}
              </div>
            ))}
          </div>
        );
      
      case 'card':
        return (
          <div className="skeleton-cards">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-card-header"></div>
                <div className="skeleton-card-content">
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line short"></div>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'chart':
        return (
          <div className="skeleton-chart">
            <div className="skeleton-chart-header"></div>
            <div className="skeleton-chart-content">
              <div className="skeleton-bars">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className="skeleton-bar" 
                    style={{ height: `${Math.random() * 60 + 20}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="skeleton-default">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="skeleton-item">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
                <div className="skeleton-line medium"></div>
              </div>
            ))}
          </div>
        );
    }
  };

  return <div className="skeleton-loader">{renderSkeleton()}</div>;
};

export default LazyLoader;