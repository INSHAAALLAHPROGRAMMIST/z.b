// Enhanced Image Protection System with Memory Management
class ImageProtection {
    constructor() {
        this.isEnabled = false;
        this.eventListeners = []; // Track all event listeners for cleanup
        this.protectionMessage = "Bu rasm himoyalangan!";
    }

    // Initialize protection with cleanup tracking
    init() {
        if (this.isEnabled) return;
        
        this.disableRightClick();
        this.disableKeyboardShortcuts();
        this.disableDragAndDrop();
        this.disableImageSaving();
        this.disableDevTools();
        this.isEnabled = true;
    }

    // Cleanup all event listeners
    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        this.isEnabled = false;
    }

    // Helper to add tracked event listeners
    addTrackedEventListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler });
    }

    // Disable right-click context menu
    disableRightClick() {
        const contextMenuHandler = (e) => {
            // Allow right-click on text inputs and textareas
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return true;
            }
            
            // Check if target is within an image container
            if (e.target.tagName === 'IMG' || 
                e.target.closest('.responsive-image-container') ||
                e.target.closest('.book-image') ||
                e.target.closest('.admin-book-image')) {
                e.preventDefault();
                this.showProtectionMessage();
                return false;
            }
        };
        
        this.addTrackedEventListener(document, 'contextmenu', contextMenuHandler);
    }

    // Disable keyboard shortcuts
    disableKeyboardShortcuts() {
        const keydownHandler = (e) => {
            // Disable F12 (Developer Tools)
            if (e.key === 'F12') {
                e.preventDefault();
                this.showProtectionMessage();
                return false;
            }

            // Disable Ctrl+Shift+I (Developer Tools)
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                this.showProtectionMessage();
                return false;
            }

            // Disable Ctrl+Shift+J (Console)
            if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                e.preventDefault();
                this.showProtectionMessage();
                return false;
            }

            // Disable Ctrl+U (View Source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                this.showProtectionMessage();
                return false;
            }

            // Disable Ctrl+S (Save Page)
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.showProtectionMessage();
                return false;
            }

            // Disable Ctrl+A (Select All) on image containers
            if (e.ctrlKey && e.key === 'a' && 
                (e.target.closest('.responsive-image-container') || 
                 e.target.closest('.book-image'))) {
                e.preventDefault();
                return false;
            }

            // Disable Ctrl+C (Copy) on images
            if (e.ctrlKey && e.key === 'c' && e.target.tagName === 'IMG') {
                e.preventDefault();
                this.showProtectionMessage();
                return false;
            }
        };

        this.addTrackedEventListener(document, 'keydown', keydownHandler);
    }

    // Disable drag and drop
    disableDragAndDrop() {
        const dragStartHandler = (e) => {
            if (e.target.tagName === 'IMG' || 
                e.target.closest('.responsive-image-container') ||
                e.target.closest('.book-image')) {
                e.preventDefault();
                return false;
            }
        };

        const dropHandler = (e) => {
            e.preventDefault();
            return false;
        };

        const dragOverHandler = (e) => {
            e.preventDefault();
            return false;
        };

        this.addTrackedEventListener(document, 'dragstart', dragStartHandler);
        this.addTrackedEventListener(document, 'drop', dropHandler);
        this.addTrackedEventListener(document, 'dragover', dragOverHandler);
    }

    // Disable image saving
    disableImageSaving() {
        const selectStartHandler = (e) => {
            if (e.target.tagName === 'IMG' || 
                e.target.closest('.responsive-image-container') ||
                e.target.closest('.book-image')) {
                e.preventDefault();
                return false;
            }
        };

        const mouseDownHandler = (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
                return false;
            }
        };

        this.addTrackedEventListener(document, 'selectstart', selectStartHandler);
        this.addTrackedEventListener(document, 'mousedown', mouseDownHandler);
    }

    // Disable developer tools (basic protection)
    disableDevTools() {
        // Disable console functions in production
        if (!import.meta.env.DEV) {
            const noop = () => {};
            window.console.log = noop;
            window.console.warn = noop;
            window.console.info = noop;
            window.console.debug = noop;
        }
    }

    // Show protection message
    showProtectionMessage() {
        // Create toast-like notification
        const toast = document.createElement('div');
        toast.textContent = this.protectionMessage;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
                style.remove();
            }
        }, 3000);
    }

    // Apply protection to specific image
    protectImage(img) {
        if (!img || img.tagName !== 'IMG') return;

        // Set image attributes
        img.draggable = false;
        img.style.userSelect = 'none';
        img.style.webkitUserSelect = 'none';
        img.style.mozUserSelect = 'none';
        img.style.msUserSelect = 'none';
        img.style.pointerEvents = 'none';

        // Add event listeners with cleanup tracking
        const contextMenuHandler = (e) => {
            e.preventDefault();
            this.showProtectionMessage();
        };

        const dragStartHandler = (e) => {
            e.preventDefault();
            return false;
        };

        const selectStartHandler = (e) => {
            e.preventDefault();
            return false;
        };

        this.addTrackedEventListener(img, 'contextmenu', contextMenuHandler);
        this.addTrackedEventListener(img, 'dragstart', dragStartHandler);
        this.addTrackedEventListener(img, 'selectstart', selectStartHandler);
    }
}

// Create singleton instance
const imageProtection = new ImageProtection();

// Initialize function for manual control
export const initImageProtection = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => imageProtection.init());
    } else {
        imageProtection.init();
    }
};

// Auto-initialize when DOM is ready (only in production)
if (import.meta.env.PROD) {
    initImageProtection();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    imageProtection.destroy();
});

export default imageProtection;