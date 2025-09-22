// Wishlist Button Component
// Ehtiyotkorlik bilan qo'shildi - mavjud kodga ta'sir qilmaydi

import React, { useState } from 'react';
import { useWishlist } from '../hooks/useWishlist';

const WishlistButton = ({ book, className = '', size = 'medium' }) => {
  const { addToWishlist, removeFromWishlist, isInWishlist, loading } = useWishlist();
  const [isAnimating, setIsAnimating] = useState(false);

  const inWishlist = isInWishlist(book.$id);

  const handleClick = async (e) => {
    e.preventDefault(); // Link ichida bo'lsa, navigation'ni to'xtatish
    e.stopPropagation(); // Event bubbling'ni to'xtatish

    if (loading) return;

    setIsAnimating(true);
    
    try {
      let result;
      if (inWishlist) {
        result = await removeFromWishlist(book.$id);
      } else {
        result = await addToWishlist(book);
      }

      // Toast notification (agar mavjud bo'lsa)
      if (window.showToast) {
        window.showToast(result.message, result.success ? 'success' : 'error');
      }

    } catch (error) {
      console.error('Wishlist error:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const sizeClasses = {
    small: 'w-10 h-10 text-lg',
    medium: 'w-12 h-12 text-xl',
    large: 'w-14 h-14 text-2xl'
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        wishlist-button
        ${sizeClasses[size]}
        ${className}
        ${inWishlist ? 'active' : ''}
        ${isAnimating ? 'animating' : ''}
        ${loading ? 'loading' : ''}
      `}
      title={inWishlist ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}
      aria-label={inWishlist ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}
    >
      <i className={`fas fa-heart ${loading ? 'fa-spin fa-spinner' : ''}`}></i>
      
      <style jsx>{`
        .wishlist-button {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          width: 38px;
          height: 38px;
          font-size: 20px;
        }

        .wishlist-button:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #ff6b6b;
          transform: scale(1.2);
          border-color: rgba(255, 107, 107, 0.3);
          box-shadow: 0 6px 16px rgba(255, 107, 107, 0.4);
        }

        .wishlist-button.active {
          background: rgba(255, 107, 107, 0.2);
          color: #ff6b6b;
          border-color: rgba(255, 107, 107, 0.4);
          box-shadow: 0 2px 8px rgba(255, 107, 107, 0.2);
        }

        .wishlist-button.active:hover {
          background: rgba(255, 107, 107, 0.3);
          color: #ff5252;
          box-shadow: 0 6px 16px rgba(255, 82, 82, 0.4);
        }

        .wishlist-button.animating {
          animation: heartBeat 0.3s ease-in-out;
        }

        .wishlist-button.loading {
          pointer-events: none;
          opacity: 0.7;
        }

        .wishlist-button:disabled {
          pointer-events: none;
          opacity: 0.5;
        }

        @keyframes heartBeat {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }

        /* Light mode styles */
        body.light-mode .wishlist-button {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.1);
          color: rgba(0, 0, 0, 0.6);
        }

        body.light-mode .wishlist-button:hover {
          background: rgba(255, 107, 107, 0.1);
          color: #ff6b6b;
          border-color: rgba(255, 107, 107, 0.3);
        }

        body.light-mode .wishlist-button.active {
          background: rgba(255, 107, 107, 0.15);
          color: #ff6b6b;
          border-color: rgba(255, 107, 107, 0.4);
        }

        /* Responsive sizes */
        @media (max-width: 768px) {
          .wishlist-button {
            width: 32px;
            height: 32px;
            font-size: 18px;
          }
        }

        @media (min-width: 1024px) {
          .wishlist-button {
            width: 42px;
            height: 42px;
            font-size: 22px;
          }
        }
      `}</style>
    </button>
  );
};

export default WishlistButton;