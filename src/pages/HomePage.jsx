import React, { useEffect, useState } from 'react'
import { databases, ID, Query, account } from '../appwriteConfig';
import { Link } from 'react-router-dom';
import '../index.css'; // Global CSS faylingiz
// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;

const HomePage = () => {
    const [books, setBooks] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
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
            alert(`${bookToAdd.title} savatga qo'shildi!`);
            window.dispatchEvent(new CustomEvent('cartUpdated'));
            
            // Cart items'ni yangilash
            fetchCartItems();

        }
        catch (err) {
            console.error("Savatga qo'shishda xato yuz berdi:", err);
            alert("Kitobni savatga qo'shishda xato yuz berdi.");
        }
    };

    useEffect(() => {
        const fetchBooksAndGenres = async () => {
            try {
                const booksResponse = await databases.listDocuments(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    [Query.limit(8), Query.select(['*', 'author', 'genres'])]
                );
                
                // Debug: HomePage'da qanday ma'lumotlar kelayotganini ko'rish
                if (booksResponse.documents.length > 0) {
                    console.log('HomePage - Kitob ma\'lumotlari:', booksResponse.documents[0]);
                    console.log('HomePage - Author:', booksResponse.documents[0].author);
                    console.log('HomePage - Genres:', booksResponse.documents[0].genres);
                }
                
                setBooks(booksResponse.documents);

                const genresResponse = await databases.listDocuments(
                    DATABASE_ID,
                    GENRES_COLLECTION_ID,
                    [Query.limit(6)]
                );
                setGenres(genresResponse.documents);

                setLoading(false);
            } catch (err) {
                console.error("Ma'lumotlarni yuklashda xato:", err);
                setError(err.message || "Ma'lumotlarni yuklashda noma'lum xato.");
                setLoading(false);
            }
        };

        fetchBooksAndGenres();
        fetchCartItems();
    }, []);

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
            alert("Miqdorni yangilashda xato yuz berdi.");
        }
    };

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', minHeight: 'calc(100vh - 200px)' }}>Yuklanmoqda...</div>;
    }

    if (error) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', color: 'red', minHeight: 'calc(100vh - 200px)' }}>Xato: {error}</div>;
    }

    return (
        <main>
            <section className="hero-banner">
                <div className="hero-content">
                    <h1 className="hero-title-small">Kelajak kitoblari Zamon Books'da</h1>
                    <p className="hero-subtitle-small">Dunyo adabiyotining eng sara asarlari, innovatsion texnologiyalar bilan birga.</p>
                </div>
            </section>

            <section className="container">
                <h2 className="section-title">Eng So'nggi Kitoblar</h2>
                <div className="book-grid">
                    {books.map(book => (
                        <Link to={`/book/${book.$id}`} key={book.$id} className="book-card glassmorphism-card">
                            <img src={book.imageUrl} alt={book.title} />
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
            </section>

            <section className="container genre-section">
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