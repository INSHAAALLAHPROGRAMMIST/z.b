// D:\zamon-books-frontend\src\components\CartPage.jsx
import React, { useState, useEffect } from 'react';
import { databases, Query, ID, account } from '../appwriteConfig';
import { Link, useNavigate } from 'react-router-dom';
import '../index.css'; // Umumiy stil faylini import qilish

// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;

// --- Telegram Bot API konfiguratsiyasi ---
const TELEGRAM_BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN; // .env faylidan oling
const TELEGRAM_CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID; // Xabar yuboriladigan chat ID

function CartPage() {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();


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
                // Foydalanuvchi ID'sini tekshirish: agar kirgan bo'lsa, uning ID'si, aks holda guest ID
                const currentUser = await account.get().catch(() => null);
                let currentUserId = currentUser ? currentUser.$id : localStorage.getItem('appwriteGuestId');

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
            updateCartCount(); // Savat sonini yangilash
            alert("Kitob savatdan o'chirildi!");
        } catch (err) {
            console.error("Kitobni savatdan o'chirishda xato yuz berdi:", err);
            alert("Kitobni savatdan o'chirishda xato yuz berdi.");
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
            alert("Miqdorni yangilashda xato yuz berdi.");
        }
    };

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + (item.book ? parseFloat(item.book.price || 0) * item.quantity : 0), 0);
    };

    // Checkout function
    const handleCheckout = async () => {
        try {
            const currentUser = await account.get().catch(() => null);
            
            if (!currentUser) {
                alert('Buyurtma berish uchun tizimga kirishingiz kerak!');
                return;
            }

            if (cartItems.length === 0) {
                alert('Savatingiz bo\'sh!');
                return;
            }

            setLoading(true);

            // Orders service'ni import qilish
            const { createOrdersFromCart } = await import('../utils/orderService');
            
            // Cart itemlarni orderga aylantirish
            await createOrdersFromCart(cartItems);

            // Cart'ni tozalash
            setCartItems([]);
            
            // Global cart count'ni yangilash
            window.dispatchEvent(new CustomEvent('cartUpdated'));
            
            // --- Telegram bot orqali xabar yuborish (HTML formatda) ---
            const totalAmount = calculateTotal().toLocaleString();

            const orderDetails = cartItems.map((item, index) => {
                const itemTotal = (parseFloat(item.book.price || 0) * item.quantity).toLocaleString();
                return `<b>${index + 1}. ${item.book.title}</b>\n` +
                       `  Muallif: ${item.book.author?.name || 'Noma\'lum'}\n` +
                       `  Narxi: ${parseFloat(item.book.price || 0).toLocaleString()} so'm\n` +
                       `  Miqdori: ${item.quantity} dona\n` +
                       `  Jami: ${itemTotal} so'm`;
            }).join('\n\n'); // Har bir kitob orasida bo'sh qator
            
            const message = `
<b>Yangi Buyurtma!</b> 🛒
-----------------------------------
<b>Xaridor ma'lumotlari:</b>
Ism: <b>${currentUser.name || 'Noma\'lum'}</b>
Email: <code>${currentUser.email}</code>
ID: <code>${currentUser.$id}</code>
-----------------------------------
<b>Buyurtma Tafsilotlari:</b>
${orderDetails}
-----------------------------------
<b>Umumiy Summa:</b> <b style="color: #28a745;">${totalAmount} so'm</b>
            `;

            const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

            await fetch(telegramApiUrl, {
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
            // -
            // Orders sahifasiga yo'naltirish
            navigate('/orders');
            // ==========================================================
            
            // ==========================================================
            // Success message
            setTimeout(() => {
                alert('Buyurtmangiz muvaffaqiyatli qabul qilindi! Admin siz bilan bog\'lanadi.');
            }, 500);

        } catch (error) {
            console.error('Checkout xatosi:', error);
            alert('Buyurtma berishda xato yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: '50px', textAlign: 'center' }}>Savat yuklanmoqda...</div>;
    if (error) return <div className="container" style={{ padding: '50px', textAlign: 'center', color: 'red' }}>Xato: {error}</div>;

    return (
        <>
            <main className="cart-page container" style={{ marginTop: '80px' }}>
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
                        <div className="cart-items" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {cartItems.map(item => (
                                <div key={item.$id} className="cart-item glassmorphism-card" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '15px',
                                    gap: '15px',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                        <Link to={`/book/${item.book.$id}`} style={{
                                            flexShrink: 0,
                                            width: '100px',
                                            height: '150px',
                                            margin: '0 auto'
                                        }}>
                                            <img
                                                src={item.book.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'}
                                                alt={item.book.title}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}
                                                onError={(e) => {
                                                    e.target.src = 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg';
                                                }}
                                            />
                                        </Link>
                                        <div className="cart-item-details" style={{ flex: '1', minWidth: '250px' }}>
                                            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                                                <Link to={`/book/${item.book.$id}`}>{item.book.title}</Link>
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
                                                        style={{ width: '35px', height: '35px', padding: '0' }}
                                                    >-</button>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item, item.quantity + 1)}
                                                        className="glassmorphism-button"
                                                        style={{ width: '35px', height: '35px', padding: '0' }}
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
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                padding: '10px 0',
                                borderBottom: '1px solid var(--glass-border)'
                            }}>
                                <p style={{ fontSize: '1.1rem' }}>Umumiy narx:</p>
                                <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent-light)' }}>{calculateTotal().toLocaleString()} so'm</span>
                            </div>
                            <button 
                                className="checkout-btn glassmorphism-button" 
                                onClick={handleCheckout}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    backgroundColor: 'rgba(104, 214, 57, 0.2)'
                                }}
                            >
                                <i className="fas fa-check-circle"></i> Xaridni yakunlash
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}

export default CartPage;