// PWA Update Prompt
// Shows when app update is available

import React from 'react';
import { usePWA } from '../../hooks/usePWA';
import { useAnalytics } from '../../hooks/useAnalytics';

const UpdatePrompt = () => {
  const { updateAvailable, updateApp } = usePWA();
  const { trackButtonClick } = useAnalytics();

  const handleUpdate = () => {
    trackButtonClick('pwa_update_accepted', 'update_prompt');
    updateApp();
  };

  const handleDismiss = () => {
    trackButtonClick('pwa_update_dismissed', 'update_prompt');
    // Hide update prompt (you can add state management here)
  };

  if (!updateAvailable) return null;

  return (
    <div className="update-prompt">
      <div className="update-content">
        <div className="update-icon">🔄</div>
        <div className="update-text">
          <h3>Yangilanish mavjud</h3>
          <p>Zamon Books ilovasining yangi versiyasi tayyor</p>
        </div>
        <div className="update-actions">
          <button 
            className="update-button"
            onClick={handleUpdate}
          >
            Yangilash
          </button>
          <button 
            className="dismiss-button"
            onClick={handleDismiss}
          >
            Keyinroq
          </button>
        </div>
      </div>

      <style jsx>{`
        .update-prompt {
          position: fixed;
          top: 20px;
          left: 20px;
          right: 20px;
          z-index: 1000;
          max-width: 400px;
          margin: 0 auto;
        }

        .update-content {
          background: rgba(52, 152, 219, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 16px;
          color: white;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease-out;
        }

        .update-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .update-text {
          flex: 1;
        }

        .update-text h3 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .update-text p {
          margin: 0;
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .update-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .update-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .update-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .dismiss-button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dismiss-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 600px) {
          .update-prompt {
            left: 10px;
            right: 10px;
            top: 10px;
          }
          
          .update-content {
            padding: 12px;
          }
          
          .update-text h3 {
            font-size: 0.9rem;
          }
          
          .update-text p {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default UpdatePrompt;