// Offline status indicator
// Shows when user is offline

import React from 'react';
import { usePWA } from '../../hooks/usePWA';

const OfflineIndicator = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      <div className="offline-content">
        <span className="offline-icon">📡</span>
        <span className="offline-text">Offline rejim</span>
      </div>

      <style jsx>{`
        .offline-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(90deg, #e74c3c, #c0392b);
          color: white;
          z-index: 9999;
          padding: 8px 0;
          text-align: center;
          font-size: 0.875rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          animation: slideDown 0.3s ease-out;
        }

        .offline-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .offline-icon {
          font-size: 1rem;
        }

        .offline-text {
          font-weight: 500;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @media (max-width: 600px) {
          .offline-indicator {
            font-size: 0.8rem;
            padding: 6px 0;
          }
        }
      `}</style>
    </div>
  );
};

export default OfflineIndicator;