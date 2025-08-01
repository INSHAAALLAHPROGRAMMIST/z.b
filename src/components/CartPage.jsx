// D:\zamon-books-frontend\src\components\CartPage.jsx
import React, { useState, useEffect } from 'react';
import { databases, Query, ID, account } from '../appwriteConfig';
import { Link, useNavigate } from 'react-router-dom';
import { createTelegramHTMLLink } from '../utils/telegramUtils';
import { toastMessages } from '../utils/toastUtils';
import { getOrderRateLimiter } from '../utils/rateLimiter';
import ResponsiveImage from './ResponsiveImage';
import '../index.css'; // Umumiy stil faylini import qilish
import '../styles/responsive-images.css';

// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;

// --- Telegram Bot API konfiguratsiyasi ---
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

function CartPage() {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rateLimitRemaining, setRateLimitRemaining] = useState(0);
    const [selectedItems, setSelectedItems] = useState(new Set()); // Tanlangan kitoblar
    const navigate = useNavigate();


    // Rate limiting timer
    useEffect(() => {
        const currentUserId = localStorage.getItem('currentUserId');
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

    // Checkbox funksiyalari
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
            // Agar hammasi tanlangan bo'lsa, hammasini bekor qilish
            setSelectedItems(new Set());
        } else {
            // Hammasini tanlash
            const allItemIds = new Set(cartItems.map(item => item.$id));
            setSelectedItems(allItemIds);
        }
    };

    // Tanlangan kitoblar uchun hisob-kitob
    const getSelectedItems = () => {
        return cartItems.filter(item => selectedItems.has(item.$id));
    };

    const calculateSelectedTotal = () => {
        return getSelectedItems().reduce((total, item) =>
            total + (item.book ? parseFloat(item.book.price || 0) * item.quantity : 0), 0
        );
    };

    // Headerdagi savat sonini yangilash funksiyasi
    const updateCartCount = async () => {
        try {
            // Global cart count'ni yangilash uchun event dispatch qilish
            window.dispatchEvent(new CustomEvent('cartUpdated'));
        } catch (err) {
            console.error("Savat sonini yuklashda xato:", err);
        }
    };

    useEffect(() => {
        const fetchCartItems = async () => {
            setLoading(true);
            setError(null);
            try {
                // Use cached user ID to avoid unnecessary account.get() calls
                let currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('appwriteGuestId');

                if (!currentUserId) {
                    currentUserId = ID.unique(); // Agar ID bo'lmasa, yangi ID yaratish
                    localStorage.setItem('appwriteGuestId', currentUserId);
                }



                // Savat elementlarini foydalanuvchi ID'si bo'yicha olish
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    [
                        Query.equal('userId', currentUserId)
                    ]
                );
                if (response.documents.length === 0) {
                    setCartItems([]);
                    setLoading(false);
                    return;
                }

                // Har bir savat elementi uchun kitob ma'lumotlarini alohida yuklash
                const itemsWithBookDetails = await Promise.all(
                    response.documents.map(async (item) => {
                        try {
                            // Kitob ma'lumotlarini alohida yuklash
                            const bookResponse = await databases.getDocument(
                                DATABASE_ID,
                                BOOKS_COLLECTION_ID,
                                item.bookId
                            );

                            return {
                                ...item,
                                book: bookResponse
                            };
                        } catch (bookError) {
                            console.error(`Kitob ma'lumotlarini yuklashda xato (ID: ${item.bookId}):`, bookError);
                            return {
                                ...item,
                                book: {
                                    $id: item.bookId,
                                    title: 'Noma\'lum kitob',
                                    price: 0,
                                    imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg',
                                    author: { name: 'Noma\'lum' }
                                }
                            };
                        }
                    })
                );
                setCartItems(itemsWithBookDetails);

                // Barcha kitoblarni default tanlangan qilish
                const allItemIds = new Set(itemsWithBookDetails.map(item => item.$id));
                setSelectedItems(allItemIds);

                updateCartCount(); // Savat sonini yangilash
                setLoading(false);
            } catch (err) {
                console.error("Savat elementlarini yuklashda xato yuz berdi:", err);
                setError(err.message || "Savat elementlarini yuklashda noma'lum xato.");
                setLoading(false);
            }
        };
        fetchCartItems();
    }, []);

    const removeFromCart = async (cartItemId) => {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                cartItemId
            );
            setCartItems(prevItems => prevItems.filter(item => item.$id !== cartItemId));

            // Selected items'dan ham olib tashlash
            setSelectedItems(prevSelected => {
                const newSelected = new Set(prevSelected);
                newSelected.delete(cartItemId);
                return newSelected;
            });

            updateCartCount(); // Savat sonini yangilash
            toastMessages.removedFromCart();
        } catch (err) {
            console.error("Kitobni savatdan o'chirishda xato yuz berdi:", err);
            toastMessages.cartError();
        }
    };

    const updateQuantity = async (cartItem, newQuantity) => {
        if (newQuantity < 1) return; // Miqdor 1 dan kam bo'lmasligi kerak
        try {
            // Kitob ID'sini to'g'ri olish
            const bookId = typeof cartItem.books === 'object' ? cartItem.books.$id : cartItem.books;

            await databases.updateDocument(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                cartItem.$id,
                {
                    quantity: newQuantity
                }
            );
            setCartItems(prevItems =>
                prevItems.map(item =>
                    item.$id === cartItem.$id ? { ...item, quantity: newQuantity } : item
                )
            );
            updateCartCount(); // Savat sonini yangilash

        } catch (err) {
            console.error("Miqdorni yangilashda xato yuz berdi:", err);
            toastMessages.cartError();
        }
    };

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + (item.book ? parseFloat(item.book.price || 0) * item.quantity : 0), 0);
    };

    // Checkout function
    const handleCheckout = async () => {
        try {
            // Check if user is logged in using cached data
            const currentUserId = localStorage.getItem('currentUserId');

            if (!currentUserId) {
                toastMessages.loginRequired();
                return;
            }

            if (cartItems.length === 0) {
                toastMessages.emptyCart();
                return;
            }

            // Tanlangan kitoblarni tekshirish
            const selectedCartItems = getSelectedItems();
            if (selectedCartItems.length === 0) {
                toastMessages.error("Buyurtma berish uchun kamida bitta kitob tanlang!");
                return;
            }

            // Rate limiting check
            const rateLimiter = getOrderRateLimiter(currentUserId);
            const rateLimitResult = rateLimiter.canMakeOrder();

            if (!rateLimitResult.allowed) {
                toastMessages.rateLimitError(rateLimitResult.remainingTime);
                return;
            }

            setLoading(true);

            // Get current user from Appwrite Auth
            const currentUser = await account.get();

            // User'ning database ma'lumotlarini olish
            const { getUserByAuthId } = await import('../utils/userSync');
            const dbUser = await getUserByAuthId(currentUser.$id);

            // Orders service'ni import qilish
            const { createOrdersFromCart } = await import('../utils/orderService');

            // Faqat tanlangan cart itemlarni orderga aylantirish
            await createOrdersFromCart(selectedCartItems);

            // Faqat tanlangan kitoblarni cart'dan olib tashlash
            const remainingItems = cartItems.filter(item => !selectedItems.has(item.$id));
            setCartItems(remainingItems);

            // Tanlangan kitoblarni tozalash
            setSelectedItems(new Set());

            // Global cart count'ni yangilash
            window.dispatchEvent(new CustomEvent('cartUpdated'));

            // --- Telegram bot orqali xabar yuborish (HTML formatda) ---
            const totalAmount = calculateSelectedTotal().toLocaleString();

            const orderDetails = selectedCartItems.map((item, index) => {
                const itemTotal = (parseFloat(item.book.price || 0) * item.quantity).toLocaleString();
                return `<b>${index + 1}. ${item.book.title}</b>\n` +
                    `  Muallif: ${item.book.author?.name || 'Noma\'lum'}\n` +
                    `  Narxi: ${parseFloat(item.book.price || 0).toLocaleString()} so'm\n` +
                    `  Miqdori: ${item.quantity} dona\n` +
                    `  Jami: ${itemTotal} so'm`;
            }).join('\n\n'); // Har bir kitob orasida bo'sh qator

            // Telegram username'ni auth preferences va database'dan olish
            const telegramUsername = dbUser?.telegram_username ||
                currentUser.prefs?.telegram_username ||
                'Kiritilmagan';

            // Telegram HTML link yaratish
            const telegramLink = createTelegramHTMLLink(telegramUsername);

            const message = `
<b>Yangi Buyurtma!</b> 🛒
-----------------------------------
<b>Xaridor ma'lumotlari:</b>
Ism: <b>${dbUser?.fullName || currentUser.name || 'Noma\'lum'}</b>
Email: <code>${currentUser.email}</code>
Telegram: ${telegramLink}
Telefon: <code>${dbUser?.phone || 'Kiritilmagan'}</code>
ID: <code>${currentUser.$id}</code>
-----------------------------------
<b>Buyurtma Tafsilotlari:</b>
${orderDetails}
-----------------------------------
<b>Umumiy Summa:</b> <b style="color: #28a745;">${totalAmount} so'm</b>
            `;

            const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

            const telegramResponse = await fetch(telegramApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML' // Xabarni HTML formatida yuborish
                })
            });

            if (!telegramResponse.ok) {
                const telegramError = await telegramResponse.text();
                console.error('Telegram API xatosi:', telegramError);
                // Telegram xatosi bo'lsa ham buyurtma davom etsin
            }
            // -
            // Rate limiter'ni yangilash - buyurtma muvaffaqiyatli bo'ldi
            rateLimiter.recordOrder();

            // UI'da timer'ni boshlash
            setRateLimitRemaining(15); // 15 soniya
            const timer = setInterval(() => {
                const newRemaining = rateLimiter.getRemainingTime();
                setRateLimitRemaining(newRemaining);

                if (newRemaining <= 0) {
                    clearInterval(timer);
                }
            }, 1000);

            // Orders sahifasiga yo'naltirish
            navigate('/orders');
            // ==========================================================

            // ==========================================================
            // Success message
            setTimeout(() => {
                toastMessages.orderSuccess();
            }, 500);

        } catch (error) {
            console.error('Checkout xatosi:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                cartItems: cartItems
            });

            // Xato turini aniqlash
            if (error.message && error.message.includes('Book ID topilmadi')) {
                toast.error('Savat ma\'lumotlarida xatolik bor. Sahifani yangilab qaytadan urinib ko\'ring.');
            } else if (error.message && error.message.includes('network')) {
                toast.error('Internet aloqasi bilan muammo. Iltimos, qaytadan urinib ko\'ring.');
            } else {
                toastMessages.orderError();
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: '50px', textAlign: 'center' }}>Savat yuklanmoqda...</div>;
    if (error) return <div className="container" style={{ padding: '50px', textAlign: 'center', color: 'red' }}>Xato: {error}</div>;

    return (
        <>
            <main className="cart-page container" style={{ marginTop: '5px' }}>
                <h1 className="section-title">Savat</h1>
                {cartItems.length === 0 ? (
                    <div className="empty-cart glassmorphism-card" style={{
                        textAlign: 'center',
                        padding: '30px 20px',
                        margin: '20px auto',
                        maxWidth: '500px'
                    }}>
                        <i className="fas fa-shopping-cart" style={{ fontSize: '3rem', marginBottom: '20px', opacity: '0.5' }}></i>
                        <p style={{ marginBottom: '20px' }}>Savatingiz bo'sh.</p>
                        <Link to="/" className="glassmorphism-button" style={{ display: 'inline-block' }}>
                            <i className="fas fa-book"></i> Kitoblarni ko'rish
                        </Link>
                    </div>
                ) : (
                    <div className="cart-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Select All Checkbox */}
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
                                    accentColor: '#68d639'
                                }}
                            />
                            <label style={{
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                fontWeight: '500'
                            }} onClick={handleSelectAll}>
                                Hammasini tanlash ({selectedItems.size}/{cartItems.length})
                            </label>
                        </div>

                        <div className="cart-items" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {cartItems.map(item => (
                                <div key={item.$id} className="cart-item glassmorphism-card" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '15px',
                                    gap: '15px',
                                    position: 'relative',
                                    opacity: selectedItems.has(item.$id) ? 1 : 0.6,
                                    border: selectedItems.has(item.$id)
                                        ? '2px solid rgba(104, 214, 57, 0.5)'
                                        : '1px solid rgba(255, 255, 255, 0.2)'
                                }}>
                                    {/* Checkbox */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        zIndex: 10
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.has(item.$id)}
                                            onChange={() => handleItemSelect(item.$id)}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                cursor: 'pointer',
                                                accentColor: '#68d639'
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                        <Link to={item.book.slug ? `/kitob/${item.book.slug}` : `/book/${item.book.$id}`} style={{
                                            flexShrink: 0,
                                            width: '100px',
                                            height: '150px',
                                            margin: '0 auto'
                                        }}>
                                            <ResponsiveImage
                                                src={item.book.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'}
                                                alt={item.book.title}
                                                className="cart-item-image"
                                                context="cart-item"
                                            />
                                        </Link>
                                        <div className="cart-item-details" style={{ flex: '1', minWidth: '250px' }}>
                                            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                                                <Link to={item.book.slug ? `/kitob/${item.book.slug}` : `/book/${item.book.$id}`}>{item.book.title}</Link>
                                            </h3>
                                            <p style={{ fontSize: '0.9rem', marginBottom: '5px', opacity: '0.8' }}>
                                                <i className="fas fa-user" style={{ marginRight: '5px' }}></i>
                                                Muallif: {item.book.author?.name || item.book.authorName || 'Noma\'lum'}
                                            </p>
                                            <p style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent-light)' }}>
                                                <i className="fas fa-tag" style={{ marginRight: '5px' }}></i>
                                                Narxi: {parseFloat(item.book.price || 0).toLocaleString()} so'm
                                            </p>

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
                                                        onClick={() => updateQuantity(item, item.quantity - 1)}
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
                                                    >-</button>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item, item.quantity + 1)}
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
                                                    >+</button>
                                                </div>

                                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-light)' }}>
                                                    <i className="fas fa-calculator" style={{ marginRight: '5px' }}></i>
                                                    Jami: {(parseFloat(item.book.price || 0) * item.quantity).toLocaleString()} so'm
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(item.$id)}
                                        className="remove-item-btn glassmorphism-button"
                                        style={{
                                            alignSelf: 'flex-end',
                                            padding: '8px 15px',
                                            backgroundColor: 'rgba(255, 59, 59, 0.2)',
                                            border: '1px solid rgba(255, 59, 59, 0.3)',
                                            color: '#ff6b6b'
                                        }}
                                    >
                                        <i className="fas fa-trash-alt"></i> O'chirish
                                    </button>
                                </div>
                            ))}
                        </div>

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
                                borderBottom: '1px solid var(--glass-border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ fontSize: '1rem', opacity: 0.8 }}>Tanlangan kitoblar:</p>
                                    <span style={{ fontSize: '1rem' }}>{selectedItems.size} ta</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ fontSize: '1.1rem' }}>Umumiy narx:</p>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent-light)' }}>
                                        {calculateSelectedTotal().toLocaleString()} so'm
                                    </span>
                                </div>
                            </div>
                            <button
                                className="checkout-btn glassmorphism-button"
                                onClick={handleCheckout}
                                disabled={loading || rateLimitRemaining > 0 || selectedItems.size === 0}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    backgroundColor: rateLimitRemaining > 0
                                        ? 'rgba(255, 193, 7, 0.2)'
                                        : 'rgba(104, 214, 57, 0.2)',
                                    opacity: rateLimitRemaining > 0 ? 0.6 : 1
                                }}
                            >
                                {rateLimitRemaining > 0 ? (
                                    <>
                                        <i className="fas fa-clock"></i> {rateLimitRemaining} soniya kuting
                                    </>
                                ) : selectedItems.size === 0 ? (
                                    <>
                                        <i className="fas fa-exclamation-circle"></i> Kitob tanlang
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check-circle"></i> Tanlangan kitoblarni buyurtma qilish ({selectedItems.size} ta)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}

export default CartPage;