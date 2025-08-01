import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Log to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }

        // In production, you might want to log to an error reporting service
        // logErrorToService(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null 
        });
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="error-boundary-container" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '1rem',
                    margin: '2rem'
                }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: '1rem',
                        color: '#ff6b6b'
                    }}>
                        ⚠️
                    </div>
                    
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                        color: 'var(--text-color)'
                    }}>
                        Nimadir noto'g'ri ketdi
                    </h2>
                    
                    <p style={{
                        fontSize: '1rem',
                        marginBottom: '2rem',
                        color: 'var(--text-color)',
                        opacity: 0.8,
                        maxWidth: '500px'
                    }}>
                        Kechirasiz, sahifani yuklashda xatolik yuz berdi. 
                        Sahifani yangilashga harakat qiling yoki keyinroq qayta urinib ko'ring.
                    </p>

                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <button
                            onClick={this.handleRetry}
                            style={{
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                fontWeight: '600',
                                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <i className="fas fa-redo" style={{ marginRight: '0.5rem' }}></i>
                            Qayta urinish
                        </button>

                        <button
                            onClick={() => window.location.href = '/'}
                            style={{
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                fontWeight: '600',
                                background: 'transparent',
                                color: 'var(--text-color)',
                                border: '2px solid var(--primary-color)',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'var(--primary-color)';
                                e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.color = 'var(--text-color)';
                            }}
                        >
                            <i className="fas fa-home" style={{ marginRight: '0.5rem' }}></i>
                            Bosh sahifa
                        </button>
                    </div>

                    {/* Error details in development */}
                    {import.meta.env.DEV && this.state.error && (
                        <details style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            background: 'rgba(255, 0, 0, 0.1)',
                            border: '1px solid rgba(255, 0, 0, 0.3)',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            textAlign: 'left',
                            maxWidth: '100%',
                            overflow: 'auto'
                        }}>
                            <summary style={{ 
                                cursor: 'pointer', 
                                fontWeight: '600',
                                marginBottom: '0.5rem'
                            }}>
                                Xato tafsilotlari (Development)
                            </summary>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                fontSize: '0.75rem',
                                margin: 0
                            }}>
                                {this.state.error.toString()}
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;