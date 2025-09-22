import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useEnhancedCart from '../hooks/useEnhancedCart';
import useFirebaseAuth from '../hooks/useFirebaseAuth';
import ResponsiveImage from './ResponsiveImage';
import { formatPrice } from '../utils/firebaseHelpers';
import { toastMessages } from '../utils/toastUtils';
import firebaseService from '../services/FirebaseService';

import '../index.css';
import '../styles/responsive-images.css';

function WishlistPage() {
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'price-low', 'price-high', 'name'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'available', 'unavailable'
  const navigate = useNavigate();

  const {
    wishlistItems,
    loading: wishlistLoading,
    error,
    isOnline,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    wishlistTotal
  } = useEnhancedCart();

  const { user, isAuthenticated } = useFirebaseAuth();

  // Sort and filter wishlist items
  const processedWishlistItems = useMemo(() => {
    let items = [...wishlistItems];

    // Filter items
    if (filterBy === 'available') {
      items = items.filter(item => item.bookData?.isAvailable);
    } else if (filterBy === 'unavailable') {
      items = items.filter(item => !item.bookData?.isAvailable);
    }

    // Sort items
    switch (sortBy) {
      case 'oldest':
        items.sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
        break;
      case 'price-low':
        items.sort((a, b) => (a.bookData?.price || 0) - (b.bookData?.price || 0));
        break;
      case 'price-high':
        items.sort((a, b) => (b.bookData?.price || 0) - (a.bookData?.price || 0));
        break;
      case 'name':
        items.sort((a, b) => (a.bookData?.title || '').localeCompare(b.bookData?.title || ''));
        break;
      case 'newest':
      default:
        items.sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt));
        break;
    }

    return items;
  }, [wishlistItems, sortBy, filterBy]);

  // Handle item selection
  const handleItemSelect = useCallback((itemId) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === processedWishlistItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(processedWishlistItems.map(item => item.id)));
    }
  }, [selectedItems.size, processedWishlistItems]);

  // Handle remove from wishlist
  const handleRemoveFromWishlist = useCallback(async (bookId) => {
    try {
      await removeFromWishlist(bookId);
    } catch (err) {
      console.error('Error removing from wishlist:', err);
    }
  }, [removeFromWishlist]);

  // Handle bulk remove
  const handleBulkRemove = useCallback(async () => {
    if (selectedItems.size === 0) {
      toastMessages.error('Hech qanday element tanlanmagan');
      return;
    }

    try {
      setLoading(true);
      
      const selectedWishlistItems = processedWishlistItems.filter(item => selectedItems.has(item.id));
      
      for (const item of selectedWishlistItems) {
        await removeFromWishlist(item.bookId);
      }

      setSelectedItems(new Set());
      toastMessages.success(`${selectedWishlistItems.length} ta kitob sevimlilardan o'chirildi`);
    } catch (err) {
      console.error('Error bulk removing from wishlist:', err);
      toastMessages.error('Sevimlilardan o\'chirishda xato yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [selectedItems, processedWishlistItems, removeFromWishlist]);

  // Handle add to cart
  const handleAddToCart = useCallback(async (bookId, quantity = 1) => {
    if (!isAuthenticated) {
      toastMessages.loginRequired();
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);
      await firebaseService.addToCart(user.uid, bookId, quantity);
      toastMessages.success('Kitob savatga qo\'shildi');
    } catch (err) {
      console.error('Error adding to cart:', err);
      toastMessages.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, navigate]);

  // Handle bulk add to cart
  const handleBulkAddToCart = useCallback(async () => {
    if (selectedItems.size === 0) {
      toastMessages.error('Hech qanday element tanlanmagan');
      return;
    }

    if (!isAuthenticated) {
      toastMessages.loginRequired();
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);
      
      const selectedWishlistItems = processedWishlistItems.filter(item => 
        selectedItems.has(item.id) && item.bookData?.isAvailable
      );

      for (const item of selectedWishlistItems) {
        await firebaseService.addToCart(user.uid, item.bookId, 1);
      }

      setSelectedItems(new Set());
      toastMessages.success(`${selectedWishlistItems.length} ta kitob savatga qo'shildi`);
    } catch (err) {
      console.error('Error bulk adding to cart:', err);
      toastMessages.error('Savatga qo\'shishda xato yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [selectedItems, processedWishlistItems, isAuthenticated, user, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: '50px', textAlign: 'center' }}>
        <div className="glassmorphism-card" style={{ padding: '30px', maxWidth: '500px', margin: '0 auto' }}>
          <i className="fas fa-heart" style={{ fontSize: '3rem', marginBottom: '20px', opacity: '0.5' }}></i>
          <h2>Sevimlilar ro'yxati</h2>
          <p style={{ marginBottom: '20px' }}>
            Sevimlilar ro'yxatini ko'rish uchun tizimga kiring
          </p>
          <Link to="/auth" className="glassmorphism-button">
            <i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }}></i>
            Kirish
          </Link>
        </div>
      </div>
    );
  }

  if (wishlistLoading) {
    return (
      <div className="container" style={{ padding: '50px', textAlign: 'center' }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(106, 138, 255, 0.2)',
          borderTop: '3px solid var(--primary-color)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        Sevimlilar yuklanmoqda...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '50px', textAlign: 'center' }}>
        <div style={{ color: 'var(--error-color)', marginBottom: '20px' }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '10px' }}></i>
          Xato: {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="glassmorphism-button"
        >
          <i className="fas fa-redo" style={{ marginRight: '8px' }}></i>
          Qayta yuklash
        </button>
      </div>
    );
  }

  return (
    <main className="wishlist-page container" style={{ marginTop: '5px' }}>
      {/* Header */}
      <div className="wishlist-header" style={{ marginBottom: '20px' }}>
        <h1 className="section-title">
          <i className="fas fa-heart" style={{ marginRight: '10px', color: 'var(--accent-color)' }}></i>
          Sevimlilar ro'yxati
        </h1>

        {/* Connection status */}
        {!isOnline && (
          <div className="offline-indicator" style={{
            backgroundColor: 'rgba(255, 193, 7, 0.2)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            <i className="fas fa-wifi" style={{ marginRight: '8px' }}></i>
            Offline rejimda ishlayapti
          </div>
        )}

        {/* Stats */}
        {wishlistItems.length > 0 && (
          <div className="wishlist-stats glassmorphism-card" style={{
            padding: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div className="stat-item">
              <span className="stat-label">Jami kitoblar:</span>
              <span className="stat-value">{wishlistItems.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Mavjud:</span>
              <span className="stat-value">
                {wishlistItems.filter(item => item.bookData?.isAvailable).length}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Umumiy qiymat:</span>
              <span className="stat-value">{formatPrice(wishlistTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {wishlistItems.length === 0 ? (
        <div className="empty-wishlist glassmorphism-card" style={{
          textAlign: 'center',
          padding: '30px 20px',
          margin: '20px auto',
          maxWidth: '500px'
        }}>
          <i className="fas fa-heart" style={{
            fontSize: '3rem',
            marginBottom: '20px',
            opacity: '0.5'
          }}></i>
          <p style={{ marginBottom: '20px' }}>Sevimlilar ro'yxatingiz bo'sh.</p>
          <Link to="/" className="glassmorphism-button">
            <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
            Kitoblarni ko'rish
          </Link>
        </div>
      ) : (
        <div className="wishlist-content">
          {/* Controls */}
          <div className="wishlist-controls glassmorphism-card" style={{
            padding: '15px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            {/* Selection controls */}
            <div className="selection-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedItems.size === processedWishlistItems.length && processedWishlistItems.length > 0}
                  onChange={handleSelectAll}
                  style={{ marginRight: '8px' }}
                />
                Barchasini tanlash ({selectedItems.size})
              </label>

              {selectedItems.size > 0 && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleBulkAddToCart}
                    disabled={loading}
                    className="glassmorphism-button"
                    style={{ padding: '8px 15px', fontSize: '0.9rem' }}
                  >
                    <i className="fas fa-shopping-cart" style={{ marginRight: '5px' }}></i>
                    Savatga qo'shish
                  </button>
                  <button
                    onClick={handleBulkRemove}
                    disabled={loading}
                    className="glassmorphism-button"
                    style={{ 
                      padding: '8px 15px', 
                      fontSize: '0.9rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <i className="fas fa-trash" style={{ marginRight: '5px' }}></i>
                    O'chirish
                  </button>
                </div>
              )}
            </div>

            {/* Sort and filter controls */}
            <div className="sort-filter-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="glassmorphism-input"
                style={{ padding: '8px', minWidth: '120px' }}
              >
                <option value="newest">Eng yangi</option>
                <option value="oldest">Eng eski</option>
                <option value="name">Nom bo'yicha</option>
                <option value="price-low">Arzon narx</option>
                <option value="price-high">Qimmat narx</option>
              </select>

              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="glassmorphism-input"
                style={{ padding: '8px', minWidth: '120px' }}
              >
                <option value="all">Barchasi</option>
                <option value="available">Mavjud</option>
                <option value="unavailable">Mavjud emas</option>
              </select>
            </div>
          </div>

          {/* Wishlist items */}
          <div className="wishlist-items" style={{ display: 'grid', gap: '15px' }}>
            {processedWishlistItems.map((item) => (
              <div
                key={item.id}
                className="wishlist-item glassmorphism-card"
                style={{
                  padding: '15px',
                  display: 'flex',
                  gap: '15px',
                  alignItems: 'center'
                }}
              >
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleItemSelect(item.id)}
                  style={{ flexShrink: 0 }}
                />

                {/* Book image */}
                <div className="book-image" style={{ flexShrink: 0, width: '80px', height: '100px' }}>
                  <ResponsiveImage
                    src={item.bookData?.images?.main || item.bookData?.imageUrl}
                    alt={item.bookData?.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                </div>

                {/* Book details */}
                <div className="book-details" style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '1.1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <Link 
                      to={`/book/${item.bookId}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {item.bookData?.title || 'Noma\'lum kitob'}
                    </Link>
                  </h3>
                  
                  <p style={{ 
                    margin: '0 0 8px 0', 
                    opacity: '0.8',
                    fontSize: '0.9rem'
                  }}>
                    {item.bookData?.authorName || 'Noma\'lum muallif'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <span className="price" style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 'bold',
                      color: 'var(--primary-color)'
                    }}>
                      {formatPrice(item.bookData?.price || 0)}
                    </span>

                    <span className={`availability ${item.bookData?.isAvailable ? 'available' : 'unavailable'}`} style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      backgroundColor: item.bookData?.isAvailable ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: item.bookData?.isAvailable ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
                    }}>
                      {item.bookData?.isAvailable ? 'Mavjud' : 'Mavjud emas'}
                    </span>

                    <span style={{ fontSize: '0.8rem', opacity: '0.6' }}>
                      {item.createdAt?.toDate?.()?.toLocaleDateString('uz-UZ') || 
                       new Date(item.createdAt).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="item-actions" style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  flexShrink: 0
                }}>
                  {item.bookData?.isAvailable && (
                    <button
                      onClick={() => handleAddToCart(item.bookId)}
                      disabled={loading}
                      className="glassmorphism-button"
                      style={{ padding: '8px 15px', fontSize: '0.9rem' }}
                    >
                      <i className="fas fa-shopping-cart" style={{ marginRight: '5px' }}></i>
                      Savatga
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleRemoveFromWishlist(item.bookId)}
                    disabled={loading}
                    className="glassmorphism-button"
                    style={{ 
                      padding: '8px 15px', 
                      fontSize: '0.9rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <i className="fas fa-heart-broken" style={{ marginRight: '5px' }}></i>
                    O'chirish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default WishlistPage;