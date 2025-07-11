// D:\zamon-books-frontend\src\components\BookDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { databases, Query, ID } from '../appwriteConfig'; // appwriteConfig ni to'g'ri joydan import qilish
import '../index.css'; // Global CSS faylingiz

// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = '686ee1900027589a0708';
const BOOKS_COLLECTION_ID = '686ee24b000b4be8f190';
// AUTHORS_COLLECTION_ID va GENRES_COLLECTION_ID bu komponentda bevosita ishlatilmaydi,
// shuning uchun ularni qoldirsak ham bo'ladi, lekin kelajakda kerak bo'lsa ularni Books_Collection_ID ga o'xshash qilib to'g'irlashingiz kerak bo'lishi mumkin.
const CART_ITEMS_COLLECTION_ID = 'cartItems';

function BookDetailPage() {
    const { bookId } = useParams();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cartCount, setCartCount] = useState(0); // Savatdagi elementlar soni

    // Savatdagi elementlar sonini yuklash
    useEffect(() => {
        const fetchCartCount = async () => {
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
        fetchCartCount();
    }, []);

    const addToCart = async (bookToAdd) => {
        try {
            let currentUserId = localStorage.getItem('appwriteGuestId');
            if (!currentUserId) {
                currentUserId = ID.unique();
                localStorage.setItem('appwriteGuestId', currentUserId);
            }

            const existingCartItems = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [
                    Query.equal('users', currentUserId),
                    Query.equal('books', bookToAdd.$id)
                ]
            );

            if (existingCartItems.documents.length > 0) {
                const cartItem = existingCartItems.documents[0];
                const newQuantity = cartItem.quantity + 1;
                await databases.updateDocument(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    cartItem.$id,
                    {
                        quantity: newQuantity
                    }
                );
                console.log(`Kitob miqdori oshirildi: ${bookToAdd.title}, Yangi miqdor: ${newQuantity}`);
                setCartCount(prevCount => prevCount + 1);
            } else {
                await databases.createDocument(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    ID.unique(),
                    {
                        users: currentUserId,
                        books: bookToAdd.$id,
                        quantity: 1,
                        priceAtTimeOfAdd: parseFloat(bookToAdd.price)
                    }
                );
                console.log(`Kitob savatga qo'shildi: ${bookToAdd.title}`);
                setCartCount(prevCount => prevCount + 1);
            }
            alert(`${bookToAdd.title} savatga qo'shildi!`);
        } catch (err) {
            console.error("Savatga qo'shishda xato yuz berdi:", err);
            alert("Kitobni savatga qo'shishda xato yuz berdi.");
        }
    };

    useEffect(() => {
        const fetchBookDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await databases.getDocument(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    bookId,
                    [
                        Query.select(['*', 'author', 'genres']),
                    ]
                );
                setBook(response);
                setLoading(false);
            } catch (err) {
                console.error("Kitob ma'lumotlarini yuklashda xato yuz berdi:", err);
                setError(err.message || "Kitob ma'lumotlarini yuklashda noma'lum xato.");
                setLoading(false);
            }
        };

        fetchBookDetail();
    }, [bookId]);

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', minHeight: 'calc(100vh - 200px)' }}>Kitob yuklanmoqda...</div>;
    }

    if (error) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', color: 'red', minHeight: 'calc(100vh - 200px)' }}>Xato: {error}</div>;
    }

    if (!book) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', minHeight: 'calc(100vh - 200px)' }}>Kitob topilmadi.</div>;
    }

    return (
        <main className="container" style={{ padding: '40px 20px', minHeight: 'calc(100vh - 200px)' }}>
            {/* Bu komponent faqat o'zining kontentini render qilishi kerak. Header va Footer MainLayout tomonidan ta'minlanadi. */}
            <div className="book-detail-card glassmorphism-card" style={{ display: 'flex', gap: '30px', padding: '30px', flexWrap: 'wrap' }}>
                <img
                    src={book.imageUrl}
                    alt={book.title}
                    className="book-detail-image"
                />
                <div className="book-detail-info" style={{ flex: 1, minWidth: '300px' }}>
                    <h1 style={{ fontFamily: 'Montserrat', fontSize: '2.5em', marginBottom: '15px', color: 'var(--text-color-light)' }}>{book.title}</h1>
                    {book.author && book.author.name && (
                        <p style={{ fontSize: '1.2em', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>Muallif: <span style={{ fontWeight: 'bold' }}>{book.author.name}</span></p>
                    )}
                    {book.genres && book.genres.length > 0 && (
                        <p style={{ fontSize: '1.1em', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '15px' }}>Janrlar: {book.genres.map(g => g.name).join(', ')}</p>
                    )}
                    <p style={{ fontSize: '1.1em', color: 'var(--text-color-light)', marginBottom: '20px' }}>
                        **Tavsif:** {book.description || 'Bu kitob haqida tavsif mavjud emas.'}
                    </p>
                    <p style={{ fontSize: '1.8em', fontWeight: '700', color: 'var(--accent-light)', marginBottom: '25px' }}>
                        Narxi: {parseFloat(book.price).toFixed(2)} so'm
                    </p>
                    <button
                        className="cta-button glassmorphism-button"
                        style={{ padding: '12px 25px', fontSize: '1.1em' }}
                        onClick={() => addToCart(book)}
                    >
                        <i className="fas fa-shopping-cart"></i> Savatga qo'shish
                    </button>
                </div>
            </div>
        </main>
    );
}

export default BookDetailPage;