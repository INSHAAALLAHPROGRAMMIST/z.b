// D:\zamon-books-frontend\src\components\BookDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { databases, Query, ID } from '../appwriteConfig'; // appwriteConfig ni to'g'ri joydan import qilish
import '../index.css'; // Global CSS faylingiz

// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;

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
                        Query.equal('userId', currentUserId)
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
                    Query.equal('userId', currentUserId),
                    Query.equal('bookId', bookToAdd.$id)
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
                        userId: currentUserId,
                        bookId: bookToAdd.$id,
                        quantity: 1,
                        priceAtTimeOfAdd: parseFloat(bookToAdd.price)
                    }
                );
                console.log(`Kitob savatga qo'shildi: ${bookToAdd.title}`);
                setCartCount(prevCount => prevCount + 1);
            }
            alert(`${bookToAdd.title} savatga qo'shildi!`);
            
            // Global cart count'ni yangilash uchun event dispatch qilish
            window.dispatchEvent(new CustomEvent('cartUpdated'));
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
                    bookId // bookId ni URL dan olamiz
                );
                console.log("Kitob ma'lumotlari:", response);
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

    // Kitob rasmi URL'ini tayyorlash
    const bookImageUrl = book.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg';

    return (
        <main className="container" style={{ padding: '40px 20px', minHeight: 'calc(100vh - 200px)', marginTop: '70px' }}>
            {/* Bu komponent faqat o'zining kontentini render qilishi kerak. Header va Footer MainLayout tomonidan ta'minlanadi. */}
            <div className="book-detail-card glassmorphism-card" style={{ 
                display: 'flex', 
                gap: '30px', 
                padding: '20px', 
                flexWrap: 'wrap', 
                justifyContent: 'center' 
            }}>
                <img
                    src={bookImageUrl}
                    alt={book.title}
                    className="book-detail-image"
                    style={{ 
                        width: '100%', 
                        maxWidth: '300px', 
                        height: 'auto', 
                        maxHeight: '450px', 
                        objectFit: 'cover',
                        borderRadius: '10px',
                        margin: '0 auto 20px auto'
                    }}
                />
                <div className="book-detail-info" style={{ 
                    flex: 1, 
                    minWidth: '280px', 
                    width: '100%' 
                }}>
                    <h1 style={{ 
                        fontFamily: 'Montserrat', 
                        fontSize: 'clamp(1.5em, 5vw, 2.5em)', 
                        marginBottom: '15px', 
                        color: 'var(--text-color-light)',
                        wordBreak: 'break-word'
                    }}>{book.title}</h1>
                    
                    {/* Muallif ma'lumotlari */}
                    {(book.author?.name || book.authorName) && (
                        <p style={{ 
                            fontSize: 'clamp(1em, 3vw, 1.2em)', 
                            color: 'rgba(255, 255, 255, 0.8)', 
                            marginBottom: '8px' 
                        }}>
                            <i className="fas fa-user" style={{ marginRight: '8px' }}></i>
                            Muallif: <span style={{ fontWeight: 'bold' }}>{book.author?.name || book.authorName}</span>
                        </p>
                    )}
                    
                    {/* Janr ma'lumotlari */}
                    {((book.genres && book.genres.length > 0) || book.genreName) && (
                        <p style={{ 
                            fontSize: 'clamp(0.9em, 2.5vw, 1.1em)', 
                            color: 'rgba(255, 255, 255, 0.7)', 
                            marginBottom: '15px' 
                        }}>
                            <i className="fas fa-tags" style={{ marginRight: '8px' }}></i>
                            Janr: {book.genres && book.genres.length > 0 
                                ? book.genres.map(g => g.name || g).join(', ')
                                : book.genreName
                            }
                        </p>
                    )}
                    
                    {/* Qo'shimcha ma'lumotlar */}
                    {book.publishedYear && (
                        <p style={{ 
                            fontSize: 'clamp(0.9em, 2.5vw, 1.1em)', 
                            color: 'rgba(255, 255, 255, 0.7)', 
                            marginBottom: '8px' 
                        }}>
                            <i className="fas fa-calendar" style={{ marginRight: '8px' }}></i>
                            Nashr yili: {book.publishedYear}
                        </p>
                    )}
                    
                    {book.pages && (
                        <p style={{ 
                            fontSize: 'clamp(0.9em, 2.5vw, 1.1em)', 
                            color: 'rgba(255, 255, 255, 0.7)', 
                            marginBottom: '8px' 
                        }}>
                            <i className="fas fa-file-alt" style={{ marginRight: '8px' }}></i>
                            Sahifalar: {book.pages}
                        </p>
                    )}
                    
                    {book.language && (
                        <p style={{ 
                            fontSize: 'clamp(0.9em, 2.5vw, 1.1em)', 
                            color: 'rgba(255, 255, 255, 0.7)', 
                            marginBottom: '15px' 
                        }}>
                            <i className="fas fa-language" style={{ marginRight: '8px' }}></i>
                            Til: {book.language}
                        </p>
                    )}
                    {book.description && (
                        <div style={{ 
                            fontSize: 'clamp(0.9em, 2.5vw, 1.1em)', 
                            color: 'var(--text-color-light)', 
                            marginBottom: '20px',
                            lineHeight: '1.6'
                        }}>
                            <h3 style={{ 
                                fontSize: 'clamp(1em, 3vw, 1.3em)', 
                                marginBottom: '10px',
                                color: 'rgba(255, 255, 255, 0.9)'
                            }}>
                                <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                                Tavsif:
                            </h3>
                            <p style={{ 
                                textAlign: 'justify',
                                paddingLeft: '20px'
                            }}>
                                {book.description}
                            </p>
                        </div>
                    )}
                    <p style={{ 
                        fontSize: 'clamp(1.2em, 4vw, 1.8em)', 
                        fontWeight: '700', 
                        color: 'var(--accent-light)', 
                        marginBottom: '25px' 
                    }}>
                        Narxi: {parseFloat(book.price).toFixed(2)} so'm
                    </p>
                    <button
                        className="cta-button glassmorphism-button"
                        style={{ 
                            padding: '12px 25px', 
                            fontSize: 'clamp(0.9em, 3vw, 1.1em)',
                            width: '100%',
                            maxWidth: '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
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