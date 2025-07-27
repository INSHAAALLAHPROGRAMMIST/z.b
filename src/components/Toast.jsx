import React, { useState, useEffect } from 'react';

// Toast types
export const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Toast context for global state
let toastQueue = [];
let toastListeners = [];

// Toast manager functions
export const showToast = (message, type = TOAST_TYPES.INFO, duration = 3000) => {
    const toast = {
        id: Date.now() + Math.random(),
        message,
        type,
        duration,
        timestamp: Date.now()
    };
    
    toastQueue.push(toast);
    toastListeners.forEach(listener => listener([...toastQueue]));
    
    // Auto remove after duration
    setTimeout(() => {
        removeToast(toast.id);
    }, duration);
    
    return toast.id;
};

export const removeToast = (id) => {
    toastQueue = toastQueue.filter(toast => toast.id !== id);
    toastListeners.forEach(listener => listener([...toastQueue]));
};

// Toast Container Component
export const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const listener = (newToasts) => {
            setToasts(newToasts);
        };
        
        toastListeners.push(listener);
        
        return () => {
            toastListeners = toastListeners.filter(l => l !== listener);
        };
    }, []);

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast 
                    key={toast.id} 
                    toast={toast} 
                    onRemove={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};

// Individual Toast Component
const Toast = ({ toast, onRemove }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        // Show animation
        const showTimer = setTimeout(() => setIsVisible(true), 10);
        
        // Hide animation before removal
        const hideTimer = setTimeout(() => {
            setIsRemoving(true);
            setTimeout(onRemove, 300); // Wait for animation
        }, toast.duration - 300);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
        };
    }, [toast.duration, onRemove]);

    const getToastIcon = () => {
        switch (toast.type) {
            case TOAST_TYPES.SUCCESS:
                return '✅';
            case TOAST_TYPES.ERROR:
                return '❌';
            case TOAST_TYPES.WARNING:
                return '⚠️';
            default:
                return 'ℹ️';
        }
    };

    const getToastClass = () => {
        let baseClass = 'toast-item';
        baseClass += ` toast-${toast.type}`;
        if (isVisible && !isRemoving) baseClass += ' toast-visible';
        if (isRemoving) baseClass += ' toast-removing';
        return baseClass;
    };

    return (
        <div className={getToastClass()}>
            <div className="toast-content">
                <span className="toast-icon">{getToastIcon()}</span>
                <span className="toast-message">{toast.message}</span>
            </div>
        </div>
    );
};

export default ToastContainer;