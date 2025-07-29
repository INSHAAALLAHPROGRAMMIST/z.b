// D:\zamon-books-frontend\src\components\BookDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { databases, Query, ID } from '../appwriteConfig';
import { toastMessages } from '../utils/toastUtils';
import { useLazyCSS } from '../hooks/useLazyCSS';

// SEO Components - Direct import
import BookSEO from './SEO/BookSEO';
import Breadcrumb from './SEO/Breadcrumb';
// import SEODebug from './SEODebug';

// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;

function BookDetailPage() {
    const { bookId, bookSlug } = useParams();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cartItems, setCartItems] = useState([]);

    // Lazy load component-specific CSS
    useLazyCSS('/src/styles/components/book-detail.css');

    // Savatdagi elementlarni yuklash
    const fetchCartItems = async () => {
        try {
            let currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('appwriteGuestId');

            if (!currentUserId) {
                return;
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [Query.equal('userId', currentUserId)]
            );
            
            setCartItems(response.documents);
        } catch (err) {
            console.error("Savat elementlarini yuklashda xato:", err);
        }
    };

    useEffect(() => {
        fetchCartItems();
        
        const handleCartUpdate = () => {
            fetchCartItems();
        };
        
        window.addEventListener('cartUpdated', handleCartUpdate);
        
        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate);
        };
    }, []);

    const addToCart = async (bookToAdd) => {
        try {
            let currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('appwriteGuestId');

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
                    { quantity: newQuantity }
                );
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
            }
            
            toastMessages.addedToCart(bookToAdd.title);
            window.dispatchEvent(new CustomEvent('cartUpdated'));
            fetchCartItems();

        } catch (err) {
            console.error("Savatga qo'shishda xato yuz berdi:", err);
            toastMessages.cartError();
        }
    };

    const updateBookQuantityInCart = async (bookId, newQuantity) => {
        try {
            let currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('appwriteGuestId');

            if (!currentUserId) {
                currentUserId = ID.unique();
                localStorage.setItem('appwriteGuestId', currentUserId);
            }

            const cartItem = cartItems.find(item => item.bookId === bookId);

            if (cartItem) {
                if (newQuantity <= 0) {
                    await databases.deleteDocument(
                        DATABASE_ID,
                        CART_ITEMS_COLLECTION_ID,
                        cartItem.$id
                    );
                } else {
                    await databases.deleteDocument(
                        DATABASE_ID,
                        CART_ITEMS_COLLECTION_ID,
                        cartItem.$id
                    );
                    
                    const book = book;
                    if (book) {
                        await databases.createDocument(
                            DATABASE_ID,
                            CART_ITEMS_COLLECTION_ID,
                            ID.unique(),
                            {
                                userId: currentUserId,
                                bookId: bookId,
                                quantity: newQuantity,
                                priceAtTimeOfAdd: cartItem.priceAtTimeOfAdd || parseFloat(book.price)
                            }
                        );
                    }
                }
            }
            
            setTimeout(() => {
                fetchCartItems();
                window.dispatchEvent(new CustomEvent('cartUpdated'));
            }, 100);
        } catch (err) {
            console.error("Savat miqdorini yangilashda xato:", err);
            toastMessages.cartError();
        }
    };

    useEffect(() => {
        const fetchBookDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                let response;
                
                if (bookId) {
                    response = await databases.getDocument(
                        DATABASE_ID,
                        BOOKS_COLLECTION_ID,
                        bookId
                    );
                } else if (bookSlug) {
                    const books = await databases.listDocuments(
                        DATABASE_ID,
                        BOOKS_COLLECTION_ID,
                        [
                            Query.equal('slug', bookSlug),
                            Query.limit(1)
                        ]
                    );
                    
                    if (books.documents.length === 0) {
                        throw new Error('Kitob topilmadi');
                    }
                    
                    response = books.documents[0];
                }
                
                // console.log("Kitob ma'lumotlari:", response); // Debug log removed
                setBook(response);
                setLoading(false);
            } catch (err) {
                console.error("Kitob ma'lumotlarini yuklashda xato yuz berdi:", err);
                setError(err.message || "Kitob ma'lumotlarini yuklashda noma'lum xato.");
                setLoading(false);
            }
        };

        fetchBookDetail();
    }, [bookId, bookSlug]);

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', minHeight: 'calc(100vh - 200px)' }}>Kitob yuklanmoqda...</div>;
    }

    if (error) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', color: 'red', minHeight: 'calc(100vh - 200px)' }}>Xato: {error}</div>;
    }

    if (!book) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', minHeight: 'calc(100vh - 200px)' }}>Kitob topilmadi.</div>;
    }

    // SEO data for breadcrumb
    const breadcrumbItems = [
        { name: 'Bosh sahifa', url: '/' },
        { name: book.genres?.[0]?.name || 'Kitoblar', url: book.genres?.[0]?.slug ? `/janr/${book.genres[0].slug}` : '/kitoblar' },
        { name: book.author?.name || 'Muallif', url: book.author?.slug ? `/muallif/${book.author.slug}` : null },
        { name: book.title, url: null }
    ];

    // Kitobning savatdagi miqdorini olish
    const getBookQuantityInCart = (bookId) => {
        const cartItem = cartItems.find(item => item.bookId === bookId);
        return cartItem ? cartItem.quantity : 0;
    };

    // Kitob rasmi URL'ini tayyorlash
    const bookImageUrl = book.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg';

    return (
        <>
            {/* SEO Components */}
            <BookSEO book={book} />
            <Breadcrumb items={breadcrumbItems} />
            {/* <SEODebug /> */}

            <main className="container" style={{ padding: '40px 20px', minHeight: 'calc(100vh - 200px)', marginTop: '70px' }}>
                <div className="book-detail-card glassmorphism-card" style={{ 
                    display: 'flex', 
                    gap: '30px', 
                    padding: '20px', 
                    flexWrap: 'wrap', 
                    justifyContent: 'center' 
                }}>
                    <img
                        src={bookImageUrl}
                        alt={`${book.title} kitobining muqovasi - ${book.author?.name || 'Noma\'lum muallif'}`}
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
                        }}>"{book.title}" - {book.author?.name || book.authorName || 'Noma\'lum muallif'}</h1>
                        
                        {/* Muallif ma'lumotlari */}
                        {(book.author?.name || book.authorName) && (
                            <p style={{ 
                                fontSize: '1.2em', 
                                marginBottom: '10px', 
                                color: 'var(--text-color)' 
                            }}>
                                <strong>Muallif:</strong> {book.author?.name || book.authorName}
                            </p>
                        )}
                        
                        {/* Janr ma'lumotlari */}
                        {book.genres && book.genres.length > 0 && (
                            <p style={{ 
                                fontSize: '1em', 
                                marginBottom: '10px', 
                                color: 'var(--text-color)' 
                            }}>
                                <strong>Janr:</strong> {book.genres.map(genre => genre.name).join(', ')}
                            </p>
                        )}
                        
                        {/* Narx */}
                        <p style={{ 
                            fontSize: '1.5em', 
                            fontWeight: 'bold', 
                            color: 'var(--primary-color)', 
                            marginBottom: '20px' 
                        }}>
                            {parseFloat(book.price).toFixed(2)} so'm
                        </p>
                        
                        {/* Savatga qo'shish tugmasi */}
                        {getBookQuantityInCart(book.$id) === 0 ? (
                            <button
                                className="glassmorphism-button"
                                onClick={() => addToCart(book)}
                                style={{
                                    padding: '15px 30px',
                                    fontSize: '1.1em',
                                    fontWeight: 'bold',
                                    marginBottom: '20px'
                                }}
                            >
                                <i className="fas fa-shopping-cart"></i> Savatga qo'shish
                            </button>
                        ) : (
                            <div className="quantity-controls" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                marginBottom: '20px'
                            }}>
                                <button
                                    className="glassmorphism-button"
                                    style={{ 
                                        width: '40px', 
                                        height: '40px', 
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold'
                                    }}
                                    onClick={() => updateBookQuantityInCart(book.$id, getBookQuantityInCart(book.$id) - 1)}
                                >
                                    -
                                </button>
                                <span style={{ 
                                    fontSize: '1.2rem', 
                                    fontWeight: 'bold', 
                                    minWidth: '40px', 
                                    textAlign: 'center' 
                                }}>
                                    {getBookQuantityInCart(book.$id)}
                                </span>
                                <button
                                    className="glassmorphism-button"
                                    style={{ 
                                        width: '40px', 
                                        height: '40px', 
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold'
                                    }}
                                    onClick={() => updateBookQuantityInCart(book.$id, getBookQuantityInCart(book.$id) + 1)}
                                >
                                    +
                                </button>
                            </div>
                        )}
                        
                        {/* Kitob tavsifi */}
                        {book.description && (
                            <div style={{ marginTop: '30px' }}>
                                <h2 style={{ 
                                    fontSize: '1.5em', 
                                    marginBottom: '15px', 
                                    color: 'var(--text-color)' 
                                }}>
                                    Kitob haqida
                                </h2>
                                <p style={{ 
                                    lineHeight: '1.6', 
                                    color: 'var(--text-color)', 
                                    fontSize: '1em' 
                                }}>
                                    {book.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

export default BookDetailPage;