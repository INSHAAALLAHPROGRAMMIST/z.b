import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import useFirebaseAuth from '../hooks/useFirebaseAuth';
import ResponsiveImage from './ResponsiveImage';
import { formatPrice } from '../utils/firebaseHelpers';
import { toastMessages } from '../utils/toastUtils';
import firebaseService from '../services/FirebaseService';

import '../index.css';
import '../styles/responsive-images.css';

function SharedCartPage() {
  const { shareId } = useParams();
  const [sharedCart, setSharedCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const navigate = useNavigate();

  const { user, isAuthenticated } = useFirebaseAuth();

  // Load shared cart data
  useEffect(() => {
    const loadSharedCart = async () => {
      try {
        setLoading(true);
        setError(null);

        const docRef = doc(db, 'shared_carts', shareId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError('Ulashilgan savat topilmadi yoki muddati tugagan');
          return;
        }

        const cartData = docSnap.data();
        
        // Check if expired
        const expiresAt = cartData.expiresAt?.toDate?.() || new Date(cartData.expiresAt);
        if (expiresAt < new Date()) {
          setError('Ulashilgan savatning muddati tugagan');
          return;
        }

        // Load book details for each item
        const itemsWithBookData = await Promise.all(
          cartData.items.map(async (item) => {
            try {
              const book = await firebaseService.getBookById(item.bookId);
              return {
                ...item,
                bookData: book
              };
            } catch (err) {
              console.error(`Error loading book ${item.bookId}:`, err);
              return {
                ...item,
                bookData: null
              };
            }
          })
        );

        setSharedCart({
          ...cartData,
          items: itemsWithBookData,
          id: shareId
        });

        // Auto-select all available items
        const availableItemIds = itemsWithBookData
          .filter(item => item.bookData?.isAvailable)
          .map((_, index) => index);
        setSelectedItems(new Set(availableItemIds));

      } catch (err) {
        console.error('Error loading shared cart:', err);
        setError('Ulashilgan savatni yuklashda xato yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      loadSharedCart();
    }
  }, [shareId]);

  // Handle item selection
  const handleItemSelect = useCallback((index) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return newSelected;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const availableItems = sharedCart.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.bookData?.isAvailable);

    if (selectedItems.size === availableItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(availableItems.map(({ index }) => index)));
    }
  }, [sharedCart, selectedItems.size]);

  // Handle add selected items to cart
  const handleAddSelectedToCart = useCallback(async () => {
    if (!isAuthenticated) {
      toastMessages.loginRequired();
      navigate('/auth');
      return;
    }

    if (selectedItems.size === 0) {
      toastMessages.error('Hech qanday element tanlanmagan');
      return;
    }

    try {
      setAddingToCart(true);

      const selectedCartItems = Array.from(selectedItems)
        .map(index => sharedCart.items[index])
        .filter(item => item.bookData?.isAvailable);

      for (const item of selectedCartItems) {
        await firebaseService.addToCart(user.uid, item.bookId, item.quantity);
      }

      toastMessages.success(`${selectedCartItems.length} ta kitob savatga qo'shildi`);
      navigate('/cart');

    } catch (err) {
      console.error('Error adding items to cart:', err);
      toastMessages.error('Savatga qo\'shishda xato yuz berdi');
    } finally {
      setAddingToCart(false);
    }
  }, [isAuthenticated, selectedItems, sharedCart, user, navigate]);

  // Handle add single item to cart
  const handleAddItemToCart = useCallback(async (item) => {
    if (!isAuthenticated) {
      toastMessages.loginRequired();
      navigate('/auth');
      return;
    }

    try {
      await firebaseService.addToCart(user.uid, item.bookId, item.quantity);
      toastMessages.success('Kitob savatga qo\'shildi');
    } catch (err) {
      console.error('Error adding item to cart:', err);
      toastMessages.error(err.message);
    }
  }, [isAuthenticated, user, navigate]);

  if (loading) {
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
        Ulashilgan savat yuklanmoqda...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '50px', textAlign: 'center' }}>
        <div className="glassmorphism-card" style={{ padding: '30px', maxWidth: '500px', margin: '0 auto' }}>
          <i className="fas fa-exclamation-triangle" style={{
            fontSize: '3rem',
            marginBottom: '20px',
            color: 'var(--error-color)',
            opacity: '0.7'
          }}></i>
          <h2 style={{ marginBottom: '15px' }}>Xato</h2>
          <p style={{ marginBottom: '20px', opacity: '0.8' }}>{error}</p>
          <Link to="/" className="glassmorphism-button">
            <i className="fas fa-home" style={{ marginRight: '8px' }}></i>
            Bosh sahifa
          </Link>
        </div>
      </div>
    );
  }

  if (!sharedCart) {
    return null;
  }

  const availableItems = sharedCart.items.filter(item => item.bookData?.isAvailable);
  const totalValue = sharedCart.items.reduce((total, item) => {
    const price = item.bookData?.price || 0;
    return total + (price * item.quantity);
  }, 0);

  const selectedTotal = Array.from(selectedItems)
    .map(index => sharedCart.items[index])
    .filter(item => item.bookData?.isAvailable)
    .reduce((total, item) => {
      const price = item.bookData?.price || 0;
      return total + (price * item.quantity);
    }, 0);

  return (
    <main className="shared-cart-page container" style={{ marginTop: '5px' }}>
      {/* Header */}
      <div className="shared-cart-header" style={{ marginBottom: '20px' }}>
        <h1 className="section-title">
          <i className="fas fa-share" style={{ marginRight: '10px', color: 'var(--accent-color)' }}></i>
          Ulashilgan savat
        </h1>

        {/* Cart info */}
        <div className="cart-info glassmorphism-card" style={{
          padding: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div className="cart-stats">
            <div className="stat-item" style={{ marginBottom: '5px' }}>
              <span className="stat-label">Jami kitoblar:</span>
              <span className="stat-value" style={{ marginLeft: '8px' }}>{sharedCart.items.length}</span>
            </div>
            <div className="stat-item" style={{ marginBottom: '5px' }}>
              <span className="stat-label">Mavjud:</span>
              <span className="stat-value" style={{ marginLeft: '8px' }}>{availableItems.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Umumiy qiymat:</span>
              <span className="stat-value" style={{ marginLeft: '8px' }}>{formatPrice(totalValue)}</span>
            </div>
          </div>

          <div className="cart-meta" style={{ textAlign: 'right', fontSize: '0.9rem', opacity: '0.7' }}>
            <div>Ulashgan: {sharedCart.createdAt?.toDate?.()?.toLocaleDateString('uz-UZ') || 
                           new Date(sharedCart.createdAt).toLocaleDateString('uz-UZ')}</div>
            <div>Amal qiladi: {sharedCart.expiresAt?.toDate?.()?.toLocaleDateString('uz-UZ') || 
                              new Date(sharedCart.expiresAt).toLocaleDateString('uz-UZ')} gacha</div>
          </div>
        </div>
      </div>

      {sharedCart.items.length === 0 ? (
        <div className="empty-shared-cart glassmorphism-card" style={{
          textAlign: 'center',
          padding: '30px 20px',
          margin: '20px auto',
          maxWidth: '500px'
        }}>
          <i className="fas fa-shopping-cart" style={{
            fontSize: '3rem',
            marginBottom: '20px',
            opacity: '0.5'
          }}></i>
          <p style={{ marginBottom: '20px' }}>Ulashilgan savat bo'sh.</p>
          <Link to="/" className="glassmorphism-button">
            <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
            Kitoblarni ko'rish
          </Link>
        </div>
      ) : (
        <div className="shared-cart-content">
          {/* Selection controls */}
          {availableItems.length > 0 && (
            <div className="selection-controls glassmorphism-card" style={{
              padding: '15px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedItems.size === availableItems.length && availableItems.length > 0}
                  onChange={handleSelectAll}
                  style={{ marginRight: '10px' }}
                />
                Mavjud kitoblarni tanlash ({selectedItems.size}/{availableItems.length})
              </label>

              {selectedItems.size > 0 && (
                <div className="selected-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                    Tanlangan: {formatPrice(selectedTotal)}
                  </div>
                  <button
                    onClick={handleAddSelectedToCart}
                    disabled={addingToCart || !isAuthenticated}
                    className="glassmorphism-button"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'rgba(52, 211, 153, 0.2)',
                      borderColor: 'rgba(52, 211, 153, 0.5)'
                    }}
                  >
                    {addingToCart ? (
                      <>
                        <div className="loading-spinner" style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginRight: '8px',
                          display: 'inline-block'
                        }}></div>
                        Qo'shilmoqda...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-shopping-cart" style={{ marginRight: '8px' }}></i>
                        Savatga qo'shish
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Items list */}
          <div className="shared-cart-items" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {sharedCart.items.map((item, index) => (
              <div
                key={`${item.bookId}-${index}`}
                className="shared-cart-item glassmorphism-card"
                style={{
                  padding: '15px',
                  display: 'flex',
                  gap: '15px',
                  alignItems: 'center',
                  opacity: item.bookData?.isAvailable ? 1 : 0.6
                }}
              >
                {/* Selection checkbox (only for available items) */}
                {item.bookData?.isAvailable && (
                  <input
                    type="checkbox"
                    checked={selectedItems.has(index)}
                    onChange={() => handleItemSelect(index)}
                    style={{ flexShrink: 0 }}
                  />
                )}

                {/* Book image */}
                <div className="book-image" style={{ flexShrink: 0, width: '80px', height: '100px' }}>
                  <ResponsiveImage
                    src={item.bookData?.images?.main || item.bookData?.imageUrl || item.bookImage}
                    alt={item.bookData?.title || item.bookTitle}
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
                    {item.bookData ? (
                      <Link 
                        to={`/book/${item.bookId}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        {item.bookData.title}
                      </Link>
                    ) : (
                      <span style={{ opacity: '0.7' }}>
                        {item.bookTitle || 'Kitob topilmadi'}
                      </span>
                    )}
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

                    <span className="quantity" style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                      Miqdor: {item.quantity}
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
                  </div>
                </div>

                {/* Item total */}
                <div className="item-total" style={{ 
                  textAlign: 'right',
                  flexShrink: 0,
                  minWidth: '80px'
                }}>
                  <div style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold',
                    color: 'var(--primary-color)'
                  }}>
                    {formatPrice((item.bookData?.price || 0) * item.quantity)}
                  </div>
                </div>

                {/* Individual add to cart button */}
                {item.bookData?.isAvailable && (
                  <div className="item-actions" style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => handleAddItemToCart(item)}
                      disabled={!isAuthenticated}
                      className="glassmorphism-button"
                      style={{ padding: '8px 15px', fontSize: '0.9rem' }}
                    >
                      <i className="fas fa-plus" style={{ marginRight: '5px' }}></i>
                      Qo'shish
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Authentication prompt */}
          {!isAuthenticated && availableItems.length > 0 && (
            <div className="auth-prompt glassmorphism-card" style={{
              padding: '20px',
              textAlign: 'center',
              marginTop: '20px'
            }}>
              <p style={{ marginBottom: '15px' }}>
                Kitoblarni savatga qo'shish uchun tizimga kiring
              </p>
              <Link to="/auth" className="glassmorphism-button">
                <i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }}></i>
                Kirish
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default SharedCartPage;