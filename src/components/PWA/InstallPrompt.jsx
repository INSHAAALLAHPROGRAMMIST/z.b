// PWA Install Prompt Component
// App o'rnatish uchun prompt

import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { trackButtonClick } = useAnalytics();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt after 30 seconds
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 30000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA installed successfully');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      
      trackButtonClick('pwa_installed', 'install_prompt');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [trackButtonClick]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    trackButtonClick('pwa_install_clicked', 'install_prompt');

    // Show install prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted PWA install');
      trackButtonClick('pwa_install_accepted', 'install_prompt');
    } else {
      console.log('User dismissed PWA install');
      trackButtonClick('pwa_install_dismissed', 'install_prompt');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    trackButtonClick('pwa_prompt_dismissed', 'install_prompt');
    
    // Don't show again for 7 days
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Don't show if recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      
      if (Date.now() - dismissedTime < sevenDays) {
        setShowInstallPrompt(false);
      }
    }
  }, []);

  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">📱</div>
        <div className="install-prompt-text">
          <h3>Zamon Books ilovasini o'rnating</h3>
          <p>Tezroq kirish va offline rejimda ishlash uchun</p>
        </div>
        <div className="install-prompt-actions">
          <button 
            className="install-button"
            onClick={handleInstallClick}
          >
            O'rnatish
          </button>
          <button 
            className="dismiss-button"
            onClick={handleDismiss}
          >
            ✕
          </button>
        </div>
      </div>

      <style jsx>{`
        .pwa-install-prompt {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          z-index: 1000;
          max-width: 400px;
          margin: 0 auto;
        }

        .install-prompt-content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideUp 0.3s ease-out;
        }

        .install-prompt-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .install-prompt-text {
          flex: 1;
        }

        .install-prompt-text h3 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #2c3e50;
        }

        .install-prompt-text p {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
        }

        .install-prompt-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .install-button {
          background: #3498db;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .install-button:hover {
          background: #2980b9;
        }

        .dismiss-button {
          background: transparent;
          border: none;
          color: #999;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s ease;
        }

        .dismiss-button:hover {
          color: #666;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 600px) {
          .pwa-install-prompt {
            left: 10px;
            right: 10px;
            bottom: 10px;
          }
          
          .install-prompt-content {
            padding: 12px;
          }
          
          .install-prompt-text h3 {
            font-size: 0.9rem;
          }
          
          .install-prompt-text p {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default InstallPrompt;