import React, { useEffect, useState } from 'react'
import { databases, ID, Query, account } from '../appwriteConfig';
import { Link } from 'react-router-dom';
import { toastMessages } from '../utils/toastUtils';
import LazyImage from '../components/LazyImage';
import '../index.css';
// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;

const HomePage = () => {
    const [books, setBooks] = useState([]);
    const [allBooks, setAllBooks] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [cartItems, setCartItems] = useState([]); // Savatdagi kitoblar

    const addToCart = async (bookToAdd) => {
        try {
            // Foydalanuvchi ID'sini tekshirish: agar kirgan bo'lsa, uning ID'si, aks holda guest ID
            const currentUser = await account.get().catch(() => null);
            let currentUserId = currentUser ? currentUser.$id : localStorage.getItem('appwriteGuestId');

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
            
            // Cart items'ni yangilash
            fetchCartItems();

        }
        catch (err) {
            console.error("Savatga qo'shishda xato yuz berdi:", err);
            toastMessages.cartError();
        }
    };

    useEffect(() => {
        let mounted = true;

        const fetchInitialData = async () => {
            try {
                // First load: 8 books (4 ga karrali) + genres for fast display
                const [initialBooksResponse, genresResponse] = await Promise.all([
                    databases.listDocuments(
                        DATABASE_ID,
                        BOOKS_COLLECTION_ID,
                        [Query.limit(8)] // 4 ga karrali - tez yuklash uchun
                    ),
                    databases.listDocuments(
                        DATABASE_ID,
                        GENRES_COLLECTION_ID,
                        [Query.limit(6)]
                    )
                ]);
                
                if (mounted) {
                    console.log('Initial books loaded:', initialBooksResponse.documents.length);
                    console.log('Genres loaded:', genresResponse.documents.length);
                    setBooks(initialBooksResponse.documents);
                    setGenres(genresResponse.documents);
                    setLoading(false);
                    
                    // Load remaining books after initial display
                    setTimeout(() => loadMoreBooks(), 1000);
                }
            } catch (err) {
                if (mounted) {
                    console.error("Ma'lumotlarni yuklashda xato:", err);
                    setError(err.message || "Ma'lumotlarni yuklashda noma'lum xato.");
                    setLoading(false);
                }
            }
        };

        const loadMoreBooks = async () => {
            if (!mounted) return;
            
            try {
                setLoadingMore(true);
                // Load all books (up to 100)
                const allBooksResponse = await databases.listDocuments(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    [Query.limit(100)] // Barcha kitoblar
                );
                
                if (mounted) {
                    console.log('All books loaded:', allBooksResponse.documents.length);
                    setAllBooks(allBooksResponse.documents);
                    setBooks(allBooksResponse.documents);
                    setLoadingMore(false);
                }
            } catch (err) {
                if (mounted) {
                    console.error("Qo'shimcha kitoblarni yuklashda xato:", err);
                    setLoadingMore(false);
                }
            }
        };

        // Load cart items separately to not block main content
        const loadCartItems = async () => {
            try {
                await fetchCartItems();
            } catch (err) {
                console.error("Cart items loading error:", err);
            }
        };

        fetchInitialData();
        setTimeout(loadCartItems, 100); // Delay cart loading

        return () => {
            mounted = false;
        };
    }, []);

    // Below-the-fold animation
    useEffect(() => {
        const timer = setTimeout(() => {
            const belowFoldElements = document.querySelectorAll('.below-fold');
            belowFoldElements.forEach((element, index) => {
                setTimeout(() => {
                    element.classList.add('loaded');
                }, index * 200);
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [loading]);

    // Savatdagi kitoblarni yuklash
    const fetchCartItems = async () => {
        try {
            const currentUser = await account.get().catch(() => null);
            let currentUserId = currentUser ? currentUser.$id : localStorage.getItem('appwriteGuestId');

            if (!currentUserId) {
                return;
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [
                    Query.equal('userId', currentUserId)
                ]
            );
            
            setCartItems(response.documents);
        } catch (err) {
            console.error("Savat elementlarini yuklashda xato:", err);
        }
    };

    // Kitobning savatdagi miqdorini olish
    const getBookQuantityInCart = (bookId) => {
        const cartItem = cartItems.find(item => item.bookId === bookId);
        const quantity = cartItem ? cartItem.quantity : 0;
        return quantity;
    };

    // Savatdagi kitob miqdorini yangilash
    const updateBookQuantityInCart = async (bookId, newQuantity) => {
        try {
            const currentUser = await account.get().catch(() => null);
            let currentUserId = currentUser ? currentUser.$id : localStorage.getItem('appwriteGuestId');

            if (!currentUserId) {
                currentUserId = ID.unique();
                localStorage.setItem('appwriteGuestId', currentUserId);
            }

            const cartItem = cartItems.find(item => item.bookId === bookId);

            if (cartItem) {
                if (newQuantity <= 0) {
                    // Kitobni savatdan o'chirish
                    await databases.deleteDocument(
                        DATABASE_ID,
                        CART_ITEMS_COLLECTION_ID,
                        cartItem.$id
                    );
                } else {
                    // Hujjatni o'chirib, yangisini yaratish (workaround)
                    await databases.deleteDocument(
                        DATABASE_ID,
                        CART_ITEMS_COLLECTION_ID,
                        cartItem.$id
                    );
                    
                    // Yangi hujjat yaratish
                    const book = books.find(b => b.$id === bookId);
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
            } else if (newQuantity > 0) {
                // Yangi cart item yaratish (agar kitob savatda bo'lmasa va + bosilsa)
                const book = books.find(b => b.$id === bookId);
                if (book) {
                    await databases.createDocument(
                        DATABASE_ID,
                        CART_ITEMS_COLLECTION_ID,
                        ID.unique(),
                        {
                            userId: currentUserId,
                            bookId: bookId,
                            quantity: newQuantity,
                            priceAtTimeOfAdd: parseFloat(book.price)
                        }
                    );
                }
            }
            
            // Local state'ni yangilash
            setTimeout(() => {
                fetchCartItems();
                window.dispatchEvent(new CustomEvent('cartUpdated'));
            }, 100); // 100ms kechikish
        } catch (err) {
            console.error("Savat miqdorini yangilashda xato:", err);
            toastMessages.cartError();
        }
    };

    if (loading) {
        return (
            <main>
                <section className="hero-banner">
                    <div className="hero-content">
                        <h1 className="hero-title-small">Kelajak kitoblari Zamon Books'da</h1>
                        <p className="hero-subtitle-small">Dunyo adabiyotining eng sara asarlari, innovatsion texnologiyalar bilan birga.</p>
                    </div>
                </section>
                <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
                    <div className="loading-spinner" style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(106, 138, 255, 0.2)',
                        borderTop: '3px solid var(--primary-color)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    Yuklanmoqda...
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main>
                <section className="hero-banner">
                    <div className="hero-content">
                        <h1 className="hero-title-small">Kelajak kitoblari Zamon Books'da</h1>
                        <p className="hero-subtitle-small">Dunyo adabiyotining eng sara asarlari, innovatsion texnologiyalar bilan birga.</p>
                    </div>
                </section>
                <div className="container" style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
                    Xato: {error}
                </div>
            </main>
        );
    }

    return (
        <main>
            {/* Above-the-fold content - loads immediately */}
            <section className="hero-banner">
                <div className="hero-content">
                    <h1 className="hero-title-small">Kelajak kitoblari Zamon Books'da</h1>
                    <p className="hero-subtitle-small">Dunyo adabiyotining eng sara asarlari, innovatsion texnologiyalar bilan birga.</p>
                </div>
            </section>

            {/* Below-the-fold content - loads after initial render */}
            <section className="container below-fold">
                <h2 className="section-title">Eng So'nggi Kitoblar</h2>
                <div className="book-grid">
                    {books.map(book => (
                        <Link to={`/book/${book.$id}`} key={book.$id} className="book-card glassmorphism-card">
                            <LazyImage 
                                src={book.imageUrl} 
                                alt={book.title}
                                style={{ height: '250px' }}
                            />
                            <div className="book-info">
                                <h3>{book.title}</h3>
                                {book.author && book.author.name && <p className="author">{book.author.name}</p>}
                                {book.genres && book.genres.length > 0 && <p className="genre">{book.genres[0].name}</p>}
                                <p className="price">{parseFloat(book.price).toFixed(2)} so'm</p>
                                
                                {getBookQuantityInCart(book.$id) === 0 ? (
                                    <button
                                        className="add-to-cart glassmorphism-button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            addToCart(book);
                                        }}
                                    >
                                        <i className="fas fa-shopping-cart"></i> Savatga qo'shish
                                    </button>
                                ) : (
                                    <div className="quantity-controls" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        marginTop: '10px'
                                    }}>
                                        <button
                                            className="glassmorphism-button"
                                            style={{ 
                                                width: '35px', 
                                                height: '35px', 
                                                padding: '0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                updateBookQuantityInCart(book.$id, getBookQuantityInCart(book.$id) - 1);
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
                                            {getBookQuantityInCart(book.$id)}
                                        </span>
                                        <button
                                            className="glassmorphism-button"
                                            style={{ 
                                                width: '35px', 
                                                height: '35px', 
                                                padding: '0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                updateBookQuantityInCart(book.$id, getBookQuantityInCart(book.$id) + 1);
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Loading more indicator */}
                {loadingMore && (
                    <div style={{ textAlign: 'center', padding: '30px' }}>
                        <div className="loading-spinner" style={{
                            width: '30px',
                            height: '30px',
                            border: '2px solid rgba(106, 138, 255, 0.2)',
                            borderTop: '2px solid var(--primary-color)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 15px'
                        }}></div>
                        <p style={{ color: 'var(--light-text-color)', fontSize: '0.9rem' }}>
                            Ko'proq kitoblar yuklanmoqda...
                        </p>
                    </div>
                )}

                {/* Show total count */}
                {!loadingMore && allBooks.length > 0 && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p style={{ 
                            color: 'var(--light-text-color)', 
                            fontSize: '0.9rem',
                            background: 'rgba(106, 138, 255, 0.1)',
                            padding: '10px 20px',
                            borderRadius: '20px',
                            display: 'inline-block'
                        }}>
                            <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
                            Jami {books.length} ta kitob ko'rsatildi
                        </p>
                    </div>
                )}
            </section>

            <section className="container genre-section below-fold">
                <h2 className="section-title">Janrlar Boʻyicha Keng Tanlov</h2>
                <div className="genre-grid">
                    {genres.map(genre => (
                        <Link to={`/genres/${genre.$id}`} key={genre.$id} className="genre-card glassmorphism-card">
                            <div className="genre-bg" style={{ backgroundImage: `url(${genre.imageUrl || 'https://source.unsplash.com/random/400x250/?books,abstract'})` }}></div>
                            <h3 className="genre-name">{genre.name}</h3>
                        </Link>
                    ))}
                </div>
            </section>
        </main>
    );
}

export default HomePage