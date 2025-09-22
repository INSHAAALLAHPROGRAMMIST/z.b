import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTelegramHTMLLink } from '../utils/telegramUtils';
import { toastMessages } from '../utils/toastUtils';
import { getOrderRateLimiter } from '../utils/rateLimiter';
import ResponsiveImage from './ResponsiveImage';

// Firebase imports
import useFirebaseCart from '../hooks/useFirebaseCart';
import useFirebaseAuth from '../hooks/useFirebaseAuth';
import firebaseService from '../services/FirebaseService';
import { formatPrice, getCurrentUserId, generateOrderNumber } from '../utils/firebaseHelpers';

import '../index.css';
import '../styles/responsive-images.css';

// Telegram Bot API konfiguratsiyasi
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

function CartPage() {
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [rateLimitRemaining, setRateLimitRemaining] = useState(0);
    const [orderLoading, setOrderLoading] = useState(false);
    const [booksData, setBooksData] = useState({});
    const navigate = useNavigate();

    // Firebase hooks
    const {
        cartItems,
        loading,
        error,
        cartTotal,
        updateQuantity,
        removeItem,
        clearCart
    } = useFirebaseCart();

    const { user, userProfile, isAuthenticated } = useFirebaseAuth();

    // Load book details for cart items
    const loadBooksData = useCallback(async () => {
        if (cartItems.length === 0) return;

        try {
            const bookIds = [...new Set(cartItems.map(item => item.bookId))];
            const booksMap = {};

            for (const bookId of bookIds) {
                try {
                    const book = await firebaseService.getBookById(bookId);
                    booksMap[bookId] = book;
                } catch (err) {
                    console.error(`Error loading book ${bookId}:`, err);
                    // Add fallback book data
                    booksMap[bookId] = {
                        id: bookId,
                        title: 'Noma\'lum kitob',
                        authorName: 'Noma\'lum',
                        price: 0,
                        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'
                    };
                }
            }

            setBooksData(booksMap);
        } catch (err) {
            console.error('Error loading books data:', err);
        }
    }, [cartItems]);

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

    // Load books data when cart items change
    useEffect(() => {
        loadBooksData();
    }, [loadBooksData]);

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
            const book = booksData[item.bookId];
            return total + (book ? parseFloat(book.price || 0) * item.quantity : 0);
        }, 0);
    }, [selectedCartItems, booksData]);

    // Handle quantity update
    const handleQuantityUpdate = useCallback(async (cartItemId, newQuantity) => {
        if (newQuantity < 1) return;

        try {
            await updateQuantity(cartItemId, newQuantity);
        } catch (err) {
            console.error('Quantity update error:', err);
            toastMessages.cartError();
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

            toastMessages.removedFromCart();
        } catch (err) {
            console.error('Remove item error:', err);
            toastMessages.cartError();
        }
    }, [removeItem]);

    // Handle checkout
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
                const book = booksData[cartItem.bookId];
                return {
                    bookId: cartItem.bookId,
                    bookTitle: book?.title || 'Noma\'lum kitob',
                    bookImage: book?.imageUrl || book?.images?.main || '',
                    quantity: cartItem.quantity,
                    unitPrice: parseFloat(book?.price || 0),
                    totalPrice: parseFloat(book?.price || 0) * cartItem.quantity,
                    isbn: book?.isbn || null,
                    sku: book?.sku || null
                };
            });

            const shippingCost = selectedTotal >= 100000 ? 0 : 15000; // Free shipping over 100k UZS
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

            // Send Telegram notification
            await sendTelegramNotification(order, orderItems);

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
    }, [selectedCartItems, selectedTotal, isAuthenticated, user, userProfile, booksData, removeItem, navigate]);

    // Send Telegram notification
    const sendTelegramNotification = async (order, orderItems) => {
        try {
            const orderDetails = orderItems.map((item, index) => {
                return `<b>${index + 1}. ${item.bookTitle}</b>\n` +
                    `  Narxi: ${item.unitPrice.toLocaleString()} so'm\n` +
                    `  Miqdori: ${item.quantity} dona\n` +
                    `  Jami: ${item.totalPrice.toLocaleString()} so'm`;
            }).join('\n\n');

            const telegramLink = createTelegramHTMLLink(order.telegramUsername || 'Kiritilmagan');

            const message = `
<b>🛒 Yangi Buyurtma!</b>
-----------------------------------
<b>Buyurtma raqami:</b> <code>${order.orderNumber}</code>
<b>Xaridor ma'lumotlari:</b>
Ism: <b>${order.customerName}</b>
Email: <code>${order.customerEmail}</code>
Telegram: ${telegramLink}
Telefon: <code>${order.customerPhone || 'Kiritilmagan'}</code>
-----------------------------------
<b>Buyurtma Tafsilotlari:</b>
${orderDetails}
-----------------------------------
<b>Umumiy Summa:</b> <b>${order.totalAmount.toLocaleString()} so'm</b>
            `;

            const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

            await fetch(telegramApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
        } catch (err) {
            console.error('Telegram notification error:', err);
            // Don't throw error - order should still succeed
        }
    };

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
        <main className="cart-page container" style={{ marginTop: '5px' }}>
            <h1 className="section-title">Savat</h1>

            {cartItems.length === 0 ? (
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
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }}>
                        <input
                            type="checkbox"
                            checked={selectedItems.size === cartItems.length && cartItems.length > 0}
                            onChange={handleSelectAll}
                            style={{
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                accentColor: 'var(--accent-color)'
                            }}
                        />
                        <label
                            style={{
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                fontWeight: '500'
                            }}
                            onClick={handleSelectAll}
                        >
                            Hammasini tanlash ({selectedItems.size}/{cartItems.length})
                        </label>
                    </div>

                    {/* Cart Items */}
                    <div className="cart-items" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {cartItems.map(item => {
                            const book = booksData[item.bookId];
                            const isSelected = selectedItems.has(item.id);

                            return (
                                <div
                                    key={item.id}
                                    className="cart-item glassmorphism-card"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '15px',
                                        gap: '15px',
                                        position: 'relative',
                                        opacity: isSelected ? 1 : 0.6,
                                        border: isSelected
                                            ? '2px solid rgba(52, 211, 153, 0.5)'
                                            : '1px solid rgba(255, 255, 255, 0.2)'
                                    }}
                                >
                                    {/* Checkbox */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        zIndex: 10
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleItemSelect(item.id)}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                cursor: 'pointer',
                                                accentColor: 'var(--accent-color)'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                        {/* Book Image */}
                                        <Link
                                            to={book?.slug ? `/kitob/${book.slug}` : `/book/${item.bookId}`}
                                            style={{
                                                flexShrink: 0,
                                                width: '100px',
                                                height: '150px',
                                                margin: '0 auto'
                                            }}
                                        >
                                            <ResponsiveImage
                                                src={book?.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'}
                                                alt={book?.title || 'Kitob'}
                                                className="cart-item-image"
                                                context="cart-item"
                                            />
                                        </Link>

                                        {/* Book Details */}
                                        <div className="cart-item-details" style={{ flex: '1', minWidth: '250px' }}>
                                            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                                                <Link to={book?.slug ? `/kitob/${book.slug}` : `/book/${item.bookId}`}>
                                                    {book?.title || 'Noma\'lum kitob'}
                                                </Link>
                                            </h3>

                                            <p style={{ fontSize: '0.9rem', marginBottom: '5px', opacity: '0.8' }}>
                                                <i className="fas fa-user" style={{ marginRight: '5px' }}></i>
                                                Muallif: {book?.authorName || 'Noma\'lum'}
                                            </p>

                                            <p style={{
                                                fontSize: '1rem',
                                                fontWeight: 'bold',
                                                marginBottom: '10px',
                                                color: 'var(--accent-color)'
                                            }}>
                                                <i className="fas fa-tag" style={{ marginRight: '5px' }}></i>
                                                Narxi: {formatPrice(book?.price || 0)}
                                            </p>

                                            {/* Quantity Controls and Total */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '10px',
                                                marginTop: '10px'
                                            }}>
                                                <div className="quantity-controls" style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px'
                                                }}>
                                                    <button
                                                        onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                                                        className="glassmorphism-button"
                                                        style={{
                                                            width: '35px',
                                                            height: '35px',
                                                            padding: '0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '1.2rem',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        -
                                                    </button>

                                                    <span style={{
                                                        fontSize: '1.1rem',
                                                        fontWeight: 'bold',
                                                        minWidth: '30px',
                                                        textAlign: 'center'
                                                    }}>
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                                                        className="glassmorphism-button"
                                                        style={{
                                                            width: '35px',
                                                            height: '35px',
                                                            padding: '0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '1.2rem',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <p style={{
                                                    fontSize: '1.1rem',
                                                    fontWeight: 'bold',
                                                    color: 'var(--accent-color)'
                                                }}>
                                                    <i className="fas fa-calculator" style={{ marginRight: '5px' }}></i>
                                                    Jami: {formatPrice((book?.price || 0) * item.quantity)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="remove-item-btn glassmorphism-button"
                                        style={{
                                            alignSelf: 'flex-end',
                                            padding: '8px 15px',
                                            backgroundColor: 'rgba(255, 59, 59, 0.2)',
                                            border: '1px solid rgba(255, 59, 59, 0.3)',
                                            color: '#ff6b6b'
                                        }}
                                    >
                                        <i className="fas fa-trash-alt" style={{ marginRight: '5px' }}></i>
                                        O'chirish
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Cart Summary */}
                    <div className="cart-summary glassmorphism-card" style={{
                        padding: '20px',
                        marginTop: '10px'
                    }}>
                        <h2 style={{ marginBottom: '15px', fontSize: '1.5rem' }}>Savat Hisobi</h2>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            marginBottom: '20px',
                            padding: '10px 0',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p style={{ fontSize: '1rem', opacity: 0.8 }}>Tanlangan kitoblar:</p>
                                <span style={{ fontSize: '1rem' }}>{selectedItems.size} ta</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p style={{ fontSize: '1.1rem' }}>Umumiy narx:</p>
                                <span style={{
                                    fontSize: '1.3rem',
                                    fontWeight: 'bold',
                                    color: 'var(--accent-color)'
                                }}>
                                    {formatPrice(selectedTotal)}
                                </span>
                            </div>
                        </div>

                        {/* Rate Limit Warning */}
                        {rateLimitRemaining > 0 && (
                            <div style={{
                                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                                border: '1px solid rgba(255, 193, 7, 0.3)',
                                borderRadius: '8px',
                                padding: '10px',
                                marginBottom: '15px',
                                textAlign: 'center'
                            }}>
                                <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                                Keyingi buyurtma {rateLimitRemaining} soniyadan keyin berish mumkin
                            </div>
                        )}

                        {/* Checkout Button */}
                        <button
                            onClick={handleCheckout}
                            disabled={selectedItems.size === 0 || rateLimitRemaining > 0 || orderLoading}
                            className="glassmorphism-button"
                            style={{
                                width: '100%',
                                padding: '15px',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                backgroundColor: selectedItems.size > 0 && rateLimitRemaining === 0
                                    ? 'var(--accent-color)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                opacity: selectedItems.size === 0 || rateLimitRemaining > 0 || orderLoading ? 0.5 : 1,
                                cursor: selectedItems.size === 0 || rateLimitRemaining > 0 || orderLoading
                                    ? 'not-allowed'
                                    : 'pointer'
                            }}
                        >
                            {orderLoading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                    Buyurtma berilmoqda...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-shopping-bag" style={{ marginRight: '8px' }}></i>
                                    Buyurtma berish ({formatPrice(selectedTotal)})
                                </>
                            )}
                        </button>

                        {selectedItems.size === 0 && (
                            <p style={{
                                textAlign: 'center',
                                marginTop: '10px',
                                fontSize: '0.9rem',
                                opacity: 0.7
                            }}>
                                Buyurtma berish uchun kamida bitta kitob tanlang
                            </p>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}

export default CartPage;