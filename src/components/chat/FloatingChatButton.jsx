import React, { useState, useEffect } from 'react';
import ChatWidget from './ChatWidget';
import { useChatContext } from '../../contexts/ChatContext';

const FloatingChatButton = ({ 
  position = 'bottom-right',
  customerInfo = null,
  orderInfo = null,
  theme = 'default',
  showWelcomeMessage = true,
  autoOpen = false,
  minimized = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  const { 
    unreadCount, 
    connectionStatus, 
    isInitialized,
    hasUnreadMessages 
  } = useChatContext();

  // Auto-open chat if specified
  useEffect(() => {
    if (autoOpen && isInitialized && !hasInteracted) {
      setTimeout(() => {
        setIsOpen(true);
        setHasInteracted(true);
      }, 2000); // Delay to avoid being intrusive
    }
  }, [autoOpen, isInitialized, hasInteracted]);

  // Show welcome message after some time if user hasn't interacted
  useEffect(() => {
    if (showWelcomeMessage && !hasInteracted && !isOpen) {
      const timer = setTimeout(() => {
        setShowWelcome(true);
      }, 10000); // Show after 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [showWelcomeMessage, hasInteracted, isOpen]);

  // Hide welcome message when user interacts
  useEffect(() => {
    if (hasInteracted) {
      setShowWelcome(false);
    }
  }, [hasInteracted]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setHasInteracted(true);
    setShowWelcome(false);
  };

  const handleWelcomeClick = () => {
    setIsOpen(true);
    setHasInteracted(true);
    setShowWelcome(false);
  };

  const getPositionClasses = () => {
    const baseClasses = 'floating-chat-container';
    
    switch (position) {
      case 'bottom-left':
        return `${baseClasses} bottom-left`;
      case 'bottom-right':
        return `${baseClasses} bottom-right`;
      case 'top-left':
        return `${baseClasses} top-left`;
      case 'top-right':
        return `${baseClasses} top-right`;
      default:
        return `${baseClasses} bottom-right`;
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚫';
    }
  };

  if (minimized) {
    return null;
  }

  return (
    <div className={getPositionClasses()}>
      {/* Welcome Message Bubble */}
      {showWelcome && !isOpen && (
        <div className="welcome-bubble" onClick={handleWelcomeClick}>
          <div className="welcome-content">
            <div className="welcome-text">
              👋 Hi! Need help? Click here to chat with us!
            </div>
            <button 
              className="welcome-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowWelcome(false);
              }}
            >
              ×
            </button>
          </div>
          <div className="welcome-arrow"></div>
        </div>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <ChatWidget
          isOpen={isOpen}
          onToggle={handleToggle}
          customerInfo={customerInfo}
          orderInfo={orderInfo}
          position={position}
        />
      )}

      {/* Floating Button */}
      {!isOpen && (
        <div className={`floating-chat-button ${theme}`} onClick={handleToggle}>
          <div className="button-content">
            <div className="chat-icon">
              💬
            </div>
            
            {/* Unread Count Badge */}
            {hasUnreadMessages && (
              <div className="unread-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
            
            {/* Connection Status Indicator */}
            <div className="connection-indicator" title={`Status: ${connectionStatus}`}>
              {getConnectionStatusIcon()}
            </div>
            
            {/* Pulse Animation for New Messages */}
            {hasUnreadMessages && (
              <div className="pulse-ring"></div>
            )}
          </div>
          
          {/* Tooltip */}
          <div className="button-tooltip">
            {hasUnreadMessages 
              ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}`
              : 'Chat with support'
            }
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .floating-chat-container {
          position: fixed;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .floating-chat-container.bottom-right {
          bottom: 20px;
          right: 20px;
        }
        
        .floating-chat-container.bottom-left {
          bottom: 20px;
          left: 20px;
        }
        
        .floating-chat-container.top-right {
          top: 20px;
          right: 20px;
        }
        
        .floating-chat-container.top-left {
          top: 20px;
          left: 20px;
        }
        
        .floating-chat-button {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .floating-chat-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
        }
        
        .floating-chat-button.default {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .floating-chat-button.blue {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .floating-chat-button.green {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
        
        .floating-chat-button.orange {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }
        
        .button-content {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .chat-icon {
          font-size: 24px;
          color: white;
        }
        
        .unread-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ff4757;
          color: white;
          border-radius: 12px;
          min-width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          border: 2px solid white;
        }
        
        .connection-indicator {
          position: absolute;
          bottom: -2px;
          right: -2px;
          font-size: 12px;
          background: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid #ff4757;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
        
        .button-tooltip {
          position: absolute;
          bottom: 70px;
          right: 0;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          pointer-events: none;
        }
        
        .floating-chat-button:hover .button-tooltip {
          opacity: 1;
          visibility: visible;
        }
        
        .button-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          right: 20px;
          border: 5px solid transparent;
          border-top-color: rgba(0, 0, 0, 0.8);
        }
        
        .welcome-bubble {
          position: absolute;
          bottom: 70px;
          right: 0;
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          max-width: 250px;
          cursor: pointer;
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .welcome-content {
          position: relative;
        }
        
        .welcome-text {
          color: #333;
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        
        .welcome-close {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #f1f1f1;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          color: #666;
        }
        
        .welcome-close:hover {
          background: #e1e1e1;
        }
        
        .welcome-arrow {
          position: absolute;
          top: 100%;
          right: 30px;
          border: 8px solid transparent;
          border-top-color: white;
        }
        
        @media (max-width: 768px) {
          .floating-chat-container.bottom-right {
            bottom: 15px;
            right: 15px;
          }
          
          .floating-chat-container.bottom-left {
            bottom: 15px;
            left: 15px;
          }
          
          .floating-chat-button {
            width: 55px;
            height: 55px;
          }
          
          .chat-icon {
            font-size: 22px;
          }
          
          .welcome-bubble {
            max-width: 200px;
            padding: 12px;
          }
          
          .welcome-text {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingChatButton;