// D:\zamon-books-frontend\src\components\CartPage.jsx
import React, { useState, useEffect } from 'react';
import { databases, Query, ID } from '../appwriteConfig';
import { Link } from 'react-router-dom';
import '../index.css'; // Umumiy stil faylini import qilish

// --- Appwrite konsolidan olingan ID'lar (Environment variables using import.meta.env) ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID; // Bu kerak bo'lmasa ham, to'liqlik uchun qoldirildi
const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID; // Bu kerak bo'lmasa ham, to'liqlik uchun qoldirildi
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID; // Bu kerak bo'lmasa ham, to'liqlik uchun qoldirildi
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;

function CartPage() {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cartCount, setCartCount] = useState(0); // Header uchun savat soni

    // Headerdagi savat sonini yangilash funksiyasi
    const updateCartCount = async () => {
        try {
            let currentUserId = localStorage.getItem('appwriteGuestId');
            if (!currentUserId) {
                currentUserId = ID.unique();
                localStorage.setItem('appwriteGuestId', currentUserId);
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [
                    Query.equal('users', currentUserId)
                ]
            );
            const totalQuantity = response.documents.reduce((sum, item) => sum + item.quantity, 0);
            setCartCount(totalQuantity);
        } catch (err) {
            console.error("Savat sonini yuklashda xato:", err);
        }
    };

    useEffect(() => {
        const fetchCartItems = async () => {
            setLoading(true);
            setError(null);
            try {
                let currentUserId = localStorage.getItem('appwriteGuestId');
                if (!currentUserId) {
                    currentUserId = ID.unique(); // Agar ID bo'lmasa, yangi ID yaratish
                    localStorage.setItem('appwriteGuestId', currentUserId);
                }

                // Savat elementlarini foydalanuvchi ID'si bo'yicha olish
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    [
                        Query.equal('users', currentUserId),
                        Query.select(['*', 'books']) // Kitob ma'lumotlarini ham birga yuklab olish
                    ]
                );
                console.log("Savat elementlari:", response.documents); // Debugging uchun

                if (response.documents.length === 0) {
                    setCartItems([]);
                    setLoading(false);
                    return;
                }

                // Kitob ma'lumotlari to'g'ri bog'langanligini tekshirish
                const itemsWithBookDetails = response.documents.map(item => ({
                    ...item,
                    book: item.books // Appwrite o'zi bog'langan hujjatni 'books' maydoniga joylashtiradi
                }));
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
            console.log(`Miqdor yangilandi: ${cartItem.book.title}, Yangi miqdor: ${newQuantity}`);
        } catch (err) {
            console.error("Miqdorni yangilashda xato yuz berdi:", err);
            alert("Miqdorni yangilashda xato yuz berdi.");
        }
    };

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + (item.book ? parseFloat(item.book.price) * item.quantity : 0), 0).toFixed(2);
    };

    if (loading) return <div className="container" style={{ padding: '50px', textAlign: 'center' }}>Savat yuklanmoqda...</div>;
    if (error) return <div className="container" style={{ padding: '50px', textAlign: 'center', color: 'red' }}>Xato: {error}</div>;

    return (
        <>
            <main className="cart-page container">
                <h1>Savat</h1>
                {cartItems.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px' }}>Savatingiz bo'sh. <Link to="/">Kitoblarni ko'rish</Link></p>
                ) : (
                    <div className="cart-content">
                        <div className="cart-items">
                            {cartItems.map(item => (
                                <div key={item.$id} className="cart-item glassmorphism-card">
                                    <Link to={`/book/${item.book.$id}`}>
                                        <img src={item.book.imageUrl} alt={item.book.title} className="cart-item-image" />
                                    </Link>
                                    <div className="cart-item-details">
                                        <h3><Link to={`/book/${item.book.$id}`}>{item.book.title}</Link></h3>
                                        <p>Muallif: {item.book.author?.name || 'Nomaʼlum'}</p>
                                        <p>Narxi: {parseFloat(item.book.price).toFixed(2)} so'm</p>
                                        <div className="quantity-controls">
                                            <button onClick={() => updateQuantity(item, item.quantity - 1)} className="glassmorphism-button">-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item, item.quantity + 1)} className="glassmorphism-button">+</button>
                                        </div>
                                        <p>Jami: {(parseFloat(item.book.price) * item.quantity).toFixed(2)} so'm</p>
                                        <button onClick={() => removeFromCart(item.$id)} className="remove-item-btn glassmorphism-button">O'chirish</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="cart-summary glassmorphism-card">
                            <h2>Savat Hisobi</h2>
                            <p>Umumiy narx: <span>{calculateTotal()} so'm</span></p>
                            <button className="checkout-btn glassmorphism-button">Xaridni yakunlash</button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}

export default CartPage;