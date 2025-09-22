// Enhanced Cart Page
// Advanced cart functionality with Cloudinary images, save for later, and sharing

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTelegramHTMLLink } from '../utils/telegramUtils';
import { toastMessages } from '../utils/toastUtils';
import { getOrderRateLimiter } from '../utils/rateLimiter';
import ResponsiveImage from './ResponsiveImage';

// Enhanced hooks
import useEnhancedCart from '../hooks/useEnhancedCart';
import useFirebaseAuth from '../hooks/useFirebaseAuth';
import firebaseService from '../services/FirebaseService';
import { formatPrice, getCurrentUserId, generateOrderNumber } from '../utils/firebaseHelpers';

import '../index.css';
import '../styles/responsive-images.css';

// Telegram Bot API configuration
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

function EnhancedCartPage() {
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [rateLimitRemaining, setRateLimitRemaining] = useState(0);
    const [orderLoading, setOrderLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('cart'); // 'cart' or 'saved'
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const navigate = useNavigate();

    // Enhanced cart hook
    const {
        cartItems,
        savedItems,
        loading,
        error,
        cartTotal,
        cartCount,
        isOnline,
        updateQuantity,
        removeItem,
        saveForLater,
        moveToCart,
        updateNotes,
        updatePriority,
        generateShareToken,
        getCartStats
    } = useEnhancedCart();

    const { user, userProfile, isAuthenticated } = useFirebaseAuth();

    // Get cart statistics
    const cartStats = useMemo(() => getCartStats(), [getCartStats]);

    // Rate limiting timer
    useEffect(() => {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) return;

        const rateLimiter = getOrderRateLimiter(currentUserId);
        const remaining = rateLimiter.getRemainingTime();

        if (remaining > 0) {
            setRateLimitRemaining(remaining);

            const timer = setInterval(() => {
                const newRemaining = rateLimiter.getRemainingTime();
                setRateLimitRemaining(newRemaining);

                if (newRemaining <= 0) {
                    clearInterval(timer);
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, []);

    // Auto-select all items when cart loads
    useEffect(() => {
        if (cartItems.length > 0) {
            const allItemIds = new Set(cartItems.map(item => item.id));
            setSelectedItems(allItemIds);
        }
    }, [cartItems]);

    // Checkbox functions
    const handleItemSelect = (itemId) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedItems.size === cartItems.length) {
            setSelectedItems(new Set());
        } else {
            const allItemIds = new Set(cartItems.map(item => item.id));
            setSelectedItems(allItemIds);
        }
    };

    // Calculate selected items total
    const selectedCartItems = useMemo(() => {
        return cartItems.filter(item => selectedItems.has(item.id));
    }, [cartItems, selectedItems]);

    const selectedTotal = useMemo(() => {
        return selectedCartItems.reduce((total, item) => {
            const price = item.bookData?.price || item.priceAtTimeOfAdd || 0;
            return total + (price * item.quantity);
        }, 0);
    }, [selectedCartItems]);

    // Handle quantity update
    const handleQuantityUpdate = useCallback(async (cartItemId, newQuantity) => {
        if (newQuantity < 1) return;

        try {
            await updateQuantity(cartItemId, newQuantity);
        } catch (err) {
            console.error('Quantity update error:', err);
        }
    }, [updateQuantity]);

    // Handle item removal
    const handleRemoveItem = useCallback(async (cartItemId) => {
        try {
            await removeItem(cartItemId);

            // Remove from selected items
            setSelectedItems(prev => {
                const newSelected = new Set(prev);
                newSelected.delete(cartItemId);
                return newSelected;
            });
        } catch (err) {
            console.error('Remove item error:', err);
        }
    }, [removeItem]);

    // Handle save for later
    const handleSaveForLater = useCallback(async (cartItemId) => {
        try {
            await saveForLater(cartItemId);

            // Remove from selected items
            setSelectedItems(prev => {
                const newSelected = new Set(prev);
                newSelected.delete(cartItemId);
                return newSelected;
            });
        } catch (err) {
            console.error('Save for later error:', err);
        }
    }, [saveForLater]);

    // Handle move to cart
    const handleMoveToCart = useCallback(async (cartItemId) => {
        try {
            await moveToCart(cartItemId);
        } catch (err) {
            console.error('Move to cart error:', err);
        }
    }, [moveToCart]);

    // Handle notes update
    const handleNotesUpdate = useCallback(async (cartItemId, notes) => {
        try {
            await updateNotes(cartItemId, notes);
        } catch (err) {
            console.error('Notes update error:', err);
        }
    }, [updateNotes]);

    // Handle priority update
    const handlePriorityUpdate = useCallback(async (cartItemId, priority) => {
        try {
            await updatePriority(cartItemId, priority);
        } catch (err) {
            console.error('Priority update error:', err);
        }
    }, [updatePriority]);

    // Handle share cart
    const handleShareCart = useCallback(async () => {
        try {
            const url = await generateShareToken();
            setShareUrl(url);
            setShowShareModal(true);
        } catch (err) {
            console.error('Share cart error:', err);
        }
    }, [generateShareToken]);

    // Handle checkout (simplified version)
    const handleCheckout = useCallback(async () => {
        if (selectedCartItems.length === 0) {
            toastMessages.error("Buyurtma berish uchun kamida bitta kitob tanlang!");
            return;
        }

        if (!isAuthenticated) {
            toastMessages.loginRequired();
            navigate('/auth');
            return;
        }

        // Rate limiting check
        const currentUserId = getCurrentUserId();
        const rateLimiter = getOrderRateLimiter(currentUserId);
        const rateLimitResult = rateLimiter.canMakeOrder();

        if (!rateLimitResult.allowed) {
            toastMessages.rateLimitError(rateLimitResult.remainingTime);
            return;
        }

        try {
            setOrderLoading(true);

            // Prepare enhanced order data
            const orderItems = selectedCartItems.map(cartItem => {
                const book = cartItem.bookData;
                return {
                    bookId: cartItem.bookId,
                    bookTitle: book?.title || 'Noma\'lum kitob',
                    bookImage: book?.images?.main || book?.imageUrl || '',
                    quantity: cartItem.quantity,
                    unitPrice: parseFloat(book?.price || cartItem.priceAtTimeOfAdd || 0),
                    totalPrice: parseFloat(book?.price || cartItem.priceAtTimeOfAdd || 0) * cartItem.quantity,
                    isbn: book?.isbn || null,
                    sku: book?.sku || null
                };
            });

            const shippingCost = selectedTotal >= 100000 ? 0 : 15000;
            const totalWithShipping = selectedTotal + shippingCost;

            const orderData = {
                userId: currentUserId,
                items: orderItems,
                totalAmount: totalWithShipping,
                customer: {
                    name: userProfile?.fullName || user?.displayName || 'Noma\'lum',
                    email: user?.email || '',
                    phone: userProfile?.phone || '',
                    telegramUsername: userProfile?.telegramUsername || '',
                    address: {
                        street: userProfile?.address || '',
                        city: userProfile?.city || 'Toshkent',
                        region: userProfile?.region || 'Toshkent',
                        postalCode: userProfile?.postalCode || '',
                        country: 'Uzbekistan'
                    }
                },
                payment: {
                    method: 'cash',
                    status: 'pending'
                },
                shipping: {
                    method: 'delivery',
                    cost: shippingCost,
                    address: {
                        street: userProfile?.address || '',
                        city: userProfile?.city || 'Toshkent',
                        region: userProfile?.region || 'Toshkent',
                        postalCode: userProfile?.postalCode || '',
                        country: 'Uzbekistan'
                    }
                },
                breakdown: {
                    subtotal: selectedTotal,
                    shippingCost: shippingCost,
                    tax: 0,
                    discount: 0,
                    total: totalWithShipping
                },
                metadata: {
                    source: 'web',
                    userAgent: navigator.userAgent,
                    referrer: document.referrer
                }
            };

            // Create order in Firebase
            const order = await firebaseService.createOrder(orderData);

            // Remove selected items from cart
            for (const cartItem of selectedCartItems) {
                await removeItem(cartItem.id);
            }

            // Clear selected items
            setSelectedItems(new Set());

            // Update rate limiter
            rateLimiter.recordOrder();
            setRateLimitRemaining(15);

            // Navigate to orders page
            navigate('/orders');
            toastMessages.orderSuccess();

        } catch (err) {
            console.error('Checkout error:', err);
            toastMessages.orderError();
        } finally {
            setOrderLoading(false);
        }
    }, [selectedCartItems, selectedTotal, isAuthenticated, user, userProfile, removeItem, navigate]);

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
                Savat yuklanmoqda...
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
        <main className="enhanced-cart-page container" style={{ marginTop: '5px' }}>
            {/* Header with stats */}
            <div className="cart-header" style={{ marginBottom: '20px' }}>
                <h1 className="section-title">Savat</h1>
                
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

                {/* Cart stats */}
                <div className="cart-stats glassmorphism-card" style={{
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
                        <span className="stat-value">{cartStats.totalItems}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Savatda:</span>
                        <span className="stat-value">{cartStats.activeItems}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Saqlangan:</span>
                        <span className="stat-value">{cartStats.savedItems}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Umumiy qiymat:</span>
                        <span className="stat-value">{formatPrice(cartStats.totalValue)}</span>
                    </div>
                    
                    {/* Share button */}
                    {cartItems.length > 0 && (
                        <button
                            onClick={handleShareCart}
                            className="glassmorphism-button"
                            style={{ padding: '8px 15px' }}
                        >
                            <i className="fas fa-share" style={{ marginRight: '5px' }}></i>
                            Ulashish
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="cart-tabs" style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveTab('cart')}
                    className={`tab-button ${activeTab === 'cart' ? 'active' : ''}`}
                    style={{
                        padding: '10px 20px',
                        marginRight: '10px',
                        backgroundColor: activeTab === 'cart' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        border: activeTab === 'cart' ? '1px solid rgba(52, 211, 153, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'inherit',
                        cursor: 'pointer'
                    }}
                >
                    <i className="fas fa-shopping-cart" style={{ marginRight: '5px' }}></i>
                    Savat ({cartItems.length})
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`tab-button ${activeTab === 'saved' ? 'active' : ''}`}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: activeTab === 'saved' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        border: activeTab === 'saved' ? '1px solid rgba(52, 211, 153, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'inherit',
                        cursor: 'pointer'
                    }}
                >
                    <i className="fas fa-bookmark" style={{ marginRight: '5px' }}></i>
                    Saqlangan ({savedItems.length})
                </button>
            </div>

            {/* Cart content */}
            {activeTab === 'cart' ? (
                cartItems.length === 0 ? (
                    <div className="empty-cart glassmorphism-card" style={{
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
                        <p style={{ marginBottom: '20px' }}>Savatingiz bo'sh.</p>
                        <Link to="/" className="glassmorphism-button">
                            <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
                            Kitoblarni ko'rish
                        </Link>
                    </div>
                ) : (
                    <div className="cart-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Select All Section */}
                        <div className="select-all-section glassmorphism-card" style={{
                            padding: '15px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px'
                        }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedItems.size === cartItems.length && cartItems.length > 0}
                                    onChange={handleSelectAll}
                                    style={{ marginRight: '10px' }}
                                />
                                Barchasini tanlash ({selectedItems.size}/{cartItems.length})
                            </label>

                            <div className="bulk-actions" style={{ display: 'flex', gap: '10px' }}>
                                {selectedItems.size > 0 && (
                                    <>
                                        <button
                                            onClick={() => {
                                                selectedItems.forEach(itemId => {
                                                    handleSaveForLater(itemId);
                                                });
                                            }}
                                            className="glassmorphism-button"
                                            style={{ padding: '8px 15px', fontSize: '0.9rem' }}
                                        >
                                            <i className="fas fa-bookmark" style={{ marginRight: '5px' }}></i>
                                            Saqlash
                                        </button>
                                        <button
                                            onClick={() => {
                                                selectedItems.forEach(itemId => {
                                                    handleRemoveItem(itemId);
                                                });
                                            }}
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
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Cart Items */}
                        <div className="cart-items" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {cartItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="cart-item glassmorphism-card"
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
                                                {formatPrice(item.bookData?.price || item.priceAtTimeOfAdd || 0)}
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

                                            {item.priority && item.priority !== 'normal' && (
                                                <span style={{
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.7rem',
                                                    backgroundColor: item.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                                    color: item.priority === 'high' ? 'rgba(239, 68, 68, 1)' : 'rgba(251, 191, 36, 1)'
                                                }}>
                                                    {item.priority === 'high' ? 'Yuqori' : 'O\'rta'}
                                                </span>
                                            )}
                                        </div>

                                        {item.notes && (
                                            <p style={{ 
                                                margin: '8px 0 0 0', 
                                                fontSize: '0.8rem',
                                                opacity: '0.7',
                                                fontStyle: 'italic'
                                            }}>
                                                "{item.notes}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Quantity controls */}
                                    <div className="quantity-controls" style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px',
                                        flexShrink: 0
                                    }}>
                                        <button
                                            onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                            className="glassmorphism-button"
                                            style={{ 
                                                padding: '5px 10px', 
                                                fontSize: '0.9rem',
                                                minWidth: '35px'
                                            }}
                                        >
                                            -
                                        </button>
                                        
                                        <span style={{ 
                                            minWidth: '30px', 
                                            textAlign: 'center',
                                            fontSize: '1rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {item.quantity}
                                        </span>
                                        
                                        <button
                                            onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                                            className="glassmorphism-button"
                                            style={{ 
                                                padding: '5px 10px', 
                                                fontSize: '0.9rem',
                                                minWidth: '35px'
                                            }}
                                        >
                                            +
                                        </button>
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
                                            {formatPrice((item.bookData?.price || item.priceAtTimeOfAdd || 0) * item.quantity)}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="item-actions" style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '5px',
                                        flexShrink: 0
                                    }}>
                                        <button
                                            onClick={() => handleSaveForLater(item.id)}
                                            className="glassmorphism-button"
                                            style={{ 
                                                padding: '5px 8px', 
                                                fontSize: '0.8rem',
                                                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                                                borderColor: 'rgba(251, 191, 36, 0.3)'
                                            }}
                                            title="Keyinroq uchun saqlash"
                                        >
                                            <i className="fas fa-bookmark"></i>
                                        </button>
                                        
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="glassmorphism-button"
                                            style={{ 
                                                padding: '5px 8px', 
                                                fontSize: '0.8rem',
                                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                                borderColor: 'rgba(239, 68, 68, 0.3)'
                                            }}
                                            title="Savatdan o'chirish"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Checkout section */}
                        {selectedCartItems.length > 0 && (
                            <div className="checkout-section glassmorphism-card" style={{
                                padding: '20px',
                                marginTop: '20px',
                                position: 'sticky',
                                bottom: '20px'
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: '15px'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                                            Tanlangan: {selectedCartItems.length} ta kitob
                                        </div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            Jami: {formatPrice(selectedTotal)}
                                        </div>
                                        {selectedTotal >= 100000 ? (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--success-color)' }}>
                                                <i className="fas fa-shipping-fast" style={{ marginRight: '5px' }}></i>
                                                Bepul yetkazib berish
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.8rem', opacity: '0.7' }}>
                                                Yetkazib berish: +{formatPrice(15000)}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleCheckout}
                                        disabled={orderLoading || rateLimitRemaining > 0}
                                        className="glassmorphism-button"
                                        style={{
                                            padding: '12px 25px',
                                            fontSize: '1rem',
                                            fontWeight: 'bold',
                                            backgroundColor: 'rgba(52, 211, 153, 0.2)',
                                            borderColor: 'rgba(52, 211, 153, 0.5)'
                                        }}
                                    >
                                        {orderLoading ? (
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
                                                Buyurtma berilmoqda...
                                            </>
                                        ) : rateLimitRemaining > 0 ? (
                                            <>
                                                <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                                                Kutish ({rateLimitRemaining}s)
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-shopping-bag" style={{ marginRight: '8px' }}></i>
                                                Buyurtma berish
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : (
                // Saved items tab
                savedItems.length === 0 ? (
                    <div className="empty-saved glassmorphism-card" style={{
                        textAlign: 'center',
                        padding: '30px 20px',
                        margin: '20px auto',
                        maxWidth: '500px'
                    }}>
                        <i className="fas fa-bookmark" style={{
                            fontSize: '3rem',
                            marginBottom: '20px',
                            opacity: '0.5'
                        }}></i>
                        <p style={{ marginBottom: '20px' }}>Saqlangan kitoblar yo'q.</p>
                        <Link to="/" className="glassmorphism-button">
                            <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
                            Kitoblarni ko'rish
                        </Link>
                    </div>
                ) : (
                    <div className="saved-items" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {savedItems.map((item) => (
                            <div
                                key={item.id}
                                className="saved-item glassmorphism-card"
                                style={{
                                    padding: '15px',
                                    display: 'flex',
                                    gap: '15px',
                                    alignItems: 'center'
                                }}
                            >
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
                                            {formatPrice(item.bookData?.price || item.priceAtTimeOfAdd || 0)}
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
                                            Miqdor: {item.quantity}
                                        </span>
                                    </div>

                                    {item.notes && (
                                        <p style={{ 
                                            margin: '8px 0 0 0', 
                                            fontSize: '0.8rem',
                                            opacity: '0.7',
                                            fontStyle: 'italic'
                                        }}>
                                            "{item.notes}"
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="item-actions" style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '8px',
                                    flexShrink: 0
                                }}>
                                    <button
                                        onClick={() => handleMoveToCart(item.id)}
                                        className="glassmorphism-button"
                                        style={{ padding: '8px 15px', fontSize: '0.9rem' }}
                                    >
                                        <i className="fas fa-shopping-cart" style={{ marginRight: '5px' }}></i>
                                        Savatga
                                    </button>
                                    
                                    <button
                                        onClick={() => handleRemoveItem(item.id)}
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
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content glassmorphism-card" style={{
                        padding: '30px',
                        maxWidth: '500px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ marginBottom: '20px' }}>Savatni ulashish</h3>
                        <p style={{ marginBottom: '20px', opacity: '0.8' }}>
                            Ushbu havola orqali boshqalar sizning savatingizni ko'rishlari mumkin:
                        </p>
                        <div style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            wordBreak: 'break-all',
                            fontSize: '0.9rem'
                        }}>
                            {shareUrl}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(shareUrl);
                                    toastMessages.success('Havola nusxalandi');
                                }}
                                className="glassmorphism-button"
                            >
                                <i className="fas fa-copy" style={{ marginRight: '5px' }}></i>
                                Nusxalash
                            </button>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="glassmorphism-button"
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default EnhancedCartPage;